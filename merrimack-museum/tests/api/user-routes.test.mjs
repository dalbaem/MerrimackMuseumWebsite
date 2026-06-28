import assert from "node:assert/strict";
import { beforeEach, test } from "node:test";
import {
  clearModuleMocks,
  createJsonRequest,
  createRouteRequest,
  createSpy,
  importFreshProjectModule,
  readJsonResponse,
  routeParams,
} from "../runtime/test-helpers.mjs";
import { setModuleMock } from "../runtime/test-helpers.mjs";

const sampleUser = {
  email: "faculty@example.com",
  id: 2,
  role: "faculty",
};

const sampleGuestUser = {
  email: "viewer@example.com",
  id: 0,
  role: "guest",
};
function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    headers: {
      "content-type": "application/json",
    },
    status,
  });
}

beforeEach(() => {
  clearModuleMocks();
});

test("user access lookup requires authentication", async () => {
  const getUserAccess = createSpy(async () => sampleUser);
  setModuleMock("@/server/auth/requestActor", {
    namedExports: {
      ensureActorMatchesEmail: () => false,
      getRequestActor: async () => null,
    },
  });
  setModuleMock("@/server/users/service", {
    namedExports: {
      getUserAccess,
    },
  });

  const { POST } = await importFreshProjectModule("app/api/user/route.ts");

  const response = await POST(
    createJsonRequest("http://localhost/api/user", {
      email: "faculty@example.com",
    }),
  );

  assert.equal(response.status, 401);
  assert.deepEqual(await readJsonResponse(response), {
    error: "Authentication required",
  });
  assert.equal(getUserAccess.calls.length, 0);
});

test("user access lookup allows self-service requests", async () => {
  const getUserAccess = createSpy(async () => sampleUser);
  setModuleMock("@/server/auth/requestActor", {
    namedExports: {
      ensureActorMatchesEmail: (actor, email) => actor.email === email,
      getRequestActor: async () => ({
        email: "faculty@example.com",
        isPreview: false,
        role: "faculty",
      }),
    },
  });
  setModuleMock("@/server/users/service", {
    namedExports: {
      getUserAccess,
    },
  });

  const { POST } = await importFreshProjectModule("app/api/user/route.ts");

  const response = await POST(
    createJsonRequest("http://localhost/api/user", {
      email: " Faculty@Example.com ",
    }),
  );

  assert.equal(response.status, 200);
  assert.deepEqual(getUserAccess.calls, [["faculty@example.com"]]);
  assert.deepEqual(await readJsonResponse(response), {
    email: "faculty@example.com",
    role: "faculty",
  });
});

test("user access lookup forbids faculty access to other users", async () => {
  const getUserAccess = createSpy(async () => sampleGuestUser);
  setModuleMock("@/server/auth/requestActor", {
    namedExports: {
      ensureActorMatchesEmail: () => false,
      getRequestActor: async () => ({
        email: "faculty@example.com",
        isPreview: false,
        role: "faculty",
      }),
    },
  });
  setModuleMock("@/server/users/service", {
    namedExports: {
      getUserAccess,
    },
  });

  const { POST } = await importFreshProjectModule("app/api/user/route.ts");

  const response = await POST(
    createJsonRequest("http://localhost/api/user", {
      email: "viewer@example.com",
    }),
  );

  assert.equal(response.status, 403);
  assert.deepEqual(await readJsonResponse(response), {
    error: "Forbidden",
  });
  assert.equal(getUserAccess.calls.length, 0);
});

test("user role updates require admin access", async () => {
  const updateUserRole = createSpy(async () => sampleUser);
  setModuleMock("@/server/auth/requestActor", {
    namedExports: {
      requireRole: async () => ({
        actor: null,
        response: jsonResponse({ error: "Forbidden" }, 403),
      }),
    },
  });
  setModuleMock("@/server/users/service", {
    namedExports: {
      updateUserRole,
    },
  });

  const { PUT } = await importFreshProjectModule("app/api/users/role/route.ts");

  const response = await PUT(
    createJsonRequest("http://localhost/api/users/role", {
      email: "faculty@example.com",
      role: "faculty",
    }),
  );

  assert.equal(response.status, 403);
  assert.deepEqual(await readJsonResponse(response), {
    error: "Forbidden",
  });
  assert.equal(updateUserRole.calls.length, 0);
});

