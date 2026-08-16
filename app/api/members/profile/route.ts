import { NextRequest, NextResponse } from "next/server";

const backendUrl = process.env.API_URL ?? "http://localhost:8787";

async function proxy(request: NextRequest, method: "GET" | "PUT") {
  const authorization = request.headers.get("authorization");
  try {
    const response = await fetch(`${backendUrl}/api/members/profile`, {
      method,
      headers: {
        Accept: "application/json",
        ...(method === "PUT" ? { "Content-Type": "application/json" } : {}),
        ...(authorization ? { Authorization: authorization } : {}),
      },
      body: method === "PUT" ? await request.text() : undefined,
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
    console.error("Member profile backend API unavailable", error);
    return NextResponse.json(
      { success: false, message: "會員服務暫時無法使用", data: null },
      { status: 502 },
    );
  }
}

export function GET(request: NextRequest) {
  return proxy(request, "GET");
}

export function PUT(request: NextRequest) {
  return proxy(request, "PUT");
}
