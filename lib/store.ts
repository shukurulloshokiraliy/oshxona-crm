import { neon } from "@neondatabase/serverless";
import type { DbState } from "./types";
import { seedState } from "./seed";
import { hashPassword, randomSecret } from "./crypto";

const KEY = "oshxona-crm-state";
const url = process.env.DATABASE_URL;

type G = typeof globalThis & {
  __state?: DbState;
  __ready?: boolean;
  __recs?: Map<string, { mime: string; data: Buffer }>;
};
const g = globalThis as G;

function sql() {
  if (!url) return null;
  return neon(url);
}

async function ensureTables() {
  const q = sql();
  if (!q) return;
  await q`create table if not exists kv (key text primary key, value jsonb not null)`;
  await q`create table if not exists recordings (
    id text primary key, conv_id text, mime text not null, data bytea not null,
    created_at timestamptz not null default now())`;
}

/** Eski/yetarli bo'lmagan holatni to'ldiradi. O'zgargan bo'lsa true. */
function normalize(s: DbState): boolean {
  let changed = false;
  const def = seedState().settings;
  for (const k of Object.keys(def) as (keyof typeof def)[]) {
    if (s.settings[k] === undefined) {
      (s.settings as unknown as Record<string, unknown>)[k] = def[k];
      changed = true;
    }
  }
  if (!s.authSecret) {
    s.authSecret = randomSecret();
    changed = true;
  }
  if (!Array.isArray(s.staff) || s.staff.length === 0) {
    s.staff = [{ id: "s1", name: "Administrator", role: "admin", login: "admin", passHash: "", active: true }];
    changed = true;
  }
  for (const st of s.staff) {
    if (!st.login) {
      st.login = (st.name || "xodim").toLowerCase().replace(/[^a-z0-9]+/g, "").slice(0, 20) || "xodim" + st.id;
      changed = true;
    }
    if (typeof st.passHash !== "string") {
      st.passHash = "";
      changed = true;
    }
    delete (st as unknown as { pin?: string }).pin;
  }
  // Ixtiyoriy: ADMIN_PASSWORD berilgan bo'lsa, birinchi adminga o'rnatiladi
  const envPw = process.env.ADMIN_PASSWORD;
  if (envPw && envPw.length >= 8) {
    const admin = s.staff.find((x) => x.role === "admin" && !x.passHash);
    if (admin && !s.staff.some((x) => x.role === "admin" && x.passHash)) {
      admin.passHash = hashPassword(envPw);
      changed = true;
    }
  }
  return changed;
}

export async function readState(): Promise<DbState> {
  const q = sql();
  if (!q) {
    if (!g.__state) {
      g.__state = seedState();
      normalize(g.__state);
    }
    return g.__state;
  }
  if (!g.__ready) {
    await ensureTables();
    g.__ready = true;
  }
  const rows = (await q`select value from kv where key = ${KEY}`) as { value: DbState }[];
  if (!rows.length) {
    const fresh = seedState();
    normalize(fresh);
    await q`insert into kv (key, value) values (${KEY}, ${JSON.stringify(fresh)}::jsonb)
            on conflict (key) do nothing`;
    const again = (await q`select value from kv where key = ${KEY}`) as { value: DbState }[];
    return again[0]?.value ?? fresh;
  }
  const state = rows[0].value;
  if (normalize(state)) await writeState(state);
  return state;
}

export async function writeState(state: DbState): Promise<void> {
  const q = sql();
  if (!q) {
    g.__state = state;
    return;
  }
  await q`insert into kv (key, value) values (${KEY}, ${JSON.stringify(state)}::jsonb)
          on conflict (key) do update set value = excluded.value`;
}

export async function mutate<T>(fn: (s: DbState) => T | Promise<T>): Promise<T> {
  const state = await readState();
  const result = await fn(state);
  await writeState(state);
  return result;
}

/** Demo ma'lumotni tiklaydi, lekin xodimlar va maxfiy kalitni saqlab qoladi. */
export async function resetState(): Promise<DbState> {
  const old = await readState();
  const fresh = seedState();
  fresh.staff = old.staff;
  fresh.authSecret = old.authSecret;
  fresh.settings = old.settings;
  await writeState(fresh);
  return fresh;
}

export function uid(prefix = "x"): string {
  return prefix + Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-3);
}

export const storageMode = url ? "postgres" : "memory";

/* ---------------- Audio yozuvlar ---------------- */
export async function saveRecording(id: string, convId: string, mime: string, data: Buffer) {
  const q = sql();
  if (!q) {
    const map = (g.__recs ||= new Map());
    map.set(id, { mime, data });
    while (map.size > 20) map.delete(map.keys().next().value as string);
    return;
  }
  if (!g.__ready) {
    await ensureTables();
    g.__ready = true;
  }
  await q`insert into recordings (id, conv_id, mime, data)
          values (${id}, ${convId}, ${mime}, decode(${data.toString("hex")}, 'hex'))`;
  await q`delete from recordings where id not in
          (select id from recordings order by created_at desc limit 100)`;
}

export async function getRecording(id: string): Promise<{ mime: string; data: Buffer } | null> {
  const q = sql();
  if (!q) return g.__recs?.get(id) ?? null;
  if (!g.__ready) {
    await ensureTables();
    g.__ready = true;
  }
  const rows = (await q`select mime, encode(data, 'hex') as hex from recordings where id = ${id}`) as {
    mime: string;
    hex: string;
  }[];
  if (!rows.length) return null;
  return { mime: rows[0].mime, data: Buffer.from(rows[0].hex, "hex") };
}
