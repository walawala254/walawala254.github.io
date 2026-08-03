# Phase 7 Owner Release Test Checklist

Use the redesign-branch preview URL supplied with the Phase 7 closeout. Do not use the production website for these checks. Record the device, browser version, result, issue, severity and a screenshot or short recording for every failure.

## Before testing

1. Confirm the address is the Vercel **Preview**, not `walawala254.github.io`.
2. Test once on a normal connection and once with mobile data or a slower connection if practical.
3. Close other demanding apps when checking heat or battery.
4. Treat hidden content, an unusable action, focus loss, horizontal page scrolling or unreadable text as a release blocker.

## iPhone Safari

1. Open the homepage in a new private tab. Confirm the short introduction can be skipped and the hero appears without a long blank screen.
2. Scroll through Signal, Detect, Investigate, Decide and Improve. Confirm text remains readable and no animation traps scrolling.
3. Open the mobile menu, visit Portfolio, open the transaction-monitoring case study, then use Safari Back. Confirm the correct page returns and the menu is closed.
4. Open Contact and activate the email link. Cancel the email draft and return to Safari.
5. Rotate portrait to landscape and back on the homepage, case study and Contact. Confirm there is no sideways page scroll or overlapping browser chrome.
6. In iOS Accessibility settings, enable Reduce Motion. Reload the homepage and confirm content appears without the introduction or scroll-dependent hiding.
7. Increase Text Size, including Larger Accessibility Sizes where comfortable. Recheck the menu, case-study contents, status labels and contact actions.
8. Observe scrolling, battery and heat for five minutes. Record unexpected sustained heat, flicker, dropped frames or delayed taps.

## Android Chrome

1. Repeat Home → Portfolio → case study → Back → Contact.
2. Confirm every menu item and action is comfortably tappable without accidental neighbouring activation.
3. Scroll slowly and quickly. Confirm there is no route change, scroll lock, content jump or persistent stutter.
4. Inspect the Risk Intelligence Core, portfolio project preview and case-study architecture. Confirm labels remain legible and diagrams do not extend beyond the screen.
5. Use system Back after opening and closing the mobile menu. Confirm navigation history behaves normally.
6. Enable Remove animations or the closest reduced-motion setting, reload and confirm all content remains available.
7. If a low-end Android phone is available, repeat on mobile data and observe heat, battery and delayed interaction for five minutes.

## VoiceOver on iPhone or Mac

1. Navigate by landmarks. Expect banner/header, primary navigation, main and footer/content information in a logical order.
2. Navigate by headings. Expect one page-level heading followed by ordered section headings.
3. Navigate links. Confirm names explain the destination and the current primary page is announced.
4. Open and close the mobile menu. Confirm expanded/collapsed state, menu items and focus return are announced.
5. Read the Risk Intelligence Core. Confirm its title, description and the Signal → Detect → Investigate → Decide → Improve explanation are available without relying on the drawing.
6. Read Portfolio project statuses and the case-study limitations. Confirm status and limitation wording is explicit, not colour-only.
7. Confirm decorative routes and nodes are not announced repeatedly.

## TalkBack on Android

Repeat the VoiceOver steps using swipe navigation and touch exploration. Also confirm the mobile menu toggle is reached once, each action is activated once, and the reading order does not jump behind the menu.

## NVDA on Windows

1. Use `D` for landmarks, `H` for headings and `K` for links on Home, Portfolio, the case study and Contact.
2. Use Tab and Shift+Tab with NVDA running. Confirm focus order matches the visual order and every focused control is visible.
3. Open/close the menu at a narrow browser width and confirm its state and focus return.
4. Read the inline diagrams and verify their text equivalents are available.

## Keyboard-only desktop

1. Reload each public route and press Tab. Activate the skip link; focus should move to the main content.
2. Tab through primary navigation and actions. Confirm the focus ring is always visible and follows a logical order.
3. At a narrow window, open the mobile menu with Enter and Space, close it with Escape, and confirm focus returns to the toggle.
4. On Portfolio, open the flagship project and follow the case-study table of contents. Confirm hash targets are visible below the sticky header.
5. Test the CV, GitHub, LinkedIn, demo, repository and email links. External services may open a new tab; returning to the portfolio must preserve context.
6. Use browser Back and Forward across Home, Portfolio, the case study and Contact.
7. Visit an unknown preview path and use the 404 recovery links.

## Pass criteria and reporting

The manual gate passes only when no critical or high-severity issue remains and medium issues have an owner-approved disposition. Attach results to the Phase 8 deployment-preparation review. Native Safari, iOS/Android screen readers, physical touch, thermal behavior and battery use are not represented by desktop emulation and must not be marked passed unless actually tested.

## Phase 8 results intake

Use one row per environment. Replace **Not tested** only when the named device or assistive technology was actually used. Link evidence by safe repository issue/attachment reference; do not add private device identifiers or personal information.

| Test ID | Device | Browser or assistive technology | Test date | Tester | Result | Issue | Severity | Evidence reference | Resolution | Retest result |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| IOS-01 | Physical iPhone/iPad | Safari + Reduce Motion/text size | — | — | **Not tested** | Owner result not supplied | Release gate | — | Complete checklist | Not tested |
| AND-01 | Physical Android, low-end where available | Chrome + reduced motion | — | — | **Not tested** | Owner result not supplied | Release gate | — | Complete checklist | Not tested |
| VO-01 | iPhone or Mac | VoiceOver | — | — | **Not tested** | Owner result not supplied | Release gate | — | Complete checklist | Not tested |
| TB-01 | Android | TalkBack | — | — | **Not tested** | Owner result not supplied | Release gate | — | Complete checklist | Not tested |
| NVDA-01 | Windows where available | NVDA + supported browser | — | — | **Not tested** | Owner result not supplied | Release gate | — | Complete checklist where available | Not tested |
| KEY-01 | Physical desktop/laptop | Keyboard-only in production-target browser | — | — | **Not tested** | Owner result not supplied; automated Chromium coverage passed | Release gate | Local browser suite | Repeat manually | Not tested |
| ORIENT-01 | Physical iOS and Android | Portrait/landscape + browser chrome | — | — | **Not tested** | Owner result not supplied; 844 × 390 emulation passed | Release gate | Phase 8 browser suite | Repeat physically | Not tested |
| THERMAL-01 | Physical Android/iPhone | Several-minute battery/heat observation | — | — | **Not tested** | Cannot be represented by desktop automation | Release gate | — | Observe and record | Not tested |

Valid result values are **Pass**, **Fail**, and **Not tested**. For every failure, record a reproducible issue, classify it Critical/High/Medium/Low, link evidence, record its resolution, and retest the same environment before approval.
