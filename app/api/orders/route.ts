import { NextResponse } from "next/server";
import { mutate } from "@/lib/store";
import { requireRole } from "@/lib/auth";
import { buildItems, newOrder, str } from "@/lib/orders";
import type { OrderSource, OrderStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

const SOURCES: OrderSource[] = ["pos", "ai", "operator", "online"];

export async function POST(req: Request) {
  const a = await requireRole(req, ["admin", "cashier", "waiter"]);
  if (a instanceof NextResponse) return a;
  const body = await req.json().catch(() => ({}));
  const order = await mutate((s) => {
    const items = buildItems(s, body.items);
    // Ofitsiant to'g'ridan-to'g'ri oshxonaga yubora olmaydi
    let status: OrderStatus = body.status === "waiting_cashier" ? "waiting_cashier" : "draft";
    if (body.status === "kitchen" && a.me.role !== "waiter") status = "kitchen";
    const o = newOrder(s, {
      tableId: str(body.tableId, 40) || null,
      tableName: str(body.tableName, 40),
      guestName: str(body.guestName, 60),
      guestPhone: str(body.guestPhone, 30),
      source: SOURCES.includes(body.source) ? body.source : "pos",
      status,
      comment: str(body.comment, 300),
      items,
    });
    if (status === "kitchen") {
      const now = new Date().toISOString();
      o.confirmedAt = now;
      o.confirmedBy = a.me.name;
    }
    s.orders.unshift(o);
    if (s.orders.length > 1000) s.orders.length = 1000;
    return o;
  });
  return NextResponse.json(order);
}
