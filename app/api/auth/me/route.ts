import { NextResponse } from "next/server";
import { getAuth } from "@/lib/auth";
import { readState } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const a = await getAuth(req);
  if (a) return NextResponse.json({ me: a.me, cafeName: a.state.settings.cafeName });
  const s = await readState();
  const needsSetup = !s.staff.some((x) => x.role === "admin" && x.passHash);
  return NextResponse.json({ me: null, needsSetup, cafeName: s.settings.cafeName });
}
