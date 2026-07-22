# EcoPaste Release Service

Personal Vercel API for EcoPaste release metadata and download redirects.

This project intentionally uses Vercel native handlers instead of Hono. The API is small enough that a framework would mostly add routing indirection.

## Endpoints

| Method | Path        | Description                                             |
| ------ | ----------- | ------------------------------------------------------- |
| `GET`  | `/`         | List EcoPaste releases with supported installer assets. |
| `GET`  | `/latest`   | Return the latest release for a channel.                |
| `GET`  | `/download` | Redirect or proxy an installer/update asset.            |
| `GET`  | `/update`   | Return release `latest.json` with accelerated asset URLs. |
| `GET`  | `/health`   | Return a small health payload.                          |

## Query Parameters

| Endpoint                               | Parameter  | Values                                                            | Default                           | Description                                                                            |
| -------------------------------------- | ---------- | ----------------------------------------------------------------- | --------------------------------- | -------------------------------------------------------------------------------------- |
| `/`, `/latest`, `/download`, `/update` | `channel`  | `stable`, `beta`, `nightly`                                       | Omitted, which means all releases | Selects a release channel. Leave it empty to use the newest release from all channels. |
| `/download`                            | `platform` | `windows-x64`, `macos-arm`, `macos-x64`                           | Required unless `asset` is set    | Selects the installer platform.                                                        |
| `/download`                            | `version`  | Release tag or version, such as `v0.6.0-beta.3` or `0.6.0-beta.3` | Latest release for `channel`      | Selects a specific release instead of the latest channel release.                      |
| `/download`                            | `asset`    | Release asset file name, such as `EcoPaste_x64.app.tar.gz`        | Empty                             | Downloads an exact updater asset. Used by rewritten `/update` manifests.               |
| `/download`                            | `proxy`    | `1`, `true`                                                       | Empty                             | Streams the asset through this service instead of redirecting.                         |

Example:

```text
/download?channel=beta&platform=macos-arm
```

Nightly releases use tags like `v1.0.1-nightly.20260708.4`.

The `beta` channel matches both beta and release-candidate tags, such as `v1.0.1-beta.1` and `v1.0.1-rc.1`.

When `channel=beta` or `channel=nightly` is used on `/download` or `/update`, the service compares the latest stable release with the latest matching prerelease. It returns the stable release when its semantic version is newer or equal, and only returns the prerelease when that version is newer.

Supported platforms follow the current Rust-first EcoPaste release workflow:

- `windows-x64`
- `macos-arm`
- `macos-x64`

Linux is intentionally not exposed.

## Environment

```bash
GITHUB_REPOSITORY=EcoPasteHub/EcoPaste
GITHUB_TOKEN=
DOWNLOAD_PROXY_URL=https://cdn.gh-proxy.org
```

`DOWNLOAD_PROXY_URL` is the reusable download acceleration prefix. It defaults to `https://cdn.gh-proxy.org`; set it to another prefix when you want to switch mirrors, or set it to an empty string to redirect directly to GitHub.

`/update` fetches the release `latest.json`, keeps the signatures unchanged, resolves every `platforms.*.url` GitHub asset API endpoint to its `browser_download_url`, and then applies the download acceleration prefix. For example, `https://api.github.com/repos/EcoPasteHub/EcoPaste/releases/assets/485441671` resolves to its GitHub release download URL before becoming `https://cdn.gh-proxy.org/https://github.com/EcoPasteHub/EcoPaste/releases/download/v1.1.0/EcoPaste_1.1.0_aarch64.app.tar.gz`.

For EcoPaste's current Rust updater settings, use:

```bash
ECOPASTE_UPDATE_ENDPOINT=https://<your-vercel-domain>/update?channel=stable
ECOPASTE_UPDATE_BETA_ENDPOINT=https://<your-vercel-domain>/update?channel=beta
ECOPASTE_UPDATE_NIGHTLY_ENDPOINT=https://<your-vercel-domain>/update?channel=nightly
```

## Local Development

```bash
pnpm install
pnpm dev
pnpm typecheck
```
