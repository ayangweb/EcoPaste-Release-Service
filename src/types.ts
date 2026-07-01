export interface GitHubAsset {
  name: string;
  size: number;
  download_count: number;
  browser_download_url: string;
  [key: string]: unknown;
}

export interface GitHubRelease {
  name: string | null;
  tag_name: string;
  body: string | null;
  created_at: string;
  published_at: string | null;
  prerelease: boolean;
  assets: GitHubAsset[];
  [key: string]: unknown;
}

export interface ApiError {
  error: {
    message: string;
  };
}

export interface UpdateManifestPlatform {
  signature: string;
  url: string;
  [key: string]: unknown;
}

export interface UpdateManifest {
  version: string;
  notes?: string;
  pub_date?: string;
  platforms?: Record<string, UpdateManifestPlatform>;
  [key: string]: unknown;
}
