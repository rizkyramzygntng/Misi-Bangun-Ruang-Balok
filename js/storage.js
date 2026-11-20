/* =========================================================
   storage.js — penyimpanan akun & progres (localStorage)
   + state aplikasi dan fungsi bantu skor/unlock
   ========================================================= */
(function () {
  const KEY_USERS = "misibalok.users.v1";
  const KEY_SESSION = "misibalok.session.v1";

  let memory = {}; // cadangan bila localStorage tidak tersedia (mis. mode privat)
  let available = true;
  try {
    localStorage.setItem("__t", "1");
    localStorage.removeItem("__t");
  } catch (e) {
    available = false;
  }

  function read(key) {
    try {
      const raw = available ? localStorage.getItem(key) : memory[key];
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }
  function write(key, value) {
    const raw = JSON.stringify(value);
    try {
      if (available) localStorage.setItem(key, raw);
      else memory[key] = raw;
    } catch (e) {
      memory[key] = raw;
    }
  }

  function defaultData() {
    return {
      progress: { misi1: false, misi2: false, misi3: false, misi4: false, misi5: false, story: false },
      wrongs: { misi1: 0, misi2: 0, misi3: 0, misi4: 0, misi5: 0, story: 0 }, // salah sebelum misi tuntas
      bossBest: 0, // skor boss terbaik (0–75)
      bossDone: false, // pernah mengalahkan boss
      bossWrong: {}, // jumlah salah per level pada ronde terakhir yang tuntas
      bossRuns: 0,
      updatedAt: Date.now(),
    };
  }

  MB.Store = {
    available: () => available,
    defaultData,
    loadUsers: () => read(KEY_USERS) || {},
    saveUsers: (u) => write(KEY_USERS, u),
    getSession: () => read(KEY_SESSION),
    setSession: (key) => write(KEY_SESSION, key),
    clearSession() {
      try {
        if (available) localStorage.removeItem(KEY_SESSION);
      } catch (e) {}
      delete memory[KEY_SESSION];
    },
    saveUserData(key, data) {
      const users = this.loadUsers();
      if (!users[key]) return;
      data.updatedAt = Date.now();
      users[key].data = data;
      this.saveUsers(users);
    },
    /* menambal data lama bila ada kunci baru */
    normalize(data) {
      const d = defaultData();
      if (!data) return d;
      d.progress = Object.assign(d.progress, data.progress || {});
      d.wrongs = Object.assign(d.wrongs, data.wrongs || {});
      d.bossBest = Number(data.bossBest) || 0;
      d.bossDone = !!data.bossDone;
      d.bossWrong = data.bossWrong || {};
      d.bossRuns = Number(data.bossRuns) || 0;
      return d;
    },
  };

  /* ---------- State sesi berjalan ---------- */
  MB.state = {
    key: null, // kunci akun (huruf kecil); null untuk tamu
    name: "Tamu",
    guest: true,
    data: null, // data progres aktif
    view: "hub",
  };

  MB.save = function () {
    if (MB.state.key && MB.state.data) MB.Store.saveUserData(MB.state.key, MB.state.data);
  };

  MB.missionsDone = () => MB.MISSIONS.filter((m) => MB.state.data.progress[m]).length;
  MB.isBossUnlocked = () => MB.missionsDone() >= MB.CONFIG.BOSS_REQUIRED_MISSIONS;
  /* Poin yang bisa/akan didapat dari satu misi: 20 dikurangi 5 tiap salah (minimal 5) */
  MB.potential = (id, data) => {
    const d = data || MB.state.data;
    const C = MB.CONFIG;
    return Math.max(C.MIN_TASK_POINTS, C.POINTS_PER_TASK - C.PENALTY_PER_WRONG * ((d.wrongs && d.wrongs[id]) || 0));
  };
  MB.scoreOf = (data) =>
    MB.TASKS.filter((t) => data.progress[t]).reduce((sum, t) => sum + MB.potential(t, data), 0) + (data.bossBest || 0);
  MB.score = () => MB.scoreOf(MB.state.data);
})();
