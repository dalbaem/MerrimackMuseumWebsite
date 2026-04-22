import assert from "node:assert/strict";
import { beforeEach, test } from "node:test";
import {
  clearModuleMocks,
  createSpy,
  importFreshProjectModule,
} from "../runtime/test-helpers.mjs";
import { setModuleMock } from "../runtime/test-helpers.mjs";

beforeEach(() => {
  clearModuleMocks();

  setModuleMock("next-auth/providers/google", {
    defaultExport: (config) => config,
  });
});

test("auth sign-in callback allows privileged museum users", async () => {
  const getRoleForEmail = createSpy(async () => "faculty");
  setModuleMock("@/server/users/service", {
    namedExports: {
      getRoleForEmail,
    },
  });

  const { authOptions } = await importFreshProjectModule("server/auth/nextAuth.ts");
  const result = await authOptions.callbacks.signIn({
    user: {
      email: " Faculty@Example.com ",
    },
  });

  assert.equal(result, true);
  assert.deepEqual(getRoleForEmail.calls, [["faculty@example.com"]]);
});

test("auth sign-in callback redirects guest accounts back to the collection", async () => {
  const getRoleForEmail = createSpy(async () => "guest");
  setModuleMock("@/server/users/service", {
    namedExports: {
      getRoleForEmail,
    },
  });

  const { authOptions } = await importFreshProjectModule("server/auth/nextAuth.ts");
  const result = await authOptions.callbacks.signIn({
    user: {
      email: "viewer@example.com",
    },
  });

  assert.equal(result, "/collection?signin=access-denied");
  assert.deepEqual(getRoleForEmail.calls, [["viewer@example.com"]]);
});

test("auth sign-in callback denies access when no email is available", async () => {
  const getRoleForEmail = createSpy(async () => "admin");
  setModuleMock("@/server/users/service", {
    namedExports: {
      getRoleForEmail,
    },
  });

  const { authOptions } = await importFreshProjectModule("server/auth/nextAuth.ts");
  const result = await authOptions.callbacks.signIn({
    user: {
      email: null,
    },
  });

  assert.equal(result, "/collection?signin=access-denied");
  assert.equal(getRoleForEmail.calls.length, 0);
});
