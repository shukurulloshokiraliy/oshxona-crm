import { NextResponse } from "next/server";
import { mutate, readState } from "@/lib/store";
import { requireRole } from "@/lib/auth";

export const dynamic = "force-dynamic";

/** Printer ulangan kompyuter har 15 soniyada "tirikman" deb signal yuboradi. */
export async function POST(req: Request) {
  const a = await requireRole(req, ["admin", "cashier", "cook"]);
  if (a instanceof NextResponse) return a;
  const body = await req.json().catch(() => ({}));
  const where = body.where === "kassa" ? "kassa" : "kitchen";
  const s = await readState();
  const last = s.printers?.[where];
  if (last && Date.now() - new Date(last).getTime() < 25_000) return NextResponse.json({ ok: true });
  await mutate((st) => {
    st.printers = { ...(st.printers || {}), [where]: new Date().toISOString() };
  });
  return NextResponse.json({ ok: true });
}
