"use client";

import { useAuthStore } from "@/lib/auth-store";
import type { SevenElevenStore } from "@/lib/api";
import type { MemberOrder, OrderPagination, Product } from "@/lib/types";

export type AuthSession = {
  id: string;
  account: string;
  name: string;
  type: "email";
  verified: boolean;
};

export type MemberOverview = {
  orderCount: number;
  favoriteCount: number;
  availableCouponCount: number;
};

export type MemberGender = "undisclosed" | "female" | "male" | "other";

export type MemberProfile = {
  name: string;
  email: string;
  birthday: string | null;
  gender: MemberGender;
};

export type MemberAddress = {
  id: string;
  recipient: string;
  phone: string;
  pickupStore: SevenElevenStore & { provider: "UNIMART" };
  isDefault: boolean;
};

export type MemberAddressInput = {
  recipient: string;
  phone: string;
  pickupStore: { provider: "UNIMART"; storeId: string };
  isDefault: boolean;
};

type ApiEnvelope<T> = {
  success: boolean;
  message: string;
  code?: string;
  data: T;
};

const SESSION_KEY = "knock-knock-session";
const TOKEN_KEY = "knock-knock-access-token";
const VERIFICATION_KEY = "knock-knock-verification";

export function getAccessToken(): string | null {
  return typeof window === "undefined" ? null : localStorage.getItem(TOKEN_KEY);
}

