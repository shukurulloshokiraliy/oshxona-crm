import { NextResponse } from "next/server";
import { mutate, saveRecording, uid } from "@/lib/store";
import { clientIp, rateLimit, tooMany } from "@/lib/auth";

export const dynamic = "force-dynamic";
const MAX = 4 * 1024 * 1024; // Vercel so'rov limiti ~4.5MB

/** Qo'ng'iroq ovozi: faqat yangi tugagan, hali yozuvsiz suhbatga yuklanadi. */
export async function POST(req: Request) {
  if (!rateLimit(`prec:${clientIp(req)}`, 10, 10 * 60_000)) return tooMany();
  const conv = new URL(req.url).searchParams.get("conv") || "";
  const mime = (req.headers.get("content-type") || "").split(";")[0];
  if (!/^audio\/(webm|ogg|mp4|mpeg|wav|x-m4a)$/.test(mime)) {
    return NextResponse.json({ error: "Audio formati noto'g'ri" }, { status: 400 });
  }
  const buf = Buffer.from(await req.arrayBuffer());
  if (!buf.length || buf.length > MAX) {
    return NextResponse.json({ error: "Fayl hajmi noto'g'ri (max 4MB)" }, { status: 413 });
  }
  const id = uid("rec");
  const ok = await mutate((s) => {
    const c = s.conversations.find((x) => x.id === conv);
    if (!c || c.recordingId) return false;
    if (Date.now() - new Date(c.endedAt || c.startedAt).getTime() > 30 * 60_000) return false;
    c.recordingId = id;
    return true;
  });
  if (!ok) return NextResponse.json({ error: "Suhbat topilmadi" }, { status: 404 });
  await saveRecording(id, conv, mime, buf);
  return NextResponse.json({ ok: true, id });
}
