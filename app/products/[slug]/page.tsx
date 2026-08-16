import { notFound } from "next/navigation";
import { getProduct, getRelatedProducts } from "@/lib/api";
import ProductDetail from "@/components/product-detail";

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) notFound();
  const related = await getRelatedProducts(slug, 4);
  return <ProductDetail product={product} related={related} />;
}
