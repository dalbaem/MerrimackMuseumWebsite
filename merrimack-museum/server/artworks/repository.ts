import { sql } from "kysely";
import { db, type DatabaseExecutor } from "@/server/db/client";
import { normalizeStoredText } from "@/server/db/legacy/transforms";
import type {
  ArtworkMutationInput,
  ArtworkRecord,
} from "@/server/artworks/types";

interface ArtworkRow {
  id: number;
  title: string | null;
  dateCreatedMonth: number | null;
  dateCreatedYear: number | null;
  comments: string | null;
  width: string | null;
  height: string | null;
  size: string | null;
  artistName: string | null;
  donorName: string | null;
  locationName: string | null;
  categoryName: string | null;
  imagePath: string | null;
}

interface ArtworkCollectionQueryOptions {
  executor?: DatabaseExecutor;
  limit?: number;
  offset?: number;
  availableOnly?: boolean;
  keyword?: string;
}

function artworkBaseQuery(executor: DatabaseExecutor = db) {
  return executor
    .selectFrom("artwork as artwork")
    .leftJoin("artist as artist", "artist.idArtist", "artwork.artist_id")
    .leftJoin("donor as donor", "donor.idDonor", "artwork.donor_id")
    .leftJoin("location as location", "location.idLocation", "artwork.location_id")
    .leftJoin("category as category", "category.idCategory", "artwork.category_id")
    .leftJoin("images as images", "images.idimages", "artwork.image_path_id");
}

function artworkSelectQuery(executor: DatabaseExecutor = db) {
  return artworkBaseQuery(executor).select([
    "artwork.idArtwork as id",
    "artwork.title as title",
    "artwork.date_created_month as dateCreatedMonth",
    "artwork.date_created_year as dateCreatedYear",
    "artwork.comments as comments",
    "artwork.width as width",
    "artwork.height as height",
    "artwork.size as size",
    "artist.artist_name as artistName",
    "donor.donor_name as donorName",
    "location.Location as locationName",
    "category.category as categoryName",
    "images.image_path as imagePath",
  ]);
}
function mapArtworkRow(row: ArtworkRow): ArtworkRecord {
  return {
    id: row.id,
    title: normalizeStoredText(row.title),
    dateCreatedMonth: row.dateCreatedMonth,
    dateCreatedYear: row.dateCreatedYear,
    comments: normalizeStoredText(row.comments),
    width: normalizeStoredText(row.width),
    height: normalizeStoredText(row.height),
    size: normalizeStoredText(row.size),
    artistName: normalizeStoredText(row.artistName),
    donorName: normalizeStoredText(row.donorName),
    locationName: normalizeStoredText(row.locationName),
    categoryName: normalizeStoredText(row.categoryName),
    imagePath: normalizeStoredText(row.imagePath),
  };
}

function splitArtworkKeywords(keyword: string | undefined) {
  return (keyword ?? "")
    .split(/\s+/)
    .map((value) => value.trim())
    .filter(Boolean);
}

async function selectArtworkRows(options: ArtworkCollectionQueryOptions = {}) {
  let query = artworkSelectQuery(options.executor).orderBy("artwork.idArtwork").distinct();

  if (options.availableOnly) {
    query = query.where((expressionBuilder) =>
      expressionBuilder.not(
        expressionBuilder.exists(
          expressionBuilder
            .selectFrom("move_request as active_move_request")
            .select("active_move_request.idmove_request")
            .whereRef("active_move_request.artwork_id", "=", "artwork.idArtwork")
            .where((innerBuilder) =>
              innerBuilder.or([
                innerBuilder.eb("active_move_request.is_pending", "=", 1),
                innerBuilder.and([
                  innerBuilder.eb("active_move_request.is_approved", "=", 1),
                  innerBuilder.eb("active_move_request.is_complete", "=", 0),
                ]),
              ]),
            ),
        ),
      ),
    );
  }

  const keywordList = splitArtworkKeywords(options.keyword);
  if (keywordList.length > 0) {
    query = query.where((expressionBuilder) =>
      expressionBuilder.or(
        keywordList.flatMap((keyword) => {
          const pattern = `%${keyword}%`;

          return [
            sql<boolean>`coalesce(${sql.ref("artwork.title")}, '') like ${pattern}`,
            sql<boolean>`coalesce(${sql.ref("artwork.comments")}, '') like ${pattern}`,
            sql<boolean>`cast(${sql.ref("artwork.width")} as char) like ${pattern}`,
            sql<boolean>`cast(${sql.ref("artwork.height")} as char) like ${pattern}`,
            sql<boolean>`coalesce(${sql.ref("location.Location")}, '') like ${pattern}`,
            sql<boolean>`coalesce(${sql.ref("donor.donor_name")}, '') like ${pattern}`,
            sql<boolean>`coalesce(${sql.ref("category.category")}, '') like ${pattern}`,
            sql<boolean>`coalesce(${sql.ref("artist.artist_name")}, '') like ${pattern}`,
            sql<boolean>`cast(${sql.ref("artwork.date_created_year")} as char) like ${pattern}`,
          ];
        }),
      ),
    );
  }

  if (options.offset && options.offset > 0) {
    query = query.offset(options.offset);
  }

  if (options.limit !== undefined) {
    query = query.limit(options.limit);
  }

  return query.execute();
}

