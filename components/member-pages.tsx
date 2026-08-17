"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { MemberOrder, OrderPagination, Product } from "@/lib/types";
import { formatProductPrice } from "@/lib/product-price";
import { bankDisplayName, TAIWAN_BANKS } from "@/lib/taiwan-banks";
import ProductArtwork from "@/components/product-artwork";
import SevenElevenStorePicker from "@/components/seven-eleven-store-picker";
import {
  FormDatePicker,
  FormInput,
  FormSelect,
} from "@/components/form-controls";
import {SiteChrome} from "@/components/site-chrome";
import {
  changePassword,
  createMemberAddress,
  deleteMemberFavorite,
  deleteMemberAddress,
  getMemberAddresses,
  getMemberFavorites,
  getMemberOverview,
  getMemberOrder,
  getMemberOrders,
  getMemberProfile,
  logoutUser,
  updateMemberAddress,
  updateMemberOrderRemittance,
  updateMemberProfile,
  type MemberAddress,
  type MemberGender,
  type MemberOverview,
  type MemberProfile,
} from "@/lib/client-auth";
import { useAuthStore } from "@/lib/auth-store";
import { useFavoriteStore } from "@/lib/favorite-store";
import {
  claimCoupon,
  getClaimableCoupons,
  getMyCoupons,
} from "@/lib/promotions";
import type { PublicCoupon, UserCoupon } from "@/lib/types";
import type { SevenElevenStore } from "@/lib/api";
import { formatTaipeiDateTime } from "@/lib/date-time";
import { showToast } from "@/lib/toast";

const memberNav = [
  ["/account", "會員總覽"],
  ["/account/profile", "個人資料"],
  ["/account/password", "修改密碼"],
  ["/account/addresses", "超商門市管理"],
  ["/account/orders", "訂單紀錄"],
  ["/account/favorites", "收藏商品"],
  ["/account/coupons", "優惠券"],
  ["/account/notifications", "通知紀錄"],
];

const paymentLabels = {
  pending: "待付款",
  paid: "已付款",
  refunded: "已退款",
  failed: "付款失敗",
} as const;
const shippingLabels = {
  unfulfilled: "待出貨",
  preparing: "備貨中",
  shipped: "已出貨",
  delivered: "已送達",
} as const;
function visiblePageNumbers(
  current: number,
  total: number,
): Array<number | "ellipsis"> {
  if (total <= 7) return Array.from({ length: total }, (_, index) => index + 1);
  const pages = new Set([1, total, current - 1, current, current + 1]);
  const sorted = [...pages]
    .filter((page) => page >= 1 && page <= total)
    .sort((a, b) => a - b);
  const result: Array<number | "ellipsis"> = [];
  sorted.forEach((page, index) => {
    if (index > 0 && page - sorted[index - 1] > 1) result.push("ellipsis");
    result.push(page);
  });
  return result;
}

