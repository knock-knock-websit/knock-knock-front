"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/auth-store";
import { useFavoriteStore } from "@/lib/favorite-store";
import { showToast } from "@/lib/toast";

export default function FavoriteButton({
  productId,
  productName,
  initialFavorite = false,
  className = "",
}: {
  productId: string;
  productName: string;
  initialFavorite?: boolean;
  className?: string;
}) {
  const router = useRouter();
  const session = useAuthStore((state) => state.session);
  const hasHydrated = useAuthStore((state) => state.hasHydrated);
  const productIds = useFavoriteStore((state) => state.productIds);
  const initializedProductIds = useFavoriteStore((state) => state.initializedProductIds);
  const pendingIds = useFavoriteStore((state) => state.pendingIds);
  const seed = useFavoriteStore((state) => state.seed);
  const toggle = useFavoriteStore((state) => state.toggle);
  const reset = useFavoriteStore((state) => state.reset);
  const liked = initializedProductIds.includes(productId) ? productIds.includes(productId) : initialFavorite;
  const busy = pendingIds.includes(productId);

  useEffect(() => {
    if (!hasHydrated) return;
    if (session) seed(session.id, [{ id: productId, isFavorite: initialFavorite }]);
    else reset();
  }, [hasHydrated, initialFavorite, productId, reset, seed, session]);

  const click = async () => {
    if (!session) {
      router.push("/auth/login");
      return;
    }
    try {
      const nextLiked = await toggle(session.id, productId);
      showToast(nextLiked ? "已加入收藏商品" : "已移除收藏商品");
    } catch (cause) {
      showToast(
        cause instanceof Error ? cause.message : "收藏商品操作失敗",
        "error",
      );
    }
  };

  return <button type="button" className={`favorite-icon-button ${liked ? "liked" : ""} ${className}`.trim()} disabled={busy || !hasHydrated} onClick={() => void click()} aria-label={`${liked ? "移除收藏" : "收藏"}${productName}`} aria-pressed={liked}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.5 1.1-1.1a5.5 5.5 0 0 0-.1-7.8Z" /></svg></button>;
}
