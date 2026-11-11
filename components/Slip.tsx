"use client";

import { useEffect, useState } from "react";
import { renderReceipt, type RLine } from "@/lib/receiptimg";

export function Slip({ lines, mm, onReady }: { lines: RLine[]; mm: number; onReady: () => void }) {
  const [src, setSrc] = useState("");
  const key = JSON.stringify(lines) + mm;
  useEffect(() => {
    let live = true;
    renderReceipt(lines, mm === 58 ? 384 : 576).then((u) => {
      if (!live) return;
      setSrc(u);
      // Rasm to'liq yuklanib dekodlangach tayyor deymiz — aks holda chek oq chiqadi
      const im = new Image();
      im.onload = im.onerror = () => {
        const fin = () => setTimeout(() => live && onReady(), 150);
        if (im.decode) im.decode().then(fin, fin);
        else fin();
      };
      im.src = u;
    });
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  // eslint-disable-next-line @next/next/no-img-element
  return src ? <img src={src} alt="" className={"slip-img paper-" + mm} /> : <div className="muted small" style={{ textAlign: "center" }}>…</div>;
}

