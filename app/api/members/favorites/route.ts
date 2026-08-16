import { NextRequest, NextResponse } from "next/server";

const backendUrl = process.env.API_URL ?? "http://localhost:8787";

async function proxy(request: NextRequest, method: "GET" | "POST") {
  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ") || !authorization.slice(7).trim()) {
    return NextResponse.json(
      { success: false, code: "AUTH_REQUIRED", message: "請先登入會員", data: null },
      { status: 401 },
    );
  }
  try {
    const response = await fetch(`${backendUrl}/api/members/favorites`, {
      method,
      headers: {
        Accept: "application/json",
        ...(method === "POST" ? { "Content-Type": "application/json" } : {}),
        Authorization: authorization,
      },
      body: method === "POST" ? await request.text() : undefined,
      cache: "no-store",
    });
    return new NextResponse(await response.text(), {
      status: response.status,
      headers: {
        "Content-Type": response.headers.get("content-type") ?? "application/json; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Member favorites backend API unavailable", error);
    return NextResponse.json(
      { success: false, message: "會員服務暫時無法使用", data: null },
      { status: 502 },
    );
  }
}

export function GET(request: NextRequest) {
  return proxy(request, "GET");
}

export function POST(request: NextRequest) {
  return proxy(request, "POST");
}
