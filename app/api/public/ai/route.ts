import { NextResponse } from "next/server";
import { readState } from "@/lib/store";
import { claudeTurn, offlineTurn, sanitizeCart, type AiMessage } from "@/lib/ai";
import { clientIp, rateLimit, tooMany } from "@/lib/auth";

export const dynamic = "force-dynamic";

// Claude xarajati nazorati: bir server nusxasi uchun kunlik limit
const DAILY = Number(process.env.PUBLIC_AI_DAILY_CAP || 400);
const g = globalThis as typeof globalThis & { __aiDay?: { d: string; n: number } };

export async function POST(req: Request) {
  if (!rateLimit(`pai:${clientIp(req)}`, 60, 10 * 60_000)) return tooMany();
  const state = await readState();
  if (!state.settings.aiEnabled) {
    return NextResponse.json({ error: "AI operator hozir o'chiq" }, { status: 503 });
  }
  const body = await req.json().catch(() => ({}));
  const messages: AiMessage[] = (Array.isArray(body.messages) ? body.messages : [])
    .slice(-24)
    .map((m: AiMessage) => ({ role: m.role === "ai" ? "ai" : "guest", text: String(m.text || "").slice(0, 400) }));
  const cart = sanitizeCart(body.cart, state);
  const last = [...messages].reverse().find((m) => m.role === "guest");

  const day = new Date().toISOString().slice(0, 10);
  if (!g.__aiDay || g.__aiDay.d !== day) g.__aiDay = { d: day, n: 0 };
  const allowClaude = g.__aiDay.n < DAILY;
  if (allowClaude) g.__aiDay.n += 1;

  const turn = (allowClaude && (await claudeTurn(messages, state, cart))) || offlineTurn(last?.text || "", state, cart);
  return NextResponse.json(turn);
}
