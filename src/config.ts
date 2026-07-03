import { DEFAULT_DOWNLOAD_PROXY_URL, DEFAULT_REPOSITORY } from "./constants.js";

export interface ApiConfig {
  repository: string;
  githubToken?: string;
  downloadProxyUrl?: string;
}

export const getConfig = (): ApiConfig => {
  const repository = process.env.GITHUB_REPOSITORY || DEFAULT_REPOSITORY;
  const githubToken = process.env.GITHUB_TOKEN || void 0;
  const downloadProxyUrl = process.env.DOWNLOAD_PROXY_URL ?? DEFAULT_DOWNLOAD_PROXY_URL;

  return {
    repository,
    githubToken,
    downloadProxyUrl,
  };
};
