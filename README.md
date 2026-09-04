# Katalog Digital Talking Book (KDTB) — Fase 1–5 + Peningkatan Tabel & Aksesibilitas

- Fase 1: **Login → Dashboard → Data DTB (CRUD)**
- Fase 2: **Data Anggota (CRUD) → Peminjaman (cari anggota, cari buku + entri manual, keranjang, simpan transaksi, riwayat + ubah status)**
- Fase 3: **Pesanan → Kirim ke Operator via WhatsApp**
- Fase 4: **Statistik lanjutan — grafik Peminjaman + Produksi gabungan per bulan, dengan dropdown Tahun**
- Fase 5: **Produksi DTB — form produksi terpisah + alur status (Antrian→Rekaman→Editing→Proofreading→Selesai→Publish), tersinkron otomatis ke Data DTB**
- Peningkatan lanjutan: **Pagination + sorting di semua tabel, perbaikan bug Ukuran Font, dan modal HTML pengganti alert/confirm bawaan browser**

sesuai SRS.

## 1. Setup Backend (Google Apps Script + Sheets)

1. Buat Google Sheet baru, misalnya beri nama `DB_KDTB`.
2. Buka **Extensions > Apps Script**.
3. Hapus isi `Code.gs` bawaan, lalu buat 13 file `.gs` berikut (nama file harus sama persis) dan salin isinya dari folder `apps-script/` di paket ini:
   - `Config.gs`
   - `Utils.gs`
   - `Validation.gs`
   - `Logger.gs`
   - `Auth.gs`
   - `Books.gs`
   - `Anggota.gs`
   - `MasterData.gs`
   - `Settings.gs`
   - `Loans.gs`
   - `Production.gs`
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
│   ├── loans.html        # Peminjaman (transaksi + riwayat)
│   ├── orders.html       # Pesanan (kirim ke operator via WhatsApp)
│   └── production.html   # Produksi DTB (alur status + sinkron ke Data DTB)
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
│       ├── loans.js
│       ├── orders.js
│       ├── production.js
│       ├── modal.js          # AppModal.alert()/AppModal.confirm() — pengganti alert/confirm native
│       └── table-controls.js # pagination bar + header tabel sortable (dipakai bersama)
└── apps-script/
    ├── Config.gs
    ├── Utils.gs
    ├── Validation.gs
    ├── Logger.gs
    ├── Auth.gs
    ├── Books.gs
    ├── Anggota.gs
    ├── MasterData.gs
    ├── Settings.gs
    ├── Loans.gs
    ├── Production.gs
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

## 7. Yang Sudah Jalan di Fase 3

- Halaman **Pesanan**: kartu pesanan (sesuai mockup SRS) dengan filter status (default: Menunggu) dan pencarian.
- **Nomor WhatsApp Operator** disimpan di sheet `SETTING` (key `NOMOR_OPERATOR`), bisa diubah kapan saja dari halaman Pesanan.
- Tombol **Kirim WA** membuka WhatsApp Web/App ke nomor operator dengan pesan otomatis berisi nomor pesanan, tanggal, nama & telepon anggota, daftar buku (judul, penulis, pembaca, alamat file), dan jenis koleksi — persis format template pada SRS.
- Setelah dikirim, status pesanan otomatis berubah dari **Menunggu** menjadi **Dikirim** (masih bisa diubah manual dari halaman Peminjaman jika perlu).
- Nomor telepon (operator maupun anggota) dirapikan otomatis ke format internasional (`08...` → `62...`) sebelum dipakai di link `wa.me`.

## 8. Yang Sudah Jalan di Fase 4

- Dashboard menampilkan kartu grafik **"Peminjaman & Produksi per Bulan"** dengan dropdown Tahun (otomatis terisi dari tahun yang ada pada data Peminjaman & Tanggal Produksi).
- Grafik garis gabungan menunjukkan jumlah Peminjaman dan jumlah buku selesai Produksi per bulan (Jan–Des) untuk tahun terpilih.
- Catatan: angka "Produksi" di grafik ini memakai kolom **Tanggal Produksi** pada Data DTB (bukan sheet `PRODUKSI` yang terpisah), karena modul Produksi DTB dengan alur status (Antrian/Rekaman/Editing/Proofreading/Selesai/Publish) belum dibangun — itu bagian dari fase berikutnya.

