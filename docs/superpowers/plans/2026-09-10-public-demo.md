# Public nesting demo implementation plan

> Execution: follow executing-plans in this isolated, initially empty frontend repository. User authorized implementation and GitHub Pages publication on 2026-09-10.

**Goal:** Publish a Chinese nesting workbench with accurate, clearly labeled illustrative results; keep all solver implementation outside this repository.

**Architecture:** Vue UI loads synthetic polygon examples, computes display metrics, previews local TXT files, and exports SVG/JSON. GitHub Actions publishes only the Vite dist directory. A documented public configuration reserves a future HTTPS backend address, but this release does not claim real solving.

**Tech stack:** Vue 3, TypeScript, Vite, Vitest, Playwright, GitHub Pages.

**Spec:** User-approved conversation architecture and `docs/design.md`.

## Global constraints

- Publish only this independent repository. Never copy solver code, binaries, private input files, Git history, credentials, or private host addresses.
- Default base path `/nesting-demo/`.
- Preview must explicitly identify precomputed illustrative data and never simulate running a private solver.
- All sample polygons are authored for this public demo. Metrics must be computed from their coordinates.
- File size maximum 1 MiB; at most 500 pieces and 10,000 total vertices for browser preview. Client parsing is not a substitute for server validation.
- Backend configuration is public and contains no secrets. Backend integration remains disabled until an endpoint and contract are verified.

## Task 1: Data and geometry

Files: `src/lib/geometry.ts`, `src/lib/instances.ts`, `src/lib/samples.ts`, `src/lib/export.ts`, `src/types.ts`, `tests/domain.test.ts`.

- [x] Add failing cases for area, bounds, quantity parsing, malformed coordinates, quota enforcement, SVG escaping, and legal sample placement.
- [x] Run `npm test` and verify missing behavior fails.
- [x] Implement parser for the existing coordinate-row TXT format; strip and bin synthetic samples; independently calculated metrics; safe SVG export.
- [x] Verify all samples contain finite coordinates, stay within containers, and do not overlap.

## Task 2: Workbench

Files: `src/App.vue`, `src/components/NestingCanvas.vue`, `src/style.css`, `src/main.ts`, `index.html`, `public/config.json`.

- [x] Build the concept's header, settings rail, metrics band, dotted canvas and quiet footer.
- [x] Wire mode and sample switches, upload preview, labels, fit/zoom, container selection, and downloads.
- [x] Reset stale result and selection on input changes; keep example parameters read-only and explain why.
- [x] Add keyboard-accessible usage dialog and concise error feedback.
- [x] Test browser flow at desktop and mobile widths, including uploading TXT, invalid input and actual download.

## Task 3: Publication

Files: `.github/workflows/pages.yml`, `README.md`, `docs/backend-contract.md`, `docs/verification.md`.

- [x] Run unit tests, typecheck/build and browser checks.
- [x] Inspect generated concept and browser render with view_image; record copy/layout/typography/palette/geometry/responsive comparison.
- [ ] Request independent review while finishing deployment documentation, fix material issues, and rerun affected checks.
- [x] Audit the tracked files and built assets for private content.
- [ ] Commit only this repository, push the initial main branch and activate GitHub Pages if authenticated administration is available.
- [ ] Verify the published site or report the exact remaining Pages setup step if administration is unavailable.
