import { spawn } from "node:child_process";
import { mkdir } from "node:fs/promises";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import path from "node:path";

const baseUrl = (process.argv[2] || "http://127.0.0.1:4173").replace(/\/$/, "");
let debuggingPort;
const screenshotDirectory =
  process.env.SCREENSHOT_DIR || path.join(tmpdir(), "risk-intelligence-browser-smoke");

const browserCandidates =
  process.platform === "win32"
    ? [
        process.env.BROWSER_PATH,
        "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
        "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe"
      ]
    : [
        process.env.BROWSER_PATH,
        "microsoft-edge",
        "google-chrome",
        "chromium"
      ];

const routes = [
  "index.html",
  "about.html",
  "services.html",
  "portfolio.html",
  "contact.html",
  "case-studies/transaction-monitoring/",
  "404.html"
];

const routeScreenshotNames = {
  "index.html": "home",
  "about.html": "about",
  "services.html": "services",
  "portfolio.html": "portfolio",
  "contact.html": "contact",
  "case-studies/transaction-monitoring/": "case-transaction-monitoring",
  "404.html": "404"
};

const expectedCurrentPage = {
  "index.html": "index.html",
  "about.html": "about.html",
  "services.html": "services.html",
  "portfolio.html": "portfolio.html",
  "contact.html": "contact.html",
  "case-studies/transaction-monitoring/": "/portfolio.html",
  "404.html": null
};

const sleep = (milliseconds) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

async function findAvailablePort() {
  const server = createServer();
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  await new Promise((resolve) => server.close(resolve));
  return address.port;
}

class CdpClient {
  constructor(url) {
    this.nextId = 1;
    this.pending = new Map();
    this.listeners = new Map();
    this.socket = new WebSocket(url);
  }

  async connect() {
    await new Promise((resolve, reject) => {
      this.socket.addEventListener("open", resolve, { once: true });
      this.socket.addEventListener("error", reject, { once: true });
    });

    this.socket.addEventListener("message", (event) => {
      const message = JSON.parse(event.data);

      if (message.id && this.pending.has(message.id)) {
        const { resolve, reject } = this.pending.get(message.id);
        this.pending.delete(message.id);

        if (message.error) reject(new Error(message.error.message));
        else resolve(message.result);
        return;
      }

      for (const listener of this.listeners.get(message.method) || []) {
        listener(message.params);
      }
    });
  }

  on(method, listener) {
    const listeners = this.listeners.get(method) || [];
    listeners.push(listener);
    this.listeners.set(method, listeners);
  }

  send(method, params = {}) {
    const id = this.nextId++;

    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.socket.send(JSON.stringify({ id, method, params }));
    });
  }
}

async function findBrowser() {
  const { access } = await import("node:fs/promises");

  for (const candidate of browserCandidates.filter(Boolean)) {
    if (!path.isAbsolute(candidate)) return candidate;

    try {
      await access(candidate);
      return candidate;
    } catch {
      // Continue to the next known browser location.
    }
  }

  throw new Error(
    "No supported Chromium browser found. Set BROWSER_PATH to Edge, Chrome, or Chromium."
  );
}

async function waitForTarget() {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      const response = await fetch(
        `http://127.0.0.1:${debuggingPort}/json/list`
      );
      const targets = await response.json();
      const pageTarget = targets.find((target) => target.type === "page");

      if (pageTarget) return pageTarget.webSocketDebuggerUrl;
    } catch {
      // The browser is still starting.
    }

    await sleep(250);
  }

  throw new Error("The browser debugging target did not become ready.");
}

async function evaluate(client, expression) {
  const response = await client.send("Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue: true
  });

  if (response.exceptionDetails) {
    throw new Error(response.exceptionDetails.text);
  }

  return response.result.value;
}

async function navigate(client, url) {
  await client.send("Page.navigate", { url });

  for (let attempt = 0; attempt < 40; attempt += 1) {
    await sleep(100);

    try {
      if ((await evaluate(client, "document.readyState")) === "complete") break;
    } catch {
      // The JavaScript execution context is changing during navigation.
    }
  }

  await sleep(250);
}

async function setViewport(client, width, height, mobile = false) {
  await client.send("Emulation.setDeviceMetricsOverride", {
    width,
    height,
    deviceScaleFactor: 1,
    mobile
  });
  await client.send("Emulation.setTouchEmulationEnabled", { enabled: mobile });
}

async function captureScreenshot(client, fileName) {
  const { writeFile } = await import("node:fs/promises");
  const result = await client.send("Page.captureScreenshot", {
    format: "png",
    captureBeyondViewport: false,
    fromSurface: true
  });

  await writeFile(
    path.join(screenshotDirectory, fileName),
    Buffer.from(result.data, "base64")
  );
}

async function waitForPath(client, expectedPath, timeout = 4_000) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeout) {
    try {
      if ((await evaluate(client, "location.pathname")) === expectedPath) {
        return true;
      }
    } catch {
      // Cross-document navigation is replacing the execution context.
    }

    await sleep(40);
  }

  return false;
}

async function clickSelector(client, selector) {
  const point = await evaluate(
    client,
    `(() => {
      const element = document.querySelector(${JSON.stringify(selector)});
      if (!element) return null;
      let rect = element.getBoundingClientRect();
      const headerBottom = document.querySelector('.site-header')
        ?.getBoundingClientRect().bottom || 0;
      if (
        !element.closest('.site-header') &&
        (rect.top < headerBottom + 8 || rect.bottom > innerHeight - 8)
      ) {
        element.scrollIntoView({ block: 'center', behavior: 'instant' });
        rect = element.getBoundingClientRect();
      }
      return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    })()`
  );

  if (!point) return false;

  await client.send("Input.dispatchMouseEvent", {
    type: "mousePressed",
    x: point.x,
    y: point.y,
    button: "left",
    buttons: 1,
    clickCount: 1
  });
  await client.send("Input.dispatchMouseEvent", {
    type: "mouseReleased",
    x: point.x,
    y: point.y,
    button: "left",
    buttons: 0,
    clickCount: 1
  });
  return true;
}

async function activateSelectorWithKeyboard(client, selector) {
  const focused = await evaluate(
    client,
    `(() => {
      const element = document.querySelector(${JSON.stringify(selector)});
      element?.focus();
      return document.activeElement === element;
    })()`
  );
  if (!focused) return false;

  for (const type of ["keyDown", "keyUp"]) {
    await client.send("Input.dispatchKeyEvent", {
      type,
      key: "Enter",
      code: "Enter",
      windowsVirtualKeyCode: 13
    });
  }
  return true;
}

async function rapidlyActivateSelector(client, selector) {
  const point = await evaluate(
    client,
    `(() => {
      const element = document.querySelector(${JSON.stringify(selector)});
      const rect = element?.getBoundingClientRect();
      return rect
        ? { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
        : null;
    })()`
  );
  if (!point) return false;

  for (let click = 0; click < 2; click += 1) {
    await client.send("Input.dispatchMouseEvent", {
      type: "mousePressed",
      x: point.x,
      y: point.y,
      button: "left",
      buttons: 1,
      clickCount: 1
    });
    await client.send("Input.dispatchMouseEvent", {
      type: "mouseReleased",
      x: point.x,
      y: point.y,
      button: "left",
      buttons: 0,
      clickCount: 1
    });
  }
  return true;
}

async function observeViewTransition(client) {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    await sleep(25);
    try {
      const observed = await evaluate(
        client,
        `document.getAnimations().some(
          (animation) => animation.effect?.pseudoElement?.startsWith('::view-transition')
        )`
      );
      if (observed) return true;
    } catch {
      // The destination document has not created its execution context yet.
    }
  }

  return false;
}

async function inspectRoute(client) {
  return evaluate(
    client,
    `(() => ({
      overflow:
        document.documentElement.scrollWidth >
        document.documentElement.clientWidth,
      width: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
      current:
        document.querySelector('.nav-links [aria-current="page"]')?.getAttribute('href') ||
        null,
      currentCount: document.querySelectorAll(
        '.nav-links [aria-current="page"]'
      ).length,
      currentMarkerVisible: (() => {
        const current = document.querySelector(
          '.nav-links [aria-current="page"]'
        );
        if (!current) return true;
        const marker = getComputedStyle(current, '::after');
        return (
          parseFloat(marker.height) >= 2 &&
          !['none', 'matrix(0, 0, 0, 1, 0, 0)'].includes(marker.transform)
        );
      })(),
      brokenEagerImages: [...document.images]
        .filter(
          (image) =>
            image.loading !== 'lazy' &&
            (!image.complete || image.naturalWidth === 0)
        )
        .map((image) => image.getAttribute('src')),
      imagesWithoutDimensions: [...document.images]
        .filter(
          (image) =>
            !image.hasAttribute('width') || !image.hasAttribute('height')
        )
        .map((image) => image.getAttribute('src')),
      quarantinedImages: [...document.images]
        .map((image) => image.getAttribute('src') || '')
        .filter((source) => /(?:contact|services)\.jpg(?:$|[?#])/i.test(source)),
      headingOrderValid: (() => {
        const levels = [...document.querySelectorAll('h1, h2, h3, h4, h5, h6')]
          .map((heading) => Number(heading.tagName.slice(1)));
        return (
          levels.filter((level) => level === 1).length === 1 &&
          levels.every((level, index) => index === 0 || level <= levels[index - 1] + 1)
        );
      })(),
      landmarksValid:
        document.querySelectorAll('body > header.site-header').length === 1 &&
        document.querySelectorAll('main#main').length === 1 &&
        document.querySelectorAll('body > footer.site-footer').length === 1 &&
        document.querySelectorAll('nav[aria-label="Primary navigation"]').length === 1,
      skipTargetValid:
        document.querySelector('.skip-link')?.getAttribute('href') === '#main' &&
        Boolean(document.querySelector('main#main'))
    }))()`
  );
}

