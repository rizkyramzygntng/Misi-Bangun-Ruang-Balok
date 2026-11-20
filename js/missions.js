/* =========================================================
   missions.js — logika Misi 1–5 dan Detektif Soal Cerita
   ========================================================= */
(function () {
  const A = MB.actions;
  const $ = MB.ui.$;
  const fb = MB.ui.feedback;
  const show = (id) => $(id).classList.remove("hidden");
  const hide = (id) => $(id).classList.add("hidden");
  const num = (id) => parseInt($(id).value, 10);

  /* tombol "lanjut" muncul bila misi sudah selesai */
  function revealNextIfDone(misi, btnId) {
    if (MB.state.data.progress[misi]) show(btnId);
    else hide(btnId);
  }

  /* =========================================================
     MISI 1 — Kenali Balok
     ========================================================= */
  const M1_INFO = {
    sisi: {
      icon: "fa-shapes",
      title: "SISI BALOK",
      desc: "Permukaan datar yang membatasi balok. Ada <strong>6 sisi</strong> berbentuk persegi panjang, terbagi dalam 3 pasang sisi yang berhadapan dan berukuran sama (kongruen).",
      extra: "<span>3 pasang sisi kongruen</span><b>Alas–Tutup · Depan–Belakang · Kiri–Kanan</b>",
    },
    rusuk: {
      icon: "fa-grip-lines",
      title: "RUSUK BALOK",
      desc: "Garis lurus tempat dua sisi bertemu. Ada <strong>12 rusuk</strong>: 4 rusuk panjang (p), 4 rusuk lebar (l), dan 4 rusuk tinggi (t).",
      extra: "<span>Kuning = p · Hijau = l · Pink = t</span><b>4p + 4l + 4t = 12</b>",
    },
    sudut: {
      icon: "fa-location-dot",
      title: "TITIK SUDUT",
      desc: "Titik tempat tiga rusuk bertemu dan membentuk sudut siku-siku (90°). Balok memiliki <strong>8 titik sudut</strong>.",
      extra: "<span>Total titik sudut</span><b>A, B, C, D, E, F, G, H</b>",
    },
    diagonal: {
      icon: "fa-bolt",
      title: "DIAGONAL RUANG",
      desc: "Ruas garis yang menghubungkan dua titik sudut yang saling berhadapan dan menembus <strong>bagian dalam balok</strong>. Ada <strong>4 diagonal ruang</strong> yang sama panjang.",
      extra: "<span>Panjang diagonal ruang</span><b>d = √(p² + l² + t²)</b>",
    },
  };
  let m1Mode = "sisi";

  function m1Show(mode) {
    m1Mode = mode;
    Object.keys(M1_INFO).forEach((k) => $("m1-" + k).classList.toggle("is-active", k === mode));
    const info = M1_INFO[mode];
    $("m1Icon").className = "fa-solid " + info.icon;
    $("m1Title").textContent = info.title;
    $("m1Desc").innerHTML = info.desc;
    $("m1Extra").innerHTML = info.extra;
    if (MB.three.api.misi1) MB.three.api.misi1.setMode(mode);
  }

  A.m1Highlight = (el) => {
    MB.Sound.sfx("click");
    m1Show(el.dataset.arg);
  };

  A.m1Quiz = (el) => {
    const ans = parseInt(el.dataset.arg, 10);
    if (ans === 12) {
      MB.Sound.sfx("correct");
      fb("m1Feedback", true, "✅ Tepat! Balok punya 12 rusuk: 4 panjang, 4 lebar, dan 4 tinggi.");
      MB.complete("misi1");
      show("m1Next");
    } else {
      MB.Sound.sfx("wrong");
      MB.penalize("misi1");
      fb("m1Feedback", false, `❌ ${ans} belum tepat. Hitung: 4 rusuk alas + 4 rusuk atas + 4 rusuk tegak. Coba lagi!`);
    }
  };

  MB.onEnter.misi1 = () => {
    MB.three.ensure("misi1");
    m1Show(m1Mode);
    revealNextIfDone("misi1", "m1Next");
  };

  /* =========================================================
     MISI 2 — Bongkar Balok (jaring-jaring)
     ========================================================= */
  const P = 20, L = 12, T = 14; // ukuran mini untuk gambar jaring-jaring
  const PAIR_COLOR = { tb: "#3b82f6", fb: "#10b981", lr: "#f59e0b" };

  /* sel: [x, y, lebar, tinggi, pasangan-warna] */
  const row = [
    [0, L, P, T, "fb"],
    [P, L, L, T, "lr"],
    [P + L, L, P, T, "fb"],
    [2 * P + L, L, L, T, "lr"],
  ];
  const NETS = [
    {
      id: "cross",
      correct: true,
      title: "Pola salib (1–4–1)",
      sub: "Empat sisi samping sebaris, tutup di atas & alas di bawah",
      cells: [[0, 0, P, L, "tb"], ...row, [0, L + T, P, L, "tb"]],
      why: "Empat sisi samping terlipat melingkar, tutup dan alas masing-masing menempel di satu sisi berbeda (atas &amp; bawah). Semua enam sisi terpakai tanpa menumpuk.",
    },
    {
      id: "overlap",
      correct: false,
      title: "Dua tutup di sisi yang sama",
      sub: "Dua persegi panjang besar sama-sama di bagian atas",
      cells: [[0, 0, P, L, "tb"], [P + L, 0, P, L, "tb"], ...row],
      why: "Kedua penutup menempel di sisi atas, jadi saat dilipat keduanya <strong>menumpuk</strong> di tempat yang sama, sementara bagian alas balok tetap <strong>bolong</strong>.",
    },
    {
      id: "narrow",
      correct: false,
      title: "Alas terlalu sempit",
      sub: "Penutup bawah lebih kecil dari sisi pasangannya",
      cells: [[0, 0, P, L, "tb"], ...row, [0, L + T, L, L, "tb"]],
      why: "Sisi yang berhadapan harus <strong>sama ukuran</strong>. Alas di sini lebih sempit daripada tutupnya, sehingga balok tidak bisa tertutup rapat.",
    },
  ];
  let netOrder = null;
  let netsPicked = false;

  function netSvg(cells) {
    const W = 2 * P + 2 * L + 4;
    const H = 2 * L + T + 4;
    const rects = cells
      .map(([x, y, w, h, k]) => `<rect x="${x + 2}" y="${y + 2}" width="${w}" height="${h}" fill="${PAIR_COLOR[k]}" fill-opacity=".75" stroke="#fff" stroke-width="1.2"/>`)
      .join("");
    return `<svg width="${W * 1.25}" height="${H * 1.25}" viewBox="0 0 ${W} ${H}" aria-hidden="true">${rects}</svg>`;
  }

  function renderNets() {
    netOrder = MB.ui.shuffle(NETS);
    $("netOptions").innerHTML = netOrder
      .map(
        (n, i) => `
      <button class="net-opt" data-action="pickNet" data-arg="${i}" type="button">
        <span class="net-opt__lead">
          <span class="net-opt__letter">${"ABC"[i]}</span>
          <span><h5>${n.title}</h5><p>${n.sub}</p></span>
        </span>
        ${netSvg(n.cells)}
      </button>`
      )
      .join("");
    hide("netFeedback");
    netsPicked = false;
  }

  A.pickNet = (el) => {
    const i = parseInt(el.dataset.arg, 10);
    const n = netOrder[i];
    [...$("netOptions").children].forEach((c, k) => c.classList.toggle("is-picked", k === i));
    if (n.correct) {
      MB.Sound.sfx("correct");
      fb("netFeedback", true, `<strong>✅ Benar sekali!</strong><br>${n.why}`);
      MB.complete("misi2");
      show("m2Next");
    } else {
      MB.Sound.sfx("wrong");
      MB.penalize("misi2");
      fb("netFeedback", false, `<strong>❌ Belum tepat.</strong><br>${n.why} Coba pilihan lain!`);
    }
  };

  function applyUnfold(v) {
    $("unfoldPct").textContent = `${v}% Terbuka`;
    const api = MB.three.api.misi2;
    if (api) api.setUnfold(v / 100);
  }
  A.setUnfold = (el) => {
    MB.Sound.sfx("click");
    const v = parseInt(el.dataset.arg, 10);
    $("unfoldSlider").value = v;
    applyUnfold(v);
  };

  MB.onEnter.misi2 = () => {
    MB.three.ensure("misi2");
    applyUnfold(parseInt($("unfoldSlider").value, 10));
    if (!netOrder) renderNets();
    revealNextIfDone("misi2", "m2Next");
  };

  /* =========================================================
     MISI 3 — Math Lab Volume
     ========================================================= */
  function updateLab() {
    const p = num("slider-p"), l = num("slider-l"), t = num("slider-t");
    $("label-p").textContent = `${p} cm`;
    $("label-l").textContent = `${l} cm`;
    $("label-t").textContent = `${t} cm`;
    $("dimensionTag").textContent = `${p} × ${l} × ${t} cm`;
    const v = p * l * t;
    $("volSub").textContent = `V = ${p} × ${l} × ${t}`;
    $("volFinal").textContent = `V = ${v.toLocaleString("id-ID")} cm³`;
    $("cubeCount").textContent = v.toLocaleString("id-ID");
    const api = MB.three.api.misi3;
    if (api) api.update(p, l, t, $("unitToggle").checked);
  }

  A.m3Check = () => {
    const v = num("labInput");
    if (v === 300) {
      MB.Sound.sfx("correct");
      fb("labFeedback", true, "🎉 Luar biasa! V = 10 × 6 × 5 = 300 cm³. Kamu paham langkahnya!");
      MB.complete("misi3");
      show("m3Next");
    } else {
      MB.Sound.sfx("wrong");
      MB.penalize("misi3");
      fb("labFeedback", false, "💡 Belum tepat. Kalikan ketiga angka: 10 × 6 = 60, lalu 60 × 5 = ?");
    }
  };

  MB.onEnter.misi3 = () => {
    MB.three.ensure("misi3");
    updateLab();
    revealNextIfDone("misi3", "m3Next");
  };

  /* =========================================================
     MISI 4 — Bedah Luas Permukaan
     ========================================================= */
  A.m4Pair = (el) => {
    MB.Sound.sfx("click");
    const pair = el.dataset.arg;
    document.querySelectorAll("#view-misi4 .pair").forEach((b) => b.classList.toggle("is-active", b === el));
    const api = MB.three.api.misi4;
    if (api) api.setPair(pair);
  };

  A.m4Check = () => {
    const v = num("m4Input");
    if (v === 108) {
      MB.Sound.sfx("correct");
      fb("m4Feedback", true, "🎉 Tepat! L = 2 × (6·4 + 6·3 + 4·3) = 2 × (24 + 18 + 12) = 2 × 54 = 108 cm².");
      MB.complete("misi4");
      show("m4Next");
    } else {
      MB.Sound.sfx("wrong");
      MB.penalize("misi4");
      fb("m4Feedback", false, "💡 Belum tepat. Hitung tiga luas dulu: p·l = 24, p·t = 18, l·t = 12. Jumlahkan, lalu kalikan 2.");
    }
  };

  MB.onEnter.misi4 = () => {
    MB.three.ensure("misi4");
    revealNextIfDone("misi4", "m4Next");
  };

  /* =========================================================
     MISI 5 — Diagonal Challenge
     ========================================================= */
  let m5Step = 1;
  const M5_FORMULAS = [
    { text: "d = p + l + t", ok: false, why: "Menjumlahkan ukuran akan memberi 12 + 9 + 8 = 29, lebih panjang dari diagonal yang kita hitung (17). Diagonal tidak sama dengan jumlah rusuk." },
    { text: "d = √(p² + l² + t²)", ok: true, why: "Dua kali Pythagoras digabung: d² = (p² + l²) + t². Dengan angka tadi: 144 + 81 + 64 = 289, jadi d = 17 cm." },
    { text: "d = p × l × t", ok: false, why: "Perkalian p × l × t adalah rumus volume, bukan panjang diagonal." },
  ];
  let m5Order = null;

  function m5Go(step) {
    m5Step = step;
    [1, 2, 3].forEach((n) => (n === step ? show("m5Step" + n) : hide("m5Step" + n)));
    $("m5Badge").textContent = `Langkah ${step}/3`;
    hide("m5Feedback");
  }

  A.m5Check1 = () => {
    if (num("m5In1") === 15) {
      MB.Sound.sfx("correct");
      m5Go(2);
      fb("m5Feedback", true, "✅ √225 = 15. Diagonal alas = 15 cm!");
    } else {
      MB.Sound.sfx("wrong");
      MB.penalize("misi5");
      fb("m5Feedback", false, "💡 Cari bilangan yang jika dikuadratkan menghasilkan 225. Coba antara 10 dan 20.");
    }
  };

  A.m5Check2 = () => {
    if (num("m5In2") === 17) {
      MB.Sound.sfx("correct");
      m5Go(3);
      fb("m5Feedback", true, "🎉 √289 = 17. Diagonal ruang = 17 cm! Satu langkah lagi.");
      renderFormulas();
    } else {
      MB.Sound.sfx("wrong");
      MB.penalize("misi5");
      fb("m5Feedback", false, "💡 Belum tepat. 15² = 225, 20² = 400, jadi hasilnya di antara 15 dan 20. Angka berakhiran 9 muncul dari 3² atau 7².");
    }
  };

  function renderFormulas() {
    m5Order = MB.ui.shuffle(M5_FORMULAS);
    $("m5Formulas").innerHTML = m5Order
      .map((f, i) => `<button class="choice mono" data-action="m5Formula" data-arg="${i}" type="button">${"ABC"[i]}. ${f.text}</button>`)
      .join("");
  }

  A.m5Formula = (el) => {
    const f = m5Order[parseInt(el.dataset.arg, 10)];
    if (f.ok) {
      MB.Sound.sfx("correct");
      el.classList.add("is-right");
      fb("m5Feedback", true, `✅ Tepat! ${f.why}`);
      MB.complete("misi5");
      show("m5Next");
    } else {
      MB.Sound.sfx("wrong");
      MB.penalize("misi5");
      el.classList.add("is-wrong");
      fb("m5Feedback", false, `❌ ${f.why}`);
    }
  };

  MB.onEnter.misi5 = () => {
    MB.three.ensure("misi5");
    if (MB.state.data.progress.misi5) {
      m5Go(3);
      renderFormulas();
      fb("m5Feedback", true, "✅ Misi ini sudah selesai. Kamu boleh mengulang pilihan rumus untuk latihan.");
    } else {
      m5Go(m5Step);
    }
    revealNextIfDone("misi5", "m5Next");
  };

  /* =========================================================
     PETUNJUK BERTINGKAT
     ========================================================= */
  const HINTS = {
    diagonal: [
      "Petunjuk 1: Diagonal ruang bukan garis di permukaan, melainkan menembus bagian dalam balok.",
      "Petunjuk 2: Mulai dari alas. Diagonal alas dicari dengan Pythagoras biasa dari p dan l.",
      "Petunjuk 3: Diagonal alas dan tinggi t membentuk segitiga siku-siku baru. Sisi miringnya adalah diagonal ruang.",
      "Petunjuk 4: Jika dirangkum, d² = p² + l² + t² = 144 + 81 + 64 = 289, sehingga d = 17.",
    ],
    story: [
      "Petunjuk 1: Baca pertanyaan terakhir: \"Berapa luas kertas yang diperlukan?\"",
      "Petunjuk 2: Melapisi seluruh bagian luar berarti menghitung luas kulit luar, bukan isi (volume).",
      "Petunjuk 3: Pakai rumus luas permukaan balok: L = 2(pl + pt + lt).",
      "Petunjuk 4: pl = 240, pt = 200, lt = 120. Jumlahkan (560), lalu kalikan 2.",
    ],
  };
  const hintIdx = { diagonal: 0, story: 0 };

  A.hint = (el) => {
    const cat = el.dataset.arg;
    const box = $(cat === "diagonal" ? "hintsDiagonal" : "hintsStory");
    const i = hintIdx[cat];
    if (i >= HINTS[cat].length) {
      MB.ui.toast("Semua petunjuk sudah ditampilkan.", "lightbulb");
      return;
    }
    MB.Sound.sfx("click");
    const d = document.createElement("div");
    d.textContent = HINTS[cat][i];
    box.appendChild(d);
    hintIdx[cat]++;
  };

  /* =========================================================
     DETEKTIF SOAL CERITA
     ========================================================= */
  const GOALS = [
    { key: "volume", text: "A. Volume kardus" },
    { key: "luas", text: "B. Luas permukaan kardus" },
    { key: "diagonal", text: "C. Panjang diagonal ruang" },
  ];
  let goalsOrder = null;

  function renderGoals() {
    goalsOrder = MB.ui.shuffle(GOALS);
    $("storyGoals").innerHTML = goalsOrder
      .map((g, i) => `<button class="choice" data-action="storyGoal" data-arg="${g.key}" type="button">${"ABC"[i]}. ${g.text.slice(3)}</button>`)
      .join("");
  }

  A.toggleHl = (el) => {
    MB.Sound.sfx("click");
    el.classList.toggle("is-on");
    $("hlCount").textContent = `${document.querySelectorAll("#view-story .hl.is-on").length} ditandai`;
  };

  A.storyGoal = (el) => {
    if (el.dataset.arg === "luas") {
      MB.Sound.sfx("correct");
      el.classList.add("is-right");
      fb("storyGoalFb", true, "✅ Benar! Kata kunci \"dilapisi kertas pada seluruh bagian luarnya\" menunjukkan yang ditanyakan adalah <strong>luas permukaan</strong>.");
      show("storySolver");
    } else {
      MB.Sound.sfx("wrong");
      MB.penalize("story");
      el.classList.add("is-wrong");
      fb("storyGoalFb", false, "❌ Bukan. Volume dipakai untuk isi/daya tampung. Melapisi atau membungkus bagian luar berarti <strong>luas permukaan</strong>!");
    }
  };

  A.storyCheck = () => {
    if (num("storyInput") === 1120) {
      MB.Sound.sfx("correct");
      fb("storyFb", true, "🎉 Sempurna! Luas kertas yang dibutuhkan adalah 1.120 cm². Kamu berhasil membedah soal cerita!");
      if (MB.complete("story")) MB.ui.confettiBurst(false);
      show("storyNext");
    } else {
      MB.Sound.sfx("wrong");
      MB.penalize("story");
      fb("storyFb", false, "💡 Hitung ulang dengan teliti: 2 × 560 = ?");
    }
  };

  MB.onEnter.story = () => {
    if (!goalsOrder) renderGoals();
    if (MB.state.data.progress.story) show("storyNext");
    else hide("storyNext");
  };

  /* =========================================================
     Event input (slider, toggle)
     ========================================================= */
  document.addEventListener("input", (e) => {
    const id = e.target.id;
    if (id === "unfoldSlider") applyUnfold(parseInt(e.target.value, 10));
    else if (id === "slider-p" || id === "slider-l" || id === "slider-t") updateLab();
  });
  document.addEventListener("change", (e) => {
    if (e.target.id === "unitToggle") updateLab();
  });

  /* Reset tampilan lokal misi saat akun berganti / progres di-reset */
  MB.resetMissionUI = function () {
    m1Mode = "sisi";
    m5Step = 1;
    netOrder = null;
    goalsOrder = null;
    hintIdx.diagonal = 0;
    hintIdx.story = 0;
    ["hintsDiagonal", "hintsStory", "netOptions", "m5Formulas", "storyGoals"].forEach((id) => ($(id).innerHTML = ""));
    ["m1Feedback", "netFeedback", "labFeedback", "m4Feedback", "m5Feedback", "storyGoalFb", "storyFb", "m1Next", "m2Next", "m3Next", "m4Next", "m5Next", "storyNext", "storySolver"].forEach(hide);
    ["labInput", "m4Input", "m5In1", "m5In2", "storyInput"].forEach((id) => ($(id).value = ""));
    document.querySelectorAll("#view-story .hl.is-on").forEach((h) => h.classList.remove("is-on"));
    $("hlCount").textContent = "0 ditandai";
    document.querySelectorAll("#view-misi4 .pair").forEach((b) => b.classList.remove("is-active"));
    if (MB.three.api.misi4) MB.three.api.misi4.setPair("all");
    $("unfoldSlider").value = 0;
    applyUnfold(0);
    m5Go(1);
  };
})();
