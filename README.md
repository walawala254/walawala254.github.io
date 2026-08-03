# Dave Bryson Portfolio

This repository contains Dave Bryson's multi-page portfolio for fintech risk, fraud, AML/CFT, merchant risk, payments operations, and data science. The production website is [walawala254.github.io](https://walawala254.github.io/).

The repository contains a Vite-based vanilla JavaScript foundation, the documented Risk Intelligence Circuit design system, a cinematic Phase 3 homepage, an evidence-led nested case study, and an isolated Motion and 3D Technical Prototype lab. Public routes remain separate documents and the experimental lab remains outside production navigation and indexing.

## Release-candidate status

`redesign/risk-intelligence-v3` is frozen as the **Risk Intelligence Circuit v3 Release Candidate**. Only release-blocking, accessibility, link, metadata, asset, deployment, test, rollback, and documentation corrections are permitted until the owner accepts the release gates. New design concepts, routes, features, content, animation, dependencies, and major refactors are outside the freeze.

Production is unchanged. The prepared Pages workflow is deliberately stored as `.github/workflows/deploy-pages.yml.disabled` and cannot run. Review [FINAL_OWNER_REVIEW.md](FINAL_OWNER_REVIEW.md), [RELEASE_READINESS.md](RELEASE_READINESS.md), and [DEPLOYMENT_RUNBOOK.md](DEPLOYMENT_RUNBOOK.md) before any merge or production configuration change.

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
- `npm run test:a11y` runs the local axe-core WCAG A/AA audit against a separately running preview server.
- `npm run test:browser` runs the dependency-free Edge/Chrome smoke test against a separately running preview server.
- `npm run test:html` validates every generated HTML document with the W3C Nu service.
- `npm run test:prototypes` runs the isolated SVG, Canvas 2D, and Three.js lifecycle and responsive smoke tests against a separately running preview server.
- `npm run validate:build` validates an existing `dist` directory.

## Architecture

This remains a static multi-page website. Vite treats these documents as separate build inputs:

- `index.html`
- `about.html`
- `services.html`
- `portfolio.html`
- `contact.html`
- `case-studies/transaction-monitoring/index.html`
- `404.html`

There is no single-page router. Essential navigation is present in every source document and remains visible in generated HTML when JavaScript is unavailable. `script.js` is the shared module entry point; it initializes only the immediately used navigation and reveal modules under `src/scripts/`.

The repeated header, navigation, and footer are deliberately still authored in each page. A build-time partial system is deferred until its maintenance benefit outweighs the extra templating or transformation complexity.

Static public files such as the favicon, crawler policy, and sitemap live in `public/`. Vite copies them to the root of `dist/`. The production base is `/`, which matches this GitHub user site.

The Risk Intelligence Circuit visual language, tokens, component hierarchy, responsive rules, and accessibility constraints are documented in [DESIGN_SYSTEM.md](DESIGN_SYSTEM.md).

The homepage has one route-specific stylesheet (`src/styles/home.css`) and three route-specific motion modules under `src/scripts/home/`. Semantic HTML and a static inline SVG are the baseline; a short session-scoped introduction and scoped GSAP/ScrollTrigger choreography progressively enhance them.

## Navigation and route transitions

All production routes use ordinary document links and native scrolling. Wheel and touch gestures never initiate route changes, no client-side router or click interceptor is installed, and browser Back, Forward, deep links, modifier clicks, new-tab behavior, context menus, downloads, external links and hash links remain browser-controlled.

Each document owns its static current-page state with `aria-current="page"`; the transaction-monitoring case study marks Portfolio as its parent destination, while `404.html` intentionally has no current primary item and exposes recovery links to Home, Portfolio and Contact. The mobile menu is the only navigation JavaScript. It manages focus and resets its open state on `pageshow`, including a page restored from the back-forward cache.

Supporting browsers progressively enhance deliberate same-origin navigation with the CSS cross-document View Transitions API. The transition is a 240ms-or-shorter detection-bracket exchange shared by `main` and the persistent navigation. It does not use a JavaScript overlay, block input, replace history, or delay unsupported browsers. The feature is enabled only under `prefers-reduced-motion: no-preference`; reduced-motion users and unsupported browsers receive immediate native navigation. The isolated prototype lab explicitly opts out.

Static header and footer duplication remains deliberate. A partial system would add a templating dependency and transformation layer to seven small authored documents without improving runtime behavior; revisit that decision only if the public route count or navigation complexity grows materially.

