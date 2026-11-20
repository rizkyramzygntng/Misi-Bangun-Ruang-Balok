/* =========================================================
   auth.js — daftar, masuk, tamu, keluar
   Akun disimpan di localStorage browser ini (tanpa server).
   Kata sandi tidak disimpan polos: di-hash PBKDF2-SHA256 + salt.
   ========================================================= */
MB.Auth = (function () {
  const $ = MB.ui.$;
  let mode = "login";

  const hex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
  const randomSalt = () => {
    const a = new Uint8Array(16);
    (window.crypto || {}).getRandomValues ? crypto.getRandomValues(a) : a.forEach((_, i) => (a[i] = Math.floor(Math.random() * 256)));
    return hex(a);
  };

  async function hash(pw, salt) {
    try {
      if (window.crypto && crypto.subtle) {
        const enc = new TextEncoder();
        const key = await crypto.subtle.importKey("raw", enc.encode(pw), "PBKDF2", false, ["deriveBits"]);
        const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", salt: enc.encode(salt), iterations: 100000, hash: "SHA-256" }, key, 256);
        return "p1:" + hex(bits);
      }
    } catch (e) {}
    let h1 = 5381, h2 = 52711;
    const s = salt + pw;
    for (let i = 0; i < s.length; i++) {
      h1 = (h1 * 33) ^ s.charCodeAt(i);
      h2 = (h2 * 31 + s.charCodeAt(i)) | 0;
    }
    return "f1:" + (h1 >>> 0).toString(16) + (h2 >>> 0).toString(16);
  }

  function setError(msg) {
    const el = $("authError");
    if (!msg) return el.classList.add("hidden");
    el.textContent = msg;
    el.classList.remove("hidden");
  }

  function validateName(name) {
    if (name.length < 3) return "Nama pengguna minimal 3 karakter.";
    if (!/^[A-Za-z0-9_. -]+$/.test(name)) return "Nama pengguna hanya boleh huruf, angka, spasi, titik, garis bawah, dan strip.";
    return null;
  }

  async function submit(e) {
    e.preventDefault();
    setError("");
    MB.Sound.unlock();
    const name = $("authName").value.trim();
    const pw = $("authPass").value;
    const nameErr = validateName(name);
    if (nameErr) return setError(nameErr);
    if (pw.length < MB.CONFIG.PASSWORD_MIN) return setError(`Kata sandi minimal ${MB.CONFIG.PASSWORD_MIN} karakter.`);

    const key = name.toLowerCase();
    const users = MB.Store.loadUsers();
    const btn = $("authSubmit");
    btn.disabled = true;
    try {
      if (mode === "register") {
        if (pw !== $("authPass2").value) return setError("Kata sandi dan ulangannya tidak sama.");
        if (users[key]) return setError("Nama pengguna sudah dipakai. Pilih nama lain atau masuk.");
        const salt = randomSalt();
        users[key] = { name, salt, hash: await hash(pw, salt), createdAt: Date.now(), data: MB.Store.defaultData() };
        MB.Store.saveUsers(users);
        MB.Store.setSession(key);
        MB.startSession({ key, name, guest: false, data: users[key].data });
        MB.ui.toast(`Akun dibuat. Selamat datang, ${MB.ui.esc(name)}!`, "party-horn", "gold");
      } else {
        const u = users[key];
        if (!u || (await hash(pw, u.salt)) !== u.hash) return setError("Nama pengguna atau kata sandi salah.");
        MB.Store.setSession(key);
        MB.startSession({ key, name: u.name, guest: false, data: MB.Store.normalize(u.data) });
        MB.ui.toast(`Selamat datang kembali, ${MB.ui.esc(u.name)}!`, "hand", "gold");
      }
    } finally {
      btn.disabled = false;
    }
  }

  MB.actions.authTab = (el) => {
    mode = el.dataset.arg;
    $("tabLogin").classList.toggle("is-active", mode === "login");
    $("tabRegister").classList.toggle("is-active", mode === "register");
    $("authPass2Wrap").classList.toggle("hidden", mode !== "register");
    $("authSubmit").textContent = mode === "login" ? "Masuk" : "Buat Akun";
    $("authPass").autocomplete = mode === "login" ? "current-password" : "new-password";
    setError("");
  };

  MB.actions.togglePass = (el) => {
    const inp = $("authPass");
    const showing = inp.type === "text";
    inp.type = showing ? "password" : "text";
    el.innerHTML = `<i class="fa-solid ${showing ? "fa-eye" : "fa-eye-slash"}"></i>`;
  };

  MB.actions.guestLogin = () => {
    MB.Sound.unlock();
    MB.Store.clearSession();
    MB.startSession({ key: null, name: "Tamu", guest: true, data: MB.Store.defaultData() });
  };

  MB.actions.logout = () => {
    const out = () => {
      MB.Store.clearSession();
      MB.state.key = null;
      MB.state.data = null;
      MB.ui.closeUserMenu();
      MB.Tutor.reset();
      $("app").classList.add("hidden");
      $("authScreen").classList.remove("hidden");
      $("authPass").value = "";
      $("authPass2").value = "";
      MB.actions.authTab({ dataset: { arg: "login" } });
    };
    if (MB.state.guest) MB.ui.confirmBox("Keluar dari mode tamu?", "Progres mode tamu tidak disimpan dan akan hilang.", out, "Keluar");
    else out();
  };

  function init() {
    $("authForm").addEventListener("submit", submit);
  }

  return { init };
})();
