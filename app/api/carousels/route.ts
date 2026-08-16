const backendUrl = process.env.API_URL ?? "http://localhost:8787";

export async function GET() {
  try {
    const response = await fetch(`${backendUrl}/api/carousels`, {
      headers: { Accept: "application/json" },
      next: { revalidate: 60 },
    });
    const body = await response.text();
    return new Response(body, {
      status: response.status,
      headers: { "Content-Type": response.headers.get("Content-Type") ?? "application/json; charset=utf-8" },
    });
  } catch {
    return Response.json({ success: false, message: "無法載入輪播", data: [] }, { status: 502 });
  }
}
