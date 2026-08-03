import { access, readFile, readdir } from "node:fs/promises";
import { constants } from "node:fs";
import path from "node:path";

const projectRoot = process.cwd();
const outputRoot = path.join(projectRoot, "dist");
const productionOrigin = "https://walawala254.github.io";

const routes = [
  { file: "index.html", canonical: `${productionOrigin}/` },
  { file: "about.html", canonical: `${productionOrigin}/about.html` },
  { file: "services.html", canonical: `${productionOrigin}/services.html` },
  { file: "portfolio.html", canonical: `${productionOrigin}/portfolio.html` },
  { file: "contact.html", canonical: `${productionOrigin}/contact.html` },
  {
    file: "case-studies/transaction-monitoring/index.html",
    canonical: `${productionOrigin}/case-studies/transaction-monitoring/`
  }
];

const prototypeRoutes = [
  "prototypes/index.html",
  "prototypes/svg-css.html",
  "prototypes/canvas-2d.html",
  "prototypes/three-js.html"
];

const requiredOutputFiles = [
  ...routes.map(({ file }) => file),
  ...prototypeRoutes,
  "404.html",
  "favicon.svg",
  "robots.txt",
  "sitemap.xml"
];
const pagesToValidate = [
  ...routes,
  ...prototypeRoutes.map((file) => ({ file })),
  { file: "404.html" }
];
const publicPages = [...routes, { file: "404.html" }];

