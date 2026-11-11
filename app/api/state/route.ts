import { NextResponse } from "next/server";
import { storageMode } from "@/lib/store";
import { publicState, requireRole } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const a = await requireRole(req, ["admin", "cashier", "waiter", "cook"]);
  if (a instanceof NextResponse) return a;
  const out = publicState(a.state, a.me);
  // Oshpaz uchun faqat oshxonaga tegishli ma'lumot
  if (a.me.role === "cook") {
    out.orders = out.orders.filter((o) => ["kitchen", "ready"].includes(o.status));
  }
  const voice =
    a.me.role === "admin"
      ? {
          agentId: !!process.env.ELEVENLABS_AGENT_ID,
          apiKey: !!process.env.ELEVENLABS_API_KEY,
          voiceKey: (process.env.VOICE_API_KEY || "").length >= 16,
          webhookSecret: !!process.env.ELEVENLABS_WEBHOOK_SECRET,
          claude: !!process.env.ANTHROPIC_API_KEY,
        }
      : null;
  return NextResponse.json({ ...out, storageMode, voice });
}
