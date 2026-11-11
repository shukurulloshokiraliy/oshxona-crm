/**
 * Chekni rasm (canvas) qilib chizadi. Termoprinter drayveri matnni o'z shriftida
 * (ko'pincha xitoycha kod sahifasida) chiqarib, kirill harflarni buzadi.
 * Rasm esa printerga aynan ko'ringanidek boradi.
 */
export type RLine =
  | { t: "text"; text: string; align?: "l" | "c" | "r"; size?: number; bold?: boolean }
  | { t: "row"; left: string; right: string; size?: number; bold?: boolean }
  | { t: "hr" }
  | { t: "gap"; h?: number }
  | { t: "logo"; size?: number };

const FONT = '"Segoe UI", Arial, "Helvetica Neue", sans-serif';

function wrap(ctx: CanvasRenderingContext2D, text: string, max: number): string[] {
  const out: string[] = [];
  for (const para of text.split("\n")) {
    let cur = "";
    for (const w of para.split(" ")) {
      const test = cur ? cur + " " + w : w;
      if (ctx.measureText(test).width <= max || !cur) cur = test;
      else {
        out.push(cur);
        cur = w;
      }
    }
    out.push(cur);
  }
  return out;
}

export async function renderReceipt(lines: RLine[], widthPx: number, logoSrc = "/logo-bw.png"): Promise<string> {
  const k = widthPx / 576;
  const pad = Math.round(8 * k);
  const inner = widthPx - pad * 2;
  try {
    await document.fonts?.ready;
  } catch {}
  let logo: HTMLImageElement | null = null;
  if (lines.some((l) => l.t === "logo")) {
    logo = await new Promise((res) => {
      const i = new Image();
      i.onload = () => res(i);
      i.onerror = () => res(null);
      i.src = logoSrc;
    });
  }
  const c = document.createElement("canvas");
  c.width = widthPx;
  c.height = 4000;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.fillStyle = "#000";
  ctx.textBaseline = "top";

  let y = pad;
  const setFont = (size: number, bold?: boolean) => {
    ctx.font = `${bold ? "700" : "500"} ${Math.round(size * k)}px ${FONT}`;
  };
  for (const l of lines) {
    if (l.t === "gap") y += Math.round((l.h || 10) * k);
    else if (l.t === "hr") {
      y += Math.round(6 * k);
      ctx.fillRect(pad, y, inner, Math.max(2, Math.round(2 * k)));
      y += Math.round(10 * k);
    } else if (l.t === "logo") {
      if (logo) {
        const s = Math.round((l.size || 220) * k);
        ctx.drawImage(logo, (widthPx - s) / 2, y, s, s);
        y += s + Math.round(8 * k);
      }
    } else if (l.t === "text") {
      const size = l.size || 26;
      setFont(size, l.bold);
      const lh = Math.round(size * k * 1.25);
      for (const part of wrap(ctx, l.text, inner)) {
        const w = ctx.measureText(part).width;
        const x = l.align === "c" ? (widthPx - w) / 2 : l.align === "r" ? widthPx - pad - w : pad;
        ctx.fillText(part, x, y);
        y += lh;
      }
    } else if (l.t === "row") {
      const size = l.size || 26;
      setFont(size, l.bold);
      const lh = Math.round(size * k * 1.25);
      const rw = ctx.measureText(l.right).width;
      const parts = wrap(ctx, l.left, inner - rw - Math.round(12 * k));
      parts.forEach((p, i) => {
        ctx.fillText(p, pad, y);
        if (i === 0) ctx.fillText(l.right, widthPx - pad - rw, y);
        y += lh;
      });
    }
  }
  y += Math.round(24 * k);
  // Kesilgan balandlik + qora-oq (aniq) qilish
  const h = Math.min(y, c.height);
  const img = ctx.getImageData(0, 0, widthPx, h);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const v = d[i] * 0.3 + d[i + 1] * 0.59 + d[i + 2] * 0.11 < 150 ? 0 : 255;
    d[i] = d[i + 1] = d[i + 2] = v;
    d[i + 3] = 255;
  }
  const out = document.createElement("canvas");
  out.width = widthPx;
  out.height = h;
  out.getContext("2d")!.putImageData(img, 0, 0);
  return out.toDataURL("image/png");
}
