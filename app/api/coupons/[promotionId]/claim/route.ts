import { NextRequest, NextResponse } from "next/server";
const backendUrl = process.env.API_URL ?? "http://localhost:8787";
export async function POST(request: NextRequest, context: { params: Promise<{ promotionId: string }> }) {
  const { promotionId } = await context.params;
  const authorization = request.headers.get("authorization");
  try {
    const response = await fetch(`${backendUrl}/api/coupons/${encodeURIComponent(promotionId)}/claim`, { method: "POST", headers: { ...(authorization ? { Authorization: authorization } : {}) }, cache: "no-store" });
    return new NextResponse(await response.text(), { status: response.status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });
  } catch { return NextResponse.json({ success: false, message: "優惠服務暫時無法使用", data: null }, { status: 502 }); }
}
