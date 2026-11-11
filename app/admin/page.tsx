"use client";

import { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import FloorPlan from "@/components/FloorPlan";
import { CATEGORY_ICONS, Icon, type IconName } from "@/components/Icons";
import { api, useStore, type AppState } from "@/lib/useStore";
import { dateTimeOf } from "@/lib/format";
import PrinterStatus from "@/components/PrinterStatus";
import type { Settings } from "@/lib/types";

type Tab = "products" | "tables" | "staff" | "settings" | "phone";

const TABS: { k: Tab; l: string; icon: IconName; hint: string }[] = [
  { k: "products", l: "Menyu", icon: "utensils", hint: "Taomlar, narxlar va bo'limlar. Nom yoki narxni o'zgartirib, boshqa joyni bosing — o'zi saqlanadi." },
  { k: "tables", l: "Stollar", icon: "table", hint: "Stolni sichqoncha yoki barmoq bilan sudrab joylashtiring." },
  { k: "staff", l: "Xodimlar", icon: "users", hint: "Kassir, ofitsiant, oshpaz uchun login va parol. Har kim faqat o'z bo'limini ko'radi." },
  { k: "settings", l: "Sozlamalar", icon: "settings", hint: "Kafe ma'lumoti, chek printeri, QR havolalar." },
  { k: "phone", l: "Telefon AI", icon: "phone", hint: "AI operator: ulash yo'riqnomasi va suhbatlar yozuvi." },
];

async function adminCall(entity: string, body: unknown) {
  return api(`/api/admin/${entity}`, { method: "POST", body: JSON.stringify(body) });
}

interface P {
  state: AppState;
  refresh: () => Promise<void>;
}

export default function AdminPage() {
  const { state, refresh } = useStore(0);
  const [tab, setTab] = useState<Tab>("products");

  if (!state) return <AppShell title="Sozlamalar"><div className="empty">Yuklanmoqda…</div></AppShell>;
  const waiting = state.orders.filter((o) => o.status === "waiting_cashier").length;
  const cur = TABS.find((t) => t.k === tab)!;

  return (
    <AppShell title="Sozlamalar" hint={cur.hint} waiting={waiting} cafe={state.settings.cafeName}>
      <div className="admin-tabs" role="tablist">
        {TABS.map((t) => (
          <button key={t.k} role="tab" aria-selected={tab === t.k} className={"chip" + (tab === t.k ? " on" : "")} onClick={() => setTab(t.k)}>
            <Icon name={t.icon} size={18} /> {t.l}
          </button>
        ))}
      </div>
      {tab === "products" && (
        <>
          <Products state={state} refresh={refresh} />
          <h2 style={{ margin: "26px 0 10px" }}>Bo&apos;limlar</h2>
          <Categories state={state} refresh={refresh} />
        </>
      )}
      {tab === "tables" && <Tables state={state} refresh={refresh} />}
      {tab === "staff" && <StaffTab state={state} refresh={refresh} />}
      {tab === "settings" && (
        <div className="stack" style={{ maxWidth: 680, gap: 16 }}>
          <SettingsTab state={state} refresh={refresh} section="general" />
          <System state={state} refresh={refresh} />
        </div>
      )}
      {tab === "phone" && (
        <div className="stack" style={{ maxWidth: 760, gap: 16 }}>
          <PhoneSetup state={state} />
          <SettingsTab state={state} refresh={refresh} section="ai" />
          <Calls state={state} />
        </div>
      )}
    </AppShell>
  );
}

/* ---------------- Menyu ---------------- */
function Products({ state, refresh }: P) {
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [cat, setCat] = useState(state.categories[0]?.id || "");

  async function add() {
    if (!name.trim() || !price) return;
    await adminCall("products", {
      action: "create",
      item: { name: name.trim(), price: Number(price), categoryId: cat, unit: "dona", toKitchen: true, active: true },
    });
    setName("");
    setPrice("");
    refresh();
  }
  async function upd(id: string, patch: object) {
    await adminCall("products", { action: "update", item: { id, ...patch } });
    refresh();
  }
  async function del(id: string) {
    if (!confirm("Bu taom o'chirilsinmi?")) return;
    await adminCall("products", { action: "delete", id });
    refresh();
  }

  return (
    <>
      <div className="card">
        <h2 style={{ marginBottom: 10 }}>Yangi taom qo&apos;shish</h2>
        <div className="form-row">
          <div className="field"><label>Nomi</label><input value={name} onChange={(e) => setName(e.target.value)} placeholder="Masalan: Lag'mon" /></div>
          <div className="field"><label>Narx ({state.settings.currency})</label><input type="number" inputMode="numeric" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="45000" /></div>
          <div className="field">
            <label>Kategoriya</label>
            <select value={cat} onChange={(e) => setCat(e.target.value)}>
              {state.categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <button className="btn primary" onClick={add}><Icon name="plus" size={18} /> Qo&apos;shish</button>
        </div>
      </div>

      <div className="table-wrap" style={{ marginTop: 14 }}>
        <table className="data">
          <thead>
            <tr><th className="wide">Nomi</th><th style={{ width: 130 }}>Narx</th><th style={{ width: 200 }}>Rasm (havola)</th><th style={{ width: 190 }}>Kategoriya</th><th title="Chek oshxonaga chiqadimi">Oshxonaga</th><th>Sotuvda</th><th /></tr>
          </thead>
          <tbody>
            {state.products.map((p) => (
              <tr key={p.id}>
                <td><input defaultValue={p.name} onBlur={(e) => e.target.value !== p.name && upd(p.id, { name: e.target.value })} /></td>
                <td><input type="number" defaultValue={p.price} onBlur={(e) => Number(e.target.value) !== p.price && upd(p.id, { price: Number(e.target.value) })} /></td>
                <td><input defaultValue={p.image || ""} placeholder="https://…" onBlur={(e) => e.target.value !== (p.image || "") && upd(p.id, { image: e.target.value })} /></td>
                <td>
                  <select value={p.categoryId} onChange={(e) => upd(p.id, { categoryId: e.target.value })}>
                    {state.categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </td>
                <td><input type="checkbox" checked={p.toKitchen} onChange={(e) => upd(p.id, { toKitchen: e.target.checked })} aria-label="Oshxonaga" /></td>
                <td><input type="checkbox" checked={p.active} onChange={(e) => upd(p.id, { active: e.target.checked })} aria-label="Sotuvda" /></td>
                <td><button className="btn sm icon danger" onClick={() => del(p.id)} aria-label="O'chirish"><Icon name="trash" size={16} /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

/* ---------------- Kategoriyalar ---------------- */
function Categories({ state, refresh }: P) {
  const [name, setName] = useState("");
  const [icon, setIcon] = useState<string>("utensils");
  const [color, setColor] = useState("#e8553d");

  async function add() {
    if (!name.trim()) return;
    await adminCall("categories", { action: "create", item: { name: name.trim(), icon, color, sort: state.categories.length + 1 } });
    setName("");
    refresh();
  }
  async function upd(id: string, patch: object) {
    await adminCall("categories", { action: "update", item: { id, ...patch } });
    refresh();
  }
  async function del(id: string) {
    if (state.products.some((p) => p.categoryId === id)) {
      alert("Bu kategoriyada taomlar bor. Avval ularni boshqa kategoriyaga o'tkazing.");
      return;
    }
    await adminCall("categories", { action: "delete", id });
    refresh();
  }
  const iconSelect = (value: string, on: (v: string) => void) => (
    <select value={value} onChange={(e) => on(e.target.value)}>
      {CATEGORY_ICONS.map((i) => (
        <option key={i} value={i}>{ICON_LABEL[i] || i}</option>
      ))}
    </select>
  );

  return (
    <>
      <div className="card">
        <h2 style={{ marginBottom: 10 }}>Yangi kategoriya</h2>
        <div className="form-row">
          <div className="field"><label>Nomi</label><input value={name} onChange={(e) => setName(e.target.value)} placeholder="Masalan: Salatlar" /></div>
          <div className="field"><label>Belgi</label>{iconSelect(icon, setIcon)}</div>
          <div className="field"><label>Rang</label><input type="color" value={color} onChange={(e) => setColor(e.target.value)} style={{ padding: 4 }} /></div>
          <button className="btn primary" onClick={add}><Icon name="plus" size={18} /> Qo&apos;shish</button>
        </div>
      </div>
      <div className="table-wrap" style={{ marginTop: 14 }}>
        <table className="data">
          <thead><tr><th style={{ width: 54 }} /><th className="wide">Nomi</th><th style={{ width: 150 }}>Belgi</th><th style={{ width: 80 }}>Rang</th><th style={{ width: 90 }}>Tartib</th><th /></tr></thead>
          <tbody>
            {state.categories.slice().sort((a, b) => a.sort - b.sort).map((c) => (
              <tr key={c.id}>
                <td><span style={{ color: c.color }}><Icon name={c.icon} size={24} /></span></td>
                <td><input defaultValue={c.name} onBlur={(e) => e.target.value !== c.name && upd(c.id, { name: e.target.value })} /></td>
                <td>{iconSelect(c.icon, (v) => upd(c.id, { icon: v }))}</td>
                <td><input type="color" defaultValue={c.color} onBlur={(e) => upd(c.id, { color: e.target.value })} /></td>
                <td><input type="number" defaultValue={c.sort} onBlur={(e) => upd(c.id, { sort: Number(e.target.value) })} /></td>
                <td><button className="btn sm icon danger" onClick={() => del(c.id)} aria-label="O'chirish"><Icon name="trash" size={16} /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

const ICON_LABEL: Record<string, string> = {
  coffee: "Kofe",
  cake: "Shirinlik",
  glass: "Ichimlik",
  utensils: "Taom",
  chef: "Oshpaz",
  tag: "Boshqa",
};

/* ---------------- Stollar ---------------- */
function Tables({ state, refresh }: P) {
  const [name, setName] = useState("");
  const [shape, setShape] = useState("rect");
  const [sel, setSel] = useState<string | null>(null);
  const [override, setOverride] = useState<Record<string, { x: number; y: number }>>({});

  const halls = Array.from(new Set(state.tables.map((t) => t.hall)));
  const selected = state.tables.find((t) => t.id === sel) || null;

  async function add() {
    if (!name.trim()) return;
    const dims: Record<string, [number, number]> = { circle: [80, 80], rect: [160, 90], oval: [195, 80], bar: [80, 300] };
    const [w, h] = dims[shape];
    await adminCall("tables", {
      action: "create",
      item: { name: name.trim(), hall: halls[0] || "Asosiy zal", shape, x: 10, y: 10, w, h, seats: 4 },
    });
    setName("");
    refresh();
  }
  async function upd(id: string, patch: object) {
    await adminCall("tables", { action: "update", item: { id, ...patch } });
    await refresh();
  }
  async function del(id: string) {
    if (!confirm("Bu stol o'chirilsinmi?")) return;
    await adminCall("tables", { action: "delete", id });
    setSel(null);
    refresh();
  }
  async function moved(id: string, x: number, y: number) {
    setOverride((o) => ({ ...o, [id]: { x, y } }));
    await upd(id, { x, y });
    setOverride((o) => {
      const n = { ...o };
      delete n[id];
      return n;
    });
  }

  return (
    <>
      <div className="card">
        <h2 style={{ marginBottom: 10 }}>Yangi stol</h2>
        <div className="form-row">
          <div className="field"><label>Nomi yoki raqami</label><input value={name} onChange={(e) => setName(e.target.value)} placeholder="Masalan: 9" /></div>
          <div className="field">
            <label>Shakli</label>
            <select value={shape} onChange={(e) => setShape(e.target.value)}>
              <option value="circle">Dumaloq</option>
              <option value="rect">To&apos;rtburchak</option>
              <option value="oval">Oval</option>
              <option value="bar">Uzun (bar)</option>
            </select>
          </div>
          <button className="btn primary" onClick={add}><Icon name="plus" size={18} /> Qo&apos;shish</button>
        </div>
      </div>

      {halls.map((hall) => (
        <section key={hall}>
          <h2 className="hall-title">{hall}</h2>
          <FloorPlan
            tables={state.tables.filter((t) => t.hall === hall).map((t) => (override[t.id] ? { ...t, ...override[t.id] } : t))}
            editable
            selectedId={sel}
            onPick={(t) => setSel(t.id)}
            onMove={moved}
          />
        </section>
      ))}

      <div className="card" style={{ marginTop: 14 }}>
        {selected ? (
          <>
            <div className="row" style={{ justifyContent: "space-between", marginBottom: 10 }}>
              <h2>Tanlangan stol: {selected.name}</h2>
              <button className="btn sm danger" onClick={() => del(selected.id)}><Icon name="trash" size={16} /> O&apos;chirish</button>
            </div>
            <div className="form-row" key={selected.id}>
              <div className="field"><label>Nomi</label><input defaultValue={selected.name} onBlur={(e) => upd(selected.id, { name: e.target.value })} /></div>
              <div className="field"><label>Zal</label><input defaultValue={selected.hall} onBlur={(e) => upd(selected.id, { hall: e.target.value })} /></div>
              <div className="field">
                <label>Shakli</label>
                <select value={selected.shape} onChange={(e) => upd(selected.id, { shape: e.target.value })}>
                  <option value="circle">Dumaloq</option>
                  <option value="rect">To&apos;rtburchak</option>
                  <option value="oval">Oval</option>
                  <option value="bar">Uzun (bar)</option>
                </select>
              </div>
              <div className="field"><label>Eni</label><input type="number" defaultValue={selected.w} onBlur={(e) => upd(selected.id, { w: Number(e.target.value) })} /></div>
              <div className="field"><label>Bo&apos;yi</label><input type="number" defaultValue={selected.h} onBlur={(e) => upd(selected.id, { h: Number(e.target.value) })} /></div>
              <div className="field"><label>O&apos;rinlar soni</label><input type="number" defaultValue={selected.seats} onBlur={(e) => upd(selected.id, { seats: Number(e.target.value) })} /></div>
            </div>
          </>
        ) : (
          <div className="row muted">
            <Icon name="move" size={20} /> Stolni bosing va sudrang. Bosganingizda uni shu yerda tahrirlash mumkin.
          </div>
        )}
      </div>
    </>
  );
}

/* ---------------- Xodimlar ---------------- */
const ROLES = [
  { v: "admin", l: "Admin" },
  { v: "cashier", l: "Kassir" },
  { v: "waiter", l: "Ofitsiant" },
  { v: "cook", l: "Oshpaz" },
];

function StaffTab({ state, refresh }: P) {
  const [name, setName] = useState("");
  const [role, setRole] = useState("cashier");
  const [login, setLogin] = useState("");
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");

  async function call(body: object) {
    const r = await adminCall("staff", body);
    const e = (r as { error?: string }).error;
    setErr(e || "");
    await refresh();
    return !e;
  }
  async function add() {
    if (!name.trim() || !login.trim() || pw.length < 6) {
      setErr("Ism, login va kamida 6 belgili parolni kiriting");
      return;
    }
    if (await call({ action: "create", item: { name: name.trim(), role, login, password: pw } })) {
      setName(""); setLogin(""); setPw("");
    }
  }
  async function newPass(id: string) {
    const p = prompt("Yangi parol (kamida 6 belgi):");
    if (p) await call({ action: "update", item: { id, password: p } });
  }
  async function del(id: string) {
    if (!confirm("Xodim o'chirilsinmi?")) return;
    await call({ action: "delete", id });
  }

  return (
    <>
      <div className="card">
        <h2 style={{ marginBottom: 10 }}>Yangi xodim</h2>
        <div className="form-row">
          <div className="field"><label>Ism</label><input value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div className="field">
            <label>Lavozim</label>
            <select value={role} onChange={(e) => setRole(e.target.value)}>
              {ROLES.map((r) => <option key={r.v} value={r.v}>{r.l}</option>)}
            </select>
          </div>
          <div className="field"><label>Login</label><input value={login} autoCapitalize="none" onChange={(e) => setLogin(e.target.value)} /></div>
          <div className="field"><label>Parol (6+)</label><input value={pw} type="text" autoComplete="off" onChange={(e) => setPw(e.target.value)} /></div>
          <button className="btn primary" onClick={add}><Icon name="plus" size={18} /> Qo&apos;shish</button>
        </div>
        {err ? <div className="auth-err" role="alert" style={{ marginTop: 10 }}>{err}</div> : null}
        <p className="muted small" style={{ margin: "10px 0 0" }}>
          Admin — hamma narsa. Kassir — kassa, zal, buyurtmalar. Ofitsiant — zal va buyurtma olish. Oshpaz — faqat oshxona cheki.
        </p>
      </div>
      <div className="table-wrap" style={{ marginTop: 14 }}>
        <table className="data">
          <thead><tr><th className="wide">Ism</th><th style={{ width: 160 }}>Lavozim</th><th style={{ width: 150 }}>Login</th><th style={{ width: 130 }}>Parol</th><th>Faol</th><th /></tr></thead>
          <tbody>
            {state.staff.map((s) => (
              <tr key={s.id}>
                <td><input defaultValue={s.name} onBlur={(e) => e.target.value !== s.name && call({ action: "update", item: { id: s.id, name: e.target.value } })} /></td>
                <td>
                  <select value={s.role} onChange={(e) => call({ action: "update", item: { id: s.id, role: e.target.value } })}>
                    {ROLES.map((r) => <option key={r.v} value={r.v}>{r.l}</option>)}
                  </select>
                </td>
                <td><input defaultValue={s.login} autoCapitalize="none" onBlur={(e) => e.target.value !== s.login && call({ action: "update", item: { id: s.id, login: e.target.value } })} /></td>
                <td><button className="btn sm" onClick={() => newPass(s.id)}>{s.hasPassword ? "O'zgartirish" : "O'rnatish"}</button></td>
                <td><input type="checkbox" checked={s.active} onChange={(e) => call({ action: "update", item: { id: s.id, active: e.target.checked } })} aria-label="Faol" /></td>
                <td><button className="btn sm icon danger" onClick={() => del(s.id)} aria-label="O'chirish"><Icon name="trash" size={16} /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

/* ---------------- Sozlamalar ---------------- */
function SettingsTab({ state, refresh, section }: P & { section: "general" | "ai" }) {
  const [s, setS] = useState<Settings>(state.settings);
  const [saved, setSaved] = useState(false);
  const set = <K extends keyof Settings>(k: K, v: Settings[K]) => setS({ ...s, [k]: v });

  async function save() {
    await adminCall("settings", s);
    setSaved(true);
    setTimeout(() => setSaved(false), 1800);
    refresh();
  }
  const text = (k: keyof Settings, label: string, help?: string, area = false) => (
    <div className="field">
      <label>{label}</label>
      {area ? (
        <textarea value={String(s[k])} onChange={(e) => set(k, e.target.value as never)} />
      ) : (
        <input value={String(s[k])} onChange={(e) => set(k, e.target.value as never)} />
      )}
      {help ? <span className="help">{help}</span> : null}
    </div>
  );

  return (
    <div className="stack" style={{ gap: 16 }}>
      {section === "general" ? (
        <>
          <div className="card">
            <h2 style={{ marginBottom: 10 }}>Kafe ma&apos;lumoti</h2>
            {text("cafeName", "Kafe nomi")}
            {text("currency", "Valyuta belgisi", "Narx yonida ko'rinadi, masalan: грн")}
            {text("branchesText", "Filiallar", "Har qatorga bittadan: manzil | telefon | ish vaqti. Bosh sahifada va AI javoblarida ishlatiladi.", true)}
            {text("aboutText", "Kafe haqida qisqa matn", "Bosh sahifada ko'rinadi", true)}
            {text("instagram", "Instagram (@ siz)", "Masalan: barakat.kyiv")}
          </div>
          <div className="card">
            <h2 style={{ marginBottom: 10 }}>Chek</h2>
            {text("receiptHeader", "Chek sarlavhasi", "Logo ostida chiqadi. Yangi qator uchun Enter.", true)}
            {text("receiptFooter", "Chek pastki matni")}
            <div className="field">
              <label>Chek qog&apos;ozi kengligi</label>
              <select value={s.paperMm} onChange={(e) => set("paperMm", Number(e.target.value))}>
                <option value={80}>80 mm</option>
                <option value={58}>58 mm</option>
              </select>
            </div>
          </div>
        </>
      ) : (
        <div className="card">
          <h2 style={{ marginBottom: 10 }}>AI operator sozlamalari</h2>
          <label className="check">
            <input type="checkbox" checked={s.aiEnabled} onChange={(e) => set("aiEnabled", e.target.checked)} />
            <span>AI operator yoqilgan</span>
          </label>
          {text("aiGreeting", "Salomlashish matni", "Qo'ng'iroq boshida AI shuni aytadi", true)}
          {text("aiSystemExtra", "AI uchun qo'shimcha ko'rsatma", "Masalan: bugun aksiya bor, yetkazib berish yo'q, 22:00 da yopiladi", true)}
          <div className="field">
            <label>Brauzer sinovi uchun ovoz tili</label>
            <select value={s.aiVoiceLang} onChange={(e) => set("aiVoiceLang", e.target.value)}>
              <option value="uk-UA">Ukrainacha</option>
              <option value="ru-RU">Ruscha</option>
              <option value="uz-UZ">O&apos;zbekcha</option>
              <option value="en-US">Inglizcha</option>
            </select>
          </div>
        </div>
      )}
      <button className="btn primary lg" onClick={save}>
        <Icon name="check" size={18} /> {saved ? "Saqlandi" : "Saqlash"}
      </button>
    </div>
  );
}

/* ---------------- Suhbatlar ---------------- */
function Calls({ state }: { state: AppState }) {
  if (state.conversations.length === 0)
    return (
      <div className="card empty">
        <div className="empty-ico"><Icon name="history" /></div>
        <b>Hali suhbat yo&apos;q</b>
        <span>Mijoz «Qo'ng'iroq» sahifasidan gaplashgach, suhbat matni va audio yozuvi shu yerda saqlanadi.</span>
      </div>
    );
  return (
    <div className="stack">
      {state.conversations.map((c) => (
        <div className="card" key={c.id}>
          <div className="row" style={{ justifyContent: "space-between" }}>
            <b>{dateTimeOf(c.startedAt)}{c.guestPhone ? ` · ${c.guestPhone}` : ""}</b>
            <span className="pill gray">{c.summary || "Zakazsiz"}</span>
          </div>
          {c.recordingId ? (
            <audio controls preload="none" src={`/api/recordings/${c.recordingId}`} style={{ width: "100%", marginTop: 10 }} />
          ) : null}
          <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 4 }}>
            {c.lines.map((l, i) => (
              <div key={i} className="small">
                <b>{l.role === "ai" ? "AI operator" : "Mijoz"}:</b> {l.text}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ---------------- Tizim ---------------- */
function System({ state, refresh }: P) {
  const pg = state.storageMode === "postgres";
  const [origin, setOrigin] = useState("");
  const [tableId, setTableId] = useState("");
  const [qr, setQr] = useState("");
  useEffect(() => setOrigin(location.origin), []);
  const catalogUrl = origin + "/katalog" + (tableId ? "?stol=" + tableId : "");
  useEffect(() => {
    if (!origin) return;
    import("qrcode").then((m) => m.toDataURL(catalogUrl, { width: 320, margin: 1 })).then(setQr);
  }, [origin, catalogUrl]);

  return (
    <div className="stack" style={{ maxWidth: 640 }}>
      <div className="card">
        <h2 style={{ marginBottom: 8 }}>Havolalar va QR</h2>
        <div className="stack" style={{ gap: 6, marginBottom: 12 }}>
          <div><b>Menyu katalogi:</b> <a href="/katalog" target="_blank" rel="noreferrer">{origin}/katalog</a></div>
          <div><b>Qo&apos;ng&apos;iroq (AI operator):</b> <a href="/qongiroq" target="_blank" rel="noreferrer">{origin}/qongiroq</a></div>
        </div>
        <div className="field" style={{ maxWidth: 260 }}>
          <label>Stol uchun QR</label>
          <select value={tableId} onChange={(e) => setTableId(e.target.value)}>
            <option value="">Umumiy (stolsiz)</option>
            {state.tables.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>
        {qr ? (
          <div className="row" style={{ gap: 14, alignItems: "center", flexWrap: "wrap" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qr} alt="QR kod" width={160} height={160} style={{ borderRadius: 8, border: "1px solid var(--line)" }} />
            <div className="small muted" style={{ maxWidth: 300 }}>
              Stolga qo&apos;ying: mijoz kamerani yo&apos;naltirib menyuni ochadi va shu stol nomi bilan buyurtma beradi.
              <br /><a href={qr} download={"qr-" + (tableId || "umumiy") + ".png"}>QR rasmni yuklab olish</a>
            </div>
          </div>
        ) : null}
        {origin.startsWith("http://localhost") ? (
          <p className="muted small">Telefon bilan sinash uchun sayt internetda (HTTPS) bo&apos;lishi kerak — Vercel&apos;ga joylagach QR ishlaydi.</p>
        ) : null}
      </div>

      <div className="card">
        <h2 style={{ marginBottom: 8 }}>Chek printeri</h2>
        <div style={{ marginBottom: 10 }}><PrinterStatus printers={state.printers} /></div>
        <ol className="small" style={{ margin: "0 0 12px 18px", padding: 0, lineHeight: 1.7 }}>
          <li>Printerni kompyuterga ulang va Windows&apos;da drayverini o&apos;rnating (Printers &amp; scanners&apos;da ko&apos;rinsin).</li>
          <li>Chek kengligini Sozlamalar → «Chek qog&apos;ozi kengligi»dan tanlang (80 yoki 58 mm).</li>
          <li>«Test chek» ni bosing, chop etish oynasida printerni tanlang, «Margins: None», «Scale: 100%».</li>
          <li>Printer oshxona kompyuteriga ulangan bo'lsa: u yerda «Oshxona printeri» sahifasini oching. Printer kassa kompyuteriga ulangan bo'lsa: Kassa sahifasida «Shu kompyuterda» ni tanlang. Buyurtma tasdiqlanganda chek avtomatik chiqadi.</li>
        </ol>
        <a className="btn primary" href="/print/test" target="_blank" rel="noreferrer"><Icon name="printer" size={18} /> Test chek</a>
        <details style={{ marginTop: 12 }}>
          <summary className="small" style={{ cursor: "pointer", fontWeight: 600 }}>Oynasiz (so&apos;ramasdan) chop etish — Windows</summary>
          <p className="small muted" style={{ margin: "8px 0" }}>
            Printerni Windows&apos;da «Default printer» qiling. Chrome yorlig&apos;ining «Target» qismiga oxiridan bo&apos;sh joy qoldirib qo&apos;shing:
          </p>
          <code style={{ display: "block", whiteSpace: "pre-wrap", wordBreak: "break-all", fontSize: 12, background: "var(--bg)", padding: 8, borderRadius: 8 }}>
            --kiosk-printing --app={origin}/kitchen   (kassada: …/kassa)
          </code>
          <p className="small muted" style={{ margin: "8px 0 0" }}>Shu yorliq bilan ochilgan oyna chekni bosib chiqarish oynasisiz to&apos;g&apos;ridan-to&apos;g&apos;ri printerga yuboradi.</p>
        </details>
      </div>

      <div className="card">
        <div className="row" style={{ marginBottom: 8 }}>
          <span className={"pill " + (pg ? "green" : "amber")}>{pg ? "Doimiy baza (Postgres)" : "Vaqtinchalik xotira"}</span>
        </div>
        {!pg ? (
          <p className="muted small">
            Hozir ma&apos;lumotlar server xotirasida: serverni qayta ishga tushirsangiz demo holatiga qaytadi.
            Doimiy qilish uchun <code>DATABASE_URL</code> (Neon Postgres) qo&apos;shing.
          </p>
        ) : null}
        <button
          className="btn danger"
          onClick={async () => {
            if (confirm("Menyu, stollar va buyurtmalar demo holatiga qaytariladi (xodimlar saqlanadi). Davom etasizmi?")) {
              await api("/api/reset", { method: "POST" });
              refresh();
            }
          }}
        >
          Demo ma&apos;lumotni tiklash
        </button>
      </div>
    </div>
  );
}

function CopyBox({ label, text, rows }: { label: string; text: string; rows?: number }) {
  const [ok, setOk] = useState(false);
  return (
    <div className="field" style={{ marginBottom: 10 }}>
      <span>{label}</span>
      <textarea readOnly value={text} rows={rows || 2} style={{ fontFamily: "monospace", fontSize: 12.5 }} onFocus={(e) => e.currentTarget.select()} />
      <button
        className="btn sm"
        style={{ marginTop: 6 }}
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(text);
            setOk(true);
            setTimeout(() => setOk(false), 1500);
          } catch {}
        }}
      >
        {ok ? "Nusxalandi" : "Nusxalash"}
      </button>
    </div>
  );
}

function PhoneSetup({ state }: { state: AppState }) {
  const [origin, setOrigin] = useState("https://SIZNING-SAYT.vercel.app");
  useEffect(() => setOrigin(window.location.origin), []);
  const v = state.voice;
  const st = state.settings;
  const flags: [string, boolean | undefined, string][] = [
    ["ELEVENLABS_AGENT_ID", v?.agentId, "Agent ID (saytdagi «Zvonok» tugmasi shu agentga ulanadi)"],
    ["ELEVENLABS_API_KEY", v?.apiKey, "Agent maxfiy bo'lsa kerak (signed URL)"],
    ["VOICE_API_KEY", v?.voiceKey, "Tool'lar uchun parol, kamida 16 belgi"],
    ["ELEVENLABS_WEBHOOK_SECRET", v?.webhookSecret, "Suhbat yozuvi va matni uchun"],
    ["ANTHROPIC_API_KEY", v?.claude, "Faqat brauzer rejimi uchun (ixtiyoriy)"],
  ];
  const prompt = `Siz «${st.cafeName}» kafesining telefon operatorisiz (o'zbek taomlari, Kyiv).
Vazifangiz: mijozdan buyurtma qabul qilish, menyu va manzillar haqida aytish.

TIL: mijoz qaysi tilda gapirsa (ukrain, rus, ingliz, o'zbek) shu tilda javob bering. Birinchi salomni ukrain tilida bering: «${st.aiGreeting}»

QOIDALAR:
- Qisqa va xushmuomala gapiring, har safar bitta savol bering.
- Menyu va narxni FAQAT get_menu tool'dan oling, o'zingiz to'qimang.
- Mijoz nima buyursa, nomi va sonini aniqlang. Menyuda yo'q taomni taklif qilmang.
- Buyurtmani oxirida bir marta qayta o'qib bering va tasdiqlatib oling.
- Mijozning ismi va telefon raqamini so'rang.
- Tasdiqlangach create_order tool'ni chaqiring va buyurtma raqamini ayting: «Kassir tasdiqlagach oshxonaga uzatiladi».
- To'lovni telefonda qabul qilmang. Yetkazib berish haqida va'da bermang.
- Bilmagan narsangizni o'ylab topmang: «Kassirga ulayman / filialga qo'ng'iroq qiling» deng.

KAFE: ${st.aboutText}
FILIALLAR:
${st.branchesText}`;

  const toolMenu = JSON.stringify(
    {
      type: "webhook",
      name: "get_menu",
      description: "Kafe menyusi, narxlari va filiallar ro'yxatini oladi. Buyurtma boshlashdan oldin chaqiring.",
      api_schema: { url: `${origin}/api/voice/menu`, method: "GET", request_headers: { "x-voice-key": "<VOICE_API_KEY>" } },
    },
    null,
    2
  );
  const toolOrder = JSON.stringify(
    {
      type: "webhook",
      name: "create_order",
      description: "Mijoz tasdiqlagandan keyin buyurtmani kassaga yuboradi. Buyurtma raqamini qaytaradi.",
      api_schema: {
        url: `${origin}/api/voice/order`,
        method: "POST",
        request_headers: { "x-voice-key": "<VOICE_API_KEY>" },
        request_body_schema: {
          type: "object",
          required: ["items"],
          properties: {
            items: {
              type: "array",
              description: "Buyurtma qatorlari",
              items: {
                type: "object",
                required: ["name", "quantity"],
                properties: { name: { type: "string", description: "Taom nomi" }, quantity: { type: "integer", description: "Soni" } },
              },
            },
            customer_name: { type: "string", description: "Mijoz ismi" },
            phone: { type: "string", description: "Mijoz telefoni" },
            comment: { type: "string", description: "Izoh" },
            conversation_id: { type: "string", dynamic_variable: "system__conversation_id" },
          },
        },
      },
    },
    null,
    2
  );

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <div className="card">
        <h2>Qanday ishlaydi</h2>
        <p className="muted" style={{ marginTop: 0 }}>
          Mijoz telefon qiladi → AI operator (ElevenLabs) ukrain / rus / ingliz / o&apos;zbek tilida gaplashadi → buyurtma kassaga tushadi →
          kassir tasdiqlaydi → oshxona printeridan chek chiqadi. Suhbat audio yozuvi va matni avtomatik saqlanadi.
        </p>
        <ol style={{ paddingLeft: 20, lineHeight: 1.7, margin: 0 }}>
          <li>elevenlabs.io da hisob oching → <b>Agents</b> → yangi agent. Quyidagi ko&apos;rsatmani (prompt) joylang, <b>Language detection</b> tizim tool&apos;ini yoqing, ovozni tanlang. Birinchi navbatda o&apos;zbek tilini sinab ko&apos;ring.</li>
          <li>Agent&apos;ga 2 ta tool qo&apos;shing (pastdagi JSON). <code>&lt;VOICE_API_KEY&gt;</code> o&apos;rniga o&apos;zingiz o&apos;ylab topgan uzun parolni yozing.</li>
          <li>Vercel → Settings → Environment Variables: pastdagi kalitlarni kiriting va qayta deploy qiling.</li>
          <li>ElevenLabs → Settings → Webhooks: <b>post-call</b> manzilini qo&apos;shing (transkript + audio yoqilgan), maxfiy kalitni <code>ELEVENLABS_WEBHOOK_SECRET</code> ga yozing.</li>
          <li>Telefon raqam: ElevenLabs → Phone numbers → Twilio raqamini ulang, yoki kafening mavjud raqamidan shu raqamga yo&apos;naltiring (forwarding).</li>
        </ol>
        <p className="muted small" style={{ marginBottom: 0 }}>
          Muhim: tool va webhook faqat internetdan ochiq manzilda ishlaydi (Vercel deploy). Kompyuterdagi localhost&apos;da ishlamaydi.
        </p>
      </div>

      <div className="card">
        <h2>Holat</h2>
        {flags.map(([k, ok, d]) => (
          <div key={k} style={{ display: "flex", gap: 10, alignItems: "center", padding: "6px 0", borderBottom: "1px solid var(--line)" }}>
            <span className={"pill " + (ok ? "green" : "amber")} style={{ minWidth: 70, textAlign: "center" }}>{ok ? "ulangan" : "yo'q"}</span>
            <div>
              <code>{k}</code>
              <div className="muted small">{d}</div>
            </div>
          </div>
        ))}
        {!v ? <p className="muted small">Holatni faqat admin ko&apos;radi.</p> : null}
      </div>

      <div className="card">
        <h2>Agent uchun tayyor matnlar</h2>
        <CopyBox label="Agent ko'rsatmasi (System prompt)" text={prompt} rows={14} />
        <CopyBox label="Tool 1 — get_menu" text={toolMenu} rows={10} />
        <CopyBox label="Tool 2 — create_order" text={toolOrder} rows={16} />
        <CopyBox label="Post-call webhook manzili" text={`${origin}/api/voice/webhook`} rows={1} />
        <p className="muted small" style={{ marginBottom: 0 }}>
          JSON maydon nomlari ElevenLabs interfeysida biroz farq qilishi mumkin — shunda qiymatlarni (URL, sarlavha, parametrlar) qo&apos;lda kiriting.
          Parametrlar: <code>items[name, quantity]</code>, <code>customer_name</code>, <code>phone</code>, <code>comment</code>, <code>conversation_id</code>.
        </p>
      </div>
    </div>
  );
}