const localReferencePattern =
  /(?:href|src)=["'](?!https?:|mailto:|tel:|#|data:)([^"'?#]+)(?:[?#][^"']*)?["']/g;
const productionEvidencePages = [
  "portfolio.html",
  "case-studies/transaction-monitoring/index.html"
];
const internalRouteFiles = [
  "about.html",
  "services.html",
  "portfolio.html",
  "contact.html",
  "case-studies/transaction-monitoring/index.html",
  "404.html"
];
const prohibitedPlaceholderPattern =
  /\b(?:lorem ipsum|coming soon|tbd|todo|built\s*\/\s*proposed|best-in-class|world-class|enterprise-grade|revolutionary)\b/i;
const navigationLabels = ["Home", "About", "Services", "Portfolio", "Contact"];
const currentNavigation = new Map([
  ["index.html", "Home"],
  ["about.html", "About"],
  ["services.html", "Services"],
  ["portfolio.html", "Portfolio"],
  ["contact.html", "Contact"],
  ["case-studies/transaction-monitoring/index.html", "Portfolio"],
  ["404.html", null]
]);

async function assertReadable(relativePath) {
  const absolutePath = path.join(outputRoot, relativePath);
  await access(absolutePath, constants.R_OK);
  return absolutePath;
}

for (const relativePath of requiredOutputFiles) {
  await assertReadable(relativePath);
}

for (const { file, canonical } of pagesToValidate) {
  const html = await readFile(path.join(outputRoot, file), "utf8");

  if (
    canonical &&
    !html.includes(`<link rel="canonical" href="${canonical}"`)
  ) {
    throw new Error(`${file} does not contain the expected canonical URL.`);
  }

  for (const match of html.matchAll(localReferencePattern)) {
    const reference = decodeURIComponent(match[1]);
    const target = reference.startsWith("/")
      ? path.join(outputRoot, reference.slice(1))
      : path.resolve(outputRoot, path.dirname(file), reference);

    await access(target, constants.R_OK).catch(() => {
      throw new Error(`${file} references missing local asset: ${reference}`);
    });
  }

  if (/data-page-(?:flow|transition)/.test(html)) {
    throw new Error(`${file} contains obsolete page-flow or transition-overlay markup.`);
  }
}

for (const { file } of publicPages) {
  const html = await readFile(path.join(outputRoot, file), "utf8");
  const title = html.match(/<title>([^<]+)<\/title>/)?.[1]?.trim();
  const description = html.match(
    /<meta name="description" content="([^"]+)"\s*\/?>/
  )?.[1];
  const h1Count = (html.match(/<h1\b/g) || []).length;

  if (!title || !description) {
    throw new Error(`${file} must contain a unique title and description.`);
  }
  if (h1Count !== 1) {
    throw new Error(`${file} must contain exactly one h1; found ${h1Count}.`);
  }
  for (const landmark of [
    'class="skip-link" href="#main"',
    "<header",
    'aria-label="Primary navigation"',
    '<main id="main"',
    "<footer"
  ]) {
    if (!html.includes(landmark)) {
      throw new Error(`${file} is missing required structure: ${landmark}`);
    }
  }
  if (!html.includes('<script>document.documentElement.classList.add("js");</script>')) {
    throw new Error(`${file} must establish enhancement state before first paint.`);
  }

  if (file !== "404.html") {
    for (const metadata of [
      'property="og:title"',
      'property="og:description"',
      'property="og:url"'
    ]) {
      if (!html.includes(metadata)) {
        throw new Error(`${file} is missing ${metadata}.`);
      }
    }
  } else if (!html.includes('name="robots" content="noindex, follow"')) {
    throw new Error("404.html must remain noindex while allowing recovery links.");
  }

  const externalLinks = html.match(/<a\b[^>]*href="https:\/\/[^>]+>/g) || [];
  for (const link of externalLinks) {
    if (
      !/target="_blank"/.test(link) ||
      !/rel="[^"]*noopener[^"]*noreferrer[^"]*"/.test(link)
    ) {
      throw new Error(`${file} contains an unsafe external new-tab link.`);
    }
  }

  const images = html.match(/<img\b[^>]*>/g) || [];
  for (const image of images) {
    if (
      !/alt="[^"]*"/.test(image) ||
      !/width="\d+"/.test(image) ||
      !/height="\d+"/.test(image)
    ) {
      throw new Error(`${file} contains an image without alt text and dimensions.`);
    }
  }

  const accessibleSvgs = html.match(/<svg\b[^>]*role="img"[^>]*>/g) || [];
  for (const svg of accessibleSvgs) {
    const labelledBy = svg.match(/aria-labelledby="([^"]+)"/)?.[1];
    if (!labelledBy) {
      throw new Error(`${file} contains a role=img SVG without aria-labelledby.`);
    }
    for (const id of labelledBy.split(/\s+/)) {
      if (!html.includes(`id="${id}"`)) {
        throw new Error(`${file} SVG references a missing accessible label: ${id}`);
      }
    }
  }

  const automaticExternalResource =
    /<(?:script|img|source|iframe)\b[^>]*\bsrc="https?:\/\/|<link\b[^>]*rel="(?:stylesheet|preconnect|dns-prefetch|modulepreload|preload)"[^>]*href="https?:\/\//i;
  if (automaticExternalResource.test(html)) {
    throw new Error(`${file} automatically loads an external resource.`);
  }
  if (/\b(?:contact|services)\.jpg\b/i.test(html)) {
    throw new Error(`${file} references a quarantined raster asset.`);
  }
  if (
    /(?:\bgtag\s*\(|googletagmanager|google-analytics|facebook\.net|doubleclick|plausible\.io|segment\.com|posthog)/i.test(
      html
    )
  ) {
    throw new Error(`${file} contains tracking or analytics code.`);
  }
  if (/\bon\w+\s*=/.test(html)) {
    throw new Error(`${file} contains an inline event handler.`);
  }
  if (/(?:[A-Z]:\\Users\\|\/Users\/|\/home\/[^<\s]+)/.test(html)) {
    throw new Error(`${file} exposes a local filesystem path.`);
  }
}

const builtAssets = await readdir(path.join(outputRoot, "assets"));
if (builtAssets.some((file) => /^(?:contact|services)-/i.test(file))) {
  throw new Error("A quarantined contact or services raster entered dist/assets.");
}

