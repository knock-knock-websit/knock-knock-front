"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { Product, ProductCategory, ProductListResponse } from "@/lib/types";
import { formatProductPrice } from "@/lib/product-price";
import ProductArtwork from "@/components/product-artwork";
import FavoriteButton from "@/components/favorite-button";
import { FormInput, FormRadio, FormSelect } from "@/components/form-controls";
import {addCartItem, SiteChrome} from "@/components/site-chrome";
import { getAccessToken } from "@/lib/client-auth";

const PAGE_SIZE = 30;
type ProductTagTypeFilter = "" | "new" | "popular" | "preorder";
const productTagTypeLabel = { popular: "熱門", preorder: "預購", new: "新品", none: "" } as const;
const sortOptions = [
  { value: "popular", label: "熱門優先" },
  { value: "newest", label: "由新至舊" },
  { value: "oldest", label: "由舊至新" },
  { value: "price-low", label: "價格低至高" },
  { value: "price-high", label: "價格高至低" },
] as const;

function findCategory(categories: ProductCategory[], id: string): ProductCategory | undefined {
  for (const category of categories) {
    if (category.id === id) return category;
    const child = findCategory(category.children, id);
    if (child) return child;
  }
}

function findCategoryAncestors(categories: ProductCategory[], id: string, ancestors: string[] = []): string[] {
  for (const category of categories) {
    if (category.id === id) return ancestors;
    const found = findCategoryAncestors(category.children, id, [...ancestors, category.id]);
    if (found.length) return found;
  }
  return [];
}

function CategoryNode({ category, selectedId, expanded, onSelect, onToggle }: {
  category: ProductCategory;
  selectedId: string;
  expanded: Set<string>;
  onSelect: (category: ProductCategory) => void;
  onToggle: (id: string) => void;
}) {
  const hasChildren = category.children.length > 0;
  const isExpanded = expanded.has(category.id);
  return <div className="category-tree-node">
    <div className="category-tree-row" style={{ paddingLeft: `${category.level * 15}px` }}>
      <button type="button" className="category-toggle" disabled={!hasChildren} onClick={() => onToggle(category.id)} aria-label={`${isExpanded ? "收合" : "展開"}${category.name}`} aria-expanded={hasChildren ? isExpanded : undefined}>{hasChildren ? (isExpanded ? "−" : "+") : "·"}</button>
      <label className="radio"><FormRadio name="product-category" checked={selectedId === category.id} onChange={() => onSelect(category)} /><span>{category.name}</span><b>{category.productCount}</b></label>
    </div>
    {hasChildren && isExpanded && <div className="category-tree-children">{category.children.map((child) => <CategoryNode category={child} selectedId={selectedId} expanded={expanded} onSelect={onSelect} onToggle={onToggle} key={child.id} />)}</div>}
  </div>;
}

