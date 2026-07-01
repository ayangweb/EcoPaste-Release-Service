# EcoPaste Release Service

Personal Vercel API for EcoPaste release metadata and download redirects.

This project intentionally uses Vercel native handlers instead of Hono. The API is small enough that a framework would mostly add routing indirection.

## Endpoints

| Method | Path        | Description                                             |
| ------ | ----------- | ------------------------------------------------------- |
| `GET`  | `/`         | List EcoPaste releases with supported installer assets. |
| `GET`  | `/latest`   | Return the latest release for a channel.                |
| `GET`  | `/download` | Redirect to an installer for a platform.                |
| `GET`  | `/update`   | Redirect to a release `latest.json`.                    |
| `GET`  | `/health`   | Return a small health payload.                          |

## Query Parameters

| Endpoint                               | Parameter  | Values                                                            | Default                           | Description                                                                            |
| -------------------------------------- | ---------- | ----------------------------------------------------------------- | --------------------------------- | -------------------------------------------------------------------------------------- |
| `/`, `/latest`, `/download`, `/update` | `channel`  | `stable`, `beta`                                                  | Omitted, which means all releases | Selects a release channel. Leave it empty to use the newest release from all channels. |
| `/download`                            | `platform` | `windows-x64`, `macos-arm`, `macos-x64`                           | Required                          | Selects the installer platform.                                                        |
| `/download`                            | `version`  | Release tag or version, such as `v0.6.0-beta.3` or `0.6.0-beta.3` | Latest release for `channel`      | Selects a specific release instead of the latest channel release.                      |

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
