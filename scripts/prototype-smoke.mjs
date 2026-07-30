import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import path from "node:path";

const baseUrl = (process.argv[2] || "http://127.0.0.1:4173").replace(/\/$/, "");
const screenshotDirectory =
  process.env.PROTOTYPE_SCREENSHOT_DIR ||
  path.join(tmpdir(), "risk-intelligence-prototypes");
let debuggingPort;

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
  { file: "prototypes/index.html", current: "index.html", hasStage: false },
  { file: "prototypes/svg-css.html", current: "svg-css.html", renderer: "svg" },
  {
    file: "prototypes/canvas-2d.html",
    current: "canvas-2d.html",
    renderer: "canvas"
  },
  {
    file: "prototypes/three-js.html",
    current: "three-js.html",
    renderer: "three"
  }
];

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
      // Continue to the next browser candidate.
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
    throw new Error(
      response.exceptionDetails.exception?.description ||
        response.exceptionDetails.text
    );
  }

  return response.result.value;
}

async function navigate(client, url) {
  await client.send("Page.navigate", { url });

  for (let attempt = 0; attempt < 50; attempt += 1) {
    await sleep(100);

    try {
      if ((await evaluate(client, "document.readyState")) === "complete") break;
    } catch {
      // Navigation is replacing the current JavaScript context.
    }
  }

  await sleep(300);
}

