# Risk Intelligence Circuit v3 release candidate

## Summary

This pull request proposes the reviewed Risk Intelligence Circuit v3 portfolio from `redesign/risk-intelligence-v3` to `main`. It replaces the version-two presentation with an original, evidence-led portfolio for payments risk, fraud operations, AML/CFT, merchant risk and data science.

**Do not merge until the deployment-boundary, owner-confirmation and manual-device gates below are complete.** Production is unchanged while this draft is being reviewed.

## Why the redesign exists

The previous site established the professional positioning but used a lightweight multi-page presentation, unclear-rights imagery and surprising edge-scroll navigation. V3 keeps physical static routes while improving narrative hierarchy, project evidence, accessibility, predictable navigation, performance and release governance.

## Completed work

- Phase 1: safe Vite multi-page foundation
- Phase 2: Risk Intelligence Circuit design system
- Motion/3D comparison lab
- Phase 3: cinematic, progressively enhanced homepage
- Phase 4: evidence-led portfolio and transaction-monitoring case study
- Phase 5: native navigation and progressive page transitions
- Phase 6: site-wide interaction refinement
- Phase 7: accessibility, performance, asset and privacy hardening
- Phase 8: release candidate, deployment preparation and final validation

## Visual and content changes

- Original editorial visual system based on payment signals, controls and decision routes
- Semantic SVG/CSS Risk Intelligence Core with GSAP/ScrollTrigger enhancement on Home only
- Evidence-led selected-work index with explicit project statuses
- New physical route: `/case-studies/transaction-monitoring/`
- Original service, contact, portfolio and case-study diagrams
- Clear synthetic-demo, concept-status and non-production limitations
- Stronger contact, CV, GitHub, LinkedIn and project-evidence actions

## Architecture changes

- Vite 8 multi-page build with separate physical HTML documents
- Modular vanilla JavaScript; no SPA and no client-side router
- Native scrolling and browser history
- Progressive CSS cross-document View Transitions with immediate fallback
- GSAP/ScrollTrigger restricted to the homepage
- Three.js restricted to noindex experimental prototype routes
- Reproducible `dist` artifact prepared for official GitHub Pages Actions deployment

## Removed legacy behaviour and delivery

- Removed edge-scroll and touch route chaining
- Removed automatic Google Fonts and Font Awesome requests
- Removed quarantined `contact.jpg` and `services.jpg` from production delivery
- Removed unclear-rights non-portrait rasters from the production graph
- No tracking, analytics, cookie banner, custom cursor, scroll hijacking or production WebGL

## Accessibility and performance

- Automated WCAG-oriented scans report zero axe violation groups across public routes
- Keyboard, menu focus lifecycle, reduced motion, JavaScript-disabled content, 200% text and practical 400% reflow checks pass
- Explicit landmarks, current-page state, image dimensions, accessible diagrams and textual equivalents
- Phase 7 mobile medians: Home performance 99/LCP 1,766ms/CLS 0; representative internal routes 100/CLS 0
- Normal unique raster delivery reduced by 65.8%; normal page loads make zero automatic third-party requests
- No production route requests Three.js or prototype chunks; internal routes do not request GSAP

Automated results do not claim full WCAG conformance or field Core Web Vitals. Real assistive-technology and physical-device results must be recorded before merge or explicitly accepted as residual risk by the owner.

## Asset, security and privacy review

- Owner-approved portrait retained with an optimised WebP source and JPEG fallback/social image
- Quarantined files remain recoverable in Git but absent from `dist`
- No credential, private key, payment data, personal identifier, tracker, source map, local path, preview token or unsafe HTML sink found
- Public claims remain constrained by `PROJECT_EVIDENCE_MATRIX.md`
- Repository evidence resolves; the Streamlit app routes to Streamlit authentication and needs an owner access check; LinkedIn blocks automated verification and also requires a manual check

## Known limitations and outstanding gates

- iPhone/iPad Safari, Android Chrome, VoiceOver, TalkBack, NVDA, orientation, mobile browser chrome, battery and heat results remain owner/manual unless attached here
- CV ownership, currency, sharing scope and sensitive-content review require owner confirmation
- First-person role wording and continued approval of public repository/demo links require explicit owner confirmation
- The experimental Three.js chunk is intentionally large but isolated and dynamically loaded only inside the noindex lab
- The hosted Streamlit link currently routes through Streamlit authentication; confirm intended visitor access before merge
- Vercel Preview is protected and may require collaborator authentication

## Deployment strategy and rollback

GitHub Pages must switch from legacy `main:/` branch deployment to GitHub Actions artifact deployment before merge. Vercel Production auto-deployment from `main` must be contained first. The prepared workflow remains disabled until separately approved.

Use a merge commit to preserve phase history and create a clear revert boundary. Follow `DEPLOYMENT_RUNBOOK.md`; emergency known-good content is `3ff63e37b2560e5a7f1870dd047c0a3582c87c99`.

## Review instructions

1. Open the latest protected Vercel Preview reported in the Phase 8 closeout.
2. Complete `FINAL_OWNER_REVIEW.md` and `RELEASE_TEST_CHECKLIST.md`.
3. Review Home at 390px and 1440px, Portfolio, the flagship case study, Contact and 404 recovery.
4. Verify project statuses, limitations, personal wording, email, CV, LinkedIn, GitHub, repository and Streamlit destinations.
5. Review `BUILD_MANIFEST_V3.md`, `RELEASE_NOTES_V3.md` and `DEPLOYMENT_RUNBOOK.md`.

## Merge checklist

- [ ] Owner identity, positioning and first-person role wording approved
- [ ] Public repository and Streamlit links approved
- [ ] Portrait publication permission reconfirmed
- [ ] CV ownership, current version, sharing and sensitive-content review confirmed
- [ ] Manual device and assistive-technology results recorded or residual risk explicitly accepted
- [ ] No Critical or High blocker open
- [ ] Redesign CI passes on the current head
- [ ] Latest Preview reviewed
- [ ] Vercel Production auto-deployment contained
- [ ] GitHub Pages source changed to GitHub Actions
- [ ] Disabled deployment workflow activated in a separately approved commit
- [ ] `main` protection/review controls confirmed
- [ ] Merge commit selected; no direct push or force-push
- [ ] Rollback owner and deployment window confirmed
- [ ] Production still points to `3ff63e37…` immediately before the controlled merge