export default function ProductListing({ products, categories }: { products: Product[]; categories: ProductCategory[] }) {
  const params = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const initialCategoryId = params.get("categoryId") || "";
  const [categoryId, setCategoryId] = useState(initialCategoryId);
  const [query, setQuery] = useState(params.get("q") || "");
  const [min, setMin] = useState(params.get("minPrice") || "");
  const [max, setMax] = useState(params.get("maxPrice") || "");
  const initialTagType = (["new", "popular", "preorder"].includes(params.get("tagType") ?? "") ? params.get("tagType") : "") as ProductTagTypeFilter;
  const [tagType, setTagType] = useState<ProductTagTypeFilter>(initialTagType);
  const [appliedFilters, setAppliedFilters] = useState({ categoryId: initialCategoryId, query: params.get("q") || "", min: params.get("minPrice") || "", max: params.get("maxPrice") || "", tagType: initialTagType });
  const initialSort = ["newest", "oldest", "popular", "price-low", "price-high"].includes(params.get("sort") ?? "") ? params.get("sort")! : "popular";
  const [sort, setSort] = useState(initialSort);
  const [page, setPage] = useState(Math.max(1, Number.parseInt(params.get("page") ?? "1", 10) || 1));
  const [shown, setShown] = useState(products.slice(0, PAGE_SIZE));
  const [expandedCategories, setExpandedCategories] = useState(() => new Set([
    ...categories.filter((item) => item.children.length).map((item) => item.id),
    ...findCategoryAncestors(categories, initialCategoryId),
  ]));
  const [total, setTotal] = useState(products.length);
  const [pages, setPages] = useState(Math.max(1, Math.ceil(products.length / PAGE_SIZE)));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const selectedCategory = appliedFilters.categoryId ? findCategory(categories, appliedFilters.categoryId) : undefined;
  const toggleCategory = (id: string) => setExpandedCategories((current) => { const next = new Set(current); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  const updateUrl = (filters: typeof appliedFilters, nextSort: string, nextPage: number) => {
    const search = new URLSearchParams();
    if (nextPage > 1) search.set("page", String(nextPage));
    if (nextSort !== "popular") search.set("sort", nextSort);
    if (filters.query) search.set("q", filters.query);
    if (filters.categoryId) search.set("categoryId", filters.categoryId);
    if (filters.tagType) search.set("tagType", filters.tagType);
    if (filters.min) search.set("minPrice", filters.min);
    if (filters.max) search.set("maxPrice", filters.max);
    const queryString = search.toString();
    router.push(queryString ? `${pathname}?${queryString}` : pathname, { scroll: false });
  };
  const selectCategory = (category: ProductCategory) => {
    setCategoryId(category.id);
    if (category.children.length) setExpandedCategories((current) => new Set(current).add(category.id));
  };
  const applyFilters = () => {
    const nextFilters = { categoryId, query: query.trim(), min, max, tagType };
    setAppliedFilters(nextFilters);
    setPage(1);
    updateUrl(nextFilters, sort, 1);
  };
  const clearFilters = () => {
    setCategoryId("");
    setQuery("");
    setMin("");
    setMax("");
    setTagType("");
    const nextFilters = { categoryId: "", query: "", min: "", max: "", tagType: "" } as const;
    setAppliedFilters(nextFilters);
    setPage(1);
    updateUrl(nextFilters, sort, 1);
  };
  const changeSort = (nextSort: string) => {
    setSort(nextSort);
    setPage(1);
    updateUrl(appliedFilters, nextSort, 1);
  };
  const changePage = (nextPage: number) => {
    setPage(nextPage);
    updateUrl(appliedFilters, sort, nextPage);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const urlQuery = params.toString();
  useEffect(() => {
    const current = new URLSearchParams(urlQuery);
    const nextCategoryId = current.get("categoryId") || "";
    const nextQuery = current.get("q") || "";
    const nextMin = current.get("minPrice") || "";
    const nextMax = current.get("maxPrice") || "";
    const nextTagType = (["new", "popular", "preorder"].includes(current.get("tagType") ?? "") ? current.get("tagType") : "") as ProductTagTypeFilter;
    const sortParam = current.get("sort") || "popular";
    const nextSort = ["newest", "oldest", "popular", "price-low", "price-high"].includes(sortParam) ? sortParam : "popular";
    const nextPage = Math.max(1, Number.parseInt(current.get("page") ?? "1", 10) || 1);
    const nextFilters = { categoryId: nextCategoryId, query: nextQuery, min: nextMin, max: nextMax, tagType: nextTagType };

    setCategoryId(nextCategoryId);
    setQuery(nextQuery);
    setMin(nextMin);
    setMax(nextMax);
    setTagType(nextTagType);
    setAppliedFilters((existing) => Object.entries(nextFilters).every(([key, value]) => existing[key as keyof typeof existing] === value) ? existing : nextFilters);
    setSort(nextSort);
    setPage(nextPage);
    setExpandedCategories((existing) => new Set([...existing, ...findCategoryAncestors(categories, nextCategoryId)]));
  }, [urlQuery, categories]);

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true); setError("");
      const search = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE), sort });
      if (appliedFilters.query) search.set("search", appliedFilters.query);
      if (appliedFilters.categoryId) search.set("categoryId", appliedFilters.categoryId);
      if (appliedFilters.min) search.set("minPrice", appliedFilters.min);
      if (appliedFilters.max) search.set("maxPrice", appliedFilters.max);
      if (appliedFilters.tagType) search.set("tagType", appliedFilters.tagType);
      try {
        const accessToken = getAccessToken();
        const response = await fetch(`/api/products?${search}`, {
          signal: controller.signal,
          headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
          cache: accessToken ? "no-store" : "default",
        });
        if (!response.ok) throw new Error("商品 API 回應失敗");
        const payload = await response.json() as ProductListResponse;
        setShown(payload.data); setTotal(payload.pagination.total); setPages(payload.pagination.totalPages);
      } catch (cause) {
        if (cause instanceof DOMException && cause.name === "AbortError") return;
        setError("目前無法載入商品，請稍後再試。");
      } finally { if (!controller.signal.aborted) setLoading(false); }
    }, 250);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [appliedFilters, sort, page]);

  return <SiteChrome><div className="listing-hero"><p className="eyebrow">ALL COLLECTIONS</p><h1>找到你的<br /><em>命定收藏。</em></h1></div>
    <div className="catalog-layout">
      <aside className="filters"><div className="filter-title"><h2>篩選商品</h2></div><label>關鍵字搜尋<FormInput autoFocus={params.get("focus") === "search"} value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(event) => { if (event.key === "Enter") applyFilters(); }} placeholder="搜尋商品名稱" /></label><fieldset><h4>商品分類</h4><div className="category-tree"><div className="category-tree-row all-category"><span className="category-toggle">⌂</span><label className="radio"><FormRadio name="product-category" checked={!categoryId} onChange={() => setCategoryId("")} /><span>全部商品</span><b>{categories.reduce((sum, item) => sum + item.productCount, 0)}</b></label></div>{categories.map((item) => <CategoryNode category={item} selectedId={categoryId} expanded={expandedCategories} onSelect={selectCategory} onToggle={toggleCategory} key={item.id} />)}</div></fieldset><fieldset><h4>商品類型</h4><div className="tag-filters">{[["", "全部"], ["new", "新品"], ["popular", "熱門"], ["preorder", "預購"]].map(([value, label]) => <label className={tagType === value ? "active" : ""} key={value || "all"}><FormRadio name="product-tag-type" value={value} checked={tagType === value} onChange={() => setTagType(value as ProductTagTypeFilter)} /><span>{label}</span></label>)}</div></fieldset><fieldset><h4>價格區間</h4><div className="price-range"><FormInput inputMode="numeric" value={min} onChange={(e) => setMin(e.target.value)} placeholder="最低" /><span>—</span><FormInput inputMode="numeric" value={max} onChange={(e) => setMax(e.target.value)} placeholder="最高" /></div></fieldset><div className="filter-actions"><button type="button" className="filter-search" onClick={applyFilters}>搜尋</button><button type="button" className="filter-clear" onClick={clearFilters}>清除</button></div></aside>
      <section className={`catalog-results ${loading ? "is-loading" : ""}`} aria-busy={loading}><div className="catalog-toolbar"><p>{selectedCategory?.name ?? "全部商品"} <span>({total})</span></p><div className="sort-control"><span className="sort-label">排序</span><FormSelect className="sort-form-select" value={sort} onValueChange={changeSort}>{sortOptions.map((option) => <option value={option.value} key={option.value}>{option.label}</option>)}</FormSelect></div></div>
        {loading && <div className="catalog-loading" role="status">商品載入中…</div>}
        <div className="catalog-grid">{shown.map((product) => <article className={`catalog-card ${product.inventory === 0 ? "sold-out" : ""}`} key={product.id}><div className="product-visual-wrap">{product.inventory === 0 ? <span className="product-tag sold">SOLD OUT</span> : product.tagType !== "none" && <span className="product-tag">{productTagTypeLabel[product.tagType]}</span>}<Link href={`/products/${product.slug}`}><ProductArtwork product={product} /></Link><FavoriteButton className="card-favorite-button" productId={product.id} productName={product.name} initialFavorite={product.isFavorite} /></div><Link href={`/products/${product.slug}`} className="catalog-copy"><p>{product.category}</p><h2>{product.name}</h2><strong>{formatProductPrice(product)}</strong></Link></article>)}</div>
        {error && <div className="no-results">{error}</div>}
        {!loading && !error && !shown.length && <div className="no-results">找不到符合條件的商品。<button onClick={clearFilters}>重新瀏覽全部</button></div>}
        {pages > 1 && <nav className="pagination" aria-label="商品分頁"><span className="pagination-summary">第 {page} / {pages} 頁</span><button disabled={page === 1} onClick={() => changePage(page - 1)}>←</button>{Array.from({ length: pages }, (_, i) => <button className={page === i + 1 ? "active" : ""} onClick={() => changePage(i + 1)} aria-label={`第 ${i + 1} 頁`} aria-current={page === i + 1 ? "page" : undefined} key={i}>{i + 1}</button>)}<button disabled={page === pages} onClick={() => changePage(page + 1)}>→</button></nav>}
      </section>
    </div></SiteChrome>;
}
