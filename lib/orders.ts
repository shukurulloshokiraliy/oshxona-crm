import type { DbState, Order, OrderItem } from "./types";
import { uid } from "./store";

/** Narxni HECH QACHON mijozdan olmaymiz — faqat katalogdan. */
export function buildItems(
  s: DbState,
  raw: unknown,
  opts: { onlyActive?: boolean } = {}
): OrderItem[] {
  if (!Array.isArray(raw)) return [];
  const out: OrderItem[] = [];
  for (const r of raw.slice(0, 60)) {
    const i = (r || {}) as Partial<OrderItem>;
    const p = s.products.find((x) => x.id === i.productId);
    if (!p) continue;
    if (opts.onlyActive && !p.active) continue;
    const qty = Math.max(1, Math.min(99, Math.floor(Number(i.qty) || 1)));
    out.push({
      id: typeof i.id === "string" && i.id ? i.id.slice(0, 40) : uid("i"),
      productId: p.id,
      name: p.name,
      price: p.price,
      qty,
      note: String(i.note || "").slice(0, 120),
    });
  }
  return out;
}

export function str(v: unknown, max = 200): string {
  return typeof v === "string" ? v.slice(0, max) : "";
}

export function newOrder(
  s: DbState,
  p: Partial<Order> & { items: OrderItem[] }
): Order {
  s.counter += 1;
  const now = new Date().toISOString();
  const table = p.tableId ? s.tables.find((t) => t.id === p.tableId) : null;
  return {
    id: uid("o"),
    number: s.counter,
    tableId: table?.id || null,
    tableName: table?.name || p.tableName || "Olib ketish",
    guestName: p.guestName || "",
    guestPhone: p.guestPhone || "",
    source: p.source || "pos",
    status: p.status || "draft",
    items: p.items,
    comment: p.comment || "",
    createdAt: now,
    updatedAt: now,
    confirmedBy: null,
    confirmedAt: null,
    printedAt: null,
    paidAt: null,
    paymentMethod: null,
  };
}
