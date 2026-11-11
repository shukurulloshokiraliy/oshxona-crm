"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import AppShell from "@/components/AppShell";
import { Icon } from "@/components/Icons";
import { api, useStore } from "@/lib/useStore";
import { money, orderTotal, STATUS_LABEL } from "@/lib/format";
import { printHere, printOrder, useAutoPrint } from "@/lib/printjob";
import type { Order, OrderItem, Product } from "@/lib/types";

const STEPS = ["Taom tanlash", "Oshxonada", "To'lov"];

function stepIndex(s: Order["status"]) {
  if (s === "paid") return 3;
  if (s === "kitchen" || s === "ready") return 1;
  return 0;
}

export default function ReceiptPage() {
  const { id } = useParams<{ id: string }>();
  const { state, refresh } = useStore(4000);
  const router = useRouter();

  const [cat, setCat] = useState<string>("all");
  const [q, setQ] = useState("");
  const [view, setView] = useState<"menu" | "receipt">("menu");
  const [local, setLocal] = useState<OrderItem[] | null>(null);
  const [payOpen, setPayOpen] = useState(false);
  const [method, setMethod] = useState<"cash" | "card">("cash");
  const [busy, setBusy] = useState(false);
  const pending = useRef(0);
  // «Oshxonaga» bosilganda ham chek o'zi chiqadi (printer shu kompyuterda bo'lsa)
  const [here, setHere] = useState(false);
  useEffect(() => setHere(printHere()), []);
  useAutoPrint(state?.orders, here, refresh);

  const order = useMemo(() => state?.orders.find((o) => o.id === id) || null, [state, id]);

  if (!state) return <AppShell title="Chek" back={{ href: "/pos", label: "Stollarga" }} flush><div className="empty">Yuklanmoqda…</div></AppShell>;
  if (!order)
    return (
      <AppShell title="Chek topilmadi" back={{ href: "/pos", label: "Stollarga" }}>
        <div className="empty">
          <b>Bu chek mavjud emas</b>
          <span>U o&apos;chirilgan yoki yopilgan bo&apos;lishi mumkin.</span>
          <Link className="btn primary" href="/pos">Zalga qaytish</Link>
        </div>
      </AppShell>
    );

  const items = local ?? order.items;
  const total = items.reduce((s, i) => s + i.price * i.qty, 0);
  const count = items.reduce((s, i) => s + i.qty, 0);
  const waiting = state.orders.filter((o) => o.status === "waiting_cashier").length;
  const locked = order.status === "paid" || order.status === "canceled";
  const cur = stepIndex(order.status);
  const qtyOf = new Map(items.map((i) => [i.productId, i.qty]));
  const cats = state.categories.slice().sort((a, b) => a.sort - b.sort);
  const catColor = new Map(cats.map((c) => [c.id, c.color]));

  const products = state.products.filter(
    (p) =>
      p.active &&
      (cat === "all" || p.categoryId === cat) &&
      (!q.trim() || p.name.toLowerCase().includes(q.trim().toLowerCase()))
  );

  async function saveItems(next: OrderItem[]) {
    setLocal(next);
    pending.current++;
    await api(`/api/orders/${id}`, { method: "PATCH", body: JSON.stringify({ items: next }) });
    pending.current--;
    if (pending.current === 0) {
      await refresh();
      setLocal(null);
    }
  }

  async function patch(body: Record<string, unknown>) {
    setBusy(true);
    await api(`/api/orders/${id}`, { method: "PATCH", body: JSON.stringify(body) });
    await refresh();
    setBusy(false);
  }

  function addProduct(p: Product) {
    if (locked) return;
    const next = items.map((i) => ({ ...i }));
    const ex = next.find((i) => i.productId === p.id);
    if (ex) ex.qty += 1;
    else next.push({ id: `new-${p.id}-${Date.now()}`, productId: p.id, name: p.name, price: p.price, qty: 1, note: "" });
    saveItems(next);
  }

  function change(item: OrderItem, d: number) {
    const next = items.map((i) => (i.id === item.id ? { ...i, qty: i.qty + d } : i)).filter((i) => i.qty > 0);
    saveItems(next);
  }

  async function pay() {
    // Oshpaz cheki hali chiqmagan bo'lsa, to'lov bilan birga chiqadi (ikkala chek ham avtomatik)
    const needKitchen = !order!.printedAt;
    await patch({ status: "paid", paymentMethod: method, ...(needKitchen ? { printed: true } : {}) });
    setPayOpen(false);
    if (printHere()) {
      (async () => {
        try {
          if (needKitchen) await printOrder(id, "kitchen");
          await printOrder(id, "customer");
        } catch (e) {
          console.error("Chek chiqmadi:", e);
          if (needKitchen) await api(`/api/orders/${id}`, { method: "PATCH", body: JSON.stringify({ printed: false }) }).catch(() => {});
        }
      })();
    }
    router.push("/pos");
  }

  async function cancelOrder() {
    if (!confirm("Chek bekor qilinsinmi?")) return;
    await patch({ status: "canceled" });
    router.push("/pos");
  }

  const toggle = (
    <div className="seg only-sm" role="group" aria-label="Bo'lim">
      <button className={view === "menu" ? "on" : ""} onClick={() => setView("menu")}>
        <Icon name="utensils" size={16} /> Menyu
      </button>
      <button className={view === "receipt" ? "on" : ""} onClick={() => setView("receipt")}>
        <Icon name="receipt" size={16} /> Chek{count ? ` (${count})` : ""}
      </button>
    </div>
  );

  return (
    <AppShell
      title={`${order.tableName === "Bar" ? "Bar" : order.tableId ? `Stol ${order.tableName}` : order.tableName} · Chek #${order.number}`}
      hint={STATUS_LABEL[order.status]}
      waiting={waiting}
      cafe={state.settings.cafeName}
      back={{ href: "/pos", label: "Stollarga" }}
      flush
    >
      <div className="pos" data-view={view}>
        {/* ---------- Chap: chek ---------- */}
        <section className="receipt-pane" aria-label="Chek">
          <div className="pane-top only-sm" style={{ paddingBottom: 0 }}>{toggle}</div>

          <div className="steps" aria-label="Bosqichlar">
            {STEPS.map((s, i) => (
              <span key={s} className={"step" + (i < cur ? " done" : i === cur ? " now" : "")}>
                <i>{i < cur ? <Icon name="check" size={14} /> : i + 1}</i>
                {s}
              </span>
            ))}
          </div>

          <div className="lines">
            {items.length === 0 ? (
              <div className="empty">
                <div className="empty-ico"><Icon name="utensils" /></div>
                <b>Chek bo&apos;sh</b>
                <span>
                  <span className="hide-sm">O&apos;ngdagi menyudan taom bosing.</span>
                  <span className="only-sm">«Menyu» bo&apos;limidan taom bosing.</span>
                </span>
              </div>
            ) : (
              items.map((i) => (
                <div className="line" key={i.id}>
                  <div>
                    <div className="nm">{i.name}</div>
                    <div className="each">{money(i.price)} {state.settings.currency}</div>
                  </div>
                  {locked ? (
                    <b>× {i.qty}</b>
                  ) : (
                    <div className="stepper">
                      <button onClick={() => change(i, -1)} aria-label={`${i.name}: kamaytirish`}>
                        <Icon name={i.qty === 1 ? "trash" : "minus"} size={18} />
                      </button>
                      <span>{i.qty}</span>
                      <button onClick={() => change(i, 1)} aria-label={`${i.name}: ko'paytirish`}>
                        <Icon name="plus" size={18} />
                      </button>
                    </div>
                  )}
                  <div className="sum">{money(i.price * i.qty)}</div>
                </div>
              ))
            )}
          </div>

          <details className="details">
            <summary>Mijoz va izoh (ixtiyoriy)</summary>
            <div className="field" style={{ marginTop: 8 }}>
              <label>Mijoz ismi</label>
              <input defaultValue={order.guestName} onBlur={(e) => patch({ guestName: e.target.value })} />
            </div>
            <div className="field">
              <label>Telefon</label>
              <input defaultValue={order.guestPhone} inputMode="tel" onBlur={(e) => patch({ guestPhone: e.target.value })} />
            </div>
            <div className="field">
              <label>Oshpaz uchun izoh</label>
              <textarea defaultValue={order.comment} placeholder="Masalan: achchiq bo'lmasin" onBlur={(e) => patch({ comment: e.target.value })} />
            </div>
          </details>

          <div className="receipt-foot">
            <div className="total-row">
              <span className="muted">Jami ({count} ta)</span>
              <b>{money(total)} {state.settings.currency}</b>
            </div>
            <div className="foot-btns">
              {order.status === "paid" ? (
                <Link className="btn primary lg" href="/pos"><Icon name="check" /> To&apos;langan — zalga qaytish</Link>
              ) : order.status === "waiting_cashier" ? (
                <>
                  <button className="btn primary lg" disabled={!items.length || busy} onClick={() => patch({ status: "kitchen", confirmedBy: "Kassir" })}>
                    <Icon name="check" /> Tasdiqlash va oshxonaga yuborish
                  </button>
                  <button className="btn danger" onClick={cancelOrder}>Rad etish</button>
                </>
              ) : (
                <>
                  <button className="btn primary lg" disabled={!items.length || busy} onClick={() => setPayOpen(true)}>
                    <Icon name="cash" /> To&apos;lov qabul qilish
                  </button>
                  <div className="foot-btns two">
                    <button
                      className="btn"
                      disabled={!items.length || busy || order.status === "kitchen" || order.status === "ready"}
                      onClick={() => patch({ status: "kitchen", confirmedBy: "Ofitsiant" })}
                    >
                      <Icon name="chef" size={18} />
                      {order.status === "kitchen" || order.status === "ready" ? "Oshxonada" : "Oshxonaga"}
                    </button>
                    <Link className="btn" href={`/print/${order.id}?type=customer`} target="_blank">
                      <Icon name="printer" size={18} /> Chek
                    </Link>
                  </div>
                  {order.status === "draft" && items.length === 0 ? (
                    <button className="btn danger sm" onClick={cancelOrder}>Chekni bekor qilish</button>
                  ) : null}
                </>
              )}
            </div>
          </div>
        </section>

        {/* ---------- O'ng: menyu ---------- */}
        <section className="menu-pane" aria-label="Menyu">
          <div className="pane-top">
            <div className="only-sm">{toggle}</div>
            <div className="search">
              <Icon name="search" size={18} />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Taom nomi bo'yicha qidirish" aria-label="Qidirish" />
            </div>
            <div className="chips" role="tablist" aria-label="Kategoriyalar">
              <button className={"chip" + (cat === "all" ? " on" : "")} onClick={() => setCat("all")}>Hammasi</button>
              {cats.map((c) => (
                <button key={c.id} className={"chip" + (cat === c.id ? " on" : "")} onClick={() => setCat(c.id)}>
                  <Icon name={c.icon} size={18} />
                  {c.name}
                </button>
              ))}
            </div>
          </div>

          <div className="prod-grid">
            {products.map((p) => {
              const n = qtyOf.get(p.id);
              return (
                <button
                  key={p.id}
                  className="prod"
                  style={{ ["--cat" as string]: catColor.get(p.categoryId) || "#8e1b2c" }}
                  onClick={() => addProduct(p)}
                  disabled={locked}
                >
                  {n ? <span className="qty-badge">{n}</span> : null}
                  <b>{p.name}</b>
                  <span className="price">{money(p.price)} {state.settings.currency}</span>
                </button>
              );
            })}
            {products.length === 0 ? (
              <div className="empty" style={{ gridColumn: "1 / -1" }}>
                <div className="empty-ico"><Icon name="search" /></div>
                <b>Hech narsa topilmadi</b>
                <span>Boshqa nom yozing yoki «Hammasi» ni tanlang.</span>
              </div>
            ) : null}
          </div>

          <div className="cart-bar only-sm">
            <div className="sum">
              <span className="muted small">{count} ta taom</span>
              <b>{money(total)} {state.settings.currency}</b>
            </div>
            <button className="btn primary lg" onClick={() => setView("receipt")}>
              Chekni ochish <Icon name="forward" size={18} />
            </button>
          </div>
        </section>
      </div>

      {payOpen ? (
        <div className="modal-back" onClick={() => setPayOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="To'lov">
            <h2>To&apos;lov qabul qilish</h2>
            <p className="muted">Chek #{order.number} · {money(total)} {state.settings.currency}</p>
            <div className="pay-opts">
              <button className={"pay-opt" + (method === "cash" ? " on" : "")} onClick={() => setMethod("cash")}>
                <Icon name="cash" size={28} /> Naqd
              </button>
              <button className={"pay-opt" + (method === "card" ? " on" : "")} onClick={() => setMethod("card")}>
                <Icon name="card" size={28} /> Karta
              </button>
            </div>
            <div className="row">
              <button className="btn grow" onClick={() => setPayOpen(false)}>Bekor</button>
              <button className="btn primary grow" onClick={pay} disabled={busy}>
                <Icon name="check" size={18} /> To&apos;landi
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </AppShell>
  );
}
