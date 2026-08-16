import { NextRequest, NextResponse } from "next/server";

const backendUrl = process.env.API_URL ?? "http://localhost:8787";

export async function GET(request: NextRequest) {
  try {
    const authorization = request.headers.get("authorization");
    const query = request.nextUrl.searchParams.toString();
    const response = await fetch(`${backendUrl}/api/members/orders${query ? `?${query}` : ""}`, {
      headers: { ...(authorization ? { Authorization: authorization } : {}) }, cache: "no-store",
    });
    return new NextResponse(await response.text(), { status: response.status, headers: { "Content-Type": "application/json", "Cache-Control": "private, no-store" } });
  } catch {
    return NextResponse.json({ success: false, message: "訂單服務暫時無法使用", data: null }, { status: 502 });
  }
}
