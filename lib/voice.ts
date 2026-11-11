import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import type { DbState, Product } from "./types";

function safeEq(a: string, b: string) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

/** ElevenLabs tool so'rovlarini tekshiradi: `x-voice-key` sarlavhasi VOICE_API_KEY ga teng bo'lsin. */
export function checkVoiceKey(req: Request): NextResponse | null {
  const key = process.env.VOICE_API_KEY;
  if (!key || key.length < 16) {
    return NextResponse.json({ error: "VOICE_API_KEY sozlanmagan (kamida 16 belgi)" }, { status: 503 });
  }
  const got = req.headers.get("x-voice-key") || "";
  if (!safeEq(got, key)) return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 401 });
  return null;
}

/** ElevenLabs-Signature: "t=<vaqt>,v0=<hmac>" — imzolanadigan matn: `${t}.${body}` */
export function verifyElevenLabsSignature(raw: string, header: string | null): boolean {
  const secret = process.env.ELEVENLABS_WEBHOOK_SECRET;
  if (!secret || !header) return false;
  const parts = Object.fromEntries(header.split(",").map((p) => p.trim().split("=") as [string, string]));
  const t = parts["t"];
  const v0 = parts["v0"];
  if (!t || !v0) return false;
  if (Math.abs(Date.now() / 1000 - Number(t)) > 30 * 60) return false;
  const mac = createHmac("sha256", secret).update(`${t}.${raw}`).digest("hex");
  return safeEq(mac, v0);
}

const norm = (s: string) =>
  s
    .toLowerCase()
    .replace(/[’'`‘ʻʼ]/g, "")
    .replace(/[^a-zа-яіїєґё0-9\s]/gi, " ")
    .replace(/\s+/g, " ")
    .trim();

/** Mijoz aytgan nomga eng mos faol mahsulotni topadi. */
export function findProduct(state: DbState, query: string): Product | null {
  const q = norm(query);
  if (!q) return null;
  const list = state.products.filter((p) => p.active);
  const exact = list.find((p) => norm(p.name) === q);
  if (exact) return exact;
  const qt = q.split(" ").filter((w) => w.length > 2);
  let best: { p: Product; score: number } | null = null;
  for (const p of list) {
    const n = norm(p.name);
    let score = 0;
    if (n.includes(q) || q.includes(n)) score += 5;
    const nt = n.split(" ").filter((w) => w.length > 2);
    for (const w of qt) {
      if (nt.some((x) => x === w)) score += 2;
      else if (nt.some((x) => x.startsWith(w.slice(0, Math.max(4, w.length - 2))) || w.startsWith(x.slice(0, Math.max(4, x.length - 2))))) score += 1;
    }
    if (score > 0 && (!best || score > best.score)) best = { p, score };
  }
  return best && best.score >= 2 ? best.p : null;
}
