import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const removedFiles = [
  "lib/apiProxy.ts",
  "lib/requestBody.ts",
  "lib/serverApi.ts",
  "lib/serverArtworkUpload.ts",
  "server/routes",
  "server/services",
  "server/repositories",
  "server/presenters",
];

const sourceRoots = ["app", "lib", "server", "shared"];
const sourceExtensions = new Set([".ts", ".tsx"]);
const forbiddenSnippets = [
  "BACKEND_API_BASE_URL",
  "INTERNAL_API_SECRET",
  "X-Internal-API-Secret",
  "DB_LEGACY_ENV_FALLBACK",
  "getBackendApiUrl",
  "legacy-django-env",
  "merrimack-museum-admin",
  "proxyJsonRequest",
  "proxyAuthenticatedJsonRequest",
  "proxySelfOrRoleJsonRequest",
];

function collectSourceFiles(directory) {
  const files = [];

  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === ".next") {
      continue;
    }

    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectSourceFiles(entryPath));
      continue;
    }

    if (sourceExtensions.has(path.extname(entry.name))) {
      files.push(entryPath);
    }
  }

  return files;
}

const failures = [];

for (const relativePath of removedFiles) {
  if (fs.existsSync(path.join(rootDir, relativePath))) {
    failures.push(`Expected ${relativePath} to be removed.`);
  }
}

for (const sourceRoot of sourceRoots) {
  const directory = path.join(rootDir, sourceRoot);
  if (!fs.existsSync(directory)) {
    continue;
  }

  for (const filePath of collectSourceFiles(directory)) {
    const contents = fs.readFileSync(filePath, "utf8");
    const relativePath = path.relative(rootDir, filePath);

    for (const snippet of forbiddenSnippets) {
      if (contents.includes(snippet)) {
        failures.push(`${relativePath} still contains forbidden snippet: ${snippet}`);
      }
    }
  }
}

if (failures.length > 0) {
  console.error("Runtime cleanup verification failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Runtime cleanup verification passed.");