interface ArtworkRelationLookup {
  createId: (executor: DatabaseExecutor, value: string) => Promise<number>;
  findId: (executor: DatabaseExecutor, value: string) => Promise<number | null>;
}

async function findOrCreateArtworkRelationId(
  executor: DatabaseExecutor,
  value: string | null | undefined,
  lookup: ArtworkRelationLookup,
) {
  const normalizedValue = normalizeStoredText(value);
  if (!normalizedValue) {
    return null;
  }

  const existingId = await lookup.findId(executor, normalizedValue);
  if (existingId !== null) {
    return existingId;
  }

  return lookup.createId(executor, normalizedValue);
}

const artistLookup: ArtworkRelationLookup = {
  async createId(executor, value) {
    const inserted = await executor
      .insertInto("artist")
      .values({ artist_name: value })
      .executeTakeFirst();

    return Number(inserted.insertId);
  },
  async findId(executor, value) {
    const existing = await executor
      .selectFrom("artist")
      .select("idArtist")
      .where("artist_name", "=", value)
      .executeTakeFirst();

    return existing ? Number(existing.idArtist) : null;
  },
};

const donorLookup: ArtworkRelationLookup = {
  async createId(executor, value) {
    const inserted = await executor
      .insertInto("donor")
      .values({ donor_name: value })
      .executeTakeFirst();

    return Number(inserted.insertId);
  },
  async findId(executor, value) {
    const existing = await executor
      .selectFrom("donor")
      .select("idDonor")
      .where("donor_name", "=", value)
      .executeTakeFirst();

    return existing ? Number(existing.idDonor) : null;
  },
};

const locationLookup: ArtworkRelationLookup = {
  async createId(executor, value) {
    const inserted = await executor
      .insertInto("location")
      .values({ Location: value })
      .executeTakeFirst();

    return Number(inserted.insertId);
  },
  async findId(executor, value) {
    const existing = await executor
      .selectFrom("location")
      .select("idLocation")
      .where("Location", "=", value)
      .executeTakeFirst();

    return existing ? Number(existing.idLocation) : null;
  },
};

const categoryLookup: ArtworkRelationLookup = {
  async createId(executor, value) {
    const inserted = await executor
      .insertInto("category")
      .values({ category: value })
      .executeTakeFirst();

    return Number(inserted.insertId);
  },
  async findId(executor, value) {
    const existing = await executor
      .selectFrom("category")
      .select("idCategory")
      .where("category", "=", value)
      .executeTakeFirst();

    return existing ? Number(existing.idCategory) : null;
  },
};

const imageLookup: ArtworkRelationLookup = {
  async createId(executor, value) {
    const inserted = await executor
      .insertInto("images")
      .values({ image_path: value })
      .executeTakeFirst();

    return Number(inserted.insertId);
  },
  async findId(executor, value) {
    const existing = await executor
      .selectFrom("images")
      .select("idimages")
      .where("image_path", "=", value)
      .executeTakeFirst();

    return existing ? Number(existing.idimages) : null;
  },
};

