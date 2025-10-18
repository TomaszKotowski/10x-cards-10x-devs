# Repository Guidelines

## Project Structure & Module Organization
- `src/pages` (Astro routes), `src/components` (Astro) and `src/components/ui` (React TSX), `src/layouts`, `src/lib` (utils), `src/styles`.
- `public` for static assets. Use path alias `@/*` → `src/*`.
- Astro server output with Node adapter (standalone), dev server on port 3000.

## Build, Test, and Development Commands
- `npm run dev` — start Astro dev server.
- `npm run build` — production build (server output, Node adapter).
- `npm run preview` — preview the built app.
- `npm run lint` / `npm run lint:fix` — ESLint (Flat config: Astro, React, a11y, Prettier).
- `npm run format` — Prettier formatting.

## Coding Style & Naming Conventions
- TypeScript + Astro + React 19. Keep components small and typed.
- Prettier: 2 spaces, double quotes, semicolons, `printWidth` 120, trailing commas `es5`.
- React components in `src/components/ui` (TSX). Prefer PascalCase exports; keep filenames consistent within the folder (e.g., `button.tsx`, export `Button`).
- Astro components in `src/components` (e.g., `Welcome.astro`).
- Utilities in `src/lib` with camelCase functions (e.g., `cn`).
- Linting runs on commit via Husky + lint-staged.

## Testing Guidelines
- No test runner configured yet. If adding tests, use Vitest + Testing Library.
- Place tests under `src/**/__tests__` or `*.test.ts(x)`; keep unit tests fast and deterministic.
- Add `npm test` script and ensure CI can run it before merging.

## Commit & Pull Request Guidelines
- Commits: clear, imperative tense (e.g., "Add landing layout", "Fix ESLint config").
- PRs should include: purpose, summary of changes, screenshots for UI, steps to verify, and linked issues.
- Ensure `npm run lint` and `npm run build` pass locally. Update docs when behavior or scripts change.

## Security & Configuration
- Never commit secrets. Copy `.env.example` to `.env` and set `SUPABASE_URL`, `SUPABASE_KEY`, `OPENROUTER_API_KEY`.
- Use Node version from `.nvmrc` (v22.14.0). Install via `nvm use`.
- Prefer alias imports (`@/lib/utils`) over deep relative paths.