test("user role updates forward normalized input for admins", async () => {
  const updateUserRole = createSpy(async (email, role) => ({
    ...sampleUser,
    email,
    role,
  }));
  setModuleMock("@/server/auth/requestActor", {
    namedExports: {
      requireRole: async () => ({
        actor: {
          email: "admin@example.com",
          isPreview: false,
          role: "admin",
        },
        response: null,
      }),
    },
  });
  setModuleMock("@/server/users/service", {
    namedExports: {
      updateUserRole,
    },
  });

  const { PUT } = await importFreshProjectModule("app/api/users/role/route.ts");

  const response = await PUT(
    createJsonRequest("http://localhost/api/users/role", {
      email: " Faculty@Example.com ",
      role: "guest",
    }),
  );

  assert.equal(response.status, 200);
  assert.deepEqual(updateUserRole.calls, [["faculty@example.com", "guest"]]);
  assert.deepEqual(await readJsonResponse(response), {
    email: "faculty@example.com",
    role: "guest",
  });
});

test("user search requires admin access", async () => {
  const searchUsers = createSpy(async () => [sampleUser]);
  setModuleMock("@/server/auth/requestActor", {
    namedExports: {
      requireRole: async () => ({
        actor: null,
        response: jsonResponse({ error: "Forbidden" }, 403),
      }),
    },
  });
  setModuleMock("@/server/users/service", {
    namedExports: {
      searchUsers,
    },
  });

  const { GET } = await importFreshProjectModule("app/api/users/route.ts");

  const response = await GET(
    createRouteRequest("http://localhost/api/users?email=faculty&role=faculty"),
  );

  assert.equal(response.status, 403);
  assert.deepEqual(await readJsonResponse(response), {
    error: "Forbidden",
  });
  assert.equal(searchUsers.calls.length, 0);
});

test("user search forwards filters for admins", async () => {
  const searchUsers = createSpy(async () => [sampleUser]);
  setModuleMock("@/server/auth/requestActor", {
    namedExports: {
      requireRole: async () => ({
        actor: {
          email: "admin@example.com",
          isPreview: false,
          role: "admin",
        },
        response: null,
      }),
    },
  });
  setModuleMock("@/server/users/service", {
    namedExports: {
      searchUsers,
    },
  });

  const { GET } = await importFreshProjectModule("app/api/users/route.ts");

  const response = await GET(
    createRouteRequest("http://localhost/api/users?email=%20Faculty%20&role=faculty"),
  );

  assert.equal(response.status, 200);
  assert.deepEqual(searchUsers.calls, [
    [
      {
        email: "Faculty",
        role: "faculty",
      },
    ],
  ]);
  assert.deepEqual(await readJsonResponse(response), [
    {
      email: "faculty@example.com",
      role: "faculty",
    },
  ]);
});

test("user delete requires admin access", async () => {
  const deleteUser = createSpy(async () => undefined);
  setModuleMock("@/server/auth/requestActor", {
    namedExports: {
      requireRole: async () => ({
        actor: null,
        response: jsonResponse({ error: "Forbidden" }, 403),
      }),
    },
  });
  setModuleMock("@/server/users/service", {
    namedExports: {
      deleteUser,
    },
  });

  const { DELETE } = await importFreshProjectModule("app/api/users/[email]/route.ts");

  const response = await DELETE(
    createRouteRequest("http://localhost/api/users/faculty%40example.com"),
    routeParams({ email: "faculty%40example.com" }),
  );

  assert.equal(response.status, 403);
  assert.deepEqual(await readJsonResponse(response), {
    error: "Forbidden",
  });
  assert.equal(deleteUser.calls.length, 0);
});

test("user delete forwards normalized route email for admins", async () => {
  const deleteUser = createSpy(async () => undefined);
  setModuleMock("@/server/auth/requestActor", {
    namedExports: {
      requireRole: async () => ({
        actor: {
          email: "admin@example.com",
          isPreview: false,
          role: "admin",
        },
        response: null,
      }),
    },
  });
  setModuleMock("@/server/users/service", {
    namedExports: {
      deleteUser,
    },
  });

  const { DELETE } = await importFreshProjectModule("app/api/users/[email]/route.ts");

  const response = await DELETE(
    createRouteRequest("http://localhost/api/users/faculty%40example.com"),
    routeParams({ email: " Faculty%40Example.com " }),
  );

  assert.equal(response.status, 204);
  assert.equal(await response.text(), "");
  assert.deepEqual(deleteUser.calls, [["faculty@example.com"]]);
});
