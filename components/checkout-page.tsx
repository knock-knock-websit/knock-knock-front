"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type {
  CheckoutPreview,
  CreateOrderResponse,
  MemberCart,
  UserCoupon,
  ShippingSettings,
} from "@/lib/types";
import { createOrder, getShippingSettings, type SevenElevenStore } from "@/lib/api";
import { getMemberCart } from "@/lib/member-cart";
import {
  getMyCoupons,
  validateMemberCoupon,
  validatePromotionCode,
} from "@/lib/promotions";
import { FormInput, FormRadio, FormSelect } from "@/components/form-controls";
import {SiteChrome} from "@/components/site-chrome";
import SevenElevenStorePicker from "@/components/seven-eleven-store-picker";
import {
  getMemberAddresses,
  getMemberProfile,
  getSession,
  type MemberAddress,
} from "@/lib/client-auth";
import { showToast } from "@/lib/toast";

type ShippingMethod = "store" | "home";
type CheckoutField = "recipient" | "phone" | "email" | "pickupStore" | "deliveryAddress";
type CheckoutFieldErrors = Partial<Record<CheckoutField, string>>;

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function CheckoutFieldError({ id, message }: { id: string; message?: string }) {
  return message ? <small className="checkout-field-error" id={id} role="alert">{message}</small> : null;
}