function MemberShell({
  title,
  eyebrow,
  headerActions,
  children,
}: {
  title: string;
  eyebrow: string;
  headerActions?: React.ReactNode;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const session = useAuthStore((state) => state.session);
  const hasHydrated = useAuthStore((state) => state.hasHydrated);
  if (!hasHydrated)
    return (
      <SiteChrome>
        <div className="account-loading">會員資料載入中…</div>
      </SiteChrome>
    );
  if (!session)
    return (
      <SiteChrome>
        <section className="member-login-required">
          <p className="eyebrow">MEMBERS ONLY</p>
          <h1>請先登入會員</h1>
          <p>登入後即可管理會員資料、訂單與收藏。</p>
          <Link href="/auth/login" className="primary-button">
            前往登入 <span>→</span>
          </Link>
        </section>
      </SiteChrome>
    );
  return (
    <SiteChrome>
      <div className="member-head">
        <div>
          <p className="eyebrow">MEMBER CENTER</p>
          <h1>{session.name}，歡迎回來</h1>
        </div>
        <p>
          {session.account}
          <br />
          <b>敲敲 MEMBER</b>
        </p>
      </div>
      <div className="member-layout">
        <aside className="member-nav">
          <p className="eyebrow">MY ACCOUNT</p>
          {memberNav.map(([href, label], index) => (
            <Link
              className={
                pathname === href ||
                (href !== "/account" && pathname.startsWith(href))
                  ? "active"
                  : ""
              }
              href={href}
              key={href}
            >
              <span>{String(index + 1).padStart(2, "0")}</span>
              {label}
              <i>→</i>
            </Link>
          ))}
          <button
            className="member-logout"
            onClick={() => {
              logoutUser();
              router.push("/auth/login");
            }}
          >
            登出會員
          </button>
        </aside>
        <section className="member-content">
          <header>
            <div className="member-title">
              <p className="eyebrow">{eyebrow}</p>
              <h2>{title}</h2>
            </div>
            {headerActions}
          </header>
          {children}
        </section>
      </div>
    </SiteChrome>
  );
}

export function MemberDashboard() {
  const router = useRouter();
  const [overview, setOverview] = useState<MemberOverview>();
  const [error, setError] = useState("");
  useEffect(() => {
    void getMemberOverview()
      .then(setOverview)
      .catch((cause) =>
        setError(cause instanceof Error ? cause.message : "會員總覽載入失敗"),
      );
  }, []);
  return (
    <MemberShell title="會員總覽" eyebrow="OVERVIEW">
      {error && <p className="member-message">{error}</p>}
      <div className="member-stats">
        <div>
          <span>累積訂單</span>
          <b>{overview?.orderCount ?? "—"}</b>
          <small>ORDERS</small>
        </div>
        <div>
          <span>收藏商品</span>
          <b>{overview?.favoriteCount ?? "—"}</b>
          <small>FAVORITES</small>
        </div>
        <div>
          <span>可用優惠券</span>
          <b>{overview?.availableCouponCount ?? "—"}</b>
          <small>COUPONS</small>
        </div>
      </div>
      <div className="member-shortcuts">
        {memberNav.slice(1).map(([href, label]) => (
          <Link href={href} key={href}>
            <b>{label}</b>
            <span>進入管理 →</span>
          </Link>
        ))}
      </div>
      <button
        type="button"
        className="member-logout member-mobile-logout"
        onClick={() => {
          logoutUser();
          router.push("/auth/login");
        }}
      >
        登出會員
      </button>
    </MemberShell>
  );
}

export function ProfilePage() {
  const [profile, setProfile] = useState<MemberProfile>();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [birthday, setBirthday] = useState("");
  const [gender, setGender] = useState<MemberGender>("undisclosed");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    void getMemberProfile()
      .then((data) => {
        setProfile(data);
        setName(data.name);
        setPhone(data.phone);
        setBirthday(data.birthday ?? "");
        setGender(data.gender);
      })
      .catch((cause) =>
        showToast(
          cause instanceof Error ? cause.message : "個人資料載入失敗",
          "error",
        ),
      );
  }, []);
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalizedPhone = phone.trim();
    if (!/^09\d{8}$/.test(normalizedPhone)) {
      setMessage("請輸入 09 開頭的 10 位數手機號碼");
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      const updated = await updateMemberProfile({
        name,
        phone: normalizedPhone,
        birthday: birthday || null,
        gender,
      });
      setProfile(updated);
      showToast("個人資料已儲存");
    } catch (cause) {
      const error = cause instanceof Error ? cause.message : "個人資料更新失敗";
      setMessage(error);
    } finally {
      setBusy(false);
    }
  };
  return (
    <MemberShell title="個人資料" eyebrow="PROFILE">
      <form className="member-form" onSubmit={submit}>
        <div className="form-grid">
          <label>
            姓名
            <FormInput
              name="name"
              required
              maxLength={80}
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </label>
          <label>
            Email
            <FormInput
              name="email"
              type="email"
              disabled
              value={profile?.email ?? "載入中…"}
            />
          </label>
          <label>
            手機號碼
            <FormInput
              name="phone"
              required
              type="tel"
              inputMode="numeric"
              autoComplete="tel"
              maxLength={10}
              pattern="09[0-9]{8}"
              placeholder="0912345678"
              value={phone}
              onChange={(event) => { setPhone(event.target.value); setMessage(""); }}
            />
          </label>
          <label>
            生日
            <FormDatePicker
              name="birthday"
              value={birthday}
              onValueChange={setBirthday}
            />
          </label>
          <label>
            性別
            <FormSelect
              name="gender"
              value={gender}
              onValueChange={(value) => setGender(value as MemberGender)}
            >
              <option value="undisclosed">不透露</option>
              <option value="female">女性</option>
              <option value="male">男性</option>
              <option value="other">其他</option>
            </FormSelect>
          </label>
        </div>
        <p className="member-message">{message}</p>
        <button className="member-save" disabled={busy || !profile}>
          {busy ? "儲存中…" : "儲存修改"}
        </button>
      </form>
    </MemberShell>
  );
}

