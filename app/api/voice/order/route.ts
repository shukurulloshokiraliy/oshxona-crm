import { NextResponse } from "next/server";
import { mutate } from "@/lib/store";
import { checkVoiceKey, findProduct } from "@/lib/voice";
import { newOrder, str } from "@/lib/orders";
import { clientIp, rateLimit, tooMany } from "@/lib/auth";
import type { OrderItem } from "@/lib/types";

export const dynamic = "force-dynamic";

/**
 * AI agent buyurtma yaratadi (ElevenLabs "create_order" tool).
 * Menyuda topilmagan nomlar `not_found` da qaytadi — agent mijozdan aniqlashtiradi.
 * Bir suhbatda qayta chaqirilsa, kassada kutayotgan buyurtma yangilanadi.
 */
export async function POST(req: Request) {
  const denied = checkVoiceKey(req);
  if (denied) return denied;
  if (!rateLimit(`vo:${clientIp(req)}`, 120, 10 * 60_000)) return tooMany();
  const body = await req.json().catch(() => ({}));
  const callId = str(body.conversation_id, 80);

  const out = await mutate((s) => {
    const items: OrderItem[] = [];
    const notFound: string[] = [];
    for (const raw of Array.isArray(body.items) ? body.items.slice(0, 40) : []) {
      const name = str(raw?.name, 100);
      const qty = Math.max(1, Math.min(50, Math.floor(Number(raw?.quantity ?? raw?.qty) || 1)));
      const p = findProduct(s, name);
      if (!p) {
        if (name) notFound.push(name);
        continue;
      }
      const ex = items.find((i) => i.productId === p.id);
      if (ex) ex.qty = Math.min(50, ex.qty + qty);
      else items.push({ id: "i" + Math.random().toString(36).slice(2, 9), productId: p.id, name: p.name, price: p.price, qty, note: str(raw?.note, 100) });
    }
    if (!items.length) {
      return { ok: false, message: "Жодної страви не знайдено в меню. Уточніть назви у клієнта.", not_found: notFound };
    }
    const phone = str(body.phone || body.caller_id, 30);
    const name = str(body.customer_name, 60);
    const comment = str(body.comment, 300);
    const existing = callId ? s.orders.find((o) => o.callId === callId && o.status === "waiting_cashier") : null;
    let o = existing;
    if (o) {
      o.items = items;
      if (phone) o.guestPhone = phone;
      if (name) o.guestName = name;
      if (comment) o.comment = comment;
      o.updatedAt = new Date().toISOString();
    } else {
      o = newOrder(s, {
        guestName: name,
        guestPhone: phone,
        source: "operator",
        status: "waiting_cashier",
        comment: comment || "AI оператор (дзвінок)",
        items,
      });
      if (callId) o.callId = callId;
      s.orders.unshift(o);
      if (s.orders.length > 1000) s.orders.length = 1000;
    }
    const total = items.reduce((n, i) => n + i.qty * i.price, 0);
    return {
      ok: true,
      order_number: o.number,
      total,
      currency: s.settings.currency,
      items: items.map((i) => `${i.name} × ${i.qty}`),
      not_found: notFound,
      message: notFound.length
        ? `Замовлення №${o.number} прийнято, але не знайдено в меню: ${notFound.join(", ")}.`
        : `Замовлення №${o.number} прийнято і передано касиру.`,
    };
  });
  return NextResponse.json(out);
}
