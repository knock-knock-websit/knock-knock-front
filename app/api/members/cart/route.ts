import { NextRequest, NextResponse } from "next/server";

const backendUrl = process.env.API_URL ?? "http://localhost:8787";

async function proxy(request: NextRequest) {
  const authorization = request.headers.get("Authorization");
  const response = await fetch(`${backendUrl}/api/members/cart`, {
    method: request.method,
    headers: {
      Accept: "application/json",
      ...(authorization ? { Authorization: authorization } : {}),
      ...(request.method === "POST" ? { "Content-Type": "application/json" } : {}),
    },
    body: request.method === "POST" ? await request.text() : undefined,
    cache: "no-store",
  });
  return NextResponse.json(await response.json(), { status: response.status, headers: { "Cache-Control": "private, no-store" } });
}

export const GET = proxy;
export const POST = proxy;
