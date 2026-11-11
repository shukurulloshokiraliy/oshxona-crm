"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import { Icon } from "@/components/Icons";
import { api, useStore } from "@/lib/useStore";
import { money, orderTotal, SOURCE_LABEL, timeOf } from "@/lib/format";
import { printHere, printOrder, useAutoPrint, usePrinterBeat } from "@/lib/printjob";
import PrinterStatus from "@/components/PrinterStatus";
import type { Order } from "@/lib/types";

export default function KassaPage() {
  const { state, refresh } = useStore(2000);
  const [busy, setBusy] = useState<string | null>(null);
  const [sentId, setSentId] = useState<string | null>(null);
  const [here, setHere] = useState(true); // printer shu kompyuterga ulanganmi (standart: ha)
  const [log, setLog] = useState("");

  useEffect(() => {
    setHere(printHere());
  }, []);
  const choose = (v: boolean) => {
    setHere(v);
    try { localStorage.setItem("printHere", v ? "1" : "0"); } catch {}
  };
  const onLog = useCallback((m: string) => setLog(m), []);
  const failed = useAutoPrint(state?.orders, here, refresh, onLog);
  usePrinterBeat("kassa", here);

  async function reprint(o: Order) {
    if (here) {
      await printOrder(o.id, "kitchen").catch((e) => setLog("Xato: " + (e as Error).message));
    } else {
      await api(`/api/orders/${o.id}`, { method: "PATCH", body: JSON.stringify({ printed: false }) });
      setLog(`Chek #${o.number} oshxona printeriga qayta yuborildi`);
      refresh();
    }
  }

  if (!state) return <AppShell title="Kassa"><div className="empty">Yuklanmoqda…</div></AppShell>;

  const waitingList = state.orders.filter((o) => o.status === "waiting_cashier");
  const kitchen = state.orders.filter((o) => o.status === "kitchen" || o.status === "ready");

  async function act(o: Order, status: "kitchen" | "canceled") {
    setBusy(o.id);
    await api(`/api/orders/${o.id}`, {
      method: "PATCH",
      body: JSON.stringify({ status, confirmedBy: "Kassir" }),
    });
    await refresh();
    setBusy(null);
    if (status === "kitchen") setSentId(o.id);
  }

  async function setTable(o: Order, tableId: string) {
    await api(`/api/orders/${o.id}`, { method: "PATCH", body: JSON.stringify({ tableId }) });
    refresh();
  }

  return (
    <AppShell
      title="Kassa"
      hint="AI operator va ofitsiant yuborgan buyurtmalarni shu yerda tasdiqlaysiz."
      waiting={waitingList.length}
      cafe={state.settings.cafeName}
    >
      <div className="steps3">
        <div><b>1</b>Yangi buyurtma shu yerda chiqadi</div>
        <div><b>2</b>«Tasdiqlash» ni bosing</div>
        <div><b>3</b>Oshxonada chek chiqadi</div>
      </div>

      <div className="printer-card">
        <div>
          <b>Chek printeri qayerda?</b> <PrinterStatus printers={state.printers} />
          <div className="muted small">
            {here ? "Tasdiqlaganda chek shu kompyuterdagi printerdan chiqadi." : "Tasdiqlaganda chek oshxona kompyuteridan chiqadi (u yerda «Oshxona printeri» sahifasi ochiq turishi kerak)."}
          </div>
        </div>
        <div className="seg" role="group" aria-label="Printer joyi">
          <button className={!here ? "on" : ""} onClick={() => choose(false)}>Oshxonada</button>
          <button className={here ? "on" : ""} onClick={() => choose(true)}>Shu kompyuterda</button>
        </div>
        <Link className="btn sm" href="/print/test" target="_blank"><Icon name="printer" size={16} /> Test chek</Link>
      </div>
      {failed ? <div className="call-note" role="alert" style={{ marginBottom: 12 }}>{failed}. Printer ulanganini va Chrome ruxsatini tekshiring.</div> : null}
      {log ? <div className="muted small" style={{ marginBottom: 10 }}>{log}</div> : null}

      <div className="section-head">
        <h2>Tasdiq kutmoqda</h2>
        <span className="count">{waitingList.length}</span>
      </div>
      {waitingList.length === 0 ? (
        <div className="card empty">
          <div className="empty-ico"><Icon name="check" /></div>
          <b>Hozircha yangi zakaz yo&apos;q</b>
          <span>AI operator zakaz olganda u shu yerda paydo bo&apos;ladi va sahifa o&apos;zi yangilanadi.</span>
        </div>
      ) : (
        <div className="ticket-grid">
          {waitingList.map((o) => (
            <div className="ticket" key={o.id}>
              <div className="tt">
                <b>Chek #{o.number}</b>
                <span className="muted small">{timeOf(o.createdAt)}</span>
              </div>
              <div className="row">
                <span className={"pill " + (o.source === "pos" ? "gray" : "blue")}>
                  {SOURCE_LABEL[o.source] || "Operator"}
                </span>
                {o.guestName ? <span className="small">{o.guestName}</span> : null}
                {o.guestPhone ? <span className="small muted">{o.guestPhone}</span> : null}
              </div>
              <ul>
                {o.items.map((i) => (
                  <li key={i.id}>
                    <span>{i.name} × {i.qty}</span>
                    <span className="muted">{money(i.price * i.qty)}</span>
                  </li>
                ))}
              </ul>
              {o.comment ? <div className="muted small">Izoh: {o.comment}</div> : null}
              <div className="total-row" style={{ margin: 0 }}>
                <span className="muted">Jami</span>
                <b style={{ fontSize: 20 }}>{money(orderTotal(o))} {state.settings.currency}</b>
              </div>
              <div className="field" style={{ marginBottom: 0 }}>
                <label>Qaysi stolga?</label>
                <select value={o.tableId || ""} onChange={(e) => setTable(o, e.target.value)}>
                  <option value="">Olib ketish (stolsiz)</option>
                  {state.tables.map((t) => (
                    <option key={t.id} value={t.id}>{t.name === "Bar" ? "Bar" : `Stol ${t.name}`}</option>
                  ))}
                </select>
              </div>
              <button className="btn primary lg" disabled={busy === o.id} onClick={() => act(o, "kitchen")}>
                <Icon name="check" /> Tasdiqlash
              </button>
              <div className="row">
                <Link className="btn sm grow" href={`/pos/${o.id}`}>Tahrirlash</Link>
                <button className="btn sm danger grow" onClick={() => act(o, "canceled")}>Rad etish</button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="section-head">
        <h2>Oshxonada tayyorlanmoqda</h2>
        <span className="count">{kitchen.length}</span>
      </div>
      {kitchen.length === 0 ? (
        <div className="card empty small"><span>Oshxonada hozir buyurtma yo&apos;q.</span></div>
      ) : (
        <div className="ticket-grid">
          {kitchen.map((o) => (
            <div className="ticket kitchen" key={o.id}>
              <div className="tt">
                <b>Chek #{o.number} · {o.tableName}</b>
                <span className="muted small">{o.confirmedAt ? timeOf(o.confirmedAt) : ""}</span>
              </div>
              <span className={"pill " + (o.printedAt ? "green" : "amber")} style={{ alignSelf: "flex-start" }}>
                {o.printedAt ? "Chek chiqdi" : "Chek chiqmoqda…"}
              </span>
              <ul>
                {o.items.map((i) => <li key={i.id}><span>{i.name}</span><span>× {i.qty}</span></li>)}
              </ul>
              <div className="row">
                <button className="btn sm grow" onClick={() => reprint(o)}><Icon name="printer" size={16} /> Chekni qayta chiqarish</button>
                <Link className="btn sm primary grow" href={`/pos/${o.id}`}>To&apos;lovga</Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </AppShell>
  );
}
