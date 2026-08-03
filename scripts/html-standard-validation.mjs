import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

const buildDirectory = path.resolve("dist");
const validatorUrl =
  process.env.HTML_VALIDATOR_URL || "https://validator.w3.org/nu/?out=json";

async function findHtmlFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const entryPath = path.join(directory, entry.name);
      if (entry.isDirectory()) return findHtmlFiles(entryPath);
      return entry.name.endsWith(".html") ? [entryPath] : [];
    })
  );

  return files.flat();
}

const wait = (milliseconds) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

async function validateDocument(filePath) {
  const document = await readFile(filePath, "utf8");
  let lastError;

  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      const response = await fetch(validatorUrl, {
        method: "POST",
        headers: {
          "content-type": "text/html; charset=utf-8",
          "user-agent": "Dave-Bryson-Portfolio-Release-Validation/1.0"
        },
        body: document,
        signal: AbortSignal.timeout(45_000)
      });

      if (!response.ok) {
        throw new Error(`validator returned HTTP ${response.status}`);
      }

      const result = await response.json();
      const messages = result.messages || [];
      const errors = messages.filter((message) => message.type === "error");
      const warnings = messages.filter(
        (message) =>
          message.type === "info" && message.subType === "warning"
      );

      return { errors, warnings };
    } catch (error) {
      lastError = error;
      if (attempt < 2) await wait(750);
    }
  }

  throw lastError;
}

async function main() {
  const htmlFiles = (await findHtmlFiles(buildDirectory)).sort();
  const failures = [];

  for (const filePath of htmlFiles) {
    const relativePath = path.relative(buildDirectory, filePath).replaceAll("\\", "/");
    const { errors, warnings } = await validateDocument(filePath);
    console.log(
      `${relativePath}: errors=${errors.length} warnings=${warnings.length}`
    );

    if (errors.length || warnings.length) {
      failures.push({ relativePath, errors, warnings });
    }
  }

  if (failures.length) {
    for (const failure of failures) {
      console.error(`\n${failure.relativePath}`);
      for (const message of [...failure.errors, ...failure.warnings]) {
        console.error(
          `- line ${message.lastLine || "?"}: ${message.message || "validation issue"}`
        );
      }
    }

    throw new Error(
      `HTML standards validation failed for ${failures.length} document(s).`
    );
  }

  console.log(`Validated ${htmlFiles.length} built HTML documents with W3C Nu.`);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