Phase 5 adds no dependency, JavaScript transition module, request, image, video, animation loop, or GSAP import. Against commit `8a3f4c8`, shared internal-route JavaScript fell from 3,304 B to 2,230 B raw (about 1.58 kB to 1.10 kB gzip), shared CSS grew from 24,650 B to 26,659 B raw (about 5.50 kB to 5.86 kB gzip), and the complete 31-file build grew from 1,127,130 B to 1,129,615 B. Internal routes and the case study still request only the shared vanilla JavaScript; GSAP/ScrollTrigger remain homepage-only and Three.js remains prototype-only. Request counts are unchanged.

Automated route, transition, keyboard, reduced-motion, no-JavaScript and responsive checks run in locally available Microsoft Edge. CSS cross-document transitions are progressive: unsupported browsers receive ordinary navigation and no missing functionality. Native Safari, iOS Safari, Android Chrome, physical-device thermal behavior, and screen-reader announcements still require hands-on testing in their real environments before production approval.

## Portfolio and case-study architecture

`portfolio.html` is the public selected-work index. Phase 4 publishes only case studies that pass the claim and confidentiality checks in `PROJECT_EVIDENCE_MATRIX.md`.

The flagship transaction-monitoring case study uses a physical nested route:

```text
case-studies/
  transaction-monitoring/
    index.html
```

Vite includes the nested HTML file as an explicit multi-page input and emits `dist/case-studies/transaction-monitoring/index.html`. The route works as static HTML at `/case-studies/transaction-monitoring/`, uses root-relative production assets for this GitHub user site, requires no client-side router, remains usable without JavaScript, and is listed in `public/sitemap.xml`.

`src/styles/portfolio.css` is shared only by the portfolio index and published case-study pages. Those routes use the existing lightweight navigation/reveal entry and do not import GSAP, ScrollTrigger, Three.js or prototype code. Future case-study pages require sufficient verified evidence before they are added to Vite or the sitemap.

## Phase 6 interaction and motion policy

Internal pages use CSS for hover, focus, active feedback and static Risk Intelligence Circuit motifs. One shared IntersectionObserver progressively enhances simple reveal groups, while the transaction-monitoring route adds a small route-specific observer for its `aria-current="location"` section marker. The page content and hash links do not depend on either observer. GSAP and ScrollTrigger remain limited to the homepage narrative; Three.js and prototype chunks remain limited to experimental routes.

Reveal content is visible by default and becomes temporarily hidden only after observer setup succeeds. Reduced-motion users, browsers without IntersectionObserver, setup failures, page exits and Back/Forward Cache restores resolve content immediately to its final state. Mobile reveal distance is reduced and authored delays are capped at 80ms. No internal route adds a persistent animation frame, pinning, parallax, scroll interception or hover-only information.

Phase 6 adds no runtime dependency, raster image, model, font, media, tracking request or external service. `src/styles/interactions.css` holds shared internal-page interaction rules. The small `src/scripts/case-navigation.js` initializer is included in the shared vanilla entry but returns before creating an observer or listener unless the flagship case-study marker exists; this avoids an extra route request.

### Platform review and manual release checklist

The source review covers progressive View Transition fallback, `svh`/`dvh` use, sticky table-of-contents behavior, `focus-visible`, prefixed masks, guarded session storage, IntersectionObserver cleanup, reduced-motion queries, touch target size and 100% text-size adjustment. Automated Chromium checks do not substitute for native devices or real assistive technology.

Before production approval, the owner should complete this manual checklist:

- iPhone Safari: rotate once, open and close the mobile menu, inspect the sticky case-study contents, follow Back/Forward, test browser-chrome resizing, and confirm no horizontal SVG overflow.
- Android Chrome: repeat navigation and contact actions on a physical low-end device, enable data saver or CPU pressure where available, and watch for delayed taps, font fallback or heat during homepage motion.
- VoiceOver: traverse landmarks, headings, navigation, status labels, project links, case-study sections and external-link context; confirm the menu expanded state is announced.
- TalkBack: repeat the reading and activation order on Android; verify touch exploration reaches every action once and no decorative motif is announced.
- Keyboard-only desktop: use the skip link, open/close the menu at its collapsed breakpoint, traverse every route and action, follow case-study hashes, use Back/Forward, and confirm focus remains visible.

Known limits: native Safari/iOS/Android rendering, real battery or thermal behavior, VoiceOver and TalkBack announcements have not been validated by desktop emulation. The quarantined `contact.jpg` and `services.jpg` remain recoverable source files but Phase 7 removes them from the generated production graph.

