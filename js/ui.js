/* =========================================================
   ui.js — navigasi, toast, modal, header, peta misi, peringkat
   ========================================================= */
MB.ui = (function () {
  const $ = (id) => document.getElementById(id);
  const VIEWS = ["hub", "misi1", "misi2", "misi3", "misi4", "misi5", "story", "boss", "results"];

  function esc(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function feedback(id, ok, html) {
    const el = $(id);
    if (!el) return;
    el.className = "feedback " + (ok ? "ok" : "bad");
    el.innerHTML = html;
  }

  /* ---------- toast ---------- */
  function toast(msg, icon = "circle-info", kind = "") {
    const host = $("toastHost");
    const el = document.createElement("div");
    el.className = "toast " + (kind ? "is-" + kind : "");
    el.innerHTML = `<i class="fa-solid fa-${icon}"></i><span>${msg}</span>`;
    host.appendChild(el);
    setTimeout(() => {
      el.classList.add("is-out");
      setTimeout(() => el.remove(), 320);
    }, 3400);
  }

  /* ---------- modal ---------- */
  function closeModal() {
    const m = $("mbModal");
    if (m) m.remove();
  }
  function modal({ title, body, icon = "circle-exclamation", buttons }) {
    closeModal();
    const wrap = document.createElement("div");
    wrap.id = "mbModal";
    wrap.className = "modal";
    wrap.innerHTML = `
      <div class="modal__box" role="dialog" aria-modal="true">
        <div class="modal__head">
          <div class="modal__icon"><i class="fa-solid fa-${icon}"></i></div>
          <h4>${title}</h4>
        </div>
        <div class="modal__body"></div>
        <div class="modal__actions"></div>
      </div>`;
    const bodyEl = wrap.querySelector(".modal__body");
    if (typeof body === "string") bodyEl.innerHTML = body;
    else if (body) bodyEl.appendChild(body);
    const actions = wrap.querySelector(".modal__actions");
    (buttons || [{ label: "Paham", cls: "btn--primary" }]).forEach((b) => {
      const btn = document.createElement("button");
      btn.className = "btn " + (b.cls || "btn--ghost");
      btn.type = "button";
      btn.textContent = b.label;
      btn.addEventListener("click", () => {
        closeModal();
        if (b.onClick) b.onClick();
      });
      actions.appendChild(btn);
    });
    wrap.addEventListener("click", (e) => {
      if (e.target === wrap) closeModal();
    });
    document.body.appendChild(wrap);
  }
  function alertBox(title, message, icon) {
    modal({ title, body: message, icon });
  }
  function confirmBox(title, message, onYes, yesLabel = "Ya, lanjut") {
    modal({
      title,
      body: message,
      icon: "triangle-exclamation",
      buttons: [
        { label: "Batal", cls: "btn--ghost" },
        { label: yesLabel, cls: "btn--primary", onClick: onYes },
      ],
    });
  }

  /* ---------- confetti ---------- */
  function confettiBurst(big) {
    if (typeof confetti !== "function") return;
    confetti({ particleCount: big ? 160 : 90, spread: big ? 100 : 70, origin: { y: 0.6 } });
    if (big) {
      setTimeout(() => confetti({ particleCount: 80, angle: 60, spread: 60, origin: { x: 0, y: 0.7 } }), 250);
      setTimeout(() => confetti({ particleCount: 80, angle: 120, spread: 60, origin: { x: 1, y: 0.7 } }), 250);
    }
  }

  /* ---------- latar kubus melayang ---------- */
  function bgCubes() {
    const host = $("bgCubes");
    if (!host || host.childElementCount) return;
    for (let i = 0; i < 14; i++) {
      const c = document.createElement("span");
      const size = 18 + Math.random() * 46;
      c.className = "bg-cube";
      c.style.cssText = `left:${Math.random() * 100}%;width:${size}px;height:${size}px;--d:${20 + Math.random() * 26}s;--delay:${-Math.random() * 30}s`;
      host.appendChild(c);
    }
  }

  /* ---------- navigasi ---------- */
  function navigate(view) {
    const S = MB.state;
    if (!S.data) return;

    if (view === "boss" && !MB.isBossUnlocked()) {
      const n = MB.missionsDone();
      MB.Sound.sfx("locked");
      toast(`Boss Level masih terkunci! Selesaikan minimal ${MB.CONFIG.BOSS_REQUIRED_MISSIONS} misi dulu (${n}/${MB.CONFIG.BOSS_REQUIRED_MISSIONS}).`, "lock", "bad");
      const card = $("bossCard");
      if (card) {
        card.classList.remove("shake");
        void card.offsetWidth;
        card.classList.add("shake");
      }
      return;
    }
    if (view === "results" && !S.data.bossDone) view = "hub";
    if (!VIEWS.includes(view)) view = "hub";
    if (view !== "hub") MB.ui.updatePts(view);

    VIEWS.forEach((v) => $("view-" + v).classList.toggle("hidden", v !== view));
    S.view = view;
    closeUserMenu();
    window.scrollTo({ top: 0, behavior: "smooth" });
    MB.Sound.setTheme(view === "boss" ? "boss" : "chill");
    if (MB.onEnter[view]) MB.onEnter[view]();
    refresh();
  }

  /* ---------- menu pengguna ---------- */
  function closeUserMenu() {
    ["userMenu", "musicPanel"].forEach((id) => {
      const m = $(id);
      if (m) m.classList.add("hidden");
    });
  }

  /* pill "Poin misi: 15/20" di kepala tiap misi */
  function updatePts(view) {
    if (!MB.state.data || !MB.TASKS.includes(view)) return;
    const head = document.querySelector(`#view-${view} .view__head`);
    if (!head) return;
    let pill = head.querySelector(".pts-pill");
    if (!pill) {
      pill = document.createElement("span");
      pill.className = "pill pill--gold pts-pill";
      head.appendChild(pill);
    }
    const max = MB.CONFIG.POINTS_PER_TASK;
    const pts = MB.potential(view);
    pill.innerHTML = MB.state.data.progress[view]
      ? `<i class="fa-solid fa-star"></i> Dapat ${pts} poin`
      : `<i class="fa-solid fa-star"></i> Poin misi: ${pts}/${max}`;
    pill.classList.toggle("is-reduced", pts < max);
  }

  /* ---------- refresh tampilan ---------- */
  function refreshHeader() {
    const S = MB.state;
    if (!S.data) return;
    $("userName").textContent = S.name;
    $("userAvatar").textContent = S.name.charAt(0).toUpperCase();
    $("userModeNote").textContent = S.guest
      ? "Mode tamu: progres hilang saat halaman ditutup. Daftar untuk menyimpan."
      : "Progres tersimpan otomatis di browser ini.";
    $("topScore").textContent = `${MB.score()} Poin`;
    const doneAll = MB.TASKS.filter((t) => S.data.progress[t]).length + (S.data.bossDone ? 1 : 0);
    $("topProgressBar").style.width = (doneAll / (MB.TASKS.length + 1)) * 100 + "%";
    MB.Sound.refreshUI();
  }

  function renderMissionGrid() {
    const grid = $("missionGrid");
    if (grid.childElementCount) return;
    grid.innerHTML = MB.MISSION_META.map(
      (m) => `
      <button class="mcard" id="mcard-${m.id}" data-nav="${m.id}" style="--mc:${m.color}" type="button">
        <div class="mcard__top">
          <span class="tag" style="--mc:${m.color}">${m.tag}</span>
          <span class="badge" id="badge-${m.id}">Belum selesai</span>
        </div>
        <div class="mcard__body">
          <div class="mcard__icon"><i class="fa-solid ${m.icon}"></i></div>
          <div><h4>${m.title}</h4><small>${m.sub}</small></div>
        </div>
        <p>${m.desc}</p>
        <div class="mcard__foot"><span>${m.cta}</span><i class="fa-solid fa-arrow-right"></i></div>
      </button>`
    ).join("");
  }

  function refreshHub() {
    const S = MB.state;
    if (!S.data) return;
    renderMissionGrid();
    const d = S.data;
    const md = MB.missionsDone();

    $("heroName").textContent = S.name;
    $("hubDone").textContent = md;
    $("hubBar").style.width = (md / MB.MISSIONS.length) * 100 + "%";
    $("hubDesc").textContent =
      md === 0
        ? "Belum ada misi yang selesai. Yuk mulai Misi 1!"
        : md < 5
        ? `Keren! ${md} dari 5 misi selesai. Lanjutkan petualangan!`
        : "Semua misi selesai! Tantang Boss Level sekarang!";

    MB.MISSION_META.forEach((m) => {
      const done = !!d.progress[m.id];
      const badge = $("badge-" + m.id);
      badge.textContent = done ? "Selesai ✓" : "Belum selesai";
      badge.classList.toggle("is-done", done);
      $("mcard-" + m.id).classList.toggle("is-done", done);
    });

    /* kartu boss */
    const need = MB.CONFIG.BOSS_REQUIRED_MISSIONS;
    const open = MB.isBossUnlocked();
    const card = $("bossCard");
    card.classList.toggle("is-locked", !open);
    card.classList.toggle("is-open", open);
    $("bossIcon").className = "fa-solid " + (open ? "fa-crown" : "fa-lock");
    $("bossLockText").innerHTML = open
      ? '<i class="fa-solid fa-lock-open"></i> Terbuka!'
      : `<i class="fa-solid fa-lock"></i> Selesaikan ${need} misi dulu (${Math.min(md, need)}/${need})`;
    $("bossBtn").textContent = open ? (d.bossDone ? "Main Lagi" : "Tantang Boss") : "Terkunci";
    [...$("bossPips").children].forEach((p, i) => p.classList.toggle("on", i < md));
    card.setAttribute("aria-disabled", String(!open));

    $("resultsBtn").classList.toggle("hidden", !d.bossDone);

    /* label tombol lanjut */
    const nextId = MB.TASKS.find((t) => !d.progress[t]);
    let label;
    if (nextId) {
      const meta = MB.MISSION_META.find((m) => m.id === nextId);
      label = (md === 0 && nextId === "misi1" ? "Mulai " : "Lanjut ") + meta.tag.replace("Spesial", "Soal Cerita");
    } else label = d.bossDone ? "Main Boss Lagi" : "Tantang Boss Level";
    $("continueLabel").textContent = label;
  }

  function refresh() {
    refreshHeader();
    refreshHub();
    updatePts(MB.state.view);
  }

  /* ---------- papan peringkat (lokal) ---------- */
  function openLeaderboard() {
    const users = MB.Store.loadUsers();
    const rows = Object.keys(users)
      .map((k) => {
        const d = MB.Store.normalize(users[k].data);
        return { key: k, name: users[k].name, score: MB.scoreOf(d), missions: MB.MISSIONS.filter((m) => d.progress[m]).length, boss: d.bossDone };
      })
      .sort((a, b) => b.score - a.score);

    const wrap = document.createElement("div");
    if (!rows.length) {
      wrap.innerHTML = '<p class="lead">Belum ada akun di perangkat ini. Daftar dulu untuk masuk peringkat!</p>';
    } else {
      const list = document.createElement("div");
      list.className = "lb";
      rows.forEach((r, i) => {
        const row = document.createElement("div");
        row.className = "lb__row" + (r.key === MB.state.key ? " me" : "");
        const medal = ["🥇", "🥈", "🥉"][i] || i + 1;
        row.innerHTML = `<span class="lb__rank">${medal}</span>
          <span><span class="lb-name"></span><small>${r.missions}/5 misi${r.boss ? " · Boss ✓" : ""}</small></span>
          <span style="color:var(--amber)">${r.score} poin</span>`;
        row.querySelector(".lb-name").textContent = r.name;
        list.appendChild(row);
      });
      wrap.appendChild(list);
      const note = document.createElement("p");
      note.className = "lead";
      note.style.marginTop = "10px";
      note.textContent = "Peringkat hanya mencakup akun yang terdaftar di perangkat/browser ini.";
      wrap.appendChild(note);
    }
    modal({ title: "Papan Peringkat", icon: "ranking-star", body: wrap, buttons: [{ label: "Tutup", cls: "btn--primary" }] });
  }

  return { $, esc, shuffle, feedback, toast, modal, alertBox, confirmBox, closeModal, confettiBurst, bgCubes, navigate, refresh, refreshHub, refreshHeader, closeUserMenu, updatePts, openLeaderboard };
})();

/* Jawaban salah: memotong poin misi (selama misi belum tuntas) */
MB.penalize = function (id) {
  const d = MB.state.data;
  if (!d || d.progress[id]) return;
  const before = MB.potential(id);
  d.wrongs[id] = (d.wrongs[id] || 0) + 1;
  MB.save();
  const after = MB.potential(id);
  if (after < before) MB.ui.toast(`Jawaban belum tepat: poin misi ini turun ${before} → ${after}`, "arrow-trend-down", "bad");
  else MB.ui.toast(`Poin misi ini sudah di batas minimum (${after}). Tetap semangat!`, "shield-heart");
  MB.ui.updatePts(MB.state.view);
};

/* Menandai misi selesai (dipanggil dari missions.js & boss.js) */
MB.complete = function (id) {
  const d = MB.state.data;
  if (!d || d.progress[id]) return false;
  const wasOpen = MB.isBossUnlocked();
  d.progress[id] = true;
  MB.save();
  MB.Sound.sfx("complete");
  const pts = MB.potential(id);
  const cut = MB.CONFIG.POINTS_PER_TASK - pts;
  MB.ui.toast(`+${pts} poin! Misi selesai 🎉${cut ? ` (dipotong ${cut} karena salah)` : " Tanpa salah, poin penuh!"}`, "star", "gold");
  MB.ui.refresh();
  if (!wasOpen && MB.isBossUnlocked()) {
    setTimeout(() => {
      MB.Sound.sfx("unlock");
      MB.ui.toast("🔓 Kelima misi tuntas, Boss Level terbuka! Siap menantang Golem Balok?", "crown", "gold");
      MB.ui.confettiBurst(true);
    }, 900);
  }
  return true;
};
