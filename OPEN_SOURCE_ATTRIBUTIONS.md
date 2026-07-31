# Open-Source Attributions

The current redesign foundation uses one direct build dependency and two isolated prototype runtime dependencies. No code or media from the Lando Norris website is used.

## Development dependency

| Component | Version | Use | Licence | Source |
| --- | --- | --- | --- | --- |
| Vite | 8.1.5 | Multi-page development server and production build pipeline | MIT | [vitejs/vite](https://github.com/vitejs/vite) |

Vite is a development dependency and is not loaded as an application runtime library. Its transitive dependency versions and integrity hashes are fixed by `package-lock.json`; their package metadata remains available under `node_modules` after `npm ci`.

The lockfile metadata review recorded 49 transitive/optional package entries: 33 MIT, 12 MPL-2.0, one Apache-2.0, one ISC, one BSD-3-Clause, and one 0BSD. These are build-time packages rather than browser runtime dependencies. Their complete licence texts remain in their installed packages and upstream distributions.

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

Three.js remains restricted to the isolated prototype routes and is not imported, preloaded or requested by the homepage. Font Awesome remains on existing internal pages, but Phase 3 removes it from the homepage request graph and uses a project-authored CSS navigation glyph instead.

## Phase 4 evidence sources

The transaction-monitoring case study was independently paraphrased from the owner-operated public repository `walawala254/payouts-transaction-monitoring-engine-mvp` at commit `5c6887525cda880259cf465e862c88497c134c64`. That repository is MIT-licensed. Its source, interface, documentation, mascot and screenshots are not copied into this portfolio. Phase 4 creates original inline SVG diagrams from the verified processing flow and links readers to the public evidence.

The portfolio and case-study routes add no dependency. They reuse the existing base stylesheet and lightweight vanilla JavaScript navigation/reveal entry; GSAP, ScrollTrigger and Three.js are not requested on those routes.

## GitHub Actions

| Action | Workflow reference | Release checked for Phase 1 | Use | Licence | Source |
| --- | --- | --- | --- | --- | --- |
| actions/checkout | `actions/checkout@v7` | 7.0.1 | Read-only source checkout in CI | MIT | [actions/checkout](https://github.com/actions/checkout) |
| actions/setup-node | `actions/setup-node@v7` | 7.0.0 | Install the `.node-version` runtime and enable npm caching | MIT | [actions/setup-node](https://github.com/actions/setup-node) |

The CI workflow grants only `contents: read` and contains no deployment step or secret.

## Existing externally hosted resources

| Resource | Version/request | Use | Licence | Source |
| --- | --- | --- | --- | --- |
| Inter | Google Fonts request | Existing primary interface font | SIL Open Font License 1.1 | [rsms/inter](https://github.com/rsms/inter) |
| JetBrains Mono | Google Fonts request | Existing monospace accent font | SIL Open Font License 1.1 | [JetBrains/JetBrainsMono](https://github.com/JetBrains/JetBrainsMono) |
| Font Awesome Free | 6.5.2 from cdnjs | Existing interface icons | Icons: CC BY 4.0; fonts: SIL OFL 1.1; code: MIT | [Font Awesome Free licence](https://fontawesome.com/license/free) |

These three resources were already linked by the version-two pages and are not newly downloaded or bundled in Phase 1. Their availability and privacy implications should be reassessed during the performance and accessibility phase.
