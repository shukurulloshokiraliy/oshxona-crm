import { NextResponse } from "next/server";
import { readState } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET() {
  const s = await readState();
  return NextResponse.json({
    cafeName: s.settings.cafeName,
    currency: s.settings.currency,
    greeting: s.settings.aiGreeting,
    voiceLang: s.settings.aiVoiceLang,
    aiEnabled: s.settings.aiEnabled,
    categories: [...s.categories].sort((a, b) => a.sort - b.sort),
    products: s.products.filter((p) => p.active),
    about: s.settings.aboutText,
    branches: s.settings.branchesText,
    instagram: s.settings.instagram,
    tables: s.tables.map((t) => ({ id: t.id, name: t.name })),
  });
}
