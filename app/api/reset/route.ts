import { NextResponse } from "next/server";
import { resetState } from "@/lib/store";
import { requireRole } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const a = await requireRole(req, ["admin"]);
  if (a instanceof NextResponse) return a;
  await resetState();
  return NextResponse.json({ ok: true });
}
