import type { Product } from "@/lib/types";

export default function ProductArtwork({ product, variant = 0, imageUrlOverride }: { product: Product; variant?: number; imageUrlOverride?: string | null }) {
  const image = product.images?.[variant] ?? product.images?.find((item) => item.isPrimary) ?? product.images?.[0];
  const imageUrl = imageUrlOverride ?? image?.imageUrl ?? product.imageUrl;

  return (
    <div className={`product-art ${product.tone} gallery-variant-${variant}`} aria-label={`${product.name} 商品圖 ${variant + 1}`}>
      {imageUrl ? <img className="product-photo" src={imageUrl} alt={image?.altText || product.name} loading="lazy" decoding="async" /> : <>
        <span className="art-stars">✦　·　✧</span>
        <div className={`merch-object ${product.visual}`}>
          {product.visual === "photocard" && <><i /><i /><b>MOON<br />PHASE</b></>}
          {product.visual === "lightstick" && <><i>✦</i><b>AURORA</b></>}
          {product.visual === "standee" && <><i /><b>NOVA</b></>}
          {product.visual === "tee" && <b>STAY<br />CLOSE</b>}
          {product.visual === "tote" && <b>STAR<br />MAP ✦</b>}
          {product.visual === "charm" && <><i>☻</i><b>SIGNAL</b></>}
        </div>
        <span className="art-code">OFFICIAL MERCH · 2026</span>
      </>}
    </div>
  );
}