async function waitForExpression(client, expression, timeout = 8_000) {
  const started = Date.now();

  while (Date.now() - started < timeout) {
    if (await evaluate(client, expression)) return true;
    await sleep(100);
  }

  return false;
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

async function inspectRoute(client, route) {
  return evaluate(
    client,
    `(() => {
      const stage = document.querySelector('[data-prototype]');
      return {
        overflow:
          document.documentElement.scrollWidth >
          document.documentElement.clientWidth,
        width: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
        robots: document.querySelector('meta[name="robots"]')?.content || null,
        current:
          document.querySelector('[aria-current="page"]')?.getAttribute('href') ||
          null,
        narrativeStages: document.querySelectorAll('.prototype-narrative > li').length,
        hasAccessibleVisual:
          !stage ||
          Boolean(
            stage.querySelector('svg[role="img"] title') &&
              stage.querySelector('svg[role="img"] desc')
          ),
        replayIsKeyboardReachable:
          !stage ||
          stage.querySelector('[data-replay]')?.tabIndex === 0,
        renderState: stage?.dataset.renderState || null,
        lifecycle: stage?.dataset.lifecycle || null,
        renderer: ${JSON.stringify(route.renderer || null)}
      };
    })()`
  );
}

function assertReport(report) {
  const failures = [];

  for (const [viewport, results] of Object.entries(report.routes)) {
    for (const route of routes) {
      const result = results[route.file];
      if (result.overflow) failures.push(`${viewport} ${route.file} overflows`);
      if (result.robots !== "noindex, nofollow") {
        failures.push(`${viewport} ${route.file} is not noindex`);
      }
      if (result.current !== route.current) {
        failures.push(`${viewport} ${route.file} has incorrect aria-current`);
      }
      if (route.hasStage !== false && result.narrativeStages !== 4) {
        failures.push(`${viewport} ${route.file} lacks four narrative stages`);
      }
      if (!result.hasAccessibleVisual) {
        failures.push(`${viewport} ${route.file} lacks an SVG title/description`);
      }
      if (!result.replayIsKeyboardReachable) {
        failures.push(`${viewport} ${route.file} replay is not keyboard reachable`);
      }
    }
  }

  if (!report.svg.timelineCreated || !report.svg.scrollTriggerCreated) {
    failures.push("SVG prototype did not create its GSAP timeline and ScrollTrigger");
  }
  if (report.svg.sequence !== "complete") {
    failures.push("SVG sequence did not complete");
  }
  if (!report.svg.cleanupVerified) {
    failures.push("SVG GSAP cleanup did not complete");
  }
  if (
    !report.canvas.timelineCreated ||
    !report.canvas.scrollTriggerCreated ||
    report.canvas.drawCalls < 2 ||
    report.canvas.pixelRatio > 1.5
  ) {
    failures.push("Canvas choreography, draws, or DPR cap failed");
  }
  if (!report.canvas.cleanupVerified) {
    failures.push("Canvas cleanup did not complete");
  }
  if (report.three.beforeVisibility.dynamicImportRequested) {
    failures.push("Three.js loaded before its prototype became visible");
  }
  if (!report.three.afterVisibility.dynamicChunkLoaded) {
    failures.push("Three.js dynamic chunk did not load in view");
  }
  if (
    report.three.afterVisibility.frames < 20 ||
    report.three.afterVisibility.averageFps < 20
  ) {
    failures.push("Three.js frame stability fell below the smoke threshold");
  }
  if (!report.three.hiddenPause || !report.three.offscreenPause) {
    failures.push("Three.js did not pause when hidden or offscreen");
  }
  if (!report.three.contextFallback) {
    failures.push("Three.js context-loss fallback did not activate");
  }
  if (!report.three.cleanupComplete) {
    failures.push("Three.js cleanup did not complete");
  }
  if (
    !report.three.mobileLowPower.lowPower ||
    report.three.mobileLowPower.dprCap !== 1 ||
    report.three.mobileLowPower.averageFps < 20
  ) {
    failures.push("Three.js low-power mode or throttled frame stability failed");
  }
  if (
    !report.reducedMotion.svg ||
    !report.reducedMotion.canvas ||
    !report.reducedMotion.threeFallback ||
    report.reducedMotion.threeDynamicImport
  ) {
    failures.push("Reduced-motion bypass failed");
  }
  if (report.consoleErrors.length) failures.push("Browser console has errors");

  if (failures.length) {
    throw new Error(`Prototype smoke test failed:\n- ${failures.join("\n- ")}`);
  }
}

async function main() {
  if (typeof WebSocket === "undefined") {
    throw new Error("This smoke test requires Node.js WebSocket support.");
  }

  await mkdir(screenshotDirectory, { recursive: true });
  debuggingPort = await findAvailablePort();
  const browserPath = await findBrowser();
  const profileDirectory = path.join(
    tmpdir(),
    `risk-core-prototype-edge-${process.pid}`
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
      `${baseUrl}/prototypes/index.html`
    ],
    { stdio: "ignore", windowsHide: true }
  );

  let client;

  try {
    const target = await waitForTarget();
    client = new CdpClient(target);
    await client.connect();

    const consoleErrors = [];
    client.on("Runtime.exceptionThrown", (event) => {
      consoleErrors.push(
        `exception: ${
          event.exceptionDetails.exception?.description ||
          event.exceptionDetails.text
        }`
      );
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

    await client.send("Page.enable");
    await client.send("Runtime.enable");

    const routeResults = {};
    const viewports = [
      { name: "desktop1440", width: 1440, height: 1000, mobile: false },
      { name: "mobile390", width: 390, height: 844, mobile: true },
      { name: "narrow320", width: 320, height: 800, mobile: true }
    ];

    for (const viewport of viewports) {
      routeResults[viewport.name] = {};
      await setViewport(
        client,
        viewport.width,
        viewport.height,
        viewport.mobile
      );

      for (const route of routes) {
        await navigate(client, `${baseUrl}/${route.file}`);
        routeResults[viewport.name][route.file] = await inspectRoute(
          client,
          route
        );
      }
    }

    await setViewport(client, 1440, 1000);
    await navigate(client, `${baseUrl}/prototypes/svg-css.html`);
    await evaluate(
      client,
      "document.querySelector('.prototype-visual-frame').scrollIntoView({block: 'center'}); true"
    );
    await waitForExpression(
      client,
      "document.querySelector('[data-prototype]')?.dataset.sequence === 'complete'",
      6_000
    );
    await captureScreenshot(client, "svg-desktop.png");
    const svg = await evaluate(
      client,
      `(() => ({
        ...document.querySelector('[data-prototype]').prototypeDiagnostics,
        sequence: document.querySelector('[data-prototype]').dataset.sequence
      }))()`
    );
    svg.cleanupVerified = await evaluate(
      client,
      `(() => {
        const root = document.querySelector('[data-prototype]');
        window.__RISK_CORE_CLEANUP__();
        return (
          root.prototypeDiagnostics.cleanupComplete === true &&
          root.dataset.lifecycle === 'disposed'
        );
      })()`
    );

    await navigate(client, `${baseUrl}/prototypes/canvas-2d.html`);
    await evaluate(
      client,
      "document.querySelector('.prototype-visual-frame').scrollIntoView({block: 'center'}); true"
    );
    await waitForExpression(
      client,
      "document.querySelector('[data-prototype]')?.dataset.sequence === 'complete'",
      6_000
    );
    await captureScreenshot(client, "canvas-desktop.png");
    const canvas = await evaluate(
      client,
      `(() => ({
        ...document.querySelector('[data-prototype]').prototypeDiagnostics,
        sequence: document.querySelector('[data-prototype]').dataset.sequence
      }))()`
    );
    canvas.cleanupVerified = await evaluate(
      client,
      `(() => {
        const root = document.querySelector('[data-prototype]');
        window.__RISK_CORE_CLEANUP__();
        return (
          root.prototypeDiagnostics.cleanupComplete === true &&
          root.dataset.lifecycle === 'disposed'
        );
      })()`
    );

    await setViewport(client, 1440, 300);
    await navigate(client, `${baseUrl}/prototypes/three-js.html`);
    await evaluate(client, "scrollTo(0, 0); true");
    await sleep(800);
    const beforeVisibility = await evaluate(
      client,
      `(() => ({
        ...document.querySelector('[data-prototype]').prototypeDiagnostics,
        resources: performance.getEntriesByType('resource').map((entry) => entry.name)
      }))()`
    );

    await setViewport(client, 1440, 1000);
    await evaluate(
      client,
      "document.querySelector('.prototype-visual-frame').scrollIntoView({block: 'center'}); true"
    );
    const threeReady = await waitForExpression(
      client,
      "document.querySelector('[data-prototype]')?.dataset.renderState === 'ready'",
      10_000
    );
    if (!threeReady) throw new Error("Three.js prototype did not become ready.");
    await waitForExpression(
      client,
      "document.querySelector('[data-prototype]')?.dataset.sequence === 'complete'",
      6_000
    );
    await sleep(500);
    await captureScreenshot(client, "three-desktop.png");
    const afterVisibility = await evaluate(
      client,
      `(() => ({
        ...document.querySelector('[data-prototype]').prototypeDiagnostics,
        resources: performance
          .getEntriesByType('resource')
          .filter((entry) => /three-core|motion-controller/.test(entry.name))
          .map((entry) => ({
            name: entry.name.split('/').pop(),
            transferSize: entry.transferSize,
            encodedBodySize: entry.encodedBodySize,
            duration: Math.round(entry.duration * 10) / 10
          })),
        fallbackHidden: document
          .querySelector('[data-static-fallback]')
          .hasAttribute('hidden'),
        fallbackDisplay: getComputedStyle(
          document.querySelector('[data-static-fallback]')
        ).display,
        canvasDisplay: getComputedStyle(
          document.querySelector('.three-canvas')
        ).display,
        canvasSize: {
          width: document.querySelector('.three-canvas').width,
          height: document.querySelector('.three-canvas').height
        }
      }))()`
    );

    const hiddenPause = await evaluate(
      client,
      `(async () => {
        const root = document.querySelector('[data-prototype]');
        Object.defineProperty(document, 'hidden', {
          configurable: true,
          value: true
        });
        document.dispatchEvent(new Event('visibilitychange'));
        const frames = root.prototypeDiagnostics.frames;
        await new Promise((resolve) => setTimeout(resolve, 350));
        const passed =
          root.prototypeDiagnostics.active === false &&
          root.prototypeDiagnostics.frames === frames &&
          root.prototypeDiagnostics.timelinePaused === true;
        delete document.hidden;
        document.dispatchEvent(new Event('visibilitychange'));
        return passed;
      })()`
    );

    await setViewport(client, 1440, 300);
    await evaluate(client, "scrollTo(0, 0); true");
    await sleep(500);
    const offscreenPause = await evaluate(
      client,
      `(() => {
        const diagnostics =
          document.querySelector('[data-prototype]').prototypeDiagnostics;
        return (
          diagnostics.active === false &&
          diagnostics.timelinePaused === true
        );
      })()`
    );

    await setViewport(client, 1440, 1000);
    await evaluate(
      client,
      "document.querySelector('.prototype-visual-frame').scrollIntoView({block: 'center'}); true"
    );
    await sleep(300);
    const contextFallback = await evaluate(
      client,
      `(() => {
        const canvas = document.querySelector('.three-canvas');
        canvas.dispatchEvent(
          new Event('webglcontextlost', { bubbles: false, cancelable: true })
        );
        return (
          document.querySelector('[data-prototype]').dataset.renderState ===
            'fallback' &&
          !document
            .querySelector('[data-static-fallback]')
            .hasAttribute('hidden')
        );
      })()`
    );
    const cleanupComplete = await evaluate(
      client,
      `(() => {
        const root = document.querySelector('[data-prototype]');
        window.__RISK_CORE_CLEANUP__();
        return (
          root.prototypeDiagnostics.cleanupComplete === true &&
          !document.querySelector('.three-canvas') &&
          root.dataset.lifecycle === 'disposed'
        );
      })()`
    );

    await client.send("Emulation.setCPUThrottlingRate", { rate: 4 });
    await setViewport(client, 390, 844, true);
    await navigate(client, `${baseUrl}/prototypes/three-js.html`);
    await evaluate(
      client,
      "document.querySelector('.prototype-visual-frame').scrollIntoView({block: 'center'}); true"
    );
    const mobileThreeReady = await waitForExpression(
      client,
      "document.querySelector('[data-prototype]')?.dataset.renderState === 'ready'",
      12_000
    );
    if (!mobileThreeReady) {
      throw new Error("Three.js low-power prototype did not become ready.");
    }
    await sleep(1_800);
    await captureScreenshot(client, "three-mobile-390.png");
    const mobileLowPower = await evaluate(
      client,
      `(() => ({
        ...document.querySelector('[data-prototype]').prototypeDiagnostics
      }))()`
    );
    await evaluate(client, "window.__RISK_CORE_CLEANUP__(); true");
    await client.send("Emulation.setCPUThrottlingRate", { rate: 1 });

    await setViewport(client, 390, 844, true);
    await client.send("Emulation.setEmulatedMedia", {
      features: [{ name: "prefers-reduced-motion", value: "reduce" }]
    });

    await navigate(client, `${baseUrl}/prototypes/svg-css.html`);
    const reducedSvg = await evaluate(
      client,
      `(() => {
        const root = document.querySelector('[data-prototype]');
        return (
          root.dataset.motion === 'reduced' &&
          root.prototypeDiagnostics.reducedMotion === true &&
          root.querySelector('[data-replay]').hidden
        );
      })()`
    );

    await navigate(client, `${baseUrl}/prototypes/canvas-2d.html`);
    const reducedCanvas = await evaluate(
      client,
      `(() => {
        const root = document.querySelector('[data-prototype]');
        return (
          root.dataset.motion === 'reduced' &&
          root.prototypeDiagnostics.reducedMotion === true &&
          root.querySelector('[data-replay]').hidden
        );
      })()`
    );

    await navigate(client, `${baseUrl}/prototypes/three-js.html`);
    await evaluate(
      client,
      "document.querySelector('.prototype-visual-frame').scrollIntoView({block: 'center'}); true"
    );
    await sleep(900);
    await captureScreenshot(client, "three-reduced-motion-mobile.png");
    const reducedThree = await evaluate(
      client,
      `(() => {
        const root = document.querySelector('[data-prototype]');
        return {
          fallback:
            root.dataset.renderState === 'fallback' &&
            root.prototypeDiagnostics.fallbackActive === true,
          dynamicImport: root.prototypeDiagnostics.dynamicImportRequested,
          threeResource: performance
            .getEntriesByType('resource')
            .some((entry) => entry.name.includes('three-core'))
        };
      })()`
    );

    await client.send("Emulation.setEmulatedMedia", { features: [] });
    await setViewport(client, 390, 844, true);
    for (const route of routes.filter(
      ({ renderer }) => renderer && renderer !== "three"
    )) {
      await navigate(client, `${baseUrl}/${route.file}`);
      await evaluate(
        client,
        "document.querySelector('.prototype-visual-frame').scrollIntoView({block: 'center'}); true"
      );
      await waitForExpression(
        client,
        "document.querySelector('[data-prototype]')?.dataset.renderState === 'ready'",
        10_000
      );
      await sleep(700);
      await captureScreenshot(client, `${route.renderer}-mobile-390.png`);
    }

    const report = {
      routes: routeResults,
      svg,
      canvas,
      three: {
        beforeVisibility,
        afterVisibility,
        hiddenPause,
        offscreenPause,
        contextFallback,
        cleanupComplete,
        mobileLowPower
      },
      reducedMotion: {
        svg: reducedSvg,
        canvas: reducedCanvas,
        threeFallback: reducedThree.fallback,
        threeDynamicImport:
          reducedThree.dynamicImport || reducedThree.threeResource
      },
      consoleErrors: [...new Set(consoleErrors)],
      screenshots: screenshotDirectory
    };

    console.log(JSON.stringify(report, null, 2));
    assertReport(report);
  } finally {
    if (client) {
      await Promise.race([
        client.send("Browser.close").catch(() => {}),
        sleep(2_000)
      ]);
      client.socket.close();
    }

    if (browserProcess.exitCode === null) browserProcess.kill();
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
