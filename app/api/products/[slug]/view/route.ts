import { NextResponse } from "next/server";

const backendUrl = process.env.API_URL ?? "http://localhost:8787";

export async function POST(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const response = await fetch(`${backendUrl}/api/products/${encodeURIComponent(slug)}/view`, {
      method: "POST",
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    const body = await response.text();
    return new Response(body, {
      status: response.status,
      headers: { "Content-Type": response.headers.get("Content-Type") ?? "application/json; charset=utf-8" },
    });
  } catch {
    return NextResponse.json({ success: false, message: "無法更新瀏覽數", data: null }, { status: 502 });
  }
}
