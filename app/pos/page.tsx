"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import FloorPlan, { type TableInfo } from "@/components/FloorPlan";
import { Icon } from "@/components/Icons";
import { api, useStore } from "@/lib/useStore";
import { money, orderTotal } from "@/lib/format";
import type { CafeTable, Order } from "@/lib/types";

export default function FloorPage() {
  const { state, refresh } = useStore();
  const router = useRouter();
  const [view, setView] = useState<"plan" | "list">("plan");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [showHint, setShowHint] = useState(false);

  useEffect(() => {
    if (window.innerWidth < 760) setView("list");
    try {
      if (!localStorage.getItem("hint-zal")) setShowHint(true);
    } catch {}
  }, []);

  if (!state) return <AppShell title="Zal"><div className="empty">Yuklanmoqda…</div></AppShell>;

  const live = state.orders.filter((o) => o.status !== "paid" && o.status !== "canceled");
  const waiting = live.filter((o) => o.status === "waiting_cashier").length;
  const byTable = new Map<string, Order[]>();
  for (const o of live) {
    if (!o.tableId) continue;
    byTable.set(o.tableId, [...(byTable.get(o.tableId) || []), o]);
  }

  const info: Record<string, TableInfo> = {};
  let busy = 0;
  let wait = 0;
  for (const t of state.tables) {
    const orders = byTable.get(t.id) || [];
    if (!orders.length) {
      info[t.id] = { kind: "free" };
      continue;
    }
    const sum = orders.reduce((s, o) => s + orderTotal(o), 0);
    if (orders.some((o) => o.status === "waiting_cashier")) {
      wait++;
      info[t.id] = { kind: "waiting", sub: "Tasdiq kutmoqda" };
    } else {
      busy++;
      info[t.id] = { kind: "busy", sub: sum > 0 ? `${money(sum)} ${state.settings.currency}` : "Chek ochiq" };
    }
  }
  const free = state.tables.length - busy - wait;

  async function openTable(t: CafeTable) {
    const existing = (byTable.get(t.id) || [])[0];
    if (existing) {
      router.push(`/pos/${existing.id}`);
      return;
    }
    setBusyId(t.id);
    const created = await api<Order>("/api/orders", {
      method: "POST",
      body: JSON.stringify({ tableId: t.id, source: "pos", status: "draft", items: [] }),
    });
    await refresh();
    router.push(`/pos/${created.id}`);
  }

  async function takeaway() {
    setBusyId("takeaway");
    const created = await api<Order>("/api/orders", {
      method: "POST",
      body: JSON.stringify({ tableId: null, tableName: "Olib ketish", source: "pos", status: "draft", items: [] }),
    });
    await refresh();
    router.push(`/pos/${created.id}`);
  }

  function closeHint() {
    setShowHint(false);
    try {
      localStorage.setItem("hint-zal", "1");
    } catch {}
  }

  const halls = Array.from(new Set(state.tables.map((t) => t.hall)));

  return (
    <AppShell
      title="Zal"
      hint="Stolni bosing — chek ochiladi. Band stollarda chek davom etadi."
      waiting={waiting}
      cafe={state.settings.cafeName}
      actions={
        <>
          <div className="seg hide-sm" role="group" aria-label="Ko'rinish">
            <button className={view === "plan" ? "on" : ""} onClick={() => setView("plan")}>
              <Icon name="grid" size={16} /> Sxema
            </button>
            <button className={view === "list" ? "on" : ""} onClick={() => setView("list")}>
              <Icon name="list" size={16} /> Ro&apos;yxat
            </button>
          </div>
          <button className="btn primary" onClick={takeaway} disabled={busyId === "takeaway"}>
            <Icon name="plus" size={18} /> <span className="hide-sm">Olib ketish</span>
            <span className="only-sm">Yangi</span>
          </button>
        </>
      }
    >
      {showHint ? (
        <div className="hint-card" role="note">
          <Icon name="info" size={22} />
          <div style={{ flex: 1 }}>
            <b>Qanday ishlaydi</b>
            <ol>
              <li>Stolni bosing — shu stol uchun yangi chek ochiladi.</li>
              <li>Menyudan taom tanlang, keyin «Oshxonaga yuborish» ni bosing.</li>
              <li>Mijoz to&apos;lagach «To&apos;lov qabul qilish» ni bosing.</li>
            </ol>
          </div>
          <button className="btn sm" onClick={closeHint}>Tushunarli</button>
        </div>
      ) : null}

      <div className="legend" style={{ marginBottom: 6 }}>
        <span><i /> Bo&apos;sh: {free}</span>
        <span><i className="busy" /> Band: {busy}</span>
        <span><i className="waiting" /> Kassir tasdig&apos;ini kutmoqda: {wait}</span>
      </div>

      {halls.map((hall) => {
        const tables = state.tables.filter((t) => t.hall === hall);
        return (
          <section key={hall}>
            <h2 className="hall-title">{hall}</h2>
            {view === "plan" ? (
              <FloorPlan tables={tables} info={info} onPick={openTable} />
            ) : (
              <div className="tbl-list">
                {tables.map((t) => {
                  const i = info[t.id];
                  return (
                    <button
                      key={t.id}
                      className={"tbl-card " + (i.kind === "free" ? "" : i.kind)}
                      onClick={() => openTable(t)}
                      disabled={busyId === t.id}
                    >
                      <span className="nm">{t.name === "Bar" ? "Bar" : `Stol ${t.name}`}</span>
                      <span className="muted small">{t.seats} o&apos;rin</span>
                      <span className={"pill " + (i.kind === "free" ? "gray" : i.kind === "busy" ? "blue" : "amber")}>
                        {i.kind === "free" ? "Bo'sh" : i.sub}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </section>
        );
      })}

      {state.tables.length === 0 ? (
        <div className="empty">
          <div className="empty-ico"><Icon name="table" /></div>
          <b>Hali stol yo&apos;q</b>
          <span>Sozlamalar → Stollar bo&apos;limida stol qo&apos;shing.</span>
        </div>
      ) : null}
    </AppShell>
  );
}
