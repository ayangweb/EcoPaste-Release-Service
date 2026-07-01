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

const findInstallerUrl = (release: GitHubRelease, platform: string): string | undefined => {
  const suffix = PLATFORM_ASSET_SUFFIX[platform as keyof typeof PLATFORM_ASSET_SUFFIX];

  if (!suffix) return void 0;

  return release.assets.find((asset) => {
    return asset.name.endsWith(suffix);
  })?.browser_download_url;
};

const handleDownload = async (req: VercelRequest, res: VercelResponse): Promise<void> => {
  const config = getConfig();
  const platform = req.query.platform;
  const version = req.query.version;

  if (typeof platform !== "string" || !SUPPORTED_PLATFORMS.includes(platform as never)) {
    sendError(res, 400, `Invalid platform. Use one of: ${SUPPORTED_PLATFORMS.join(", ")}`);
    return;
  }

  let release: GitHubRelease | undefined;

  if (typeof version === "string" && version.length > 0) {
    const releases = await listReleases(config);

    release = findRelease(releases, version);
  } else {
    release = await getLatestStableRelease(config);
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
  const pathname = getPathname(req);
  const stableRelease = await getLatestStableRelease(config);
  const betaRelease = pathname === "/update/beta" ? await getLatestPrerelease(config) : void 0;
  const release = betaRelease || stableRelease;
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
    const releases = await listReleases(config);

    res.status(200).json(releases);
    return true;
  }

  if (pathname === "/latest") {
    const release = await getLatestStableRelease(config);

    res.status(200).json(release);
    return true;
  }

  if (pathname === "/stable") {
    const releases = await listReleases(config);

    res.status(200).json(
      releases.filter((release) => {
        return !release.prerelease;
      })
    );
    return true;
  }

  if (pathname === "/beta") {
    const releases = await listReleases(config);

    res.status(200).json(
      releases.filter((release) => {
        return release.prerelease;
      })
    );
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

    if (pathname === "/update" || pathname === "/update/beta") {
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
