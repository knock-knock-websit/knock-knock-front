import { NextRequest, NextResponse } from "next/server";

const backendUrl = process.env.API_URL ?? "http://localhost:8787";

export async function GET(request: NextRequest) {
  const authorization = request.headers.get("authorization");
  try {
    const response = await fetch(`${backendUrl}/api/members/overview`, {
      headers: {
        Accept: "application/json",
        ...(authorization ? { Authorization: authorization } : {}),
      },
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
    console.error("Member overview backend API unavailable", error);
    return NextResponse.json(
      { success: false, message: "會員服務暫時無法使用", data: null },
      { status: 502 },
    );
  }
}
