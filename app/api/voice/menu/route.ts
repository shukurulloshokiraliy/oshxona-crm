import { NextResponse } from "next/server";
import { readState } from "@/lib/store";
import { checkVoiceKey } from "@/lib/voice";
import { parseBranches } from "@/lib/format";

export const dynamic = "force-dynamic";

/** AI agent uchun menyu va kafe ma'lumoti (ElevenLabs "get_menu" tool). */
export async function GET(req: Request) {
  const denied = checkVoiceKey(req);
  if (denied) return denied;
  const s = await readState();
  const cats = [...s.categories].sort((a, b) => a.sort - b.sort);
  return NextResponse.json({
    cafe: s.settings.cafeName,
    currency: s.settings.currency,
    about: s.settings.aboutText,
    branches: parseBranches(s.settings.branchesText),
    menu: cats.map((c) => ({
      category: c.name,
      items: s.products
        .filter((p) => p.active && p.categoryId === c.id)
        .map((p) => ({ name: p.name, price: p.price, unit: p.unit })),
    })),
  });
}
