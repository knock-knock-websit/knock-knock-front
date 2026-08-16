"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { Product, ProductCategory, ProductListResponse, PublicCarousel } from "@/lib/types";
import { formatProductPrice } from "@/lib/product-price";
import ProductArtwork from "@/components/product-artwork";
import FavoriteButton from "@/components/favorite-button";
import { FormInput } from "@/components/form-controls";
import SiteChrome, { addCartItem } from "@/components/site-chrome";
import { getAccessToken, getSession } from "@/lib/client-auth";
import { useFavoriteStore } from "@/lib/favorite-store";

const campaignSlides = [
  { eyebrow: "2026 OFFICIAL COLLECTION", title: <>把喜歡的<br /><em>日常帶走。</em></>, copy: "從舞台的閃耀瞬間，到陪你生活的收藏。每一次心動，都有地方安放。" },
  { eyebrow: "WEEKEND FAN SALE", title: <>應援季，<br /><em>閃耀登場。</em></>, copy: "指定應援商品 88 折，滿 NT$1,500 再享免運。限時到 8 月 8 日。" },
  { eyebrow: "MEMBERS ONLY", title: <>收藏此刻，<br /><em>留住心動。</em></>, copy: "加入會員，享新品優先購與限定生日禮。讓喜歡成為每一天的光。" },
];

const productTagTypeLabel = { popular: "熱門", preorder: "預購", new: "新品", none: "" } as const;

function ProductCard({ product, index }: { product: Product; index: number }) {
  return <article className={`product-card ${product.inventory === 0 ? "sold-out" : ""}`}>
    <div className="product-visual-wrap">
      {product.inventory === 0
        ? <span className="product-tag sold">SOLD OUT</span>
        : product.tagType !== "none" && <span className="product-tag">{productTagTypeLabel[product.tagType]}</span>}
      <Link href={`/products/${product.slug}`}><ProductArtwork product={product} /></Link>
      <FavoriteButton className="card-favorite-button" productId={product.id} productName={product.name} initialFavorite={product.isFavorite} />
    </div>
    <Link href={`/products/${product.slug}`} className="product-info"><span className="product-index">0{index + 1}</span><div><h3>{product.name}</h3><p>{product.category}</p></div><strong>{formatProductPrice(product)}</strong></Link>
  </article>;
}

