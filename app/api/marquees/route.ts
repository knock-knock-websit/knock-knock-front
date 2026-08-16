const backendUrl = process.env.API_URL ?? "http://localhost:8787";

export async function GET() {
  try {
    const response = await fetch(`${backendUrl}/api/marquees`, {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    const body = await response.text();
    return new Response(body, {
      status: response.status,
      headers: {
        "Content-Type": response.headers.get("Content-Type") ?? "application/json; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return Response.json({ success: false, message: "無法載入跑馬燈", data: [] }, { status: 502 });
  }
}
