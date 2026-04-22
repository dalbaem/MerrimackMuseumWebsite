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

const sampleArtwork = {
  id: 7,
  title: "River Study",
  dateCreatedMonth: 5,
  dateCreatedYear: 1998,
  comments: "On loan",
  width: "12",
  height: "16",
  size: "12x16",
  artistName: "A. Artist",
  donorName: "D. Donor",
  locationName: "Reading Room",
  categoryName: "Painting",
  imagePath: "uploads/river-study.jpg",
};

const baseArtworkBody = {
  artistName: "  A. Artist  ",
  categoryName: " Painting ",
  comments: " On loan ",
  dateCreatedMonth: "5",
  dateCreatedYear: "1998",
  donorName: " D. Donor ",
  height: "16",
  locationName: " Reading Room ",
  size: "12x16",
  title: " River Study ",
  width: "12",
};

const normalizedArtworkRequest = {
  artistName: "A. Artist",
  categoryName: "Painting",
  comments: "On loan",
  dateCreatedMonth: 5,
  dateCreatedYear: 1998,
  donorName: "D. Donor",
  height: "16",
  locationName: "Reading Room",
  size: "12x16",
  title: "River Study",
  width: "12",
};

beforeEach(() => {
  clearModuleMocks();
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
});

test("artwork list response normalizes collection query inputs", async () => {
  const getArtworkCollection = createSpy(async () => [sampleArtwork]);
  setModuleMock("@/server/artworks/service", {
    namedExports: {
      addArtworkToCatalog: async () => sampleArtwork,
      getArtworkCollection,
    },
  });

  const { GET } = await importFreshProjectModule("app/api/artworks/route.ts");

  const response = await GET(
    createRouteRequest(
      "http://localhost/api/artworks?availability=available&limit=25&offset=5&query=%20River%20",
    ),
  );

  assert.equal(response.status, 200);
  assert.deepEqual(getArtworkCollection.calls, [
    [
      {
        availableOnly: true,
        limit: 25,
        offset: 5,
        query: "River",
      },
    ],
  ]);
  assert.deepEqual(await readJsonResponse(response), [sampleArtwork]);
});

test("artwork list response rejects invalid query options", async () => {
  setModuleMock("@/server/artworks/service", {
    namedExports: {
      addArtworkToCatalog: async () => sampleArtwork,
      getArtworkCollection: async () => [],
    },
  });

  const { GET } = await importFreshProjectModule("app/api/artworks/route.ts");

  const response = await GET(
    createRouteRequest("http://localhost/api/artworks?availability=archived"),
  );
  const body = await readJsonResponse(response);

  assert.equal(response.status, 400);
  assert.equal(typeof body.error, "string");
});

test("artwork creation requires an uploaded image", async () => {
  const addArtworkToCatalog = createSpy(async () => sampleArtwork);
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
  setModuleMock("@/server/artworks/service", {
    namedExports: {
      addArtworkToCatalog,
      getArtworkCollection: async () => [],
    },
  });

  const { POST } = await importFreshProjectModule("app/api/artworks/route.ts");

  const response = await POST(
    createJsonRequest("http://localhost/api/artworks", baseArtworkBody),
  );

  assert.equal(response.status, 400);
  assert.deepEqual(await readJsonResponse(response), {
    error: "Artwork image is required",
  });
  assert.equal(addArtworkToCatalog.calls.length, 0);
});

