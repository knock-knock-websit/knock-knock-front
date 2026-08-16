import { NextRequest, NextResponse } from "next/server";

const backendUrl = process.env.API_URL ?? "http://localhost:8787";

async function proxy(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
  method: "PUT" | "DELETE",
) {
  const { id } = await context.params;
  const authorization = request.headers.get("authorization");
  try {
    const response = await fetch(`${backendUrl}/api/members/addresses/${encodeURIComponent(id)}`, {
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
    console.error("Member address backend API unavailable", error);
    return NextResponse.json(
      { success: false, message: "會員服務暫時無法使用", data: null },
      { status: 502 },
    );
  }
}

export function PUT(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  return proxy(request, context, "PUT");
}

export function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  return proxy(request, context, "DELETE");
}
