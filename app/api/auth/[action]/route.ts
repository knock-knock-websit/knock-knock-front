import { NextRequest, NextResponse } from "next/server";

const backendUrl = process.env.API_URL ?? "http://localhost:8787";
const allowedActions = new Set([
  "register",
  "verify-email",
  "resend-verification",
  "login",
  "logout",
  "request-password-reset",
  "reset-password",
]);

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ action: string }> },
) {
  const { action } = await context.params;
  if (!allowedActions.has(action)) {
    return NextResponse.json(
      { success: false, message: "找不到會員 API", data: null },
      { status: 404 },
    );
  }

  try {
    const authorization = request.headers.get("authorization");
    const body = await request.text();
    const response = await fetch(`${backendUrl}/api/auth/${action}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(authorization ? { Authorization: authorization } : {}),
      },
      body: body || undefined,
      cache: "no-store",
    });
    // 登入與註冊的可預期表單錯誤交由 response body 的 success/code 判斷，
    // 對前台統一回傳 HTTP 200，避免被基礎設施視為請求失敗。
    const status = (action === "login" || action === "register") && !response.ok
      ? 200
      : response.status;
    return new NextResponse(await response.text(), {
      status,
      headers: {
        "Content-Type": response.headers.get("content-type") ?? "application/json; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error(`Member backend API unavailable: ${action}`, error);
    return NextResponse.json(
      { success: false, message: "會員服務暫時無法使用，請稍後再試", data: null },
      { status: 502 },
    );
  }
}
