# EcoPaste Release Service

Personal Vercel API for EcoPaste release metadata and download redirects.

This project intentionally uses Vercel native handlers instead of Hono. The API is small enough that a framework would mostly add routing indirection.

## Endpoints

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/` | List EcoPaste releases with supported installer assets. |
| `GET` | `/latest` | Return the latest stable GitHub release. |
| `GET` | `/stable` | List stable releases. |
| `GET` | `/beta` | List prereleases. |
| `GET` | `/download?platform=windows-x64` | Redirect to the latest stable installer for a platform. |
| `GET` | `/download?version=0.6.0-beta.3&platform=macos-arm` | Redirect to a specific release installer. |
| `GET` | `/update` | Redirect to the latest stable release `latest.json`. |
| `GET` | `/update/beta` | Redirect to the latest prerelease `latest.json`; falls back to stable when no prerelease exists. |
| `GET` | `/health` | Return a small health payload. |

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
ECOPASTE_UPDATE_ENDPOINT=https://<your-vercel-domain>/update
ECOPASTE_UPDATE_BETA_ENDPOINT=https://<your-vercel-domain>/update/beta
```

## Local Development

```bash
pnpm install
pnpm dev
pnpm typecheck
```
