# Phase 7 Release Readiness Record

Date: 2026-08-03  
Branch: `redesign/risk-intelligence-v3`  
Phase 6 baseline: `7ca0d6428199e6f747c461e0103b0e385a52efa0`  
Production v2 rollback baseline: `3ff63e37b2560e5a7f1870dd047c0a3582c87c99`

This document records the Phase 7 accessibility, performance, asset, privacy and device-hardening evidence. It is not a production deployment approval and does not claim field Core Web Vitals or full WCAG conformance.

## Automated test environment

| Item | Value |
| --- | --- |
| Host | Windows 11 Pro 10.0.26200 |
| Browser | Microsoft Edge 151.0.4129.59, headless Chromium protocol |
| Node / npm | 24.18.0 / 11.16.0 |
| Vite | 8.1.5 |
| Accessibility engine | axe-core 4.12.1, WCAG 2.0/2.1/2.2 A/AA tags plus best practices |
| Lighthouse | 13.4.1, two runs per route and profile, median reported |
| Public viewports | 320 x 800, 390 x 844, 768 x 1024, 1024 x 900, 1440 x 1000, 1920 x 1080 |
| Network test | 150ms latency, 200 KiB/s download, 100 KiB/s upload, cache disabled |

The browser suite also covers keyboard focus, menu lifecycle, Back/Forward and bfcache restoration, deep-link reload, malformed hash input, reduced motion, JavaScript disabled, IntersectionObserver failure, unsupported View Transitions, blocked external font/CDN URLs, portrait failure, 200% text sizing and a 200% zoom/reflow proxy. A 320 CSS-pixel viewport provides the practical 400% reflow proxy for a 1280 CSS-pixel desktop layout.

## Accessibility audit

- All eight public URL forms (`/`, `/index.html`, five internal destinations including the case study, and `/404.html`) return zero axe violation groups.
- Axe reports `color-contrast` as incomplete where animated opacity, pseudo-elements, SVG text or complex backgrounds prevent automatic calculation. Manual token calculations establish a 5.98:1 minimum intended text contrast (`--color-text-muted` on the subtle surface), 6.18:1 minimum critical-state contrast on that surface, and 15.12:1 focus contrast. Primary/background is 17.45:1; secondary/background is 11.57:1; accent/background is 12.67:1.
- Each public page has one H1, one body-level header, main and footer, primary navigation, a working early skip link, ordered headings and an appropriate static current-page state. Portfolio remains current on the nested case study; 404 intentionally has no false current item.
- Inline explanatory SVGs have programmatic titles/descriptions and nearby textual equivalents. Status and risk meaning use text and shape as well as colour.
- Browser checks find zero undersized interactive targets against the documented 44px minimum, zero keyboard traps, visible focus on tested actions and correct mobile-menu focus open/close/return behavior.
- At 200% text size all seven authored public documents have a 390px `scrollWidth` within a 390px viewport, visible main content and complete navigation. The 200% zoom proxy and 320px reflow proxy likewise have no document overflow.
- Reduced-motion and no-JavaScript matrices keep main content, navigation, the static Risk Intelligence Core, case-study diagram, limitations and recovery links visible.

Automated tools cannot judge writing quality, every visual contrast state, cognitive accessibility, actual announcement phrasing, touch exploration or physical-device behavior. VoiceOver, TalkBack and NVDA remain owner/manual release gates in `RELEASE_TEST_CHECKLIST.md`.

## Asset, font and third-party decisions

| Item | Baseline | Final | Decision |
| --- | ---: | ---: | --- |
| Approved portrait JPEG | 162,377 B | 162,377 B | Retained as compatible fallback and social image |
| Approved portrait WebP | none | 65,954 B | Preferred 768 x 741 browser source; 96,423 B / 59.4% smaller than JPEG |
| `contact.jpg` | 18,342 B requested on Contact | no production reference/request/build asset | Quarantined source retained; original inline SVG replacement used |
| `services.jpg` | 12,278 B requested on Services | no production reference/request/build asset | Quarantined source retained; original inline SVG replacement used |
| Other unclear non-portrait rasters | recoverable source files | no production reference/request/build asset | Provisional/quarantined; no reuse |
| Remote fonts/icons | Google Fonts on all routes; Font Awesome on four routes | zero automatic external font/icon requests | Replaced by local system stacks and project-authored marks |

The generated WebP contains no EXIF, XMP or ICC metadata markers. The approved JPEG exposes only two JPEG table property items and no captured identity, location or copyright field. The page retains explicit image dimensions and meaningful fallback alt text.

