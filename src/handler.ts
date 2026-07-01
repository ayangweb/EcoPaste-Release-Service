import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getConfig } from "./config.js";
import { PLATFORM_ASSET_SUFFIX, SUPPORTED_PLATFORMS } from "./constants.js";
import {
  findRelease,
  getLatestPrerelease,
  getLatestStableRelease,
  getReleaseManifestUrl,
  listReleases,
} from "./github.js";
import { getPathname, sendError, setCacheHeaders, setCommonHeaders } from "./http.js";
import type { GitHubRelease } from "./types.js";

const CHANNEL = {
  ALL: "all",
  BETA: "beta",
  STABLE: "stable",
} as const;

type Channel = (typeof CHANNEL)[keyof typeof CHANNEL];

const CHANNELS = Object.values(CHANNEL);

const getQueryValue = (value: VercelRequest["query"][string]): string | undefined => {
  if (Array.isArray(value)) return value[0];

  return value;
};

const parseChannel = (
  req: VercelRequest,
  defaultChannel: Channel,
  allowedChannels: Channel[] = CHANNELS
): Channel | undefined => {
  const value = getQueryValue(req.query.channel) || defaultChannel;

  if (!allowedChannels.includes(value as Channel)) return void 0;

  return value as Channel;
};

const findInstallerUrl = (release: GitHubRelease, platform: string): string | undefined => {
  const suffix = PLATFORM_ASSET_SUFFIX[platform as keyof typeof PLATFORM_ASSET_SUFFIX];

  if (!suffix) return void 0;

  return release.assets.find((asset) => {
    return asset.name.endsWith(suffix);
  })?.browser_download_url;
};

const filterReleasesByChannel = (
  releases: GitHubRelease[],
  channel: Channel
): GitHubRelease[] => {
  if (channel === CHANNEL.ALL) return releases;

  return releases.filter((release) => {
    return channel === CHANNEL.BETA ? release.prerelease : !release.prerelease;
  });
};

const getLatestReleaseByChannel = async (
  channel: Channel,
  fallbackToStable = true
): Promise<GitHubRelease | undefined> => {
  const config = getConfig();

  if (channel === CHANNEL.STABLE || channel === CHANNEL.ALL) {
    return getLatestStableRelease(config);
  }

  const betaRelease = await getLatestPrerelease(config);
  if (betaRelease) return betaRelease;
  if (!fallbackToStable) return void 0;

  return getLatestStableRelease(config);
};

const handleDownload = async (req: VercelRequest, res: VercelResponse): Promise<void> => {
  const config = getConfig();
  const platform = getQueryValue(req.query.platform);
  const version = getQueryValue(req.query.version);
  const channel = parseChannel(req, CHANNEL.STABLE, [CHANNEL.STABLE, CHANNEL.BETA]);

  if (typeof platform !== "string" || !SUPPORTED_PLATFORMS.includes(platform as never)) {
    sendError(res, 400, `Invalid platform. Use one of: ${SUPPORTED_PLATFORMS.join(", ")}`);
    return;
  }

  if (!channel) {
    sendError(res, 400, "Invalid channel. Use one of: stable, beta");
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

  const downloadUrl = findInstallerUrl(release, platform);

  if (!downloadUrl) {
    sendError(res, 404, `No installer found for ${platform} in ${release.tag_name}`);
    return;
  }

  res.redirect(302, downloadUrl);
};

const handleUpdate = async (req: VercelRequest, res: VercelResponse): Promise<void> => {
  const config = getConfig();
  const channel = parseChannel(req, CHANNEL.STABLE, [CHANNEL.STABLE, CHANNEL.BETA]);

  if (!channel) {
    sendError(res, 400, "Invalid channel. Use one of: stable, beta");
    return;
  }

  const release = await getLatestReleaseByChannel(channel);

  if (!release) {
    sendError(res, 404, "Release not found");
    return;
  }

  const manifestUrl = getReleaseManifestUrl(release, config);

  res.redirect(302, manifestUrl);
};

const handleJsonRoute = async (
  pathname: string,
  _req: VercelRequest,
  res: VercelResponse
): Promise<boolean> => {
  const config = getConfig();

  if (pathname === "/" || pathname === "") {
    const channel = parseChannel(_req, CHANNEL.ALL);

    if (!channel) {
      sendError(res, 400, `Invalid channel. Use one of: ${CHANNELS.join(", ")}`);
      return true;
    }

    const releases = await listReleases(config);

    res.status(200).json(filterReleasesByChannel(releases, channel));
    return true;
  }

  if (pathname === "/latest") {
    const channel = parseChannel(_req, CHANNEL.STABLE, [CHANNEL.STABLE, CHANNEL.BETA]);

    if (!channel) {
      sendError(res, 400, "Invalid channel. Use one of: stable, beta");
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