function assertResults(report) {
  const failures = [];

  for (const [viewport, routeResults] of Object.entries(report.results)) {
    for (const route of routes) {
      const result = routeResults[route];

      if (result.overflow) failures.push(`${viewport} ${route} overflows`);
      if (result.current !== expectedCurrentPage[route]) {
        failures.push(`${viewport} ${route} has incorrect aria-current`);
      }
      const expectedCurrentCount = route === "404.html" ? 0 : 1;
      if (result.currentCount !== expectedCurrentCount) {
        failures.push(`${viewport} ${route} has an incorrect current-item count`);
      }
      if (!result.currentMarkerVisible) {
        failures.push(`${viewport} ${route} current state lacks a visible marker`);
      }
      if (result.brokenEagerImages.length) {
        failures.push(`${viewport} ${route} has broken eager images`);
      }
      if (result.imagesWithoutDimensions.length) {
        failures.push(`${viewport} ${route} has images without dimensions`);
      }
      if (result.quarantinedImages.length) {
        failures.push(`${viewport} ${route} requests a quarantined image`);
      }
      if (!result.headingOrderValid) {
        failures.push(`${viewport} ${route} has an invalid heading order`);
      }
      if (!result.landmarksValid || !result.skipTargetValid) {
        failures.push(`${viewport} ${route} has invalid landmarks or skip target`);
      }
    }
  }

  if (!report.skipLinkFocus) failures.push("Skip link is not first in tab order");
  for (const [check, passed] of Object.entries(report.gestureNavigationTest)) {
    if (!passed) failures.push(`Gesture navigation regression: ${check}`);
  }
  for (const [check, passed] of Object.entries(report.menuTest)) {
    if (!passed) failures.push(`Mobile menu check failed: ${check}`);
  }
  if (
    !report.reducedMotion.mediaMatches ||
    report.reducedMotion.opacity !== "1" ||
    !["none", "matrix(1, 0, 0, 1, 0, 0)"].includes(
      report.reducedMotion.transform
    )
  ) {
    failures.push("Reduced-motion fallback is not active");
  }
  if (report.consoleErrors.length) failures.push("Browser console has errors");
  if (!report.homepage.intro.activeOnFirstView) {
    failures.push("Homepage intro did not activate on first view");
  }
  if (!report.homepage.intro.skipWorked) {
    failures.push("Homepage intro skip did not dismiss the overlay");
  }
  if (!report.homepage.intro.keyboardReachable) {
    failures.push("Homepage intro skip is not keyboard reachable");
  }
  if (!report.homepage.intro.sessionBypass) {
    failures.push("Homepage intro replayed in the same session");
  }
  if (!report.homepage.reducedMotion.introBypassed) {
    failures.push("Reduced motion did not bypass the homepage intro");
  }
  if (!report.homepage.noJavaScript.contentVisible) {
    failures.push("Homepage content is not visible without JavaScript");
  }
  if (!report.homepage.noJavaScript.navigationVisible) {
    failures.push("Homepage navigation is not visible without JavaScript");
  }
  if (!report.homepage.noJavaScript.staticCoreVisible) {
    failures.push("Static Risk Intelligence Core is not visible without JavaScript");
  }
  if (report.homepage.primaryCta.text !== "View selected work") {
    failures.push("Homepage primary CTA is incorrect");
  }
  if (!report.homepage.primaryCta.target.endsWith("#selected-work")) {
    failures.push("Homepage primary CTA does not target selected work");
  }
  if (!report.homepage.motion.setup || !report.homepage.motion.riskCoreSetup) {
    failures.push("Homepage GSAP/ScrollTrigger setup is incomplete");
  }
  if (!report.homepage.motion.cleanup) {
    failures.push("Homepage GSAP/ScrollTrigger cleanup failed");
  }
  if (report.homepage.motion.hiddenImportantContent.length) {
    failures.push("Homepage cleanup left important content hidden");
  }
  if (report.homepage.resources.threeRequests.length) {
    failures.push("Homepage requested a Three.js resource");
  }
  if (report.homepage.prototypeNavigationLinks.length) {
    failures.push("Prototype routes are linked from production navigation");
  }
  if (!report.homepage.edgeGestureStayedOnPage) {
    failures.push("Homepage edge wheel input changed the page");
  }
  if (!report.homepage.slowConnection.heroVisible) {
    failures.push("Homepage hero was not visible under simulated slow connection");
  }
  if (!report.caseStudy.statusVisible || !report.caseStudy.roleVisible) {
    failures.push("Case-study status or Dave's role is not visible");
  }
  if (!report.caseStudy.limitationsVisible) {
    failures.push("Case-study limitations section is missing or hidden");
  }
  if (!report.caseStudy.breadcrumb.navigationWorked) {
    failures.push("Case-study breadcrumb navigation failed");
  }
  if (!report.caseStudy.breadcrumb.backWorked) {
    failures.push("Browser Back did not restore the case-study route");
  }
  if (!report.caseStudy.noJavaScript.contentVisible) {
    failures.push("Case-study content is not visible without JavaScript");
  }
  if (!report.caseStudy.noJavaScript.diagramVisible) {
    failures.push("Case-study diagram is not visible without JavaScript");
  }
  if (!report.caseStudy.reducedMotion.contentVisible) {
    failures.push("Reduced motion hid case-study content");
  }
  if (report.caseStudy.resources.threeRequests.length) {
    failures.push("Case study requested a Three.js resource");
  }
  if (report.caseStudy.resources.prototypeRequests.length) {
    failures.push("Case study requested a prototype resource");
  }
  if (report.caseStudy.hiddenImportantContent.length) {
    failures.push("Case study left important content hidden");
  }
  if (!report.caseStudy.edgeGestureStayedOnPage) {
    failures.push("Case-study edge wheel input changed the page");
  }
  for (const [check, passed] of Object.entries(report.caseStudy.sectionNavigation)) {
    if (!passed) failures.push(`Case-study section navigation failed: ${check}`);
  }
  for (const [route, routeFailures] of Object.entries(
    report.interactionAudit.focusByRoute
  )) {
    if (routeFailures.length) {
      failures.push(`${route} has focus-indicator failures: ${routeFailures.join(", ")}`);
    }
  }
  for (const [route, routeFailures] of Object.entries(
    report.interactionAudit.targetSizeByRoute
  )) {
    if (routeFailures.length) {
      failures.push(`${route} has targets below 24px: ${routeFailures.join(", ")}`);
    }
  }
  for (const [route, resources] of Object.entries(
    report.interactionAudit.resourcesByRoute
  )) {
    if (resources.three.length || resources.prototype.length) {
      failures.push(`${route} requested Three.js or a prototype resource`);
    }
    if (route !== "index.html" && resources.gsap.length) {
      failures.push(`${route} requested GSAP outside the homepage`);
    }
    if (resources.external.length || resources.fonts.length) {
      failures.push(`${route} automatically requested an external resource or font`);
    }
    if (resources.quarantined.length) {
      failures.push(`${route} requested a quarantined raster`);
    }
  }
  if (!report.interactionAudit.hoverLayoutStable) {
    failures.push("Portfolio hover changed component geometry");
  }
  if (!report.interactionAudit.activeLayoutStable) {
    failures.push("Contact active state changed control geometry");
  }
  if (
    !report.interactionAudit.revealFailureSafe.allVisible ||
    !report.interactionAudit.revealFailureSafe.rootSafe ||
    report.interactionAudit.revealFailureSafe.reason !== "observer-error"
  ) {
    failures.push("Reveal setup failure can leave content hidden");
  }
  for (const [route, result] of Object.entries(
    report.interactionAudit.reducedMotionByRoute
  )) {
    if (!result.mediaMatches || !result.mainVisible || !result.allVisible) {
      failures.push(`${route} is incomplete under reduced motion`);
    }
  }
  for (const [route, result] of Object.entries(
    report.interactionAudit.noJavaScriptByRoute
  )) {
    if (
      !result.noRootClass ||
      !result.mainVisible ||
      !result.revealsVisible ||
      !result.navigationPresent
    ) {
      failures.push(`${route} is incomplete without JavaScript`);
    }
  }
  for (const [route, result] of Object.entries(
    report.interactionAudit.textResizeByRoute
  )) {
    if (result.overflow || !result.mainVisible || !result.navigationPresent) {
      failures.push(`${route} fails 200% text resizing`);
    }
  }
  for (const [route, result] of Object.entries(
    report.interactionAudit.zoom200ByRoute
  )) {
    if (result.overflow || !result.mainVisible) {
      failures.push(`${route} fails the 200% zoom reflow proxy`);
    }
  }
  for (const [route, result] of Object.entries(
    report.interactionAudit.landscapeByRoute
  )) {
    if (result.overflow || !result.mainVisible || !result.navigationPresent) {
      failures.push(`${route} fails the emulated mobile-landscape check`);
    }
  }
  if (
    report.interactionAudit.externalFontFailure.externalRequests.length ||
    !report.interactionAudit.externalFontFailure.contentVisible
  ) {
    failures.push("External-font failure fallback is incomplete");
  }
  if (
    !report.interactionAudit.imageFailure.altAvailable ||
    !report.interactionAudit.imageFailure.imageFailed ||
    report.interactionAudit.imageFailure.overflow ||
    !report.interactionAudit.imageFailure.mainVisible
  ) {
    failures.push("Portrait failure fallback is incomplete");
  }
  if (
    !report.interactionAudit.externalEvidenceFailure.contentVisible ||
    !report.interactionAudit.externalEvidenceFailure.homeActionsAvailable ||
    !report.interactionAudit.externalEvidenceFailure.caseActionsAvailable ||
    report.interactionAudit.externalEvidenceFailure.externalRequests.length
  ) {
    failures.push("External-evidence failure fallback is incomplete");
  }
  for (const [check, passed] of Object.entries(report.navigationBehavior)) {
    if (!passed) failures.push(`Navigation behavior failed: ${check}`);
  }
  for (const [check, passed] of Object.entries(report.transitionBehavior)) {
    if (!passed) failures.push(`Transition behavior failed: ${check}`);
  }

  if (failures.length) {
    throw new Error(`Browser smoke test failed:\n- ${failures.join("\n- ")}`);
  }
}