User-activated CV, GitHub, repository, evidence and Streamlit URLs returned HTTP 200 during the link audit. LinkedIn rejects automated requests with HTTP 999 and remains a manual check. These links were not removed because they are explicit visitor actions, not automatic third-party requests.

## Lighthouse laboratory results

The Phase 6 baseline was measured before Phase 7 changes using the same local server and Lighthouse version. Each final value below is the median of two complete reports. Desktop performance/accessibility/best-practices/SEO scores are 100/100/100/100 for every representative route, with CLS 0 and TBT 0ms.

| Route, mobile profile | Baseline perf / LCP / CLS / TBT | Final perf / LCP / CLS / TBT | Final a11y / BP / SEO |
| --- | --- | --- | --- |
| Home | 80 / 2,258ms / 0.3738 / 25ms | 99 / 1,766ms / 0 / 60ms | 100 / 100 / 100 |
| Portfolio | 82 / 1,059ms / 0.3738 / 0ms | 100 / 1,004ms / 0 / 0ms | 100 / 100 / 100 |
| Case study | 82 / 1,059ms / 0.3738 / 0ms | 100 / 1,101ms / 0 / 0ms | 100 / 100 / 100 |
| About | 81 / 2,035ms / 0.3738 / 0ms | 100 / 1,585ms / 0 / 0ms | 100 / 100 / 100 |
| Contact | 82 / 908ms / 0.3738 / 0ms | 100 / 908ms / 0 / 0ms | 100 / 100 / 100 |

The 0.3738 baseline CLS came from the mobile navigation initially participating in layout and collapsing after deferred JavaScript. The early enhancement marker removes that shift while preserving a complete no-JavaScript menu. Home TBT varied from 22ms to 99ms across the two final runs and remains well below the 200ms laboratory guidance; this is test variance, not field INP. The case-study LCP difference is 42ms and is treated as laboratory noise. Lighthouse mobile uses simulated throttling; it does not establish real-device battery, thermal or interaction field data.

Under the explicit slow-network browser test, the homepage hero remained visible and navigation completed in 1,044ms. There is no autoplay media, audio, service worker, blocking external font, persistent production animation frame or production WebGL request.

## Build and request budgets

| Build category | Phase 6 | Phase 7 | Difference |
| --- | ---: | ---: | ---: |
| Complete `dist` | 1,151,967 B / 31 files | 1,194,843 B / 30 files | +42,876 B (+3.7%) / -1 file |
| HTML | 142,192 B | 143,179 B | +987 B |
| CSS | 154,224 B | 160,752 B | +6,528 B |
| JavaScript | 661,647 B | 661,674 B | +27 B |
| Image artifacts | 192,997 B (3 JPEGs) | 228,331 B (JPEG + WebP) | +35,334 B in artifact |
| Shared public-route JS | 3,843 B / 1,522 B gzip | 3,870 B / 1,572 B gzip | +27 B / +50 B gzip |
| Home route JS, excluding Vite preload helper | 124,954 B / 48,452 B gzip | 124,981 B / 48,500 B gzip | +27 B / +48 B gzip |

The artifact image increase keeps a compatible/social JPEG alongside the WebP. Actual normal production image delivery improves: the only requested raster is the 65,954 B WebP, down 127,043 B (65.8%) from the three unique Phase 6 production rasters. CSS growth covers original replacement diagrams, reflow safeguards and hardening states. The 27 B JavaScript increase is guarded hash-target lookup. Test scripts and axe-core are development-only and are absent from `dist`.

| Route | Phase 6 resource requests | Phase 7 resource requests | Difference |
| --- | ---: | ---: | ---: |
| Home | 9 | 6 | -3 |
| About | 10 | 5 | -5 |
| Services | 10 | 4 | -6 |
| Portfolio | 8 | 5 | -3 |
| Contact | 10 | 4 | -6 |
| Case study | 8 | 5 | -3 |
| 404 | 9 | 4 | -5 |

Phase 6 counts combine the measured Home/case graph with the same built local graph plus its authored Google Fonts and, where present, Font Awesome requests. Final counts are measured browser resource entries. Preconnect hints are not counted as resource requests.

ScrollTrigger has exactly one request and only on Home. Internal routes request no GSAP. Three.js, prototype entry chunks and prototype CSS remain reachable only from the noindex lab, are excluded from the sitemap and production navigation, and are never requested on a public route. The isolated Three.js chunk still triggers Vite's expected >500 kB raw warning; dynamic loading, low-power DPR cap, visibility pause, WebGL fallback and disposal tests pass.

## Security, privacy and SEO

