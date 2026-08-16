import { Suspense } from "react";
import { getProductCategories, getProducts } from "@/lib/api";
import ProductListing from "@/components/product-listing";

export const metadata = { title: "全部商品" };
export default async function ProductsPage() {
  const [products, categories] = await Promise.all([getProducts(), getProductCategories().catch(() => [])]);
  return <Suspense><ProductListing products={products} categories={categories} /></Suspense>;
}
