# Oshxona CRM — Barakat (Kyiv, o'zbek oshxonasi)

Next.js 15 + React 19 + TypeScript. POS/CRM kafe uchun. Foydalanuvchi o'zbek tilida gaplashadi, **Windows PowerShell** ishlatadi (cmd emas).

## Tillar
- Xodimlar interfeysi: o'zbekcha (lotin).
- Mijozlar sahifalari (/, /katalog, /qongiroq) va menyu: ukrain/rus (`lib/pubtext.ts`).

## Oqim
AI operator (telefon/ovoz) → kassa (tasdiq) → oshxona faqat chek printeri (ekransiz).
Holatlar: draft → waiting_cashier → kitchen → ready → paid / canceled. Manba: pos, ai, operator, online.

## Muhim fayllar
- `lib/store.ts` — holat (Neon `kv` jadvali, DATABASE_URL yo'q bo'lsa xotira), `lib/seed.ts` — demo menyu/sozlamalar.
- `lib/auth.ts`, `lib/access.ts` — login (scrypt + HMAC cookie), rollar: admin/cashier/waiter/cook.
- `app/kassa`, `app/kitchen`, `app/print/[id]`, `lib/printjob.ts` — chek chiqarish (iframe + window.print, `printedAt` bilan dedupe; printer "oshxonada" yoki "shu kompyuterda").
- Chek rasm (canvas) qilib chiqadi: `lib/receiptimg.ts`, `components/Slip.tsx` — termoprinter drayveri matnni xitoycha kod sahifasida buzgani uchun. `?text=1` eski matn rejimi.
- Printer holati: `app/api/printer/heartbeat`, `components/PrinterStatus.tsx` (printer ulangan kompyuter 15 s da signal yuboradi).
- `app/qongiroq`, `app/api/public/*`, `app/api/voice/*`, `lib/voice.ts` — AI qo'ng'iroq (ElevenLabs agent yoki brauzer Web Speech + Claude).
- `app/admin` — menyu, stollar, xodimlar, sozlamalar, "Telefon AI" yo'riqnomasi.

## ENV
DATABASE_URL, ANTHROPIC_API_KEY, ADMIN_PASSWORD, ELEVENLABS_AGENT_ID, ELEVENLABS_API_KEY, VOICE_API_KEY (>=16), ELEVENLABS_WEBHOOK_SECRET.

## Tekshirilmagan
Haqiqiy ElevenLabs akkaunt, o'zbek tili sifati, haqiqiy termoprinterda chop etish.

## Buyruqlar
`npm run dev` (3000), `npx tsc --noEmit`, `npm run build`. Birinchi ishga tushirishda /login da admin parol o'rnatiladi.
