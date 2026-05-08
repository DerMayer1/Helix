import { NextResponse } from "next/server";
import { ZodError } from "zod";

export function jsonOk<TData>(data: TData) {
  return NextResponse.json({ data });
}

export function jsonCreated<TData>(data: TData) {
  return NextResponse.json({ data }, { status: 201 });
}

export function jsonError(error: unknown) {
  if (error instanceof ZodError) {
    return NextResponse.json({
      error: "Validation failed.",
      issues: error.issues
    }, { status: 400 });
  }

  if (error instanceof Error && error.message.includes("Cross-tenant")) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  if (error instanceof Error && error.message.includes("not found")) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  return NextResponse.json({ error: "Internal server error." }, { status: 500 });
}

export async function parseJsonBody(request: Request) {
  return request.json().catch(() => ({}));
}