test("artwork creation uploads an image and persists normalized fields", async () => {
  const resolveArtworkMutationInput = createSpy(async () => ({
    ...normalizedArtworkRequest,
    imagePath: "uploads/river-study.jpg",
  }));
  const addArtworkToCatalog = createSpy(async () => sampleArtwork);
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
  setModuleMock("@/server/adapters/storage", {
    namedExports: {
      resolveArtworkMutationInput,
    },
  });
  setModuleMock("@/server/artworks/service", {
    namedExports: {
      addArtworkToCatalog,
      getArtworkCollection: async () => [],
    },
  });

  const { POST } = await importFreshProjectModule("app/api/artworks/route.ts");

  const response = await POST(
    createJsonRequest("http://localhost/api/artworks", {
      ...baseArtworkBody,
      uploadedFileName: "river-study.png",
      uploadedImage: "data:image/png;base64,abc123",
    }),
  );

  assert.equal(response.status, 201);
  assert.deepEqual(resolveArtworkMutationInput.calls, [
    [
      {
        ...normalizedArtworkRequest,
        uploadedFileName: "river-study.png",
        uploadedImage: "data:image/png;base64,abc123",
      },
      { requireImage: true },
    ],
  ]);
  assert.deepEqual(addArtworkToCatalog.calls, [
    [
      {
        ...normalizedArtworkRequest,
        imagePath: "uploads/river-study.jpg",
      },
    ],
  ]);
  assert.deepEqual(await readJsonResponse(response), sampleArtwork);
});

test("artwork creation rejects invalid dimensions before upload handling", async () => {
  const resolveArtworkMutationInput = createSpy(async () => ({
    ...normalizedArtworkRequest,
    imagePath: "uploads/river-study.jpg",
  }));
  const addArtworkToCatalog = createSpy(async () => sampleArtwork);
  setModuleMock("@/server/adapters/storage", {
    namedExports: {
      resolveArtworkMutationInput,
    },
  });
  setModuleMock("@/server/artworks/service", {
    namedExports: {
      addArtworkToCatalog,
      getArtworkCollection: async () => [],
    },
  });

  const { POST } = await importFreshProjectModule("app/api/artworks/route.ts");

  const response = await POST(
    createJsonRequest("http://localhost/api/artworks", {
      ...baseArtworkBody,
      width: "twelve inches",
    }),
  );

  assert.equal(response.status, 400);
  assert.deepEqual(await readJsonResponse(response), {
    error: "Width must be a number",
  });
  assert.equal(resolveArtworkMutationInput.calls.length, 0);
  assert.equal(addArtworkToCatalog.calls.length, 0);
});

test("artwork creation rejects impossible month values", async () => {
  const resolveArtworkMutationInput = createSpy(async () => ({
    ...normalizedArtworkRequest,
    imagePath: "uploads/river-study.jpg",
  }));
  setModuleMock("@/server/adapters/storage", {
    namedExports: {
      resolveArtworkMutationInput,
    },
  });
  setModuleMock("@/server/artworks/service", {
    namedExports: {
      addArtworkToCatalog: async () => sampleArtwork,
      getArtworkCollection: async () => [],
    },
  });

  const { POST } = await importFreshProjectModule("app/api/artworks/route.ts");

  const response = await POST(
    createJsonRequest("http://localhost/api/artworks", {
      ...baseArtworkBody,
      dateCreatedMonth: "13",
    }),
  );

  assert.equal(response.status, 400);
  assert.deepEqual(await readJsonResponse(response), {
    error: "Date created month must be between 1 and 12",
  });
  assert.equal(resolveArtworkMutationInput.calls.length, 0);
});

test("artwork creation rejects out-of-range year values", async () => {
  const resolveArtworkMutationInput = createSpy(async () => ({
    ...normalizedArtworkRequest,
    imagePath: "uploads/river-study.jpg",
  }));
  setModuleMock("@/server/adapters/storage", {
    namedExports: {
      resolveArtworkMutationInput,
    },
  });
  setModuleMock("@/server/artworks/service", {
    namedExports: {
      addArtworkToCatalog: async () => sampleArtwork,
      getArtworkCollection: async () => [],
    },
  });

  const { POST } = await importFreshProjectModule("app/api/artworks/route.ts");

  const response = await POST(
    createJsonRequest("http://localhost/api/artworks", {
      ...baseArtworkBody,
      dateCreatedYear: `${new Date().getFullYear() + 1}`,
    }),
  );

  assert.equal(response.status, 400);
  assert.deepEqual(await readJsonResponse(response), {
    error: `Date created year must be between 1 and ${new Date().getFullYear()}`,
  });
  assert.equal(resolveArtworkMutationInput.calls.length, 0);
});

