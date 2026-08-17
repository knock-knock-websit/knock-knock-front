"use client";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { FormInput } from "@/components/form-controls";
import { getSession, logoutUser } from "@/lib/client-auth";
import { useAuthStore } from "@/lib/auth-store";
import { addMemberCartItem, getMemberCart } from "@/lib/member-cart";
import type { MemberCart } from "@/lib/types";
import type { ToastDetail } from "@/lib/toast";

type Marquee = { id: string; content: string; linkUrl: string };

const fallbackMarquees: Marquee[] = [{
  id: "",
  content: "",
  linkUrl: "",
}];

export const addCartItem = (productId: string, quantity = 1, variantId?: string) =>
  addMemberCartItem({ productId, quantity, variantId });

export function SiteChrome({children}: { children: React.ReactNode }) {
  const router = useRouter();
  const [count, setCount] = useState(0);
  const [marquees, setMarquees] = useState<Marquee[]>(fallbackMarquees);
  const [searchOpen, setSearchOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [toast, setToast] = useState<(ToastDetail & { id: number }) | null>(null);
  const searchRef = useRef<HTMLFormElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const accountRef = useRef<HTMLDivElement>(null);
  const signedIn = useAuthStore((state) => state.isAuthenticated);
  const hasHydrated = useAuthStore((state) => state.hasHydrated);
  useEffect(() => {
    const refresh = (event?: Event) => {
      const detail = (event as CustomEvent<MemberCart> | undefined)?.detail;
      if (detail) {
        setCount(detail.totalQuantity);
        return;
      }
      if (useAuthStore.getState().session) void getMemberCart().then((cart) => setCount(cart.totalQuantity)).catch(() => setCount(0));
      else setCount(0);
    };
    if (!useAuthStore.getState().session) getSession();
    refresh();
    window.addEventListener("knock-knock-cart", refresh);
    return () => window.removeEventListener("knock-knock-cart", refresh);
  }, []);

  useEffect(() => {
    const displayToast = (event: Event) => {
      const detail = (event as CustomEvent<ToastDetail>).detail;
      setToast({...detail, id: Date.now()});
    };
    window.addEventListener("knock-knock-toast", displayToast);
    return () => window.removeEventListener("knock-knock-toast", displayToast);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 3200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (!searchOpen) return;
    searchInputRef.current?.focus();
    const closeSearch = (event: MouseEvent) => {
      if (!searchRef.current?.contains(event.target as Node)) setSearchOpen(false);
    };
    document.addEventListener("mousedown", closeSearch);
    return () => document.removeEventListener("mousedown", closeSearch);
  }, [searchOpen]);

  useEffect(() => {
    if (!accountOpen) return;
    const closeAccount = (event: PointerEvent) => {
      if (!accountRef.current?.contains(event.target as Node)) setAccountOpen(false);
    };
    const closeWithEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setAccountOpen(false);
        accountRef.current?.querySelector<HTMLButtonElement>(".account-menu-trigger")?.focus();
      }
    };
    document.addEventListener("pointerdown", closeAccount);
    document.addEventListener("keydown", closeWithEscape);
    return () => {
      document.removeEventListener("pointerdown", closeAccount);
      document.removeEventListener("keydown", closeWithEscape);
    };
  }, [accountOpen]);

  const submitSearch = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const query = searchQuery.trim();
    if (!searchOpen) {
      setSearchOpen(true);
      return;
    }
    if (!query) {
      searchInputRef.current?.focus();
      return;
    }
    router.push(`/products?q=${encodeURIComponent(query)}`);
    setSearchOpen(false);
  };

  useEffect(() => {
    const controller = new AbortController();
    void fetch("/api/marquees", {
      headers: {Accept: "application/json"},
      cache: "no-store",
      signal: controller.signal,
    })
        .then(async (response) => {
          if (!response.ok) throw new Error(`Marquees API returned ${response.status}`);
          return await response.json() as { data?: Marquee[] };
        })
        .then((payload) => {
          if (payload.data?.length) setMarquees(payload.data);
        })
        .catch((error: unknown) => {
          if (!(error instanceof DOMException && error.name === "AbortError")) {
            console.error("Unable to load marquees", error);
          }
        });
    return () => controller.abort();
  }, []);

  const marqueeGroup = (hidden = false) => <div className="announcement-group" aria-hidden={hidden || undefined}>
    {marquees.map((marquee) => {
      const content = <>{marquee.content}<span aria-hidden="true">✦</span></>;
      return marquee.linkUrl
          ? <Link key={marquee.id} href={marquee.linkUrl} tabIndex={hidden ? -1 : undefined}>{content}</Link>
          : <p key={marquee.id}>{content}</p>;
    })}
  </div>;

  return <main className="min-h-screen bg-paper text-ink">
    {toast && <div className={`cart-toast ${toast.kind === "error" ? "error" : ""}`}
                   role={toast.kind === "error" ? "alert" : "status"}
                   aria-live={toast.kind === "error" ? "assertive" : "polite"}>
      <span>{toast.kind === "error" ? "!" : "✓"}</span><strong>{toast.message}</strong>
      <button type="button" onClick={() => setToast(null)} aria-label="關閉通知">×</button>
    </div>}
    <div className="announcement" aria-label="網站公告">
      <div className="announcement-track">
        {marqueeGroup()}
        {marqueeGroup(true)}
      </div>
    </div>
    <header className="site-header">
      <Link href="/" className="logo" aria-label="敲敲韓國代購首頁">
        <Image src="/logo.jpeg" alt="" width={52} height={52} priority />
        敲敲韓國代購
      </Link>
      <nav aria-label="主要導覽"><Link href="/">首頁</Link><Link href="/products?tagType=new">最新商品</Link><Link
          href="/products">全部商品</Link></nav>
      <div className="header-actions">
        <form ref={searchRef} className={`header-search ${searchOpen ? "open" : ""}`} role="search"
              onSubmit={submitSearch} onKeyDown={(event) => {
          if (event.key === "Escape") {
            setSearchOpen(false);
            (event.currentTarget.querySelector("button") as HTMLButtonElement | null)?.focus();
          }
        }}><label className="sr-only" htmlFor="header-product-search">搜尋商品</label><FormInput ref={searchInputRef}
                                                                                                 id="header-product-search"
                                                                                                 type="search"
                                                                                                 value={searchQuery}
                                                                                                 onChange={(event) => setSearchQuery(event.target.value)}
                                                                                                 placeholder="搜尋商品名稱"
                                                                                                 autoComplete="off"
                                                                                                 tabIndex={searchOpen ? 0 : -1}/>
          <button className="circle-button header-search-button" type="submit"
                  aria-label={searchOpen ? "送出商品搜尋" : "展開商品搜尋"} aria-expanded={searchOpen}
                  aria-controls="header-product-search">⌕
          </button>
        </form>
        <div className={`account-menu ${accountOpen ? "open" : ""}`} ref={accountRef}>
          <button
              className={`circle-button account-icon account-menu-trigger ${hasHydrated && signedIn ? "signed-in" : ""}`}
              type="button"
              aria-label="開啟會員選單"
              aria-haspopup="menu"
              aria-expanded={accountOpen}
              onClick={() => setAccountOpen((current) => !current)}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="12" cy="8" r="3.5"/>
              <path d="M5 20c.5-4 3-6 7-6s6.5 2 7 6"/>
            </svg>
          </button>
          {accountOpen && (
              <div className="account-dropdown" role="menu">
                {hasHydrated && signedIn ? (
                    <>
                      <Link href="/account" role="menuitem" onClick={() => setAccountOpen(false)}>會員中心</Link>
                      <button type="button" role="menuitem" onClick={() => {
                        logoutUser();
                        setCount(0);
                        setAccountOpen(false);
                      }}>登出
                      </button>
                    </>
                ) : (
                    <Link href="/auth/login" role="menuitem" onClick={() => setAccountOpen(false)}>登入</Link>
                )}
              </div>
          )}
        </div>
        <Link className="cart-button cart-icon-button" href="/cart" aria-label={`購物車，共 ${count} 件商品`}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path
                d="M3 4h2l2.2 10.1a2 2 0 0 0 2 1.6h7.9a2 2 0 0 0 1.9-1.4L21 8H6.1M10 20a1 1 0 1 1-2 0 1 1 0 0 1 2 0Zm9 0a1 1 0 1 1-2 0 1 1 0 0 1 2 0Z"/>
          </svg>
          <span>{count}</span></Link>
      </div>
    </header>
    {children}
    <footer><Link href="/" className="logo footer-logo">敲敲韓國代購</Link><p>MAKE YOUR FANDOM SHINE.</p>
      <div><Link href="/products">商品總覽</Link><Link href="/products?tagType=new">最新商品</Link><a
          href="mailto:hello@knock-knock.tw">聯絡我們</a><a href="https://instagram.com">Instagram</a></div>
      <small>© 2026 KNOCK-KNOCK. ALL RIGHTS RESERVED.</small></footer>
  </main>;
}
