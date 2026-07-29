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
  { file: "contact.html", canonical: `${productionOrigin}/contact.html` }
];

const requiredOutputFiles = [
  ...routes.map(({ file }) => file),
  "404.html",
  "favicon.svg",
  "robots.txt",
  "sitemap.xml"
];
const pagesToValidate = [...routes, { file: "404.html" }];

const localReferencePattern =
  /(?:href|src)=["'](?!https?:|mailto:|tel:|#|data:)([^"'?#]+)(?:[?#][^"']*)?["']/g;

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

console.log(`Validated ${routes.length} production routes and their local assets.`);
