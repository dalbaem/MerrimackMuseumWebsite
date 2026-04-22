import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const SOURCE_ROOTS = ["app", "lib", "server", "shared"];
const SOURCE_EXTENSIONS = [".ts", ".tsx", ".js", ".mjs", ".cjs"];
const FROM_SPECIFIER_PATTERN = /\bfrom\s+["']([^"']+)["']/g;
const BARE_IMPORT_PATTERN = /\bimport\s+["']([^"']+)["']/g;
const DYNAMIC_IMPORT_PATTERN = /\bimport\s*\(\s*["']([^"']+)["']\s*\)/g;
const API_ROUTE_STRING_PATTERN = /["'`](\/api\/[^"'`]+)["'`]/g;

const rules = [
  {
    name: "site files should go through lib/api instead of importing server code",
    matches: (filePath) => filePath.startsWith("app/(site)/"),
    disallowedImportPrefixes: ["server/", "app/api/"],
    disallowApiRouteStrings: true,
  },
  {
    name: "API routes should depend on services and shared code, not UI or client HTTP helpers",
    matches: (filePath) => filePath.startsWith("app/api/"),
    disallowedImportPrefixes: ["app/(site)/", "lib/api/"],
    disallowedImportChecks: [
      (importPath) => importPath.startsWith("server/db/"),
      (importPath) => /\/repository(?:\.[^./]+)?$/.test(importPath),
    ],
  },
  {
    name: "lib/api should stay client-side and avoid app or server dependencies",
    matches: (filePath) => filePath.startsWith("lib/api/"),
    disallowedImportPrefixes: ["app/", "server/"],
  },
  {
    name: "server code should not import app or lib layers",
    matches: (filePath) => filePath.startsWith("server/"),
    disallowedImportPrefixes: ["app/", "lib/"],
    disallowApiRouteStrings: true,
  },
  {
    name: "shared code should not import app, lib, or server layers",
    matches: (filePath) => filePath.startsWith("shared/"),
    disallowedImportPrefixes: ["app/", "lib/", "server/"],
    disallowApiRouteStrings: true,
  },
];

function toProjectPath(value) {
  return value.split(path.sep).join("/");
}

function collectSourceFiles(relativeDir) {
  const absoluteDir = path.join(rootDir, relativeDir);
  const entries = fs.readdirSync(absoluteDir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const relativePath = path.join(relativeDir, entry.name);

    if (entry.isDirectory()) {
      files.push(...collectSourceFiles(relativePath));
      continue;
    }

    if (SOURCE_EXTENSIONS.includes(path.extname(entry.name))) {
      files.push(toProjectPath(relativePath));
    }
  }

  return files;
}

function findImportTarget(basePath) {
  const candidates = [
    basePath,
    ...SOURCE_EXTENSIONS.map((extension) => `${basePath}${extension}`),
    ...SOURCE_EXTENSIONS.map((extension) => path.join(basePath, `index${extension}`)),
  ];

  return candidates.find((candidate) => fs.existsSync(candidate)) || basePath;
}

function resolveProjectImport(sourceFile, specifier) {
  if (specifier.startsWith("@/")) {
    return specifier.slice(2);
  }

  if (!specifier.startsWith(".")) {
    return null;
  }

  const absoluteSourceFile = path.join(rootDir, sourceFile);
  const importBasePath = path.resolve(path.dirname(absoluteSourceFile), specifier);
  const resolvedTarget = findImportTarget(importBasePath);

  return toProjectPath(path.relative(rootDir, resolvedTarget));
}

function collectMatches(contents, pattern) {
  return Array.from(contents.matchAll(pattern), (match) => match[1]);
}

function collectProjectImports(filePath, contents) {
  const specifiers = new Set([
    ...collectMatches(contents, FROM_SPECIFIER_PATTERN),
    ...collectMatches(contents, BARE_IMPORT_PATTERN),
    ...collectMatches(contents, DYNAMIC_IMPORT_PATTERN),
  ]);

  return Array.from(specifiers)
    .map((specifier) => resolveProjectImport(filePath, specifier))
    .filter(Boolean);
}

const sourceFiles = SOURCE_ROOTS.flatMap(collectSourceFiles);
const failures = [];

for (const filePath of sourceFiles) {
  const absoluteFilePath = path.join(rootDir, filePath);
  const contents = fs.readFileSync(absoluteFilePath, "utf8");
  const imports = collectProjectImports(filePath, contents);

  for (const rule of rules) {
    if (!rule.matches(filePath)) {
      continue;
    }

    for (const importPath of imports) {
      const hasDisallowedPrefix = rule.disallowedImportPrefixes?.some((prefix) =>
        importPath.startsWith(prefix),
      );
      const hasDisallowedImport = rule.disallowedImportChecks?.some((check) =>
        check(importPath),
      );

      if (hasDisallowedPrefix || hasDisallowedImport) {
        failures.push(
          `${filePath} breaks boundary rule "${rule.name}" via import "${importPath}"`,
        );
      }
    }

    if (rule.disallowApiRouteStrings) {
      const apiRouteMatches = collectMatches(contents, API_ROUTE_STRING_PATTERN);

      for (const apiRoute of apiRouteMatches) {
        failures.push(
          `${filePath} breaks boundary rule "${rule.name}" via direct route string "${apiRoute}"`,
        );
      }
    }
  }
}

if (failures.length > 0) {
  console.error("Server boundary verification failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  console.error(
    "Expected: site code talks to lib/api, routes talk to services, and shared modules stay free of app/server coupling.",
  );
  process.exit(1);
}

console.log("Server boundary verification passed.");
