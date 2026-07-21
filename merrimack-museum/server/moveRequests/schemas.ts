import { z } from "zod";
import {
  MOVE_REQUEST_APPROVAL_STATUSES,
  MOVE_REQUEST_COMPLETION_STATUSES,
  MOVE_REQUEST_LIST_STATES,
} from "@/shared/types/moveRequest";
import {
  normalizedEmailSchema,
  optionalNullableTrimmedStringSchema,
  positiveIdSchema,
  requestNotesSchema,
} from "@/server/validation/common";

const approvalStatusSchema = z.enum(MOVE_REQUEST_APPROVAL_STATUSES);
const completionStatusSchema = z.enum(MOVE_REQUEST_COMPLETION_STATUSES);
const moveRequestListStateSchema = z.enum(MOVE_REQUEST_LIST_STATES);

export const moveRequestListQuerySchema = z.object({
  state: moveRequestListStateSchema.optional(),
  email: normalizedEmailSchema.optional(),
  artworkId: positiveIdSchema.optional(),
});

export const createMoveRequestSchema = z.object({
  artworkId: positiveIdSchema,
  email: normalizedEmailSchema,
  requestNotes: requestNotesSchema,
  requestedAt: z.string().trim().min(1),
  toLocation: optionalNullableTrimmedStringSchema,
}).transform((value) => ({
  email: value.email,
  artworkId: value.artworkId,
  toLocation: value.toLocation ?? null,
  requestNotes: value.requestNotes ?? null,
  requestedAt: value.requestedAt,
}));

export const moveRequestIdParamsSchema = z.object({
  id: positiveIdSchema,
});

export const editMoveRequestSchema = z.object({
  requestNotes: requestNotesSchema,
  toLocation: optionalNullableTrimmedStringSchema,
});

export const moveRequestApprovalActionRequestSchema = z.object({
  approvalStatus: approvalStatusSchema,
});

export const moveRequestCompletionActionRequestSchema = z.object({
  artworkId: positiveIdSchema.optional(),
  completionStatus: completionStatusSchema,
  toLocation: optionalNullableTrimmedStringSchema,
});
