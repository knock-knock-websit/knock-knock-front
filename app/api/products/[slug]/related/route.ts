import { NextRequest, NextResponse } from "next/server";
import { getRelatedProducts } from "@/lib/api";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params;
    const limit = Number(request.nextUrl.searchParams.get("limit") ?? "4");
    if (!Number.isInteger(limit) || limit < 1 || limit > 12) {
      return NextResponse.json(
        { success: false, message: "limit 必須是 1 至 12 的整數", data: null },
        { status: 400 },
      );
    }
    const authorization = request.headers.get("Authorization");
    const related = await getRelatedProducts(slug, limit, authorization);
    return NextResponse.json({ success: true, message: "操作成功", data: related }, {
      headers: {
        "Cache-Control": authorization ? "private, no-store" : "public, s-maxage=60, stale-while-revalidate=300",
        Vary: "Authorization",
      },
    });
  } catch (error) {
    console.error("Related products backend API unavailable", error);
    return NextResponse.json(
      { success: false, message: "商品服務暫時無法使用", data: null },
      { status: 502 },
    );
  }
}