export function PasswordPage() {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setBusy(true);
    setMessage("");
    try {
      await changePassword({
        currentPassword: String(data.get("current")),
        newPassword: String(data.get("next")),
        confirmPassword: String(data.get("confirm")),
      });
      showToast("密碼修改成功");
      form.reset();
    } catch (cause) {
      const error = cause instanceof Error ? cause.message : "修改失敗";
      setMessage(error);
    } finally {
      setBusy(false);
    }
  };
  return (
    <MemberShell title="修改密碼" eyebrow="SECURITY">
      <form className="member-form narrow" onSubmit={submit}>
        <label>
          目前密碼
          <FormInput name="current" required type="password" />
        </label>
        <label>
          新密碼
          <FormInput
            name="next"
            required
            type="password"
            minLength={8}
            placeholder="至少 8 個字元"
          />
        </label>
        <label>
          再次輸入新密碼
          <FormInput name="confirm" required type="password" minLength={8} />
        </label>
        <p className="member-message">{message}</p>
        <button className="member-save" disabled={busy}>
          {busy ? "更新中…" : "更新密碼"}
        </button>
      </form>
    </MemberShell>
  );
}

export function AddressesPage() {
  const [addresses, setAddresses] = useState<MemberAddress[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<MemberAddress>();
  const [selectedStore, setSelectedStore] = useState<SevenElevenStore | null>(
    null,
  );
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const reload = async () => setAddresses(await getMemberAddresses());
  useEffect(() => {
    void getMemberAddresses()
      .then(setAddresses)
      .catch((cause) =>
        showToast(
          cause instanceof Error ? cause.message : "超商門市載入失敗",
          "error",
        ),
      );
  }, []);
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedStore) {
      setMessage("請先選擇 7-ELEVEN 門市");
      return;
    }
    const data = new FormData(event.currentTarget);
    const input = {
      recipient: String(data.get("recipient")),
      phone: String(data.get("phone")),
      pickupStore: {
        provider: "UNIMART" as const,
        storeId: selectedStore.storeId,
      },
      isDefault: editing?.isDefault ?? false,
    };
    setBusy(true);
    setMessage("");
    try {
      if (editing) await updateMemberAddress(editing.id, input);
      else await createMemberAddress(input);
      await reload();
      setEditing(undefined);
      setSelectedStore(null);
      setOpen(false);
      const success = editing ? "超商門市已更新" : "超商門市已新增";
      showToast(success);
    } catch (cause) {
      const error = cause instanceof Error ? cause.message : "超商門市儲存失敗";
      setMessage(error);
    } finally {
      setBusy(false);
    }
  };
  const setDefault = async (item: MemberAddress) => {
    setMessage("");
    try {
      await updateMemberAddress(item.id, { ...item, isDefault: true });
      await reload();
      showToast("預設門市已更新");
    } catch (cause) {
      const error = cause instanceof Error ? cause.message : "預設門市更新失敗";
      showToast(error, "error");
    }
  };
  const remove = async (id: string) => {
    setMessage("");
    try {
      await deleteMemberAddress(id);
      await reload();
      if (editing?.id === id) {
        setEditing(undefined);
        setSelectedStore(null);
        setOpen(false);
      }
      showToast("超商門市已刪除");
    } catch (cause) {
      const error = cause instanceof Error ? cause.message : "超商門市刪除失敗";
      showToast(error, "error");
    }
  };
  const toggleCreate = () => {
    if (open && !editing) {
      setOpen(false);
      setSelectedStore(null);
      return;
    }
    setEditing(undefined);
    setSelectedStore(null);
    setOpen(true);
  };
  return (
    <MemberShell title="超商門市管理" eyebrow="PICKUP STORES">
      <div className="member-toolbar">
        <p>共 {addresses.length} 筆常用門市</p>
        <button onClick={toggleCreate}>＋ 新增門市</button>
      </div>
      {open && (
        <form
          className="address-form form-grid"
          onSubmit={submit}
          key={editing?.id ?? "new"}
        >
          <label>
            收件人
            <FormInput
              name="recipient"
              required
              maxLength={80}
              defaultValue={editing?.recipient}
            />
          </label>
          <label>
            手機號碼
            <FormInput
              name="phone"
              required
              inputMode="tel"
              pattern="09[0-9]{8}"
              maxLength={10}
              defaultValue={editing?.phone}
              placeholder="0912345678"
            />
          </label>
          <div className="full store-field">
            <span>7-ELEVEN 門市</span>
            <SevenElevenStorePicker
              selectedStore={selectedStore}
              onSelect={(store) => {
                setSelectedStore(store);
                setMessage("");
              }}
            />
          </div>
          <button className="member-save" disabled={busy || !selectedStore}>
            {busy ? "儲存中…" : editing ? "儲存修改" : "儲存門市"}
          </button>
        </form>
      )}
      <p className="member-message">{message}</p>
      <div className="address-list">
        {addresses.map((item) => (
          <article key={item.id}>
            {item.isDefault && <span>預設門市</span>}
            <h3>{item.recipient}</h3>
            <p>{item.phone}</p>
            <p className="store-name">
              <b>7-ELEVEN {item.pickupStore.storeName}門市</b> ·{" "}
              {item.pickupStore.storeId}
            </p>
            <p>{item.pickupStore.storeAddress}</p>
            {item.pickupStore.storePhone && (
              <p>{item.pickupStore.storePhone}</p>
            )}
            <div>
              {!item.isDefault && (
                <button onClick={() => void setDefault(item)}>設為預設</button>
              )}
              <button
                className="address-icon-button"
                onClick={() => {
                  setEditing(item);
                  setSelectedStore(item.pickupStore);
                  setOpen(true);
                }}
                aria-label={`編輯 ${item.pickupStore.storeName}門市`}
                title="編輯"
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M4 20h4l11-11a2.8 2.8 0 0 0-4-4L4 16v4Z" />
                  <path d="m13.5 6.5 4 4" />
                </svg>
              </button>
              <button
                className="address-icon-button address-delete-button"
                onClick={() => void remove(item.id)}
                aria-label={`刪除 ${item.pickupStore.storeName}門市`}
                title="刪除"
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M4 7h16M9 7V4h6v3M7 7l1 13h8l1-13M10 11v5M14 11v5" />
                </svg>
              </button>
            </div>
          </article>
        ))}
        {!addresses.length && (
          <div className="member-empty">尚未新增常用超商門市。</div>
        )}
      </div>
    </MemberShell>
  );
}

