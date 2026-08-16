import { NextResponse } from "next/server";
import { getProductCategories } from "@/lib/api";

export async function GET() {
  try {
    return NextResponse.json({ success: true, message: "操作成功", data: await getProductCategories() }, { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } });
  } catch (error) {
    console.error("Product categories backend API unavailable", error);
    return NextResponse.json({ success: false, message: "商品分類服務暫時無法使用", data: [] }, { status: 502 });
  }
}
