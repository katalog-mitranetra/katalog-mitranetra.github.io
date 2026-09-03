# Katalog Digital Talking Book (KDTB) — Fase 1 & Fase 2

- Fase 1: **Login → Dashboard → Data DTB (CRUD)**
- Fase 2: **Data Anggota (CRUD) → Peminjaman (cari anggota, cari buku + entri manual, keranjang, simpan transaksi, riwayat + ubah status)**

sesuai SRS.

## 1. Setup Backend (Google Apps Script + Sheets)

1. Buat Google Sheet baru, misalnya beri nama `DB_KDTB`.
2. Buka **Extensions > Apps Script**.
3. Hapus isi `Code.gs` bawaan, lalu buat 11 file `.gs` berikut (nama file harus sama persis) dan salin isinya dari folder `apps-script/` di paket ini:
   - `Config.gs`
   - `Utils.gs`
   - `Validation.gs`
   - `Logger.gs`
   - `Auth.gs`
   - `Books.gs`
   - `Anggota.gs`
   - `MasterData.gs`
   - `Loans.gs`
   - `Dashboard.gs`
   - `Code.gs`
4. Di dropdown fungsi (samping tombol Run/Debug), pilih `setupSheets`, lalu klik **Run**.
   - Ini akan membuat seluruh sheet (`ANGGOTA`, `BUKU_DTB`, `AKUN`, `PEMINJAMAN`, dll.) beserta header kolomnya.
   - Akan dibuat 1 akun admin default: **username `admin`, password `admin123`**. **Segera ganti password ini** setelah login pertama (fitur ganti password akan ditambahkan di Fase Sistem/Akun).
   - Saat pertama Run, Google akan meminta otorisasi izin akses Spreadsheet — setujui.
5. Klik **Deploy > New deployment**.
   - Type: **Web app**
   - Execute as: **Me**
   - Who has access: **Anyone**
   - Klik **Deploy**, lalu salin URL yang diakhiri `/exec`.

## 2. Hubungkan Frontend ke Backend

Buka `assets/js/api.js`, ganti baris:

```js
const SCRIPT_URL = 'https://script.google.com/macros/s/GANTI_DENGAN_DEPLOYMENT_ID/exec';
```

dengan URL Web App hasil deploy di atas.

## 3. Jalankan / Deploy Frontend

- **Lokal:** buka `login.html` langsung di browser, atau jalankan lewat server statis lokal (mis. ekstensi Live Server) agar path relatif berjalan normal.
- **GitHub Pages:** push seluruh folder `katalog-dtb/` ke repo GitHub, aktifkan GitHub Pages dari branch tersebut, akses `https://<username>.github.io/<repo>/login.html`.

## 4. Struktur Folder

```
katalog-dtb/
├── index.html          # redirect otomatis ke login/dashboard
├── login.html
├── dashboard.html
├── pages/
│   ├── books.html        # Data DTB (CRUD)
│   ├── members.html      # Data Anggota (CRUD)
│   └── loans.html        # Peminjaman (transaksi + riwayat)
├── assets/
│   ├── css/
│   │   ├── app.css
│   │   ├── accessibility.css
│   │   └── dark-mode.css
│   └── js/
│       ├── api.js        # wrapper fetch ke Apps Script
│       ├── auth.js        # login/logout/session
│       ├── accessibility.js  # dark mode, ukuran font, kontras tinggi
│       ├── app.js          # shell: sidebar, header, kontrol aksesibilitas
│       ├── dashboard.js
│       ├── books.js
│       ├── members.js
│       └── loans.js
└── apps-script/
    ├── Config.gs
    ├── Utils.gs
    ├── Validation.gs
    ├── Logger.gs
    ├── Auth.gs
    ├── Books.gs
    ├── Anggota.gs
    ├── MasterData.gs
    ├── Loans.gs
    ├── Dashboard.gs
    └── Code.gs            # doGet/doPost router + setupSheets()
```

## 5. Yang Sudah Jalan di Fase 1

- Login dengan sesi berbasis token (disimpan di sheet `SESSIONS`, kedaluwarsa 8 jam).
- Dashboard: total judul, total anggota, produksi tahun ini, total jam baca, top 10 penulis/pembaca/jam baca (Chart.js).
- Data DTB: tambah, ubah, hapus (soft delete via kolom Status), detail, live search + auto-suggest per field, tabel responsif (jadi kartu di mobile).
- Aksesibilitas: dark/light mode, ukuran font 100–200%, pilihan Atkinson Hyperlegible/Arial/Verdana, mode kontras tinggi, skip-link, fokus keyboard terlihat jelas, seluruh ikon aksi punya `aria-label`. Semua preferensi tersimpan di `localStorage`.

## 6. Yang Sudah Jalan di Fase 2

- Data Anggota: tambah, ubah, "nonaktifkan" (soft delete via Status = Tidak Aktif), detail, cari (Nama/No. Anggota/Telepon/Pekerjaan).
- Peminjaman: pilih tanggal & jenis (dropdown diambil dari sheet `MASTER_JENIS`), cari & pilih anggota (live search), cari judul dari katalog Data DTB dan tambahkan ke keranjang, atau tambahkan **judul manual** (untuk EPub/Braille/format lain yang belum ada di katalog) dengan opsi "Simpan juga sebagai master buku".
- Simpan transaksi membuat 1 baris di `PEMINJAMAN` + N baris di `PEMINJAMAN_DETAIL` (kolom `Sumber` menandai `Katalog` atau `Manual`).
- Riwayat Peminjaman: daftar transaksi, filter status, cari nama anggota/nomor peminjaman, ubah status langsung dari tabel (Draft/Menunggu/Diproses/Dikirim/Selesai/Dibatalkan), dan detail per transaksi.

## 7. Belum Dikerjakan (Fase 3+)

Pesanan + kirim WhatsApp ke operator, Produksi DTB, Akun (ganti password dari UI), Pengaturan, Log Aktivitas viewer, backup otomatis — menyusul sesuai urutan fase pada SRS.

## 8. Catatan Keamanan

Password di-hash SHA-256 sebelum disimpan (tidak plain text). Tetap disarankan menambahkan salt per-user pada iterasi berikutnya untuk pertahanan lebih baik terhadap rainbow table.
