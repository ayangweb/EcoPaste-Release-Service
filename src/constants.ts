export const DEFAULT_REPOSITORY = "EcoPasteHub/EcoPaste";
export const DEFAULT_DOWNLOAD_PROXY_URL = "https://v4.gh-proxy.org";

export const PLATFORM = {
  WINDOWS_X64: "windows-x64",
  MACOS_ARM: "macos-arm",
  MACOS_X64: "macos-x64",
} as const;

export type Platform = (typeof PLATFORM)[keyof typeof PLATFORM];

export const PLATFORM_ASSET_SUFFIX: Record<Platform, string> = {
  [PLATFORM.WINDOWS_X64]: "x64-setup.exe",
  [PLATFORM.MACOS_ARM]: "aarch64.dmg",
  [PLATFORM.MACOS_X64]: "x64.dmg",
};

export const SUPPORTED_PLATFORMS = Object.values(PLATFORM);

export const UPDATE_MANIFEST_NAME = "latest.json";
