import { z } from "zod";
import { APP_ROLES } from "@/shared/types/user";
import { normalizedEmailSchema } from "@/server/validation/common";

export const userAccessRequestSchema = z.object({
  email: normalizedEmailSchema,
});

const appRoleSchema = z.enum(APP_ROLES);

export const updateUserRoleRequestSchema = z.object({
  email: normalizedEmailSchema,
  role: appRoleSchema,
});
