# Repository Guidelines

## Project Structure & Module Organization
Core provider code lives in `src/`; credential helpers sit in `src/auth/` and the public surface is exported through `src/index.ts`. Documentation is grouped under `docs/`, runnable snippets under `examples/`, and the full PKCE CLI reference under `oauth-example/` (install dependencies inside that folder before running). Build artifacts land in `dist/`, and the root `tsconfig.json`, `eslint.config.js`, `tsup.config.ts`, and `vitest.config.ts` define TypeScript targets, linting, bundling, and test behavior.

## Build, Test, and Development Commands
`npm run build` bundles the library and copies auxiliary instruction files. Use `npm run dev` for a watch build, `npm run typecheck` for `tsc --noEmit`, and `npm run lint` or `npm run format:check` to enforce style; `npm run format` applies fixes. Run `npm run test`, `npm run test:coverage`, or `npm run test:watch` as needed. Example flows are available through `npm run example:<name>` (see `examples/README.md`) or `./run-all-examples.sh`.

## Coding Style & Naming Conventions
Prettier enforces 2-space indentation, single quotes, and trailing commas, with ESLint handling additional TypeScript best practices. Keep filenames kebab-case (`chatgpt-oauth-language-model.ts`), exported types `PascalCase`, and internals `camelCase`. Favor explicit return types on exported APIs and colocate small helpers near their usage for clarity.

## Testing Guidelines
Vitest powers the suite. Place specs beside implementations as `<name>.test.ts` or use `src/__tests__/` when sharing fixtures. Cover token refresh, error propagation, and provider registration paths, and add regression tests for fixes. Run `npm run test:coverage` before opening a pull request and document any intentional gaps.

## Commit & Pull Request Guidelines
Adopt Conventional Commits (`feat:`, `fix:`, `chore:`) in present tense, mirroring the existing history. Keep each change focused, squash local fixups, and confirm `npm run lint` plus `npm run test` succeed before pushing. Pull requests need a short summary, linked issues when applicable, and testing notes; attach screenshots or terminal logs when developer experience changes. Update docs or examples alongside behavioral updates.

## Security & Configuration Tips
Never commit ChatGPT OAuth tokens or Codex CLI artifacts; use environment variables or ignored local config instead. Document new configuration in a README or `.env.example`, and reuse `ChatGPTOAuthError` patterns for new failure modes to avoid leaking sensitive data.