export function OrdersPage() {
  const [orders, setOrders] = useState<MemberOrder[]>([]);
  const [paymentFilter, setPaymentFilter] = useState("");
  const [shippingFilter, setShippingFilter] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<OrderPagination>({
    page: 1,
    pageSize: 10,
    total: 0,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [remittanceOrder, setRemittanceOrder] = useState<MemberOrder>();
  useEffect(() => {
    setLoading(true);
    setError("");
    void getMemberOrders({
      paymentStatus: paymentFilter,
      shippingStatus: shippingFilter,
      page,
      pageSize: 10,
    })
      .then((result) => {
        setOrders(result.data);
        setPagination(result.pagination);
      })
      .catch((cause) =>
        setError(cause instanceof Error ? cause.message : "訂單載入失敗"),
      )
      .finally(() => setLoading(false));
  }, [paymentFilter, shippingFilter, page]);
  return (
    <MemberShell title="訂單紀錄" eyebrow="ORDER HISTORY">
      <div className="order-filter-selects">
        <label>
          付款狀態
          <FormSelect
            value={paymentFilter}
            onValueChange={(value) => {
              setPaymentFilter(value);
              setPage(1);
            }}
          >
            <option value="">全部付款狀態</option>
            <option value="pending">待付款</option>
            <option value="paid">已付款</option>
            <option value="refunded">已退款</option>
            <option value="failed">付款失敗</option>
          </FormSelect>
        </label>
        <label>
          出貨狀態
          <FormSelect
            value={shippingFilter}
            onValueChange={(value) => {
              setShippingFilter(value);
              setPage(1);
            }}
          >
            <option value="">全部出貨狀態</option>
            <option value="unfulfilled">待出貨</option>
            <option value="preparing">備貨中</option>
            <option value="shipped">已出貨</option>
            <option value="delivered">已送達</option>
          </FormSelect>
        </label>
      </div>
      {error && <p className="member-message">{error}</p>}
      <div className="member-order-table">
        <div className="member-order-table-head">
          <span>訂單編號</span>
          <span>購買品項／數量</span>
          <span>金額</span>
          <span>配送方式</span>
          <span>付款方式</span>
          <span>付款狀態</span>
          <span>出貨狀態</span>
          <span>建立時間</span>
          <span />
        </div>
        {orders.map((order) => (
          <article key={order.id}>
            <b>{order.orderNo}</b>
            <div className="member-order-products">
              {order.items.map((item) => (
                <div key={item.id}>
                  <p>
                    {item.name} × {item.quantity}
                  </p>
                  {item.specifications.length > 0 && (
                    <small>
                      {item.specifications
                        .map(
                          (spec) =>
                            `${spec.specificationName}：${spec.optionName}`,
                        )
                        .join(" / ")}
                    </small>
                  )}
                </div>
              ))}
            </div>
            <strong>NT$ {order.total.toLocaleString()}</strong>
            <span>
              {order.shippingMethod === "home" ? "宅配" : order.pickupStoreName ? `${order.pickupStoreName}門市` : "7-ELEVEN 取貨"}
            </span>
            <span>
              {order.paymentMethod === "bank_transfer"
                ? "銀行轉帳"
                : order.paymentMethod}
            </span>
            <div className="order-payment-cell">
              <span>{paymentLabels[order.paymentStatus]}</span>
              {order.paymentStatus === "pending" &&
                !order.remittingBank.trim() &&
                !order.transferAccountLastFive.trim() && (
                <button type="button" onClick={() => setRemittanceOrder(order)}>
                  匯款
                </button>
              )}
            </div>
            <span>{shippingLabels[order.shippingStatus]}</span>
            <time>{formatTaipeiDateTime(order.createdAt)}</time>
            <Link href={`/account/orders/${order.id}`}>詳情 →</Link>
          </article>
        ))}
        {!loading && !orders.length && (
          <div className="member-empty">目前沒有符合篩選條件的訂單。</div>
        )}
        {loading && <div className="member-empty">訂單載入中…</div>}
      </div>
      {pagination.total > 0 && (
        <div className="member-order-pagination">
          <span className="member-order-total">共 {pagination.total} 筆</span>
          <div>
            <button
              type="button"
              disabled={page <= 1 || loading}
              onClick={() => setPage((value) => value - 1)}
              aria-label="上一頁"
            >
              ←
            </button>
            {visiblePageNumbers(pagination.page, pagination.totalPages).map(
              (item, index) =>
                item === "ellipsis" ? (
                  <span
                    className="pagination-ellipsis"
                    key={`ellipsis-${index}`}
                  >
                    …
                  </span>
                ) : (
                  <button
                    type="button"
                    className={item === pagination.page ? "active" : ""}
                    disabled={loading}
                    onClick={() => setPage(item)}
                    aria-current={item === pagination.page ? "page" : undefined}
                    key={item}
                  >
                    {item}
                  </button>
                ),
            )}
            <button
              type="button"
              disabled={page >= pagination.totalPages || loading}
              onClick={() => setPage((value) => value + 1)}
              aria-label="下一頁"
            >
              →
            </button>
          </div>
          <span>
            第 {pagination.page}／{pagination.totalPages} 頁
          </span>
        </div>
      )}
      {remittanceOrder && (
        <OrderRemittanceForm
          order={remittanceOrder}
          onClose={() => setRemittanceOrder(undefined)}
          onSaved={(updated) => {
            setOrders((current) =>
              current.map((order) =>
                order.id === updated.id ? updated : order,
              ),
            );
            setRemittanceOrder(updated);
          }}
        />
      )}
    </MemberShell>
  );
}

function OrderRemittanceForm({
  order,
  onSaved,
  onClose,
}: {
  order: MemberOrder;
  onSaved: (order: MemberOrder) => void;
  onClose: () => void;
}) {
  const [remittingBank, setRemittingBank] = useState(order.remittingBank);
  const [lastFive, setLastFive] = useState(order.transferAccountLastFive);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage("");
    if (!remittingBank.trim()) {
      const nextMessage = "請選擇轉出銀行";
      setMessage(nextMessage);
      return;
    }
    if (!/^\d{5}$/.test(lastFive)) {
      const nextMessage = "請輸入轉帳帳號後五碼";
      setMessage(nextMessage);
      return;
    }
    setSaving(true);
    try {
      const updated = await updateMemberOrderRemittance(order.id, {
        remittingBank: remittingBank.trim(),
        transferAccountLastFive: lastFive,
      });
      onSaved(updated);
      onClose();
      showToast("匯款資料已送出");
    } catch (cause) {
      const nextMessage =
        cause instanceof Error ? cause.message : "匯款資料送出失敗";
      setMessage(nextMessage);
    } finally {
      setSaving(false);
    }
  };
  return (
    <div
      className="member-remittance-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        className="member-remittance"
        role="dialog"
        aria-modal="true"
        aria-labelledby="remittance-title"
      >
        <header>
          <div>
            <p className="eyebrow">BANK TRANSFER</p>
            <h3 id="remittance-title">填寫匯款資訊</h3>
          </div>
          <button type="button" onClick={onClose} aria-label="關閉匯款資訊">
            ×
          </button>
        </header>
        <div className="member-remittance-account">
          <p>
            <span>收款銀行</span>
            <b>
              {order.bankCode} {order.bankName} {order.bankBranchName}
            </b>
          </p>
          <p>
            <span>戶名</span>
            <b>{order.bankAccountName}</b>
          </p>
          <p>
            <span>帳號</span>
            <b>{order.bankAccountNumber}</b>
          </p>
          <p>
            <span>應付金額</span>
            <b>NT$ {order.total.toLocaleString()}</b>
          </p>
        </div>
        {order.bankTransferNote && (
          <p className="member-remittance-note">{order.bankTransferNote}</p>
        )}
        <form className="form-grid" onSubmit={submit}>
          <label>
            轉出銀行
            <FormSelect
              name="remittingBank"
              required
              value={remittingBank}
              onValueChange={setRemittingBank}
            >
              <option value="" disabled>請選擇轉出銀行</option>
              {TAIWAN_BANKS.map((bank) => (
                <option value={bankDisplayName(bank)} key={bank.code}>
                  {bankDisplayName(bank)}
                </option>
              ))}
            </FormSelect>
          </label>
          <label>
            轉帳帳號後五碼
            <FormInput
              value={lastFive}
              inputMode="numeric"
              maxLength={5}
              onChange={(event) =>
                setLastFive(event.target.value.replace(/\D/g, "").slice(0, 5))
              }
              placeholder="請輸入 5 碼數字"
            />
          </label>
          <p className="full member-message">{message}</p>
          <button className="member-save" disabled={saving}>
            {saving ? "送出中…" : "送出匯款資料"}
          </button>
        </form>
      </section>
    </div>
  );
}

export function OrderDetailPage({ orderId }: { orderId: string }) {
  const [order, setOrder] = useState<MemberOrder | null | undefined>(undefined);
  useEffect(() => {
    void getMemberOrder(orderId)
      .then(setOrder)
      .catch(() => setOrder(null));
  }, [orderId]);
  if (order === undefined)
    return (
      <MemberShell title="訂單詳情" eyebrow="ORDER DETAIL">
        <div className="member-empty">載入中…</div>
      </MemberShell>
    );
  if (!order)
    return (
      <MemberShell title="找不到訂單" eyebrow="ORDER DETAIL">
        <div className="member-empty">
          此訂單不存在。<Link href="/account/orders">返回訂單紀錄</Link>
        </div>
      </MemberShell>
    );
  const progress = ["已付款", "備貨中", "已出貨", "已送達"];
  const current = order.paymentStatus !== "paid"
    ? -1
    : ({ unfulfilled: 0, preparing: 1, shipped: 2, delivered: 3 } as const)[order.shippingStatus];
  return (
    <MemberShell title={`訂單 ${order.orderNo}`} eyebrow="ORDER DETAIL">
      <div className="order-detail-head">
        <div className="order-detail-statuses">
          <span className="order-status">付款：{paymentLabels[order.paymentStatus]}</span>
          <span className="order-status">出貨：{shippingLabels[order.shippingStatus]}</span>
        </div>
        <time>建立於 {formatTaipeiDateTime(order.createdAt)}</time>
      </div>
      {order.paymentStatus === "paid" && (
        <div className="order-progress">
          {progress.map((step, index) => (
            <div className={index <= current ? "done" : ""} key={step}>
              <i>{index < current ? "✓" : index + 1}</i>
              <b>{step}</b>
            </div>
          ))}
        </div>
      )}
      <div className="order-detail-items">
        <h3>商品明細</h3>
        {order.items.map((item) => (
          <div className="member-order-detail-product" key={item.id}>
            {item.imageUrl ? (
              <img src={item.imageUrl} alt={item.name} />
            ) : (
              <span className="order-image-empty">NO IMAGE</span>
            )}
            <span>
              <b>{item.name}</b>
              {item.specifications.length > 0 && (
                <small>
                  {item.specifications
                    .map(
                      (spec) => `${spec.specificationName}：${spec.optionName}`,
                    )
                    .join(" / ")}
                </small>
              )}
            </span>
            <small>
              NT$ {item.price.toLocaleString()} × {item.quantity}
            </small>
            <b>NT$ {(item.price * item.quantity).toLocaleString()}</b>
          </div>
        ))}
        <p>
          <span>收件人</span>
          <b>
            {order.recipientName} · {order.recipientPhone}
          </b>
        </p>
        <p>
          <span>配送方式</span>
          <b>
            {order.shippingMethod === "home"
              ? "宅配"
              : order.pickupStoreName
              ? `7-ELEVEN ${order.pickupStoreName}門市（${order.pickupStoreId}）`
              : "—"}
          </b>
        </p>
        <p>
          <span>{order.shippingMethod === "home" ? "宅配地址" : "門市地址"}</span>
          <b>{order.shippingMethod === "home" ? order.deliveryAddress || "—" : order.pickupStoreAddress || "—"}</b>
        </p>
        <p>
          <span>付款／出貨狀態</span>
          <b>
            {paymentLabels[order.paymentStatus]} ·{" "}
            {shippingLabels[order.shippingStatus]}
          </b>
        </p>
        {order.trackingNo && (
          <p>
            <span>7-ELEVEN 交貨便代碼</span>
            <b>{order.trackingNo}</b>
          </p>
        )}
        <p>
          <span>商品小計／折扣／運費</span>
          <b>
            NT$ {order.subtotal.toLocaleString()}／−NT${" "}
            {order.discount.toLocaleString()}／NT${" "}
            {order.shipping.toLocaleString()}
          </b>
        </p>
        <p className="total">
          <span>訂單總額</span>
          <b>NT$ {order.total.toLocaleString()}</b>
        </p>
      </div>
    </MemberShell>
  );
}

export function FavoritesPage() {
  const [items, setItems] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    void getMemberFavorites()
      .then(setItems)
      .catch((cause) =>
        showToast(
          cause instanceof Error ? cause.message : "收藏商品載入失敗",
          "error",
        ),
      )
      .finally(() => setLoading(false));
  }, []);
  const remove = async (id: string) => {
    try {
      await deleteMemberFavorite(id);
      setItems((current) => current.filter((item) => item.id !== id));
      useFavoriteStore.getState().reset();
      showToast("已移除收藏商品");
    } catch (cause) {
      const error = cause instanceof Error ? cause.message : "移除收藏失敗";
      showToast(error, "error");
    }
  };
  return (
    <MemberShell title="收藏商品" eyebrow="MY FAVORITES">
      <div className="member-product-grid">
        {items.map((product) => (
          <article key={product.id}>
            <Link href={`/products/${product.slug}`}>
              <ProductArtwork product={product} />
              <p>{product.category}</p>
              <h3>{product.name}</h3>
              <strong>{formatProductPrice(product)}</strong>
            </Link>
            <button onClick={() => void remove(product.id)}>移除收藏</button>
          </article>
        ))}
        {loading && <div className="member-empty">收藏商品載入中…</div>}
        {!loading && !items.length && (
          <div className="member-empty">
            還沒有收藏商品。<Link href="/products">探索商品 →</Link>
          </div>
        )}
      </div>
    </MemberShell>
  );
}

