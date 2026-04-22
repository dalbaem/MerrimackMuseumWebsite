import { z } from "zod";
import type { ArtworkMutationInput } from "@/server/artworks/types";
import { ARTWORK_AVAILABILITY_OPTIONS } from "@/shared/types/artwork";
import {
  nullableTrimmedStringSchema,
  optionalNullableTrimmedStringSchema,
  optionalTrimmedStringSchema,
  paginationQuerySchema,
  positiveIdSchema,
} from "@/server/validation/common";

const ARTWORK_DIMENSION_PATTERN = /^\d+(?:\.\d+)?$/;
const WHOLE_NUMBER_PATTERN = /^\d+$/;
const CURRENT_YEAR = new Date().getFullYear();

function normalizeNullableScalarInput(value: unknown) {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === "string") {
    const trimmedValue = value.trim();
    return trimmedValue === "" ? null : trimmedValue;
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? String(value) : value;
  }

  return value;
}

function createNullableDecimalInputSchema(fieldLabel: string) {
  return z.preprocess(
    normalizeNullableScalarInput,
    z.string().nullable().superRefine((value, context) => {
      if (value === null) {
        return;
      }

      if (!ARTWORK_DIMENSION_PATTERN.test(value)) {
        context.addIssue({
          code: "custom",
          message: `${fieldLabel} must be a number`,
        });
      }
    }),
  );
}

function createNullableIntegerInputSchema(options: {
  fieldLabel: string;
  min: number;
  max: number;
  rangeMessage: string;
}) {
  return z.preprocess(
    normalizeNullableScalarInput,
    z
      .string()
      .nullable()
      .superRefine((value, context) => {
        if (value === null) {
          return;
        }

        if (!WHOLE_NUMBER_PATTERN.test(value)) {
          context.addIssue({
            code: "custom",
            message: `${options.fieldLabel} must be a whole number`,
          });
          return;
        }

        const parsedValue = Number(value);
        if (parsedValue < options.min || parsedValue > options.max) {
          context.addIssue({
            code: "custom",
            message: options.rangeMessage,
          });
        }
      })
      .transform((value) => (value === null ? null : Number(value))),
  );
}

const nullableMonthInputSchema = createNullableIntegerInputSchema({
  fieldLabel: "Date created month",
  min: 1,
  max: 12,
  rangeMessage: "Date created month must be between 1 and 12",
});

const nullableYearInputSchema = createNullableIntegerInputSchema({
  fieldLabel: "Date created year",
  min: 1,
  max: CURRENT_YEAR,
  rangeMessage: `Date created year must be between 1 and ${CURRENT_YEAR}`,
});

const artworkAvailabilitySchema = z.enum(ARTWORK_AVAILABILITY_OPTIONS);

export const artworkCollectionQuerySchema = paginationQuerySchema.extend({
  availability: artworkAvailabilitySchema.default("all"),
  query: optionalTrimmedStringSchema,
});

export const artworkImageQuerySchema = z.object({
  artwork: positiveIdSchema,
});

export const artworkIdParamsSchema = z.object({
  id: positiveIdSchema,
});

const sharedArtworkFormFields = {
  title: nullableTrimmedStringSchema,
  width: createNullableDecimalInputSchema("Width"),
  height: createNullableDecimalInputSchema("Height"),
  comments: nullableTrimmedStringSchema,
  size: nullableTrimmedStringSchema,
};

const artworkUploadFields = {
  uploadedFileName: optionalTrimmedStringSchema,
  uploadedImage: optionalTrimmedStringSchema,
};

export const artworkMutationRequestSchema = z.object({
  artworkId: positiveIdSchema.optional(),
  title: sharedArtworkFormFields.title,
  artistName: optionalNullableTrimmedStringSchema,
  donorName: optionalNullableTrimmedStringSchema,
  locationName: optionalNullableTrimmedStringSchema,
  categoryName: optionalNullableTrimmedStringSchema,
  width: sharedArtworkFormFields.width,
  height: sharedArtworkFormFields.height,
  dateCreatedMonth: nullableMonthInputSchema.optional(),
  dateCreatedYear: nullableYearInputSchema.optional(),
  comments: sharedArtworkFormFields.comments,
  size: sharedArtworkFormFields.size,
  imagePath: optionalNullableTrimmedStringSchema,
  ...artworkUploadFields,
});

export type ArtworkMutationRequest = z.infer<typeof artworkMutationRequestSchema>;

export function toArtworkMutationInput(
  data: ArtworkMutationRequest,
  imagePath?: string,
): ArtworkMutationInput {
  return {
    title: data.title ?? null,
    artistName: data.artistName ?? null,
    donorName: data.donorName ?? null,
    locationName: data.locationName ?? null,
    categoryName: data.categoryName ?? null,
    width: data.width ?? null,
    height: data.height ?? null,
    dateCreatedMonth: data.dateCreatedMonth ?? null,
    dateCreatedYear: data.dateCreatedYear ?? null,
    comments: data.comments ?? null,
    size: data.size ?? null,
    ...(imagePath !== undefined ? { imagePath } : {}),
  };
}
