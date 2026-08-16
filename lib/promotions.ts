"use client";

import type { CheckoutPreview, PublicCoupon, UserCoupon } from "./types";

type Envelope<T> = { success: boolean; message: string; code?: string; data: T };
const token = () => localStorage.getItem("knock-knock-access-token");

async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
  const accessToken = token();
  const response = await fetch(path, {
    ...init,
    headers: {
      Accept: "application/json",
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...init.headers,
    },
    cache: "no-store",
  });
  const payload = await response.json().catch(() => null) as Envelope<T> | null;
  if (!response.ok || !payload?.success) {
    const error = new Error(payload?.message ?? "優惠服務暫時無法使用") as Error & { code?: string };
    error.code = payload?.code;
    throw error;
  }
  return payload.data;
}

export const getClaimableCoupons = () => call<PublicCoupon[]>("/api/coupons");
export const claimCoupon = (promotionId: string) => call<UserCoupon>(`/api/coupons/${encodeURIComponent(promotionId)}/claim`, { method: "POST" });
export const getMyCoupons = () => call<UserCoupon[]>("/api/me/coupons");
export const validatePromotionCode = (input: { code: string; items: Array<{ productId: string; quantity: number }>; shippingMethod: string }) =>
  call<CheckoutPreview>("/api/promotions/validate-code", { method: "POST", body: JSON.stringify(input) });
export const validateMemberCoupon = (input: { userCouponId: string; items: Array<{ productId: string; quantity: number }>; shippingMethod: string }) =>
  call<CheckoutPreview>("/api/promotions/validate-coupon", { method: "POST", body: JSON.stringify(input) });
