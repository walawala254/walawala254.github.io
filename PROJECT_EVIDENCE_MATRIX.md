# Project Evidence Matrix

Phase 4 evidence audit recorded on 2026-07-31. This matrix is the publication gate for portfolio claims. It separates repository-backed evidence from owner statements, inference and unsupported material before a project is promoted to a public case study.

## Claim classifications

| Classification | Publication rule |
| --- | --- |
| Verified by repository | May be published when the claim matches the cited public source at the recorded commit. |
| Verified by public demo | May describe only behaviour directly observed in the public synthetic demo; availability can change. |
| Verified by supplied documentation | May be published when the supplied document is approved for public use and contains no confidential material. |
| Owner-confirmed | May be published after the owner explicitly confirms the wording and publication rights. |
| Inferred and requiring confirmation | Must be qualified internally and must not appear as a factual public claim. |
| Unsupported and prohibited | Must not appear publicly. |

## Publication decision

Only the Payouts Transaction Monitoring Engine MVP currently meets the evidence threshold for a full, indexable case study. The other three priority topics remain concise supporting entries with transparent `Concept` status until artifacts and owner confirmation are available.

## 1. Payouts Transaction Monitoring Engine MVP

| Field | Evidence record |
| --- | --- |
| Project name | Payouts Transaction Monitoring Engine MVP |
| Current proposed title | From uploaded payment signals to explainable investigation alerts |
| Project status | **Functional prototype · Public synthetic demo** — verified by repository and public deployment documentation |
| Approximate timeframe | Public repository created 2026-07-16; current audited commit `5c6887525cda880259cf465e862c88497c134c64` |
| Dave's role | Repository owner and named commit author; designed and implemented the public Streamlit MVP, monitoring logic, governed configuration, analyst interface, documentation and tests. Verified by repository ownership, commit history and source files. Do not imply external client commissioning or production ownership. |
| Intended users | Transaction-monitoring analysts, risk operations, rule administrators and reviewers — verified by `USER_MANUAL.md` |
| Business or risk problem | File-based transaction evidence can be difficult to map, validate, evaluate consistently and consolidate into an explainable analyst queue. Verified by repository workflow and documentation. |
| Source repository | <https://github.com/walawala254/payouts-transaction-monitoring-engine-mvp> |
| Source files | `app.py`, `transaction_monitor.py`, `rules.yaml`, `sample_data/synthetic_transactions.csv` |
| Available screenshots | No approved repository screenshots. The public demo was reachable during the audit, but no demo screenshot is copied into this portfolio. |
| Available diagrams | No source diagram. Phase 4 may create an original architecture diagram derived from the verified processing flow. It must be labelled illustrative architecture. |
| Available documentation | `README.md`, `USER_MANUAL.md`, `TM_AUDIT_AND_REFACTOR.md`, `DEPLOYMENT.md`, `SECURITY.md` |
| Available tests | 11 current test functions across `tests/test_app.py` and `tests/test_transaction_monitor.py`; a separate synthetic benchmark script exists. GitHub CI passed for the audited main commit. |
| Available demo | <https://walawala254-payouts-transaction-monitoring-engine-mv-app-duyz9q.streamlit.app> — hosted synthetic demonstration only; the Phase 8 link audit redirected to Streamlit authentication, so intended public access requires owner verification |
| Technologies | Python 3.12, Streamlit, pandas, NumPy, openpyxl, xlrd and PyYAML — verified by pinned requirements and CI |
| Verified functionality | CSV/XLS/XLSX ingestion; column inference and mapping; upload validation; normalisation; governed rule catalogue; five-layer setting inheritance; 18 executable monitoring scenarios; 4 preventive controls retained as context; transaction scoring; consolidated investigation alerts; merchant/MID views; rule simulation; data-quality reporting; protected spreadsheet exports; synthetic demo data. |
| Verified testing boundaries | Tests cover governed schema, preventive/monitoring separation, override priority, duplicate row identity, masking, baseline eligibility, simulation, exports, synthetic configuration, upload validation, formula-injection protection and a Streamlit synthetic run. |
| Verified limitations | Batch/file processing; not preventive or real-time decisioning; no persistent analyst workflow or multi-user authorisation; uploaded-file history drives baselines; no stable customer ID, device fingerprint, source IP, chargeback linkage, authoritative MID lifecycle or original-refund linkage; no currency conversion; synthetic public deployment only. |
| Unverified claims | Operational adoption, production transaction volume, detection accuracy, fraud reduction, false-positive reduction, regulatory approval, certification, external client use and production readiness. |
| Confidentiality restrictions | Never publish or upload live cardholder data, personal data, production histories, watchlists, credentials, confidential thresholds or real merchant information. Synthetic `DEMO_*` entities only. |
| Missing evidence | Production backtesting, analyst dispositions, operational integrations, authentication/authorisation, durable case workflow, external intelligence and production threshold approvals. |
| Owner confirmation required | Confirm the first-person role wording and continued approval of both public links before production merge. |
| Public links approved | Repository and demo are already intentionally public; retain explicit synthetic-data boundary and safe external-link attributes. |
| Recommended portfolio treatment | Full flagship case study with an original architecture diagram, evidence ledger, limitations, repository/demo links and no copied interface screenshot. |

## 2. Chargebacks and Risk Dashboard

