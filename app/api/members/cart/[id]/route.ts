import { NextRequest, NextResponse } from "next/server";

const backendUrl = process.env.API_URL ?? "http://localhost:8787";

async function proxy(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const authorization = request.headers.get("Authorization");
  const response = await fetch(`${backendUrl}/api/members/cart/${encodeURIComponent(id)}`, {
    method: request.method,
    headers: {
      Accept: "application/json",
      ...(authorization ? { Authorization: authorization } : {}),
      ...(request.method !== "DELETE" ? { "Content-Type": "application/json" } : {}),
    },
    body: request.method !== "DELETE" ? await request.text() : undefined,
    cache: "no-store",
  });
  return NextResponse.json(await response.json(), { status: response.status, headers: { "Cache-Control": "private, no-store" } });
}

export const PATCH = proxy;
export const PUT = proxy;
export const DELETE = proxy;
