import { NextResponse } from "next/server";
import { mutate } from "@/lib/store";
import { clientIp, rateLimit, tooMany } from "@/lib/auth";
import { buildItems, newOrder, str } from "@/lib/orders";

export const dynamic = "force-dynamic";

/** Mijoz katalogdan buyurtma beradi → kassada "tasdiq kutmoqda" bo'ladi. */
export async function POST(req: Request) {
  if (!rateLimit(`po:${clientIp(req)}`, 6, 10 * 60_000)) return tooMany();
  const body = await req.json().catch(() => ({}));
  const out = await mutate((s) => {
    const items = buildItems(s, body.items, { onlyActive: true });
    if (!items.length) return { error: "Savat bo'sh" };
    if (items.reduce((n, i) => n + i.qty, 0) > 60) return { error: "Juda ko'p mahsulot" };
    // Faqat kutayotgan "online" buyurtmalar soni cheklanadi (spamga qarshi)
    if (s.orders.filter((o) => o.source === "online" && o.status === "waiting_cashier").length >= 40) {
      return { error: "Hozir buyurtma qabul qilib bo'lmaydi, kassaga murojaat qiling" };
    }
    const name = str(body.guestName, 60);
    const phone = str(body.guestPhone, 30);
    if (!name && !phone) return { error: "Ismingiz yoki telefon raqamingizni yozing" };
    const o = newOrder(s, {
      tableId: str(body.tableId, 40) || null,
      guestName: name,
      guestPhone: phone,
      source: "online",
      status: "waiting_cashier",
      comment: str(body.comment, 300),
      items,
    });
    s.orders.unshift(o);
    if (s.orders.length > 1000) s.orders.length = 1000;
    return { number: o.number, total: items.reduce((n, i) => n + i.qty * i.price, 0) };
  });
  if ("error" in out) return NextResponse.json(out, { status: 400 });
  return NextResponse.json(out);
}
