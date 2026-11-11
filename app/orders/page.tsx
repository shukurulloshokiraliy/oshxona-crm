"use client";

import Link from "next/link";
import { useState } from "react";
import AppShell from "@/components/AppShell";
import { Icon } from "@/components/Icons";
import { useStore } from "@/lib/useStore";
import { dateTimeOf, money, orderQty, orderTotal, SOURCE_LABEL, STATUS_LABEL } from "@/lib/format";
import type { Order, OrderStatus } from "@/lib/types";

const FILTERS: { key: string; label: string }[] = [
  { key: "live", label: "Faol" },
  { key: "waiting_cashier", label: "Tasdiq kutmoqda" },
  { key: "kitchen", label: "Oshxonada" },
  { key: "paid", label: "To'langan" },
  { key: "all", label: "Hammasi" },
];

const PILL: Record<OrderStatus, string> = {
  draft: "gray",
  waiting_cashier: "amber",
  kitchen: "blue",
  ready: "green",
  paid: "green",
  canceled: "red",
};

function sourceLabel(o: Order) {
  return SOURCE_LABEL[o.source] || "Kassa";
}

export default function OrdersPage() {
  const { state } = useStore();
  const [f, setF] = useState("live");

  if (!state) return <AppShell title="Buyurtmalar"><div className="empty">Yuklanmoqda…</div></AppShell>;

  const waiting = state.orders.filter((o) => o.status === "waiting_cashier").length;
  const list = state.orders.filter((o) => {
    if (f === "all") return true;
    if (f === "live") return o.status !== "paid" && o.status !== "canceled";
    return o.status === f;
  });
  const cnt = (k: string) =>
    state.orders.filter((o) =>
      k === "all" ? true : k === "live" ? o.status !== "paid" && o.status !== "canceled" : o.status === k
    ).length;

  return (
    <AppShell
      title="Buyurtmalar"
      hint="Barcha cheklar: kim qabul qilgan, qaysi holatda. «Ochish» chekni tahrirlash yoki to'lash uchun."
      waiting={waiting}
      cafe={state.settings.cafeName}
    >
      <div className="chips" style={{ marginBottom: 12 }}>
        {FILTERS.map((x) => (
          <button key={x.key} className={"chip" + (f === x.key ? " on" : "")} onClick={() => setF(x.key)}>
            {x.label} <span style={{ opacity: 0.75 }}>{cnt(x.key)}</span>
          </button>
        ))}
      </div>

      {list.length === 0 ? (
        <div className="empty card">
          <div className="empty-ico"><Icon name="receipt" /></div>
          <b>Bu bo&apos;limda buyurtma yo&apos;q</b>
          <span>Zal sahifasida stolni bosib yangi chek oching.</span>
          <Link className="btn primary" href="/pos">Zalga o&apos;tish</Link>
        </div>
      ) : (
        <>
          <div className="table-wrap hide-sm">
            <table className="data">
              <thead>
                <tr>
                  <th>№</th><th>Stol</th><th>Manba</th><th>Holat</th><th>Taomlar</th><th>Summa</th><th>Vaqt</th><th />
                </tr>
              </thead>
              <tbody>
                {list.map((o) => (
                  <tr key={o.id}>
                    <td><b>{o.number}</b></td>
                    <td>{o.tableName}</td>
                    <td>{sourceLabel(o)}</td>
                    <td><span className={"pill " + PILL[o.status]}>{STATUS_LABEL[o.status]}</span></td>
                    <td>{orderQty(o)} ta</td>
                    <td><b>{money(orderTotal(o))}</b></td>
                    <td className="muted">{dateTimeOf(o.createdAt)}</td>
                    <td><Link className="btn sm" href={`/pos/${o.id}`}>Ochish</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="order-cards">
            {list.map((o) => (
              <Link key={o.id} href={`/pos/${o.id}`} className="order-card">
                <div className="row" style={{ justifyContent: "space-between" }}>
                  <b>Chek #{o.number} · {o.tableName}</b>
                  <span className={"pill " + PILL[o.status]}>{STATUS_LABEL[o.status]}</span>
                </div>
                <div className="row" style={{ justifyContent: "space-between" }}>
                  <span className="muted small">{sourceLabel(o)} · {dateTimeOf(o.createdAt)}</span>
                  <b>{money(orderTotal(o))} {state.settings.currency}</b>
                </div>
              </Link>
            ))}
          </div>
        </>
      )}
    </AppShell>
  );
}
