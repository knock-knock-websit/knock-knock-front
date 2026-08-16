import Storefront from "@/components/storefront";
import { getCarousels, getProductCategories, getProducts, getProductsPage } from "@/lib/api";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [products, hotProducts, latestProducts, categories, carousels] = await Promise.all([
    getProducts(),
    getProductsPage({ sort: "popular", pageSize: 5 }).then((result) => result.data).catch(() => []),
    getProductsPage({ sort: "newest", pageSize: 5 }).then((result) => result.data).catch(() => []),
    getProductCategories().catch((error) => {
      console.error("Unable to load product categories from backend API", error);
      return [];
    }),
    getCarousels().catch((error) => {
      console.error("Unable to load carousels from backend API", error);
      return [];
    }),
  ]);
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${siteUrl}/#organization`,
        name: "敲敲韓國代購",
        url: siteUrl,
        logo: `${siteUrl}/og.png`,
      },
      {
        "@type": "CollectionPage",
        "@id": `${siteUrl}/#storefront`,
        url: siteUrl,
        name: "敲敲韓國代購",
        inLanguage: "zh-Hant-TW",
        mainEntity: {
          "@type": "ItemList",
          numberOfItems: products.length,
          itemListElement: products.map((product, index) => ({
            "@type": "ListItem",
            position: index + 1,
            item: {
              "@type": "Product",
              name: product.name,
              description: product.description,
              category: product.category,
              brand: { "@type": "Brand", name: "敲敲韓國代購" },
              offers: {
                "@type": "Offer",
                priceCurrency: "TWD",
                price: product.price,
                availability: product.inventory > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
              },
            },
          })),
        },
      },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, "\\u003c") }} />
      <Storefront products={products} hotProducts={hotProducts} latestProducts={latestProducts} categories={categories} carousels={carousels} />
    </>
  );
}
