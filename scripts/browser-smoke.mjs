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
  "contact.html"
];

const expectedCurrentPage = Object.fromEntries(
  routes.map((route) => [route, route])
);

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

  for (const viewport of ["desktop", "mobile"]) {
    for (const route of routes) {
      const result = report.results[viewport][route];

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
    }

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
    await sleep(500);
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
        const reveal = document.querySelector('.reveal');
        return {
          mediaMatches: matchMedia('(prefers-reduced-motion: reduce)').matches,
          opacity: getComputedStyle(reveal).opacity,
          transform: getComputedStyle(reveal).transform,
          transitionDuration: getComputedStyle(reveal).transitionDuration
        };
      })()`
    );

    const report = {
      results,
      skipLinkFocus,
      pageFlowTest: {
        wheelPreviousPage,
        touchPreviousPage
      },
      menuTest,
      reducedMotion,
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
