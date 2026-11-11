import { NextResponse } from "next/server";
import { clientIp, makeToken, rateLimit, sessionCookie, tooMany } from "@/lib/auth";
import { hashPassword } from "@/lib/crypto";
import { mutate } from "@/lib/store";

export const dynamic = "force-dynamic";

/** Faqat parolli admin yo'q bo'lganda — birinchi ishga tushirishda. */
export async function POST(req: Request) {
  if (!rateLimit(`setup:${clientIp(req)}`, 10, 10 * 60_000)) return tooMany();
  const body = await req.json().catch(() => ({}));
  const password = String(body.password || "");
  const name = String(body.name || "Administrator").trim().slice(0, 40) || "Administrator";
  const login = String(body.login || "admin").trim().toLowerCase().replace(/[^a-z0-9._-]/g, "").slice(0, 30) || "admin";
  if (password.length < 8) {
    return NextResponse.json({ error: "Parol kamida 8 belgi bo'lsin" }, { status: 400 });
  }
  const out = await mutate((s) => {
    if (s.staff.some((x) => x.role === "admin" && x.passHash)) return null;
    let admin = s.staff.find((x) => x.role === "admin");
    if (!admin) {
      admin = { id: "s1", name, role: "admin", login, passHash: "", active: true };
      s.staff.push(admin);
    }
    admin.name = name;
    admin.login = login;
    admin.active = true;
    admin.passHash = hashPassword(password);
    return { admin, secret: s.authSecret };
  });
  if (!out) return NextResponse.json({ error: "Admin allaqachon o'rnatilgan" }, { status: 403 });
  const res = NextResponse.json({ me: { id: out.admin.id, name: out.admin.name, role: out.admin.role } });
  res.headers.append("set-cookie", sessionCookie(req, makeToken(out.admin, out.secret)));
  return res;
}
