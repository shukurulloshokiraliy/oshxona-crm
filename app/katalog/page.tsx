"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Icon } from "@/components/Icons";
import PublicShell from "@/components/PublicShell";
import { money, parseBranches } from "@/lib/format";
import { T, usePubLang } from "@/lib/pubtext";
import type { Category, Product } from "@/lib/types";

interface Catalog {
  cafeName: string;
  currency: string;
  instagram: string;
  branches: string;
  categories: Category[];
  products: Product[];
  tables: { id: string; name: string }[];
}

function Menu() {
  const params = useSearchParams();
  const tableId = params.get("stol") || "";
  const [lang, setLang] = usePubLang();
  const t = T[lang];
  const [cat, setCat] = useState<Catalog | null>(null);
  const [qty, setQty] = useState<Record<string, number>>({});
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [done, setDone] = useState<{ number: number; total: number } | null>(null);
  const [active, setActive] = useState("");
  const [q, setQ] = useState("");

  useEffect(() => {
    fetch("/api/public/catalog", { cache: "no-store" })
      .then((r) => r.json())
      .then((d: Catalog) => {
        setCat(d);
        setActive(d.categories[0]?.id || "");
      });
  }, []);

  const table = cat?.tables.find((x) => x.id === tableId);
  const lines = useMemo(
    () => (cat ? cat.products.filter((p) => qty[p.id] > 0).map((p) => ({ p, q: qty[p.id] })) : []),
    [cat, qty]
  );
  const count = lines.reduce((n, l) => n + l.q, 0);
  const total = lines.reduce((n, l) => n + l.q * l.p.price, 0);
  const branches = parseBranches(cat?.branches || "");

  const set = (id: string, d: number) =>
    setQty((m) => {
      const v = Math.max(0, Math.min(20, (m[id] || 0) + d));
      const n = { ...m };
      if (v) n[id] = v;
      else delete n[id];
      return n;
    });

  async function order() {
    setErr("");
    setBusy(true);
    try {
      const res = await fetch("/api/public/order", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ items: lines.map((l) => ({ productId: l.p.id, qty: l.q })), tableId, guestName: name, guestPhone: phone, comment }),
      });
      const d = await res.json();
      if (!res.ok) setErr(d.error || "Error");
      else {
        setDone(d);
        setQty({});
      }
    } catch {
      setErr("Network error");
    } finally {
      setBusy(false);
    }
  }

  const cur = cat?.currency || "";
  const ql = q.trim().toLowerCase();
  const matches = (p: Product) => !ql || p.name.toLowerCase().includes(ql);
  const shown = cat ? cat.products.filter(matches) : [];

  return (
    <PublicShell name={cat?.cafeName || "Barakat"} lang={lang} setLang={setLang} instagram={cat?.instagram}>
      {!cat ? (
        <div className="pub-body"><p className="muted">…</p></div>
      ) : (
        <div className="pub-body">
          {table ? <div className="pub-table-tag"><Icon name="table" size={20} /> {t.tableFor} {table.name}</div> : null}
          {branches.length ? (
            <div className="cat-info">
              {branches.map((b) => (
                <span key={b.address}><Icon name="pin" size={18} /> {b.address} · <Icon name="clock" size={16} /> {b.hours}</span>
              ))}
            </div>
          ) : null}

          <input className="pub-search" placeholder={t.search} value={q} onChange={(e) => setQ(e.target.value)} aria-label={t.search} />

          {!ql ? (
            <div className="cat-bar" role="tablist">
              {cat.categories.map((c) => (
                <button
                  key={c.id}
                  role="tab"
                  className={"cat-pill" + (active === c.id ? " on" : "")}
                  style={{ ["--c" as string]: c.color }}
                  onClick={() => {
                    setActive(c.id);
                    document.getElementById("cat-" + c.id)?.scrollIntoView({ behavior: "smooth", block: "start" });
                  }}
                >
                  <Icon name={c.icon} size={20} /> {c.name}
                </button>
              ))}
            </div>
          ) : null}

          {ql && shown.length === 0 ? <p className="muted">{t.empty}</p> : null}

          {cat.categories.map((c) => {
            const items = shown.filter((p) => p.categoryId === c.id);
            if (!items.length) return null;
            return (
              <section key={c.id} className="menu-sec" style={{ ["--c" as string]: c.color }}>
                <h2 id={"cat-" + c.id}><i /> {c.name}</h2>
                <div className="menu-grid">
                  {items.map((p) => (
                    <article key={p.id} className="dish">
                      <div className="dish-img" style={p.image ? { backgroundImage: `url(${p.image})` } : undefined}>
                        {!p.image ? <Icon name={c.icon} size={46} /> : null}
                      </div>
                      <div className="dish-body">
                        <div>
                          <div className="dish-name">{p.name}</div>
                          {p.unit ? <div className="dish-unit">{p.unit}</div> : null}
                        </div>
                        <div className="dish-foot">
                          <span className="dish-price">{money(p.price)} {cur}</span>
                          <span className="qty-ctl">
                            {qty[p.id] ? (
                              <>
                                <button onClick={() => set(p.id, -1)} aria-label="−"><Icon name="minus" size={20} /></button>
                                <b>{qty[p.id]}</b>
                              </>
                            ) : null}
                            <button className="add" onClick={() => set(p.id, 1)} aria-label={p.name + " +"}><Icon name="plus" size={20} /></button>
                          </span>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}

      {count > 0 && !open ? (
        <div className="cart-bar">
          <button className="btn primary lg" onClick={() => { setDone(null); setOpen(true); }}>
            <Icon name="receipt" size={22} /> {t.cart} · {count} {t.pcs} · {money(total)} {cur}
          </button>
        </div>
      ) : null}

      {open || done ? (
        <div className="sheet-back" onClick={(e) => { if (e.target === e.currentTarget) { setOpen(false); setDone(null); } }}>
          <div className="sheet" role="dialog" aria-modal="true">
            {done ? (
              <div className="ok-box">
                <div className="ok-ico"><Icon name="check" size={36} /></div>
                <div className="big">№{done.number}</div>
                <h2>{t.ok}</h2>
                <p className="muted">{t.okText} {t.total}: {money(done.total)} {cur}</p>
                <button className="btn primary lg block" onClick={() => { setDone(null); setOpen(false); }}>{t.close}</button>
              </div>
            ) : (
              <>
                <h2>{t.yourOrder}</h2>
                {lines.map((l) => (
                  <div className="sheet-line" key={l.p.id}>
                    <span className="nm">{l.p.name}<br /><small className="muted">{money(l.p.price)} {cur}</small></span>
                    <span className="qty-ctl">
                      <button onClick={() => set(l.p.id, -1)} aria-label="−"><Icon name="minus" size={20} /></button>
                      <b>{l.q}</b>
                      <button className="add" onClick={() => set(l.p.id, 1)} aria-label="+"><Icon name="plus" size={20} /></button>
                    </span>
                  </div>
                ))}
                <div className="sheet-total"><span>{t.total}</span><span>{money(total)} {cur}</span></div>
                {!table ? (
                  <label className="field"><span>{t.name}</span><input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" /></label>
                ) : null}
                <label className="field"><span>{t.phone}</span><input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" autoComplete="tel" placeholder="+380 …" /></label>
                <label className="field"><span>{t.comment}</span><input value={comment} onChange={(e) => setComment(e.target.value)} /></label>
                {err ? <div className="auth-err" role="alert" style={{ marginBottom: 12 }}>{err}</div> : null}
                <button className="btn primary lg block" disabled={busy || (!name && !phone && !table)} onClick={() => order()}>
                  {busy ? t.sending : t.send}
                </button>
                <button className="btn ghost block" style={{ marginTop: 8 }} onClick={() => setOpen(false)}>{t.back}</button>
              </>
            )}
          </div>
        </div>
      ) : null}
    </PublicShell>
  );
}

export default function KatalogPage() {
  return (
    <Suspense fallback={null}>
      <Menu />
    </Suspense>
  );
}