function couponValue(coupon: PublicCoupon | UserCoupon) {
  if (coupon.discountType === "free_shipping") return "FREE SHIPPING";
  if (coupon.discountType === "percentage")
    return `${coupon.discountValue}% OFF`;
  return `NT$ ${coupon.discountValue.toLocaleString()} OFF`;
}

export function CouponsPage() {
  const router = useRouter();
  const [claimable, setClaimable] = useState<PublicCoupon[]>([]);
  const [mine, setMine] = useState<UserCoupon[]>([]);
  const [tab, setTab] = useState<"center" | UserCoupon["status"]>("available");
  const [busyId, setBusyId] = useState("");
  const load = async () => {
    const [available, owned] = await Promise.all([
      getClaimableCoupons(),
      getMyCoupons(),
    ]);
    setClaimable(available);
    setMine(owned);
  };
  useEffect(() => {
    void load().catch((cause) =>
      showToast(
        cause instanceof Error ? cause.message : "優惠券載入失敗",
        "error",
      ),
    );
  }, []);
  const claim = async (promotionId: string) => {
    setBusyId(promotionId);
    try {
      await claimCoupon(promotionId);
      showToast("優惠券領取成功");
      await load();
    } catch (cause) {
      const nextMessage =
        cause instanceof Error ? cause.message : "優惠券領取失敗";
      showToast(nextMessage, "error");
    } finally {
      setBusyId("");
    }
  };
  const displayed =
    tab === "center"
      ? claimable
      : mine.filter((coupon) => coupon.status === tab);
  const tabs = (
    <div className="coupon-tabs" role="tablist">
      {(
        [
          ["center", "優惠券中心"],
          ["available", "可使用"],
          ["used", "已使用"],
          ["expired", "已過期"],
        ] as const
      ).map(([value, label]) => (
        <button
          key={value}
          className={tab === value ? "active" : ""}
          onClick={() => setTab(value)}
        >
          {label}
          {value !== "center" &&
            ` (${mine.filter((coupon) => coupon.status === value).length})`}
        </button>
      ))}
    </div>
  );
  return (
    <MemberShell title="優惠券" eyebrow="MY COUPONS" headerActions={tabs}>
      <div className="coupon-list">
        {!displayed.length && (
          <p className="member-empty">目前沒有這個分類的優惠券。</p>
        )}
        {displayed.map((coupon) => (
          <article
            key={`${tab}-${coupon.id}`}
            className={"status" in coupon ? `coupon-${coupon.status}` : ""}
          >
            <div>
              <span>{couponValue(coupon)}</span>
              <h3>{coupon.name}</h3>
              <p>
                {coupon.description ||
                  (coupon.scopeType === "all"
                    ? "全館適用"
                    : coupon.scopeType === "products"
                      ? "指定商品適用"
                      : "指定分類適用")}
              </p>
              <small>
                {coupon.minOrderAmount
                  ? `滿 NT$ ${coupon.minOrderAmount.toLocaleString()} 可使用`
                  : "不限最低消費"}
              </small>
            </div>
            <time>
              {new Date(coupon.expiresAt).toLocaleDateString("zh-TW")} 到期
            </time>
            {tab === "center" ? (
              <button
                disabled={
                  (coupon as PublicCoupon).claimed ||
                  busyId === coupon.id ||
                  (coupon as PublicCoupon).remaining === 0
                }
                onClick={() => void claim(coupon.id)}
              >
                {(coupon as PublicCoupon).claimed
                  ? "已領取"
                  : busyId === coupon.id
                    ? "領取中…"
                    : "立即領取"}
              </button>
            ) : (coupon as UserCoupon).status === "available" ? (
              <button
                disabled={Date.parse(coupon.startAt) > Date.now()}
                onClick={() => {
                  localStorage.setItem("knock-knock-user-coupon", coupon.id);
                  localStorage.removeItem("knock-knock-coupon");
                  router.push("/checkout");
                }}
              >
                {Date.parse(coupon.startAt) > Date.now()
                  ? `${new Date(coupon.startAt).toLocaleDateString("zh-TW")} 生效`
                  : "結帳使用"}
              </button>
            ) : null}
          </article>
        ))}
      </div>
    </MemberShell>
  );
}

