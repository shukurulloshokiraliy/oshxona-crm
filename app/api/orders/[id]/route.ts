import { NextResponse } from "next/server";
import { mutate } from "@/lib/store";
import { requireRole } from "@/lib/auth";
import { buildItems, str } from "@/lib/orders";
import type { OrderStatus, Role } from "@/lib/types";

export const dynamic = "force-dynamic";

const STATUSES: OrderStatus[] = ["draft", "waiting_cashier", "kitchen", "ready", "paid", "canceled"];
/** Rol qaysi holatga o'tkaza oladi */
const CAN_SET: Record<Role, OrderStatus[]> = {
  admin: STATUSES,
  cashier: STATUSES,
  waiter: ["draft", "waiting_cashier"],
  cook: ["ready"],
};

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const a = await requireRole(req, ["admin", "cashier", "waiter", "cook"]);
  if (a instanceof NextResponse) return a;
  const { id } = await ctx.params;
  const body = await req.json().catch(() => ({}));
  const role = a.me.role;

  if (body.status && !CAN_SET[role].includes(body.status)) {
    return NextResponse.json({ error: "Bu holatga o'tkazishga ruxsat yo'q" }, { status: 403 });
  }
  if (role === "cook" && (body.items || body.comment || body.tableId)) {
    return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 403 });
  }

  const res = await mutate((s) => {
    const o = s.orders.find((x) => x.id === id);
    if (!o) return null;
    const closed = o.status === "paid" || o.status === "canceled";
    if (closed && role !== "admin") return "closed" as const;
    if (role === "cook" && !["kitchen", "ready"].includes(o.status)) return "closed" as const;
    if (role === "waiter" && !["draft", "waiting_cashier"].includes(o.status)) return "closed" as const;

    if (body.items !== undefined) o.items = buildItems(s, body.items);
    if (typeof body.comment === "string") o.comment = str(body.comment, 300);
    if (typeof body.guestName === "string") o.guestName = str(body.guestName, 60);
    if (typeof body.guestPhone === "string") o.guestPhone = str(body.guestPhone, 30);
    if (typeof body.tableId === "string") {
      const t = s.tables.find((x) => x.id === body.tableId);
      o.tableId = t?.id || null;
      o.tableName = t?.name || o.tableName;
    }
    if (body.status) {
      const now = new Date().toISOString();
      o.status = body.status;
      if (body.status === "kitchen") {
        o.confirmedAt = now;
        o.confirmedBy = a.me.name;
        o.printedAt = null;
      }
      if (body.status === "paid") {
        o.paidAt = now;
        o.paymentMethod = body.paymentMethod === "card" ? "card" : "cash";
      }
    }
    if (body.printed === true) o.printedAt = new Date().toISOString();
    if (body.printed === false) o.printedAt = null;
    o.updatedAt = new Date().toISOString();
    return o;
  });
  if (res === "closed") return NextResponse.json({ error: "Buyurtmani endi o'zgartirib bo'lmaydi" }, { status: 409 });
  if (!res) return NextResponse.json({ error: "Topilmadi" }, { status: 404 });
  return NextResponse.json(res);
}

export async function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const a = await requireRole(req, ["admin", "cashier"]);
  if (a instanceof NextResponse) return a;
  const { id } = await ctx.params;
  await mutate((s) => {
    s.orders = s.orders.filter((o) => o.id !== id);
  });
  return NextResponse.json({ ok: true });
}
