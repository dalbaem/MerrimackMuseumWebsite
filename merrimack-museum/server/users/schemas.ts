import { z } from "zod";
import { APP_ROLES } from "@/shared/types/user";
import {
  normalizedEmailSchema,
  optionalTrimmedStringSchema,
} from "@/server/validation/common";

export const userAccessRequestSchema = z.object({
  email: normalizedEmailSchema,
});

const appRoleSchema = z.enum(APP_ROLES);

function decodeRouteParam(value: unknown) {
  if (typeof value !== "string") {
    return value;
  }

  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export const updateUserRoleRequestSchema = z.object({
  email: normalizedEmailSchema,
  role: appRoleSchema,
});

export const userSearchQuerySchema = z.object({
  email: optionalTrimmedStringSchema,
  role: z.preprocess(
    (value) => (value === "" ? undefined : value),
    appRoleSchema.optional(),
  ),
});

export const userEmailParamsSchema = z.object({
  email: z.preprocess(decodeRouteParam, normalizedEmailSchema),
});
