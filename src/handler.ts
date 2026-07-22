import type { VercelRequest, VercelResponse } from "@vercel/node";
import { Readable } from "node:stream";
import { getConfig, type ApiConfig } from "./config.js";
import { PLATFORM_ASSET_SUFFIX, SUPPORTED_PLATFORMS } from "./constants.js";
import {
  fetchReleaseManifest,
  findRelease,
  getGitHubHeaders,
  getLatestStableRelease,
  getProxyUrl,
  getReleaseAssetUrl,
  listReleases,
} from "./github.js";
import { getPathname, sendError, setCacheHeaders, setCommonHeaders } from "./http.js";
import type { GitHubRelease, UpdateManifest } from "./types.js";
import { selectNewerRelease } from "./version.js";

const CHANNEL = {
  STABLE: "stable",
  BETA: "beta",
  NIGHTLY: "nightly",
} as const;

type Channel = (typeof CHANNEL)[keyof typeof CHANNEL];
type PrereleaseChannel = Exclude<Channel, typeof CHANNEL.STABLE>;

const CHANNELS = Object.values(CHANNEL);
const PRERELEASE_CHANNEL_PATTERNS: Record<PrereleaseChannel, RegExp> = {
  [CHANNEL.BETA]: /(?:^|-)(?:beta|rc)(?:[.-]|$)/i,
  [CHANNEL.NIGHTLY]: /(?:^|-)nightly(?:[.-]|$)/i,
};

const getQueryValue = (value: VercelRequest["query"][string]): string | undefined => {
  if (Array.isArray(value)) return value[0];

  return value;
};

const parseChannel = (req: VercelRequest): Channel | null | undefined => {
  const value = getQueryValue(req.query.channel);

  if (!value) return void 0;

  if (!CHANNELS.includes(value as Channel)) return null;

  return value as Channel;
};

const findInstallerUrl = (release: GitHubRelease, platform: string): string | undefined => {
  const suffix = PLATFORM_ASSET_SUFFIX[platform as keyof typeof PLATFORM_ASSET_SUFFIX];

  if (!suffix) return void 0;

  return release.assets.find((asset) => {
    return asset.name.endsWith(suffix);
  })?.browser_download_url;
};

const getAssetNameFromUrl = (url: string): string | undefined => {
  try {
    const pathname = new URL(url).pathname;
    const assetName = pathname.split("/").filter(Boolean).pop();

    return assetName ? decodeURIComponent(assetName) : void 0;
  } catch {
    return void 0;
  }
};

const isSafeAssetName = (assetName: string): boolean => {
  return assetName.length > 0 && !assetName.includes("/") && !assetName.includes("\\");
};

const shouldProxyDownload = (req: VercelRequest): boolean => {
  const value = getQueryValue(req.query.proxy);

  return value === "1" || value === "true";
};

const getReleaseIdentifier = (release: GitHubRelease): string => {
  return `${release.tag_name} ${release.name ?? ""}`;
};

const isPrereleaseChannel = (
  release: GitHubRelease,
  channel: PrereleaseChannel
): boolean => {
  return (
    release.prerelease &&
    PRERELEASE_CHANNEL_PATTERNS[channel].test(getReleaseIdentifier(release))
  );
};

const isReleaseInChannel = (release: GitHubRelease, channel: Channel): boolean => {
  if (channel === CHANNEL.STABLE) return !release.prerelease;

  return isPrereleaseChannel(release, channel);
};

const rewriteUpdateManifest = (
  manifest: UpdateManifest,
  release: GitHubRelease,
  config: ApiConfig
): UpdateManifest => {
  if (!manifest.platforms) return manifest;

  const platforms = Object.fromEntries(
    Object.entries(manifest.platforms).map(([platform, value]) => {
      const assetName = getAssetNameFromUrl(value.url);

      if (!assetName || !isSafeAssetName(assetName)) return [platform, value];

      const downloadUrl = getReleaseAssetUrl(
        config.repository,
        release.tag_name,
        assetName
      );

      return [
        platform,
        {
          ...value,
          url: getProxyUrl(downloadUrl, config),
        },
      ];
    })
  );

  return {
    ...manifest,
    platforms,
  };
};

const proxyReleaseAsset = async (
  res: VercelResponse,
  config: ReturnType<typeof getConfig>,
  release: GitHubRelease,
  assetName: string
): Promise<void> => {
  const downloadUrl = getReleaseAssetUrl(config.repository, release.tag_name, assetName);
  const response = await fetch(downloadUrl, {
    headers: getGitHubHeaders(config),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`GitHub asset request failed: ${response.status} ${detail}`);
  }

  for (const headerName of [
    "content-length",
    "content-type",
    "etag",
    "last-modified",
    "accept-ranges",
  ]) {
    const value = response.headers.get(headerName);
    if (value) res.setHeader(headerName, value);
  }

  res.setHeader(
    "Content-Disposition",
    `attachment; filename="${assetName.replace(/"/g, "")}"`
  );
  res.status(response.status);

  if (!response.body) {
    const buffer = Buffer.from(await response.arrayBuffer());
    res.end(buffer);
    return;
  }

  Readable.fromWeb(response.body).pipe(res);
};

const filterReleasesByChannel = (
  releases: GitHubRelease[],
  channel: Channel | undefined
): GitHubRelease[] => {
  if (!channel) return releases;

  return releases.filter((release) => {
    return isReleaseInChannel(release, channel);
  });
};

