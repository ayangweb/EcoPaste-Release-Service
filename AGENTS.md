# AGENTS.md

## Project Notes

- This service is a small Vercel API for EcoPaste release metadata, update manifests, and download redirects.
- Keep changes scoped and prefer the existing TypeScript/Vercel handler style.
- Run `./node_modules/.bin/tsc --noEmit` before committing code changes when dependencies are installed.

## Commit Rules

- Use Conventional Commits for every commit and push.
- Format commit messages as `type(scope): summary`.
- Use common types such as `feat`, `fix`, `docs`, `refactor`, `test`, `chore`, and `ci`.
- Keep the summary concise, imperative, and lowercase unless it contains a proper noun.
- Add a body when the change needs extra context, migration notes, or behavioral details.

Examples:

```text
feat(api): support nightly release channel
fix(api): include rc releases in beta channel
docs(readme): document update endpoints
```
