# Open-Source Attributions

Phase 1 introduces one direct package dependency and retains existing externally hosted front-end resources. No open-source code or media from the Lando Norris website is used.

## Development dependency

| Component | Version | Use | Licence | Source |
| --- | --- | --- | --- | --- |
| Vite | 8.1.5 | Multi-page development server and production build pipeline | MIT | [vitejs/vite](https://github.com/vitejs/vite) |

Vite is a development dependency and is not loaded as an application runtime library. Its transitive dependency versions and integrity hashes are fixed by `package-lock.json`; their package metadata remains available under `node_modules` after `npm ci`.

The lockfile metadata review recorded 49 transitive/optional package entries: 33 MIT, 12 MPL-2.0, one Apache-2.0, one ISC, one BSD-3-Clause, and one 0BSD. These are build-time packages rather than browser runtime dependencies. Their complete licence texts remain in their installed packages and upstream distributions.

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
