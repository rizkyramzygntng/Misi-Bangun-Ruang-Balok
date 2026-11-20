/* =========================================================
   app.js — titik masuk: memulai sesi, event global, reset progres
   ========================================================= */
(function () {
  const $ = MB.ui.$;

  /* Dipanggil setelah login/daftar/tamu/sesi tersimpan */
  MB.startSession = function ({ key, name, guest, data }) {
    MB.state.key = key;
    MB.state.name = name;
    MB.state.guest = guest;
    MB.state.data = data;
    MB.resetMissionUI();
    MB.Tutor.reset();
    $("authScreen").classList.add("hidden");
    $("app").classList.remove("hidden");
    MB.Sound.refreshUI();
    MB.ui.navigate("hub");
  };

  MB.actions.continue = () => {
    const d = MB.state.data;
    const next = MB.TASKS.find((t) => !d.progress[t]);
    MB.ui.navigate(next || "boss");
  };

  MB.actions.toggleMusic = () => MB.Sound.toggleMusic();
  MB.actions.toggleSfx = () => MB.Sound.toggleSfx();
  MB.actions.openLeaderboard = () => MB.ui.openLeaderboard();
  MB.actions.toggleUserMenu = () => {
    $("musicPanel").classList.add("hidden");
    $("userMenu").classList.toggle("hidden");
  };
  MB.actions.toggleMusicPanel = () => {
    $("userMenu").classList.add("hidden");
    $("musicPanel").classList.toggle("hidden");
  };
  MB.actions.pickTrack = (el) => {
    MB.Sound.setTrack(el.dataset.arg);
    const t = MB.Sound.tracks().find((x) => x.id === el.dataset.arg);
    if (t) MB.ui.toast(`Memutar: ${t.name}`, "music");
  };

  MB.actions.resetProgress = () => {
    MB.ui.closeUserMenu();
    MB.ui.confirmBox(
      "Reset progres?",
      "Semua misi, poin, dan hasil Boss akan dikembalikan ke awal. Tindakan ini tidak bisa dibatalkan.",
      () => {
        MB.state.data = MB.Store.defaultData();
        MB.save();
        MB.resetMissionUI();
        MB.ui.navigate("hub");
        MB.ui.toast("Progres direset. Selamat mengulang petualangan!", "rotate-left");
      },
      "Ya, reset"
    );
  };

  /* Event global: navigasi (data-nav) & aksi (data-action) */
  document.addEventListener("click", (e) => {
    const nav = e.target.closest("[data-nav]");
    if (nav) {
      MB.Sound.sfx("click");
      MB.ui.navigate(nav.dataset.nav);
      return;
    }
    const act = e.target.closest("[data-action]");
    if (act && MB.actions[act.dataset.action]) MB.actions[act.dataset.action](act, e);

    if (!e.target.closest(".user-menu")) MB.ui.closeUserMenu();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      MB.ui.closeModal();
      MB.ui.closeUserMenu();
    }
    if ((e.key === "Enter" || e.key === " ") && e.target.matches('[role="button"][data-nav]')) {
      e.preventDefault();
      MB.ui.navigate(e.target.dataset.nav);
    }
  });

  /* Browser mengizinkan audio hanya setelah gestur pertama */
  const unlock = () => MB.Sound.unlock();
  document.addEventListener("pointerdown", unlock, { once: true });
  document.addEventListener("keydown", unlock, { once: true });

  document.addEventListener("input", (e) => {
    if (e.target.id === "volumeSlider") MB.Sound.setVolume(e.target.value / 100);
  });

  document.addEventListener("DOMContentLoaded", () => {
    MB.ui.bgCubes();
    MB.Auth.init();
    MB.Tutor.init();
    MB.Sound.refreshUI();

    // pulihkan sesi bila sudah pernah masuk
    const key = MB.Store.getSession();
    const users = MB.Store.loadUsers();
    if (key && users[key]) {
      MB.startSession({ key, name: users[key].name, guest: false, data: MB.Store.normalize(users[key].data) });
    }
  });
})();