export default function CheckoutPage() {
  const router = useRouter();
  const [cart, setCart] = useState<MemberCart>({
    items: [],
    totalQuantity: 0,
    totalAmount: 0,
  });
  const [shippingMethod, setShippingMethod] = useState<ShippingMethod>("store");
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
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [fieldErrors, setFieldErrors] = useState<CheckoutFieldErrors>({});
  const [shippingSettings, setShippingSettings] = useState<ShippingSettings>();
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
    void Promise.all([getMemberCart(), getMyCoupons(), getMemberAddresses(), getShippingSettings(), getMemberProfile()])
      .then(async ([nextCart, coupons, addresses, nextShippingSettings, memberProfile]) => {
        const initialShippingMethod: ShippingMethod = nextShippingSettings.sevenElevenEnabled ? "store" : "home";
        setShippingSettings(nextShippingSettings);
        setShippingMethod(initialShippingMethod);
        setCart(nextCart);
        setSavedStores(addresses);
        setRecipient(memberProfile.name);
        setEmail(memberProfile.email);
        const preferredStore =
          addresses.find((item) => item.isDefault) ?? addresses[0];
        if (preferredStore) {
          setSelectedSavedStoreId(preferredStore.id);
          setPickupStore(preferredStore.pickupStore);
          setRecipient(preferredStore.recipient);
        }
        setPhone(memberProfile.phone || preferredStore?.phone || "");
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
                shippingMethod: initialShippingMethod,
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
                shippingMethod: initialShippingMethod,
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
  const defaultShipping = shippingMethod === "store"
    ? shippingSettings?.sevenEleven ?? 0
    : shippingSettings?.homeDelivery ?? 0;
  const discount = pricing?.discount ?? 0;
  const shipping = pricing?.shipping ?? defaultShipping;
  const total =
    pricing?.total ?? Math.max(0, cart.totalAmount - discount + shipping);
  const changeShippingMethod = async (method: ShippingMethod) => {
    if (method === shippingMethod) return;
    setShippingMethod(method);
    setPricing(undefined);
    setError("");
    setFieldErrors((current) => ({ ...current, pickupStore: undefined, deliveryAddress: undefined }));
    if (!coupon && !userCouponId) return;
    setCouponLoading(true);
    try {
      const result = coupon
        ? await validatePromotionCode({ code: coupon, items: orderItems, shippingMethod: method })
        : await validateMemberCoupon({ userCouponId, items: orderItems, shippingMethod: method });
      setPricing(result);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "無法重新計算優惠");
    } finally {
      setCouponLoading(false);
    }
  };
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
    setFieldErrors((current) => ({ ...current, recipient: undefined, phone: undefined, pickupStore: undefined }));
    setError("");
  };
  const clearFieldError = (field: CheckoutField) => {
    setFieldErrors((current) => current[field] ? { ...current, [field]: undefined } : current);
  };
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    const normalizedRecipient = recipient.trim();
    const normalizedPhone = phone.trim();
    const normalizedEmail = email.trim().toLowerCase();
    const nextFieldErrors: CheckoutFieldErrors = {};
    if (!normalizedRecipient) nextFieldErrors.recipient = "請輸入收件人姓名";
    else if (normalizedRecipient.length > 80) nextFieldErrors.recipient = "收件人姓名不可超過 80 個字元";
    if (!normalizedPhone) nextFieldErrors.phone = "請輸入手機號碼";
    else if (!/^09\d{8}$/.test(normalizedPhone)) nextFieldErrors.phone = "請輸入 09 開頭的 10 位數手機號碼";
    if (!normalizedEmail) nextFieldErrors.email = "請輸入電子信箱";
    else if (normalizedEmail.length > 254 || !emailPattern.test(normalizedEmail)) nextFieldErrors.email = "請輸入正確的 Email 格式";
    if (shippingMethod === "store" && !pickupStore) nextFieldErrors.pickupStore = "請選擇 7-ELEVEN 取貨門市";
    if (shippingMethod === "home" && !deliveryAddress.trim()) nextFieldErrors.deliveryAddress = "請輸入宅配地址";
    else if (deliveryAddress.trim().length > 200) nextFieldErrors.deliveryAddress = "宅配地址不可超過 200 個字元";
    setFieldErrors(nextFieldErrors);
    const firstInvalidField = (["recipient", "phone", "email", "pickupStore", "deliveryAddress"] as CheckoutField[])
      .find((field) => nextFieldErrors[field]);
    if (firstInvalidField) {
      const elementId = firstInvalidField === "pickupStore" ? "checkout-pickup-store" : `checkout-${firstInvalidField}`;
      window.requestAnimationFrame(() => {
        const target = document.getElementById(elementId);
        if (target instanceof HTMLInputElement) target.focus();
        else target?.querySelector<HTMLButtonElement>("button")?.focus();
      });
      showToast(nextFieldErrors[firstInvalidField] ?? "請確認必填欄位", "error");
      return;
    }
    setRecipient(normalizedRecipient);
    setPhone(normalizedPhone);
    setEmail(normalizedEmail);
    setSubmitting(true);
    try {
      const order = await createOrder({
        items: orderItems,
        shippingMethod,
        recipientName: normalizedRecipient,
        recipientPhone: normalizedPhone,
        deliveryAddress: shippingMethod === "home" ? deliveryAddress.trim() : "",
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
        <form className="checkout-layout" onSubmit={submit} noValidate>
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
                <label className={fieldErrors.recipient ? "has-error" : ""}>
                  收件人姓名
                  <FormInput
                    id="checkout-recipient"
                    name="name"
                    required
                    maxLength={80}
                    value={recipient}
                    aria-invalid={Boolean(fieldErrors.recipient)}
                    aria-describedby={fieldErrors.recipient ? "checkout-recipient-error" : undefined}
                    onChange={(event) => { setRecipient(event.target.value); clearFieldError("recipient"); }}
                  />
                  <CheckoutFieldError id="checkout-recipient-error" message={fieldErrors.recipient} />
                </label>
                <label className={fieldErrors.phone ? "has-error" : ""}>
                  手機號碼
                  <FormInput
                    id="checkout-phone"
                    name="phone"
                    required
                    inputMode="tel"
                    pattern="09[0-9]{8}"
                    maxLength={10}
                    value={phone}
                    aria-invalid={Boolean(fieldErrors.phone)}
                    aria-describedby={fieldErrors.phone ? "checkout-phone-error" : undefined}
                    onChange={(event) => { setPhone(event.target.value); clearFieldError("phone"); }}
                  />
                  <CheckoutFieldError id="checkout-phone-error" message={fieldErrors.phone} />
                </label>
                <label className={`full ${fieldErrors.email ? "has-error" : ""}`.trim()}>
                  電子信箱
                  <FormInput
                    id="checkout-email"
                    name="email"
                    required
                    type="email"
                    maxLength={254}
                    value={email}
                    aria-invalid={Boolean(fieldErrors.email)}
                    aria-describedby={fieldErrors.email ? "checkout-email-error" : undefined}
                    onChange={(event) => { setEmail(event.target.value); clearFieldError("email"); }}
                  />
                  <CheckoutFieldError id="checkout-email-error" message={fieldErrors.email} />
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
                {shippingSettings?.sevenElevenEnabled && <label>
                  <FormRadio name="delivery" value="store" checked={shippingMethod === "store"} required onChange={() => void changeShippingMethod("store")} />
                  <b>7-ELEVEN 取貨</b>
                  <strong>{shippingSettings.sevenEleven ? `NT$ ${shippingSettings.sevenEleven}` : "免運"}</strong>
                </label>}
                {shippingSettings?.homeDeliveryEnabled && <label>
                  <FormRadio name="delivery" value="home" checked={shippingMethod === "home"} required onChange={() => void changeShippingMethod("home")} />
                  <b>宅配</b>
                  <strong>{shippingSettings.homeDelivery ? `NT$ ${shippingSettings.homeDelivery}` : "免運"}</strong>
                </label>}
              </div>
              {shippingMethod === "store" && savedStores.length > 0 && (
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
              {shippingMethod === "store" && <div id="checkout-pickup-store" className={`checkout-store-field ${fieldErrors.pickupStore ? "has-error" : ""}`.trim()} aria-invalid={Boolean(fieldErrors.pickupStore)} aria-describedby={fieldErrors.pickupStore ? "checkout-pickup-store-error" : undefined}>
                <SevenElevenStorePicker
                  selectedStore={pickupStore}
                  onSelect={(store) => {
                    setSelectedSavedStoreId("");
                    setPickupStore(store);
                    clearFieldError("pickupStore");
                    setError("");
                  }}
                />
                <CheckoutFieldError id="checkout-pickup-store-error" message={fieldErrors.pickupStore} />
              </div>}
              {shippingMethod === "home" && <div className="form-grid checkout-delivery-address">
                <label className={`full ${fieldErrors.deliveryAddress ? "has-error" : ""}`.trim()}>
                  宅配地址
                  <FormInput id="checkout-deliveryAddress" required maxLength={200} value={deliveryAddress} placeholder="請輸入完整收件地址" aria-invalid={Boolean(fieldErrors.deliveryAddress)} aria-describedby={fieldErrors.deliveryAddress ? "checkout-delivery-address-error" : undefined} onChange={(event) => { setDeliveryAddress(event.target.value); clearFieldError("deliveryAddress"); }} />
                  <CheckoutFieldError id="checkout-delivery-address-error" message={fieldErrors.deliveryAddress} />
                </label>
              </div>}
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
                  <FormRadio name="payment" value="bank_transfer" checked required readOnly />
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
