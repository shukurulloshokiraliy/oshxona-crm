import type { Order, OrderStatus } from "./types";

export function money(n: number, cur?: string): string {
  const v = new Intl.NumberFormat("ru-RU").format(Math.round(n));
  return cur ? `${v} ${cur}` : v;
}

export function orderTotal(o: Pick<Order, "items">): number {
  return o.items.reduce((s, i) => s + i.price * i.qty, 0);
}

export function orderQty(o: Pick<Order, "items">): number {
  return o.items.reduce((s, i) => s + i.qty, 0);
}

export const STATUS_LABEL: Record<OrderStatus, string> = {
  draft: "Ochiq chek",
  waiting_cashier: "Kassir tasdig'ini kutmoqda",
  kitchen: "Oshxonada",
  ready: "Tayyor",
  paid: "To'landi",
  canceled: "Bekor qilindi",
};

export const STATUS_COLOR: Record<OrderStatus, string> = {
  draft: "#7a8699",
  waiting_cashier: "#e8a33b",
  kitchen: "#3b96e8",
  ready: "#4caf50",
  paid: "#2f7d32",
  canceled: "#c6433f",
};

export function timeOf(iso: string): string {
  return new Date(iso).toLocaleTimeString("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Tashkent",
  });
}

export function dateTimeOf(iso: string): string {
  return new Date(iso).toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Tashkent",
  });
}

export const SOURCE_LABEL: Record<string, string> = {
  pos: "Kassa / zal",
  ai: "AI operator",
  operator: "AI qo'ng'iroq",
  online: "Sayt (katalog)",
};

export interface Branch {
  address: string;
  phone: string;
  hours: string;
}

/** "manzil | telefon | vaqt" qatorlarini ajratadi */
export function parseBranches(text: string): Branch[] {
  return (text || "")
    .split("\n")
    .map((l) => l.split("|").map((x) => x.trim()))
    .filter((p) => p[0])
    .map((p) => ({ address: p[0], phone: p[1] || "", hours: p[2] || "" }));
}

export const telHref = (phone: string) => "tel:" + phone.replace(/[^\d+]/g, "");