test("artwork update uses the route id and persists normalized fields", async () => {
  const updateArtworkInCatalog = createSpy(async () => sampleArtwork);
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
  setModuleMock("@/server/artworks/service", {
    namedExports: {
      deleteArtworkFromCatalog: async () => undefined,
      getArtworkByIdOrThrow: async () => sampleArtwork,
      updateArtworkInCatalog,
    },
  });

  const { PUT } = await importFreshProjectModule(
    "app/api/artworks/[id]/route.ts",
  );

  const response = await PUT(
    createJsonRequest("http://localhost/api/artworks/7", {
      ...baseArtworkBody,
      uploadedFileName: undefined,
      uploadedImage: undefined,
    }),
    routeParams({ id: "7" }),
  );

  assert.equal(response.status, 200);
  assert.deepEqual(updateArtworkInCatalog.calls, [
    [
      7,
      {
        ...normalizedArtworkRequest,
      },
    ],
  ]);
  assert.deepEqual(await readJsonResponse(response), sampleArtwork);
});

test("artwork update rejects incomplete upload payloads", async () => {
  const updateArtworkInCatalog = createSpy(async () => sampleArtwork);
  setModuleMock("@/server/artworks/service", {
    namedExports: {
      deleteArtworkFromCatalog: async () => undefined,
      getArtworkByIdOrThrow: async () => sampleArtwork,
      updateArtworkInCatalog,
    },
  });

  const { PUT } = await importFreshProjectModule(
    "app/api/artworks/[id]/route.ts",
  );

  const response = await PUT(
    createJsonRequest("http://localhost/api/artworks/7", {
      ...baseArtworkBody,
      uploadedFileName: "river-study.png",
    }),
    routeParams({ id: "7" }),
  );

  assert.equal(response.status, 400);
  assert.deepEqual(await readJsonResponse(response), {
    error: "Artwork image upload must include both file name and image data",
  });
  assert.equal(updateArtworkInCatalog.calls.length, 0);
});

test("artwork update surfaces mapped upload failures", async () => {
  class MockAppError extends Error {
    constructor(status, message) {
      super(message);
      this.name = "AppError";
      this.status = status;
    }
  }

  const resolveArtworkMutationInput = createSpy(async () => {
    throw new MockAppError(415, "Unsupported image format");
  });
  const updateArtworkInCatalog = createSpy(async () => sampleArtwork);
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
  setModuleMock("@/server/errors", {
    namedExports: {
      AppError: MockAppError,
      isAppError: (error) => error instanceof MockAppError,
    },
  });
  setModuleMock("@/server/adapters/storage", {
    namedExports: {
      resolveArtworkMutationInput,
    },
  });
  setModuleMock("@/server/artworks/service", {
    namedExports: {
      deleteArtworkFromCatalog: async () => undefined,
      getArtworkByIdOrThrow: async () => sampleArtwork,
      updateArtworkInCatalog,
    },
  });

  const { PUT } = await importFreshProjectModule(
    "app/api/artworks/[id]/route.ts",
  );

  const originalConsoleError = console.error;
  console.error = () => undefined;

  let response;
  try {
    response = await PUT(
      createJsonRequest("http://localhost/api/artworks/7", {
        ...baseArtworkBody,
        uploadedFileName: "river-study.bmp",
        uploadedImage: "data:image/bmp;base64,xyz",
      }),
      routeParams({ id: "7" }),
    );
  } finally {
    console.error = originalConsoleError;
  }

  assert.equal(response.status, 415);
  assert.deepEqual(await readJsonResponse(response), {
    error: "Unsupported image format",
  });
  assert.deepEqual(resolveArtworkMutationInput.calls, [
    [
      {
        ...normalizedArtworkRequest,
        uploadedFileName: "river-study.bmp",
        uploadedImage: "data:image/bmp;base64,xyz",
      },
      { requireImage: false },
    ],
  ]);
  assert.equal(updateArtworkInCatalog.calls.length, 0);
});
