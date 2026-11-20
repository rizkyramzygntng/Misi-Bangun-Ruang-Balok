/* =========================================================
   boss.js — Boss Level "Master Balok" + layar hasil
   Boss hanya bisa dibuka bila minimal 3 misi selesai
   (dijaga di MB.ui.navigate dan dicek ulang di sini).
   ========================================================= */
(function () {
  const A = MB.actions;
  const $ = MB.ui.$;

  const QUESTIONS = [
    {
      category: "Unsur Balok",
      title: "Sebuah balok memiliki 12 rusuk. Rusuk-rusuk itu terbagi menjadi berapa kelompok yang sama panjang?",
      hint: "Ingat ada rusuk panjang, rusuk lebar, dan rusuk tinggi.",
      choices: [
        { text: "2 kelompok", ok: false },
        { text: "3 kelompok (panjang, lebar, tinggi)", ok: true },
        { text: "4 kelompok", ok: false },
        { text: "6 kelompok", ok: false },
      ],
    },
    {
      category: "Volume Balok",
      title: "Sebuah akuarium berbentuk balok berukuran p = 60 cm, l = 40 cm, t = 30 cm. Berapa volume air jika terisi penuh?",
      hint: "Gunakan V = p × l × t. Kalikan dulu 60 × 40, lalu hasilnya kalikan 30.",
      choices: [
        { text: "7.200 cm³", ok: false },
        { text: "72.000 cm³", ok: true },
        { text: "130.000 cm³", ok: false },
        { text: "24.000 cm³", ok: false },
      ],
    },
    {
      category: "Luas Permukaan",
      title: "Mengapa rumus luas permukaan balok memuat angka 2? L = 2(pl + pt + lt)",
      hint: "Ingat konsep pasangan sisi yang saling berhadapan.",
      choices: [
        { text: "Karena balok hanya memiliki 2 sisi", ok: false },
        { text: "Karena tiap pasang sisi yang berhadapan kongruen (sama luasnya)", ok: true },
        { text: "Karena balok memiliki 2 dimensi", ok: false },
        { text: "Itu hanya ketentuan di buku", ok: false },
      ],
    },
    {
      category: "Diagonal Ruang",
      title: "Balok berukuran panjang 4 cm, lebar 3 cm, tinggi 12 cm. Berapa panjang diagonal ruangnya?",
      hint: "Pakai d = √(p² + l² + t²). Jumlahkan kuadrat ketiganya dulu.",
      choices: [
        { text: "19 cm", ok: false },
        { text: "15 cm", ok: false },
        { text: "13 cm", ok: true },
        { text: "17 cm", ok: false },
      ],
    },
    {
      category: "Soal Cerita Tantangan",
      title: "Kolam renang berukuran p = 10 m, l = 5 m, t = 2 m. Dinding bagian dalam dan alasnya akan dipasangi keramik (tanpa tutup atas). Berapa luas keramiknya?",
      hint: "Kolam tidak punya tutup, jadi alasnya dihitung 1 × (p × l), bukan 2 ×. Dindingnya ada 4.",
      choices: [
        { text: "110 m²", ok: true },
        { text: "160 m²", ok: false },
        { text: "100 m²", ok: false },
        { text: "80 m²", ok: false },
      ],
    },
  ];

  /* pemetaan level boss → kompetensi di layar hasil */
  const STAGE_COMP = { 1: "misi1", 2: "misi3", 3: "misi4", 4: "misi5", 5: "misi4" };

  let run = null;

  function newRun() {
    run = { stage: 1, lives: MB.CONFIG.BOSS_LIVES, hints: MB.CONFIG.BOSS_HINTS, score: 0, wrong: {}, locked: false };
  }

  function renderHearts() {
    [...$("bossHearts").children].forEach((h, i) => h.classList.toggle("lost", i >= run.lives));
    // heart icon style
    [...$("bossHearts").children].forEach((h, i) => (h.className = "fa-" + (i < run.lives ? "solid" : "regular") + " fa-heart" + (i < run.lives ? "" : " lost")));
  }

  function loadStage() {
    const q = QUESTIONS[run.stage - 1];
    run.locked = false;
    $("bossStage").textContent = run.stage;
    $("bossCat").textContent = "Kategori: " + q.category;
    $("bossQuestion").textContent = q.title;
    $("bossHintMsg").classList.add("hidden");
    $("bossHintCount").textContent = run.hints;
    $("bossRunScore").textContent = run.score;
    const hp = 100 - (run.stage - 1) * 20;
    $("bossHpPct").textContent = hp + "%";
    $("bossHpBar").style.width = hp + "%";
    renderHearts();

    const box = $("bossChoices");
    box.innerHTML = "";
    MB.ui.shuffle(q.choices).forEach((c) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "boss-choice";
      b.textContent = c.text;
      b.addEventListener("click", () => answer(b, c.ok));
      box.appendChild(b);
    });
  }

  function answer(btn, ok) {
    if (run.locked) return;
    if (ok) {
      run.locked = true;
      btn.classList.add("is-right");
      MB.Sound.sfx("correct");
      const C = MB.CONFIG;
      const gain = Math.max(C.MIN_BOSS_STAGE_POINTS, C.POINTS_PER_BOSS_STAGE - C.PENALTY_PER_WRONG * (run.wrong[run.stage] || 0));
      run.score += gain;
      $("bossRunScore").textContent = run.score;
      MB.ui.toast(gain === C.POINTS_PER_BOSS_STAGE ? `+${gain} poin, tanpa salah! 🔥` : `+${gain} poin (dipotong ${C.POINTS_PER_BOSS_STAGE - gain} karena salah)`, "star", "gold");
      const hp = 100 - run.stage * 20;
      $("bossHpPct").textContent = hp + "%";
      $("bossHpBar").style.width = hp + "%";
      setTimeout(() => {
        if (run.stage >= MB.BOSS_STAGES) victory();
        else {
          run.stage++;
          loadStage();
        }
      }, 900);
    } else {
      btn.classList.add("is-wrong");
      btn.disabled = true;
      run.wrong[run.stage] = (run.wrong[run.stage] || 0) + 1;
      run.lives--;
      MB.Sound.sfx("hurt");
      renderHearts();
      const arena = document.querySelector(".arena");
      arena.classList.remove("shake");
      void arena.offsetWidth;
      arena.classList.add("shake");
      if (run.lives <= 0) {
        run.locked = true;
        gameOver();
      } else {
        const left = Math.max(MB.CONFIG.MIN_BOSS_STAGE_POINTS, MB.CONFIG.POINTS_PER_BOSS_STAGE - MB.CONFIG.PENALTY_PER_WRONG * run.wrong[run.stage]);
        MB.ui.toast(`Serangan meleset! Nyawa tersisa ${run.lives} ❤️ · poin level ini maks ${left}`, "heart-crack", "bad");
      }
    }
  }

  function gameOver() {
    setTimeout(() => {
      MB.Sound.sfx("over");
      MB.ui.modal({
        title: "Nyawa habis!",
        icon: "heart-crack",
        body: "Golem Balok terlalu tangguh kali ini. Jangan menyerah! Pelajari lagi petunjuknya dan coba sekali lagi.",
        buttons: [
          { label: "Ke Menu", cls: "btn--ghost", onClick: () => MB.ui.navigate("hub") },
          { label: "Coba Lagi", cls: "btn--primary", onClick: () => { newRun(); loadStage(); } },
        ],
      });
    }, 500);
  }

  function victory() {
    const d = MB.state.data;
    d.bossBest = Math.max(d.bossBest || 0, run.score);
    d.bossDone = true;
    d.bossWrong = Object.assign({}, run.wrong);
    d.bossRuns = (d.bossRuns || 0) + 1;
    MB.save();
    MB.Sound.sfx("win");
    MB.ui.confettiBurst(true);
    MB.ui.refresh();
    setTimeout(() => MB.ui.navigate("results"), 1300);
  }

  A.bossHint = () => {
    if (!run || run.locked) return;
    if (run.hints <= 0) {
      MB.ui.alertBox("Petunjuk habis", "Kamu sudah memakai semua petunjuk untuk pertempuran ini.", "lightbulb");
      return;
    }
    run.hints--;
    $("bossHintCount").textContent = run.hints;
    const msg = $("bossHintMsg");
    msg.classList.remove("hidden");
    msg.innerHTML = `💡 <strong>Petunjuk:</strong> ${MB.ui.esc(QUESTIONS[run.stage - 1].hint)}`;
    MB.Sound.sfx("click");
  };

  MB.onEnter.boss = () => {
    if (!MB.isBossUnlocked()) return; // pagar tambahan
    newRun();
    loadStage();
  };

  A.replayBoss = () => MB.ui.navigate("boss");

  /* =========================================================
     LAYAR HASIL
     ========================================================= */
  const COMPS = [
    { id: "misi1", label: "Unsur & komponen balok (sisi, rusuk, titik sudut)" },
    { id: "misi2", label: "Jaring-jaring & visualisasi lipatan balok" },
    { id: "misi3", label: "Konsep volume (V = p × l × t)" },
    { id: "misi4", label: "Luas permukaan 2(pl + pt + lt)" },
    { id: "misi5", label: "Diagonal ruang & soal cerita kontekstual", extra: "story" },
  ];

  MB.onEnter.results = () => {
    const d = MB.state.data;
    const total = MB.score();
    const pct = Math.round((total / MB.MAX_SCORE) * 100);
    $("resultScore").textContent = `${pct}/100`;
    $("resultPoints").textContent = `${total} dari ${MB.MAX_SCORE} poin`;
    $("resultLead").textContent = `Selamat, ${MB.state.name}! Kamu sudah menaklukkan Golem Balok.`;

    const wrongByComp = {};
    Object.keys(d.bossWrong || {}).forEach((st) => {
      const c = STAGE_COMP[st];
      wrongByComp[c] = (wrongByComp[c] || 0) + d.bossWrong[st];
    });

    const weak = [];
    const list = $("compList");
    list.innerHTML = "";
    COMPS.forEach((c, i) => {
      const learned = d.progress[c.id] && (!c.extra || d.progress[c.extra]);
      let cls, status, icon;
      if (!learned) {
        cls = "none"; status = "Belum dipelajari"; icon = "circle-question";
        weak.push(c.label.split(" (")[0].toLowerCase());
      } else if (wrongByComp[c.id] > 0) {
        cls = "warn"; status = "Perlu latihan"; icon = "triangle-exclamation";
        weak.push(c.label.split(" (")[0].toLowerCase());
      } else {
        cls = "ok"; status = "Dikuasai"; icon = "circle-check";
      }
      const row = document.createElement("div");
      row.className = "comp " + cls;
      row.innerHTML = `<span><i class="fa-solid fa-${icon}"></i> ${i + 1}. ${MB.ui.esc(c.label)}</span><b>${status}</b>`;
      list.appendChild(row);
    });

    $("resultNote").textContent = weak.length
      ? `Hebat sudah sampai sini! Yang masih perlu diasah: ${weak.join("; ")}. Buka lagi misinya, lalu coba Boss sekali lagi untuk menaikkan skor.`
      : "Luar biasa! Kamu tidak hanya menghafal rumus, tapi memahami struktur ruang 3D, asal-usul luas permukaan 2(pl + pt + lt), dan kaitan Pythagoras pada diagonal ruang. Pertahankan!";
  };
})();
