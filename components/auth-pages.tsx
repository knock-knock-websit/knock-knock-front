"use client";

import Link from "next/link";
import { FormEvent, InputHTMLAttributes, ReactNode, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {SiteChrome} from "@/components/site-chrome";
import { FormInput } from "@/components/form-controls";
import { getPendingVerification, getSession, loginUser, logoutUser, registerUser, requestPasswordReset, resendVerification, resetPassword, verifyEmail, type AuthSession } from "@/lib/client-auth";
import { showToast } from "@/lib/toast";

function AuthFrame({ eyebrow, title, intro, children }: { eyebrow: string; title: string; intro: string; children: React.ReactNode }) {
  return <SiteChrome><section className="auth-layout"><aside><p className="eyebrow">KNOCK-KNOCK MEMBERS</p><h1>喜歡的每一刻，<br /><em>都為你收藏。</em></h1></aside><div className="auth-panel"><p className="eyebrow">{eyebrow}</p><h2>{title}</h2><p className="auth-intro">{intro}</p>{children}</div></section></SiteChrome>;
}

function Message({ text }: { text: string }) { return <p className={`auth-message ${text.includes("成功") || text.includes("寄出") ? "success" : ""}`} aria-live="polite">{text}</p>; }

type AuthFieldErrors = Record<string, string>;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function FieldError({ id, text }: { id: string; text?: string }) {
  return text ? <p className="auth-field-error" id={id} role="alert">{text}</p> : null;
}

type AuthInputProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  trailing?: ReactNode;
  error?: string;
  errorId?: string;
};

function AuthInput({ label, trailing, error, errorId, className = "", ...props }: AuthInputProps) {
  return <div className={`auth-field ${error ? "has-error" : ""}`}><label>{label}{trailing && <span>{trailing}</span>}<FormInput {...props} className={`auth-control ${className}`.trim()} aria-invalid={Boolean(error)} aria-describedby={error ? errorId : props["aria-describedby"]} /></label><FieldError id={errorId ?? ""} text={error} /></div>;
}

export function LoginPage() {
  const router = useRouter(); const [message, setMessage] = useState(""); const [busy, setBusy] = useState(false); const [fieldErrors, setFieldErrors] = useState<AuthFieldErrors>({});
  const clearError = (field: string) => setFieldErrors((current) => current[field] ? { ...current, [field]: "" } : current);
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const account = String(data.get("account") ?? "").trim().toLowerCase();
    const password = String(data.get("password") ?? "");
    const errors: AuthFieldErrors = {};
    if (!account) errors.account = "請輸入 Email";
    else if (!emailPattern.test(account)) errors.account = "請輸入正確的 Email 格式";
    if (!password) errors.password = "請輸入密碼";
    setFieldErrors(errors);
    setMessage("");
    if (Object.keys(errors).length) return;
    setBusy(true);
    try {
      await loginUser(account, password);
      if (window.history.length > 1) router.back();
      else router.replace("/");
    } catch (cause) {
      if (cause instanceof Error && cause.message === "EMAIL_NOT_VERIFIED") router.push("/auth/verify-email");
      else if (cause instanceof Error && cause.message === "帳號或密碼不正確") setFieldErrors({ password: cause.message });
      else setMessage(cause instanceof Error ? cause.message : "目前無法登入");
    } finally { setBusy(false); }
  };
  return <AuthFrame eyebrow="WELCOME BACK" title="會員登入" intro="使用 Email 登入你的帳號。"><form className="auth-form" onSubmit={submit} noValidate><AuthInput label="Email" name="account" required type="email" autoComplete="username" placeholder="name@example.com" error={fieldErrors.account} errorId="login-account-error" onChange={() => clearError("account")} /><AuthInput label="密碼" trailing={<Link href="/auth/forgot-password">忘記密碼？</Link>} name="password" required type="password" autoComplete="current-password" placeholder="請輸入密碼" error={fieldErrors.password} errorId="login-password-error" onChange={() => clearError("password")} /><Message text={message} /><button className="auth-submit" disabled={busy}>{busy ? "登入中…" : "登入"}<span>→</span></button></form><p className="auth-switch">還不是會員？<Link href="/auth/register">立即註冊</Link></p></AuthFrame>;
}

