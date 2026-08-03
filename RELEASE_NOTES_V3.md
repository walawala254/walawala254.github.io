# Risk Intelligence Circuit v3 Release Candidate

## Overview

Version three reframes Dave Bryson's portfolio around the intersection of payments, risk operations and data. It is an original multi-page experience designed to help recruiters, hiring managers, collaborators and consulting clients understand the work, the evidence behind it and its limitations.

This document describes the release candidate on `redesign/risk-intelligence-v3`. It is not a production-deployment announcement. The current live version remains unchanged until the owner separately approves the controlled deployment plan.

## Positioning and homepage

- A clearer professional position across payments risk, fraud operations, AML/CFT, merchant risk and data science.
- An editorial homepage narrative organised as Signal, Detect, Investigate, Decide and Improve.
- An original SVG/CSS Risk Intelligence Core that remains understandable as static semantic content.
- A short, skippable, session-aware introduction and scoped GSAP/ScrollTrigger choreography on Home only.
- Direct portfolio, CV, contact, GitHub and LinkedIn actions without fabricated counters or outcomes.

## Portfolio evidence

- Selected work now distinguishes live evidence, working prototypes and concepts with explicit status labels.
- A physical case-study route at `/case-studies/transaction-monitoring/` explains the problem, available public evidence, architecture, controls, limitations and next steps.
- Synthetic-data, conceptual-status and non-production limitations remain visible.
- Claims are constrained by `PROJECT_EVIDENCE_MATRIX.md`; no employer, client, revenue, volume, accuracy or performance result has been invented.

## Navigation and interaction

- Removed edge-scroll and touch route chaining.
- Restored ordinary document links, native scrolling, deep links, Back/Forward behaviour and JavaScript-disabled navigation.
- Added short progressive cross-document View Transitions with immediate reduced-motion and unsupported-browser fallbacks.
- Refined hover, focus, active and section-location feedback without a custom cursor, scroll hijacking or perpetual production animation loop.

## Accessibility

- Semantic header, main and footer landmarks, one page-level heading per public document and working skip links.
- Visible keyboard focus, current-page state, mobile-menu focus containment/return and accessible recovery links.
- Accessible SVG titles, descriptions and textual diagram equivalents.
- Reduced-motion alternatives and content-complete JavaScript-disabled experiences.
- Reflow safeguards at 200% text sizing and a practical 400% proxy.
- Automated axe checks report zero violation groups on all public URL forms. This is WCAG-oriented evidence, not a claim of full conformance; real VoiceOver, TalkBack and NVDA testing remains an owner gate.

## Performance and asset delivery

- System font stacks replace automatic Google Fonts and Font Awesome requests.
- The approved portrait uses a 65,954-byte WebP with a 162,377-byte JPEG fallback/social image and explicit dimensions.
- Quarantined `contact.jpg` and `services.jpg` remain recoverable in source history but are absent from `dist` and public requests.
- Representative Phase 7 mobile medians were 99 performance for Home and 100 for the tested internal routes; final representative CLS and TBT were zero except for normal Home laboratory variance in TBT.
- Production routes request no Three.js or prototype chunks. Internal routes request no GSAP; ScrollTrigger is Home-only.

## Architecture

- Vite 8 multi-page build with vanilla JavaScript modules and seven physical public documents, including 404 and the nested case study.
- No SPA, client-side router, service worker, runtime partial injection or production WebGL.
- Four noindex prototype documents remain isolated technical evidence, unlinked from production navigation and absent from the sitemap.
- Read-only CI installs locked dependencies, audits, builds, validates HTML and JavaScript, then runs accessibility, browser and prototype release gates.

## Security and privacy

- No analytics, tracking, advertising, cookies, automatic third-party page-load requests or client-side secrets.
- Automated scans find no credential, private key, preview token, source map, local filesystem path, payment data or unintended personal identifier in tracked release content or `dist`.
- External project links are user-initiated. LinkedIn blocks automated checking and therefore remains a manual destination check.

## Removed behaviours and assets

- Edge-scroll and swipe-triggered page changes.
- Automatic remote font and icon stylesheets.
- Unclear-rights non-portrait raster delivery.
- Generic raster illustrations on Services and Contact, replaced by original inline diagrams.
- Production loading of prototype code or Three.js.

## Known limitations and manual status

- Physical iPhone Safari, Android Chrome, orientation, browser-chrome, battery, thermal and low-end-device observations have not been supplied.
- VoiceOver, TalkBack and NVDA results have not been supplied.
- Owner approval of first-person project wording and continued public evidence links remains outstanding.
- The hosted Streamlit demo currently routes through Streamlit authentication; intended visitor access requires owner verification.
- The external CV resolves automatically, but ownership, currency, sharing scope and sensitive-content review require owner confirmation.
- The isolated Three.js prototype produces an expected large-chunk build warning; that chunk is not requested by public routes.
- Lighthouse results are local laboratory measurements, not field Core Web Vitals.

## Deployment prerequisites

Before production, the owner must complete or explicitly accept the documented manual gates, approve content and external evidence, verify the CV, contain Vercel Production auto-deployment, activate the currently disabled Pages workflow, switch Pages from legacy branch publishing to GitHub Actions, and approve the reviewed merge commit. See `FINAL_OWNER_REVIEW.md` and `DEPLOYMENT_RUNBOOK.md`.

## Rollback summary

Use normal revert commits and the official Pages deployment history; never reset or force-push. The recommended merge commit creates a clear release boundary. The deployment draft can publish an allowlisted version-two artifact after a merge revert. The emergency known-good content reference is `3ff63e37b2560e5a7f1870dd047c0a3582c87c99`.