## 9. Yang Sudah Jalan di Fase 5

- Halaman **Produksi DTB** terpisah dari Data DTB: form (Judul, Pengarang, Pembaca, Editor, Tanggal Mulai, Tanggal Selesai, Jam Baca, Jam Edit, Status Produksi), daftar dengan filter status, pagination & sorting.
- Alur status: **Antrian → Rekaman → Editing → Proofreading → Selesai → Publish**, bisa diubah cepat langsung dari tabel (dropdown per baris, sama seperti di Peminjaman).
- **Tautan opsional ke Data DTB**: saat menambah/mengubah data produksi, admin bisa mencari & menautkan ke judul yang sudah ada di katalog, atau membiarkannya kosong untuk judul baru.
- **Sinkronisasi otomatis ke Data DTB**: begitu status diubah menjadi **Selesai** atau **Publish**,
  - jika sudah tertaut ke judul yang ada → Tanggal Produksi, Pembaca DTB, Editor DTB, Jam Baca DTB, Jam Edit DTB pada Data DTB ikut diperbarui;
  - jika belum tertaut → judul baru otomatis dibuat di Data DTB, dan tautannya disimpan balik ke record produksi supaya tidak dobel saat status diubah lagi nanti.
  - Jika Tanggal Selesai belum diisi saat status diubah ke Selesai/Publish, sistem otomatis mengisi tanggal hari itu.
- **Statistik Produksi di Dashboard sekarang akurat**: kartu "Produksi Tahun Ini" dan grafik gabungan "Peminjaman & Produksi per Bulan" dihitung dari sheet `PRODUKSI` (kolom Tanggal Selesai, hanya status Selesai/Publish) — bukan lagi dari kolom Tanggal Produksi di Data DTB seperti sebelumnya.

## 10. Peningkatan Tabel & Aksesibilitas (setelah Fase 4)

- **Pagination** ditambahkan ke semua halaman yang punya tabel (Data DTB, Data Anggota, Riwayat Peminjaman): dropdown ukuran halaman (25/50/100/250/500, default **50**) + tombol Sebelumnya/Berikutnya. Halaman Pesanan pakai tampilan kartu (bukan tabel) sehingga tidak diberi pagination, sesuai instruksi.
- **Sorting** — klik judul kolom tabel untuk mengurutkan: kolom teks A-Z/Z-A (locale Indonesia), kolom tanggal terurut kronologis (bukan alfabetis). Ada tanda ▲/▼ di kolom yang sedang aktif diurutkan.
- **Default urutan Data DTB**: Tanggal Produksi, dari **terbaru ke terlama**.
- **Bug ukuran font diperbaiki**: sebelumnya elemen `body` memiliki `font-size: 16px` tetap yang menimpa hasil scaling dari fitur "Ukuran Font" di sidebar, sehingga sebagian teks (yang tidak diberi ukuran `rem` eksplisit) tidak ikut membesar/mengecil. Sekarang `body` mewarisi ukuran dari `html` (yang di-scale oleh `accessibility.css`), sehingga **seluruh teks di halaman ikut ter-skala** saat pengaturan 100–200% diubah.
- **Modal HTML pengganti alert/confirm** — semua `window.alert()` dan `window.confirm()` bawaan browser (yang tampilannya tidak konsisten dan tidak ikut dark mode/kontras tinggi/ukuran font) diganti dengan modal HTML sendiri (`AppModal.alert()` / `AppModal.confirm()`), supaya konfirmasi hapus, notifikasi error, dan pesan sukses semuanya tampil konsisten dengan tema aplikasi dan tetap mengikuti pengaturan aksesibilitas.

## 11. Belum Dikerjakan (Fase 6+)

Akun (ganti password dari UI), Pengaturan (kelola Master Jenis & Operator dari UI, bukan lewat kode), Log Aktivitas viewer, backup otomatis, audit aksesibilitas menyeluruh — menyusul sesuai urutan fase pada SRS.

## 12. Catatan Keamanan

Password di-hash SHA-256 sebelum disimpan (tidak plain text). Tetap disarankan menambahkan salt per-user pada iterasi berikutnya untuk pertahanan lebih baik terhadap rainbow table.
