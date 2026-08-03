# Final Owner Review — Risk Intelligence Circuit v3

Status: **Conditional release candidate — owner review and manual gates outstanding**

Production has not changed. Use the latest protected Vercel Preview for `redesign/risk-intelligence-v3` supplied in the Phase 8 closeout; do not review the current GitHub Pages site as though it were version three.

## What changed

- The portfolio now uses an original Risk Intelligence Circuit identity and a clearer payments-risk narrative.
- Home explains the work through Signal, Detect, Investigate, Decide and Improve, with an accessible SVG baseline and optional Home-only motion.
- Portfolio distinguishes verified public evidence from working prototypes and concepts.
- The transaction-monitoring project has a substantive physical case-study route with evidence and limitations.
- Navigation now follows normal scrolling, links and browser history; surprising edge-scroll page changes are removed.
- Accessibility, reduced motion, asset provenance, privacy, build validation and rollback evidence are materially stronger.

## What automated validation says is ready

- All public routes build and return the expected static documents.
- Browser, keyboard-emulation, reduced-motion, JavaScript-disabled, reflow and failure-resilience suites pass in local Chromium.
- Automated axe checks report zero violation groups on every public URL form.
- Public requests contain no Three.js, prototype chunks, automatic external font/icon resources or trackers.
- Quarantined rasters are absent from the production artifact.
- The release remains a reproducible Vite build with a prepared but inactive GitHub Pages workflow.

These results do not replace real Safari, Android or assistive-technology checks.

## Owner confirmations required

Record a clear Yes, No, or requested correction for each item:

| Review item | Status | Owner response/evidence |
| --- | --- | --- |
| Public presentation of the name “Dave Bryson” is approved | Outstanding | |
| Professional positioning is accurate and comfortable | Outstanding | |
| First-person project-role wording does not overstate employment, ownership, status or results | Outstanding | |
| Public transaction-monitoring repository may remain linked | Outstanding | |
| Streamlit demo may remain linked | Outstanding | |
| Synthetic-data and non-production limitations are accurate and prominent enough | Outstanding | |
| Concept projects are correctly labelled | Outstanding | |
| Portrait is approved for continued public portfolio use | Previously documented as approved; reconfirm before deployment | |
| CV is owned/controlled by Dave and is the current version | Outstanding | |
| CV sharing permissions intentionally allow public access | Outstanding | |
| CV contains no unintended private address, identification number or sensitive information | Outstanding | |
| Keep external CV link or replace later with an approved local PDF | Outstanding | |

If the CV gate fails, do not publish a replacement automatically. The safe interim option is to remove or disable only the CV action in an owner-approved correction.

## Key manual tests

Use `RELEASE_TEST_CHECKLIST.md` to record device, browser/assistive technology, date, tester, evidence and retest status. At minimum:

1. iPhone Safari: intro/skip, mobile menu, native scrolling, Portfolio/case study/Back, rotation, text size, Reduce Motion, browser chrome and touch targets.
2. Android Chrome: navigation, Back, diagrams, rotation, increased text, reduced motion, low-end performance, heat and battery over several minutes.
3. VoiceOver and TalkBack: title, landmarks, headings, current page/menu state, Core description, project statuses, limitations, breadcrumbs, contents and 404 recovery.
4. NVDA where available: landmarks, headings, link list, SVG descriptions, case-study contents and limitations.
5. Keyboard-only: skip links, Tab/Shift+Tab, visible focus, menu lifecycle, evidence links, hash navigation, Back/Forward, contact actions and 404 recovery.

Not completing these tests must be treated as accepted residual risk before production; it must not be recorded as a pass.

## Links to verify manually

- Download CV: confirm destination, ownership, version, public permissions and privacy.
- LinkedIn: confirm the profile opens for a signed-out visitor; automated HTTP verification is blocked by LinkedIn.
- GitHub profile and transaction-monitoring repository: confirm they are the intended public evidence.
- Streamlit demo: it currently redirects through Streamlit authentication on the same app origin; confirm whether signed-out public access is intended or authenticated access is acceptable.
- Email/contact action: confirm the displayed address and mail action are intended.

## Visual review areas

- Home at narrow mobile and large desktop widths.
- Risk Intelligence Core labels and its textual explanation.
- Portfolio status labels and featured-project CTA hierarchy.
- Case-study evidence, limitations, architecture diagram and contents navigation.
- Contact actions and the unknown-route 404 recovery page.
- Landscape mobile, increased text, reduced motion and system-font rendering.

Confirm the site feels original and professional, without racing imagery, generic cybersecurity styling, excessive neon, motion overload, misleading dashboards or unsupported proof.

## Known limitations

- Real-device and real-assistive-technology results are outstanding until supplied above.
- The preview may require collaborator authentication.
- The prototype lab is experimental, noindex and intentionally absent from production navigation.
- The large Three.js prototype chunk is isolated and never requested by public pages.
- Laboratory Lighthouse numbers are not field Core Web Vitals.

## How controlled deployment will work

The selected production method is an official GitHub Actions Pages artifact built from locked source. The workflow is currently named `.github/workflows/deploy-pages.yml.disabled`; GitHub cannot execute it. After a separate approval, Vercel Production auto-deployment must first be contained, the workflow can be activated on the redesign branch, Pages can be switched to GitHub Actions, and the reviewed branch can be merged with a merge commit. Production verification follows immediately.

Version three will replace the public presentation and add the nested case-study route. Canonicals and the public domain remain `https://walawala254.github.io/`. No CNAME, analytics or tracking is added.

## Rollback

Rollback uses a reviewed revert commit, rebuild and normal Pages deployment—not a reset or force-push. The merge commit provides one release boundary, and the prepared workflow includes an allowlisted legacy fallback. Emergency known-good content is commit `3ff63e37b2560e5a7f1870dd047c0a3582c87c99`. Full steps are in `DEPLOYMENT_RUNBOOK.md`.

## Explicit approval required

Only after the review table, manual gates, CV verification and deployment prerequisites have an accepted disposition, provide this exact statement in a new instruction:

> I approve the Risk Intelligence Circuit v3 release candidate for controlled production deployment from redesign/risk-intelligence-v3 to main using the approved GitHub Pages deployment plan.

This document does not treat that statement as already given and does not authorise a merge, production setting change or deployment.