async function request<T>(
  path: string,
  body?: unknown,
  authenticated = false,
): Promise<ApiEnvelope<T>> {
  const token = authenticated ? localStorage.getItem(TOKEN_KEY) : null;
  const response = await fetch(path, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const payload = (await response
    .json()
    .catch(() => null)) as ApiEnvelope<T> | null;
  if (!response.ok || !payload?.success) {
    if (payload?.code === "EMAIL_NOT_VERIFIED")
      throw new Error("EMAIL_NOT_VERIFIED");
    throw new Error(payload?.message ?? "目前無法連線至會員服務");
  }
  return payload;
}

export function getSession(): AuthSession | null {
  const storedSession = useAuthStore.getState().session;
  if (storedSession) return storedSession;
  try {
    const session = JSON.parse(
      localStorage.getItem(SESSION_KEY) || "null",
    ) as AuthSession | null;
    if (session) useAuthStore.getState().setSession(session);
    return session;
  } catch {
    return null;
  }
}

export async function getMemberOverview(): Promise<MemberOverview> {
  const token = localStorage.getItem(TOKEN_KEY);
  if (!token) throw new Error("請先登入會員");
  const response = await fetch("/api/members/overview", {
    headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  const payload = (await response
    .json()
    .catch(() => null)) as ApiEnvelope<MemberOverview> | null;
  if (!response.ok || !payload?.success)
    throw new Error(payload?.message ?? "會員總覽載入失敗");
  return payload.data;
}

async function orderRequest(
  path: string,
): Promise<MemberOrder | MemberOrder[]> {
  const token = localStorage.getItem(TOKEN_KEY);
  if (!token) throw new Error("AUTH_REQUIRED");
  const response = await fetch(path, {
    headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  const payload = (await response.json().catch(() => null)) as ApiEnvelope<
    MemberOrder | MemberOrder[]
  > | null;
  if (!response.ok || !payload?.success)
    throw new Error(payload?.message ?? "訂單資料載入失敗");
  return payload.data;
}

export async function getMemberOrders(
  query: {
    paymentStatus?: string;
    shippingStatus?: string;
    page?: number;
    pageSize?: number;
  } = {},
): Promise<{ data: MemberOrder[]; pagination: OrderPagination }> {
  const token = localStorage.getItem(TOKEN_KEY);
  if (!token) throw new Error("AUTH_REQUIRED");
  const params = new URLSearchParams();
  if (query.paymentStatus) params.set("paymentStatus", query.paymentStatus);
  if (query.shippingStatus) params.set("shippingStatus", query.shippingStatus);
  if (query.page && query.page > 1) params.set("page", String(query.page));
  if (query.pageSize) params.set("pageSize", String(query.pageSize));
  const response = await fetch(
    `/api/members/orders${params.size ? `?${params}` : ""}`,
    {
      headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
      cache: "no-store",
    },
  );
  const payload = (await response.json().catch(() => null)) as
    (ApiEnvelope<MemberOrder[]> & { pagination: OrderPagination }) | null;
  if (!response.ok || !payload?.success)
    throw new Error(payload?.message ?? "訂單資料載入失敗");
  return { data: payload.data, pagination: payload.pagination };
}

export async function getMemberOrder(id: string): Promise<MemberOrder> {
  return (await orderRequest(
    `/api/members/orders/${encodeURIComponent(id)}`,
  )) as MemberOrder;
}

export async function updateMemberOrderRemittance(
  id: string,
  input: { remittingBank: string; transferAccountLastFive: string },
): Promise<MemberOrder> {
  const token = localStorage.getItem(TOKEN_KEY);
  if (!token) throw new Error("AUTH_REQUIRED");
  const response = await fetch(
    `/api/members/orders/${encodeURIComponent(id)}`,
    {
      method: "PATCH",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(input),
    },
  );
  const payload = (await response
    .json()
    .catch(() => null)) as ApiEnvelope<MemberOrder> | null;
  if (!response.ok || !payload?.success)
    throw new Error(payload?.message ?? "匯款資料送出失敗");
  return payload.data;
}

async function profileRequest(
  method: "GET" | "PUT",
  body?: unknown,
): Promise<MemberProfile> {
  const token = localStorage.getItem(TOKEN_KEY);
  if (!token) throw new Error("請先登入會員");
  const response = await fetch("/api/members/profile", {
    method,
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
      ...(method === "PUT" ? { "Content-Type": "application/json" } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: "no-store",
  });
  const payload = (await response
    .json()
    .catch(() => null)) as ApiEnvelope<MemberProfile> | null;
  if (!response.ok || !payload?.success)
    throw new Error(payload?.message ?? "個人資料載入失敗");
  return payload.data;
}

export function getMemberProfile(): Promise<MemberProfile> {
  return profileRequest("GET");
}

export async function updateMemberProfile(input: {
  name: string;
  birthday: string | null;
  gender: MemberGender;
}): Promise<MemberProfile> {
  const profile = await profileRequest("PUT", input);
  const current = getSession();
  if (current) {
    const nextSession = { ...current, name: profile.name };
    localStorage.setItem(SESSION_KEY, JSON.stringify(nextSession));
    useAuthStore.getState().setSession(nextSession);
  }
  return profile;
}

export function getPendingVerification(): {
  email: string;
  developmentCode?: string;
} | null {
  try {
    return JSON.parse(sessionStorage.getItem(VERIFICATION_KEY) || "null") as {
      email: string;
      developmentCode?: string;
    } | null;
  } catch {
    return null;
  }
}

export async function registerUser(input: {
  account: string;
  name: string;
  type: "email";
  password: string;
}) {
  const response = await request<{
    email: string;
    expiresAt?: string;
    developmentCode?: string;
    emailSent?: boolean;
  }>("/api/auth/register", {
    email: input.account,
    name: input.name,
    password: input.password,
  });
  sessionStorage.setItem(
    VERIFICATION_KEY,
    JSON.stringify({
      email: response.data.email,
      developmentCode: response.data.developmentCode,
    }),
  );
  return response.data;
}

export async function loginUser(account: string, password: string) {
  try {
    const response = await request<{
      accessToken: string;
      expiresAt: string;
      user: AuthSession;
    }>("/api/auth/login", {
      email: account,
      password,
    });
    localStorage.setItem(TOKEN_KEY, response.data.accessToken);
    localStorage.setItem(SESSION_KEY, JSON.stringify(response.data.user));
    useAuthStore.getState().setSession(response.data.user);
    return response.data.user;
  } catch (error) {
    if (error instanceof Error && error.message === "EMAIL_NOT_VERIFIED") {
      sessionStorage.setItem(
        VERIFICATION_KEY,
        JSON.stringify({ email: account.trim().toLowerCase() }),
      );
    }
    throw error;
  }
}

export async function verifyEmail(code: string) {
  const pending = getPendingVerification();
  if (!pending?.email) throw new Error("找不到待驗證帳號，請重新登入或註冊");
  await request<null>("/api/auth/verify-email", { email: pending.email, code });
  sessionStorage.removeItem(VERIFICATION_KEY);
}

export async function resendVerification() {
  const pending = getPendingVerification();
  if (!pending?.email) throw new Error("找不到待驗證帳號，請重新登入或註冊");
  const response = await request<{
    email: string;
    expiresAt?: string;
    developmentCode?: string;
    retryAfterSeconds?: number;
  } | null>("/api/auth/resend-verification", { email: pending.email });
  if (response.data?.developmentCode)
    sessionStorage.setItem(
      VERIFICATION_KEY,
      JSON.stringify({
        email: pending.email,
        developmentCode: response.data.developmentCode,
      }),
    );
  return response.data;
}

export async function requestPasswordReset(email: string) {
  const response = await request<{ developmentResetUrl?: string } | null>(
    "/api/auth/request-password-reset",
    { email },
  );
  return response.data;
}

export async function resetPassword(token: string, password: string) {
  await request<null>("/api/auth/reset-password", { token, password });
}

export async function changePassword(input: {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}): Promise<void> {
  const token = localStorage.getItem(TOKEN_KEY);
  if (!token) throw new Error("請先登入會員");
  const response = await fetch("/api/members/password", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(input),
  });
  const payload = (await response
    .json()
    .catch(() => null)) as ApiEnvelope<null> | null;
  if (!response.ok || !payload?.success)
    throw new Error(payload?.message ?? "密碼修改失敗");
}

async function addressRequest<T>(
  path: string,
  method: "GET" | "POST" | "PUT" | "DELETE",
  body?: unknown,
) {
  const token = localStorage.getItem(TOKEN_KEY);
  if (!token) throw new Error("請先登入會員");
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
  const payload = (await response
    .json()
    .catch(() => null)) as ApiEnvelope<T> | null;
  if (!response.ok || !payload?.success)
    throw new Error(payload?.message ?? "超商門市操作失敗");
  return payload.data;
}

export function getMemberAddresses(): Promise<MemberAddress[]> {
  return addressRequest<MemberAddress[]>("/api/members/addresses", "GET");
}

export function createMemberAddress(
  input: MemberAddressInput,
): Promise<MemberAddress> {
  return addressRequest<MemberAddress>("/api/members/addresses", "POST", input);
}

export function updateMemberAddress(
  id: string,
  input: MemberAddressInput,
): Promise<MemberAddress> {
  return addressRequest<MemberAddress>(
    `/api/members/addresses/${encodeURIComponent(id)}`,
    "PUT",
    input,
  );
}

export function deleteMemberAddress(id: string): Promise<null> {
  return addressRequest<null>(
    `/api/members/addresses/${encodeURIComponent(id)}`,
    "DELETE",
  );
}

async function favoriteRequest<T>(
  method: "GET" | "POST" | "DELETE",
  productId?: string,
) {
  const token = localStorage.getItem(TOKEN_KEY);
  if (!token) throw new Error("請先登入會員");
  const path =
    productId && method === "DELETE"
      ? `/api/members/favorites/${encodeURIComponent(productId)}`
      : "/api/members/favorites";
  const response = await fetch(path, {
    method,
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
      ...(method === "POST" ? { "Content-Type": "application/json" } : {}),
    },
    body: method === "POST" ? JSON.stringify({ productId }) : undefined,
    cache: "no-store",
  });
  const payload = (await response
    .json()
    .catch(() => null)) as ApiEnvelope<T> | null;
  if (!response.ok || !payload?.success)
    throw new Error(payload?.message ?? "收藏商品操作失敗");
  return payload.data;
}

export function getMemberFavorites(): Promise<Product[]> {
  return favoriteRequest<Product[]>("GET");
}

export function createMemberFavorite(
  productId: string,
): Promise<{ productId: string }> {
  return favoriteRequest<{ productId: string }>("POST", productId);
}

export function deleteMemberFavorite(productId: string): Promise<null> {
  return favoriteRequest<null>("DELETE", productId);
}

export function logoutUser() {
  const token = localStorage.getItem(TOKEN_KEY);
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(SESSION_KEY);
  useAuthStore.getState().clearSession();
  if (token) {
    void fetch("/api/auth/logout", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
  }
}
