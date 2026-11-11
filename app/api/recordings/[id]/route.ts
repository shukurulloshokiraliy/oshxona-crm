import { NextResponse } from "next/server";
import { getRecording } from "@/lib/store";
import { requireRole } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const a = await requireRole(req, ["admin", "cashier"]);
  if (a instanceof NextResponse) return a;
  const { id } = await ctx.params;
  const r = await getRecording(id);
  if (!r) return NextResponse.json({ error: "Topilmadi" }, { status: 404 });
  return new NextResponse(new Uint8Array(r.data), {
    headers: { "content-type": r.mime, "content-length": String(r.data.length), "cache-control": "private, no-store" },
  });
}
