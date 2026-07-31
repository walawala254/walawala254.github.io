import { access, readFile } from "node:fs/promises";
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

const localReferencePattern =
  /(?:href|src)=["'](?!https?:|mailto:|tel:|#|data:)([^"'?#]+)(?:[?#][^"']*)?["']/g;
const productionEvidencePages = [
  "portfolio.html",
  "case-studies/transaction-monitoring/index.html"
];
const prohibitedPlaceholderPattern =
  /\b(?:lorem ipsum|coming soon|tbd|todo|built\s*\/\s*proposed|best-in-class|world-class|enterprise-grade|revolutionary)\b/i;

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
if (!transactionCase.includes('id="limitations"')) {
  throw new Error("Transaction-monitoring case study must contain a limitations section.");
}
if (!transactionCase.includes("My role") || !transactionCase.includes("data-case-status")) {
  throw new Error("Transaction-monitoring case study must state Dave's role and project status.");
}
if (!transactionCase.includes("synthetic") || !transactionCase.includes("fully anonymised")) {
  throw new Error("Transaction-monitoring case study must state its data boundary.");
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
