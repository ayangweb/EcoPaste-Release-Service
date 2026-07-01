# EcoPaste Release Service

Personal Vercel API for EcoPaste release metadata and download redirects.

This project intentionally uses Vercel native handlers instead of Hono. The API is small enough that a framework would mostly add routing indirection.

## Endpoints

| Method | Path        | Description                                             |
| ------ | ----------- | ------------------------------------------------------- |
| `GET`  | `/`         | List EcoPaste releases with supported installer assets. |
| `GET`  | `/latest`   | Return the latest release for a channel.                |
| `GET`  | `/download` | Redirect or proxy an installer/update asset.            |
| `GET`  | `/update`   | Return release `latest.json` with Vercel download URLs. |
| `GET`  | `/health`   | Return a small health payload.                          |

## Query Parameters

| Endpoint                               | Parameter  | Values                                                            | Default                           | Description                                                                            |
| -------------------------------------- | ---------- | ----------------------------------------------------------------- | --------------------------------- | -------------------------------------------------------------------------------------- |
| `/`, `/latest`, `/download`, `/update` | `channel`  | `stable`, `beta`                                                  | Omitted, which means all releases | Selects a release channel. Leave it empty to use the newest release from all channels. |
| `/download`                            | `platform` | `windows-x64`, `macos-arm`, `macos-x64`                           | Required unless `asset` is set    | Selects the installer platform.                                                        |
| `/download`                            | `version`  | Release tag or version, such as `v0.6.0-beta.3` or `0.6.0-beta.3` | Latest release for `channel`      | Selects a specific release instead of the latest channel release.                      |
| `/download`                            | `asset`    | Release asset file name, such as `EcoPaste_x64.app.tar.gz`        | Empty                             | Downloads an exact updater asset. Used by rewritten `/update` manifests.               |
| `/download`                            | `proxy`    | `1`, `true`                                                       | Empty                             | Streams the asset through this service instead of redirecting.                         |

Example:

```text
/download?channel=beta&platform=macos-arm
```

When `channel=beta` is used on `/download` or `/update`, the service falls back to `stable` if no prerelease exists.

Supported platforms follow the current Rust-first EcoPaste release workflow:

- `windows-x64`
- `macos-arm`
- `macos-x64`

Linux is intentionally not exposed.

## Environment

```bash
GITHUB_REPOSITORY=EcoPasteHub/EcoPaste
GITHUB_TOKEN=
DOWNLOAD_PROXY_URL=
```

`DOWNLOAD_PROXY_URL` is optional. Leave it empty to redirect directly to GitHub, or set a prefix such as `https://gh-proxy.com/` to mirror the legacy API behavior.

`/update` fetches the release `latest.json`, keeps the signatures unchanged, and rewrites every `platforms.*.url` to `/download?version=<tag>&asset=<file>&proxy=1` on the same origin used by the request. This keeps updater traffic on your Vercel/custom domain instead of returning GitHub URLs to the client, and lets you change domains without changing configuration.

For EcoPaste's current Rust updater settings, use:

```bash
ECOPASTE_UPDATE_ENDPOINT=https://<your-vercel-domain>/update?channel=stable
ECOPASTE_UPDATE_BETA_ENDPOINT=https://<your-vercel-domain>/update?channel=beta
```

## Local Development

```bash
pnpm install
pnpm dev
pnpm typecheck
```