export function RegisterPage() {
  const router = useRouter(); const [message, setMessage] = useState(""); const [busy, setBusy] = useState(false); const [fieldErrors, setFieldErrors] = useState<AuthFieldErrors>({});
  const clearError = (field: string) => setFieldErrors((current) => current[field] ? { ...current, [field]: "" } : current);
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const name = String(data.get("name") ?? "").trim();
    const account = String(data.get("account") ?? "").trim().toLowerCase();
    const phone = String(data.get("phone") ?? "").trim();
    const password = String(data.get("password") ?? "");
    const confirm = String(data.get("confirm") ?? "");
    const errors: AuthFieldErrors = {};
    if (!name) errors.name = "請輸入姓名";
    else if (name.length > 80) errors.name = "姓名最多 80 個字元";
    if (!account) errors.account = "請輸入 Email";
    else if (!emailPattern.test(account)) errors.account = "請輸入正確的 Email 格式";
    else if (account.length > 254) errors.account = "Email 最多 254 個字元";
    if (!phone) errors.phone = "請輸入手機號碼";
    else if (!/^09\d{8}$/.test(phone)) errors.phone = "請輸入 09 開頭的 10 位數手機號碼";
    if (!password) errors.password = "請輸入密碼";
    else if (password.length < 8) errors.password = "密碼至少需要 8 個字元";
    else if (password.length > 128) errors.password = "密碼最多 128 個字元";
    if (!confirm) errors.confirm = "請再次輸入密碼";
    else if (password !== confirm) errors.confirm = "兩次輸入的密碼不一致";
    setFieldErrors(errors);
    setMessage("");
    if (Object.keys(errors).length) return;
    setBusy(true);
    try {
      await registerUser({ account, name, phone, type: "email", password });
      showToast("註冊成功，請完成 Email 驗證");
      router.push("/auth/verify-email");
    } catch (cause) {
      const errorMessage = cause instanceof Error ? cause.message : "目前無法註冊";
      if (errorMessage.includes("帳號已註冊")) setFieldErrors({ account: errorMessage });
      else setMessage(errorMessage);
    } finally { setBusy(false); }
  };
  return <AuthFrame eyebrow="JOIN THE CLUB" title="建立會員帳號" intro="使用 Email 建立帳號，開啟你的專屬收藏清單。"><form className="auth-form" onSubmit={submit} noValidate><AuthInput label="姓名" name="name" required maxLength={80} autoComplete="name" placeholder="如何稱呼你？" error={fieldErrors.name} errorId="register-name-error" onChange={() => clearError("name")} /><AuthInput label="Email" name="account" required type="email" maxLength={254} autoComplete="email" placeholder="name@example.com" error={fieldErrors.account} errorId="register-account-error" onChange={() => clearError("account")} /><AuthInput label="手機號碼" name="phone" required type="tel" inputMode="numeric" maxLength={10} autoComplete="tel" placeholder="0912345678" error={fieldErrors.phone} errorId="register-phone-error" onChange={() => clearError("phone")} /><AuthInput label="設定密碼" name="password" required minLength={8} maxLength={128} type="password" autoComplete="new-password" placeholder="8 至 128 個字元" error={fieldErrors.password} errorId="register-password-error" onChange={() => { clearError("password"); clearError("confirm"); }} /><AuthInput label="再次輸入密碼" name="confirm" required minLength={8} maxLength={128} type="password" autoComplete="new-password" placeholder="再次確認密碼" error={fieldErrors.confirm} errorId="register-confirm-error" onChange={() => clearError("confirm")} /><Message text={message} /><button className="auth-submit" disabled={busy}>{busy ? "建立帳號中…" : "建立帳號"}<span>→</span></button></form><p className="auth-switch">已經是會員？<Link href="/auth/login">返回登入</Link></p></AuthFrame>;
}

