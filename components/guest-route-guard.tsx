"use client";

import { useEffect, type ReactNode } from "react";
import { useAuthStore } from "@/lib/auth-store";

export default function GuestRouteGuard({ children }: { children: ReactNode }) {
  const hasHydrated = useAuthStore((state) => state.hasHydrated);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  useEffect(() => {
    if (hasHydrated && isAuthenticated) window.location.replace("/");
  }, [hasHydrated, isAuthenticated]);

  if (!hasHydrated || isAuthenticated) return null;

  return children;
}
