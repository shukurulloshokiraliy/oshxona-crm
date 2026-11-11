import { NextResponse } from "next/server";
import { mutate, uid } from "@/lib/store";
import { requireRole } from "@/lib/auth";
import { hashPassword } from "@/lib/crypto";
import { str } from "@/lib/orders";
import type { DbState, Role, Settings, Staff } from "@/lib/types";

export const dynamic = "force-dynamic";

const LISTS = ["tables", "categories", "products", "staff"] as const;
type ListName = (typeof LISTS)[number];
const PREFIX: Record<ListName, string> = { tables: "t", categories: "c", products: "p", staff: "s" };
const ROLES: Role[] = ["admin", "cashier", "waiter", "cook"];
const SETTING_KEYS: (keyof Settings)[] = [
  "cafeName", "currency", "serviceFeePercent", "receiptHeader", "receiptFooter",
  "autoPrintKitchen", "paperMm", "branchesText", "aboutText", "instagram", "aiGreeting", "aiVoiceLang", "aiEnabled", "aiSystemExtra",
];

const num = (v: unknown, d = 0, min = -1e9, max = 1e9) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : d;
};

/** Faqat ruxsat etilgan maydonlarni, to'g'ri turda qaytaradi. */
function clean(name: Exclude<ListName, "staff">, i: Record<string, unknown>, old?: Record<string, unknown>) {
  const o = old || {};
  if (name === "tables") {
    const shape = ["circle", "rect", "oval", "bar"].includes(String(i.shape ?? o.shape)) ? (i.shape ?? o.shape) : "rect";
    return {
      name: str(i.name ?? o.name, 30) || "Stol",
      hall: str(i.hall ?? o.hall, 30) || "Asosiy zal",
      shape,
      x: num(i.x ?? o.x, 10, 0, 2000), y: num(i.y ?? o.y, 10, 0, 2000),
      w: num(i.w ?? o.w, 90, 30, 600), h: num(i.h ?? o.h, 90, 30, 600),
      seats: Math.round(num(i.seats ?? o.seats, 4, 1, 50)),
    };
  }
  if (name === "categories") {
    const color = String(i.color ?? o.color ?? "#8e1b2c");
    return {
      name: str(i.name ?? o.name, 40) || "Bo'lim",
      color: /^#[0-9a-fA-F]{6}$/.test(color) ? color : "#8e1b2c",
      icon: str(i.icon ?? o.icon, 20) || "utensils",
      sort: Math.round(num(i.sort ?? o.sort, 0, 0, 999)),
    };
  }
  const img = str(i.image ?? o.image, 500);
  return {
    categoryId: str(i.categoryId ?? o.categoryId, 40),
    name: str(i.name ?? o.name, 60) || "Mahsulot",
    price: Math.round(num(i.price ?? o.price, 0, 0, 1e9)),
    unit: str(i.unit ?? o.unit, 12) || "dona",
    image: /^https?:\/\//i.test(img) || img.startsWith("/") ? img : "",
    toKitchen: Boolean(i.toKitchen ?? o.toKitchen ?? true),
    active: Boolean(i.active ?? o.active ?? true),
  };
}

