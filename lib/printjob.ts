"use client";

import { useEffect, useRef, useState } from "react";
import { api } from "./useStore";
import type { Order } from "./types";

/** Chekni ko'rinmas iframe'da ochib, tayyor bo'lgach chop etadi (Chrome --kiosk-printing bilan oynasiz). */
let queue: Promise<unknown> = Promise.resolve();
/** Bitta printer: cheklar ketma-ket chiqadi (oshpaz cheki, keyin mijoz cheki), bir-biriga aralashmaydi. */
export function printOrder(id: string, type: "kitchen" | "customer" = "kitchen"): Promise<void> {
  const run = queue.then(() => printNow(id, type));
  queue = run.catch(() => {});
  return run;
}

/** Printer shu kompyuterga ulanganmi (bitta printer — standart "ha"). */
export function printHere(): boolean {
  try { return localStorage.getItem("printHere") !== "0"; } catch { return true; }
}

function printNow(id: string, type: "kitchen" | "customer"): Promise<void> {
  return new Promise((resolve, reject) => {
    const f = document.createElement("iframe");
    f.setAttribute("aria-hidden", "true");
    f.style.cssText = "position:fixed;right:0;bottom:0;width:340px;height:600px;border:0;opacity:0;pointer-events:none";
    f.src = `/print/${id}?type=${type}&embed=1`;
    const t0 = Date.now();
    const done = () => setTimeout(() => f.remove(), 60_000);
    f.onload = () => {
      const poll = () => {
        if (f.contentDocument?.body?.dataset.ready === "1") {
          setTimeout(() => {
            try {
              f.contentWindow?.focus();
              f.contentWindow?.print();
              done();
              // keyingi chek printerga yetib borishi uchun biroz kutamiz
              setTimeout(resolve, 2500);
            } catch (e) {
              done();
              reject(e);
            }
          }, 400);
        } else if (Date.now() - t0 > 15_000) {
          done();
          reject(new Error("Chek sahifasi ochilmadi"));
        } else setTimeout(poll, 200);
      };
      poll();
    };
    document.body.appendChild(f);
  });
}

/** Tasdiqlangan, hali chiqmagan buyurtmalarni ketma-ket chiqaradi. */
export function useAutoPrint(
  orders: Order[] | undefined,
  enabled: boolean,
  refresh: () => Promise<void> | void,
  onLog?: (msg: string) => void
) {
  const busy = useRef(false);
  const tried = useRef<Set<string>>(new Set());
  const [failed, setFailed] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled || busy.current || !orders) return;
    const since = Date.now() - 6 * 3600_000;
    const o = [...orders]
      .reverse()
      .find((x) => x.status === "kitchen" && !x.printedAt && !tried.current.has(x.id) && new Date(x.confirmedAt || x.createdAt).getTime() > since);
    if (!o) return;
    busy.current = true;
    tried.current.add(o.id);
    (async () => {
      try {
        await api(`/api/orders/${o.id}`, { method: "PATCH", body: JSON.stringify({ printed: true }) });
        await printOrder(o.id, "kitchen");
        setFailed(null);
        onLog?.(`Chek #${o.number} printerga yuborildi`);
      } catch (e) {
        await api(`/api/orders/${o.id}`, { method: "PATCH", body: JSON.stringify({ printed: false }) }).catch(() => {});
        setFailed(`Chek #${o.number} chiqmadi: ${(e as Error).message}`);
      } finally {
        busy.current = false;
        await refresh();
      }
    })();
  }, [orders, enabled, refresh, onLog]);

  return failed;
}

/** Printer ulangan kompyuter CRM'ga signal yuborib turadi. */
export function usePrinterBeat(where: "kitchen" | "kassa", enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    const beat = () => api("/api/printer/heartbeat", { method: "POST", body: JSON.stringify({ where }) }).catch(() => {});
    beat();
    const id = setInterval(beat, 15_000);
    return () => clearInterval(id);
  }, [where, enabled]);
}
