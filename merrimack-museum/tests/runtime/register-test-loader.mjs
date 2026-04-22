import fs from "node:fs";
import path from "node:path";
import { registerHooks } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";

const runtimeDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(runtimeDir, "..", "..");
const mockModuleUrl = pathToFileURL(
  path.join(runtimeDir, "next-server.mock.mjs"),
).href;
const mockRegistry = new Map();
let mockVersion = 0;
function resolveExistingProjectPath(basePath) {
  const extensions = [".ts", ".tsx", ".js", ".mjs", ".cjs"];

  if (fs.existsSync(basePath) && fs.statSync(basePath).isFile()) {
    return basePath;
  }

  for (const extension of extensions) {
    const candidate = `${basePath}${extension}`;
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  for (const extension of extensions) {
    const candidate = path.join(basePath, `index${extension}`);
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  throw new Error(`Unable to resolve project module: ${basePath}`);
}
function createMockModuleSource(specifier) {
  const definition = mockRegistry.get(specifier) ?? {};
  const namedExports = Object.keys(definition.namedExports ?? {});
  const sourceLines = [
    `const definition = globalThis.__museumTestLoader.getModuleMock(${JSON.stringify(specifier)});`,
  ];

  if ("defaultExport" in definition) {
    sourceLines.push("export default definition.defaultExport;");
  }

  for (const exportName of namedExports) {
    sourceLines.push(
      `export const ${exportName} = definition.namedExports[${JSON.stringify(exportName)}];`,
    );
  }

  if (!("defaultExport" in definition) && namedExports.length === 0) {
    sourceLines.push("export {};");
  }

  return sourceLines.join("\n");
}

globalThis.__museumTestLoader = {
  clearModuleMocks() {
    mockRegistry.clear();
    mockVersion += 1;
  },
  getMockVersion() {
    return mockVersion;
  },
  getModuleMock(specifier) {
    return mockRegistry.get(specifier);
  },
  getRootDir() {
    return rootDir;
  },
  setModuleMock(specifier, definition) {
    mockRegistry.set(specifier, definition);
    mockVersion += 1;
  },
};

registerHooks({
  load(url, context, nextLoad) {
    if (url.startsWith("museum-test-empty:")) {
      return {
        format: "module",
        shortCircuit: true,
        source: "export {};",
      };
    }

    if (url.startsWith("museum-test-mock:")) {
      const mockUrl = new URL(url);
      const specifier = decodeURIComponent(mockUrl.pathname);

      return {
        format: "module",
        shortCircuit: true,
        source: createMockModuleSource(specifier),
      };
    }

    return nextLoad(url, context);
  },
  resolve(specifier, context, nextResolve) {
    if (mockRegistry.has(specifier)) {
      return {
        shortCircuit: true,
        url: `museum-test-mock:${encodeURIComponent(specifier)}?v=${mockVersion}`,
      };
    }

    if (specifier === "next/server") {
      return {
        shortCircuit: true,
        url: mockModuleUrl,
      };
    }

    if (specifier === "server-only") {
      return {
        shortCircuit: true,
        url: "museum-test-empty:server-only",
      };
    }

    if (specifier.startsWith("@/")) {
      const resolvedPath = resolveExistingProjectPath(
        path.join(rootDir, specifier.slice(2)),
      );

      return {
        shortCircuit: true,
        url: `${pathToFileURL(resolvedPath).href}?v=${mockVersion}`,
      };
    }

    return nextResolve(specifier, context);
  },
});
