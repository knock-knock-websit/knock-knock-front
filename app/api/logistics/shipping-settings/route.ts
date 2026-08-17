import { NextResponse } from "next/server";

const backendUrl = process.env.API_URL ?? "http://localhost:8787";

export async function GET() {
  try {
    const response = await fetch(`${backendUrl}/api/logistics/shipping-settings`, {
      headers: { Accept: "application/json" },
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
    console.error("Shipping settings backend API unavailable", error);
    return NextResponse.json(
      { success: false, message: "物流設定服務暫時無法使用", data: null },
      { status: 502 },
    );
  }
}
