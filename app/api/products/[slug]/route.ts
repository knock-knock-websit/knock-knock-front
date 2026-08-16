import { NextRequest, NextResponse } from "next/server";
import { getProduct } from "@/lib/api";

export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const authorization = request.headers.get("Authorization");
    const product = await getProduct(slug, authorization);
    const responseOptions = {
      headers: {
        "Cache-Control": authorization ? "private, no-store" : "public, s-maxage=60, stale-while-revalidate=300",
        Vary: "Authorization",
      },
    };
    return product ? NextResponse.json({ success: true, message: "操作成功", data: product }, responseOptions) : NextResponse.json({ success: false, message: "找不到商品", data: null }, { ...responseOptions, status: 404 });
  } catch (error) {
    console.error("Product backend API unavailable", error);
    return NextResponse.json({ success: false, message: "商品服務暫時無法使用", data: null }, { status: 502 });
  }
}
