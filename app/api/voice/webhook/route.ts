import { NextResponse } from "next/server";
import { mutate, saveRecording, uid } from "@/lib/store";
import { verifyElevenLabsSignature } from "@/lib/voice";
import { str } from "@/lib/orders";
import type { Conversation, TranscriptLine } from "@/lib/types";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/** ElevenLabs "post-call webhook": suhbat matni (post_call_transcription) va audio (post_call_audio). */
export async function POST(req: Request) {
  const raw = await req.text();
  if (!verifyElevenLabsSignature(raw, req.headers.get("elevenlabs-signature"))) {
    return NextResponse.json({ error: "Imzo noto'g'ri" }, { status: 401 });
  }
  let ev: { type?: string; data?: Record<string, any> };
  try {
    ev = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "JSON xato" }, { status: 400 });
  }
  const d = ev.data || {};
  const convId = str(d.conversation_id, 100);
  if (!convId) return NextResponse.json({ ok: true, skipped: true });

  if (ev.type === "post_call_transcription") {
    const t0 = Date.now();
    const lines: TranscriptLine[] = (Array.isArray(d.transcript) ? d.transcript : [])
      .filter((l: any) => l && typeof l.message === "string" && l.message.trim())
      .slice(0, 300)
      .map((l: any) => ({
        role: l.role === "agent" ? "ai" : "guest",
        text: str(l.message, 600),
        at: new Date(t0 + (Number(l.time_in_call_secs) || 0) * 1000).toISOString(),
      }));
    const phone = str(d.metadata?.phone_call?.external_number || d.metadata?.phone_call?.from_number || d.metadata?.caller_id, 30);
    const dur = Number(d.metadata?.call_duration_secs) || 0;
    await mutate((s) => {
      const order = s.orders.find((o) => o.callId === convId);
      let c = s.conversations.find((x) => x.externalId === convId);
      const summary = str(d.analysis?.transcript_summary, 300) || (order ? order.items.map((i) => `${i.name} ×${i.qty}`).join(", ") : "Buyurtmasiz suhbat");
      const ended = new Date().toISOString();
      const started = new Date(Date.now() - dur * 1000).toISOString();
      if (!c) {
        c = { id: uid("cv"), externalId: convId, orderId: null, guestPhone: "", startedAt: started, endedAt: ended, lines: [], summary: "", recordingId: null } as Conversation;
        s.conversations.unshift(c);
        if (s.conversations.length > 200) s.conversations.length = 200;
      }
      c.lines = lines;
      c.summary = summary;
      c.endedAt = ended;
      if (phone) c.guestPhone = phone;
      if (order) {
        c.orderId = order.id;
        if (phone && !order.guestPhone) order.guestPhone = phone;
      }
    });
    return NextResponse.json({ ok: true });
  }

  if (ev.type === "post_call_audio" && typeof d.full_audio === "string") {
    const buf = Buffer.from(d.full_audio, "base64");
    if (buf.length && buf.length < 15 * 1024 * 1024) {
      const id = uid("rec");
      const found = await mutate((s) => {
        let c = s.conversations.find((x) => x.externalId === convId);
        if (!c) {
          c = { id: uid("cv"), externalId: convId, orderId: null, guestPhone: "", startedAt: new Date().toISOString(), endedAt: new Date().toISOString(), lines: [], summary: "Audio", recordingId: null } as Conversation;
          s.conversations.unshift(c);
        }
        c.recordingId = id;
        return c.id;
      });
      await saveRecording(id, found, "audio/mpeg", buf);
    }
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ ok: true, ignored: ev.type });
}