Against the Phase 5 commit `4e9c6d9`, the final Phase 6 build remains at 31 files and grows from 1,129,615 B to 1,151,967 B (+22,352 B). Shared internal JavaScript grows from 2,230 B raw / about 1.10 kB gzip to 3,843 B raw / 1,522 B gzip; shared CSS grows from 26,659 B raw / about 5.86 kB gzip to 31,623 B raw / 6,622 B gzip. The homepage JavaScript request map is 124,954 B raw / 48,452 B gzip including the shared entry, compared with 123,215 B raw / about 48.31 kB gzip in Phase 5. Image payload remains 192,997 B, route request counts are unchanged, and there is no new production media or runtime dependency. Browser resource inspection confirms ScrollTrigger only on the homepage and zero Three.js or prototype requests on production routes.

## Phase 7 release hardening

Phase 7 keeps the approved visual direction while hardening delivery and release evidence:

- System font stacks replace automatic Google Fonts and Font Awesome requests. Ordinary page loads therefore disclose no visitor IP address to a font or icon CDN and remain typographically complete when third-party resources fail.
- The approved portrait is delivered as a 65,954 B WebP with the 162,377 B JPEG retained as a compatible fallback and social preview. Both formats have explicit dimensions to prevent layout shift.
- Quarantined `contact.jpg` and `services.jpg` files remain in recoverable source history but are absent from HTML, CSS, the generated production graph and ordinary requests. Original inline SVG explanations replace their former production roles.
- A synchronous `js` enhancement marker is set in each public document head. This prevents the mobile navigation from changing document flow when the deferred module initializes, while no-JavaScript visitors still receive complete navigation.
- Public routes use one H1, semantic header/main/footer landmarks, an early skip link, explicit image dimensions, labelled explanatory SVGs and source-authored metadata. Text and controls reflow at 200% without horizontal document overflow.
- Build validation rejects trackers, mixed-content assets, unsafe new-tab links, quarantined image references, automatic external assets, local filesystem paths and invalid structured data.

`axe-core` is a development-only audit dependency; it is injected into a local browser session by `npm run test:a11y` and is never imported by production source. Automated results are release evidence, not a replacement for VoiceOver, TalkBack, NVDA, Safari or physical-device checks. Follow [RELEASE_TEST_CHECKLIST.md](RELEASE_TEST_CHECKLIST.md) before approving production. Detailed automated findings, request budgets and remaining manual blockers are recorded in [RELEASE_READINESS.md](RELEASE_READINESS.md).

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

No baseline image is deleted. [ASSET_REGISTER.md](ASSET_REGISTER.md) records use, file size, known provenance, rights status, and replacement intent. Assets without confirmed rights remain provisional or quarantined; Phase 7 excludes all unclear non-portrait raster assets from the generated production graph.

Do not add images, models, textures, fonts, audio, or copied proprietary code without documenting their source, licence, and permitted use. [OPEN_SOURCE_ATTRIBUTIONS.md](OPEN_SOURCE_ATTRIBUTIONS.md) records direct dependencies, audit tooling and CI actions. Production routes no longer fetch hosted fonts or icon libraries.

## Future Three.js policy

Three.js is installed only for the approved isolated comparison. The procedural prototype includes dynamic visibility loading, low-power quality reduction, DPR caps, reduced-motion and WebGL fallbacks, visibility pausing, and full disposal. It is not imported, preloaded or requested by the production homepage. Any future Three.js use still requires separate evidence and approval.

## Production and rollback

`npm run build` writes a disposable local artifact to `dist/`; it does not deploy. Preserve any uncommitted user work and use a separate worktree to inspect a rollback point without rewriting shared history.

The pre-Phase-7 state is commit `7ca0d6428199e6f747c461e0103b0e385a52efa0`. Inspect it without changing the redesign branch:

```powershell
git worktree add ..\portfolio-phase6-rollback 7ca0d6428199e6f747c461e0103b0e385a52efa0
```

The pre-Phase-6 state is commit `4e9c6d90428d31f1da7053fbed87eb75a436353d`. Inspect it without changing the redesign branch:

```powershell
git worktree add ..\portfolio-phase5-rollback 4e9c6d90428d31f1da7053fbed87eb75a436353d
```

The earlier Phase 4 state remains available at `8a3f4c8f9f7ad8ca37be71fde367488935923352`:

```powershell
git worktree add ..\portfolio-phase4-rollback 8a3f4c8f9f7ad8ca37be71fde367488935923352
```

Portfolio version two remains recoverable in the same way from the original baseline:

```powershell
git worktree add ..\portfolio-v2-rollback 3ff63e37b2560e5a7f1870dd047c0a3582c87c99
```

Do not reset a shared branch or rewrite history for rollback.