export function VerifyEmailPage() {
  const router = useRouter(); const [busy, setBusy] = useState(false); const [developmentCode, setDevelopmentCode] = useState<string>(); const [cooldown, setCooldown] = useState(0); const [codeError, setCodeError] = useState(""); const requestedOnEntry = useRef(false);
  const resend = async (automatic = false) => {
    if ((!automatic && cooldown > 0) || busy) return;
    setBusy(true);
    setCooldown(60);
    try {
      const result = await resendVerification();
      if (result?.developmentCode) setDevelopmentCode(result.developmentCode);
      setCooldown(result?.retryAfterSeconds ?? 60);
      showToast(automatic ? "驗證碼已寄出，請查看信箱" : "新的驗證碼已寄出");
    } catch (cause) {
      setCooldown(0);
      showToast(
        cause instanceof Error ? cause.message : "目前無法重新寄送",
        "error",
      );
    } finally { setBusy(false); }
  };
  useEffect(() => {
    setDevelopmentCode(getPendingVerification()?.developmentCode);
    if (requestedOnEntry.current) return;
    requestedOnEntry.current = true;
    void resend(true);
  // 僅在進入驗證頁時自動呼叫一次，避免開發模式重複寄送。
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setTimeout(() => setCooldown((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearTimeout(timer);
  }, [cooldown]);
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const code = String(new FormData(event.currentTarget).get("code") ?? "").trim();
    if (!code) {
      setCodeError("請輸入驗證碼");
      return;
    }
    if (!/^\d{6}$/.test(code)) {
      setCodeError("請輸入 6 位數驗證碼");
      return;
    }
    setCodeError("");
    setBusy(true);
    try {
      await verifyEmail(code);
      showToast("Email 驗證成功，即將前往登入");
      window.setTimeout(() => router.push("/auth/login"), 800);
    } catch (cause) {
      setCodeError(cause instanceof Error ? cause.message : "驗證失敗");
    } finally {
      setBusy(false);
    }
  };
  return <AuthFrame eyebrow="VERIFY YOUR EMAIL" title="驗證 Email" intro="我們已將 6 位數驗證碼寄到你的信箱，請在下方輸入。">{developmentCode && <div className="demo-code">本機開發驗證碼：<b>{developmentCode}</b></div>}<form className="auth-form" onSubmit={submit} noValidate><AuthInput label="驗證碼" className="code-input" name="code" inputMode="numeric" maxLength={6} autoComplete="one-time-code" placeholder="000000" error={codeError} errorId="verify-email-code-error" onChange={() => setCodeError("")} /><button className="auth-submit" disabled={busy}>{busy ? "驗證中…" : "確認驗證"}<span>→</span></button></form><button className="auth-text-button" disabled={busy || cooldown > 0} onClick={() => void resend()}>{cooldown > 0 ? `重新寄送驗證碼（${cooldown} 秒）` : "沒有收到？重新寄送驗證碼"}</button></AuthFrame>;
}

export function ForgotPasswordPage() {
  const [message, setMessage] = useState(""); const [busy, setBusy] = useState(false); const [emailError, setEmailError] = useState(""); const [developmentResetUrl, setDevelopmentResetUrl] = useState("");
  const submit = async (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); const email = String(new FormData(event.currentTarget).get("email") ?? "").trim(); if (!emailPattern.test(email)) { setEmailError("請輸入正確的 Email 格式"); return; } setEmailError(""); setMessage(""); setBusy(true); try { const result = await requestPasswordReset(email); setDevelopmentResetUrl(result?.developmentResetUrl ?? ""); showToast("若此 Email 已註冊，重設密碼連結將寄至你的信箱"); } catch (cause) { setMessage(cause instanceof Error ? cause.message : "目前無法處理"); } finally { setBusy(false); } };
  return <AuthFrame eyebrow="PASSWORD RECOVERY" title="忘記密碼" intro="輸入註冊時使用的 Email，我們會寄送一次性的重設密碼網址。"><form className="auth-form" onSubmit={submit} noValidate><AuthInput label="Email" name="email" required type="email" autoComplete="email" placeholder="name@example.com" error={emailError} errorId="forgot-email-error" onChange={() => setEmailError("")} /><Message text={message} />{developmentResetUrl && <div className="demo-code">本機開發連結：<Link href={developmentResetUrl}>前往重設密碼</Link></div>}<button className="auth-submit" disabled={busy}>{busy ? "寄送中…" : "寄送重設密碼連結"}<span>→</span></button></form><p className="auth-switch"><Link href="/auth/login">← 返回會員登入</Link></p></AuthFrame>;
}

export function ResetPasswordPage() {
  const router = useRouter(); const [message, setMessage] = useState(""); const [busy, setBusy] = useState(false); const [fieldErrors, setFieldErrors] = useState<AuthFieldErrors>({}); const [hasToken, setHasToken] = useState(true);
  useEffect(() => setHasToken(Boolean(new URLSearchParams(window.location.search).get("token"))), []);
  const submit = async (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); const data = new FormData(event.currentTarget); const password = String(data.get("password") ?? ""); const confirm = String(data.get("confirm") ?? ""); const errors: AuthFieldErrors = {}; if (password.length < 8) errors.password = "密碼至少需要 8 個字元"; if (!confirm) errors.confirm = "請再次輸入密碼"; else if (password !== confirm) errors.confirm = "兩次輸入的密碼不一致"; setFieldErrors(errors); setMessage(""); if (Object.keys(errors).length) return; const token = new URLSearchParams(window.location.search).get("token") ?? ""; if (!token) { setMessage("重設密碼連結不正確或已失效"); return; } setBusy(true); try { await resetPassword(token, password); showToast("密碼重設成功，即將前往登入"); window.setTimeout(() => router.push("/auth/login"), 900); } catch (cause) { setMessage(cause instanceof Error ? cause.message : "重設失敗"); } finally { setBusy(false); } };
  return <AuthFrame eyebrow="SET NEW PASSWORD" title="重設密碼" intro="設定一組新的會員登入密碼。">{!hasToken ? <><Message text="重設密碼連結不正確或已失效" /><Link className="auth-submit" href="/auth/forgot-password">重新取得連結<span>→</span></Link></> : <form className="auth-form" onSubmit={submit} noValidate><AuthInput label="新密碼" name="password" required minLength={8} type="password" autoComplete="new-password" placeholder="至少 8 個字元" error={fieldErrors.password} errorId="reset-password-error" onChange={() => setFieldErrors((current) => ({ ...current, password: "" }))} /><AuthInput label="確認新密碼" name="confirm" required minLength={8} type="password" autoComplete="new-password" placeholder="再次輸入新密碼" error={fieldErrors.confirm} errorId="reset-confirm-error" onChange={() => setFieldErrors((current) => ({ ...current, confirm: "" }))} /><Message text={message} /><button className="auth-submit" disabled={busy}>{busy ? "更新中…" : "更新密碼"}<span>→</span></button></form>}</AuthFrame>;
}

