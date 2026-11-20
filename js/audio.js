/* =========================================================
   audio.js — musik latar & efek suara
   Dibuat langsung oleh browser (Web Audio API), jadi tidak perlu file mp3
   dan bebas hak cipta. Ada dua tema: "chill" (belajar) dan "boss" (tegang).
   ========================================================= */
MB.Sound = (function () {
  const PREF_KEY = "misibalok.audio.v1";
  const prefs = { music: true, sfx: true, vol: 0.5, track: "chill" };
  try {
    Object.assign(prefs, JSON.parse(localStorage.getItem(PREF_KEY) || "{}"));
  } catch (e) {}

  let ctx = null,
    master = null,
    musicBus = null,
    sfxBus = null,
    echo = null,
    noiseBuf = null;
  let timer = null,
    theme = "chill",
    step = 0,
    nextTime = 0,
    fileEl = null;

  const mf = (m) => 440 * Math.pow(2, (m - 69) / 12);
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

  /* Daftar lagu. "study" = bisa dipilih pemain; "boss" otomatis saat Boss Level. */
  const THEMES = {
    chill: {
      name: "Santai Pagi", desc: "Hangat & ringan", icon: "fa-sun", style: "chill", bpm: 92,
      chords: [[60, 64, 67], [57, 60, 64], [53, 57, 60], [55, 59, 62]],
      scale: [72, 74, 76, 79, 81, 84], arp: [0, 1, 2, 1, 2, 1, 2, 1],
    },
    lofi: {
      name: "Lo-fi Malam", desc: "Pelan, cocok buat fokus", icon: "fa-moon", style: "lofi", bpm: 74,
      chords: [[57, 60, 64, 67], [53, 57, 60, 64], [50, 53, 57, 60], [52, 56, 59, 62]],
      scale: [69, 72, 74, 76, 79, 81],
    },
    adventure: {
      name: "Petualangan", desc: "Ceria & bersemangat", icon: "fa-compass", style: "adventure", bpm: 112,
      chords: [[60, 64, 67], [55, 59, 62], [57, 60, 64], [53, 57, 60]],
      scale: [72, 74, 76, 79, 81, 84],
    },
    cosmic: {
      name: "Kosmik", desc: "Luas & melayang, tanpa drum", icon: "fa-satellite", style: "ambient", bpm: 60,
      chords: [[62, 65, 69], [58, 62, 65], [55, 58, 62], [57, 61, 64]],
      scale: [74, 77, 79, 81, 84, 86],
    },
    arcade: {
      name: "Arcade 8-bit", desc: "Gaya game jadul", icon: "fa-gamepad", style: "chip", bpm: 128,
      chords: [[60, 64, 67], [55, 59, 62], [57, 60, 64], [53, 57, 60]],
      scale: [72, 76, 79, 84, 88],
    },
    boss: {
      name: "Golem Balok", desc: "Otomatis saat Boss Level", icon: "fa-dragon", style: "boss", bpm: 138,
      chords: [[57, 60, 64], [57, 60, 64], [53, 57, 60], [52, 56, 59]],
      scale: [69, 72, 74, 76, 79, 81], arp: [0, 2, 1, 2, 0, 2, 1, 2],
    },
  };
  const STUDY_TRACKS = ["chill", "lofi", "adventure", "cosmic", "arcade"];
  if (!STUDY_TRACKS.includes(prefs.track)) prefs.track = "chill";
  let mode = "study"; // "study" | "boss"
  theme = prefs.track;

  function save() {
    try {
      localStorage.setItem(PREF_KEY, JSON.stringify(prefs));
    } catch (e) {}
  }

  function ensureCtx() {
    if (ctx) return true;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = prefs.vol;
    master.connect(ctx.destination);
    musicBus = ctx.createGain();
    musicBus.gain.value = 0.55;
    musicBus.connect(master);
    sfxBus = ctx.createGain();
    sfxBus.gain.value = 0.9;
    sfxBus.connect(master);

    // gema (echo) agar suara terasa luas
    echo = ctx.createDelay(1);
    echo.delayTime.value = 0.32;
    const fb = ctx.createGain();
    fb.gain.value = 0.34;
    const wet = ctx.createGain();
    wet.gain.value = 0.38;
    echo.connect(fb);
    fb.connect(echo);
    echo.connect(wet);
    wet.connect(musicBus);

    // buffer noise untuk hi-hat
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 0.2, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return true;
  }

  function note(freq, t, dur, o = {}) {
    const { type = "sine", vol = 0.2, attack = 0.01, rel = 0.1, dest = musicBus, send = 0 } = o;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur + rel);
    osc.connect(g);
    g.connect(dest);
    if (send) {
      const s = ctx.createGain();
      s.gain.value = send;
      g.connect(s);
      s.connect(echo);
    }
    osc.start(t);
    osc.stop(t + dur + rel + 0.05);
  }

  function kick(t) {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.frequency.setValueAtTime(130, t);
    osc.frequency.exponentialRampToValueAtTime(40, t + 0.12);
    g.gain.setValueAtTime(0.55, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
    osc.connect(g);
    g.connect(musicBus);
    osc.start(t);
    osc.stop(t + 0.2);
  }

  function hat(t, vol) {
    const src = ctx.createBufferSource();
    src.buffer = noiseBuf;
    const hp = ctx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 7000;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
    src.connect(hp);
    hp.connect(g);
    g.connect(musicBus);
    src.start(t);
    src.stop(t + 0.06);
  }

  function playStep(s, t) {
    const T = THEMES[theme];
    const bar = Math.floor(s / 8) % T.chords.length;
    const pos = s % 8;
    const ch = T.chords[bar];
    const beat = 60 / T.bpm;
    const rnd = Math.random();

    switch (T.style) {
      case "chill":
        if (pos === 0 || pos === 4) note(mf(ch[0] - 24), t, beat * 1.6, { type: "sine", vol: 0.3 });
        if (pos === 0) ch.forEach((n) => note(mf(n), t, beat * 3.6, { type: "triangle", vol: 0.045, attack: 0.5, rel: 0.7 }));
        note(mf(ch[T.arp[pos]] + 12), t, beat * 0.45, { type: "triangle", vol: 0.085, send: 0.45 });
        if ((pos === 0 || pos === 3 || pos === 6) && rnd < 0.55) note(mf(pick(T.scale)), t, beat * 0.9, { type: "sine", vol: 0.1, send: 0.65 });
        break;

      case "lofi": // akor jazz lembut, bass bulat, ketukan santai
        if (pos === 0) kick(t);
        if (pos === 4) kick(t);
        if (pos === 2 || pos === 6) hat(t, 0.045);
        if (pos === 0 || pos === 5) note(mf(ch[0] - 24), t, beat * 1.3, { type: "sine", vol: 0.32 });
        if (pos === 0 || pos === 3 || pos === 6)
          ch.forEach((n) => note(mf(n), t, beat * 1.1, { type: "triangle", vol: 0.05, attack: 0.03, rel: 0.5, send: 0.2 }));
        if ((pos === 1 || pos === 4 || pos === 7) && rnd < 0.5) note(mf(pick(T.scale)), t, beat * 0.8, { type: "sine", vol: 0.09, send: 0.5 });
        break;

      case "adventure": // bass melompat, melodi ceria
        if (pos % 2 === 0) note(mf(ch[pos % 4 === 0 ? 0 : 2] - 24), t, beat * 0.5, { type: "triangle", vol: 0.24, rel: 0.05 });
        if (pos === 0 || pos === 4) kick(t);
        if (pos % 2 === 1) hat(t, 0.06);
        note(mf(ch[[0, 1, 2, 1, 0, 1, 2, 1][pos]] + 12), t, beat * 0.35, { type: "triangle", vol: 0.08, send: 0.25 });
        if (pos % 2 === 0 && rnd < 0.8) note(mf(pick(T.scale)), t, beat * 0.7, { type: "square", vol: 0.05, send: 0.3 });
        break;

      case "ambient": // pad panjang + denting jarang, tanpa drum
        if (pos === 0) {
          ch.forEach((n, i) => note(mf(n - 12 + (i === 0 ? -12 : 0)), t, beat * 7, { type: "sine", vol: 0.07, attack: 1.6, rel: 1.6 }));
          note(mf(ch[0] - 24), t, beat * 6, { type: "sine", vol: 0.2, attack: 1, rel: 1.2 });
        }
        if (rnd < 0.28) note(mf(pick(T.scale)), t, beat * 1.5, { type: "sine", vol: 0.08, attack: 0.02, rel: 1.2, send: 0.85 });
        break;

      case "chip": // gaya 8-bit: pulsa kotak cepat
        note(mf(ch[0] - 12 - (pos % 2 ? 12 : 0)), t, beat * 0.4, { type: "triangle", vol: 0.22, rel: 0.04 });
        note(mf(ch[[0, 1, 2, 1, 2, 1, 0, 2][pos]] + 12), t, beat * 0.3, { type: "square", vol: 0.04 });
        if (pos === 0 || pos === 4) kick(t);
        if (pos % 2 === 1) hat(t, 0.07);
        if ((pos === 0 || pos === 3 || pos === 5) && rnd < 0.7) note(mf(pick(T.scale)), t, beat * 0.5, { type: "square", vol: 0.055, send: 0.15 });
        break;

      default: // boss
        if (pos === 0 || pos === 3 || pos === 4) kick(t);
        hat(t, pos % 2 ? 0.1 : 0.05);
        note(mf(ch[0] - 24), t, beat * 0.4, { type: "sawtooth", vol: 0.11, rel: 0.05 });
        note(mf(ch[T.arp[pos]] + 12), t, beat * 0.3, { type: "square", vol: 0.045, send: 0.2 });
        if ((pos === 0 || pos === 4) && rnd < 0.75) note(mf(pick(T.scale)), t, beat * 0.9, { type: "sawtooth", vol: 0.055, send: 0.3 });
    }
  }

  function applyTheme(force) {
    const wanted = mode === "boss" ? "boss" : prefs.track;
    if (wanted === theme && !force) return;
    theme = wanted;
    step = 0;
    if (ctx) nextTime = ctx.currentTime + 0.1;
    if (MB.CONFIG.BGM_FILES[theme] || fileEl) {
      stop();
      start();
    }
    fadeIn();
    updateButton();
  }

  function schedule() {
    if (!ctx) return;
    while (nextTime < ctx.currentTime + 0.2) {
      playStep(step, nextTime);
      nextTime += 60 / THEMES[theme].bpm / 2;
      step++;
    }
  }

  /* ----- opsi: pakai file audio buatan sendiri ----- */
  function startFile() {
    const src = MB.CONFIG.BGM_FILES[theme];
    if (!src) return false;
    if (fileEl) fileEl.pause();
    fileEl = new window.Audio(src);
    fileEl.loop = true;
    fileEl.volume = prefs.vol;
    fileEl.addEventListener("error", () => {
      fileEl = null;
      startSynth();
    });
    fileEl.play().catch(() => {});
    return true;
  }

  function startSynth() {
    if (!ensureCtx()) return;
    ctx.resume();
    if (!timer) {
      step = 0;
      nextTime = ctx.currentTime + 0.1;
      timer = setInterval(schedule, 50);
    }
  }

  function start() {
    if (!prefs.music) return;
    if (!startFile()) startSynth();
    updateButton();
  }

  function stop() {
    if (timer) clearInterval(timer);
    timer = null;
    if (fileEl) {
      fileEl.pause();
      fileEl = null;
    }
    updateButton();
  }

  function fadeIn() {
    if (!ctx) return;
    const t = ctx.currentTime;
    musicBus.gain.cancelScheduledValues(t);
    musicBus.gain.setValueAtTime(0.0001, t);
    musicBus.gain.linearRampToValueAtTime(0.55, t + 1.2);
  }

  function renderTrackList() {
    const host = document.getElementById("trackList");
    if (!host) return;
    host.innerHTML = STUDY_TRACKS.map((id) => {
      const t = THEMES[id];
      const active = id === prefs.track;
      return `<button class="track${active ? " is-active" : ""}" data-action="pickTrack" data-arg="${id}" type="button">
        <span class="track__ic"><i class="fa-solid ${active && prefs.music ? "fa-volume-high" : t.icon}"></i></span>
        <span class="track__tx"><b>${t.name}</b><small>${t.desc}</small></span>
        ${active ? '<i class="fa-solid fa-check track__ck"></i>' : ""}
      </button>`;
    }).join("") + `<div class="track track--auto"><span class="track__ic"><i class="fa-solid ${THEMES.boss.icon}"></i></span><span class="track__tx"><b>${THEMES.boss.name}</b><small>${THEMES.boss.desc}</small></span></div>`;
  }

  function updateButton() {
    const btn = document.getElementById("musicBtn");
    if (btn) {
      btn.classList.toggle("is-on", prefs.music);
      btn.classList.toggle("is-off", !prefs.music);
      btn.innerHTML = `<i class="fa-solid ${prefs.music ? "fa-music" : "fa-volume-xmark"}"></i>`;
    }
    const sfx = document.getElementById("sfxState");
    if (sfx) sfx.textContent = prefs.sfx ? "Hidup" : "Mati";
    const ms = document.getElementById("musicState");
    if (ms) ms.textContent = prefs.music ? "Hidup" : "Mati";
    renderTrackList();
    const vs = document.getElementById("volumeSlider");
    if (vs) vs.value = Math.round(prefs.vol * 100);
  }

  /* ----- efek suara ----- */
  const SFX = {
    click: (t) => note(520, t, 0.04, { type: "triangle", vol: 0.12, dest: sfxBus, rel: 0.05 }),
    correct: (t) => [659, 880, 1047].forEach((f, i) => note(f, t + i * 0.09, 0.12, { type: "triangle", vol: 0.18, dest: sfxBus })),
    wrong: (t) => {
      note(190, t, 0.22, { type: "sawtooth", vol: 0.13, dest: sfxBus });
      note(140, t + 0.14, 0.28, { type: "sawtooth", vol: 0.13, dest: sfxBus });
    },
    complete: (t) => [523, 659, 784, 1047].forEach((f, i) => note(f, t + i * 0.1, 0.18, { type: "triangle", vol: 0.2, dest: sfxBus })),
    unlock: (t) => {
      [392, 523, 659, 784, 1047, 1319].forEach((f, i) => note(f, t + i * 0.09, 0.2, { type: "square", vol: 0.09, dest: sfxBus }));
      note(1568, t + 0.6, 0.5, { type: "sine", vol: 0.12, dest: sfxBus });
    },
    locked: (t) => {
      note(210, t, 0.1, { type: "square", vol: 0.1, dest: sfxBus });
      note(160, t + 0.14, 0.14, { type: "square", vol: 0.1, dest: sfxBus });
    },
    hurt: (t) => note(110, t, 0.3, { type: "sine", vol: 0.4, dest: sfxBus, rel: 0.2 }),
    over: (t) => [392, 330, 262, 196].forEach((f, i) => note(f, t + i * 0.22, 0.3, { type: "triangle", vol: 0.2, dest: sfxBus })),
    win: (t) => {
      [523, 659, 784, 1047, 784, 1047, 1319].forEach((f, i) => note(f, t + i * 0.12, 0.22, { type: "square", vol: 0.09, dest: sfxBus }));
      [262, 330, 392].forEach((f) => note(f, t + 0.1, 1.2, { type: "triangle", vol: 0.12, dest: sfxBus }));
    },
  };

  return {
    /* dipanggil pada gestur pertama pengguna (aturan autoplay browser) */
    unlock() {
      if (!ensureCtx()) return;
      if (ctx.state === "suspended") ctx.resume();
      if (prefs.music && !timer && !fileEl) {
        start();
        fadeIn();
      }
    },
    /* konteks: "boss" memakai lagu boss; selain itu memakai lagu pilihan pemain */
    setTheme(name) {
      mode = name === "boss" ? "boss" : "study";
      applyTheme();
    },
    setTrack(id) {
      if (!STUDY_TRACKS.includes(id)) return;
      prefs.track = id;
      prefs.music = true;
      save();
      applyTheme(true);
      if (!timer && !fileEl) start();
      fadeIn();
      updateButton();
    },
    tracks: () => STUDY_TRACKS.map((id) => Object.assign({ id }, THEMES[id])),
    sfx(name) {
      if (!prefs.sfx || !SFX[name] || !ensureCtx()) return;
      if (ctx.state === "suspended") ctx.resume();
      SFX[name](ctx.currentTime + 0.01);
    },
    toggleMusic() {
      prefs.music = !prefs.music;
      save();
      if (prefs.music) {
        start();
        fadeIn();
      } else stop();
      updateButton();
    },
    toggleSfx() {
      prefs.sfx = !prefs.sfx;
      save();
      updateButton();
    },
    setVolume(v) {
      prefs.vol = Math.max(0, Math.min(1, v));
      if (master) master.gain.value = prefs.vol;
      if (fileEl) fileEl.volume = prefs.vol;
      save();
    },
    refreshUI: updateButton,
    pauseAll() {
      if (ctx && ctx.state === "running") ctx.suspend();
      if (fileEl) fileEl.pause();
    },
    resumeAll() {
      if (ctx && ctx.state === "suspended" && prefs.music) ctx.resume();
      if (fileEl && prefs.music) fileEl.play().catch(() => {});
    },
  };
})();

document.addEventListener("visibilitychange", () => {
  if (document.hidden) MB.Sound.pauseAll();
  else MB.Sound.resumeAll();
});
