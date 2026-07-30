# Dave Bryson Portfolio

This repository contains Dave Bryson's multi-page portfolio for fintech risk, fraud, AML/CFT, merchant risk, payments operations, and data science. The production website is [walawala254.github.io](https://walawala254.github.io/).

The repository now contains a Vite-based vanilla JavaScript foundation, the documented Risk Intelligence Circuit design system, and an isolated Motion and 3D Technical Prototype lab. The five public routes and their current behavior remain separate from the lab; the complete Phase 3 homepage has not started.

## Branch and deployment policy

- `main` remains the production branch.
- Development for version three remains on `redesign/risk-intelligence-v3`.
- GitHub Pages continues to use its existing production configuration; this phase does not switch Pages to GitHub Actions.
- The CI workflow builds and validates the redesign branch but cannot deploy.
- Do not merge the Vite foundation into `main` until an approved production build-output deployment method is ready; the current branch-based Pages source does not publish `dist/`.
- Production deployment, merging to `main`, force-pushing, history rewriting, and changes to GitHub Pages or Vercel production settings require explicit approval.
- Portfolio version two can be restored from commit `3ff63e37b2560e5a7f1870dd047c0a3582c87c99`.

## Local setup

Use Node.js `24.18.0`, recorded in `.node-version`. Vite also supports Node.js `^20.19.0 || >=22.12.0`.

```powershell
npm ci
npm run dev
```

Vite prints the local development URL, normally `http://localhost:5173/`.

Available commands:

- `npm run dev` starts the development server.
- `npm run build` builds every HTML route and validates the generated routes and local assets.
- `npm run preview` serves the production build locally, normally at `http://localhost:4173/`.
- `npm run test:browser` runs the dependency-free Edge/Chrome smoke test against a separately running preview server.
- `npm run test:prototypes` runs the isolated SVG, Canvas 2D, and Three.js lifecycle and responsive smoke tests against a separately running preview server.
- `npm run validate:build` validates an existing `dist` directory.

## Architecture

This remains a static multi-page website. Vite treats these documents as separate build inputs:

- `index.html`
- `about.html`
- `services.html`
- `portfolio.html`
- `contact.html`
- `404.html`

There is no single-page router. Essential navigation is present in every source document and remains visible in generated HTML when JavaScript is unavailable. `script.js` is the shared module entry point; it initializes the immediately used navigation, reveal, and page-flow modules under `src/scripts/`.

The repeated header, navigation, and footer are deliberately still authored in each page. A build-time partial system is deferred until its maintenance benefit outweighs the extra templating or transformation complexity.

Static public files such as the favicon, crawler policy, and sitemap live in `public/`. Vite copies them to the root of `dist/`. The production base is `/`, which matches this GitHub user site.

The Risk Intelligence Circuit visual language, tokens, component hierarchy, responsive rules, and accessibility constraints are documented in [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md).

## Motion and 3D prototype lab

The lab compares three isolated implementations of the same transaction-signal narrative:

- `prototypes/svg-css.html`
- `prototypes/canvas-2d.html`
- `prototypes/three-js.html`

`prototypes/index.html` links the comparison routes. All four pages are `noindex, nofollow`, are absent from the sitemap, and are not linked from the production portfolio. They are build inputs for controlled testing, not a production homepage change.

[PROTOTYPE_EVALUATION.md](PROTOTYPE_EVALUATION.md) records dependency licences, measured chunks, lifecycle evidence, the full comparison, and the recommendation to use SVG/CSS for the homepage Risk Intelligence Core.

## Accessibility principles

- Preserve semantic landmarks and logical heading order.
- Keep essential navigation available without JavaScript.
- Expose the current page with `aria-current="page"`.
- Keep a closed mobile menu out of the keyboard focus order and return focus to its toggle when dismissed with the toggle or Escape.
- Preserve visible keyboard focus and the existing `prefers-reduced-motion` behavior.
- Add accessible names only to elements with appropriate semantics.
- Treat keyboard, narrow-screen, reduced-motion, and screen-reader checks as release requirements.

## Asset and open-source policy

No current image is deleted or replaced in Phase 1. [ASSET_REGISTER.md](ASSET_REGISTER.md) records use, file size, known provenance, rights status, and replacement intent. Assets without confirmed rights remain provisional or quarantined and must not be reused outside the current controlled baseline without review.

Do not add images, models, textures, fonts, audio, or copied proprietary code without documenting their source, licence, and permitted use. [OPEN_SOURCE_ATTRIBUTIONS.md](OPEN_SOURCE_ATTRIBUTIONS.md) records the direct development dependency, CI actions, and retained externally hosted front-end resources.

## Future Three.js policy

Three.js is installed only for the approved isolated comparison. The procedural prototype includes dynamic visibility loading, low-power quality reduction, DPR caps, reduced-motion and WebGL fallbacks, visibility pausing, and full disposal. It is not approved for homepage integration because its added depth did not justify its measured bundle and runtime cost. Any future Three.js use still requires separate evidence and approval.

## Production and rollback

`npm run build` writes a disposable local artifact to `dist/`; it does not deploy. To roll back local Phase 1 work, preserve any uncommitted user work first, then create a new branch or worktree at the version-two baseline:

```powershell
git worktree add ..\portfolio-v2-rollback 3ff63e37b2560e5a7f1870dd047c0a3582c87c99
```

Do not reset a shared branch or rewrite history for rollback.