for (const file of productionEvidencePages) {
  const html = await readFile(path.join(outputRoot, file), "utf8");
  for (const match of html.matchAll(
    /<script type="application\/ld\+json">([\s\S]*?)<\/script>/g
  )) {
    try {
      JSON.parse(match[1]);
    } catch {
      throw new Error(`${file} contains invalid JSON-LD structured data.`);
    }
  }
}

for (const [file, expectedCurrent] of currentNavigation) {
  const html = await readFile(path.join(outputRoot, file), "utf8");
  const navList = html.match(/<ul class="nav-links">([\s\S]*?)<\/ul>/)?.[1];
  if (!navList) {
    throw new Error(`${file} is missing the static primary navigation.`);
  }

  const labels = [...navList.matchAll(/<a\b[^>]*>([\s\S]*?)<\/a>/g)].map(
    (match) => match[1].replace(/<[^>]+>/g, "").trim()
  );
  if (JSON.stringify(labels) !== JSON.stringify(navigationLabels)) {
    throw new Error(`${file} has an inconsistent primary-navigation order.`);
  }

  const currentItems = [
    ...navList.matchAll(/<a\b[^>]*aria-current="page"[^>]*>([\s\S]*?)<\/a>/g)
  ].map((match) => match[1].replace(/<[^>]+>/g, "").trim());
  const expectedItems = expectedCurrent ? [expectedCurrent] : [];
  if (JSON.stringify(currentItems) !== JSON.stringify(expectedItems)) {
    throw new Error(`${file} has an incorrect static aria-current state.`);
  }

  if (
    !html.includes('class="nav-toggle"') ||
    !html.includes('class="nav-toggle__glyph" aria-hidden="true"')
  ) {
    throw new Error(`${file} is missing the shared accessible navigation toggle.`);
  }
}

const sourceEntry = await readFile(path.join(projectRoot, "script.js"), "utf8");
if (/page-flow|initPageFlow|wheel|touchstart|touchend|location\.href/i.test(sourceEntry)) {
  throw new Error("script.js still contains or imports legacy gesture page routing.");
}

await access(path.join(projectRoot, "src/scripts/page-flow.js"), constants.F_OK)
  .then(() => {
    throw new Error("The obsolete page-flow module must remain removed.");
  })
  .catch((error) => {
    if (error?.message === "The obsolete page-flow module must remain removed.") {
      throw error;
    }
  });

