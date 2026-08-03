# Open-Source Attributions

The current redesign foundation uses one build dependency, one development-only accessibility audit dependency and two isolated prototype runtime dependencies. No code or media from the Lando Norris website is used.

## Development dependency

| Component | Version | Use | Licence | Source |
| --- | --- | --- | --- | --- |
| Vite | 8.1.5 | Multi-page development server and production build pipeline | MIT | [vitejs/vite](https://github.com/vitejs/vite) |
| axe-core | 4.12.1 | Development-only WCAG A/AA audit injected into a local preview browser; not imported or bundled by production source | MPL-2.0 | [dequelabs/axe-core](https://github.com/dequelabs/axe-core) |

Vite and axe-core are development dependencies and are not loaded as application runtime libraries. Exact dependency versions and integrity hashes are fixed by `package-lock.json`; package metadata remains available under `node_modules` after `npm ci`.

The Phase 7 lockfile review recorded 52 package entries excluding the root project: 34 MIT, 13 MPL-2.0, one Apache-2.0, one GreenSock Standard no-charge licence, one ISC, one BSD-3-Clause, and one 0BSD. Their complete licence texts remain in their installed packages and upstream distributions.

## Motion and rendering prototype dependencies

| Component | Version | Use | Licence | Source |
| --- | --- | --- | --- | --- |
| GSAP | 3.15.0 | Prototype timeline, `gsap.matchMedia()`, and ScrollTrigger evaluation | GreenSock Standard “no charge” licence | [GreenSock licence](https://gsap.com/standard-license/) |
| ScrollTrigger | Included with GSAP 3.15.0 | Visibility-triggered prototype choreography | Same GreenSock licence as the GSAP package | [ScrollTrigger documentation](https://gsap.com/docs/v3/Plugins/ScrollTrigger/) |
| Three.js | 0.185.1 | Dynamically loaded procedural WebGL comparison | MIT | [mrdoob/three.js](https://github.com/mrdoob/three.js) |
| GSAP Skills | Commit `aed9cfd3277740755f6bfc1155c7aa645403b760` | Official implementation guidance; not installed or bundled | MIT | [greensock/gsap-skills](https://github.com/greensock/gsap-skills/tree/aed9cfd3277740755f6bfc1155c7aa645403b760) |

GSAP and Three.js declare no runtime package dependencies. Their exact versions and integrity hashes are committed in `package-lock.json`. GSAP's runtime package uses GreenSock's custom no-charge licence; the MIT licence shown by the separate GSAP Skills repository applies only to that guidance repository.

No Codrops repository, demo, dependency, source file, scene, shader, camera path, or visual composition is installed or copied.

## Phase 3 production motion

Phase 3 reuses the installed GSAP 3.15.0 package and its included ScrollTrigger plugin for the homepage introduction, hero hierarchy, Risk Intelligence Core, story states and evidence-frame choreography. The implementation uses `gsap.context()`, `gsap.matchMedia()` and explicit teardown following the pinned GSAP Skills guidance above. No dependency version changes in Phase 3.

Three.js remains restricted to the isolated prototype routes and is not imported, preloaded or requested by the homepage. Production pages use project-authored CSS/SVG marks and no Font Awesome runtime.

## Phase 4 evidence sources

The transaction-monitoring case study was independently paraphrased from the owner-operated public repository `walawala254/payouts-transaction-monitoring-engine-mvp` at commit `5c6887525cda880259cf465e862c88497c134c64`. That repository is MIT-licensed. Its source, interface, documentation, mascot and screenshots are not copied into this portfolio. Phase 4 creates original inline SVG diagrams from the verified processing flow and links readers to the public evidence.

The portfolio and case-study routes add no dependency. They reuse the existing base stylesheet and lightweight vanilla JavaScript navigation/reveal entry; GSAP, ScrollTrigger and Three.js are not requested on those routes.

## Phase 5 navigation standards

Phase 5 adds no dependency and copies no third-party implementation. The route transition is authored in project CSS from the cross-document View Transitions behavior defined by the [CSS View Transitions Level 2 specification](https://drafts.csswg.org/css-view-transitions-2/) and described in [Chrome's cross-document transition guidance](https://developer.chrome.com/docs/web-platform/view-transitions/cross-document). Browsers without support use ordinary navigation. GSAP is not used for route transitions, and the isolated prototype lab opts out of the feature.

## GitHub Actions

| Action | Workflow reference | Release checked for Phase 1 | Use | Licence | Source |
| --- | --- | --- | --- | --- | --- |
| actions/checkout | `actions/checkout@v7` | 7.0.1 | Read-only source checkout in CI | MIT | [actions/checkout](https://github.com/actions/checkout) |
| actions/setup-node | `actions/setup-node@v7` | 7.0.0 | Install the `.node-version` runtime and enable npm caching | MIT | [actions/setup-node](https://github.com/actions/setup-node) |

The CI workflow grants only `contents: read` and contains no deployment step or secret.

## Phase 7 transient audit tooling

These tools were executed through the local npm cache for a controlled audit or one-off conversion and were not added to `package.json`, the lockfile or the production bundle.

| Tool | Version | Use | Licence | Source |
| --- | --- | --- | --- | --- |
| Lighthouse | 13.4.1 | Repeated local mobile and desktop performance/accessibility/best-practices/SEO measurements | Apache-2.0 | [GoogleChrome/lighthouse](https://github.com/GoogleChrome/lighthouse) |
| sharp-cli | 5.2.0 | One-off approved portrait resize and WebP conversion | MIT | [vseventer/sharp-cli](https://github.com/vseventer/sharp-cli) |
| sharp | 0.35.3 | Image processing engine used by sharp-cli | Apache-2.0 | [lovell/sharp](https://github.com/lovell/sharp) |

Phase 7 removes the former Inter, JetBrains Mono and Font Awesome CDN requests. System font stacks and project-authored marks now cover those roles, so ordinary public-route loading has no remote font or icon dependency.
