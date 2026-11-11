"use client";

import { useParams, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useStore } from "@/lib/useStore";
import { dateTimeOf, money, orderTotal, SOURCE_LABEL } from "@/lib/format";
import { Slip } from "@/components/Slip";
import type { RLine } from "@/lib/receiptimg";

export default function PrintPage() {
  const { id } = useParams<{ id: string }>();
  const sp = useSearchParams();
  const auto = sp.get("auto") === "1";
  const type = sp.get("type"); // kitchen | customer | (ikkalasi)
  const embed = sp.get("embed") === "1";
  const { state } = useStore(0);
  const printed = useRef(false);
  const [logoReady, setLogoReady] = useState(false);
  const textMode = sp.get("text") === "1";
  const [slipsReady, setSlipsReady] = useState(0);

  const order = state?.orders.find((o) => o.id === id) || null;

  useEffect(() => {
    const img = new Image();
    img.onload = img.onerror = () => setLogoReady(true);
    img.src = "/logo-bw.png";
  }, []);

  const needSlips = (type === "customer" ? 0 : 1) + (type === "kitchen" ? 0 : 1);
  const ready = !!order && logoReady && (textMode || slipsReady >= needSlips);
  useEffect(() => {
    if (!ready) return;
    // Qog'oz uzunligini chek balandligiga moslaymiz (rasm: 8 px = 1 mm), ortiqcha bo'sh joy chiqmasin
    if (!textMode && state) {
      const imgs = Array.from(document.querySelectorAll<HTMLImageElement>(".slip-img"));
      const px = imgs.reduce((s, im) => s + im.naturalHeight, 0);
      if (px > 0) {
        const hMm = Math.ceil(px / 8) + 6;
        let st = document.getElementById("page-size") as HTMLStyleElement | null;
        if (!st) {
          st = document.createElement("style");
          st.id = "page-size";
          document.head.appendChild(st);
        }
        st.textContent = `@page { size: ${state.settings.paperMm}mm ${hMm}mm; margin: 0; }`;
      }
    }
    document.body.dataset.ready = "1";
  }, [ready, textMode, state]);

  useEffect(() => {
    if (!ready || !auto || embed || printed.current) return;
    printed.current = true;
    const t = setTimeout(() => window.print(), 300);
    return () => clearTimeout(t);
  }, [ready, auto, embed]);

  if (!state) return <div className="empty">Yuklanmoqda…</div>;
  if (!order) return <div className="empty">Chek topilmadi</div>;

  const kitchenItems = order.items.filter((i) => {
    const p = state.products.find((x) => x.id === i.productId);
    return p ? p.toKitchen : true;
  });
  const showKitchen = type !== "customer";
  const showCustomer = type !== "kitchen";
  const paper = "print-sheet paper-" + state.settings.paperMm;
  const mm = state.settings.paperMm;
  const tn = order.tableName
    ? order.tableName === "Bar" || /[^0-9]/.test(order.tableName) ? order.tableName : `СТІЛ ${order.tableName}`
    : "З СОБОЮ";
  const kLines: RLine[] = [
    { t: "text", text: "ОШХОНА / KUHNYA", align: "c", size: 24 },
    { t: "text", text: tn, align: "c", size: 60, bold: true },
    { t: "text", text: `№ ${order.number}`, align: "c", size: 40, bold: true },
    { t: "text", text: `${dateTimeOf(order.confirmedAt || order.createdAt)} · ${SOURCE_LABEL[order.source] || "Kassa"}`, align: "c", size: 22 },
    { t: "hr" },
    ...kitchenItems.map((i): RLine => ({ t: "row", left: i.name + (i.note ? ` (${i.note})` : ""), right: `× ${i.qty}`, size: 32, bold: true })),
    ...(order.comment ? ([{ t: "hr" }, { t: "text", text: "ПРИМІТКА: " + order.comment, size: 28, bold: true }] as RLine[]) : []),
    { t: "hr" },
    { t: "text", text: "* * *", align: "c", size: 24 },
  ];
  const cLines: RLine[] = [
    { t: "logo", size: 230 },
    { t: "text", text: state.settings.receiptHeader, align: "c", size: 26, bold: true },
    { t: "hr" },
    { t: "text", text: `Чек #${order.number} · ${order.tableName || ""}`, size: 26 },
    { t: "text", text: dateTimeOf(order.createdAt), size: 24 },
    { t: "hr" },
    ...order.items.flatMap((i): RLine[] => [
      { t: "text", text: i.name, size: 27, bold: true },
      { t: "row", left: `${i.qty} × ${money(i.price)}`, right: money(i.price * i.qty), size: 26 },
    ]),
    { t: "hr" },
    { t: "row", left: "РАЗОМ / JAMI", right: `${money(orderTotal(order))} ${state.settings.currency}`, size: 32, bold: true },
    { t: "hr" },
    { t: "text", text: state.settings.receiptFooter, align: "c", size: 26 },
  ];
  const onSlip = () => setSlipsReady((n) => n + 1);

  return (
    <>
      {!embed ? (
        <div className="no-print" style={{ padding: 12, textAlign: "center" }}>
          <button className="btn primary lg" onClick={() => window.print()}>Chop etish</button>
          {!type ? (
            <p className="muted small" style={{ margin: "8px 0 0" }}>
              Ikkita chek: birinchisi oshxona uchun, ikkinchisi mijoz uchun.{" "}
              <a href={`/print/${id}?type=kitchen`}>Faqat oshxona</a> · <a href={`/print/${id}?type=customer`}>Faqat mijoz</a>
            </p>
          ) : null}
        </div>
      ) : null}

      {!textMode && showKitchen ? <div className="slip-wrap"><Slip lines={kLines} mm={mm} onReady={onSlip} /></div> : null}
      {!textMode && showCustomer ? <div className="slip-wrap"><Slip lines={cLines} mm={mm} onReady={onSlip} /></div> : null}

      {textMode && showKitchen ? (
        <div className={paper + " kitchen-slip"}>
          <div className="c">OSHXONA</div>
          <div className="ks-table">{order.tableName ? (order.tableName === "Bar" || /[^0-9]/.test(order.tableName) ? order.tableName : `STOL ${order.tableName}`) : "OLIB KETISH"}</div>
          <div className="c ks-num">№ {order.number}</div>
          <div className="c">{dateTimeOf(order.confirmedAt || order.createdAt)} · {SOURCE_LABEL[order.source] || "Kassa"}</div>
          <hr />
          {kitchenItems.map((i) => (
            <div className="ks-li" key={i.id}>
              <span>{i.name}{i.note ? ` (${i.note})` : ""}</span>
              <b>× {i.qty}</b>
            </div>
          ))}
          {!kitchenItems.length ? <div className="c">— tayyorlanadigan taom yo&apos;q —</div> : null}
          {order.comment ? (
            <>
              <hr />
              <div className="ks-note">IZOH: {order.comment}</div>
            </>
          ) : null}
          <hr />
          <div className="c">* * *</div>
        </div>
      ) : null}

      {textMode && showCustomer ? (
        <div className={paper}>
          <div className="c">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-bw.png" alt="" className="rc-logo" />
            <b style={{ whiteSpace: "pre-line" }}>{state.settings.receiptHeader}</b>
          </div>
          <hr />
          <div>Чек #{order.number} · {order.tableName}</div>
          <div>{dateTimeOf(order.createdAt)}</div>
          <hr />
          {order.items.map((i) => (
            <div key={i.id}>
              <div>{i.name}</div>
              <div className="li">
                <span>{i.qty} × {money(i.price)}</span>
                <b>{money(i.price * i.qty)}</b>
              </div>
            </div>
          ))}
          <hr />
          <div className="li">
            <b>РАЗОМ / JAMI</b>
            <b>{money(orderTotal(order))} {state.settings.currency}</b>
          </div>
          <hr />
          <div className="c">{state.settings.receiptFooter}</div>
        </div>
      ) : null}
    </>
  );
}
