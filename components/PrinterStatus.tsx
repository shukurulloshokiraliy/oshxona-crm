"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/Icons";

/** Printer signali yangimi? (60 soniyadan yangi — ulangan) */
export default function PrinterStatus({ printers }: { printers?: { kitchen?: string; kassa?: string } }) {
  const [now, setNow] = useState(0);
  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 5000);
    return () => clearInterval(id);
  }, []);
  const age = (t?: string) => (t && now ? Math.round((now - new Date(t).getTime()) / 1000) : null);
  const k = age(printers?.kitchen);
  const c = age(printers?.kassa);
  const live: string[] = [];
  if (k !== null && k < 60) live.push("oshxona");
  if (c !== null && c < 60) live.push("kassa");
  const ok = live.length > 0;
  return (
    <span className={"pill " + (ok ? "green" : "red")} title={ok ? "Chek avtomatik chiqadi" : "Hech bir kompyuter printer sifatida ochiq emas"}>
      <Icon name="printer" size={14} /> {ok ? `Printer ulangan (${live.join(", ")})` : "Printer ulanmagan"}
    </span>
  );
}