export async function POST(req: Request, ctx: { params: Promise<{ entity: string }> }) {
  const a = await requireRole(req, ["admin"]);
  if (a instanceof NextResponse) return a;
  const { entity } = await ctx.params;
  const body = await req.json().catch(() => ({}));

  if (entity === "settings") {
    const out = await mutate((st: DbState) => {
      const next = { ...st.settings } as Record<string, unknown>;
      for (const k of SETTING_KEYS) {
        if (!(k in body)) continue;
        const cur = (st.settings as unknown as Record<string, unknown>)[k];
        next[k] = typeof cur === "number" ? num(body[k], cur as number, 0, k === "paperMm" ? 80 : 100)
          : typeof cur === "boolean" ? Boolean(body[k]) : str(body[k], 1000);
      }
      st.settings = next as unknown as Settings;
      return st.settings;
    });
    return NextResponse.json(out);
  }

  if (!LISTS.includes(entity as ListName)) {
    return NextResponse.json({ error: "Noma'lum bo'lim" }, { status: 400 });
  }
  const name = entity as ListName;

  const result = await mutate((st: DbState): unknown => {
    if (name === "staff") return staffAction(st, body, a.me.id);
    const list = st[name] as unknown as { id: string }[];
    if (body.action === "create") {
      const item = { id: uid(PREFIX[name]), ...clean(name, body.item || {}) };
      list.push(item);
      return item;
    }
    if (body.action === "update") {
      const i = list.findIndex((x) => x.id === body.item?.id);
      if (i === -1) return null;
      list[i] = { id: list[i].id, ...clean(name, body.item, list[i] as unknown as Record<string, unknown>) };
      return list[i];
    }
    if (body.action === "delete") {
      const idx = list.findIndex((x) => x.id === body.id);
      if (idx > -1) list.splice(idx, 1);
      return { ok: true };
    }
    if (body.action === "replace" && Array.isArray(body.items) && name === "tables") {
      st.tables = body.items.slice(0, 200).map((t: Record<string, unknown>) => ({ id: str(t.id, 40) || uid("t"), ...clean("tables", t) })) as DbState["tables"];
      return { ok: true };
    }
    return null;
  });

  if (!result) return NextResponse.json({ error: "Xato" }, { status: 400 });
  if ((result as { error?: string }).error) {
    return NextResponse.json(result, { status: 400 });
  }
  return NextResponse.json(result);
}

function staffAction(st: DbState, body: Record<string, any>, selfId: string): unknown {
  const pub = (s: Staff) => { const { passHash, ...r } = s; return { ...r, hasPassword: !!passHash }; };
  const admins = () => st.staff.filter((x) => x.role === "admin" && x.active && x.passHash);
  const loginOk = (login: string, exceptId?: string) =>
    /^[a-z0-9._-]{3,30}$/.test(login) && !st.staff.some((x) => x.login === login && x.id !== exceptId);

  if (body.action === "create") {
    const it = body.item || {};
    const login = String(it.login || "").trim().toLowerCase();
    const pw = String(it.password || "");
    if (!loginOk(login)) return { error: "Login 3–30 belgi (a-z, 0-9) va takrorlanmas bo'lsin" };
    if (pw.length < 6) return { error: "Parol kamida 6 belgi" };
    const s: Staff = {
      id: uid("s"), name: str(it.name, 40) || login,
      role: ROLES.includes(it.role) ? it.role : "waiter", login, passHash: hashPassword(pw), active: true,
    };
    st.staff.push(s);
    return pub(s);
  }
  if (body.action === "update") {
    const it = body.item || {};
    const s = st.staff.find((x) => x.id === it.id);
    if (!s) return null;
    const before = { ...s };
    const revert = (msg: string) => { Object.assign(s, before); return { error: msg }; };
    if (it.login !== undefined) {
      const login = String(it.login).trim().toLowerCase();
      if (!loginOk(login, s.id)) return { error: "Login noto'g'ri yoki band" };
      s.login = login;
    }
    if (it.name !== undefined) s.name = str(it.name, 40) || s.name;
    if (it.role !== undefined && ROLES.includes(it.role)) s.role = it.role;
    if (it.active !== undefined) s.active = Boolean(it.active);
    if (it.password) {
      if (String(it.password).length < 6) return revert("Parol kamida 6 belgi");
      s.passHash = hashPassword(String(it.password));
    }
    if (admins().length === 0) return revert("Kamida bitta faol admin qolishi kerak");
    return pub(s);
  }
  if (body.action === "delete") {
    if (body.id === selfId) return { error: "O'zingizni o'chira olmaysiz" };
    const s = st.staff.find((x) => x.id === body.id);
    if (!s) return { ok: true };
    st.staff = st.staff.filter((x) => x.id !== body.id);
    if (admins().length === 0) { st.staff.push(s); return { error: "Kamida bitta faol admin qolishi kerak" }; }
    return { ok: true };
  }
  return null;
}