| Field | Evidence record |
| --- | --- |
| Project name | Chargebacks and Risk Dashboard |
| Current proposed title | Chargeback case and risk-visibility workflow |
| Project status | **Concept** — current portfolio description only; implementation status requires confirmation |
| Approximate timeframe | Unknown |
| Dave's role | Inferred as workflow and reporting concept author; requires owner confirmation |
| Intended users | Dispute, chargeback, merchant-risk and operations teams — proposed, not verified by usage evidence |
| Business or risk problem | Existing portfolio copy describes scattered dispute outcomes, scheme-rule pressure and operational leakage. Treat as a proposed problem statement, not an observed client result. |
| Source repositories | None identified in the approved public GitHub account |
| Source files | Current `portfolio.html` and Phase 3 homepage summary only |
| Available screenshots | None approved |
| Available diagrams | None supplied; an illustrative lifecycle should not be presented as implemented architecture |
| Available documentation | No public specification, data dictionary or operating procedure supplied |
| Available tests | None supplied |
| Available demos | None supplied |
| Technologies | Power BI, Python and scheme logic appear in current portfolio copy but implementation use is not independently verified |
| Verified functionality | None beyond the existence of a portfolio concept description |
| Unverified claims | Case tracking, representment workflow, evidence collection, integrations, dashboards, users, outcomes and card-scheme connectivity |
| Confidentiality restrictions | Do not expose dispute records, merchant names, scheme correspondence, card data, contracts or pricing |
| Missing evidence | Sanitised data model, screenshots, repository or workbook, workflow specification, status, role, test record and owner confirmation |
| Owner confirmation required | Status, actual tools, what was implemented, Dave's contribution and whether any anonymised evidence may be published |
| Public links approved | None |
| Recommended portfolio treatment | Supporting concept entry only. Defer an indexable case-study route. |

## 3. PSP Risk Desk Assistant

| Field | Evidence record |
| --- | --- |
| Project name | PSP Risk Desk Assistant |
| Current proposed title | Human-reviewed risk desk assistance concept |
| Project status | **Concept** — Phase 3 explicitly states no public demo |
| Approximate timeframe | Unknown |
| Dave's role | Concept author is inferred; requires owner confirmation |
| Intended users | PSP risk and operations analysts — proposed |
| Business or risk problem | Current copy proposes consistent review steps, evidence requirements, escalation paths and decision documentation |
| Source repositories | None identified in the approved public GitHub account |
| Source files | Phase 3 homepage summary only |
| Available screenshots | None approved |
| Available diagrams | None supplied |
| Available documentation | None supplied |
| Available tests | None supplied |
| Available demos | None; the current homepage explicitly says so |
| Technologies | No implemented stack verified. Telegram, WhatsApp, Google Sheets and AI remain possible directions, not current functionality. |
| Verified functionality | None beyond the existence of a portfolio concept description |
| Unverified claims | Query handling, messaging integration, data access, AI model, escalation automation, security controls and operational use |
| Confidentiality restrictions | Do not publish prompts, API keys, production data sources, analyst conversations or customer information |
| Missing evidence | Prototype, interaction flow, data model, security design, tests, supported query list and human-review specification |
| Owner confirmation required | Status, implementation boundary, delivery channel, data sources and Dave's role |
| Public links approved | None |
| Recommended portfolio treatment | Supporting concept entry only. Position as human-reviewed assistance, never autonomous risk decisioning. |

## 4. Merchant Risk and Onboarding Controls

| Field | Evidence record |
| --- | --- |
| Project name | Merchant Risk and Onboarding Controls |
| Current proposed title | Merchant onboarding control framework |
| Project status | **Concept · Anonymised framework direction** — operational use is not verified |
| Approximate timeframe | Unknown |
| Dave's role | Framework author is inferred; requires owner confirmation |
| Intended users | Merchant onboarding, KYB, compliance and risk operations teams — proposed |
| Business or risk problem | Current portfolio copy describes a need for consistent website, licensing, trust, vertical-risk and prohibited-activity review |
| Source repositories | None identified in the approved public GitHub account |
| Source files | Current `portfolio.html` and Phase 3 homepage summary only |
| Available screenshots | None approved; the existing stock-style image has unclear rights and is not evidence |
| Available diagrams | None supplied |
| Available documentation | No approved checklist, policy, decision log or anonymised case supplied |
| Available tests | Not applicable without a documented workflow artifact |
| Available demos | None |
| Technologies | KYB, merchant risk and EDD notes are methods in existing copy, not verified implementation evidence |
| Verified functionality | None beyond the existence of a portfolio framework description |
| Unverified claims | Operational adoption, applicant volumes, screening integrations, decision authority, approvals and control effectiveness |
| Confidentiality restrictions | Do not publish applicant identities, passports, addresses, merchant names, licence submissions, contracts, credentials or internal legal advice |
| Missing evidence | Approved anonymised process map, checklist excerpt, role, status, control ownership, review cycle and publication clearance |
| Owner confirmation required | Whether the framework exists as a documented artifact, Dave's contribution and what anonymised detail may be published |
| Public links approved | None |
| Recommended portfolio treatment | Supporting concept entry only. Defer an indexable case-study route. |

## Unsupported claims prohibited across Phase 4

- No invented client, employer, partner, merchant or external user.
- No claim of production deployment, regulatory approval, scheme certification or autonomous decisioning.
- No transaction volume, revenue, accuracy, fraud reduction, chargeback reduction or false-positive metric without source evidence.
- No confidential, personal, cardholder, credential, threshold or watchlist data.
- No technology may be described as implemented when it appears only as a possible direction.
