"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import PublicShell from "@/components/PublicShell";
import { T, usePubLang } from "@/lib/pubtext";
import { Icon } from "@/components/Icons";
import { money } from "@/lib/format";
import { createRecognizer, hasVoice, recognizerAvailable, speak, stopSpeaking, type SpeechRecognitionLike } from "@/lib/speech";
import type { Product, TranscriptLine } from "@/lib/types";

type Phase = "idle" | "ai" | "listen" | "think" | "done";
interface Cart { productId: string; qty: number }
interface Turn { reply: string; cart: Cart[]; finished: boolean; engine: string }

const LANGS = [
  { v: "uk-UA", l: "Українська" },
  { v: "ru-RU", l: "Русский" },
  { v: "en-US", l: "English" },
  { v: "uz-UZ", l: "O'zbekcha" },
];
const MAX_TURNS = 20;
const MAX_MS = 5 * 60_000;

export default function CallPage() {
  const [pl, setPl] = usePubLang();
  const t = T[pl];
  const [el, setEl] = useState<{ end: () => Promise<void> } | null>(null);
  const [info, setInfo] = useState<{ instagram?: string; cafeName: string; currency: string; greeting: string; voiceLang: string; aiEnabled: boolean; products: Product[] } | null>(null);
  const [lang, setLang] = useState("uk-UA");
  const [phase, setPhase] = useState<Phase>("idle");
  const [lines, setLines] = useState<TranscriptLine[]>([]);
  const [cart, setCart] = useState<Cart[]>([]);
  const [interim, setInterim] = useState("");
  const [text, setText] = useState("");
  const [phone, setPhone] = useState("");
  const [note, setNote] = useState("");
  const [micOk, setMicOk] = useState<boolean | null>(null);
  const [result, setResult] = useState<{ number: number | null; recorded: boolean; engine: string } | null>(null);
  const [secs, setSecs] = useState(0);
  const [caps, setCaps] = useState({ stt: true, voice: true });

  const active = useRef(false);
  const rec = useRef<SpeechRecognitionLike | null>(null);
  const mr = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const chunks = useRef<Blob[]>([]);
  const mime = useRef("audio/webm");
  const linesRef = useRef<TranscriptLine[]>([]);
  const cartRef = useRef<Cart[]>([]);
  const startedAt = useRef("");
  const guestTurns = useRef(0);
  const engine = useRef("");
  const silent = useRef(0);
  const langRef = useRef(lang);
  const phoneRef = useRef("");
  const logRef = useRef<HTMLDivElement | null>(null);
  langRef.current = lang;
  phoneRef.current = phone;
  linesRef.current = lines;
  cartRef.current = cart;

  useEffect(() => {
    fetch("/api/public/catalog", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        setInfo(d);
        setLang(d.voiceLang || "uk-UA");
      });
    return () => {
      active.current = false;
      rec.current?.abort();
      stopSpeaking();
      stream.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  useEffect(() => {
    setCaps({ stt: recognizerAvailable(), voice: hasVoice(langRef.current) });
  }, [lang]);

  useEffect(() => {
    logRef.current?.scrollTo({ top: 1e6, behavior: "smooth" });
  }, [lines, interim]);

  useEffect(() => {
    if (phase === "idle" || phase === "done") return;
    const id = setInterval(() => setSecs((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [phase]);

  const push = (role: "ai" | "guest", t: string) => {
    const l = { role, text: t, at: new Date().toISOString() } as TranscriptLine;
    linesRef.current = [...linesRef.current, l];
    setLines(linesRef.current);
  };

  const finish = useCallback(async () => {
    if (!active.current) return;
    active.current = false;
    rec.current?.abort();
    stopSpeaking();
    setPhase("think");
    setInterim("");
    // Yozuvni yakunlash
    const blobP = new Promise<Blob | null>((resolve) => {
      const m = mr.current;
      if (!m || m.state === "inactive") return resolve(chunks.current.length ? new Blob(chunks.current, { type: mime.current }) : null);
      m.onstop = () => resolve(chunks.current.length ? new Blob(chunks.current, { type: mime.current }) : null);
      m.stop();
    });
    const blob = await blobP;
    stream.current?.getTracks().forEach((t) => t.stop());
    let number: number | null = null;
    let recorded = false;
    try {
      const res = await fetch("/api/public/call", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ lines: linesRef.current, cart: cartRef.current, guestPhone: phoneRef.current, startedAt: startedAt.current }),
      });
      const d = await res.json();
      if (res.ok) {
        number = d.number;
        if (blob && blob.size > 0) {
          const up = await fetch("/api/public/recording?conv=" + d.convId, { method: "POST", headers: { "content-type": mime.current }, body: blob });
          recorded = up.ok;
        }
      } else setNote(d.error || "Saqlashda xatolik");
    } catch {
      setNote("Server bilan aloqa yo'q — buyurtma yuborilmadi");
    }
    setResult({ number, recorded, engine: engine.current });
    setPhase("done");
  }, []);

  const listen = useCallback(() => {
    if (!active.current) return;
    const r = createRecognizer(langRef.current);
    if (!r) {
      setPhase("listen");
      return; // matn rejimi
    }
    rec.current = r;
    let got = "";
    r.onresult = (e) => {
      let live = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const res = e.results[i];
        if (res.isFinal) got += res[0].transcript;
        else live += res[0].transcript;
      }
      setInterim(live);
    };
    r.onerror = (e) => {
      const code = (e as { error?: string })?.error;
      if (code === "not-allowed" || code === "service-not-allowed") {
        setNote("Mikrofonga ruxsat berilmagan. Matn yozib davom eting.");
        active.current && setPhase("listen");
        rec.current = null;
      }
    };
    r.onend = () => {
      setInterim("");
      if (!active.current || rec.current !== r) return;
      if (got.trim()) {
        silent.current = 0;
        void send(got.trim());
      } else if (++silent.current < 6) {
        setTimeout(listen, 300);
      } else {
        setNote("Sizni eshitmayapman. «Gapirish» tugmasini bosing yoki yozing.");
        setPhase("listen");
        rec.current = null;
      }
    };
    setPhase("listen");
    try {
      r.start();
    } catch {
      /* allaqachon boshlangan */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const aiSay = useCallback(
    (t: string, after: () => void) => {
      push("ai", t);
      setPhase("ai");
      speak(t, langRef.current, () => active.current && after());
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  async function send(guestText: string) {
    if (!active.current) return;
    rec.current?.abort();
    rec.current = null;
    stopSpeaking();
    push("guest", guestText);
    setText("");
    guestTurns.current += 1;
    setPhase("think");
    try {
      const res = await fetch("/api/public/ai", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ messages: linesRef.current.map((l) => ({ role: l.role, text: l.text })), cart: cartRef.current }),
      });
      const turn: Turn = await res.json();
      if (!res.ok) throw new Error((turn as unknown as { error: string }).error);
      engine.current = turn.engine;
      setCart(turn.cart || []);
      cartRef.current = turn.cart || [];
      const end = (turn.finished && cartRef.current.length > 0) || guestTurns.current >= MAX_TURNS;
      aiSay(turn.reply, () => (end ? void finish() : listen()));
    } catch (e) {
      aiSay((e as Error).message || "Kechirasiz, xatolik yuz berdi.", () => listen());
    }
  }

  async function startEleven(vs: { signedUrl?: string; agentId?: string }) {
    setNote("");
    setResult(null);
    setLines([]);
    linesRef.current = [];
    setCart([]);
    setSecs(0);
    setPhase("think");
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true }).then((st) => st.getTracks().forEach((x) => x.stop()));
      const { Conversation } = await import("@elevenlabs/client");
      const opts = {
        onMessage: (m: { source: string; message: string }) => {
          if (m?.message) push(m.source === "user" ? "guest" : "ai", m.message);
        },
        onModeChange: (m: { mode: string }) => setPhase(m.mode === "speaking" ? "ai" : "listen"),
        onDisconnect: () => {
          setEl(null);
          setResult({ number: null, recorded: true, engine: "elevenlabs" });
          setPhase("done");
        },
        onError: (e: unknown) => setNote(String((e as Error)?.message || e)),
      };
      const c = vs.signedUrl
        ? await Conversation.startSession({ signedUrl: vs.signedUrl, ...opts })
        : await Conversation.startSession({ agentId: vs.agentId as string, connectionType: "websocket", ...opts });
      setEl({ end: () => c.endSession() });
      setPhase("listen");
    } catch (e) {
      setNote((e as Error)?.message || "Mikrofon yoki ulanish xatosi");
      setPhase("idle");
    }
  }

  async function start() {
    if (!info) return;
    try {
      const vs = await fetch("/api/public/voice-session", { cache: "no-store" }).then((r) => r.json());
      if (vs.mode === "elevenlabs") return void (await startEleven(vs));
    } catch {
      /* brauzer rejimi */
    }
    setNote("");
    setResult(null);
    setLines([]);
    linesRef.current = [];
    setCart([]);
    cartRef.current = [];
    setSecs(0);
    guestTurns.current = 0;
    silent.current = 0;
    chunks.current = [];
    startedAt.current = new Date().toISOString();
    active.current = true;
    // Mikrofon + yozuv
    try {
      const s = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.current = s;
      const type = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg"].find((t) => window.MediaRecorder?.isTypeSupported?.(t));
      mime.current = (type || "audio/webm").split(";")[0];
      const m = new MediaRecorder(s, type ? { mimeType: type } : undefined);
      m.ondataavailable = (e) => e.data.size && chunks.current.push(e.data);
      m.start(1000);
      mr.current = m;
      setMicOk(true);
    } catch {
      setMicOk(false);
      setNote("Mikrofon ishlamadi — yozuv bo'lmaydi. Matn yozib sinab ko'rishingiz mumkin.");
      mr.current = null;
    }
    setTimeout(() => active.current && finish(), MAX_MS);
    aiSay(info.greeting, () => listen());
  }

  const cur = info?.currency || "so'm";
  const total = cart.reduce((n, c) => n + c.qty * (info?.products.find((p) => p.id === c.productId)?.price || 0), 0);
  const mm = String(Math.floor(secs / 60)).padStart(2, "0") + ":" + String(secs % 60).padStart(2, "0");
  const labels: Record<Phase, [string, string]> = {
    idle: [t.idle, ""],
    ai: [t.speaking, ""],
    listen: [t.listening, interim || ""],
    think: [t.thinking, ""],
    done: [t.done, ""],
  };

  return (
    <PublicShell name={info?.cafeName || "Barakat"} lang={pl} setLang={setPl} instagram={info?.instagram}>
      <div className="call-hero"><h1>{t.callTitle}</h1><p>{t.callSub}</p>
        <ol className="call-steps">{t.callSteps.map((x, i) => <li key={i}><b>{i + 1}</b><span>{x}</span></li>)}</ol></div>
      <div className="call-wrap">
        <div className="call-card">
          <div className="call-state" aria-live="polite">
            <div className={"orb " + (phase === "ai" ? "ai" : phase === "listen" ? "listen" : phase === "think" ? "think" : phase === "done" ? "idle" : "")}>
              <Icon name={phase === "listen" ? "mic" : "phone"} size={44} />
            </div>
            <div className="call-label">{labels[phase][0]}{phase !== "idle" && phase !== "done" ? ` · ${mm}` : ""}</div>
            <div className="call-sub">{labels[phase][1]}</div>
          </div>

          {phase === "idle" ? (
            <>
              <label className="field" style={{ marginTop: 12 }}>
                <span>{t.language}</span>
                <select value={lang} onChange={(e) => setLang(e.target.value)}>
                  {LANGS.map((l) => <option key={l.v} value={l.v}>{l.l}</option>)}
                </select>
              </label>
              <label className="field">
                <span>{t.yourPhone}</span>
                <input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" placeholder="+380 93 000 00 00" />
              </label>
              {!caps.stt ? (
                <div className="call-note" style={{ marginBottom: 10 }}>{pl === "uk" ? "Використовуйте Chrome або Edge." : pl === "uz" ? "Chrome yoki Edge'dan foydalaning." : "Используйте Chrome или Edge."}</div>
              ) : null}
              {!caps.voice ? (
                <div className="call-note" style={{ marginBottom: 10 }}>{pl === "uk" ? `Голос «${lang}» не знайдено на цьому пристрої.` : pl === "uz" ? `«${lang}» ovozi bu qurilmada topilmadi.` : `Голос «${lang}» не найден на этом устройстве.`}</div>
              ) : null}
              <p className="muted" style={{ fontSize: 13, margin: "0 0 12px" }}>{t.recNote}</p>
              <button className="btn primary lg block" disabled={!info || !info.aiEnabled} onClick={start}>
                <Icon name="phone" size={20} /> {info && !info.aiEnabled ? "—" : t.start}
              </button>
            </>
          ) : null}

          {phase !== "idle" && phase !== "done" ? (
            <div className="call-btns">
              {caps.stt && phase === "listen" && !rec.current ? (
                <button className="btn" onClick={() => { setNote(""); silent.current = 0; listen(); }}><Icon name="mic" size={18} /> Gapirish</button>
              ) : null}
              <button className="btn danger" onClick={() => (el ? void el.end() : void finish())}><Icon name="x" size={18} /> {t.end}</button>
            </div>
          ) : null}

          {phase === "done" && result ? (
            <div className="ok-box">
              {result.number || result.engine === "elevenlabs" ? (
                <>
                  <div className="ok-ico"><Icon name="check" size={32} /></div>
                  {result.number ? <div className="big">№{result.number}</div> : null}
                  <p>{t.okText}</p>
                </>
              ) : (
                <p>{t.notOrdered}</p>
              )}

              <button className="btn primary lg block" onClick={() => { setPhase("idle"); setLines([]); setCart([]); }}>{t.newCall}</button>
            </div>
          ) : null}
        </div>

        {note ? <div className="call-note" role="status">{note}</div> : null}

        {phase !== "idle" && phase !== "done" ? (
          <form className="call-text" onSubmit={(e) => { e.preventDefault(); if (text.trim() && phase !== "think") void send(text.trim()); }}>
            <input value={text} onChange={(e) => setText(e.target.value)} placeholder={t.typeHere} aria-label="Xabar" />
            <button className="btn primary icon" aria-label="Yuborish" disabled={!text.trim()}><Icon name="send" size={18} /></button>
          </form>
        ) : null}

        {lines.length > 0 ? (
          <div className="call-card">
            <div className="call-log" ref={logRef} aria-label="Suhbat">
              {lines.map((l, i) => (
                <div key={i} className={"bubble " + (l.role === "guest" ? "guest" : "ai")}>{l.text}</div>
              ))}
              {interim ? <div className="bubble guest" style={{ opacity: 0.6 }}>{interim}</div> : null}
            </div>
          </div>
        ) : null}

        {cart.length > 0 ? (
          <div className="call-card">
            <b>{t.cartTitle}</b>
            <div className="call-cart" style={{ marginTop: 8 }}>
              {cart.map((c) => {
                const p = info?.products.find((x) => x.id === c.productId);
                return <div key={c.productId}><span>{p?.name} × {c.qty}</span><span>{money((p?.price || 0) * c.qty)}</span></div>;
              })}
              <div style={{ fontWeight: 800, borderTop: "1px solid var(--line)", paddingTop: 6 }}><span>{t.total}</span><span>{money(total, cur)}</span></div>
            </div>
          </div>
        ) : null}
      </div>
    </PublicShell>
  );
}
