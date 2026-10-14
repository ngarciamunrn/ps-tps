# TP Selection Web App Harness

## Objective
Prepare a maintainable development harness for a static React app deployed to GitHub Pages and connected to Supabase. This task does not implement student registration or enrollment business rules.

## Problem and Why
The repository currently contains no application or development tooling. The project needs a reproducible frontend, local quality checks, deployment automation, Supabase configuration, and repo-specific AI guidance before feature work begins.

## Scope and Constraints
- Use React, TypeScript, Vite, npm, and Supabase JS.
- Deploy the static build to GitHub Pages with repository-safe asset paths.
- Expose only Supabase URL and publishable key in the browser; never add secret/service-role credentials.
- Keep the application scaffold honest: do not invent TP records, capacity rules, duplicate-enrollment behavior, or database authorization policies.
- Add one repository-local custom agent and one focused skill, in addition to the root agent instructions.
- Preserve the existing untracked `.gitignore` content.
- TDD mode: unknown; use ordinary functional checks and do not claim RED/GREEN evidence.
- Route: delegated direct writer, because this work changes multiple non-trivial files and has related setup and documentation.
- Delivery strategy: ask-on-risk; no branch or commit is authorized by this task.

## Tasks
- [x] T1: Scaffold React/TypeScript/Vite application, Supabase client/configuration, and npm scripts.
- [x] T2: Add lint, typecheck, unit-test harness, and CI verification.
- [x] T3: Add GitHub Pages deployment workflow and concise setup documentation.
- [x] T4: Add root agent instructions, a focused custom agent, and a Supabase capacity skill.

## Acceptance Criteria
- A fresh checkout can install dependencies from the committed lockfile and run the documented local checks.
- The application builds as a static site suitable for GitHub Pages project paths.
- Supabase configuration works without credentials at scaffold time and clearly reports missing public configuration.
- No secret Supabase key is referenced by frontend code or committed configuration.
- The repo-local agent and skill files follow VS Code customization conventions and the skill style guide.
- Documentation explains local setup, required environment values, Pages setup, and what remains intentionally unimplemented.

## Verification
- `npm run lint`
- `npm run typecheck`
- `npm run test -- --run`
- `npm run build`
- Read back changed instructions/skill frontmatter and the final GitHub Actions workflow.

## Progress
- T1 implemented; `npm run build` passed, including TypeScript checking.
- T2 implemented; `npm run test -- --run` passed (1 test file, 2 tests), `npm run lint` passed, `npm run typecheck` passed, and `npm run build` passed with Vite 7.3.7.
- T3 implemented; `npm run build` passed (`tsc --noEmit` passed; Vite 7.3.7 transformed 73 modules and built the production site in 3.72s). Workflow readback confirmed the `main` trigger, requested action versions, Pages permissions, `github-pages` environment and URL output, and `dist` artifact upload.
- T4 implemented; readback confirmed the root instruction topics and skill registry entry, reviewer tool scope `[read, search]`, complete skill frontmatter (`name` matches folder; quoted single-line trigger-first description is under 160 characters; Apache-2.0 license and author/version metadata), required skill section order, and local-only references. No application runtime tests were run for this passive customization content.

## Next Step
- Harness tasks T1-T4 are complete. Future enrollment/capacity implementation must first resolve the product decisions documented in the local skill.