export function AccountPage() {
  const router = useRouter(); const [session, setSession] = useState<AuthSession | null | undefined>(undefined);
  useEffect(() => setSession(getSession()), []);
  if (session === undefined) return <SiteChrome><div className="account-loading">會員資料載入中…</div></SiteChrome>;
  if (!session) return <AuthFrame eyebrow="MEMBER CENTER" title="尚未登入" intro="登入會員即可查看帳號資料、收藏與訂單。"><Link href="/auth/login" className="auth-submit">前往登入<span>→</span></Link><p className="auth-switch">還不是會員？<Link href="/auth/register">立即註冊</Link></p></AuthFrame>;
  return <SiteChrome><section className="account-page"><div className="account-greeting"><p className="eyebrow">MEMBER CENTER</p><h1>嗨，{session.name}</h1><p>歡迎回到 KNOCK-KNOCK，你的心動收藏都在這裡。</p></div><div className="account-grid"><section><span>PROFILE</span><h2>會員資料</h2><dl><div><dt>姓名</dt><dd>{session.name}</dd></div><div><dt>會員帳號</dt><dd>{session.account}</dd></div><div><dt>驗證狀態</dt><dd>✓ 已驗證</dd></div></dl></section><section><span>ORDERS</span><h2>我的訂單</h2><p>目前還沒有完成的訂單。</p><Link href="/products">開始選購 →</Link></section><section><span>FAVORITES</span><h2>收藏商品</h2><p>你收藏的商品會顯示在這裡。</p><Link href="/products">探索商品 →</Link></section></div><button className="logout-button" onClick={() => { logoutUser(); router.push("/auth/login"); }}>登出會員</button></section></SiteChrome>;
}
