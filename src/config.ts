import { DEFAULT_REPOSITORY } from "./constants.js";

export interface ApiConfig {
  repository: string;
  githubToken?: string;
  downloadProxyUrl?: string;
  publicBaseUrl?: string;
}

export const getConfig = (): ApiConfig => {
  const repository = process.env.GITHUB_REPOSITORY || DEFAULT_REPOSITORY;
  const githubToken = process.env.GITHUB_TOKEN || void 0;
  const downloadProxyUrl = process.env.DOWNLOAD_PROXY_URL || void 0;
  const publicBaseUrl =
    process.env.PUBLIC_BASE_URL ||
    process.env.VERCEL_PROJECT_PRODUCTION_URL ||
    void 0;

  return {
    repository,
    githubToken,
    downloadProxyUrl,
    publicBaseUrl,
  };
};
