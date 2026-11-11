"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { Logo } from "@/components/Logo";
import { T, type PubLang } from "@/lib/pubtext";

export default function PublicShell({
  name,
  lang,
  setLang,
  instagram,
  children,
}: {
  name: string;
  lang: PubLang;
  setLang: (l: PubLang) => void;
  instagram?: string;
  children: ReactNode;
}) {
  const t = T[lang];
  return (
    <div className="pub">
      <header className="pub-top">
        <div className="pub-top-in">
          <Link href="/" className="pub-brand" aria-label={name}>
            <Logo size={44} />
            <span className="pub-name">{name}</span>
          </Link>
          <nav className="pub-nav" aria-label="Menu">
            <Link href="/katalog">{t.menu}</Link>
            <Link href="/#branches">{t.branches}</Link>
            <Link href="/qongiroq">{t.call}</Link>
          </nav>
          <div className="lang-sw" role="group" aria-label="Language">
            <button className={lang === "uk" ? "on" : ""} onClick={() => setLang("uk")}>UA</button>
            <button className={lang === "ru" ? "on" : ""} onClick={() => setLang("ru")}>RU</button>
            <button className={lang === "uz" ? "on" : ""} onClick={() => setLang("uz")}>UZ</button>
          </div>
        </div>
      </header>
      {children}
      <footer className="pub-foot">
        <div className="pub-foot-in">
          <Logo size={40} />
          <div>
            <b>{name}</b>
            <div>{t.footer}</div>
          </div>
          {instagram ? (
            <a href={`https://www.instagram.com/${instagram}/`} target="_blank" rel="noreferrer" className="foot-link">
              Instagram @{instagram}
            </a>
          ) : null}
          <Link href="/login" className="foot-link staff">Staff</Link>
        </div>
      </footer>
    </div>
  );
}