async function main() {
  if (typeof WebSocket === "undefined") {
    throw new Error("This smoke test requires a Node.js runtime with WebSocket support.");
  }

  await mkdir(screenshotDirectory, { recursive: true });
  debuggingPort = await findAvailablePort();
  const browserPath = await findBrowser();
  const profileDirectory = path.join(
    tmpdir(),
    `risk-intelligence-edge-${process.pid}`
  );
  await mkdir(profileDirectory, { recursive: true });

  const browserProcess = spawn(
    browserPath,
    [
      "--headless=new",
      "--disable-extensions",
      `--remote-debugging-port=${debuggingPort}`,
      `--user-data-dir=${profileDirectory}`,
      "--no-first-run",
      "--no-default-browser-check",
      `${baseUrl}/index.html`
    ],
    { stdio: "ignore", windowsHide: true }
  );

  let client;

  try {
    const target = await waitForTarget();
    client = new CdpClient(target);
    await client.connect();

    const consoleErrors = [];
    const environmentErrors = [];
    const expectedResourceOrigins = new Set([
      new URL(baseUrl).origin,
      "https://fonts.googleapis.com",
      "https://fonts.gstatic.com",
      "https://cdnjs.cloudflare.com"
    ]);
    client.on("Runtime.exceptionThrown", (event) => {
      const details = event.exceptionDetails;
      const description = details.exception?.description || details.text;
      const location = details.url
        ? ` (${details.url}:${(details.lineNumber || 0) + 1})`
        : "";
      consoleErrors.push(`exception: ${description}${location}`);
    });
    client.on("Runtime.consoleAPICalled", (event) => {
      if (event.type === "error") {
        consoleErrors.push(
          `console: ${event.args
            .map((argument) => argument.value || argument.description)
            .join(" ")}`
        );
      }
    });
    client.on("Log.entryAdded", (event) => {
      if (event.entry.level === "error") {
        const message = `log: ${event.entry.text}${
          event.entry.url ? ` (${event.entry.url})` : ""
        }`;
        let isExpectedResource = !event.entry.url;

        try {
          isExpectedResource =
            isExpectedResource ||
            expectedResourceOrigins.has(new URL(event.entry.url).origin);
        } catch {
          // A missing or non-URL log source belongs to the inspected page.
        }

        (isExpectedResource ? consoleErrors : environmentErrors).push(message);
      }
    });

    await client.send("Page.enable");
    await client.send("Runtime.enable");
    await client.send("Log.enable");
    await client.send("Network.enable");

    const homepage = {
      intro: {},
      reducedMotion: {},
      noJavaScript: {},
      primaryCta: {},
      motion: {},
      resources: {},
      prototypeNavigationLinks: [],
      edgeGestureStayedOnPage: false,
      slowConnection: {}
    };
    const caseStudy = {
      breadcrumb: {},
      noJavaScript: {},
      reducedMotion: {},
      resources: {
        initialRequests: [],
        threeRequests: [],
        prototypeRequests: []
      },
      statusVisible: false,
      roleVisible: false,
      limitationsVisible: false,
      sectionNavigation: {},
      hiddenImportantContent: [],
      edgeGestureStayedOnPage: false
    };
    const interactionAudit = {
      focusByRoute: {},
      targetSizeByRoute: {},
      reducedMotionByRoute: {},
      noJavaScriptByRoute: {},
      textResizeByRoute: {},
      zoom200ByRoute: {},
      landscapeByRoute: {},
      resourcesByRoute: {},
      externalFontFailure: {},
      externalEvidenceFailure: {},
      imageFailure: {},
      hoverLayoutStable: false,
      activeLayoutStable: false,
      revealFailureSafe: false
    };

    await setViewport(client, 1440, 1000);
    await navigate(client, `${baseUrl}/about.html`);
    await evaluate(
      client,
      `sessionStorage.removeItem('dave-bryson-risk-intro-seen'); true`
    );
    await navigate(client, `${baseUrl}/index.html`);
    homepage.intro.activeOnFirstView = await evaluate(
      client,
      `(() => {
        const intro = document.querySelector('[data-home-intro]');
        return Boolean(
          intro &&
          !intro.hidden &&
          window.__HOME_MOTION_DIAGNOSTICS__?.intro?.shown
        );
      })()`
    );
    await evaluate(client, "document.activeElement?.blur(); true");
    for (let tab = 0; tab < 2; tab += 1) {
      await client.send("Input.dispatchKeyEvent", {
        type: "keyDown",
        key: "Tab",
        code: "Tab",
        windowsVirtualKeyCode: 9
      });
      await client.send("Input.dispatchKeyEvent", {
        type: "keyUp",
        key: "Tab",
        code: "Tab",
        windowsVirtualKeyCode: 9
      });
    }
    homepage.intro.keyboardReachable = await evaluate(
      client,
      "document.activeElement?.matches('[data-intro-skip]') === true"
    );
    await captureScreenshot(client, "home-intro-desktop.png");
    homepage.intro.skipWorked = await evaluate(
      client,
      `(async () => {
        document.querySelector('[data-intro-skip]')?.click();
        await new Promise((resolve) => setTimeout(resolve, 80));
        return document.querySelector('[data-home-intro]')?.hidden === true;
      })()`
    );
    await navigate(client, `${baseUrl}/about.html`);
    await navigate(client, `${baseUrl}/index.html`);
    homepage.intro.sessionBypass = await evaluate(
      client,
      `(() => {
        const diagnostics = window.__HOME_MOTION_DIAGNOSTICS__;
        return (
          document.querySelector('[data-home-intro]')?.hidden === true &&
          diagnostics?.intro?.skippedReason === 'session'
        );
      })()`
    );

    const results = { desktop: {}, mobile: {} };
    await setViewport(client, 1440, 1000);

    for (const route of routes) {
      await navigate(client, `${baseUrl}/${route}`);
      results.desktop[route] = await inspectRoute(client);
      await sleep(route === "index.html" ? 1_100 : 750);
      await captureScreenshot(
        client,
        `phase6-${routeScreenshotNames[route]}-1440x1000.png`
      );

      if (route === "index.html") {
        await sleep(500);
        await captureScreenshot(client, "home-desktop.png");
      }
      if (route === "portfolio.html") {
        await sleep(500);
        await captureScreenshot(client, "portfolio-desktop.png");
        await evaluate(
          client,
          `(() => {
            const grid = document.querySelector('.project-grid');
            const header = document.querySelector('.site-header');
            if (grid) {
              scrollTo(
                0,
                grid.getBoundingClientRect().top +
                  scrollY -
                  (header?.offsetHeight || 0) -
                  24
              );
            }
            return true;
          })()`
        );
        await sleep(500);
        await captureScreenshot(client, "portfolio-index-desktop.png");
      }
      if (route === "case-studies/transaction-monitoring/") {
        await sleep(500);
        await captureScreenshot(client, "case-transaction-monitoring-desktop.png");
      }
      if (route === "about.html") {
        await sleep(500);
        await captureScreenshot(client, "about-desktop.png");
      }
      if (route === "services.html") {
        await evaluate(
          client,
          `(() => {
            const grid = document.querySelector('.service-grid');
            const header = document.querySelector('.site-header');
            if (grid) {
              scrollTo(
                0,
                grid.getBoundingClientRect().top +
                  scrollY -
                  (header?.offsetHeight || 0) -
                  24
              );
            }
            return true;
          })()`
        );
        await sleep(500);
        await captureScreenshot(client, "services-index-desktop.png");
      }
    }

    const wheelEdgeResults = {};
    for (const route of routes) {
      const expectedPath = new URL(`${baseUrl}/${route}`).pathname;
      await navigate(client, `${baseUrl}/${route}`);
      await evaluate(client, "scrollTo(0, 0); true");
      await client.send("Input.dispatchMouseEvent", {
        type: "mouseWheel",
        x: 500,
        y: 180,
        deltaX: 0,
        deltaY: -420
      });
      await sleep(120);
      const topStayed = await evaluate(
        client,
        `location.pathname === ${JSON.stringify(expectedPath)}`
      );

      await evaluate(
        client,
        "scrollTo(0, document.documentElement.scrollHeight); true"
      );
      for (const deltaY of [90, 130, 180, 240]) {
        await client.send("Input.dispatchMouseEvent", {
          type: "mouseWheel",
          x: 500,
          y: 760,
          deltaX: 0,
          deltaY
        });
      }
      await sleep(180);
      const bottomStayed = await evaluate(
        client,
        `location.pathname === ${JSON.stringify(expectedPath)}`
      );
      wheelEdgeResults[route] = topStayed && bottomStayed;
    }

    await navigate(client, `${baseUrl}/index.html`);
    await evaluate(client, "document.activeElement?.blur(); true");
    await client.send("Input.dispatchKeyEvent", {
      type: "keyDown",
      key: "Tab",
      code: "Tab",
      windowsVirtualKeyCode: 9
    });
    await client.send("Input.dispatchKeyEvent", {
      type: "keyUp",
      key: "Tab",
      code: "Tab",
      windowsVirtualKeyCode: 9
    });
    const skipLinkFocus = await evaluate(
      client,
      'document.activeElement?.classList.contains("skip-link")'
    );

    await setViewport(client, 390, 844, true);

    for (const route of routes) {
      await navigate(client, `${baseUrl}/${route}`);
      results.mobile[route] = await inspectRoute(client);
      await sleep(route === "index.html" ? 1_100 : 650);
      await captureScreenshot(
        client,
        `phase6-${routeScreenshotNames[route]}-390x844.png`
      );

      if (route === "portfolio.html") {
        await sleep(500);
        await captureScreenshot(client, "portfolio-mobile-390.png");
        await evaluate(
          client,
          `(() => {
            const grid = document.querySelector('.project-grid');
            const header = document.querySelector('.site-header');
            if (grid) {
              scrollTo(
                0,
                grid.getBoundingClientRect().top +
                  scrollY -
                  (header?.offsetHeight || 0) -
                  16
              );
            }
            return true;
          })()`
        );
        await sleep(500);
        await captureScreenshot(client, "portfolio-index-mobile-390.png");
      }
      if (route === "case-studies/transaction-monitoring/") {
        await sleep(500);
        await captureScreenshot(client, "case-transaction-monitoring-mobile-390.png");
      }
      if (route === "about.html") {
        await sleep(500);
        await captureScreenshot(client, "about-mobile-390.png");
      }
      if (route === "services.html") {
        await evaluate(
          client,
          `(() => {
            const grid = document.querySelector('.service-grid');
            const header = document.querySelector('.site-header');
            if (grid) {
              scrollTo(
                0,
                grid.getBoundingClientRect().top +
                  scrollY -
                  (header?.offsetHeight || 0) -
                  16
              );
            }
            return true;
          })()`
        );
        await sleep(500);
        await captureScreenshot(client, "services-index-mobile-390.png");
      }
    }

    const responsiveViewports = [
      { name: "narrow320", width: 320, height: 800, mobile: true },
      { name: "tablet768", width: 768, height: 1024, mobile: true },
      { name: "tablet1024", width: 1024, height: 900, mobile: false },
      { name: "large1920", width: 1920, height: 1080, mobile: false }
    ];

    for (const viewport of responsiveViewports) {
      results[viewport.name] = {};
      await setViewport(
        client,
        viewport.width,
        viewport.height,
        viewport.mobile
      );

      for (const route of routes) {
        await navigate(client, `${baseUrl}/${route}`);
        results[viewport.name][route] = await inspectRoute(client);
        await sleep(route === "index.html" ? 1_100 : 650);
        await captureScreenshot(
          client,
          `phase6-${routeScreenshotNames[route]}-${viewport.width}x${viewport.height}.png`
        );
      }

      const viewportScreenshotNames = {
        narrow320: "home-mobile-320.png",
        tablet768: "home-tablet-768.png",
        tablet1024: "home-tablet-1024.png",
        large1920: "home-large-1920.png"
      };
      const portfolioScreenshotNames = {
        narrow320: "portfolio-mobile-320.png",
        tablet768: "portfolio-tablet-768.png",
        tablet1024: "portfolio-tablet-1024.png",
        large1920: "portfolio-large-1920.png"
      };
      await navigate(client, `${baseUrl}/portfolio.html`);
      await sleep(600);
      await captureScreenshot(
        client,
        portfolioScreenshotNames[viewport.name]
      );
      await navigate(client, `${baseUrl}/index.html`);
      await sleep(1200);
      await captureScreenshot(
        client,
        viewportScreenshotNames[viewport.name]
      );
    }

    await setViewport(client, 1440, 1000);
    for (const route of routes) {
      await navigate(client, `${baseUrl}/${route}`);
      const routeInteractions = await evaluate(
        client,
        `(() => {
          const elements = [...document.querySelectorAll('a[href], button:not([disabled])')]
            .filter((element) => {
              const style = getComputedStyle(element);
              const rect = element.getBoundingClientRect();
              return (
                style.display !== 'none' &&
                style.visibility !== 'hidden' &&
                rect.width > 0 &&
                rect.height > 0
              );
            });
          const focusFailures = [];
          const smallTargets = [];

          for (const element of elements) {
            element.focus({ preventScroll: true });
            const style = getComputedStyle(element);
            const rect = element.getBoundingClientRect();
            const hasOutline =
              style.outlineStyle !== 'none' && parseFloat(style.outlineWidth) >= 2;
            const hasFocusShadow = style.boxShadow !== 'none';
            if (document.activeElement !== element || (!hasOutline && !hasFocusShadow)) {
              focusFailures.push(element.textContent.trim().replace(/\s+/g, ' ').slice(0, 80));
            }
            if (Math.min(rect.width, rect.height) < 24) {
              smallTargets.push(element.textContent.trim().replace(/\s+/g, ' ').slice(0, 80));
            }
          }

          return {
            interactiveCount: elements.length,
            focusFailures,
            smallTargets,
            resources: performance.getEntriesByType('resource').map((entry) => entry.name)
          };
        })()`
      );
      interactionAudit.focusByRoute[route] = routeInteractions.focusFailures;
      interactionAudit.targetSizeByRoute[route] = routeInteractions.smallTargets;
      interactionAudit.resourcesByRoute[route] = {
        three: routeInteractions.resources.filter((name) => /three(?:-core|\.module|\.js)?/i.test(name)),
        prototype: routeInteractions.resources.filter((name) => /prototype/i.test(name)),
        gsap: routeInteractions.resources.filter((name) => /ScrollTrigger|gsap/i.test(name)),
        fonts: routeInteractions.resources.filter((name) => /fonts\.(?:googleapis|gstatic)\.com|\.(?:woff2?|ttf|otf)(?:$|[?#])/i.test(name)),
        quarantined: routeInteractions.resources.filter((name) => /(?:contact|services)\.jpg(?:$|[?#])/i.test(name)),
        external: routeInteractions.resources.filter(
          (name) => new URL(name).origin !== new URL(baseUrl).origin
        ),
        requestCount: routeInteractions.resources.length
      };
    }

    await navigate(client, `${baseUrl}/portfolio.html`);
    await sleep(350);
    await evaluate(
      client,
      `(() => {
        document.documentElement.style.scrollBehavior = 'auto';
        const row = document.querySelector('.featured-case__row');
        row?.scrollIntoView({ block: 'center', behavior: 'instant' });
        return Boolean(row);
      })()`
    );
    await sleep(120);
    const featuredBoundsBefore = await evaluate(
      client,
      `(() => {
        const row = document.querySelector('.featured-case__row');
        return row && {
          x: row.offsetLeft,
          y: row.offsetTop,
          width: row.offsetWidth,
          height: row.offsetHeight
        };
      })()`
    );
    const featuredPoint = await evaluate(
      client,
      `(() => {
        const rect = document.querySelector('.featured-case__row')?.getBoundingClientRect();
        return rect && { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
      })()`
    );
    await client.send("Input.dispatchMouseEvent", {
      type: "mouseMoved",
      x: featuredPoint.x,
      y: featuredPoint.y
    });
    await sleep(320);
    const featuredBoundsAfter = await evaluate(
      client,
      `(() => {
        const row = document.querySelector('.featured-case__row');
        return row && {
          x: row.offsetLeft,
          y: row.offsetTop,
          width: row.offsetWidth,
          height: row.offsetHeight
        };
      })()`
    );
    interactionAudit.hoverLayoutStable = ["x", "y", "width", "height"].every(
      (key) => Math.abs(featuredBoundsBefore[key] - featuredBoundsAfter[key]) < 0.5
    );
    await captureScreenshot(client, "phase6-portfolio-project-hover.png");
    await evaluate(
      client,
      `document.querySelector('.featured-case__actions a')?.focus({ preventScroll: true }); true`
    );
    await sleep(300);
    await captureScreenshot(client, "phase6-portfolio-project-focus.png");

    await navigate(client, `${baseUrl}/services.html`);
    await sleep(350);
    await evaluate(
      client,
      `(() => {
        const target = document.querySelector('.service-card__action');
        target?.scrollIntoView({ block: 'center', behavior: 'instant' });
        target?.focus({ preventScroll: true });
        return true;
      })()`
    );
    await sleep(800);
    await captureScreenshot(client, "phase6-services-action-focus.png");

    await navigate(client, `${baseUrl}/contact.html`);
    await sleep(350);
    await evaluate(
      client,
      `(() => {
        const target = document.querySelector('.contact-actions .btn.primary');
        target?.addEventListener('click', (event) => event.preventDefault(), { once: true });
        target?.focus({ preventScroll: true });
        return true;
      })()`
    );
    await sleep(500);
    await captureScreenshot(client, "phase6-contact-action-focus.png");
    const activeButton = await evaluate(
      client,
      `(() => {
        const target = document.querySelector('.contact-actions .btn.primary');
        const rect = target?.getBoundingClientRect();
        return rect && {
          point: { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 },
          bounds: { x: rect.x, y: rect.y, width: rect.width, height: rect.height }
        };
      })()`
    );
    await client.send("Input.dispatchMouseEvent", {
      type: "mousePressed",
      x: activeButton.point.x,
      y: activeButton.point.y,
      button: "left",
      buttons: 1,
      clickCount: 1
    });
    await captureScreenshot(client, "phase6-contact-action-active.png");
    const activeBounds = await evaluate(
      client,
      `(() => {
        const rect = document.querySelector('.contact-actions .btn.primary')?.getBoundingClientRect();
        return rect && { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
      })()`
    );
    interactionAudit.activeLayoutStable =
      Math.abs(activeButton.bounds.width - activeBounds.width) < 0.5 &&
      Math.abs(activeButton.bounds.height - activeBounds.height) < 0.5;
    await client.send("Input.dispatchMouseEvent", {
      type: "mouseReleased",
      x: activeButton.point.x,
      y: activeButton.point.y,
      button: "left",
      buttons: 0,
      clickCount: 1
    });

    await navigate(client, `${baseUrl}/404.html`);
    await sleep(350);
    await evaluate(
      client,
      `document.querySelector('.hero-actions .btn.primary')?.focus({ preventScroll: true }); true`
    );
    await captureScreenshot(client, "phase6-404-recovery-focus.png");

    const failureProbe = await client.send("Page.addScriptToEvaluateOnNewDocument", {
      source: `window.IntersectionObserver = class {
        constructor() { throw new Error('Phase 6 reveal failure probe'); }
      };`
    });
    await navigate(client, `${baseUrl}/about.html`);
    interactionAudit.revealFailureSafe = await evaluate(
      client,
      `(() => ({
        allVisible: [...document.querySelectorAll('.reveal')].every((item) => {
          const style = getComputedStyle(item);
          return Number(style.opacity) > 0 && style.visibility === 'visible';
        }),
        rootSafe: !document.documentElement.classList.contains('reveal-ready'),
        reason: window.__REVEAL_DIAGNOSTICS__?.reason
      }))()`
    );
    await client.send("Page.removeScriptToEvaluateOnNewDocument", {
      identifier: failureProbe.identifier
    });

    await client.send("Emulation.setEmulatedMedia", {
      features: [{ name: "prefers-reduced-motion", value: "reduce" }]
    });
    for (const route of routes) {
      await navigate(client, `${baseUrl}/${route}`);
      interactionAudit.reducedMotionByRoute[route] = await evaluate(
        client,
        `(() => ({
          allVisible: [...document.querySelectorAll('.reveal')].every((item) => {
            const style = getComputedStyle(item);
            return Number(style.opacity) > 0 && style.visibility === 'visible';
          }),
          mainVisible: Number(getComputedStyle(document.querySelector('main')).opacity) > 0,
          mediaMatches: matchMedia('(prefers-reduced-motion: reduce)').matches
        }))()`
      );
    }
    await client.send("Emulation.setEmulatedMedia", {
      features: [{ name: "prefers-reduced-motion", value: "no-preference" }]
    });

    await client.send("Emulation.setScriptExecutionDisabled", { value: true });
    for (const route of routes) {
      await client.send("Page.navigate", { url: `${baseUrl}/${route}` });
      await sleep(350);
      interactionAudit.noJavaScriptByRoute[route] = await evaluate(
        client,
        `(() => ({
          noRootClass: !document.documentElement.classList.contains('js'),
          mainVisible: Number(getComputedStyle(document.querySelector('main')).opacity) > 0,
          revealsVisible: [...document.querySelectorAll('.reveal')].every((item) =>
            Number(getComputedStyle(item).opacity) > 0
          ),
          navigationPresent: document.querySelectorAll('.nav-links a[href]').length === 5
        }))()`
      );
    }
    await client.send("Emulation.setScriptExecutionDisabled", { value: false });

    await setViewport(client, 390, 844, true);
    for (const route of routes) {
      await navigate(client, `${baseUrl}/${route}`);
      interactionAudit.textResizeByRoute[route] = await evaluate(
        client,
        `(() => {
          document.documentElement.style.fontSize = '200%';
          const main = document.querySelector('main');
          return {
            overflow:
              document.documentElement.scrollWidth >
              document.documentElement.clientWidth,
            mainVisible:
              Boolean(main) && Number(getComputedStyle(main).opacity) > 0,
            navigationPresent:
              document.querySelectorAll('.nav-links a[href]').length === 5
          };
        })()`
      );
      await sleep(150);
      await captureScreenshot(
        client,
        `phase7-text-200-${routeScreenshotNames[route]}-390x844.png`
      );
    }

    await setViewport(client, 720, 500, false);
    for (const route of routes) {
      await navigate(client, `${baseUrl}/${route}`);
      interactionAudit.zoom200ByRoute[route] = await evaluate(
        client,
        `(() => {
          const main = document.querySelector('main');
          return {
            overflow:
              document.documentElement.scrollWidth >
              document.documentElement.clientWidth,
            mainVisible:
              Boolean(main) && Number(getComputedStyle(main).opacity) > 0
          };
        })()`
      );
    }
    await navigate(client, `${baseUrl}/contact.html`);
    await sleep(800);
    await captureScreenshot(client, "phase7-zoom-200-contact.png");

    await setViewport(client, 844, 390, true);
    for (const route of routes) {
      await navigate(client, `${baseUrl}/${route}`);
      interactionAudit.landscapeByRoute[route] = await evaluate(
        client,
        `(() => {
          const main = document.querySelector('main');
          return {
            overflow:
              document.documentElement.scrollWidth >
              document.documentElement.clientWidth,
            mainVisible:
              Boolean(main) && Number(getComputedStyle(main).opacity) > 0,
            navigationPresent:
              document.querySelectorAll('.nav-links a[href]').length === 5
          };
        })()`
      );
      await captureScreenshot(
        client,
        `phase8-landscape-${routeScreenshotNames[route]}-844x390.png`
      );
    }

    await client.send("Network.setBlockedURLs", {
      urls: [
        "*://fonts.googleapis.com/*",
        "*://fonts.gstatic.com/*",
        "*://cdnjs.cloudflare.com/*"
      ]
    });
    await setViewport(client, 1440, 1000, false);
    await navigate(client, `${baseUrl}/index.html`);
    interactionAudit.externalFontFailure = await evaluate(
      client,
      `(() => ({
        contentVisible:
          Number(getComputedStyle(document.querySelector('main')).opacity) > 0,
        externalRequests: performance.getEntriesByType('resource')
          .map((entry) => entry.name)
          .filter((name) => /fonts\.(?:googleapis|gstatic)\.com|cdnjs\.cloudflare\.com/i.test(name)),
        fontFamily: getComputedStyle(document.body).fontFamily
      }))()`
    );
    await sleep(900);
    await captureScreenshot(client, "phase7-external-fonts-blocked-home.png");
    await client.send("Network.setBlockedURLs", { urls: [] });

    await client.send("Network.setBlockedURLs", {
      urls: [
        "*://drive.google.com/*",
        "*://github.com/*",
        "*://www.linkedin.com/*",
        "*://*.streamlit.app/*"
      ]
    });
    await navigate(client, `${baseUrl}/index.html`);
    const homeActionsAvailable = await evaluate(
      client,
      `['drive.google.com', 'github.com', 'linkedin.com'].every((host) =>
        Boolean(document.querySelector('a[href*="' + host + '"]'))
      ) && Boolean(document.querySelector('a[href^="mailto:"]'))`
    );
    await navigate(
      client,
      `${baseUrl}/case-studies/transaction-monitoring/`
    );
    interactionAudit.externalEvidenceFailure = await evaluate(
      client,
      `(() => ({
        contentVisible:
          Number(getComputedStyle(document.querySelector('main')).opacity) > 0,
        homeActionsAvailable: ${homeActionsAvailable},
        caseActionsAvailable:
          Boolean(document.querySelector('a[href*="github.com"]')) &&
          Boolean(document.querySelector('a[href*="streamlit.app"]')),
        externalRequests: performance.getEntriesByType('resource')
          .map((entry) => entry.name)
          .filter((name) => new URL(name).origin !== location.origin)
      }))()`
    );
    await captureScreenshot(
      client,
      "phase8-external-evidence-unavailable-case.png"
    );
    await client.send("Network.setBlockedURLs", { urls: [] });

    await client.send("Network.setCacheDisabled", { cacheDisabled: true });
    await client.send("Network.setBlockedURLs", { urls: ["*about_me*"] });
    await navigate(client, `${baseUrl}/about.html`);
    interactionAudit.imageFailure = await evaluate(
      client,
      `(() => {
        const image = document.querySelector('img[alt="Dave Bryson portrait"]');
        const main = document.querySelector('main');
        return {
          altAvailable: Boolean(image?.alt),
          imageFailed: Boolean(image?.complete && image.naturalWidth === 0),
          overflow:
            document.documentElement.scrollWidth >
            document.documentElement.clientWidth,
          mainVisible:
            Boolean(main) && Number(getComputedStyle(main).opacity) > 0
        };
      })()`
    );
    await sleep(800);
    await captureScreenshot(client, "phase7-image-failure-about.png");
    await client.send("Network.setBlockedURLs", { urls: [] });
    await client.send("Network.setCacheDisabled", { cacheDisabled: false });

    await setViewport(client, 390, 844, true);
    await navigate(client, `${baseUrl}/index.html`);
    const menuTest = await evaluate(
      client,
      `(async () => {
        const toggle = document.querySelector('.nav-toggle');
        const firstLink = document.querySelector('.nav-panel a');
        firstLink.focus();
        const closedLinkBlocked = document.activeElement !== firstLink;
        toggle.click();
        const opened =
          toggle.getAttribute('aria-expanded') === 'true' &&
          document.body.classList.contains('nav-open');
        const focusedFirstLink = document.activeElement === firstLink;
        document.dispatchEvent(
          new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })
        );
        return {
          closedLinkBlocked,
          opened,
          focusedFirstLink,
          closed:
            toggle.getAttribute('aria-expanded') === 'false' &&
            !document.body.classList.contains('nav-open'),
          focusReturned: document.activeElement === toggle
        };
      })()`
    );
    await evaluate(
      client,
      `document.querySelector('.nav-toggle')?.click(); true`
    );
    await captureScreenshot(client, "phase6-mobile-menu-open-390x844.png");
    await evaluate(
      client,
      `document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); true`
    );
    await evaluate(client, "document.activeElement?.blur(); true");
    await sleep(1200);
    await captureScreenshot(client, "home-mobile-390.png");

    await navigate(client, `${baseUrl}/about.html`);
    await evaluate(client, "scrollTo(0, 0); true");
    await client.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [{ x: 195, y: 120, radiusX: 1, radiusY: 1 }]
    });
    await client.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [{ x: 195, y: 320, radiusX: 1, radiusY: 1 }]
    });
    await client.send("Input.dispatchTouchEvent", {
      type: "touchEnd",
      touchPoints: []
    });
    await sleep(250);
    const touchTopStayed = await evaluate(
      client,
      'location.pathname.endsWith("/about.html")'
    );

    await navigate(client, `${baseUrl}/contact.html`);
    await evaluate(
      client,
      "scrollTo(0, document.documentElement.scrollHeight); true"
    );
    await client.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [{ x: 195, y: 720, radiusX: 1, radiusY: 1 }]
    });
    await client.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [{ x: 195, y: 140, radiusX: 1, radiusY: 1 }]
    });
    await client.send("Input.dispatchTouchEvent", {
      type: "touchEnd",
      touchPoints: []
    });
    await sleep(250);
    const touchBottomStayed = await evaluate(
      client,
      'location.pathname.endsWith("/contact.html")'
    );

    await client.send("Emulation.setEmulatedMedia", {
      features: [{ name: "prefers-reduced-motion", value: "reduce" }]
    });
    await navigate(client, `${baseUrl}/index.html`);
    const reducedMotion = await evaluate(
      client,
      `(() => {
        const reveal = document.querySelector('.reveal, [data-hero-line]');
        return {
          mediaMatches: matchMedia('(prefers-reduced-motion: reduce)').matches,
          opacity: getComputedStyle(reveal).opacity,
          transform: getComputedStyle(reveal).transform,
          transitionDuration: getComputedStyle(reveal).transitionDuration
        };
      })()`
    );

    homepage.reducedMotion = await evaluate(
      client,
      `(() => ({
        introBypassed:
          document.querySelector('[data-home-intro]')?.hidden === true &&
          window.__HOME_MOTION_DIAGNOSTICS__?.intro?.skippedReason ===
            'reduced-motion',
        coreVisible:
          document.querySelector('[data-risk-core] svg')
            ?.getBoundingClientRect().width > 0,
        motionTier: document.body.dataset.motion || null
      }))()`
    );

    await client.send("Emulation.setEmulatedMedia", {
      features: [{ name: "prefers-reduced-motion", value: "no-preference" }]
    });

    await setViewport(client, 390, 844, true);
    await client.send("Emulation.setScriptExecutionDisabled", {
      value: true
    });
    await client.send("Page.navigate", { url: `${baseUrl}/index.html` });
    await sleep(1000);
    await captureScreenshot(client, "home-no-javascript-390.png");
    await client.send("Emulation.setScriptExecutionDisabled", {
      value: false
    });
    homepage.noJavaScript = await evaluate(
      client,
      `(() => {
        const primary = document.querySelector('.home-hero__actions .btn.primary');
        const navigation = document.querySelector('.nav-panel');
        const core = document.querySelector('[data-risk-core] svg');
        const title = document.querySelector('#home-title');
        return {
          contentVisible:
            !document.documentElement.classList.contains('js') &&
            title &&
            getComputedStyle(title).display !== 'none' &&
            getComputedStyle(title).visibility === 'visible' &&
            primary &&
            getComputedStyle(primary).display !== 'none',
          navigationVisible:
            navigation &&
            getComputedStyle(navigation).display !== 'none' &&
            getComputedStyle(navigation).visibility === 'visible',
          staticCoreVisible:
            core &&
            core.getBoundingClientRect().width > 0 &&
            getComputedStyle(core).visibility === 'visible',
          introHidden: document.querySelector('[data-home-intro]')?.hidden === true
        };
      })()`
    );

    await setViewport(client, 1440, 1000);
    await navigate(client, `${baseUrl}/index.html`);
    await sleep(1500);
    await captureScreenshot(client, "home-hero-final-desktop.png");

    homepage.primaryCta = await evaluate(
      client,
      `(() => {
        const link = document.querySelector('.home-hero__actions .btn.primary');
        return {
          text: link?.textContent.trim() || '',
          target: link?.href || ''
        };
      })()`
    );
    homepage.prototypeNavigationLinks = await evaluate(
      client,
      `[...document.querySelectorAll('.site-header a')]
        .map((link) => link.getAttribute('href'))
        .filter((href) => href?.includes('prototypes'))`
    );
    homepage.resources.initialRequests = await evaluate(
      client,
      `performance.getEntriesByType('resource').map((entry) => ({
        name: entry.name,
        initiatorType: entry.initiatorType,
        transferSize: entry.transferSize,
        encodedBodySize: entry.encodedBodySize
      }))`
    );
    homepage.resources.threeRequests =
      homepage.resources.initialRequests.filter((entry) =>
        /three(?:-core|\\.module|\\.js)?/i.test(entry.name)
      );
    homepage.motion = await evaluate(
      client,
      `(() => {
        const diagnostics = window.__HOME_MOTION_DIAGNOSTICS__;
        return {
          setup:
            diagnostics?.initialized === true &&
            diagnostics?.scrollTriggersCreated > 0,
          riskCoreSetup:
            diagnostics?.riskCore?.timelineCreated === true &&
            diagnostics?.riskCore?.scrollTriggerCreated === true,
          cleanup: false,
          hiddenImportantContent: []
        };
      })()`
    );

    const sectionScreenshots = [
      ["[data-risk-core]", "home-risk-core-desktop.png", 1400],
      [".decision-story__rows", "home-decision-story-desktop.png", 500],
      ["#selected-work", "home-selected-work-desktop.png", 500],
      [".working-method", "home-working-method-desktop.png", 500],
      [".home-close", "home-closing-cta-desktop.png", 500]
    ];

    await evaluate(
      client,
      "document.documentElement.style.scrollBehavior = 'auto'; true"
    );

    for (const [selector, fileName, delay] of sectionScreenshots) {
      await evaluate(
        client,
        `(() => {
          const target = document.querySelector(${JSON.stringify(selector)});
          const header = document.querySelector('.site-header');
          if (target) {
            scrollTo(
              0,
              target.getBoundingClientRect().top +
                scrollY -
                (header?.offsetHeight || 0) -
                24
            );
          }
          return Boolean(target);
        })()`
      );
      await sleep(delay);
      await captureScreenshot(client, fileName);
    }

    await setViewport(client, 390, 844, true);
    await navigate(client, `${baseUrl}/index.html`);
    await sleep(1200);
    await evaluate(
      client,
      "document.documentElement.style.scrollBehavior = 'auto'; true"
    );
    const mobileSectionScreenshots = [
      ["[data-risk-core]", "home-risk-core-mobile-390.png"],
      ["#selected-work", "home-selected-work-mobile-390.png"],
      [".home-close", "home-closing-cta-mobile-390.png"]
    ];

    for (const [selector, fileName] of mobileSectionScreenshots) {
      await evaluate(
        client,
        `(() => {
          const target = document.querySelector(${JSON.stringify(selector)});
          const header = document.querySelector('.site-header');
          if (target) {
            scrollTo(
              0,
              target.getBoundingClientRect().top +
                scrollY -
                (header?.offsetHeight || 0) -
                16
            );
          }
          return Boolean(target);
        })()`
      );
      await sleep(700);
      await captureScreenshot(client, fileName);
    }

    await setViewport(client, 1440, 1000);
    await navigate(client, `${baseUrl}/index.html`);
    await sleep(1200);
    await evaluate(client, "scrollTo(0, document.documentElement.scrollHeight); true");
    await client.send("Input.dispatchMouseEvent", {
      type: "mouseWheel",
      x: 700,
      y: 800,
      deltaX: 0,
      deltaY: 360
    });
    await sleep(650);
    homepage.edgeGestureStayedOnPage = await evaluate(
      client,
      `location.pathname.endsWith('/index.html')`
    );

    const cleanupResult = await evaluate(
      client,
      `(async () => {
        window.__HOME_MOTION_CLEANUP__?.();
        await new Promise((resolve) => setTimeout(resolve, 80));
        const important = [
          ...document.querySelectorAll(
            '[data-hero-line], .home-hero__lede, .decision-step, .work-row__body, .method-route li, .home-close__layout'
          )
        ];
        return {
          cleanup:
            window.__HOME_MOTION_DIAGNOSTICS__?.cleanupComplete === true,
          hiddenImportantContent: important
            .filter((element) => {
              const style = getComputedStyle(element);
              return (
                style.display === 'none' ||
                style.visibility === 'hidden' ||
                Number(style.opacity) === 0
              );
            })
            .map((element) => element.className || element.tagName)
        };
      })()`
    );
    homepage.motion.cleanup = cleanupResult.cleanup;
    homepage.motion.hiddenImportantContent =
      cleanupResult.hiddenImportantContent;

    await client.send("Network.setCacheDisabled", { cacheDisabled: true });
    await client.send("Network.emulateNetworkConditions", {
      offline: false,
      latency: 150,
      downloadThroughput: 204800,
      uploadThroughput: 102400,
      connectionType: "cellular3g"
    });
    await setViewport(client, 390, 844, true);
    await navigate(client, `${baseUrl}/index.html`);
    await sleep(1200);
    homepage.slowConnection = await evaluate(
      client,
      `(() => {
        const title = document.querySelector('#home-title');
        const navigation = performance.getEntriesByType('navigation')[0];
        return {
          heroVisible:
            title &&
            getComputedStyle(title).visibility === 'visible' &&
            Number(getComputedStyle(title).opacity) > 0,
          navigationDuration: Math.round(navigation?.duration || 0)
        };
      })()`
    );
    await captureScreenshot(client, "home-slow-connection-390.png");
    await client.send("Network.emulateNetworkConditions", {
      offline: false,
      latency: 0,
      downloadThroughput: -1,
      uploadThroughput: -1,
      connectionType: "none"
    });
    await client.send("Network.setCacheDisabled", { cacheDisabled: false });

    await setViewport(client, 1440, 1000);
    await navigate(
      client,
      `${baseUrl}/case-studies/transaction-monitoring/`
    );
    await sleep(350);
    const caseInspection = await evaluate(
      client,
      `(() => {
        const visible = (element) =>
          Boolean(
            element &&
            getComputedStyle(element).display !== 'none' &&
            getComputedStyle(element).visibility === 'visible' &&
            element.getBoundingClientRect().width > 0
          );
        return {
          statusVisible: visible(document.querySelector('[data-case-status]')),
          roleVisible:
            visible(document.querySelector('.case-facts')) &&
            document.querySelector('.case-facts')?.textContent.includes('My role'),
          limitationsVisible:
            visible(document.querySelector('#limitations')) &&
            document.querySelector('#limitations')?.textContent.includes(
              'What this prototype does not do'
            )
        };
      })()`
    );
    caseStudy.statusVisible = caseInspection.statusVisible;
    caseStudy.roleVisible = caseInspection.roleVisible;
    caseStudy.limitationsVisible = caseInspection.limitationsVisible;

    await evaluate(
      client,
      `document.querySelector('[data-section-navigation] a[href="#evidence"]')?.click(); true`
    );
    await sleep(1_800);
    caseStudy.sectionNavigation = await evaluate(
      client,
      `(() => ({
        hashUpdated: location.hash === '#evidence',
        currentTarget:
          document.querySelector('[data-section-navigation] [aria-current="location"]')?.hash === '#evidence',
        singleCurrent:
          document.querySelectorAll('[data-section-navigation] [aria-current="location"]').length === 1,
        observerActive: window.__CASE_NAV_DIAGNOSTICS__?.observing === true
      }))()`
    );
    await evaluate(
      client,
      `document.querySelector('.evidence-ledger a')?.focus({ preventScroll: true }); true`
    );
    await captureScreenshot(client, "phase6-case-evidence-link-focus.png");

    caseStudy.resources.initialRequests = await evaluate(
      client,
      `performance.getEntriesByType('resource').map((entry) => ({
        name: entry.name,
        initiatorType: entry.initiatorType,
        transferSize: entry.transferSize,
        encodedBodySize: entry.encodedBodySize
      }))`
    );
    caseStudy.resources.threeRequests =
      caseStudy.resources.initialRequests.filter((entry) =>
        /three(?:-core|\.module|\.js)?/i.test(entry.name)
      );
    caseStudy.resources.prototypeRequests =
      caseStudy.resources.initialRequests.filter((entry) =>
        /prototype/i.test(entry.name)
      );

    await evaluate(
      client,
      "document.querySelector('.breadcrumbs a')?.click(); true"
    );
    await sleep(600);
    caseStudy.breadcrumb.navigationWorked = await evaluate(
      client,
      `location.pathname.endsWith('/portfolio.html')`
    );
    await evaluate(client, "history.back(); true");
    await sleep(600);
    caseStudy.breadcrumb.backWorked = await evaluate(
      client,
      `location.pathname.endsWith('/case-studies/transaction-monitoring/')`
    );

    const caseSections = [
      [".case-hero", "case-hero-desktop.png"],
      ["#summary", "case-summary-desktop.png"],
      ["#problem", null],
      ["#architecture", "case-architecture-desktop.png"],
      ["#approach", null],
      ["#decisions", null],
      ["#risk", null],
      ["#implementation", null],
      ["#evidence", "case-evidence-desktop.png"],
      ["#limitations", "case-limitations-desktop.png"],
      ["#value", null],
      ["#next", null],
      [".case-close", "case-closing-navigation-desktop.png"]
    ];

    // Test captures should jump to their target. Leaving the site's smooth
    // scrolling enabled can photograph an intermediate section on long pages.
    await evaluate(
      client,
      "document.documentElement.style.scrollBehavior = 'auto'; true"
    );

    for (const [selector, fileName] of caseSections) {
      await evaluate(
        client,
        `(() => {
          const target = document.querySelector(${JSON.stringify(selector)});
          const header = document.querySelector('.site-header');
          if (target) {
            scrollTo(
              0,
              target.getBoundingClientRect().top +
                scrollY -
                (header?.offsetHeight || 0) -
                20
            );
          }
          return Boolean(target);
        })()`
      );
      // Allow the existing IntersectionObserver reveal transition to settle so
      // visual-review captures represent the final rendered section state.
      await sleep(900);
      if (fileName) await captureScreenshot(client, fileName);
    }

    caseStudy.hiddenImportantContent = await evaluate(
      client,
      `[...document.querySelectorAll('.case-section, .case-hero, .architecture-diagram, .case-close')]
        .filter((element) => {
          const style = getComputedStyle(element);
          return (
            style.display === 'none' ||
            style.visibility === 'hidden' ||
            Number(style.opacity) === 0
          );
        })
        .map((element) => element.id || element.className || element.tagName)`
    );

    await navigate(
      client,
      `${baseUrl}/case-studies/transaction-monitoring/`
    );
    await evaluate(client, "scrollTo(0, document.documentElement.scrollHeight); true");
    await client.send("Input.dispatchMouseEvent", {
      type: "mouseWheel",
      x: 700,
      y: 800,
      deltaX: 0,
      deltaY: 360
    });
    await sleep(650);
    caseStudy.edgeGestureStayedOnPage = await evaluate(
      client,
      `location.pathname.endsWith('/case-studies/transaction-monitoring/')`
    );

    await client.send("Emulation.setEmulatedMedia", {
      features: [{ name: "prefers-reduced-motion", value: "reduce" }]
    });
    await setViewport(client, 390, 844, true);
    await navigate(
      client,
      `${baseUrl}/case-studies/transaction-monitoring/`
    );
    caseStudy.reducedMotion = await evaluate(
      client,
      `(() => {
        const sections = [...document.querySelectorAll('.case-section')];
        const diagram = document.querySelector('.architecture-diagram svg');
        return {
          mediaMatches: matchMedia('(prefers-reduced-motion: reduce)').matches,
          contentVisible:
            sections.length > 0 &&
            sections.every((section) => {
              const style = getComputedStyle(section);
              return style.visibility === 'visible' && Number(style.opacity) > 0;
            }) &&
            diagram?.getBoundingClientRect().width > 0
        };
      })()`
    );
    await client.send("Emulation.setEmulatedMedia", {
      features: [{ name: "prefers-reduced-motion", value: "no-preference" }]
    });

    await client.send("Emulation.setScriptExecutionDisabled", {
      value: true
    });
    await client.send("Page.navigate", {
      url: `${baseUrl}/case-studies/transaction-monitoring/`
    });
    await sleep(900);
    await captureScreenshot(client, "case-no-javascript-mobile-390.png");
    await client.send("Emulation.setScriptExecutionDisabled", {
      value: false
    });
    caseStudy.noJavaScript = await evaluate(
      client,
      `(() => {
        const title = document.querySelector('#case-title');
        const limitations = document.querySelector('#limitations');
        const diagram = document.querySelector('.architecture-diagram svg');
        return {
          contentVisible:
            !document.documentElement.classList.contains('js') &&
            title &&
            limitations &&
            getComputedStyle(title).visibility === 'visible' &&
            getComputedStyle(limitations).visibility === 'visible',
          diagramVisible:
            diagram &&
            diagram.getBoundingClientRect().width > 0 &&
            getComputedStyle(diagram).visibility === 'visible'
        };
      })()`
    );

    await client.send("Page.navigate", {
      url: `${baseUrl}/case-studies/transaction-monitoring/`
    });
    await sleep(700);
    await evaluate(
      client,
      "document.documentElement.style.scrollBehavior = 'auto'; true"
    );
    const mobileCaseSections = [
      [".case-hero", "case-hero-mobile-390.png"],
      ["#architecture", "case-architecture-mobile-390.png"],
      ["#evidence", "case-evidence-mobile-390.png"],
      ["#limitations", "case-limitations-mobile-390.png"],
      [".case-close", "case-closing-navigation-mobile-390.png"]
    ];
    for (const [selector, fileName] of mobileCaseSections) {
      await evaluate(
        client,
        `(() => {
          const target = document.querySelector(${JSON.stringify(selector)});
          const header = document.querySelector('.site-header');
          if (target) {
            scrollTo(
              0,
              target.getBoundingClientRect().top +
                scrollY -
                (header?.offsetHeight || 0) -
                12
            );
          }
          return Boolean(target);
        })()`
      );
      await sleep(900);
      await captureScreenshot(client, fileName);
    }

    await client.send("Emulation.setEmulatedMedia", {
      features: [{ name: "prefers-reduced-motion", value: "no-preference" }]
    });
    await client.send("Emulation.setScriptExecutionDisabled", { value: false });
    await setViewport(client, 1440, 1000);

    await navigate(client, `${baseUrl}/`);
    const rootRoute = await inspectRoute(client);
    const directRootRoute =
      (await evaluate(client, "location.pathname")) === "/" &&
      rootRoute.current === "index.html" &&
      rootRoute.currentCount === 1;

    await navigate(client, `${baseUrl}/index.html`);
    const defaultLinkBehavior = await evaluate(
      client,
      `(() => {
        const probe = (selector, type = 'click', init = {}) => {
          const link = document.querySelector(selector);
          if (!link) return false;
          let preventedBeforeProbe = null;
          const stopDefault = (event) => {
            preventedBeforeProbe = event.defaultPrevented;
            event.preventDefault();
          };
          document.addEventListener(type, stopDefault, { once: true });
          link.dispatchEvent(
            new MouseEvent(type, {
              bubbles: true,
              cancelable: true,
              button: 0,
              ...init
            })
          );
          return preventedBeforeProbe === false;
        };
        return {
          controlClick: probe('.nav-links a[href="about.html"]', 'click', { ctrlKey: true }),
          commandClick: probe('.nav-links a[href="about.html"]', 'click', { metaKey: true }),
          shiftClick: probe('.nav-links a[href="about.html"]', 'click', { shiftKey: true }),
          altClick: probe('.nav-links a[href="about.html"]', 'click', { altKey: true }),
          middleClick: probe('.nav-links a[href="about.html"]', 'auxclick', { button: 1 }),
          externalLink: probe('.nav-actions a[href^="https://github.com"]'),
          mailtoLink: probe('a[href^="mailto:"]'),
          cvLink: probe('.nav-actions a[href*="drive.google.com"]'),
          targetBlankLink: probe('a[target="_blank"]'),
          hashLink: probe('a[href^="#"]'),
          contextMenu: probe('.nav-links a[href="about.html"]', 'contextmenu')
        };
      })()`
    );

    await navigate(client, `${baseUrl}/about.html`);
    const primaryLinkActivated = await clickSelector(
      client,
      '.nav-links a[href="services.html"]'
    );
    const primaryNavigation =
      primaryLinkActivated && (await waitForPath(client, "/services.html"));

    await navigate(client, `${baseUrl}/portfolio.html`);
    const caseLinkActivated = await clickSelector(
      client,
      '.featured-case__actions .btn.primary'
    );
    const caseStudyLink =
      caseLinkActivated &&
      (await waitForPath(client, "/case-studies/transaction-monitoring/"));
    const breadcrumbSemantics = await evaluate(
      client,
      `(() => {
        const nav = document.querySelector('nav.breadcrumbs[aria-label="Breadcrumb"]');
        const current = nav?.querySelector('li[aria-current="page"]');
        return Boolean(nav && current && !current.querySelector('a'));
      })()`
    );
    const breadcrumbActivated = await activateSelectorWithKeyboard(
      client,
      '.breadcrumbs a[href="/portfolio.html"]'
    );
    const breadcrumbNavigation =
      breadcrumbActivated && (await waitForPath(client, "/portfolio.html"));

    await navigate(
      client,
      `${baseUrl}/case-studies/transaction-monitoring/`
    );
    const backToPortfolioActivated = await clickSelector(
      client,
      '.case-close .btn.primary'
    );
    const backToPortfolio =
      backToPortfolioActivated &&
      (await waitForPath(client, "/portfolio.html"));

    await navigate(client, `${baseUrl}/about.html`);
    await clickSelector(client, '.nav-links a[href="services.html"]');
    await waitForPath(client, "/services.html");
    await evaluate(client, "history.back(); true");
    const browserBack = await waitForPath(client, "/about.html");
    await evaluate(client, "history.forward(); true");
    const browserForward = await waitForPath(client, "/services.html");
    const browserForwardState = await evaluate(
      client,
      `(() => ({
        contentVisible:
          getComputedStyle(document.querySelector('main')).visibility === 'visible' &&
          Number(getComputedStyle(document.querySelector('main')).opacity) > 0,
        pointerAvailable:
          getComputedStyle(document.documentElement).pointerEvents !== 'none' &&
          getComputedStyle(document.body).pointerEvents !== 'none'
      }))()`
    );

    await navigate(client, `${baseUrl}/portfolio.html`);
    await evaluate(client, "scrollTo(0, 900); true");
    await sleep(120);
    await clickSelector(client, '.nav-links a[href="about.html"]');
    await waitForPath(client, "/about.html");
    await evaluate(client, "history.back(); true");
    await waitForPath(client, "/portfolio.html");
    for (let attempt = 0; attempt < 20; attempt += 1) {
      if ((await evaluate(client, "scrollY")) > 650) break;
      await sleep(100);
    }
    const restorationState = await evaluate(
      client,
      `(() => ({
        scrollRestored: scrollY > 650,
        menuReset:
          !document.body.classList.contains('nav-open') &&
          document.querySelector('.nav-toggle')?.getAttribute('aria-expanded') === 'false',
        contentVisible:
          getComputedStyle(document.querySelector('main')).visibility === 'visible' &&
          Number(getComputedStyle(document.querySelector('main')).opacity) > 0,
        pointerAvailable:
          getComputedStyle(document.documentElement).pointerEvents !== 'none' &&
          getComputedStyle(document.body).pointerEvents !== 'none'
      }))()`
    );
    await captureScreenshot(client, "transition-browser-back-restored.png");

    await navigate(
      client,
      `${baseUrl}/case-studies/transaction-monitoring/`
    );
    await client.send("Page.reload");
    const deepLinkReload = await waitForPath(
      client,
      "/case-studies/transaction-monitoring/"
    );
    await sleep(300);
    const deepLinkContent = await evaluate(
      client,
      `Boolean(document.querySelector('#case-title'))`
    );
    await evaluate(client, `location.hash = '#%'; true`);
    await sleep(150);
    const invalidHashSafe = await evaluate(
      client,
      `Boolean(document.querySelector('#case-title')) &&
       document.querySelectorAll('[aria-current="location"]').length <= 1`
    );

    const recoveryLinks = {};
    for (const [name, selector, pathName] of [
      ["home", '.hero-actions a[href="/index.html"]', "/index.html"],
      ["portfolio", '.hero-actions a[href="/portfolio.html"]', "/portfolio.html"],
      ["contact", '.nav-links a[href="/contact.html"]', "/contact.html"]
    ]) {
      await navigate(client, `${baseUrl}/404.html`);
      const activated = await clickSelector(client, selector);
      recoveryLinks[name] =
        activated && (await waitForPath(client, pathName));
    }

    await client.send("Emulation.setScriptExecutionDisabled", { value: true });
    await client.send("Page.navigate", { url: `${baseUrl}/about.html` });
    await sleep(500);
    const noJavaScriptActivated = await clickSelector(
      client,
      '.nav-links a[href="services.html"]'
    );
    const noJavaScriptNavigation =
      noJavaScriptActivated && (await waitForPath(client, "/services.html"));
    await client.send("Emulation.setScriptExecutionDisabled", { value: false });

    await setViewport(client, 390, 844, true);
    await navigate(client, `${baseUrl}/about.html`);
    await clickSelector(client, ".nav-toggle");
    const mobileMenuOpened = await evaluate(
      client,
      `document.querySelector('.nav-toggle')?.getAttribute('aria-expanded') === 'true'`
    );
    const mobileMenuLinkActivated = await clickSelector(
      client,
      '.nav-links a[href="services.html"]'
    );
    const mobileMenuNavigation =
      mobileMenuLinkActivated && (await waitForPath(client, "/services.html"));
    const mobileMenuReset = await evaluate(
      client,
      `(() => ({
        closed: document.querySelector('.nav-toggle')?.getAttribute('aria-expanded') === 'false',
        bodyUnlocked: !document.body.classList.contains('nav-open')
      }))()`
    );
    await captureScreenshot(client, "transition-mobile-menu-navigation.png");

    await setViewport(client, 1440, 1000);
    await navigate(client, `${baseUrl}/about.html`);
    const nativeViewTransitionSupport = await evaluate(
      client,
      `CSS.supports('view-transition-name: circuit-page')`
    );

    const transitionCaptures = [];
    const captureNavigation = async ({
      source,
      selector,
      destination,
      name,
      prepare
    }) => {
      if (prepare) await evaluate(client, prepare);
      await navigate(client, `${baseUrl}${source}`);
      const activated = await clickSelector(client, selector);
      if (!activated) return false;
      const observed = await observeViewTransition(client);
      await captureScreenshot(client, `${name}-transition.png`);
      const arrived = await waitForPath(client, destination);
      await sleep(300);
      await captureScreenshot(client, `${name}-settled.png`);
      transitionCaptures.push(observed);
      return arrived;
    };

    const homeToPortfolio = await captureNavigation({
      source: "/index.html",
      selector: '.nav-links a[href="portfolio.html"]',
      destination: "/portfolio.html",
      name: "transition-home-to-portfolio",
      prepare:
        "sessionStorage.setItem('dave-bryson-risk-intro-seen', 'true'); true"
    });
    const portfolioToCase = await captureNavigation({
      source: "/portfolio.html",
      selector: ".featured-case__actions .btn.primary",
      destination: "/case-studies/transaction-monitoring/",
      name: "transition-portfolio-to-case"
    });
    const caseToPortfolio = await captureNavigation({
      source: "/case-studies/transaction-monitoring/",
      selector: ".case-close .btn.primary",
      destination: "/portfolio.html",
      name: "transition-case-to-portfolio"
    });
    const aboutToServices = await captureNavigation({
      source: "/about.html",
      selector: '.nav-links a[href="services.html"]',
      destination: "/services.html",
      name: "transition-about-to-services"
    });
    const servicesToContact = await captureNavigation({
      source: "/services.html",
      selector: '.nav-links a[href="contact.html"]',
      destination: "/contact.html",
      name: "transition-services-to-contact"
    });

    await navigate(client, `${baseUrl}/about.html`);
    await evaluate(
      client,
      `(() => {
        const style = document.createElement('style');
        style.textContent = '@view-transition { navigation: none; }';
        document.head.append(style);
        return true;
      })()`
    );
    const fallbackActivated = await clickSelector(
      client,
      '.nav-links a[href="services.html"]'
    );
    const transitionDisabledFallback =
      fallbackActivated && (await waitForPath(client, "/services.html"));

    await navigate(client, `${baseUrl}/about.html`);
    const rapidActivation = await rapidlyActivateSelector(
      client,
      '.nav-links a[href="services.html"]'
    );
    const rapidNavigation =
      rapidActivation && (await waitForPath(client, "/services.html"));
    await sleep(350);
    const rapidNavigationSettled = await evaluate(
      client,
      `location.pathname === '/services.html' &&
       document.querySelectorAll('[data-page-transition]').length === 0 &&
       getComputedStyle(document.body).pointerEvents !== 'none'`
    );

    await client.send("Emulation.setEmulatedMedia", {
      features: [{ name: "prefers-reduced-motion", value: "reduce" }]
    });
    await navigate(client, `${baseUrl}/about.html`);
    const reducedStartedAt = Date.now();
    await clickSelector(client, '.nav-links a[href="services.html"]');
    const reducedArrived = await waitForPath(client, "/services.html");
    const reducedElapsed = Date.now() - reducedStartedAt;
    const reducedTransitionAnimations = await evaluate(
      client,
      `document.getAnimations().filter(
        (animation) => animation.effect?.pseudoElement?.startsWith('::view-transition')
      ).length`
    );
    await captureScreenshot(client, "transition-reduced-motion.png");
    await client.send("Emulation.setEmulatedMedia", {
      features: [{ name: "prefers-reduced-motion", value: "no-preference" }]
    });

    const transitionResidue = await evaluate(
      client,
      `(() => ({
        overlayCount: document.querySelectorAll('[data-page-transition]').length,
        contentVisible:
          getComputedStyle(document.querySelector('main')).visibility === 'visible' &&
          Number(getComputedStyle(document.querySelector('main')).opacity) > 0,
        pointerAvailable:
          getComputedStyle(document.documentElement).pointerEvents !== 'none' &&
          getComputedStyle(document.body).pointerEvents !== 'none'
      }))()`
    );

    const navigationBehavior = {
      directRootRoute,
      primaryNavigation,
      caseStudyLink,
      breadcrumbSemantics,
      breadcrumbNavigation,
      backToPortfolio,
      browserBack,
      browserForward,
      browserForwardContentVisible: browserForwardState.contentVisible,
      browserForwardPointerAvailable: browserForwardState.pointerAvailable,
      deepLinkReload: deepLinkReload && deepLinkContent,
      invalidHashSafe,
      scrollRestoration: restorationState.scrollRestored,
      bfcacheMenuReset: restorationState.menuReset,
      bfcacheContentVisible: restorationState.contentVisible,
      bfcachePointerAvailable: restorationState.pointerAvailable,
      controlClick: defaultLinkBehavior.controlClick,
      commandClick: defaultLinkBehavior.commandClick,
      shiftClick: defaultLinkBehavior.shiftClick,
      altClick: defaultLinkBehavior.altClick,
      middleClick: defaultLinkBehavior.middleClick,
      externalLink: defaultLinkBehavior.externalLink,
      mailtoLink: defaultLinkBehavior.mailtoLink,
      cvLink: defaultLinkBehavior.cvLink,
      targetBlankLink: defaultLinkBehavior.targetBlankLink,
      hashLink: defaultLinkBehavior.hashLink,
      contextMenu: defaultLinkBehavior.contextMenu,
      noJavaScriptNavigation,
      mobileMenuOpened,
      mobileMenuNavigation,
      mobileMenuClosed: mobileMenuReset.closed,
      mobileBodyUnlocked: mobileMenuReset.bodyUnlocked,
      recoveryHome: recoveryLinks.home,
      recoveryPortfolio: recoveryLinks.portfolio,
      recoveryContact: recoveryLinks.contact
    };

    const transitionBehavior = {
      nativeViewTransitionSupport,
      transitionObserved: transitionCaptures.some(Boolean),
      homeToPortfolio,
      portfolioToCase,
      caseToPortfolio,
      aboutToServices,
      servicesToContact,
      transitionDisabledFallback,
      rapidNavigation: rapidNavigation && rapidNavigationSettled,
      reducedMotionImmediate: reducedArrived && reducedElapsed < 1_000,
      reducedMotionHasNoViewAnimation: reducedTransitionAnimations === 0,
      noOverlayMarkup: transitionResidue.overlayCount === 0,
      contentVisible: transitionResidue.contentVisible,
      pointerAvailable: transitionResidue.pointerAvailable
    };

    const report = {
      results,
      skipLinkFocus,
      gestureNavigationTest: {
        wheelStayedOnEveryRoute: Object.values(wheelEdgeResults).every(Boolean),
        touchTopStayed,
        touchBottomStayed
      },
      menuTest,
      reducedMotion,
      homepage,
      caseStudy,
      interactionAudit,
      navigationBehavior,
      transitionBehavior,
      consoleErrors: [...new Set(consoleErrors)],
      environmentErrors: [...new Set(environmentErrors)],
      screenshots: screenshotDirectory
    };

    console.log(JSON.stringify(report, null, 2));
    assertResults(report);
  } finally {
    if (client) {
      await Promise.race([
        client.send("Browser.close").catch(() => {}),
        sleep(2_000)
      ]);
      client.socket.close();
    }

    if (browserProcess.exitCode === null) {
      browserProcess.kill();
    }
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
