"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import type { Product, ProductDetail as ProductDetailType } from "@/lib/types";
import ProductArtwork from "@/components/product-artwork";
import FavoriteButton from "@/components/favorite-button";
import {addCartItem, SiteChrome} from "@/components/site-chrome";
import { getAccessToken, getSession } from "@/lib/client-auth";
import { useFavoriteStore } from "@/lib/favorite-store";
import { showToast } from "@/lib/toast";

function initialSelections(product: ProductDetailType): Record<string, string> {
  const firstVariant = product.variants[0];
  return Object.fromEntries(
    product.specifications.map((specification) => [
      specification.id,
      firstVariant?.optionValues.find((value) => value.specificationId === specification.id)?.optionId ??
        specification.options[0]?.id ??
        "",
    ]),
  );
}

export default function ProductDetail({ product, related }: { product: ProductDetailType; related: Product[] }) {
  const router = useRouter();
  const seedFavorites = useFavoriteStore((state) => state.seed);
  const [image, setImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>(
    () => initialSelections(product),
  );
  const selectedOptionIds = Object.values(selectedOptions).filter(Boolean);
  const selectedVariant = product.variants.find(
    (variant) => selectedOptionIds.length === variant.optionValueIds.length &&
      selectedOptionIds.every((optionId) => variant.optionValueIds.includes(optionId)),
  ) ?? product.variants[0];
  const price = selectedVariant?.price ?? product.price;
  const compareAtPrice = selectedVariant?.compareAtPrice ?? product.compareAtPrice ?? null;
  const availableStock = selectedVariant?.stock ?? product.inventory;
  const galleryImages = useMemo(() => {
    const images = (product.images ?? []).map((item) => ({ id: item.id, imageUrl: item.imageUrl }));
    product.variants.forEach((variant) => {
      if (variant.imageUrl && !images.some((image) => image.imageUrl === variant.imageUrl)) {
        images.push({ id: `variant-${variant.id}`, imageUrl: variant.imageUrl });
      }
    });
    return images;
  }, [product.images, product.variants]);
  const galleryIndexes = galleryImages.length ? galleryImages.map((_, index) => index) : [0, 1, 2];
  const selectSpecificationOption = (specificationId: string, optionId: string) => {
    const nextSelections = { ...selectedOptions, [specificationId]: optionId };
    setSelectedOptions(nextSelections);
    const nextOptionIds = Object.values(nextSelections).filter(Boolean);
    const nextVariant = product.variants.find(
      (variant) => nextOptionIds.length === variant.optionValueIds.length &&
        nextOptionIds.every((selectedOptionId) => variant.optionValueIds.includes(selectedOptionId)),
    );
    if (nextVariant?.imageUrl) {
      const variantImageIndex = galleryImages.findIndex((item) => item.imageUrl === nextVariant.imageUrl);
      if (variantImageIndex >= 0) setImage(variantImageIndex);
    }
  };
  useEffect(() => {
    void fetch(`/api/products/${encodeURIComponent(product.slug)}/view`, {
      method: "POST",
      keepalive: true,
    }).catch(() => undefined);
  }, [product.slug]);
  useEffect(() => {
    const session = getSession();
    const token = getAccessToken();
    if (!session || !token) return;
    const headers = { Authorization: `Bearer ${token}` };
    void Promise.all([
      fetch(`/api/products/${encodeURIComponent(product.slug)}`, { headers, cache: "no-store" }),
      fetch(`/api/products/${encodeURIComponent(product.slug)}/related?limit=4`, { headers, cache: "no-store" }),
    ]).then(async ([detailResponse, relatedResponse]) => {
      const statuses: Array<{ id: string; isFavorite: boolean }> = [];
      if (detailResponse.ok) {
        const payload = await detailResponse.json() as { data: ProductDetailType };
        statuses.push({ id: payload.data.id, isFavorite: payload.data.isFavorite });
      }
      if (relatedResponse.ok) {
        const payload = await relatedResponse.json() as { data: Product[] };
        statuses.push(...payload.data.map((item) => ({ id: item.id, isFavorite: item.isFavorite })));
      }
      seedFavorites(session.id, statuses);
    }).catch(() => undefined);
  }, [product.slug, seedFavorites]);
  const add = async (message = `已加入購物車 · ${quantity} 件`) => {
    try {
      await addCartItem(product.id, quantity, selectedVariant?.id);
      showToast(message);
    } catch (error) {
      if (error instanceof Error && error.message === "AUTH_REQUIRED") { window.location.assign("/auth/login"); return; }
      showToast(error instanceof Error ? error.message : "加入購物車失敗", "error");
    }
  };
  const buyNow = async () => {
    try {
      await addCartItem(product.id, quantity, selectedVariant?.id);
      router.push("/cart");
    } catch (error) {
      if (error instanceof Error && error.message === "AUTH_REQUIRED") {
        window.location.assign("/auth/login");
        return;
      }
      showToast(error instanceof Error ? error.message : "加入購物車失敗", "error");
    }
  };
  return <SiteChrome><nav className="breadcrumbs"><Link href="/">首頁</Link><span>/</span><Link href="/products">全部商品</Link><span>/</span><b>{product.name}</b></nav>
    <section className="detail-layout">
      <div className="gallery"><div className="gallery-main"><ProductArtwork product={product} variant={image} imageUrlOverride={galleryImages[image]?.imageUrl} /></div><div className="gallery-thumbs">{galleryIndexes.map((i) => <button className={image === i ? "active" : ""} onClick={() => setImage(i)} aria-label={`查看${product.name}第 ${i + 1} 張圖片`} key={i}><ProductArtwork product={product} variant={i} imageUrlOverride={galleryImages[i]?.imageUrl} /></button>)}</div></div>
      <div className="detail-copy"><p className="eyebrow">{product.category}</p><div className="detail-title"><h1>{product.name}</h1><FavoriteButton productId={product.id} productName={product.name} initialFavorite={product.isFavorite} /></div><div className="detail-price"><strong>NT$ {price.toLocaleString()}</strong>{compareAtPrice != null && compareAtPrice > price && <><del>NT$ {compareAtPrice.toLocaleString()}</del><span>{Math.round((1 - price / compareAtPrice) * 100)}% OFF</span></>}</div><p className="stock">{availableStock > 0 ? <>● 現貨供應 · 尚有 {availableStock} 件</> : <>○ 商品已售完</>}</p>
        {product.specificationsEnabled && product.specifications.map((specification) => {
          const selectedOption = specification.options.find((option) => option.id === selectedOptions[specification.id]);
          return <div className="option-group" key={specification.id}><div><b>{specification.name}</b><span>已選：{selectedOption?.name ?? "尚未選擇"}</span></div><div className="option-buttons">{specification.options.map((option) => {
            const available = product.variants.some((variant) => variant.stock > 0 &&
              variant.optionValueIds.includes(option.id) &&
              Object.entries(selectedOptions).every(([specificationId, optionId]) =>
                specificationId === specification.id || variant.optionValueIds.includes(optionId)));
            return <button disabled={!available} className={selectedOptions[specification.id] === option.id ? "active" : ""} onClick={() => selectSpecificationOption(specification.id, option.id)} key={option.id}>{option.name}</button>;
          })}</div></div>;
        })}
        <div className="buy-row"><div className="detail-quantity"><button onClick={() => setQuantity(Math.max(1, quantity - 1))}>−</button><span>{quantity}</span><button onClick={() => setQuantity(Math.max(1, Math.min(10, availableStock, quantity + 1)))}>＋</button></div><button className="add-button" disabled={!availableStock} onClick={() => void add()}>{availableStock ? "加入購物車" : "商品已售完"}</button></div><button className="buy-now" disabled={!availableStock} onClick={() => void buyNow()}>立即購買 <span>→</span></button>
        <details open><summary>商品介紹</summary><p>{product.description}</p></details>
      </div>
    </section>
    <section className="related"><div className="section-heading"><div><p className="eyebrow">YOU MAY ALSO LIKE</p><h2>相關商品</h2></div><Link href="/products">查看全部 →</Link></div>{related.length ? <div className="catalog-grid">{related.map((item) => <article className="catalog-card" key={item.id}><div className="product-visual-wrap"><Link href={`/products/${item.slug}`}><ProductArtwork product={item} /></Link><FavoriteButton className="card-favorite-button" productId={item.id} productName={item.name} initialFavorite={item.isFavorite} /></div><Link href={`/products/${item.slug}`} className="catalog-copy"><p>{item.category}</p><h2>{item.name}</h2><strong>NT$ {item.price.toLocaleString()}</strong></Link></article>)}</div> : <div className="related-empty">無相關商品</div>}</section>
  </SiteChrome>;
}
