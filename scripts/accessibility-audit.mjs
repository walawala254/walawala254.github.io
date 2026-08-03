import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import path from "node:path";

const baseUrl = (process.argv[2] || "http://127.0.0.1:4173").replace(/\/$/, "");
const axeSource = await readFile(
  path.resolve("node_modules/axe-core/axe.min.js"),
  "utf8"
);

const routes = [
  "/",
  "/index.html",
  "/about.html",
  "/services.html",
  "/portfolio.html",
  "/contact.html",
  "/case-studies/transaction-monitoring/",
  "/404.html"
];

const browserCandidates =
  process.platform === "win32"
    ? [
        process.env.BROWSER_PATH,
        "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
        "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
        "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
      ]
    : [
        process.env.BROWSER_PATH,
        "microsoft-edge",
        "google-chrome",
        "chromium"
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

class CdpClient {
  constructor(url) {
    this.nextId = 1;
    this.pending = new Map();
    this.socket = new WebSocket(url);
  }

  async connect() {
    await new Promise((resolve, reject) => {
      this.socket.addEventListener("open", resolve, { once: true });
      this.socket.addEventListener("error", reject, { once: true });
    });

    this.socket.addEventListener("message", (event) => {
      const message = JSON.parse(event.data);
      if (!message.id || !this.pending.has(message.id)) return;

      const { resolve, reject } = this.pending.get(message.id);
      this.pending.delete(message.id);
      if (message.error) reject(new Error(message.error.message));
      else resolve(message.result);
    });
  }

  send(method, params = {}) {
    const id = this.nextId++;

    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.socket.send(JSON.stringify({ id, method, params }));
    });
  }
}

async function waitForTarget(port) {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/json/list`);
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

  for (let attempt = 0; attempt < 60; attempt += 1) {
    await sleep(100);
    try {
      if ((await evaluate(client, "document.readyState")) === "complete") break;
    } catch {
      // A cross-document navigation is replacing the execution context.
    }
  }

  // Audit the settled page, not the deliberately translucent reveal transition.
  await sleep(900);
}

function summariseResults(results) {
  return {
    testEngine: results.testEngine,
    testEnvironment: results.testEnvironment,
    testRunner: results.testRunner,
    timestamp: results.timestamp,
    url: results.url,
    passes: results.passes.length,
    incomplete: results.incomplete.map((result) => ({
      id: result.id,
      impact: result.impact,
      targets: result.nodes.map((node) => node.target)
    })),
    violations: results.violations.map((result) => ({
      id: result.id,
      impact: result.impact,
      help: result.help,
      helpUrl: result.helpUrl,
      targets: result.nodes.map((node) => node.target)
    }))
  };
}

async function main() {
  if (typeof WebSocket === "undefined") {
    throw new Error("This audit requires a Node.js runtime with WebSocket support.");
  }

  const debuggingPort = await findAvailablePort();
  const browserPath = await findBrowser();
  const profileDirectory = path.join(
    tmpdir(),
    `risk-intelligence-a11y-${process.pid}`
  );
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
    const target = await waitForTarget(debuggingPort);
    client = new CdpClient(target);
    await client.connect();
    await client.send("Page.enable");
    await client.send("Runtime.enable");
    await client.send("Emulation.setDeviceMetricsOverride", {
      width: 1440,
      height: 1000,
      deviceScaleFactor: 1,
      mobile: false
    });
    await client.send("Page.addScriptToEvaluateOnNewDocument", {
      source: axeSource
    });

    const report = {
      axeVersion: null,
      standard: "WCAG 2.0/2.1/2.2 A and AA plus axe best practices",
      routes: {},
      textResize200: {}
    };

    for (const route of routes) {
      await navigate(client, `${baseUrl}${route}`);
      const results = await evaluate(
        client,
        `axe.run(document, {
          runOnly: {
            type: 'tag',
            values: [
              'wcag2a',
              'wcag2aa',
              'wcag21a',
              'wcag21aa',
              'wcag22a',
              'wcag22aa',
              'best-practice'
            ]
          },
          resultTypes: ['violations', 'incomplete', 'passes']
        })`
      );

      report.axeVersion ||= results.testEngine.version;
      report.routes[route] = summariseResults(results);
    }

    await client.send("Emulation.setDeviceMetricsOverride", {
      width: 390,
      height: 844,
      deviceScaleFactor: 1,
      mobile: true
    });

    for (const route of routes) {
      await navigate(client, `${baseUrl}${route}`);
      report.textResize200[route] = await evaluate(
        client,
        `(() => {
          document.documentElement.style.fontSize = '200%';
          const viewportWidth = document.documentElement.clientWidth;
          const overflowElements = [...document.querySelectorAll('body *')]
            .filter((element) => {
              const style = getComputedStyle(element);
              const rect = element.getBoundingClientRect();
              return (
                !element.closest('svg') &&
                !element.classList.contains('sr-only') &&
                style.display !== 'none' &&
                style.visibility !== 'hidden' &&
                rect.width > 0 &&
                (rect.left < -0.5 || rect.right > viewportWidth + 0.5)
              );
            })
            .map((element) => {
              const rect = element.getBoundingClientRect();
              return {
                selector:
                  element.id
                    ? '#' + element.id
                    : element.tagName.toLowerCase() +
                      (element.className && typeof element.className === 'string'
                        ? '.' + element.className.trim().replace(/\\s+/g, '.')
                        : ''),
                text: (element.textContent || '').trim().replace(/\\s+/g, ' ').slice(0, 80),
                left: Math.round(rect.left * 10) / 10,
                right: Math.round(rect.right * 10) / 10,
                width: Math.round(rect.width * 10) / 10
              };
            })
            .slice(0, 30);

          return {
            viewportWidth,
            scrollWidth: document.documentElement.scrollWidth,
            overflowElements
          };
        })()`
      );
    }

    console.log(JSON.stringify(report, null, 2));

    const violations = Object.entries(report.routes).flatMap(
      ([route, result]) =>
        result.violations.map((violation) => ({ route, ...violation }))
    );

    if (violations.length) {
      throw new Error(
        `Accessibility audit found ${violations.length} route-level violation groups.\n${violations
          .map(
            (violation) =>
              `- ${violation.route}: ${violation.id} (${violation.impact || "impact unknown"})`
          )
          .join("\n")}`
      );
    }

    const reflowFailures = Object.entries(report.textResize200).filter(
      ([, result]) =>
        result.scrollWidth > result.viewportWidth || result.overflowElements.length
    );
    if (reflowFailures.length) {
      throw new Error(
        `200% text resizing overflows ${reflowFailures.length} routes:\n${reflowFailures
          .map(([route, result]) => `- ${route}: ${result.scrollWidth}px / ${result.viewportWidth}px`)
          .join("\n")}`
      );
    }
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
