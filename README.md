# MISI BALOK

Media belajar interaktif geometri balok untuk Matematika SMP kelas VIII.

## Cara menjalankan
Butuh internet (Three.js, font, dan ikon dimuat dari CDN). Ada dua cara:

1. **Tanpa AI**: buka `index.html` langsung di browser. Semua fitur jalan, tutor memakai kalkulator offline.
2. **Dengan Tutor AI**: `ANTHROPIC_API_KEY=sk-ant-... node server.js` (Node 18+), lalu buka http://localhost:3000.

## Struktur folder
```
misi-balok/
├── index.html          kerangka halaman (hanya markup)
├── server.js           server kecil: file statis + proxy Tutor AI (API key hanya di sini)
├── package.json
├── css/
│   ├── base.css        variabel tema, reset, latar belakang
│   ├── components.css  tombol, kartu, form, modal, toast
│   ├── pages.css       login, hub, laboratorium misi, boss, hasil
│   └── tutor.css       panel chat Tutor AI
├── js/                 (urutan dimuat: atas ke bawah)
│   ├── config.js       pengaturan & data misi
│   ├── storage.js      akun, progres, skor, aturan unlock
│   ├── audio.js        musik latar & efek suara
│   ├── ui.js           navigasi, toast, modal, header, peringkat
│   ├── three-scenes.js semua adegan 3D
│   ├── missions.js     Misi 1–5 + Detektif Soal Cerita
│   ├── boss.js         Boss Level + layar hasil
│   ├── auth.js         daftar / masuk / tamu / keluar
│   ├── tutor.js        Tutor AI (chat) + kalkulator offline
│   └── app.js          titik masuk & event global
└── assets/
    └── favicon.svg     (taruh lagu sendiri di assets/audio/)
```

## Aturan Boss Level & poin
- Boss terbuka setelah **kelima misi (1–5)** selesai. Detektif Soal Cerita tidak wajib. Ubah di `config.js` → `BOSS_REQUIRED_MISSIONS`.
- Pagar ada di dua tempat: tampilan kartu dan fungsi `MB.ui.navigate`, jadi tidak bisa dibuka lewat klik.
- **Poin misi**: maksimal 20. Tiap jawaban salah **−5**, minimal tersisa 5 bila misi akhirnya tuntas. Pill di kepala tiap misi menunjukkan poin yang masih bisa didapat.
- **Poin Boss**: maksimal 15 per level, tiap salah −5 (minimal 5). Boss juga punya 3 nyawa.
- Semua angka bisa diubah di `config.js` (`PENALTY_PER_WRONG`, `MIN_TASK_POINTS`, dst.).

## Login & penyimpanan
Akun dan progres disimpan di `localStorage` browser, per nama pengguna. Kata sandi di-hash (PBKDF2-SHA256 + salt).
Batasannya: data hanya ada di browser/perangkat tersebut. Pindah HP/laptop atau hapus data browser = akun hilang.
Untuk login lintas perangkat, perlu backend (mis. Firebase atau Supabase), cukup mengganti isi `storage.js` dan `auth.js`.

## Musik
Musik dibuat langsung oleh browser (Web Audio), jadi tidak ada file lagu dan bebas hak cipta.
Klik ikon musik di header untuk memilih **5 lagu belajar**: Santai Pagi, Lo-fi Malam, Petualangan, Kosmik, Arcade 8-bit.
Lagu keenam, **Golem Balok**, otomatis menyala saat Boss Level. Pilihan lagu dan volume tersimpan.
Ingin lagu sendiri? Taruh mp3 di `assets/audio/` lalu isi `BGM_FILES` di `js/config.js`.

## Tutor AI
Tombol "Tanya Tutor" di pojok kanan bawah. Pertanyaan dikirim ke `/api/chat` (server.js), yang meneruskannya ke Claude API
dengan instruksi sebagai tutor balok: hanya membahas balok, membimbing dengan pertanyaan balik, dan tidak langsung
membocorkan jawaban soal di misi/Boss.
- Model default `claude-haiku-5-5`; ganti dengan env `ANTHROPIC_MODEL`.
- Batas 20 pertanyaan/menit per IP dan 1.200 karakter/pesan untuk menjaga biaya.
- Tanpa server atau tanpa API key, tutor otomatis jatuh ke **mode kalkulator offline** (bukan AI): menghitung volume, luas, dan diagonal dari angka yang diketik.
- Penting: jangan menaruh API key di file JS browser. Selalu lewat server.js.