export function NotificationsPage() {
  const initial = [
    {
      id: 1,
      title: "AURORA 應援手燈補貨到著",
      date: "2026.08.04",
      read: false,
    },
    { id: 2, title: "會員應援季優惠券已發送", date: "2026.08.01", read: false },
    { id: 3, title: "會員條款與隱私政策更新", date: "2026.07.20", read: true },
  ];
  const [notices, setNotices] = useState(initial);
  return (
    <MemberShell title="通知紀錄" eyebrow="NOTIFICATIONS">
      <div className="member-toolbar">
        <p>{notices.filter((n) => !n.read).length} 則未讀通知</p>
        <button
          onClick={() => setNotices(notices.map((n) => ({ ...n, read: true })))}
        >
          全部標示為已讀
        </button>
      </div>
      <div className="notification-list">
        {notices.map((notice) => (
          <button
            className={notice.read ? "read" : ""}
            onClick={() =>
              setNotices(
                notices.map((n) =>
                  n.id === notice.id ? { ...n, read: true } : n,
                ),
              )
            }
            key={notice.id}
          >
            <i />
            <div>
              <time>{notice.date}</time>
              <h3>{notice.title}</h3>
            </div>
            <span>→</span>
          </button>
        ))}
      </div>
    </MemberShell>
  );
}

