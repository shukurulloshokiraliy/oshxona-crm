import { NextResponse } from "next/server";
import { sessionCookie } from "@/lib/auth";

export async function POST(req: Request) {
  const res = NextResponse.json({ ok: true });
  res.headers.append("set-cookie", sessionCookie(req, null));
  return res;
}