async function resolveArtworkRelationIds(
  executor: DatabaseExecutor,
  input: ArtworkMutationInput,
) {
  return {
    artist_id: await findOrCreateArtworkRelationId(
      executor,
      input.artistName,
      artistLookup,
    ),
    donor_id: await findOrCreateArtworkRelationId(
      executor,
      input.donorName,
      donorLookup,
    ),
    location_id: await findOrCreateArtworkRelationId(
      executor,
      input.locationName,
      locationLookup,
    ),
    category_id: await findOrCreateArtworkRelationId(
      executor,
      input.categoryName,
      categoryLookup,
    ),
    image_path_id:
      "imagePath" in input
        ? await findOrCreateArtworkRelationId(
            executor,
            input.imagePath,
            imageLookup,
          )
        : undefined,
  };
}

export async function listArtworks(options?: {
  executor?: DatabaseExecutor;
  limit?: number;
  offset?: number;
}) {
  const rows = await selectArtworkRows(options);
  return rows.map(mapArtworkRow);
}

export async function listAvailableArtworks(options?: {
  executor?: DatabaseExecutor;
  limit?: number;
  offset?: number;
}) {
  const rows = await selectArtworkRows({
    ...options,
    availableOnly: true,
  });
  return rows.map(mapArtworkRow);
}

export async function searchArtworks(
  keyword: string,
  options: {
    executor?: DatabaseExecutor;
    limit?: number;
    offset?: number;
    availableOnly?: boolean;
  } = {},
) {
  const rows = await selectArtworkRows({
    ...options,
    keyword,
  });
  return rows.map(mapArtworkRow);
}

export async function findArtworkById(
  id: number,
  executor: DatabaseExecutor = db,
) {
  const row = await artworkSelectQuery(executor)
    .where("artwork.idArtwork", "=", id)
    .executeTakeFirst();

  return row ? mapArtworkRow(row) : null;
}

export async function findArtworkImageByArtworkId(
  id: number,
  executor: DatabaseExecutor = db,
) {
  const artwork = await findArtworkById(id, executor);
  return artwork?.imagePath || null;
}

export async function createArtwork(input: ArtworkMutationInput) {
  return db.transaction().execute(async (trx) => {
    const relationIds = await resolveArtworkRelationIds(trx, input);

    const insertResult = await trx
      .insertInto("artwork")
      .values({
        title: input.title,
        date_created_month: input.dateCreatedMonth,
        date_created_year: input.dateCreatedYear,
        comments: input.comments,
        width: input.width,
        height: input.height,
        size: input.size,
        artist_id: relationIds.artist_id,
        donor_id: relationIds.donor_id,
        location_id: relationIds.location_id,
        category_id: relationIds.category_id,
        image_path_id: relationIds.image_path_id ?? null,
      })
      .executeTakeFirst();

    return findArtworkById(Number(insertResult.insertId), trx);
  });
}

export async function updateArtwork(
  id: number,
  input: ArtworkMutationInput,
  executor: DatabaseExecutor = db,
) {
  const runUpdate = async (trx: DatabaseExecutor) => {
    const relationIds = await resolveArtworkRelationIds(trx, input);
    const updateValues: Record<string, unknown> = {
      title: input.title,
      date_created_month: input.dateCreatedMonth,
      date_created_year: input.dateCreatedYear,
      comments: input.comments,
      width: input.width,
      height: input.height,
      size: input.size,
      artist_id: relationIds.artist_id,
      donor_id: relationIds.donor_id,
      location_id: relationIds.location_id,
      category_id: relationIds.category_id,
    };

    if ("imagePath" in input) {
      updateValues.image_path_id = relationIds.image_path_id ?? null;
    }

    await trx
      .updateTable("artwork")
      .set(updateValues)
      .where("idArtwork", "=", id)
      .execute();

    return findArtworkById(id, trx);
  };

  if (executor === db) {
    return db.transaction().execute(runUpdate);
  }

  return runUpdate(executor);
}

export async function deleteArtwork(id: number, executor: DatabaseExecutor = db) {
  await executor.deleteFrom("artwork").where("idArtwork", "=", id).execute();
}
