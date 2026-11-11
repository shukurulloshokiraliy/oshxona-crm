import type { DbState, Product } from "./types";

export interface AiTurn {
  reply: string;
  cart: { productId: string; qty: number }[];
  finished: boolean;
  engine: "claude" | "offline";
}

export interface AiMessage {
  role: "guest" | "ai";
  text: string;
}

const UZ_NUM: Record<string, number> = {
  bir: 1, bitta: 1, ikki: 2, ikkita: 2, uch: 3, uchta: 3, tort: 4, tortta: 4,
  besh: 5, beshta: 5, olti: 6, oltita: 6, yetti: 7, yettita: 7, sakkiz: 8,
  sakkizta: 8, toqqiz: 9, toqqizta: 9, on: 10, onta: 10,
};

function norm(s: string): string {
  return s
    .toLowerCase()
    .replace(/[’'`‘ʻʼ]/g, "")
    .replace(/[^a-zа-яё0-9\s-]/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Kalit so'zlardan mahsulot topadi (oflayn rejim uchun). */
function matchProducts(text: string, products: Product[]) {
  const t = norm(text);
  const found: { productId: string; qty: number }[] = [];
  for (const p of products) {
    if (!p.active) continue;
    const words = norm(p.name).split(" ").filter((w) => w.length > 2);
    const key = words[0];
    if (!key) continue;
    const idx = t.indexOf(key);
    if (idx === -1) continue;
    const before = t.slice(Math.max(0, idx - 24), idx).trim().split(" ");
    let qty = 1;
    for (let i = before.length - 1; i >= 0 && i >= before.length - 3; i--) {
      const w = before[i];
      if (/^\d+$/.test(w)) { qty = Math.min(50, parseInt(w, 10)); break; }
      if (UZ_NUM[w]) { qty = UZ_NUM[w]; break; }
    }
    found.push({ productId: p.id, qty });
  }
  return found;
}

/** Internetsiz / kalitsiz ishlaydigan oddiy operator. */
export function offlineTurn(
  guestText: string,
  state: DbState,
  cart: { productId: string; qty: number }[]
): AiTurn {
  const t = norm(guestText);
  const next = [...cart];
  const hits = matchProducts(guestText, state.products);

  for (const h of hits) {
    const ex = next.find((c) => c.productId === h.productId);
    if (ex) ex.qty += h.qty;
    else next.push(h);
  }

  const finishWords = ["tamom", "boshqa yoq", "shuni", "yetarli", "hammasi shu", "boldi", "tasdiq"];
  const finished = finishWords.some((w) => t.includes(w)) && next.length > 0;

  if (/menyu|nima bor|taom|royxat/.test(t)) {
    const names = state.products.filter((p) => p.active).slice(0, 8).map((p) => p.name).join(", ");
    return { reply: `Bizda: ${names}. Qaysi birini olib beray?`, cart: next, finished: false, engine: "offline" };
  }
  if (hits.length === 0 && !finished) {
    return {
      reply: "Kechirasiz, tushunmadim. Masalan: «ikkita lag'mon va bitta capucino» deb ayting.",
      cart: next,
      finished: false,
      engine: "offline",
    };
  }
  if (finished) {
    return { reply: "Buyurtmangiz qabul qilindi, kassaga yuboryapman. Rahmat!", cart: next, finished: true, engine: "offline" };
  }
  const added = hits
    .map((h) => {
      const p = state.products.find((x) => x.id === h.productId);
      return `${h.qty} ta ${p?.name}`;
    })
    .join(", ");
  return { reply: `${added} qo'shildi. Yana nima olasiz?`, cart: next, finished: false, engine: "offline" };
}

function systemPrompt(state: DbState, cart: { productId: string; qty: number }[]) {
  const menu = state.products
    .filter((p) => p.active)
    .map((p) => `${p.id} | ${p.name} | ${p.price} ${state.settings.currency}`)
    .join("\n");
  const cartText = cart.length
    ? cart
        .map((c) => {
          const p = state.products.find((x) => x.id === c.productId);
          return `${p?.name} x${c.qty}`;
        })
        .join(", ")
    : "bo'sh";
  return `Sen "${state.settings.cafeName}" kafesining telefon operatorisan. Mijoz qaysi tilda gapirsa (o'zbek lotin yoki rus) shu tilda javob ber; boshida o'zbekchada.
Vazifang: mijozdan buyurtmani olish, aniqlashtirish va tasdiqlash. Qisqa, iliq, 1-2 jumla gapir.

MENYU (id | nom | narx):
${menu}

Hozirgi savat: ${cartText}

Qoidalar:
- Faqat menyudagi mahsulotni qabul qil. Menyuda yo'q bo'lsa, o'xshashini taklif qil.
- Mijoz "tamom/boshqa yo'q/shuni tasdiqla" desa finished=true qil.
- finished=true bo'lsa savatni qisqa takrorlab, kassaga yuborilayotganini ayt.
${state.settings.aiSystemExtra || ""}

JAVOBNI FAQAT shu JSON ko'rinishida ber, boshqa matn yozma:
{"reply":"...","cart":[{"productId":"p1","qty":2}],"finished":false}
cart — har doim TO'LIQ savat (eski + yangi), faqat yangi qo'shilgani emas.`;
}

export async function claudeTurn(
  messages: AiMessage[],
  state: DbState,
  cart: { productId: string; qty: number }[]
): Promise<AiTurn | null> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return null;
  const model = process.env.ANTHROPIC_MODEL || "claude-haiku-4-5";
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model,
        max_tokens: 500,
        system: systemPrompt(state, cart),
        messages: messages.map((m) => ({
          role: m.role === "guest" ? "user" : "assistant",
          content: m.text,
        })),
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const text: string = data?.content?.[0]?.text || "";
    const m = text.match(/\{[\s\S]*\}/);
    if (!m) return null;
    const parsed = JSON.parse(m[0]);
    const valid = (parsed.cart || []).filter((c: { productId: string }) =>
      state.products.some((p) => p.id === c.productId)
    );
    return {
      reply: String(parsed.reply || ""),
      cart: valid,
      finished: Boolean(parsed.finished),
      engine: "claude",
    };
  } catch {
    return null;
  }
}


/** Mijozdan kelgan savatni katalogga nisbatan tozalaydi. */
export function sanitizeCart(raw: unknown, state: DbState): { productId: string; qty: number }[] {
  if (!Array.isArray(raw)) return [];
  const out: { productId: string; qty: number }[] = [];
  for (const r of raw.slice(0, 40)) {
    const c = (r || {}) as { productId?: string; qty?: number };
    const p = state.products.find((x) => x.id === c.productId && x.active);
    if (!p) continue;
    const qty = Math.max(1, Math.min(50, Math.floor(Number(c.qty) || 1)));
    const ex = out.find((o) => o.productId === p.id);
    if (ex) ex.qty = Math.min(50, ex.qty + qty);
    else out.push({ productId: p.id, qty });
  }
  return out;
}
