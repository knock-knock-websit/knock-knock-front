"use client";

import { create } from "zustand";
import { createMemberFavorite, deleteMemberFavorite } from "@/lib/client-auth";

type FavoriteState = {
  memberId: string | null;
  productIds: string[];
  initializedProductIds: string[];
  pendingIds: string[];
  seed: (memberId: string, products: Array<{ id: string; isFavorite: boolean }>) => void;
  toggle: (memberId: string, productId: string) => Promise<boolean>;
  reset: () => void;
};

export const useFavoriteStore = create<FavoriteState>((set, get) => ({
  memberId: null,
  productIds: [],
  initializedProductIds: [],
  pendingIds: [],
  seed: (memberId, products) => {
    const current = get();
    const baseProductIds = current.memberId === memberId ? current.productIds : [];
    const seededIds = products.map((product) => product.id);
    set({
      memberId,
      productIds: [
        ...baseProductIds.filter((id) => !seededIds.includes(id)),
        ...products.filter((product) => product.isFavorite).map((product) => product.id),
      ],
      initializedProductIds: [
        ...(current.memberId === memberId ? current.initializedProductIds : []),
        ...seededIds,
      ].filter((id, index, values) => values.indexOf(id) === index),
      pendingIds: current.memberId === memberId ? current.pendingIds : [],
    });
  },
  toggle: async (memberId, productId) => {
    if (get().memberId !== memberId) {
      set({ memberId, productIds: [], initializedProductIds: [productId], pendingIds: [] });
    }
    if (get().pendingIds.includes(productId)) return get().productIds.includes(productId);
    const wasFavorite = get().productIds.includes(productId);
    set((state) => ({ pendingIds: [...state.pendingIds, productId] }));
    try {
      if (wasFavorite) await deleteMemberFavorite(productId);
      else await createMemberFavorite(productId);
      set((state) => ({
        productIds: wasFavorite
          ? state.productIds.filter((id) => id !== productId)
          : [...new Set([...state.productIds, productId])],
        initializedProductIds: [...new Set([...state.initializedProductIds, productId])],
      }));
      return !wasFavorite;
    } finally {
      set((state) => ({ pendingIds: state.pendingIds.filter((id) => id !== productId) }));
    }
  },
  reset: () => set({ memberId: null, productIds: [], initializedProductIds: [], pendingIds: [] }),
}));
