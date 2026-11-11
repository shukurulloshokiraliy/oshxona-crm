"use client";

import { useEffect, useState } from "react";
import { Slip } from "@/components/Slip";
import { useStore } from "@/lib/useStore";
import type { RLine } from "@/lib/receiptimg";

export default function PrintTest() {
  const { state } = useStore(0);
  const [, setN] = useState(0);
  useEffect(() => {
    document.body.dataset.ready = "1";
  }, []);
  if (!state) return <div className="empty">Yuklanmoqda…</div>;
  const mm = state.settings.paperMm;
  const now = new Date().toLocaleString("ru-RU");
  const lines: RLine[] = [
    { t: "logo", size: 230 },
    { t: "text", text: state.settings.receiptHeader, align: "c", size: 26, bold: true },
    { t: "hr" },
    { t: "text", text: "ТЕСТ ЧЕК / TEST CHEK", align: "c", size: 30, bold: true },
    { t: "text", text: now, size: 24 },
    { t: "text", text: `Kenglik: ${mm} mm`, size: 24 },
    { t: "hr" },
    { t: "row", left: "Лагман × 2", right: "380.00", size: 26 },
    { t: "row", left: "Чай чорний × 1", right: "70.00", size: 26 },
    { t: "hr" },
    { t: "row", left: "РАЗОМ / JAMI", right: `450.00 ${state.settings.currency}`, size: 32, bold: true },
    { t: "hr" },
    { t: "text", text: "Привіт, Баракат! ЄІЇҐ ёў қ ғ ҳ", size: 26 },
    { t: "text", text: "0123456789 ABCDEFGHIJKLMNOP", size: 24 },
    { t: "text", text: state.settings.receiptFooter, align: "c", size: 26 },
  ];
  return (
    <>
      <div className="no-print" style={{ padding: 12, textAlign: "center" }}>
        <button className="btn primary lg" onClick={() => window.print()}>Chop etish</button>
        <p className="muted small">Printer: XPrinter / chek printeri. Kenglik: {mm} mm. Margins: None, Scale: 100%.</p>
      </div>
      <div className="slip-wrap"><Slip lines={lines} mm={mm} onReady={() => setN((n) => n + 1)} /></div>
    </>
  );
}
