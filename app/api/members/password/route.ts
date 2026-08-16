import { NextRequest, NextResponse } from "next/server";

const backendUrl = process.env.API_URL ?? "http://localhost:8787";

export async function PUT(request: NextRequest) {
  const authorization = request.headers.get("authorization");
  try {
    const response = await fetch(`${backendUrl}/api/members/password`, {
      method: "PUT",
      headers: {
        Accept: "application/json",
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
    console.error("Member password backend API unavailable", error);
    return NextResponse.json(
      { success: false, message: "會員服務暫時無法使用", data: null },
      { status: 502 },
    );
  }
}
