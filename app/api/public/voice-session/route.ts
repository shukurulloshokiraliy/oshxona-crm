import { NextResponse } from "next/server";
import { clientIp, rateLimit, tooMany } from "@/lib/auth";
import { readState } from "@/lib/store";

export const dynamic = "force-dynamic";

const g = globalThis as typeof globalThis & { __elDay?: { d: string; n: number } };
const DAILY = Number(process.env.ELEVENLABS_DAILY_SESSIONS || 150);

/** Brauzer qo'ng'irog'i qaysi rejimda: ElevenLabs agent yoki bepul brauzer ovozi. */
export async function GET(req: Request) {
  const agentId = process.env.ELEVENLABS_AGENT_ID;
  if (!agentId) return NextResponse.json({ mode: "browser" });
  const s = await readState();
  if (!s.settings.aiEnabled) return NextResponse.json({ error: "AI operator hozir o'chiq" }, { status: 503 });
  if (!rateLimit(`vs:${clientIp(req)}`, 8, 10 * 60_000)) return tooMany();
  const day = new Date().toISOString().slice(0, 10);
  if (!g.__elDay || g.__elDay.d !== day) g.__elDay = { d: day, n: 0 };
  if (g.__elDay.n >= DAILY) return NextResponse.json({ mode: "browser", limited: true });
  g.__elDay.n += 1;

  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) return NextResponse.json({ mode: "elevenlabs", agentId });
  try {
    const r = await fetch(
      `https://api.elevenlabs.io/v1/convai/conversation/get-signed-url?agent_id=${encodeURIComponent(agentId)}`,
      { headers: { "xi-api-key": key }, cache: "no-store" }
    );
    if (!r.ok) return NextResponse.json({ mode: "browser", error: "elevenlabs " + r.status });
    const d = await r.json();
    return NextResponse.json({ mode: "elevenlabs", signedUrl: d.signed_url });
  } catch {
    return NextResponse.json({ mode: "browser" });
  }
}
