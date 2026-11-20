/* =========================================================
   config.js — pengaturan & data statis aplikasi
   Semua modul lain memakai namespace global `MB`.
   ========================================================= */
window.MB = window.MB || {};

MB.CONFIG = {
  BOSS_REQUIRED_MISSIONS: 5, // jumlah misi (dari Misi 1–5) yang harus selesai agar Boss terbuka
  POINTS_PER_TASK: 20, // poin maksimal tiap misi / soal cerita
  POINTS_PER_BOSS_STAGE: 15, // poin maksimal tiap level boss

  // Sistem penalti: tiap jawaban salah memotong poin yang bisa didapat dari misi/level itu.
  PENALTY_PER_WRONG: 5,
  MIN_TASK_POINTS: 5, // sekeras apa pun salahnya, misi yang tuntas tetap memberi minimal ini
  MIN_BOSS_STAGE_POINTS: 5,

  // Tutor AI: alamat endpoint server (lihat server.js). Kosongkan untuk mematikan fitur online.
  AI_ENDPOINT: "/api/chat",
  BOSS_LIVES: 3,
  BOSS_HINTS: 2,
  PASSWORD_MIN: 4,

  // Ingin memakai lagu sendiri? Taruh file di assets/audio/ lalu isi path-nya di sini.
  // Contoh: chill: "assets/audio/chill.mp3". Jika null, musik dibuat otomatis oleh browser.
  BGM_FILES: { chill: null, boss: null },
};

MB.MISSIONS = ["misi1", "misi2", "misi3", "misi4", "misi5"];
MB.TASKS = [...MB.MISSIONS, "story"];
MB.BOSS_STAGES = 5;
MB.MAX_SCORE = MB.TASKS.length * MB.CONFIG.POINTS_PER_TASK + MB.BOSS_STAGES * MB.CONFIG.POINTS_PER_BOSS_STAGE;

/* Data kartu di peta misi */
MB.MISSION_META = [
  {
    id: "misi1",
    tag: "Misi 1",
    color: "#8b6cff",
    icon: "fa-shapes",
    title: "Kenali Balok",
    sub: "Sisi, Rusuk, Titik Sudut & Diagonal",
    desc: "Jelajahi balok 3D secara langsung. Sentuh dan kenali apa yang membedakan rusuk dengan diagonal!",
    cta: "Buka Lab 3D",
  },
  {
    id: "misi2",
    tag: "Misi 2",
    color: "#a78bfa",
    icon: "fa-box-open",
    title: "Bongkar Balok",
    sub: "Jaring-Jaring & Visualisasi Lipatan",
    desc: "Geser slider untuk membuka balok menjadi bidang datar, lalu uji kejelianmu memilih jaring-jaring yang benar.",
    cta: "Bongkar Sekarang",
  },
  {
    id: "misi3",
    tag: "Misi 3",
    color: "#60a5fa",
    icon: "fa-calculator",
    title: "Math Lab: Volume",
    sub: "Konsep Ruang & Kubus Satuan",
    desc: "Ubah p, l, dan t sesukamu dan lihat kubus satuan yang mengisi balok. Pahami perkalian langkah demi langkah.",
    cta: "Masuk Math Lab",
  },
  {
    id: "misi4",
    tag: "Misi 4",
    color: "#fbbf24",
    icon: "fa-layer-group",
    title: "Bedah Luas Permukaan",
    sub: "Kenapa Rumusnya 2(pl + pt + lt)?",
    desc: "Temukan 3 pasang sisi yang kongruen lewat sorotan warna agar rumus ini menempel selamanya.",
    cta: "Bedah Sisi Balok",
  },
  {
    id: "misi5",
    tag: "Misi 5",
    color: "#fb7185",
    icon: "fa-ruler-combined",
    title: "Diagonal Challenge",
    sub: "Diagonal Bidang vs Diagonal Ruang",
    desc: "Tembus bagian dalam balok dengan Pythagoras 3D. Ikuti alurnya bertahap tanpa takut salah langkah.",
    cta: "Tantang Diagonal",
  },
  {
    id: "story",
    tag: "Spesial",
    color: "#34d399",
    icon: "fa-highlighter",
    title: "Detektif Soal Cerita",
    sub: "Tandai Kata Kunci & Angka Penting",
    desc: "Sering bingung apa yang ditanyakan di soal cerita? Pakai stabilo cerdas untuk membedah soal nyata!",
    cta: "Mulai Deteksi",
  },
];

/* Pendaftaran penangan klik (data-action) & hook saat layar dibuka */
MB.actions = {};
MB.onEnter = {};