const getLatestReleaseByChannel = async (
  channel: Channel | undefined,
  fallbackToStable = true
): Promise<GitHubRelease | undefined> => {
  const config = getConfig();

  if (!channel) {
    const releases = await listReleases(config);

    return releases[0];
  }

  if (channel === CHANNEL.STABLE) {
    return getLatestStableRelease(config);
  }

  const releasesPromise = listReleases(config);

  if (!fallbackToStable) {
    const releases = await releasesPromise;

    return releases.find((release) => {
      return isPrereleaseChannel(release, channel);
    });
  }

  const [releases, stableRelease] = await Promise.all([
    releasesPromise,
    getLatestStableRelease(config),
  ]);
  const prerelease = releases.find((release) => {
    return isPrereleaseChannel(release, channel);
  });

  if (!prerelease) return stableRelease;

  return selectNewerRelease(stableRelease, prerelease);
};

const handleDownload = async (req: VercelRequest, res: VercelResponse): Promise<void> => {
  const config = getConfig();
  const platform = getQueryValue(req.query.platform);
  const version = getQueryValue(req.query.version);
  const assetName = getQueryValue(req.query.asset);
  const channel = parseChannel(req);

  if (
    typeof assetName !== "string" &&
    (typeof platform !== "string" || !SUPPORTED_PLATFORMS.includes(platform as never))
  ) {
    sendError(res, 400, `Invalid platform. Use one of: ${SUPPORTED_PLATFORMS.join(", ")}`);
    return;
  }

  if (typeof assetName === "string" && !isSafeAssetName(assetName)) {
    sendError(res, 400, "Invalid asset name");
    return;
  }

  if (channel === null) {
    sendError(res, 400, `Invalid channel. Use one of: ${CHANNELS.join(", ")}`);
    return;
  }

  let release: GitHubRelease | undefined;

  if (typeof version === "string" && version.length > 0) {
    const releases = await listReleases(config);

    release = findRelease(releases, version);
  } else {
    release = await getLatestReleaseByChannel(channel);
  }

  if (!release) {
    sendError(res, 404, "Release not found");
    return;
  }

  if (typeof assetName === "string") {
    const downloadUrl = getReleaseAssetUrl(config.repository, release.tag_name, assetName);

    if (shouldProxyDownload(req)) {
      await proxyReleaseAsset(res, config, release, assetName);
      return;
    }

    res.redirect(302, getProxyUrl(downloadUrl, config));
    return;
  }

  const installerPlatform = platform;

  if (typeof installerPlatform !== "string") {
    sendError(res, 400, `Invalid platform. Use one of: ${SUPPORTED_PLATFORMS.join(", ")}`);
    return;
  }

  const downloadUrl = findInstallerUrl(release, installerPlatform);

  if (!downloadUrl) {
    sendError(res, 404, `No installer found for ${installerPlatform} in ${release.tag_name}`);
    return;
  }

  res.redirect(302, downloadUrl);
};

const handleUpdate = async (req: VercelRequest, res: VercelResponse): Promise<void> => {
  const config = getConfig();
  const channel = parseChannel(req);

  if (channel === null) {
    sendError(res, 400, `Invalid channel. Use one of: ${CHANNELS.join(", ")}`);
    return;
  }

  const release = await getLatestReleaseByChannel(channel);

  if (!release) {
    sendError(res, 404, "Release not found");
    return;
  }

  const manifest = await fetchReleaseManifest(release, config);
  const rewrittenManifest = rewriteUpdateManifest(manifest, release, config);

  res.status(200).json(rewrittenManifest);
};

const handleJsonRoute = async (
  pathname: string,
  _req: VercelRequest,
  res: VercelResponse
): Promise<boolean> => {
  const config = getConfig();

  if (pathname === "/" || pathname === "") {
    const channel = parseChannel(_req);

    if (channel === null) {
      sendError(res, 400, `Invalid channel. Use one of: ${CHANNELS.join(", ")}`);
      return true;
    }

    const releases = await listReleases(config);

    res.status(200).json(filterReleasesByChannel(releases, channel));
    return true;
  }

  if (pathname === "/latest") {
    const channel = parseChannel(_req);

    if (channel === null) {
      sendError(res, 400, `Invalid channel. Use one of: ${CHANNELS.join(", ")}`);
      return true;
    }

    const release = await getLatestReleaseByChannel(channel, false);

    if (!release) {
      sendError(res, 404, "Release not found");
      return true;
    }

    res.status(200).json(release);
    return true;
  }

  if (pathname === "/health") {
    res.status(200).json({
      ok: true,
      repository: config.repository,
    });
    return true;
  }

  return false;
};

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  setCommonHeaders(res);

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  if (req.method !== "GET") {
    sendError(res, 405, "Method not allowed");
    return;
  }

  try {
    setCacheHeaders(res);

    const pathname = getPathname(req);

    if (pathname === "/download") {
      await handleDownload(req, res);
      return;
    }

    if (pathname === "/update") {
      await handleUpdate(req, res);
      return;
    }

    const handled = await handleJsonRoute(pathname, req, res);

    if (handled) return;

    sendError(res, 404, "Not found");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected server error";

    sendError(res, 500, message);
  }
}
