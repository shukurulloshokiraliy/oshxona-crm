"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Logo } from "@/components/Logo";
import { Icon } from "@/components/Icons";
import { homeFor } from "@/lib/access";
import type { Role } from "@/lib/types";

function LoginForm() {
  const params = useSearchParams();
  const [mode, setMode] = useState<"loading" | "login" | "setup">("loading");
  const [cafe, setCafe] = useState("Oshxona CRM");
  const [name, setName] = useState("Administrator");
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (d.me) {
          location.href = homeFor(d.me.role as Role);
          return;
        }
        if (d.cafeName) setCafe(d.cafeName);
        if (d.needsSetup) setLogin("admin");
        setMode(d.needsSetup ? "setup" : "login");
      })
      .catch(() => setMode("login"));
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    setBusy(true);
    try {
      const res = await fetch(mode === "setup" ? "/api/auth/setup" : "/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ login, password, name }),
      });
      const d = await res.json();
      if (!res.ok) {
        setErr(d.error || "Xatolik");
        return;
      }
      const next = params.get("next");
      location.href = next && next.startsWith("/") && !next.startsWith("//") ? next : homeFor(d.me.role as Role);
    } catch {
      setErr("Server bilan aloqa yo'q");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div className="auth-brand">
          <span className="brand-mark"><Logo size={40} /></span>
          <span>{cafe}</span>
        </div>
        {mode === "loading" ? (
          <p className="auth-sub">Yuklanmoqda…</p>
        ) : (
          <form onSubmit={submit} className="auth-form">
            <h1>{mode === "setup" ? "Birinchi ishga tushirish" : "Tizimga kirish"}</h1>
            <p className="auth-sub">
              {mode === "setup"
                ? "Administrator parolini o'rnating. Keyin xodimlarni Sozlamalar bo'limidan qo'shasiz."
                : "Login va parolingizni kiriting."}
            </p>
            {mode === "setup" ? (
              <label className="field">
                <span>Ismingiz</span>
                <input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
              </label>
            ) : null}
            <label className="field">
              <span>Login</span>
              <input value={login} onChange={(e) => setLogin(e.target.value)} autoComplete="username" autoCapitalize="none" required autoFocus />
            </label>
            <label className="field">
              <span>{mode === "setup" ? "Yangi parol (kamida 8 belgi)" : "Parol"}</span>
              <div className="pw-row">
                <input
                  type={show ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete={mode === "setup" ? "new-password" : "current-password"}
                  required
                />
                <button type="button" className="btn ghost sm" onClick={() => setShow((v) => !v)}>
                  {show ? "Yashirish" : "Ko'rsatish"}
                </button>
              </div>
            </label>
            {err ? <div className="auth-err" role="alert">{err}</div> : null}
            <button className="btn primary lg block" disabled={busy}>
              {busy ? "Kutilmoqda…" : mode === "setup" ? "Boshlash" : "Kirish"}
            </button>
          </form>
        )}
        <div className="auth-links">
          <Link href="/katalog">Menyu (mijozlar uchun)</Link>
          <Link href="/qongiroq">Qo'ng'iroq qilish</Link>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
