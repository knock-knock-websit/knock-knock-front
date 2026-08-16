"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import SiteChrome from "@/components/site-chrome";
import { FormInput } from "@/components/form-controls";
import { deleteMemberCartItem, getMemberCart, updateMemberCartItem } from "@/lib/member-cart";
import type { MemberCart, MemberCartItem } from "@/lib/types";

function TrashIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3M7 7l1 13h8l1-13M10 11v5M14 11v5" /></svg>;
}

function CartQuantity({ item, onChange }: { item: MemberCartItem; onChange: (quantity: number) => Promise<boolean> }) {
  const [value, setValue] = useState(String(item.quantity));
  const [busy, setBusy] = useState(false);
  const maximum = Math.min(10, Math.max(0, item.availableStock));

  useEffect(() => setValue(String(item.quantity)), [item.quantity]);

  const commit = async (rawValue: string) => {
    const parsed = Number(rawValue);
    if (!Number.isInteger(parsed) || parsed < 1 || maximum < 1) {
      setValue(String(item.quantity));
      return;
    }
    const quantity = Math.min(parsed, maximum);
    setValue(String(quantity));
    if (quantity === item.quantity) return;
    setBusy(true);
    const updated = await onChange(quantity);
    if (!updated) setValue(String(item.quantity));
    setBusy(false);
  };

  return <div className="cart-page-quantity">
    <button type="button" disabled={busy || item.quantity <= 1} onClick={() => void commit(String(item.quantity - 1))} aria-label="減少數量">−</button>
    <FormInput value={value} disabled={busy || maximum < 1} inputMode="numeric" maxLength={2} aria-label={`${item.productName}數量`} onChange={(event) => setValue(event.target.value.replace(/\D/g, ""))} onBlur={() => void commit(value)} onKeyDown={(event) => { if (event.key === "Enter") event.currentTarget.blur(); }} />
    <button type="button" disabled={busy || maximum < 1 || item.quantity >= maximum} onClick={() => void commit(String(item.quantity + 1))} aria-label="增加數量">＋</button>
  </div>;
}

export default function CartPage() {
  const router = useRouter();
  const [cart, setCart] = useState<MemberCart>({ items: [], totalQuantity: 0, totalAmount: 0 });
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  useEffect(() => {
    void getMemberCart().then(setCart).catch((error) => {
      if (error instanceof Error && error.message === "AUTH_REQUIRED") router.replace("/auth/login");
      else setMessage(error instanceof Error ? error.message : "購物車載入失敗");
    }).finally(() => setLoading(false));
  }, [router]);
  const updateQuantity = async (id: string, quantity: number) => {
    setMessage("");
    try { setCart(await updateMemberCartItem(id, { quantity })); return true; }
    catch (error) { setMessage(error instanceof Error ? error.message : "數量修改失敗"); return false; }
  };
  const remove = async (id: string) => {
    setMessage("");
    try { setCart(await deleteMemberCartItem(id)); }
    catch (error) { setMessage(error instanceof Error ? error.message : "商品刪除失敗"); }
  };
  return <SiteChrome><section className="cart-page-head"><p className="eyebrow">YOUR SHOPPING CART</p><h1>購物車</h1></section>
    {message && <p className="member-message">{message}</p>}
    {loading ? <section className="cart-page-empty"><p>購物車載入中…</p></section> : !cart.items.length ? <section className="cart-page-empty"><span>✦</span><h2>購物車還是空的</h2><p>登入後挑一件讓今天閃閃發亮的收藏吧。</p><Link href="/products" className="primary-button">探索全部商品 <span>↗</span></Link></section> :
    <div className="cart-page-layout"><section className="cart-products"><div className="cart-table-head"><span>商品</span><span>數量</span><span>小計</span></div>{cart.items.map((item) => <article className="cart-page-item" key={item.id}><div className="cart-page-art">{item.specificationImageUrl ? <img src={item.specificationImageUrl} alt={item.productName} /> : <span className="product-art" />}</div><div className="cart-item-info"><p>{item.productCategory}</p><h2>{item.productName}</h2><strong>NT$ {item.unitPrice.toLocaleString()}</strong><div className="cart-specs">{item.specifications.map((specification) => <span key={specification.specificationId}>{specification.specificationName}：{specification.optionName}</span>)}</div><button className="remove-item" type="button" title="移除商品" aria-label={`移除${item.productName}`} onClick={() => void remove(item.id)}><TrashIcon /></button></div><CartQuantity item={item} onChange={(quantity) => updateQuantity(item.id, quantity)} /><strong className="cart-line-total">NT$ {item.totalPrice.toLocaleString()}</strong></article>)}</section>
      <aside className="order-summary"><p className="eyebrow">ORDER SUMMARY</p><h2>訂單摘要</h2><div className="summary-lines"><p><span>商品小計</span><b>NT$ {cart.totalAmount.toLocaleString()}</b></p><p className="summary-total"><span>訂單總金額</span><b>NT$ {cart.totalAmount.toLocaleString()}</b></p></div><Link href="/checkout" className="checkout-link">前往結帳 <span>→</span></Link><Link href="/products" className="continue-shopping">← 繼續購物</Link></aside>
    </div>}
  </SiteChrome>;
}
