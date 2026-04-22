import { z } from "zod";
import { MOVE_REQUEST_NOTES_MAX_LENGTH } from "@/shared/types/moveRequest";

function trimStringValue(value: unknown) {
  return typeof value === "string" ? value.trim() : value;
}

function normalizeText(value: unknown) {
  if (value == null) {
    return null;
  }

  const text = String(value).trim();
  return text || null;
}

export const optionalTrimmedStringSchema = z.preprocess(
  trimStringValue,
  z.string().optional(),
);

export const nullableTrimmedStringSchema = z.preprocess(
  normalizeText,
  z.string().nullable(),
);

export const optionalNullableTrimmedStringSchema = z.preprocess(
  (value) => {
    if (value === undefined) {
      return undefined;
    }

    return normalizeText(value);
  },
  z.string().nullable().optional(),
);

export const normalizedEmailSchema = z
  .string()
  .transform((value) => value.trim().toLowerCase())
  .pipe(z.string().email());

export const positiveIdSchema = z.preprocess((value) => {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed === "" ? Number.NaN : trimmed;
  }

  return value;
}, z.coerce.number().int().positive());

export const paginationQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional(),
  offset: z.coerce.number().int().min(0).default(0),
});

export const requestNotesSchema = z.preprocess(
  (value) => {
    if (value === undefined) {
      return undefined;
    }

    return normalizeText(value);
  },
  z.string().max(MOVE_REQUEST_NOTES_MAX_LENGTH).nullable().optional(),
);