- Tracked-source and built-output scans find no private key, credential assignment, preview token, client-side secret, source map, unsafe HTML sink, inline event handler, tracker, mixed-content request or built local filesystem path.
- A numeric-pattern scan matched only original inline SVG path coordinates, not payment data. No PAN, CVV, customer data, merchant data, national identifier or private address is present.
- The only source use of a URL fragment now passes through guarded `decodeURIComponent` and `getElementById`; malformed fragment regression passes with no console error. No query-string content is rendered.
- Every external new-tab link uses `noopener noreferrer`. All automatic page resources are same-origin HTTPS-compatible.
- All seven public documents have unique titles/descriptions, one H1 and correct physical-route metadata. Six indexable routes have unique canonical URLs and suitable Open Graph metadata using only the approved portrait.
- JSON-LD parses during the build; the case-study data describes only verified public evidence. Prototypes remain `noindex, nofollow` and outside the sitemap; 404 is `noindex, follow`; robots and sitemap retain physical public routes.
- W3C Nu validation reports zero errors and zero warnings across all eleven HTML documents.

## Browser, device and failure matrix

| Environment/state | Viewport/input | Result | Evidence/status |
| --- | --- | --- | --- |
| Edge desktop | 1024, 1440, 1920; keyboard/pointer | Pass | Browser suite and final screenshots |
| Edge mobile emulation | 320, 390, 768; touch emulation | Pass | No overflow, missing asset, tiny target or console error |
| Reduced motion | 390 and desktop | Pass | Intro bypassed; content complete; transitions immediate |
| JavaScript disabled | Every public route | Pass | Static navigation/content/diagrams/recovery available |
| Slow network | 390, cellular profile | Pass | Hero visible; navigation 1,044ms |
| 200% text and zoom proxy | Every public route | Pass | No document overflow or hidden main content |
| 400% reflow proxy | 320 CSS-pixel viewport | Pass | No document overflow across public routes |
| Keyboard/focus/menu/history | Desktop and 390 | Pass | Logical focus, menu return, bfcache, Back/Forward and malformed hash pass |
| Blocked fonts/CDN | Home | Pass | No attempted external request; system stack used |
| Failed portrait | About | Pass | Alt text remains, main visible, no overflow |
| Observer/GSAP setup failure | Home/internal reveals | Pass | Static content resolves visible; no overlay trap |
| Prototype lifecycle/isolation | 320, 390, 1440 | Pass after corrective wrap fix | No public leakage; reduced motion and cleanup pass |
| iPhone/iPad Safari | Physical touch | Not run | Owner/manual release gate |
| Android Chrome | Physical touch/low-end device | Not run | Owner/manual release gate |
| VoiceOver / TalkBack / NVDA | Real assistive technology | Not run | Owner/manual release gate |
| Battery/heat/orientation/mobile chrome | Physical device | Not run | Owner/manual release gate |

The final visual review contains 117 screenshots and follows an earlier corrective pass. Reviewed samples include every public route at all required widths, Home slow-network/no-JS/reduced-motion states, 200% text, mobile menu/focus, case-study architecture/limitations, Contact actions and failed portrait. No material design regression, quarantine leakage, text clipping, missing asset or misleading project status remains.

## Remaining release gates and known limits

There is no automated code blocker for Phase 8 deployment preparation. Production release must still wait for:

1. Completion of `RELEASE_TEST_CHECKLIST.md` on iPhone Safari, Android Chrome and the available real screen readers.
2. Physical-device observation of orientation, touch scrolling, browser chrome, battery and heat.
3. Owner confirmation that the Google Drive CV is current, owned and intentionally public, plus manual LinkedIn verification.
4. Phase 8 validation of the chosen GitHub Pages build-output deployment method and rollback process.

Known tooling limit: Lighthouse 13.4.1 on Windows produced complete parseable JSON reports but its child process can emit an EPERM warning while deleting its temporary profile. This does not affect the site, reports or repository. Native Safari rendering and actual screen-reader announcements are intentionally not claimed.

## Rollback and Phase 8 decision

Inspect Phase 6 without rewriting shared history:

```powershell
git worktree add ..\portfolio-phase6-rollback 7ca0d6428199e6f747c461e0103b0e385a52efa0
```

Portfolio v2 remains inspectable at `3ff63e37b2560e5a7f1870dd047c0a3582c87c99`. Do not reset a shared branch, force-push, merge or deploy as a rollback shortcut.

Recommendation: the redesign branch is technically ready to enter Phase 8 deployment preparation after Phase 7 CI and preview checks pass. This is not permission to merge or deploy. Real-device/manual gates above remain prerequisites for production approval.
