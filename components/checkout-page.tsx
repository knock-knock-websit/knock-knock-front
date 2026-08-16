"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type {
  CheckoutPreview,
  CreateOrderResponse,
  MemberCart,
  UserCoupon,
} from "@/lib/types";
import { createOrder, type SevenElevenStore } from "@/lib/api";
import { getMemberCart } from "@/lib/member-cart";
import {
  getMyCoupons,
  validateMemberCoupon,
  validatePromotionCode,
} from "@/lib/promotions";
import { FormInput, FormRadio, FormSelect } from "@/components/form-controls";
import SiteChrome from "@/components/site-chrome";
import SevenElevenStorePicker from "@/components/seven-eleven-store-picker";
import {
  getMemberAddresses,
  getSession,
  type MemberAddress,
} from "@/lib/client-auth";
import { showToast } from "@/lib/toast";

export default function CheckoutPage() {
  const router = useRouter();
  const [cart, setCart] = useState<MemberCart>({
    items: [],
    totalQuantity: 0,
    totalAmount: 0,
  });
  const shippingMethod = "store";
  const [coupon, setCoupon] = useState("");
  const [couponInput, setCouponInput] = useState("");
  const [userCouponId, setUserCouponId] = useState("");
  const [couponMode, setCouponMode] = useState<"code" | "member">("code");
  const [memberCoupons, setMemberCoupons] = useState<UserCoupon[]>([]);
  const [couponEligibility, setCouponEligibility] = useState<
    Record<
      string,
      { usable: boolean; reason: string; preview?: CheckoutPreview }
    >
  >({});
  const [couponLoading, setCouponLoading] = useState(false);
  const [pricing, setPricing] = useState<CheckoutPreview>();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [completedOrder, setCompletedOrder] = useState<CreateOrderResponse>();
  const [pickupStore, setPickupStore] = useState<SevenElevenStore | null>(null);
  const [savedStores, setSavedStores] = useState<MemberAddress[]>([]);
  const [selectedSavedStoreId, setSelectedSavedStoreId] = useState("");
  const [recipient, setRecipient] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  useEffect(() => {
    const storedUserCouponId =
      localStorage.getItem("knock-knock-user-coupon") || "";
    const storedCode = localStorage.getItem("knock-knock-coupon") || "";
    setCouponMode(storedUserCouponId ? "member" : "code");
    setUserCouponId(storedUserCouponId);
    setCoupon(storedCode);
    setCouponInput(storedCode);
    const session = getSession();
    setRecipient(session?.name ?? "");
    setEmail(session?.account ?? "");
    void Promise.all([getMemberCart(), getMyCoupons(), getMemberAddresses()])
      .then(async ([nextCart, coupons, addresses]) => {
        setCart(nextCart);
        setSavedStores(addresses);
        const preferredStore =
          addresses.find((item) => item.isDefault) ?? addresses[0];
        if (preferredStore) {
          setSelectedSavedStoreId(preferredStore.id);
          setPickupStore(preferredStore.pickupStore);
          setRecipient(preferredStore.recipient);
          setPhone(preferredStore.phone);
        }
        const available = coupons.filter(
          (item) =>
            item.status === "available" &&
            Date.parse(item.expiresAt) >= Date.now(),
        );
        setMemberCoupons(available);
        const items = nextCart.items.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
        }));
        const eligibilityEntries = await Promise.all(
          available.map(async (item) => {
            try {
              const preview = await validateMemberCoupon({
                userCouponId: item.id,
                items,
                shippingMethod,
              });
              return [item.id, { usable: true, reason: "", preview }] as const;
            } catch (cause) {
              return [
                item.id,
                {
                  usable: false,
                  reason:
                    cause instanceof Error ? cause.message : "目前無法使用",
                },
              ] as const;
            }
          }),
        );
        const eligibility = Object.fromEntries(eligibilityEntries);
        setCouponEligibility(eligibility);
        if (storedUserCouponId && eligibility[storedUserCouponId]?.usable) {
          setPricing(eligibility[storedUserCouponId].preview);
        } else if (storedCode) {
          try {
            setPricing(
              await validatePromotionCode({
                code: storedCode,
                items,
                shippingMethod,
              }),
            );
          } catch {
            setCoupon("");
            setCouponInput("");
            localStorage.removeItem("knock-knock-coupon");
          }
        } else if (storedUserCouponId) {
          setUserCouponId("");
          localStorage.removeItem("knock-knock-user-coupon");
        }
      })
      .catch((cause) => {
        if (cause instanceof Error && cause.message === "AUTH_REQUIRED")
          router.replace("/auth/login");
        else
          setError(cause instanceof Error ? cause.message : "結帳資料載入失敗");
      });
  }, [router]);
  const orderItems = cart.items.map((item) => ({
    productId: item.productId,
    variantId: item.variantId,
    quantity: item.quantity,
    specifications: item.specifications.map((specification) => ({
      specificationId: specification.specificationId,
      specificationName: specification.specificationName,
      optionId: specification.optionId,
      optionName: specification.optionName,
    })),
  }));
  const defaultShipping = 60;
  const discount = pricing?.discount ?? 0;
  const shipping = pricing?.shipping ?? defaultShipping;
  const total =
    pricing?.total ?? Math.max(0, cart.totalAmount - discount + shipping);
  const applyCoupon = async () => {
    const code = couponInput.trim().toUpperCase();
    if (!code) {
      setCoupon("");
      setPricing(undefined);
      localStorage.removeItem("knock-knock-coupon");
      return;
    }
    setError("");
    try {
      const result = await validatePromotionCode({
        code,
        items: orderItems,
        shippingMethod,
      });
      setCoupon(code);
      setUserCouponId("");
      setPricing(result);
      localStorage.setItem("knock-knock-coupon", code);
      localStorage.removeItem("knock-knock-user-coupon");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "優惠碼無效");
    }
  };
  const changeCouponMode = (mode: "code" | "member") => {
    setCouponMode(mode);
    setCoupon("");
    setCouponInput("");
    setUserCouponId("");
    setPricing(undefined);
    setError("");
    localStorage.removeItem("knock-knock-coupon");
    localStorage.removeItem("knock-knock-user-coupon");
  };
  const selectMemberCoupon = async (id: string) => {
    setUserCouponId(id);
    setCoupon("");
    setCouponInput("");
    setPricing(undefined);
    setError("");
    localStorage.removeItem("knock-knock-coupon");
    if (!id) {
      localStorage.removeItem("knock-knock-user-coupon");
      return;
    }
    const eligibility = couponEligibility[id];
    if (!eligibility?.usable) {
      setError(eligibility?.reason || "此優惠券目前不可使用");
      return;
    }
    if (eligibility.preview) {
      setPricing(eligibility.preview);
      localStorage.setItem("knock-knock-user-coupon", id);
      return;
    }
    setCouponLoading(true);
    try {
      const result = await validateMemberCoupon({
        userCouponId: id,
        items: orderItems,
        shippingMethod,
      });
      setPricing(result);
      localStorage.setItem("knock-knock-user-coupon", id);
    } catch (cause) {
      setUserCouponId("");
      localStorage.removeItem("knock-knock-user-coupon");
      setError(cause instanceof Error ? cause.message : "會員優惠券無法使用");
    } finally {
      setCouponLoading(false);
    }
  };
  const selectSavedStore = (id: string) => {
    setSelectedSavedStoreId(id);
    const address = savedStores.find((item) => item.id === id);
    if (!address) {
      setPickupStore(null);
      return;
    }
    setPickupStore(address.pickupStore);
    setRecipient(address.recipient);
    setPhone(address.phone);
    setError("");
  };
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    if (shippingMethod === "store" && !pickupStore) {
      const nextError = "請先選擇 7-ELEVEN 取貨門市";
      setError(nextError);
      showToast(nextError, "error");
      return;
    }
    setSubmitting(true);
    try {
      const order = await createOrder({
        items: orderItems,
        shippingMethod,
        recipientName: recipient,
        recipientPhone: phone,
        couponCode: coupon || null,
        userCouponId: coupon ? null : userCouponId || null,
        pickupStore:
          shippingMethod === "store" && pickupStore
            ? { provider: "UNIMART", storeId: pickupStore.storeId }
            : null,
      });
      setCompletedOrder(order);
      setCart({ items: [], totalQuantity: 0, totalAmount: 0 });
      window.dispatchEvent(
        new CustomEvent("knock-knock-cart", {
          detail: { items: [], totalQuantity: 0, totalAmount: 0 },
        }),
      );
      localStorage.removeItem("knock-knock-coupon");
      localStorage.removeItem("knock-knock-user-coupon");
    } catch (cause) {
      const nextError =
        cause instanceof Error ? cause.message : "目前無法建立訂單，請稍後再試";
      setError(nextError);
      showToast(nextError, "error");
    } finally {
      setSubmitting(false);
    }
  };
  if (completedOrder) {
    const bank = completedOrder.bankTransfer;
    return (
      <SiteChrome>
        <section className="checkout-success">
          <span>✓</span>
          <p className="eyebrow">ORDER CONFIRMED</p>
          <h1>謝謝你的訂購！</h1>
          <p>
            訂單編號：<b>{completedOrder.id.slice(0, 8).toUpperCase()}</b>
          </p>
          <div className="bank-transfer-info">
            <p className="eyebrow">BANK TRANSFER</p>
            <h2>銀行轉帳資訊</h2>
            <dl>
              <div>
                <dt>銀行</dt>
                <dd>
                  {bank.bankCode} {bank.bankName}
                </dd>
              </div>
              {bank.branchName && (
                <div>
                  <dt>分行</dt>
                  <dd>{bank.branchName}</dd>
                </div>
              )}
              <div>
                <dt>戶名</dt>
                <dd>{bank.accountName}</dd>
              </div>
              <div>
                <dt>帳號</dt>
                <dd>{bank.accountNumber}</dd>
              </div>
              <div>
                <dt>應付金額</dt>
                <dd>NT$ {completedOrder.total.toLocaleString()}</dd>
              </div>
            </dl>
            {bank.note && <p className="bank-transfer-note">{bank.note}</p>}
          </div>
          <Link href="/products" className="primary-button">
            繼續探索商品 <span>↗</span>
          </Link>
        </section>
      </SiteChrome>
    );
  }
  return (
    <SiteChrome>
      <div className="checkout-head">
        <div>
          <p className="eyebrow">SECURE CHECKOUT</p>
          <h1>結帳</h1>
        </div>
      </div>
      {!cart.items.length ? (
        <section className="cart-page-empty">
          <h2>購物車沒有商品</h2>
          <Link href="/products" className="primary-button">
            返回商品列表 <span>↗</span>
          </Link>
        </section>
      ) : (
        <form className="checkout-layout" onSubmit={submit}>
          <div className="checkout-forms">
            <section className="checkout-section">
              <div className="checkout-section-title">
                <span>01</span>
                <div>
                  <p className="eyebrow">RECIPIENT</p>
                  <h2>收件人資訊</h2>
                </div>
              </div>
              <div className="form-grid">
                <label>
                  收件人姓名
                  <FormInput
                    name="name"
                    required
                    value={recipient}
                    onChange={(event) => setRecipient(event.target.value)}
                  />
                </label>
                <label>
                  手機號碼
                  <FormInput
                    name="phone"
                    required
                    inputMode="tel"
                    pattern="09[0-9]{8}"
                    value={phone}
                    onChange={(event) => setPhone(event.target.value)}
                  />
                </label>
                <label className="full">
                  電子信箱
                  <FormInput
                    name="email"
                    required
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                  />
                </label>
              </div>
            </section>
            <section className="checkout-section">
              <div className="checkout-section-title">
                <span>02</span>
                <div>
                  <p className="eyebrow">DELIVERY</p>
                  <h2>配送方式</h2>
                </div>
              </div>
              <div className="checkout-choice-grid">
                <label className="selected">
                  <FormRadio name="delivery" checked readOnly />
                  <b>7-ELEVEN 取貨</b>
                </label>
              </div>
              {savedStores.length > 0 && (
                <div className="saved-store-select">
                  <label>
                    選擇常用門市
                    <FormSelect
                      value={selectedSavedStoreId}
                      onValueChange={selectSavedStore}
                    >
                      <option value="">自行選擇其他門市</option>
                      {savedStores.map((item) => (
                        <option value={item.id} key={item.id}>
                          {item.isDefault ? "預設 · " : ""}
                          {item.pickupStore.storeName}門市 ·{" "}
                          {item.pickupStore.storeId} · {item.recipient}
                        </option>
                      ))}
                    </FormSelect>
                  </label>
                </div>
              )}
              <SevenElevenStorePicker
                selectedStore={pickupStore}
                onSelect={(store) => {
                  setSelectedSavedStoreId("");
                  setPickupStore(store);
                  setError("");
                }}
              />
            </section>
            <section className="checkout-section">
              <div className="checkout-section-title">
                <span>03</span>
                <div>
                  <p className="eyebrow">PAYMENT</p>
                  <h2>付款方式</h2>
                </div>
              </div>
              <div className="checkout-choice-grid payment">
                <label className="selected">
                  <FormRadio name="payment" checked readOnly />
                  <b>銀行轉帳</b>
                </label>
              </div>
            </section>
          </div>
          <aside className="checkout-summary">
            <p className="eyebrow">FINAL REVIEW</p>
            <h2>訂單金額確認</h2>
            <div className="checkout-items">
              {cart.items.map((item) => (
                <div key={item.id}>
                  <div>
                    {item.specificationImageUrl && (
                      <img
                        src={item.specificationImageUrl}
                        alt={item.productName}
                      />
                    )}
                    <span>{item.quantity}</span>
                  </div>
                  <p>
                    <b>{item.productName}</b>
                    <small>
                      {item.specifications
                        .map((spec) => spec.optionName)
                        .join(" / ") || ""}
                    </small>
                  </p>
                  <strong>NT$ {item.totalPrice.toLocaleString()}</strong>
                </div>
              ))}
            </div>
            <section className="checkout-promotion">
              <h3>選擇優惠</h3>
              <div
                className="coupon-mode-tabs"
                role="tablist"
                aria-label="優惠方式"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={couponMode === "code"}
                  className={couponMode === "code" ? "active" : ""}
                  onClick={() => changeCouponMode("code")}
                >
                  輸入優惠碼
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={couponMode === "member"}
                  className={couponMode === "member" ? "active" : ""}
                  onClick={() => changeCouponMode("member")}
                >
                  我的優惠券
                </button>
              </div>
              {couponMode === "code" ? (
                <div className="checkout-coupon">
                  <FormInput
                    value={couponInput}
                    onChange={(event) => setCouponInput(event.target.value)}
                    placeholder="請輸入優惠碼"
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        void applyCoupon();
                      }
                    }}
                  />
                  <button type="button" onClick={() => void applyCoupon()}>
                    套用
                  </button>
                </div>
              ) : (
                <div className="member-coupon-select">
                  <FormSelect
                    value={userCouponId}
                    disabled={couponLoading || !memberCoupons.length}
                    onValueChange={(id) => void selectMemberCoupon(id)}
                  >
                    <option value="">
                      {memberCoupons.length
                        ? "請選擇優惠券"
                        : "目前沒有會員優惠券"}
                    </option>
                    {memberCoupons.map((item) => {
                      const eligibility = couponEligibility[item.id];
                      const usable = eligibility?.usable === true;
                      const value =
                        item.discountType === "percentage"
                          ? `${item.discountValue}% OFF`
                          : item.discountType === "fixed"
                            ? `折 NT$ ${item.discountValue.toLocaleString()}`
                            : "免運";
                      return (
                        <option value={item.id} disabled={!usable} key={item.id}>
                          {item.name} · {value}
                          {!usable && eligibility?.reason
                            ? ` · ${eligibility.reason}`
                            : ""}
                        </option>
                      );
                    })}
                  </FormSelect>
                  {couponLoading && <p>優惠券套用中…</p>}
                </div>
              )}
              {pricing?.promotion && (
                <p className="checkout-status">
                  已套用「{pricing.promotion.name}」
                </p>
              )}
            </section>
            <div className="summary-lines">
              <p>
                <span>商品小計</span>
                <b>NT$ {cart.totalAmount.toLocaleString()}</b>
              </p>
              {discount > 0 && (
                <p className="discount">
                  <span>優惠折抵</span>
                  <b>− NT$ {discount.toLocaleString()}</b>
                </p>
              )}
              <p>
                <span>運費</span>
                <b>{shipping ? `NT$ ${shipping}` : "免運"}</b>
              </p>
              <p className="summary-total">
                <span>訂單總金額</span>
                <b>NT$ {total.toLocaleString()}</b>
              </p>
            </div>
            <p className="checkout-error">{error}</p>
            <button
              className="place-order"
              disabled={submitting || couponLoading}
            >
              {submitting
                ? "訂單建立中…"
                : `確認付款 NT$ ${total.toLocaleString()}`}{" "}
              <span>→</span>
            </button>
            <Link href="/cart" className="continue-shopping">
              ← 返回購物車修改
            </Link>
          </aside>
        </form>
      )}
    </SiteChrome>
  );
}
