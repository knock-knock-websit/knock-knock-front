"use client";

import type { MemberCart } from "./types";
import { getAccessToken } from "./client-auth";

type Envelope<T> = { success: boolean; message: string; code?: string; data: T };

async function request(path: string, method: "GET" | "POST" | "PATCH" | "DELETE", body?: unknown): Promise<MemberCart> {
  const token = getAccessToken();
  if (!token) throw new Error("AUTH_REQUIRED");
  const response = await fetch(path, {
    method,
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: "no-store",
  });
  const payload = await response.json().catch(() => null) as Envelope<MemberCart> | null;
  if (!response.ok || !payload?.success) {
    if (response.status === 401) throw new Error("AUTH_REQUIRED");
    throw new Error(payload?.message ?? "購物車操作失敗");
  }
  window.dispatchEvent(new CustomEvent("knock-knock-cart", { detail: payload.data }));
  return payload.data;
}

export const getMemberCart = () => request("/api/members/cart", "GET");
export const addMemberCartItem = (input: { productId: string; variantId?: string; quantity?: number }) =>
  request("/api/members/cart", "POST", input);
export const updateMemberCartItem = (id: string, input: { quantity?: number; variantId?: string }) =>
  request(`/api/members/cart/${encodeURIComponent(id)}`, "PATCH", input);
export const deleteMemberCartItem = (id: string) =>
  request(`/api/members/cart/${encodeURIComponent(id)}`, "DELETE");
