# Oshxona CRM

Kafe/restoran uchun kassa tizimi: zal, buyurtmalar, kassa tasdig'i, oshxona cheki, mijoz katalogi va AI operator (ovozli qo'ng'iroq + yozuv).

## Ishga tushirish (Windows, cmd)

    npm install
    npm run dev

Brauzerda http://localhost:3000 — birinchi kirishda administrator parolini o'rnatasiz.

## Sahifalar

- `/` — bosh sahifa
- `/katalog` (`?stol=t2`) — mijoz menyusi va buyurtma
- `/qongiroq` — AI operator bilan ovozli qo'ng'iroq
- `/login` — xodimlar kirishi; `/pos`, `/kassa`, `/orders`, `/kitchen`, `/ai`, `/admin` — rolga qarab

## Rollar

admin (hammasi) · cashier (zal, kassa, buyurtmalar, oshxona) · waiter (zal, buyurtma olish) · cook (faqat oshxona cheki)

## Muhit o'zgaruvchilari (.env.local yoki Vercel)

- `DATABASE_URL` — Neon Postgres (yo'q bo'lsa ma'lumot vaqtinchalik xotirada)
- `ANTHROPIC_API_KEY` — AI operator uchun Claude (yo'q bo'lsa oddiy rejim)
- `ANTHROPIC_MODEL` — ixtiyoriy, standart `claude-haiku-4-5`
- `ADMIN_PASSWORD` — ixtiyoriy, kamida 8 belgi: birinchi adminga parol qo'yadi
- `PUBLIC_AI_DAILY_CAP` — ixtiyoriy, kuniga Claude chaqiruvlari limiti (standart 400)
