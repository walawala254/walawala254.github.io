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
  "case-studies/transaction-monitoring/"
];

const expectedCurrentPage = {
  "index.html": "index.html",
  "about.html": "about.html",
  "services.html": "services.html",
  "portfolio.html": "portfolio.html",
  "contact.html": "contact.html",
  "case-studies/transaction-monitoring/": "/portfolio.html"
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
        document.querySelector('[aria-current="page"]')?.getAttribute('href') ||
        null,
      brokenEagerImages: [...document.images]
        .filter(
          (image) =>
            image.loading !== 'lazy' &&
            (!image.complete || image.naturalWidth === 0)
        )
        .map((image) => image.getAttribute('src'))
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
      if (result.brokenEagerImages.length) {
        failures.push(`${viewport} ${route} has broken eager images`);
      }
    }
  }

  if (!report.skipLinkFocus) failures.push("Skip link is not first in tab order");
  for (const [check, passed] of Object.entries(report.pageFlowTest)) {
    if (!passed) failures.push(`Page-flow check failed: ${check}`);
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
  if (!report.homepage.pageFlowDisabled) {
    failures.push("Homepage edge-scroll page flow remains active");
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
  if (!report.caseStudy.pageFlowDisabled) {
    failures.push("Case study unexpectedly participates in edge-scroll page flow");
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
      consoleErrors.push(`exception: ${event.exceptionDetails.text}`);
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
      pageFlowDisabled: false,
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
      hiddenImportantContent: [],
      pageFlowDisabled: false
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

    await navigate(client, `${baseUrl}/about.html`);
    await client.send("Input.dispatchMouseEvent", {
      type: "mouseWheel",
      x: 500,
      y: 400,
      deltaX: 0,
      deltaY: -300
    });
    await sleep(500);
    const wheelPreviousPage = await evaluate(
      client,
      'location.pathname.endsWith("/index.html")'
    );

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
    await evaluate(client, "document.activeElement?.blur(); true");
    await sleep(1200);
    await captureScreenshot(client, "home-mobile-390.png");

    await navigate(client, `${baseUrl}/about.html`);
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
    await sleep(500);
    const touchPreviousPage = await evaluate(
      client,
      'location.pathname.endsWith("/index.html")'
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
    homepage.pageFlowDisabled = await evaluate(
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
    caseStudy.pageFlowDisabled = await evaluate(
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

    const report = {
      results,
      skipLinkFocus,
      pageFlowTest: {
        wheelPreviousPage,
        touchPreviousPage
      },
      menuTest,
      reducedMotion,
      homepage,
      caseStudy,
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
