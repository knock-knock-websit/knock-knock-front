"use client";

import { FormInput } from "@/components/form-controls";
import { getSevenElevenStores, type SevenElevenStore } from "@/lib/api";
import { useEffect, useState } from "react";

type Props = { selectedStore: SevenElevenStore | null; onSelect: (store: SevenElevenStore) => void };

export default function SevenElevenStorePicker({ selectedStore, onSelect }: Props) {
  const [open, setOpen] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [stores, setStores] = useState<SevenElevenStore[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const pageSize = 12;

  useEffect(() => {
    if (!open) return;
    let active = true;
    setLoading(true);
    setError("");
    void getSevenElevenStores({ search, page, pageSize }).then((result) => {
      if (!active) return;
      setStores(result.data);
      setTotal(result.total);
    }).catch((cause) => {
      if (active) setError(cause instanceof Error ? cause.message : "門市載入失敗");
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [open, page, search]);

  useEffect(() => {
    if (!open) return;
    const close = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", close);
    return () => document.removeEventListener("keydown", close);
  }, [open]);

  const submitSearch = () => {
    setPage(1);
    setSearch(searchInput.trim());
  };
  const pageCount = Math.max(1, Math.ceil(total / pageSize));

  return <div className="pickup-store-picker">
    {selectedStore ? <div className="selected-pickup-store"><div><p className="eyebrow">SELECTED STORE</p><b>7-ELEVEN {selectedStore.storeName}門市</b><span>{selectedStore.storeAddress}</span><small>門市代碼 {selectedStore.storeId}</small></div><button type="button" onClick={() => setOpen(true)}>重新選擇</button></div> : <button type="button" className="choose-store-button" onClick={() => setOpen(true)}>選擇 7-ELEVEN 取貨門市 <span>→</span></button>}
    {open && <div className="store-picker-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }}><section className="store-picker-modal" role="dialog" aria-modal="true" aria-labelledby="store-picker-title">
      <header><div><p className="eyebrow">7-ELEVEN PICKUP</p><h2 id="store-picker-title">選擇取貨門市</h2></div><button type="button" onClick={() => setOpen(false)} aria-label="關閉">×</button></header>
      <div className="store-picker-search"><FormInput value={searchInput} onChange={(event) => setSearchInput(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); submitSearch(); } }} placeholder="輸入門市代碼、店名或地址" autoFocus /><button type="button" onClick={submitSearch}>搜尋</button></div>
      <p className="store-picker-hint">可輸入縣市、行政區、路名或門市名稱縮小範圍。</p>
      <div className="store-picker-results" aria-busy={loading}>{loading ? <p className="store-picker-state">門市載入中…</p> : error ? <p className="store-picker-state error">{error}</p> : stores.length ? stores.map((store) => <article className={selectedStore?.storeId === store.storeId ? "selected" : ""} key={store.storeId}><div><b>{store.storeName}門市</b><span>{store.storeAddress}</span><small>門市代碼 {store.storeId}{store.storePhone ? ` · ${store.storePhone}` : ""}</small></div><button type="button" onClick={() => { onSelect(store); setOpen(false); }}>選擇</button></article>) : <p className="store-picker-state">找不到符合條件的門市</p>}</div>
      <footer><span>共 {total.toLocaleString()} 間門市</span><div><button type="button" disabled={page <= 1 || loading} onClick={() => setPage((current) => current - 1)}>上一頁</button><b>{page} / {pageCount}</b><button type="button" disabled={page >= pageCount || loading} onClick={() => setPage((current) => current + 1)}>下一頁</button></div></footer>
    </section></div>}
  </div>;
}
