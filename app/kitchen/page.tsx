"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import AppShell from "@/components/AppShell";
import { Icon } from "@/components/Icons";
import { api, useStore } from "@/lib/useStore";
import { timeOf } from "@/lib/format";
import { printOrder, useAutoPrint, usePrinterBeat } from "@/lib/printjob";
import PrinterStatus from "@/components/PrinterStatus";

/**
 * Oshxonada ekran yo'q — faqat chek apparati bor.
 * Bu sahifa shu printerga ulangan kompyuterda ochiq turadi va
 * kassir tasdiqlagan har bir buyurtmani avtomatik chop etadi.
 */
export default function KitchenPage() {
  const { state, refresh } = useStore(2000);
  const [auto, setAuto] = useState(true);
  const [log, setLog] = useState<string[]>([]);
  const onLog = useCallback((m: string) => setLog((l) => [`${m} — ${timeOf(new Date().toISOString())}`, ...l].slice(0, 20)), []);
  const failed = useAutoPrint(state?.orders, auto, refresh, onLog);
  usePrinterBeat("kitchen", auto);

  if (!state) return <AppShell title="Oshxona printeri"><div className="empty">Yuklanmoqda…</div></AppShell>;
  const queue = state.orders.filter((o) => o.status === "kitchen");
  const waiting = state.orders.filter((o) => o.status === "waiting_cashier").length;

  return (
    <AppShell
      title="Oshxona printeri"
      hint="Oshxonada ekran kerak emas: tasdiqlangan zakaz shu sahifa orqali chek printerdan chiqadi."
      waiting={waiting}
      cafe={state.settings.cafeName}
    >
      <div className="card">
        <div className="row">
          <span className={"pill " + (auto ? "green" : "amber")}><Icon name="printer" size={14} /> {auto ? "Avto-chop yoqilgan" : "Avto-chop o'chiq"}</span>
          <PrinterStatus printers={state.printers} />
        </div>
        <label className="check" style={{ marginTop: 6 }}>
          <input type="checkbox" checked={auto} onChange={(e) => setAuto(e.target.checked)} />
          <span>Yangi zakaz kelganda chekni o&apos;zi chiqarsin</span>
        </label>
        {failed ? <div className="call-note" role="alert">{failed}</div> : null}
        <a className="btn sm" href="/print/test" target="_blank" rel="noreferrer"><Icon name="printer" size={16} /> Test chek</a>
        <p className="muted small">
          Bu sahifani chek printeri ulangan kompyuterda oching va yopmang. Brauzer chop etish oynasini
          so&apos;rasa, printerni tanlab «Chop etish» ni bosing (Chrome&apos;ni <code>--kiosk-printing</code> bilan
          ishga tushirsangiz so&apos;ramasdan chiqaradi).
        </p>
      </div>

      <div className="section-head">
        <h2>Oshxonadagi zakazlar</h2>
        <span className="count">{queue.length}</span>
      </div>
      {queue.length === 0 ? (
        <div className="card empty">
          <div className="empty-ico"><Icon name="chef" /></div>
          <b>Navbat bo&apos;sh</b>
          <span>Kassir zakazni tasdiqlasa, u shu yerda paydo bo&apos;ladi.</span>
        </div>
      ) : (
        <div className="ticket-grid">
          {queue.map((o) => (
            <div className="ticket kitchen" key={o.id}>
              <div className="tt">
                <b>Chek #{o.number} · {o.tableName}</b>
                <span className="muted small">{o.confirmedAt ? timeOf(o.confirmedAt) : ""}</span>
              </div>
              <ul>
                {o.items.map((i) => <li key={i.id}><span>{i.name}</span><span>× {i.qty}</span></li>)}
              </ul>
              <div className="row">
                <span className={"pill " + (o.printedAt ? "green" : "amber")}>{o.printedAt ? "Chek chiqdi" : "Kutmoqda"}</span>
                <button className="btn sm" style={{ marginLeft: "auto" }} onClick={() => printOrder(o.id, "kitchen").then(() => onLog(`Chek #${o.number} qayta chiqarildi`)).catch((e) => onLog("Xato: " + e.message))}>
                  <Icon name="printer" size={16} /> Qayta chiqarish
                </button>
                <button
                  className="btn sm primary"
                  onClick={async () => {
                    await api(`/api/orders/${o.id}`, { method: "PATCH", body: JSON.stringify({ status: "ready" }) });
                    refresh();
                  }}
                >
                  <Icon name="check" size={16} /> Tayyor
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="section-head"><h2>Printer jurnali</h2></div>
      <div className="card">
        {log.length ? log.map((l, i) => <div key={i} className="small muted">{l}</div>) : <span className="muted small">Hali chek chiqmadi</span>}
      </div>
    </AppShell>
  );
}