export default function Storefront({ products, hotProducts, latestProducts, categories, carousels }: { products: Product[]; hotProducts: Product[]; latestProducts: Product[]; categories: ProductCategory[]; carousels: PublicCarousel[] }) {
  const seedFavorites = useFavoriteStore((state) => state.seed);
  const [slide, setSlide] = useState(0);
  const [keyword, setKeyword] = useState("");
  const hot = hotProducts.slice(0, 5);
  const latest = latestProducts.slice(0, 5);
  const campaign = carousels[slide];
  const slideCount = carousels.length || campaignSlides.length;
  const fallbackCampaign = campaignSlides[slide % campaignSlides.length];
  useEffect(() => {
    if (slideCount < 2) return;
    const timer = window.setInterval(() => setSlide((current) => (current + 1) % slideCount), 6000);
    return () => window.clearInterval(timer);
  }, [slideCount]);
  useEffect(() => { if (slide >= slideCount) setSlide(0); }, [slide, slideCount]);
  useEffect(() => {
    const session = getSession();
    const token = getAccessToken();
    if (!session || !token) return;
    void fetch("/api/products?pageSize=5", {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    }).then(async (response) => {
      if (!response.ok) return;
      const payload = await response.json() as ProductListResponse;
      seedFavorites(session.id, payload.data.map((item) => ({ id: item.id, isFavorite: item.isFavorite })));
    }).catch(() => undefined);
  }, [seedFavorites]);

  return <SiteChrome>
    <section className="hero" aria-roledescription="輪播廣告">
      <div className="hero-copy">
        <h1 className={campaign ? "hero-carousel-title" : undefined}>{campaign ? campaign.title : fallbackCampaign.title}</h1><p className="hero-description">{campaign ? campaign.description : fallbackCampaign.copy}</p>
        <Link href={campaign?.linkUrl || "/products"} className="primary-button">{campaign?.linkUrl ? "了解更多" : "探索全系列"} <span>↗</span></Link>
        {slideCount > 1 && <div className="hero-dots" aria-label="切換廣告">{Array.from({ length: slideCount }, (_, i) => <button type="button" key={i} className={slide === i ? "active" : ""} onClick={() => setSlide(i)} aria-label={`第 ${i + 1} 張廣告`} aria-current={slide === i ? "true" : undefined} />)}</div>}
      </div>
      <div className={`hero-visual ${campaign ? "has-carousel-image" : ""}`}>{campaign ? <img className="hero-carousel-image" src={campaign.imageUrl} alt={campaign.title} /> : <><span className="orbit orbit-one" /><span className="orbit orbit-two" /><div className="hero-card card-back"><span>MOON<br />CLUB</span></div><div className="hero-card card-front"><span className="mini-label">COLLECT THE MOMENT</span><div className="portrait-shape"><i /><b>NEW<br />ERA</b></div><span className="card-number">NO. 0{slide + 1} / 03</span></div><div className="sticker">NEW<br />DROP<br /><span>✦</span></div><p className="vertical-copy">YOUR FAVORITE MOMENT, FOREVER.</p></>}</div>
    </section>

    {/*<section className="ticker"><div>LIGHT UP YOUR EVERYDAY <span>✦</span> COLLECT WHAT YOU LOVE <span>✦</span> LIGHT UP YOUR EVERYDAY <span>✦</span></div></section>*/}

    <section className="home-search"><div><p className="eyebrow">FIND YOUR FAVORITE</p><h2>今天想找什麼？</h2></div><form action="/products"><FormInput name="q" value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="搜尋小卡、手燈、服飾…" aria-label="商品關鍵字搜尋" /><button>搜尋 <span>→</span></button></form></section>

    <section className="category-showcase"><div className="section-heading"><div><p className="eyebrow">SHOP BY CATEGORY</p><h2>商品分類</h2></div><Link href="/products">查看全部 →</Link></div><div className="category-tiles">{categories.map((category, index) => <Link key={category.id} href={`/products?categoryId=${encodeURIComponent(category.id)}`}><span>{String(index + 1).padStart(2, "0")} · {category.productCount} ITEMS</span><strong>{category.name}</strong><i>↗</i></Link>)}</div>{!categories.length && <p className="empty-products">無商品分類</p>}</section>

    <section className="shop-section"><div className="section-heading"><div><p className="eyebrow">TRENDING NOW</p><h2>熱門商品</h2></div><p>本週粉絲收藏排行榜，<br />一起帶走大家都在關注的心動。</p></div><div className="product-grid">{hot.map((p, i) => <ProductCard product={p} index={i} key={p.id} />)}</div></section>

    <section className="shop-section alternate"><div className="section-heading"><div><p className="eyebrow">JUST DROPPED</p><h2>最新商品</h2></div><Link href="/products?sort=newest">看更多新品 →</Link></div><div className="product-grid">{latest.map((p, i) => <ProductCard product={p} index={i} key={p.id} />)}</div></section>

    {/*<section className="notice-board"><div><p className="eyebrow">KNOCK-KNOCK NEWS</p><h2>網站公告</h2></div><div><p><time>2026.08.04</time><Link href="/products">七夕應援季活動與出貨時程公告 <span>→</span></Link></p><p><time>2026.07.28</time><Link href="/products">AURORA 應援手燈補貨到著 <span>→</span></Link></p><p><time>2026.07.20</time><Link href="/products">會員點數與退換貨規則更新 <span>→</span></Link></p></div></section>*/}
  </SiteChrome>;
}
