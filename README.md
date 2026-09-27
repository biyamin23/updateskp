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
- Local demo mode jika Supabase belum dikonfigurasi
- Shared mode menggunakan Supabase

## Setup

```bash
npm install
npm run dev
```

### Supabase

1. Create project di Supabase.
2. Buka **SQL Editor** dan run `supabase/schema.sql`.
3. Copy `.env.example` ke `.env.local`.
4. Isi:

```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

5. Restart `npm run dev`.

Tanpa env Supabase, app masih boleh digunakan sebagai demo tetapi data hanya tersimpan di browser (localStorage).

## Import data

Pada **Admin → Import fail semakan**, upload fail Excel yang mengandungi sheet **Perlu Keputusan** dengan column:

- No. Maktab
- Nama Pelajar
- SKP
- Jawatan Semasa (CR)
- Pilihan Jawatan Rasmi 2026
- Keputusan Biyamin (optional)

Selepas import, guru boleh masuk ke SKP masing-masing dan memilih jawatan daripada dropdown.

## Deploy Vercel

Import repo ini di Vercel dan tambah Environment Variables:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Framework preset: **Vite**.

## Nota keselamatan

Schema MVP membenarkan akses anon read/insert/update supaya portal dalaman boleh digunakan cepat. Untuk deployment jangka panjang, tambah login guru/PIN dan RLS mengikut SKP.
