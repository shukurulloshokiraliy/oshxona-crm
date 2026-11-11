"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { canOpen, homeFor, ROLE_LABEL } from "@/lib/access";
import { logout, useMe } from "@/lib/useMe";
import { Logo } from "@/components/Logo";
import { Icon, type IconName } from "./Icons";

interface NavDef {
  href: string;
  label: string;
  short: string;
  hint: string;
  icon: IconName;
  color: string;
}

const NAV: NavDef[] = [
  { href: "/pos", label: "Zal", short: "Zal", hint: "Stollar va ochiq cheklar", icon: "grid" , color: "#c9983f" },
  { href: "/kassa", label: "Kassa", short: "Kassa", hint: "Zakazlarni tasdiqlash", icon: "cash" , color: "#3f9a6e" },
  { href: "/orders", label: "Buyurtmalar", short: "Buyurtma", hint: "Barcha cheklar tarixi", icon: "receipt" , color: "#3f9a9a" },
  { href: "/kitchen", label: "Oshxona printeri", short: "Oshxona", hint: "Chek chiqaradigan sahifa", icon: "printer" , color: "#dd7a30" },
  { href: "/admin", label: "Sozlamalar", short: "Admin", hint: "Menyu, stollar, xodimlar", icon: "sliders" , color: "#a39e96" },
];

export default function AppShell({
  title,
  hint,
  waiting = 0,
  cafe = "Oshxona CRM",
  back,
  actions,
  flush = false,
  children,
}: {
  title: string;
  hint?: string;
  waiting?: number;
  cafe?: string;
  back?: { href: string; label: string };
  actions?: ReactNode;
  /** true bo'lsa kontent to'liq kenglikda, o'zi scroll qiladi (chek ekrani) */
  flush?: boolean;
  children: ReactNode;
}) {
  const path = usePathname();
  const router = useRouter();
  const me = useMe();
  const [dark, setDark] = useState(false);
  useEffect(() => setDark(document.documentElement.dataset.theme === "dark"), []);
  const toggleTheme = () => {
    const next = dark ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem("theme", next); } catch {}
    setDark(!dark);
  };
  useEffect(() => {
    if (me && !canOpen(me.role, path)) router.replace(homeFor(me.role));
  }, [me, path, router]);
  const cur = NAV.find((n) => path === n.href || path.startsWith(n.href + "/"));
  const nav = me ? NAV.filter((n) => canOpen(me.role, n.href)) : [];
  const isActive = (href: string) => path === href || path.startsWith(href + "/");

  return (
    <div className={"app" + (back ? " has-back" : "")} style={{ ["--sec" as string]: cur?.color || "#8e1b2c" }}>
      <aside className="side">
        <div className="brand">
          <span className="brand-mark">
            <Logo size={36} />
          </span>
          <span className="brand-name">{cafe}</span>
        </div>
        <nav className="side-nav" aria-label="Asosiy menyu">
          {nav.map((n) => (
            <Link key={n.href} href={n.href} className={"nav-item" + (isActive(n.href) ? " active" : "")} style={{ ["--sec" as string]: n.color }}>
              <Icon name={n.icon} size={20} />
              <span className="nav-text">
                <b>{n.label}</b>
                <small>{n.hint}</small>
              </span>
              <span className="nav-short">{n.short}</span>
              {n.href === "/kassa" && waiting > 0 ? <span className="badge">{waiting}</span> : null}
            </Link>
          ))}
        </nav>
        <div className="side-foot">
          {me ? (
            <div className="who">
              <span className="who-ava">{me.name.slice(0, 1).toUpperCase()}</span>
              <span className="who-text">
                <b>{me.name}</b>
                <small>{ROLE_LABEL[me.role]}</small>
              </span>
            </div>
          ) : null}
        </div>
      </aside>

      <div className="main">
        <header className="head">
          {back ? (
            <Link href={back.href} className="back-btn">
              <Icon name="back" size={20} />
              <span>{back.label}</span>
            </Link>
          ) : null}
          {cur ? (
            <span className="sec-chip"><Icon name={cur.icon} size={22} /></span>
          ) : null}
          <div className="head-title">
            <h1>{title}</h1>
            {hint ? <p>{hint}</p> : null}
          </div>
          <div className="head-actions">
            {actions}
            <button className="btn ghost theme-btn" onClick={toggleTheme} title={dark ? "Kunduzgi rejim" : "Tungi rejim"} aria-label="Rejimni almashtirish">
              <Icon name={dark ? "sun" : "moon"} size={18} />
            </button>
            {me ? (
              <button className="btn ghost logout-btn" onClick={logout} title="Chiqish" aria-label="Chiqish">
                <Icon name="logout" size={18} />
                <span className="logout-text">Chiqish</span>
              </button>
            ) : null}
          </div>
        </header>
        <main className={"content" + (flush ? " flush" : "")}>{children}</main>
      </div>

      <nav className="tabbar" aria-label="Asosiy menyu">
        {nav.map((n) => (
          <Link key={n.href} href={n.href} className={"tab-item" + (isActive(n.href) ? " active" : "")} style={{ ["--sec" as string]: n.color }}>
            <span className="tab-ico">
              <Icon name={n.icon} size={22} />
              {n.href === "/kassa" && waiting > 0 ? <span className="badge sm">{waiting}</span> : null}
            </span>
            <span>{n.short}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}
