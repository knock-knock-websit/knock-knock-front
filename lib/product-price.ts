import type { Product } from "./types";

export function formatProductPrice(product: Pick<Product, "price" | "minPrice" | "maxPrice">): string {
  const minimum = product.minPrice ?? product.price;
  const maximum = product.maxPrice ?? minimum;
  const formattedMinimum = minimum.toLocaleString("zh-TW");

  return minimum === maximum
    ? `NT$ ${formattedMinimum}`
    : `NT$ ${formattedMinimum}~${maximum.toLocaleString("zh-TW")}`;
}
