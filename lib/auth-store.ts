"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { AuthSession } from "@/lib/client-auth";

type AuthState = {
  session: AuthSession | null;
  isAuthenticated: boolean;
  hasHydrated: boolean;
  setSession: (session: AuthSession) => void;
  clearSession: () => void;
  setHasHydrated: (hydrated: boolean) => void;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      session: null,
      isAuthenticated: false,
      hasHydrated: false,
      setSession: (session) => set({ session, isAuthenticated: true }),
      clearSession: () => set({ session: null, isAuthenticated: false }),
      setHasHydrated: (hasHydrated) => set({ hasHydrated }),
    }),
    {
      name: "knock-knock-auth",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ session: state.session, isAuthenticated: state.isAuthenticated }),
      onRehydrateStorage: () => (state) => state?.setHasHydrated(true),
    },
  ),
);
