import { PLATFORM_ASSET_SUFFIX, UPDATE_MANIFEST_NAME } from "./constants.js";
import type { ApiConfig } from "./config.js";
import type { GitHubAsset, GitHubRelease } from "./types.js";

const GITHUB_API_BASE = "https://api.github.com/repos";

const getGitHubHeaders = (config: ApiConfig): Record<string, string> => {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "User-Agent": "EcoPaste-Release-Service",
    "X-GitHub-Api-Version": "2022-11-28",
  };

  if (config.githubToken) {
    headers.Authorization = `Bearer ${config.githubToken}`;
  }

  return headers;
};

const getProxyUrl = (url: string, config: ApiConfig): string => {
  if (!config.downloadProxyUrl) return url;

  return `${config.downloadProxyUrl.replace(/\/$/, "")}/${url}`;
};

const isSupportedInstaller = (asset: GitHubAsset): boolean => {
  return Object.values(PLATFORM_ASSET_SUFFIX).some((suffix) => {
    return asset.name.endsWith(suffix);
  });
};

const normalizeAsset = (asset: GitHubAsset, config: ApiConfig): GitHubAsset => {
  return {
    ...asset,
    browser_download_url: getProxyUrl(asset.browser_download_url, config),
  };
};

const normalizeRelease = (release: GitHubRelease, config: ApiConfig): GitHubRelease => {
  return {
    ...release,
    assets: release.assets.filter(isSupportedInstaller).map((asset) => {
      return normalizeAsset(asset, config);
    }),
  };
};

const requestGitHub = async <T>(path: string, config: ApiConfig): Promise<T> => {
  const response = await fetch(`${GITHUB_API_BASE}/${config.repository}${path}`, {
    headers: getGitHubHeaders(config),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`GitHub request failed: ${response.status} ${detail}`);
  }

  return response.json() as Promise<T>;
};

export const listReleases = async (config: ApiConfig): Promise<GitHubRelease[]> => {
  const releases = await requestGitHub<GitHubRelease[]>("/releases", config);

  return releases.map((release) => {
    return normalizeRelease(release, config);
  });
};

export const getLatestStableRelease = async (config: ApiConfig): Promise<GitHubRelease> => {
  const release = await requestGitHub<GitHubRelease>("/releases/latest", config);

  return normalizeRelease(release, config);
};

export const findRelease = (
  releases: GitHubRelease[],
  version: string
): GitHubRelease | undefined => {
  const normalizedVersion = version.startsWith("v") ? version : `v${version}`;

  return releases.find((release) => {
    return (
      release.tag_name === normalizedVersion ||
      release.tag_name === version ||
      release.name === normalizedVersion ||
      release.name === version ||
      release.tag_name.endsWith(version) ||
      Boolean(release.name?.endsWith(version))
    );
  });
};

export const getReleaseManifestUrl = (release: GitHubRelease, config: ApiConfig): string => {
  const manifestAsset = release.assets.find((asset) => {
    return asset.name === UPDATE_MANIFEST_NAME;
  });

  if (manifestAsset) {
    return getProxyUrl(manifestAsset.browser_download_url, config);
  }

  const directUrl = `https://github.com/${config.repository}/releases/download/${release.tag_name}/${UPDATE_MANIFEST_NAME}`;

  return getProxyUrl(directUrl, config);
};

export const getLatestPrerelease = async (
  config: ApiConfig
): Promise<GitHubRelease | undefined> => {
  const releases = await listReleases(config);

  return releases.find((release) => {
    return release.prerelease;
  });
};