export function RefundsPage() {
  const [orders, setOrders] = useState<MemberOrder[]>([]);
  useEffect(() => {
    void getMemberOrders({ pageSize: 50 }).then((result) =>
      setOrders(result.data),
    );
  }, []);
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const action = String(data.get("action"));
    const nextMessage =
      action === "cancel"
        ? "訂單取消申請已送出"
        : "退款申請已送出，我們將於 1–3 個工作天內審核";
    showToast(nextMessage);
    form.reset();
  };
  return (
    <MemberShell title="退款或取消申請" eyebrow="REFUND & CANCELLATION">
      <div className="refund-notice">
        <b>申請前請注意</b>
        <p>
          已出貨訂單無法直接取消；收到商品後可依退換貨政策申請退款。退款申請中與已退款訂單不可重複申請。
        </p>
      </div>
      <form className="member-form" onSubmit={submit}>
        <label>
          選擇訂單
          <FormSelect name="order" required defaultValue="">
            <option value="" disabled>
              請選擇訂單
            </option>
            {orders
              .filter(
                (order) => order.paymentStatus !== "refunded",
              )
              .map((order) => (
                <option value={order.id} key={order.id}>
                  {order.orderNo} · {paymentLabels[order.paymentStatus]} · {shippingLabels[order.shippingStatus]} · NT${" "}
                  {order.total.toLocaleString()}
                </option>
              ))}
          </FormSelect>
        </label>
        <label>
          申請類型
          <FormSelect name="action">
            <option value="refund">申請退款</option>
            <option value="cancel">取消訂單</option>
          </FormSelect>
        </label>
        <label>
          申請原因
          <FormSelect name="reason">
            <option>重複下單</option>
            <option>商品規格選錯</option>
            <option>不再需要商品</option>
            <option>商品有瑕疵</option>
            <option>其他原因</option>
          </FormSelect>
        </label>
        <label>
          補充說明
          <textarea
            name="note"
            rows={5}
            placeholder="請描述申請原因或商品狀況"
          />
        </label>
        <button className="member-save" disabled={!orders.length}>
          送出申請
        </button>
      </form>
    </MemberShell>
  );
}
