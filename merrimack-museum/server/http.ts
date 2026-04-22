import { NextResponse } from "next/server";
import { z, type ZodType } from "zod";
import { AppError, isAppError } from "@/server/errors";
import { readApiErrorMessage } from "@/shared/apiError";

interface RouteGuardResult<T> {
  actor: T | null;
  response: Response | null;
}

function firstZodMessage(error: z.ZodError) {
  return error.issues[0]?.message || "Invalid request";
}

async function readGuardError(response: Response) {
  const fallbackMessage =
    response.status === 401
      ? "Authentication required"
      : response.status === 403
        ? "Forbidden"
        : "Request failed";

  try {
    const responseText = await response.clone().text();
    return readApiErrorMessage(responseText, fallbackMessage);
  } catch {
    return fallbackMessage;
  }
}

function parseWithSchema<T>(value: unknown, schema: ZodType<T>) {
  try {
    return schema.parse(value);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new AppError(400, firstZodMessage(error));
    }

    throw error;
  }
}

export async function readJsonBody<T>(request: Request, schema: ZodType<T>) {
  try {
    return parseWithSchema(await request.json(), schema);
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new AppError(400, "Invalid JSON request body");
    }

    throw error;
  }
}

export function readQueryParams<T>(params: URLSearchParams, schema: ZodType<T>) {
  return parseWithSchema(Object.fromEntries(params.entries()), schema);
}

export function readRouteParams<T>(params: unknown, schema: ZodType<T>) {
  return parseWithSchema(params, schema);
}

export async function requireGuardActor<T>(
  guardResult: RouteGuardResult<T> | Promise<RouteGuardResult<T>>,
) {
  const { actor, response } = await guardResult;

  if (actor) {
    return actor;
  }

  if (response) {
    throw new AppError(response.status || 500, await readGuardError(response));
  }

  throw new AppError(500, "Expected an authenticated actor");
}

export function handleRouteError(error: unknown) {
  if (isAppError(error)) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }

  console.error(error);
  return NextResponse.json({ error: "Server error" }, { status: 500 });
}
