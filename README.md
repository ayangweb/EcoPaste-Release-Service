# EcoPaste Release Service

Personal Vercel API for EcoPaste release metadata and download redirects.

This project intentionally uses Vercel native handlers instead of Hono. The API is small enough that a framework would mostly add routing indirection.

## Endpoints

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/?channel=all` | List EcoPaste releases with supported installer assets. |
| `GET` | `/?channel=stable` | List stable releases. |
| `GET` | `/?channel=beta` | List prereleases. |
| `GET` | `/latest?channel=stable` | Return the latest stable GitHub release. |
| `GET` | `/latest?channel=beta` | Return the latest prerelease. |
| `GET` | `/download?channel=stable&platform=windows-x64` | Redirect to the latest stable installer for a platform. |
| `GET` | `/download?channel=beta&platform=macos-arm` | Redirect to the latest prerelease installer; falls back to stable when no prerelease exists. |
| `GET` | `/download?version=0.6.0-beta.3&platform=macos-arm` | Redirect to a specific release installer. |
| `GET` | `/update?channel=stable` | Redirect to the latest stable release `latest.json`. |
| `GET` | `/update?channel=beta` | Redirect to the latest prerelease `latest.json`; falls back to stable when no prerelease exists. |
| `GET` | `/health` | Return a small health payload. |

`channel` defaults to `all` on `/`, and to `stable` on `/latest`, `/download`, and `/update`.

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
