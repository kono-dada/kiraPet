# Repository Guidelines

## Project Structure & Module Organization
- `src/`: Vue 3 + TypeScript UI (Composition API, Pinia stores in `src/stores`, routes in `src/router`, utilities in `src/utils`, constants in `src/constants`).
- `src/services/`: Integrations and background logic; existing test lives at `src/services/contextSources/activityWatch/activityWatch.test.ts`.
- `src-tauri/`: Tauri backend (Rust) plus capability configs and icons; desktop packaging lives here.
- `public/` and `assets/`: Static assets bundled by Vite; prefer `src/assets` for imported media.

## Build, Test, and Development Commands
- `pnpm install`: Install JS dependencies (preferred package manager; lockfile is `pnpm-lock.yaml`).
- `pnpm dev`: Start Vite dev server for the web UI.
- `pnpm tauri dev`: Run the desktop app with Tauri (requires Rust toolchain and `tauri` CLI).
- `pnpm build`: Type-check (`vue-tsc`) then build production assets.
- `pnpm preview`: Serve the built web bundle locally for smoke checks.
- `pnpm test`: Run the Node test suite (currently targets `activityWatch` service via `node --test` with `ts-node` loader).

## Coding Style & Naming Conventions
- Language: TypeScript (strict mode); Vue SFCs with `<script setup>` preferred.
- Indentation: 2 spaces; keep imports ordered (external → aliased `@/...` → relative).
- Path aliases: use `@/` for `src`, plus `services/*`, `stores/*`, `components/*`, `utils/*`, `types/*` from `tsconfig.json`.
- Components: PascalCase filenames; composables in `src/composables` as `useThing.ts`; Pinia stores as `useXStore.ts`.
- Avoid introducing global state outside Pinia; prefer Zod for runtime validation when crossing service boundaries.
- Use Chinese to comment and document code. Also reply in Chinese when discussing code.

## Testing Guidelines
- Framework: Node built-in test runner with `ts-node/esm`.
- Naming: co-locate tests with code as `*.test.ts`.
- Expectations: keep tests deterministic and offline; mock OS/context sources where possible.
- Coverage focus areas: context-source integrations, store mutations, and critical UI flows that hit Tauri APIs.
- Run `pnpm test` before PRs; add minimal fixtures under `src/services/.../__fixtures__` when needed.

## Commit & Pull Request Guidelines
- Commit style follows conventional prefixes seen in history (`fix: ...`, `feat: ...`, `chore: ...`); keep subjects under ~72 chars and prefer imperative mood.
- PRs should include: brief summary, linked issue (if any), screenshots or screen recordings for UI changes, and notes on manual/automated tests run.
- Keep changes scoped; separate refactors from feature commits when possible.

## Security & Configuration Tips
- Tauri capabilities are locked down via `src-tauri/capabilities`; request only the plugins you use (fs, dialog, http, etc.).
- Store secrets outside the repo; use environment variables or the Tauri secret store. Never commit API keys.
- When adding new context sources, validate inputs with Zod and guard file/system access to avoid leaking host data.