const motionStyles = await readFile(
  path.join(projectRoot, "src/styles/motion.css"),
  "utf8"
);
if (
  !/@media\s*\(prefers-reduced-motion:\s*no-preference\)[\s\S]*@view-transition\s*{[\s\S]*navigation:\s*auto/.test(
    motionStyles
  ) ||
  !motionStyles.includes("view-transition-name: circuit-page")
) {
  throw new Error("The reduced-motion-aware native route transition is missing.");
}
if (
  !motionStyles.includes(".js.reveal-ready .reveal") ||
  !motionStyles.includes(".js.reveal-ready .reveal.is-visible")
) {
  throw new Error("Reveal styles must hide content only after observer setup succeeds.");
}

const revealSource = await readFile(
  path.join(projectRoot, "src/scripts/reveal.js"),
  "utf8"
);
for (const requirement of [
  'classList.add("reveal-ready")',
  'addEventListener("pagehide"',
  'addEventListener("pageshow"',
  '"bfcache-restore"',
  '"reduced-motion"'
]) {
  if (!revealSource.includes(requirement)) {
    throw new Error(`The reveal lifecycle is missing ${requirement}.`);
  }
}

const prototypeStyles = await readFile(
  path.join(projectRoot, "src/styles/prototypes.css"),
  "utf8"
);
if (!/@view-transition\s*{\s*navigation:\s*none;\s*}/.test(prototypeStyles)) {
  throw new Error("Experimental prototype routes must opt out of route transitions.");
}

const sitemap = await readFile(path.join(outputRoot, "sitemap.xml"), "utf8");
for (const { canonical } of routes) {
  if (!sitemap.includes(`<loc>${canonical}</loc>`)) {
    throw new Error(`sitemap.xml is missing ${canonical}`);
  }
}

if (sitemap.includes("/prototypes/")) {
  throw new Error("sitemap.xml must not include experimental prototype routes.");
}

for (const file of prototypeRoutes) {
  const html = await readFile(path.join(outputRoot, file), "utf8");
  if (!html.includes('name="robots" content="noindex, nofollow"')) {
    throw new Error(`${file} must remain noindex, nofollow.`);
  }
}

for (const file of productionEvidencePages) {
  const html = await readFile(path.join(outputRoot, file), "utf8");

  if (prohibitedPlaceholderPattern.test(html)) {
    throw new Error(`${file} contains prohibited placeholder or unsupported wording.`);
  }

  if (/\b\d+(?:\.\d+)?%\s+(?:reduction|increase|accuracy|improvement)\b/i.test(html)) {
    throw new Error(`${file} contains an unsupported numerical outcome claim.`);
  }

  const externalLinks = html.match(/<a\b[^>]*href="https:\/\/[^>]+>/g) || [];
  for (const link of externalLinks) {
    if (!/target="_blank"/.test(link) || !/rel="[^"]*noopener[^"]*noreferrer[^"]*"/.test(link)) {
      throw new Error(`${file} contains an external link without secure new-tab attributes.`);
    }
  }

  const images = html.match(/<img\b[^>]*>/g) || [];
  for (const image of images) {
    if (!/alt="[^"]*"/.test(image) || !/width="\d+"/.test(image) || !/height="\d+"/.test(image)) {
      throw new Error(`${file} contains an image without alt text and explicit dimensions.`);
    }
  }

  const pageAssetPattern = /(?:href|src)="(\/assets\/[^"]+\.(?:js|css))"/g;
  const assets = [...new Set([...html.matchAll(pageAssetPattern)].map((match) => match[1]))];
  for (const asset of assets) {
    if (/prototype|three-core/i.test(asset)) {
      throw new Error(`${file} must not request experimental asset: ${asset}`);
    }

    if (!asset.endsWith(".js")) continue;
    const source = await readFile(path.join(outputRoot, asset.slice(1)), "utf8");
    if (/three-core|from\s*["']three(?:\/|["'])/i.test(source)) {
      throw new Error(`${file} imports Three.js through ${asset}.`);
    }
  }
}

