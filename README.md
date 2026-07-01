# Admin Panel — Kiyimlar do'koni

React (Vite) + Tailwind CSS asosida qurilgan admin panel. Backend (`backend-root`) bilan to'liq mos ishlaydi.

## O'rnatish

```bash
npm install
```

## Ishga tushirish

`.env` faylida backend manzili ko'rsatilgan (default: `http://localhost:5000/api`). Backendni avval ishga tushiring, so'ng:

```bash
npm run dev
```

Brauzerda: `http://localhost:5173`

## Birinchi marta kirish

Admin hali yaratilmagan bo'lsa, avval backendda Postman orqali `POST /api/auth/setup` endpointini chaqirib admin yarating (username, password, setupSecret — `.env` dagi `SETUP_SECRET` bilan bir xil bo'lishi kerak). Shundan keyin shu login/parol bilan admin panelga kirasiz.

## Sahifalar

- `/login` — Kirish
- `/` — Umumiy ko'rinish (analytics, grafik, top mahsulotlar)
- `/products/add` — Mahsulot qo'shish (rasm bilan)
- `/products` — Mahsulotlar ro'yxati (tahrirlash / o'chirish)
- `/orders/pending` — Yangi (kutilayotgan) zakazlar — "Bajarildi" bosilsa mijozga Telegram orqali xabar boradi
- `/orders/history` — Bajarilgan / bekor qilingan zakazlar tarixi

## Texnologiyalar

React Router, Axios (token avtomatik qo'shiladi va 401 da login sahifasiga chiqaradi), Recharts (grafik), Tailwind (issiq krem + terracotta "atelye" uslubi).
