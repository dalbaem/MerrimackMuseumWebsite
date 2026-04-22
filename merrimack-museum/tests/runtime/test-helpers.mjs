import path from "node:path";
import { pathToFileURL } from "node:url";

const loaderState = globalThis.__museumTestLoader;

if (!loaderState) {
  throw new Error(
    "The test loader is not registered. Run tests with --import ./tests/runtime/register-test-loader.mjs.",
  );
}

let importCounter = 0;
export function clearModuleMocks() {
  loaderState.clearModuleMocks();
}

export function createJsonRequest(url, body, init = {}, options = {}) {
  const headers = new Headers(init.headers);
  if (!headers.has("content-type")) {
    headers.set("content-type", "application/json");
  }

  const request = createRouteRequest(
    url,
    {
      ...init,
      body: typeof body === "string" ? body : JSON.stringify(body),
      headers,
      method: init.method ?? "POST",
    },
    options,
  );

  return request;
}

export function createRouteRequest(url, init = {}, options = {}) {
  const request = new Request(url, init);

  Object.defineProperty(request, "cookies", {
    configurable: true,
    enumerable: true,
    value: {
      get(name) {
        const value = options.cookies?.[name];
        return value === undefined ? undefined : { name, value };
      },
    },
  });

  Object.defineProperty(request, "nextUrl", {
    configurable: true,
    enumerable: true,
    value: new URL(url),
  });

  return request;
}

export function createSpy(implementation = () => undefined) {
  const calls = [];
  const spy = (...args) => {
    calls.push(args);
    return implementation(...args);
  };

  spy.calls = calls;
  return spy;
}

export async function importFreshProjectModule(relativePath) {
  importCounter += 1;

  const moduleUrl = pathToFileURL(
    path.join(loaderState.getRootDir(), relativePath),
  ).href;
  const version = loaderState.getMockVersion();

  return import(`${moduleUrl}?test=${version}-${importCounter}`);
}

export async function readJsonResponse(response) {
  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

export function routeParams(params) {
  return {
    params: Promise.resolve(params),
  };
}

export function setModuleMock(specifier, definition) {
  loaderState.setModuleMock(specifier, definition);
}
