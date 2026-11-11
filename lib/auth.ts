import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { readState } from "./store";
import type { DbState, Me, PublicStaff, Role, Staff } from "./types";

export const COOKIE = "oshxona_sid";
const TTL = 12 * 60 * 60; // 12 soat

function sign(body: string, secret: string) {
  return createHmac("sha256", secret).update(body).digest("base64url");
}

export function makeToken(staff: Staff, secret: string): string {
  const body = Buffer.from(
    JSON.stringify({ id: staff.id, pv: staff.passHash.slice(-12), exp: Math.floor(Date.now() / 1000) + TTL })
  ).toString("base64url");
  return `${body}.${sign(body, secret)}`;
}

function readCookie(header: string | null, name: string): string | null {
  if (!header) return null;
  for (const part of header.split(";")) {
    const [k, ...v] = part.trim().split("=");
    if (k === name) return v.join("=");
  }
  return null;
}

export function sessionCookie(req: Request, token: string | null): string {
  const secure =
    req.headers.get("x-forwarded-proto") === "https" || new URL(req.url).protocol === "https:";
  const base = `${COOKIE}=${token ?? ""}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${token ? TTL : 0}`;
  return secure ? base + "; Secure" : base;
}

export interface Authed {
  me: Me;
  state: DbState;
}

/** Cookie'ni tekshiradi; yaroqli bo'lsa xodim va holatni qaytaradi. */
export async function getAuth(req: Request): Promise<Authed | null> {
  const token = readCookie(req.headers.get("cookie"), COOKIE);
  if (!token) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const state = await readState();
  const expected = sign(body, state.authSecret);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  let payload: { id: string; pv: string; exp: number };
  try {
    payload = JSON.parse(Buffer.from(body, "base64url").toString());
  } catch {
    return null;
  }
  if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) return null;
  const staff = state.staff.find((s) => s.id === payload.id && s.active);
  if (!staff || !staff.passHash || staff.passHash.slice(-12) !== payload.pv) return null;
  return { me: { id: staff.id, name: staff.name, role: staff.role }, state };
}

/** Rolni talab qiladi. Ruxsat bo'lmasa Response qaytaradi. */
export async function requireRole(req: Request, roles: Role[]): Promise<Authed | NextResponse> {
  const a = await getAuth(req);
  if (!a) return NextResponse.json({ error: "Avval tizimga kiring" }, { status: 401 });
  if (!roles.includes(a.me.role)) {
    return NextResponse.json({ error: "Bu amal uchun ruxsat yo'q" }, { status: 403 });
  }
  return a;
}

/** Mijozga yuboriladigan holat: parol hash'lari va maxfiy kalit olib tashlanadi. */
export function publicState(state: DbState, me: Me) {
  const { authSecret: _secret, staff, conversations, ...rest } = state;
  void _secret;
  const staffOut: PublicStaff[] =
    me.role === "admin" ? staff.map(({ passHash, ...s }) => ({ ...s, hasPassword: !!passHash })) : [];
  return {
    ...rest,
    staff: staffOut,
    conversations: me.role === "admin" || me.role === "cashier" ? conversations : [],
    me,
  };
}

/* ---------------- Oddiy tezlik cheklovi (har bir server nusxasi uchun) ---------------- */
const hits = new Map<string, { n: number; reset: number }>();

/** true — ruxsat berildi, false — limitdan oshdi. */
export function rateLimit(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  if (hits.size > 5000) {
    for (const [k, v] of hits) if (v.reset < now) hits.delete(k);
  }
  const h = hits.get(key);
  if (!h || h.reset < now) {
    hits.set(key, { n: 1, reset: now + windowMs });
    return true;
  }
  h.n += 1;
  return h.n <= max;
}

export function clientIp(req: Request): string {
  return (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() || "local";
}

export function tooMany() {
  return NextResponse.json({ error: "Juda ko'p so'rov. Birozdan keyin urinib ko'ring." }, { status: 429 });
}
