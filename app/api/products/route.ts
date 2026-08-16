import { NextRequest, NextResponse } from "next/server";
import { getProductsPage } from "@/lib/api";

export async function GET(request: NextRequest) {
  try {
    const query = Object.fromEntries(request.nextUrl.searchParams.entries());
    const authorization = request.headers.get("Authorization");
    return NextResponse.json(await getProductsPage(query, authorization), {
      headers: {
        "Cache-Control": authorization ? "private, no-store" : "public, s-maxage=60, stale-while-revalidate=300",
        Vary: "Authorization",
      },
    });
  } catch (error) {
    console.error("Products backend API unavailable", error);
    return NextResponse.json({ success: false, message: "商品服務暫時無法使用", data: [] }, { status: 502 });
  }
}
