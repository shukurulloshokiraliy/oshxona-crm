import { NextResponse } from "next/server";
import { mutate, uid } from "@/lib/store";
import { clientIp, rateLimit, tooMany } from "@/lib/auth";
import { buildItems, newOrder, str } from "@/lib/orders";
import { sanitizeCart } from "@/lib/ai";
import type { Conversation, TranscriptLine } from "@/lib/types";

export const dynamic = "force-dynamic";

/** Qo'ng'iroq tugadi: suhbat matni saqlanadi, savat bo'lsa buyurtma kassaga tushadi. */
export async function POST(req: Request) {
  if (!rateLimit(`pc:${clientIp(req)}`, 10, 10 * 60_000)) return tooMany();
  const body = await req.json().catch(() => ({}));
  const lines: TranscriptLine[] = (Array.isArray(body.lines) ? body.lines : [])
    .slice(0, 120)
    .map((l: Partial<TranscriptLine>) => ({
      role: l.role === "ai" ? "ai" : "guest",
      text: str(l.text, 400),
      at: str(l.at, 40) || new Date().toISOString(),
    }));
  if (!lines.length) return NextResponse.json({ error: "Bo'sh suhbat" }, { status: 400 });

  const out = await mutate((s) => {
    const cart = sanitizeCart(body.cart, s);
    let orderId: string | null = null;
    let number: number | null = null;
    let summary = "Buyurtmasiz suhbat";
    if (cart.length) {
      const items = buildItems(s, cart.map((c) => ({ productId: c.productId, qty: c.qty })), { onlyActive: true });
      const o = newOrder(s, {
        guestPhone: str(body.guestPhone, 30),
        source: "operator",
        status: "waiting_cashier",
        comment: "AI operator qabul qildi (qo'ng'iroq)",
        items,
      });
      s.orders.unshift(o);
      if (s.orders.length > 1000) s.orders.length = 1000;
      orderId = o.id;
      number = o.number;
      summary = items.map((i) => `${i.name} ×${i.qty}`).join(", ");
    }
    const c: Conversation = {
      id: uid("cv"),
      orderId,
      guestPhone: str(body.guestPhone, 30),
      startedAt: str(body.startedAt, 40) || new Date().toISOString(),
      endedAt: new Date().toISOString(),
      lines,
      summary,
      recordingId: null,
    };
    s.conversations.unshift(c);
    if (s.conversations.length > 200) s.conversations.length = 200;
    return { convId: c.id, orderId, number };
  });
  return NextResponse.json(out);
}
