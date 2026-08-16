import { NextRequest, NextResponse } from "next/server";

const backendUrl = process.env.API_URL ?? "http://localhost:8787";

export async function POST(request: NextRequest) {
  try {
    const authorization = request.headers.get("authorization");
    const response = await fetch(`${backendUrl}/api/orders`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(authorization ? { Authorization: authorization } : {}),
      },
      body: await request.text(),
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
    console.error("Orders backend API unavailable", error);
    return NextResponse.json(
      { success: false, message: "訂單服務暫時無法使用", data: null },
      { status: 502 },
    );
  }
}