for (const file of internalRouteFiles) {
  const html = await readFile(path.join(outputRoot, file), "utf8");
  const pageAssetPattern = /(?:href|src)="(\/assets\/[^\"]+\.(?:js|css))"/g;
  const assets = [...new Set([...html.matchAll(pageAssetPattern)].map((match) => match[1]))];

  for (const asset of assets.filter((entry) => entry.endsWith(".js"))) {
    const source = await readFile(path.join(outputRoot, asset.slice(1)), "utf8");
    if (/three-core|from\s*["']three(?:\/|["'])/i.test(source)) {
      throw new Error(`${file} imports Three.js through ${asset}.`);
    }
    if (/ScrollTrigger|gsap-core|registerPlugin/i.test(source)) {
      throw new Error(`${file} imports GSAP or ScrollTrigger through ${asset}.`);
    }
  }
}

const portfolio = await readFile(path.join(outputRoot, "portfolio.html"), "utf8");
const portfolioProjects = (portfolio.match(/data-portfolio-project/g) || []).length;
const portfolioStatuses = (portfolio.match(/data-project-status-label/g) || []).length;
if (!portfolioProjects || portfolioProjects !== portfolioStatuses) {
  throw new Error("Every portfolio project must have one visible project-status label.");
}

const transactionCase = await readFile(
  path.join(outputRoot, "case-studies/transaction-monitoring/index.html"),
  "utf8"
);
if (
  !/<nav class="breadcrumbs" aria-label="Breadcrumb">[\s\S]*<li aria-current="page">Transaction monitoring<\/li>[\s\S]*<\/nav>/.test(
    transactionCase
  )
) {
  throw new Error("Transaction-monitoring breadcrumbs must expose a non-link current item.");
}
for (const destination of [
  'href="/index.html"',
  'href="/portfolio.html"',
  'href="/contact.html"',
  'href="https://github.com/walawala254/payouts-transaction-monitoring-engine-mvp"'
]) {
  if (!transactionCase.includes(destination)) {
    throw new Error(`Transaction-monitoring navigation is missing ${destination}.`);
  }
}
if (!transactionCase.includes('id="limitations"')) {
  throw new Error("Transaction-monitoring case study must contain a limitations section.");
}
if (!transactionCase.includes("My role") || !transactionCase.includes("data-case-status")) {
  throw new Error("Transaction-monitoring case study must state Dave's role and project status.");
}
if (!transactionCase.includes("synthetic") || !transactionCase.includes("fully anonymised")) {
  throw new Error("Transaction-monitoring case study must state its data boundary.");
}
if (
  !transactionCase.includes("data-section-navigation") ||
  !sourceEntry.includes('import { initCaseNavigation }') ||
  !sourceEntry.includes("initCaseNavigation();")
) {
  throw new Error("The case study must include its route-scoped section orientation module.");
}

const services = await readFile(path.join(outputRoot, "services.html"), "utf8");
if ((services.match(/class="service-card__action"/g) || []).length !== 8) {
  throw new Error("Every service area must expose one directional inquiry link.");
}

const about = await readFile(path.join(outputRoot, "about.html"), "utf8");
if (!about.includes('class="section internal-close"')) {
  throw new Error("The About page must retain its selected-work and contact route.");
}

const assetRegister = await readFile(path.join(projectRoot, "ASSET_REGISTER.md"), "utf8");
for (const assetName of [
  "Portfolio transaction route preview",
  "Transaction-monitoring architecture"
]) {
  if (!assetRegister.includes(assetName)) {
    throw new Error(`ASSET_REGISTER.md is missing ${assetName}.`);
  }
}

const homepage = await readFile(path.join(outputRoot, "index.html"), "utf8");
if (
  !homepage.includes(
    '<a class="btn primary" href="#selected-work">View selected work</a>'
  )
) {
  throw new Error("Homepage primary CTA must be View selected work.");
}
if (homepage.includes('href="prototypes/')) {
  throw new Error("Homepage must not link to experimental prototype routes.");
}

const notFound = await readFile(path.join(outputRoot, "404.html"), "utf8");
for (const destination of ["/index.html", "/portfolio.html", "/contact.html"]) {
  if (!notFound.includes(`href="${destination}"`)) {
    throw new Error(`404.html is missing its ${destination} recovery route.`);
  }
}

const homepageAssetPattern = /(?:href|src)="(\/assets\/[^"]+\.(?:js|css))"/g;
const homepageAssets = [
  ...new Set([...homepage.matchAll(homepageAssetPattern)].map((match) => match[1]))
];

for (const asset of homepageAssets) {
  if (/prototype|three-core/i.test(asset)) {
    throw new Error(`Homepage must not preload experimental asset: ${asset}`);
  }

  if (!asset.endsWith(".js")) continue;
  const source = await readFile(path.join(outputRoot, asset.slice(1)), "utf8");
  if (/three-core|from\s*["']three(?:\/|["'])/i.test(source)) {
    throw new Error(`Homepage JavaScript imports Three.js through ${asset}.`);
  }
}

console.log(
  `Validated ${routes.length} production routes, ${prototypeRoutes.length} isolated prototype routes, portfolio evidence requirements, bundle isolation, and local assets.`
);
