import type {
  CreateOrderResponse,
  Product,
  ProductCategory,
  ProductDetail,
  ProductListResponse,
  PublicCarousel,
  ShippingSettings,
} from "./types";

const serverApiUrl = process.env.API_URL ?? "http://localhost:8787";

export type ProductQuery = {
  search?: string;
  category?: string;
  categoryId?: string;
  tagType?: "popular" | "preorder" | "new" | "none";
  minPrice?: string | number;
  maxPrice?: string | number;
  sort?: "newest" | "oldest" | "popular" | "price-low" | "price-high" | string;
  page?: string | number;
  pageSize?: string | number;
};

function productFetchOptions(authorization?: string | null): RequestInit & { next?: { revalidate: number } } {
  return {
    headers: {
      Accept: "application/json",
      ...(authorization ? { Authorization: authorization } : {}),
    },
    ...(authorization ? { cache: "no-store" as const } : { next: { revalidate: 60 } }),
  };
}

export async function getProductsPage(query: ProductQuery = {}, authorization?: string | null): Promise<ProductListResponse> {
  const searchParams = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== "") searchParams.set(key, String(value));
  });
  const response = await fetch(`${serverApiUrl}/api/products?${searchParams}`, productFetchOptions(authorization));
  if (!response.ok) throw new Error(`Products API returned ${response.status}`);
  return await response.json() as ProductListResponse;
}

export async function getProducts(): Promise<Product[]> {
  try {
    return (await getProductsPage({ pageSize: 48 })).data;
  } catch (error) {
    console.error("Unable to load products from backend API", error);
    return [];
  }
}

export async function getProduct(slug: string, authorization?: string | null): Promise<ProductDetail | null> {
  const response = await fetch(
    `${serverApiUrl}/api/products/${encodeURIComponent(slug)}`,
    productFetchOptions(authorization),
  );
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`Product API returned ${response.status}`);
  return ((await response.json()) as { data: ProductDetail }).data;
}

export async function getRelatedProducts(slug: string, limit = 4, authorization?: string | null): Promise<Product[]> {
  const response = await fetch(
    `${serverApiUrl}/api/products/${encodeURIComponent(slug)}/related?limit=${limit}`,
    productFetchOptions(authorization),
  );
  if (!response.ok) throw new Error(`Related products API returned ${response.status}`);
  return ((await response.json()) as { data: Product[] }).data;
}

export async function getProductCategories(): Promise<ProductCategory[]> {
  const response = await fetch(`${serverApiUrl}/api/product-categories`, {
    next: { revalidate: 60 },
    headers: { Accept: "application/json" },
  });
  if (!response.ok) throw new Error(`Product categories API returned ${response.status}`);
  return ((await response.json()) as { data: ProductCategory[] }).data;
}

export async function getCarousels(): Promise<PublicCarousel[]> {
  const response = await fetch(`${serverApiUrl}/api/carousels`, {
    next: { revalidate: 60 },
    headers: { Accept: "application/json" },
  });
  if (!response.ok) throw new Error(`Carousels API returned ${response.status}`);
  return ((await response.json()) as { data: PublicCarousel[] }).data;
}

export async function createOrder(input: {
  items: Array<{
    productId: string;
    variantId: string;
    quantity: number;
    specifications: Array<{
      specificationId: string;
      specificationName: string;
      optionId: string;
      optionName: string;
    }>;
  }>;
  shippingMethod: string;
  recipientName: string;
  recipientPhone: string;
  deliveryAddress?: string;
  orderNote?: string;
  couponCode?: string | null;
  userCouponId?: string | null;
  pickupStore?: { provider: "UNIMART"; storeId: string } | null;
}): Promise<CreateOrderResponse> {
  const accessToken = typeof window === "undefined" ? null : localStorage.getItem("knock-knock-access-token");
  const response = await fetch("/api/orders", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { error?: string; message?: string } | null;
    throw new Error(payload?.message ?? payload?.error ?? "無法建立訂單");
  }
  const payload = await response.json() as { data: CreateOrderResponse };
  return payload.data;
}

export type SevenElevenStore = { storeId: string; storeName: string; storeAddress: string; storePhone: string };

export async function getSevenElevenStores(query: { search?: string; page?: number; pageSize?: number } = {}) {
  const params = new URLSearchParams();
  if (query.search) params.set("search", query.search);
  if (query.page) params.set("page", String(query.page));
  if (query.pageSize) params.set("pageSize", String(query.pageSize));
  const response = await fetch(`/api/logistics/711-stores?${params}`, { cache: "no-store" });
  const payload = await response.json().catch(() => null) as { data?: SevenElevenStore[]; message?: string; meta?: { total?: number } } | null;
  if (!response.ok || !payload?.data) throw new Error(payload?.message ?? "無法載入 7-ELEVEN 門市");
  return { data: payload.data, total: Number(payload.meta?.total ?? 0) };
}

export async function getShippingSettings(): Promise<ShippingSettings> {
  const response = await fetch("/api/logistics/shipping-settings", { cache: "no-store" });
  const payload = await response.json().catch(() => null) as { data?: ShippingSettings; message?: string } | null;
  if (!response.ok || !payload?.data) throw new Error(payload?.message ?? "無法載入物流設定");
  return payload.data;
}
