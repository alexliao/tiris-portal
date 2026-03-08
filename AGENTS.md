# Repository Guidelines

## Project Structure & Module Organization
- `src/` holds the React + TypeScript app. Key areas include `components/`, `pages/`, `hooks/`, `contexts/`, `services/`, and `utils/`.
- `src/assets/` is for app-specific images; `public/` is for static files served as-is.
- `tests/` contains Playwright end-to-end specs (e.g., `tests/navigation.spec.ts`).
- `docs/` and `scripts/` hold project notes and helper tooling; `tools/` includes local MCP/Playwright utilities.
- Build output goes to `dist/`.

## Build, Test, and Development Commands
- `npm run dev` starts the Vite dev server for local development.
- `npm run build` compiles TypeScript and produces a production build in `dist/`.
- `npm run preview` serves the production build locally.
- `npm run lint` runs ESLint across the codebase.
- `npm test` runs the full Playwright suite; `npm run test:ui` opens the UI runner; `npm run test:mobile` targets the mobile navigation spec.
- Use .env to start the local dev server. 

## Coding Style & Naming Conventions
- Use 2-space indentation, TypeScript for logic, and TSX for React views.
- Components use PascalCase names (e.g., `PortfolioCard.tsx`), hooks use `useX` naming.
- Linting is enforced via `eslint.config.js` with React Hooks and React Refresh rules.

## Testing Guidelines
- Playwright (`@playwright/test`) is the E2E framework.
- Test files live in `tests/` and follow `*.spec.ts` naming.
- Prefer adding or updating a spec when changing user flows (navigation, trading, onboarding).

## Commit & Pull Request Guidelines
- Recent commits use short, imperative, sentence-case messages (e.g., “Add portfolio detail view”). Keep them concise and scoped.
- PRs should describe the user-facing change, list key files touched, and include screenshots for UI changes. Link related issues when available.

## Optional: Local Tooling Notes
- The repo includes Playwright MCP helpers in `tools/mcp-playwright.cjs` with scripts like `npm run mcp:playwright:smoke` for quick checks.

## Language
Always repeat the user's input in English with correct and natural expression, no matter which language the user is speaking. Correct the language error if the user is speaking in English.
Always responds in English, unless the user explictly ask for the response in other languages.

## Other
Add comments directly under function signatures that explain each function’s purpose, inputs, and return values.