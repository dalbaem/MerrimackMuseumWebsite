import assert from "node:assert/strict";
import { beforeEach, test } from "node:test";
import {
  clearModuleMocks,
  createSpy,
  importFreshProjectModule,
  setModuleMock,
} from "../runtime/test-helpers.mjs";

const sampleApprovedRequest = {
  id: 11,
  user: {
    email: "faculty@example.com",
  },
  artwork: {
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
  },
  toLocation: "Gallery Hall",
  isPending: false,
  isApproved: true,
  isComplete: false,
  requestNotes: "Please move after finals.",
  requestedAt: "2026-04-20T09:00:00.000Z",
};

beforeEach(() => {
  clearModuleMocks();
});

test("move request completion rejects mismatched artwork ids", async () => {
  const updateArtworkInCatalog = createSpy(async () => sampleApprovedRequest.artwork);
  const updateMoveRequestFields = createSpy(async () => ({
    ...sampleApprovedRequest,
    isComplete: true,
  }));

  setModuleMock("@/server/db/client", {
    namedExports: {
      db: {
        transaction() {
          return {
            execute(callback) {
              return callback({ mocked: true });
            },
          };
        },
      },
    },
  });
  setModuleMock("@/server/artworks/service", {
    namedExports: {
      updateArtworkInCatalog,
    },
  });
  setModuleMock("@/server/moveRequests/repository", {
    namedExports: {
      countActiveMoveRequestsForArtwork: async () => 0,
      createMoveRequest: async () => null,
      deleteMoveRequest: async () => undefined,
      findMoveRequestById: async () => sampleApprovedRequest,
      listMoveRequestsByState: async () => [],
      listMoveRequestsByUserEmail: async () => [],
      updateMoveRequestFields,
    },
  });
  setModuleMock("@/server/users/repository", {
    namedExports: {
      findUserByEmail: async () => null,
    },
  });
  setModuleMock("@/server/users/service", {
    namedExports: {
      ensurePrivilegedUser: async () => null,
    },
  });

  const { updateMoveProgress } = await importFreshProjectModule(
    "server/moveRequests/service.ts",
  );

  await assert.rejects(
    updateMoveProgress(11, "complete", 999, "Gallery Hall"),
    /Artwork id does not match the move request\./,
  );

  assert.equal(updateArtworkInCatalog.calls.length, 0);
  assert.equal(updateMoveRequestFields.calls.length, 0);
});

test("move request completion keeps the stored destination in sync", async () => {
  const updateArtworkInCatalog = createSpy(async () => sampleApprovedRequest.artwork);
  const updateMoveRequestFields = createSpy(async () => ({
    ...sampleApprovedRequest,
    isComplete: true,
    toLocation: "North Gallery",
  }));

  setModuleMock("@/server/db/client", {
    namedExports: {
      db: {
        transaction() {
          return {
            execute(callback) {
              return callback({ mocked: true });
            },
          };
        },
      },
    },
  });
  setModuleMock("@/server/artworks/service", {
    namedExports: {
      updateArtworkInCatalog,
    },
  });
  setModuleMock("@/server/moveRequests/repository", {
    namedExports: {
      countActiveMoveRequestsForArtwork: async () => 0,
      createMoveRequest: async () => null,
      deleteMoveRequest: async () => undefined,
      findMoveRequestById: async () => sampleApprovedRequest,
      listMoveRequestsByState: async () => [],
      listMoveRequestsByUserEmail: async () => [],
      updateMoveRequestFields,
    },
  });
  setModuleMock("@/server/users/repository", {
    namedExports: {
      findUserByEmail: async () => null,
    },
  });
  setModuleMock("@/server/users/service", {
    namedExports: {
      ensurePrivilegedUser: async () => null,
    },
  });

  const { updateMoveProgress } = await importFreshProjectModule(
    "server/moveRequests/service.ts",
  );

  const updatedRequest = await updateMoveProgress(11, "complete", 7, "North Gallery");

  assert.deepEqual(updateMoveRequestFields.calls, [
    [
      11,
      {
        isComplete: true,
        isPending: false,
        toLocation: "North Gallery",
      },
      { mocked: true },
    ],
  ]);
  assert.equal(updateArtworkInCatalog.calls.length, 1);
  assert.equal(updatedRequest.toLocation, "North Gallery");
});
