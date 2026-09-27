# Update SKP 2026

Portal web untuk guru penasihat mengemaskini penjawatan Sekretariat Kepimpinan Pelajar (SKP) mengikut Perlembagaan SKP 2026.

## MVP

- Dashboard semua SKP + progress keseluruhan
- Senarai pelajar mengikut SKP
- Dropdown jawatan rasmi 2026 sahaja
- Autosave
- Progress bar/donut
- Admin import fail Excel semakan
- Admin export keputusan
- Local demo mode jika Firebase belum dikonfigurasi
- Shared mode menggunakan Firebase Cloud Firestore

## Setup lokal

```bash
npm install
npm run dev
```

Copy `.env.example` kepada `.env.local` dan isi Firebase Web App config.

## Firebase

1. Firebase Console → Databases and storage → Firestore Database → Create database.
2. Gunakan collection `role_updates`.
3. Deploy rules dalam `firestore.rules`, atau paste rules itu di Firestore → Rules.
4. Isi environment variables Firebase di Vercel.

## Import data

Admin → Import fail Excel semakan. App membaca sheet **Perlu Keputusan** dan column:

- No. Maktab
- Nama Pelajar
- SKP
- Jawatan Semasa (CR)
- Pilihan Jawatan Rasmi 2026
- Keputusan Biyamin (optional)

Semua keputusan guru disimpan ke collection `role_updates`.

## Deploy Vercel

Import repo ini di Vercel.

Build command: `npm run build`
Output directory: `dist`

Tambah Environment Variables:

- VITE_FIREBASE_API_KEY
- VITE_FIREBASE_AUTH_DOMAIN
- VITE_FIREBASE_PROJECT_ID
- VITE_FIREBASE_STORAGE_BUCKET
- VITE_FIREBASE_MESSAGING_SENDER_ID
- VITE_FIREBASE_APP_ID
- VITE_FIREBASE_MEASUREMENT_ID

## Nota keselamatan

Rules MVP membenarkan read/create/update tanpa login supaya guru boleh terus menggunakan portal. Ini sesuai untuk portal dalaman sementara. Selepas MVP stabil, tambah Firebase Authentication atau PIN per SKP dan ketatkan Firestore Rules.
