import { NextResponse } from "next/server";
import { clientIp, makeToken, rateLimit, sessionCookie, tooMany } from "@/lib/auth";
import { verifyPassword } from "@/lib/crypto";
import { readState } from "@/lib/store";

export const dynamic = "force-dynamic";
const DUMMY = "scrypt$00$" + "0".repeat(128);

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const login = String(body.login || "").trim().toLowerCase().slice(0, 40);
  const password = String(body.password || "").slice(0, 200);
  if (!rateLimit(`login:${clientIp(req)}`, 20, 10 * 60_000) || !rateLimit(`login:u:${login}`, 8, 10 * 60_000)) {
    return tooMany();
  }
  const s = await readState();
  const st = s.staff.find((x) => x.login.toLowerCase() === login && x.active);
  const ok = verifyPassword(password, st?.passHash || DUMMY) && !!st && !!st.passHash;
  if (!st || !ok) {
    return NextResponse.json({ error: "Login yoki parol noto'g'ri" }, { status: 401 });
  }
  const res = NextResponse.json({ me: { id: st.id, name: st.name, role: st.role } });
  res.headers.append("set-cookie", sessionCookie(req, makeToken(st, s.authSecret)));
  return res;
}
