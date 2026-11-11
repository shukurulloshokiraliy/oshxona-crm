"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Icon } from "@/components/Icons";
import { Logo } from "@/components/Logo";
import PublicShell from "@/components/PublicShell";
import { money, parseBranches, telHref } from "@/lib/format";
import { T, usePubLang } from "@/lib/pubtext";
import type { Category, Product } from "@/lib/types";

interface Info {
  cafeName: string;
  currency: string;
  about: string;
  branches: string;
  instagram: string;
  categories: Category[];
  products: Product[];
}

export default function Home() {
  const [lang, setLang] = usePubLang();
  const [info, setInfo] = useState<Info | null>(null);
  const t = T[lang];

  useEffect(() => {
    fetch("/api/public/catalog", { cache: "no-store" })
      .then((r) => r.json())
      .then(setInfo)
      .catch(() => {});
  }, []);

  const branches = parseBranches(info?.branches || "");
  const name = info?.cafeName || "Barakat";
  const priceOf = (key: string) => {
    const p = info?.products.filter((x) => x.active && x.name.toLowerCase().includes(key)).sort((a, b) => a.price - b.price)[0];
    return p ? `${t.from} ${money(p.price, info?.currency)}` : "";
  };
  const dishColors = ["#d9812c", "#c0392b", "#b8863b", "#a8456b"];

  return (
    <PublicShell name={name} lang={lang} setLang={setLang} instagram={info?.instagram}>
      <section className="hero2">
        <div className="hero2-ornament" aria-hidden />
        <div className="hero2-in">
          <div className="hero2-text">
            <span className="hero2-tag">{t.footer} · Київ</span>
            <h1>{t.heroTitle}</h1>
            <p>{info?.about || ""}</p>
            <div className="hero2-cta">
              <Link href="/katalog" className="btn lg white"><Icon name="list" size={22} /> {t.heroMenu}</Link>
              {branches[0]?.phone ? (
                <a href={telHref(branches[0].phone)} className="btn lg outline-w"><Icon name="phone" size={22} /> {t.heroCall}</a>
              ) : null}
              <Link href="/qongiroq" className="btn lg outline-w"><Icon name="mic" size={22} /> {t.heroAi}</Link>
            </div>
            <ul className="hero2-facts">
              {t.facts.map((f) => (
                <li key={f}><Icon name="check" size={18} /> {f}</li>
              ))}
            </ul>
          </div>
          <div className="hero2-logo" aria-hidden><Logo size={300} /></div>
        </div>
      </section>

      <section className="sec">
        <h2 className="sec-title">{t.dishesTitle}</h2>
        <div className="dish-row">
          {t.dishes.map((d, i) => (
            <Link href="/katalog" key={d.k} className="sig" style={{ ["--c" as string]: dishColors[i] }}>
              <span className="sig-ico"><Icon name={i === 2 ? "cake" : i === 3 ? "utensils" : "chef"} size={34} /></span>
              <h3>{d.t}</h3>
              <p>{d.d}</p>
              <span className="sig-price">{priceOf(d.k)}</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="sec alt">
        <div className="sec-in">
          <div className="sec-head">
            <h2 className="sec-title" style={{ margin: 0 }}>{t.menuTitle}</h2>
            <Link href="/katalog" className="btn primary">{t.fullMenu} <Icon name="forward" size={18} /></Link>
          </div>
          <div className="menu-prev">
            {(info?.categories || []).map((c) => (
              <div key={c.id} className="mp-col" style={{ ["--c" as string]: c.color }}>
                <h3><Icon name={c.icon} size={22} /> {c.name}</h3>
                {(info?.products || []).filter((p) => p.categoryId === c.id && p.active).slice(0, 5).map((p) => (
                  <div className="mp-row" key={p.id}>
                    <span>{p.name}</span>
                    <i />
                    <b>{money(p.price)} {info?.currency}</b>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="sec" id="branches">
        <h2 className="sec-title">{t.branchesTitle}</h2>
        <div className="branch-row">
          {branches.map((b) => (
            <div className="branch" key={b.address}>
              <span className="branch-ico"><Icon name="pin" size={26} /></span>
              <h3>{b.address}</h3>
              {b.hours ? <div className="branch-line"><Icon name="clock" size={18} /> {b.hours}</div> : null}
              {b.phone ? <div className="branch-line"><Icon name="phone" size={18} /> {b.phone}</div> : null}
              <div className="branch-btns">
                {b.phone ? <a className="btn primary" href={telHref(b.phone)}><Icon name="phone" size={18} /> {t.callBranch}</a> : null}
                <a className="btn" target="_blank" rel="noreferrer" href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name + " " + b.address + " Київ")}`}>
                  <Icon name="pin" size={18} /> {t.route}
                </a>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="sec alt">
        <div className="sec-in">
          <h2 className="sec-title">{t.howTitle}</h2>
          <div className="how-row">
            {t.how.map((h, i) => (
              <div className="how" key={h.t}>
                <span className="how-n">{i + 1}</span>
                <h3>{h.t}</h3>
                <p>{h.d}</p>
              </div>
            ))}
          </div>
          <div style={{ textAlign: "center", marginTop: 26 }}>
            <Link href="/qongiroq" className="btn primary lg"><Icon name="mic" size={22} /> {t.heroAi}</Link>
          </div>
        </div>
      </section>
    </PublicShell>
  );
}
