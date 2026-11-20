/* =========================================================
   tutor.js — Tutor AI (tanya-jawab tentang balok)
   Online : pertanyaan dikirim ke /api/chat (server.js → Claude API).
   Offline: jika server/AI tidak tersedia, dipakai kalkulator balok lokal.
            Ini BUKAN AI, hanya menghitung dari angka yang kamu tulis.
   ========================================================= */
MB.Tutor = (function () {
  const $ = MB.ui.$;
  const history = []; // {role, content}
  let busy = false;
  let open = false;

  const CHIPS = {
    default: ["Apa bedanya rusuk dan sisi?", "Kenapa luas permukaan dikali 2?", "Beda diagonal bidang dan diagonal ruang?"],
    misi1: ["Bagaimana cara mengingat 12 rusuk?", "Bedanya rusuk dan diagonal apa?"],
    misi2: ["Cara cepat cek jaring-jaring benar?", "Kenapa jaring-jaring harus 6 persegi panjang?"],
    misi3: ["Kenapa volume dikalikan, bukan dijumlah?", "Satuan cm³ itu artinya apa?"],
    misi4: ["Kenapa ada 3 pasang sisi?", "Beda luas permukaan dan volume?"],
    misi5: ["Kenapa diagonal ruang pakai Pythagoras 2 kali?", "Beda diagonal bidang dan ruang?"],
    story: ["Cara tahu soal minta luas atau volume?", "Kata kunci soal luas permukaan apa saja?"],
    boss: ["Aku mau latihan soal mirip tapi angkanya beda"],
  };

  /* ---------- tampilan ---------- */
  function fmt(text) {
    return MB.ui
      .esc(text)
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/`([^`]+)`/g, "<code>$1</code>")
      .replace(/\n/g, "<br>");
  }

  function addMsg(role, text, raw) {
    const d = document.createElement("div");
    d.className = "tmsg tmsg--" + role;
    if (raw) d.innerHTML = text;
    else if (role === "user") d.textContent = text;
    else d.innerHTML = fmt(text);
    $("tutorLog").appendChild(d);
    $("tutorLog").scrollTop = $("tutorLog").scrollHeight;
    return d;
  }

  function setMode(kind) {
    const el = $("tutorMode");
    el.className = "tutor__mode " + (kind === "online" ? "is-online" : kind === "offline" ? "is-offline" : "");
    el.textContent = kind === "online" ? "AI online" : kind === "offline" ? "Mode kalkulator (offline)" : "Siap membantu";
  }

  function renderChips() {
    const view = MB.state.view;
    const list = CHIPS[view] || CHIPS.default;
    const host = $("tutorChips");
    host.innerHTML = "";
    list.forEach((q) => {
      const b = document.createElement("button");
      b.type = "button";
      b.textContent = q;
      b.addEventListener("click", () => ask(q));
      host.appendChild(b);
    });
  }

  function greet() {
    $("tutorLog").innerHTML = "";
    history.length = 0;
    addMsg(
      "ai",
      `Hai ${MB.state.name}! Aku **Tutor Balok**. Tanyakan apa saja soal balok: rusuk, jaring-jaring, volume, luas permukaan, atau diagonal. Kalau bingung soal di misi, ceritakan dulu yang sudah kamu coba ya, nanti kita cari bareng.`
    );
    setMode(null);
  }

  /* ---------- kalkulator offline ---------- */
  function num(v) {
    return parseFloat(String(v).replace(",", "."));
  }
  function grab(text, keys) {
    for (const k of keys) {
      const m = text.match(new RegExp("(?:^|[^a-z])" + k + "\\s*(?:=|:|sebesar|adalah)?\\s*(\\d+(?:[.,]\\d+)?)", "i"));
      if (m) return num(m[1]);
    }
    return null;
  }
  const f = (x) => (Number.isInteger(x) ? String(x) : String(Math.round(x * 100) / 100).replace(".", ","));

  function localSolve(q) {
    const t = q.toLowerCase();
    let p = grab(t, ["p", "panjang"]);
    let l = grab(t, ["l", "lebar"]);
    let h = grab(t, ["t", "tinggi"]);
    if (p == null || l == null || h == null) {
      // format "10 x 6 x 5"
      const m = t.match(/(\d+(?:[.,]\d+)?)\s*[x×*]\s*(\d+(?:[.,]\d+)?)\s*[x×*]\s*(\d+(?:[.,]\d+)?)/);
      if (m) [p, l, h] = [num(m[1]), num(m[2]), num(m[3])];
    }

    if (p != null && l != null && h != null) {
      const wantV = /volume|isi|tampung|muat/.test(t);
      const wantL = /luas|permukaan|kulit|lapis|cat|bungkus/.test(t);
      const wantD = /diagonal/.test(t);
      const wantR = /rusuk|kerangka|kawat/.test(t);
      const all = !(wantV || wantL || wantD || wantR);
      const out = [`Untuk balok **p = ${f(p)}, l = ${f(l)}, t = ${f(h)}**:`];
      if (wantV || all) out.push(`• Volume: V = p × l × t = ${f(p)} × ${f(l)} × ${f(h)} = **${f(p * l * h)}**`);
      if (wantL || all) out.push(`• Luas permukaan: L = 2(pl + pt + lt) = 2(${f(p * l)} + ${f(p * h)} + ${f(l * h)}) = **${f(2 * (p * l + p * h + l * h))}**`);
      if (wantD || all) {
        out.push(`• Diagonal alas: √(p² + l²) = √${f(p * p + l * l)} = **${f(Math.sqrt(p * p + l * l))}**`);
        out.push(`• Diagonal ruang: √(p² + l² + t²) = √${f(p * p + l * l + h * h)} = **${f(Math.sqrt(p * p + l * l + h * h))}**`);
      }
      if (wantR) out.push(`• Total panjang rusuk: 4(p + l + t) = 4 × ${f(p + l + h)} = **${f(4 * (p + l + h))}**`);
      return out.join("\n");
    }

    const concepts = [
      [/rusuk/, "**Rusuk** adalah garis pertemuan dua sisi. Balok punya **12 rusuk**: 4 panjang, 4 lebar, 4 tinggi."],
      [/titik sudut|sudut/, "**Titik sudut** adalah pertemuan tiga rusuk. Balok punya **8 titik sudut**."],
      [/diagonal/, "**Diagonal bidang** ada di permukaan (√(p² + l²) untuk alas). **Diagonal ruang** menembus dalam balok: d = √(p² + l² + t²). Ada 4 diagonal ruang."],
      [/volume/, "**Volume** = isi balok = banyaknya kubus satuan di dalamnya: V = p × l × t."],
      [/luas|permukaan/, "**Luas permukaan** = jumlah luas 6 sisi: L = 2(pl + pt + lt), karena sisi yang berhadapan sama besar."],
      [/jaring/, "**Jaring-jaring** balok = 6 persegi panjang yang jika dilipat membentuk balok. Sisi yang berhadapan harus sama ukuran dan tidak boleh menumpuk."],
      [/sisi/, "**Sisi** adalah bidang datar pembatas balok. Ada **6 sisi** dalam 3 pasang yang kongruen."],
    ];
    for (const [re, ans] of concepts) if (re.test(t)) return ans;
    return null;
  }

  /* ---------- tanya ---------- */
  async function askServer() {
    const cfg = MB.CONFIG.AI_ENDPOINT;
    if (!cfg || location.protocol === "file:") throw { offline: true };
    const ctl = new AbortController();
    const to = setTimeout(() => ctl.abort(), 35000);
    try {
      const res = await fetch(cfg, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history.slice(-12), context: { view: MB.state.view } }),
        signal: ctl.signal,
      });
      let data = {};
      try {
        data = await res.json();
      } catch (e) {}
      if (res.status === 404 || res.status === 405 || res.status === 503) throw { offline: true };
      if (!res.ok) throw { message: data.error || "Tutor sedang sibuk. Coba lagi sebentar." };
      return data.reply;
    } catch (e) {
      if (e && (e.offline || e.message)) throw e;
      if (e && e.name === "AbortError") throw { message: "Jawabannya terlalu lama. Coba kirim ulang pertanyaanmu." };
      throw { offline: true }; // gagal koneksi ke server
    } finally {
      clearTimeout(to);
    }
  }

  async function ask(text) {
    text = (text || "").trim();
    if (!text || busy) return;
    busy = true;
    $("tutorChips").classList.add("hidden");
    addMsg("user", text);
    history.push({ role: "user", content: text });
    const typing = addMsg("ai", "<i></i><i></i><i></i>", true);
    typing.classList.add("tmsg--typing");
    $("tutorInput").value = "";

    try {
      const reply = await askServer();
      typing.remove();
      addMsg("ai", reply);
      history.push({ role: "assistant", content: reply });
      setMode("online");
    } catch (e) {
      typing.remove();
      if (e.offline) {
        setMode("offline");
        const local = localSolve(text);
        if (local) {
          addMsg("ai", local);
          history.push({ role: "assistant", content: local });
        } else {
          history.pop();
          addMsg(
            "sys",
            "Tutor AI online belum aktif, jadi aku hanya bisa menghitung dari angka. Coba tulis seperti: <b>hitung volume balok p=10, l=6, t=5</b>. Untuk tanya-jawab bebas, minta gurumu menjalankan <code>node server.js</code> dengan API key.",
            true
          );
        }
      } else {
        history.pop();
        addMsg("sys", MB.ui.esc(e.message || "Terjadi kesalahan. Coba lagi."), true);
      }
    } finally {
      busy = false;
      $("tutorInput").focus();
    }
  }

  /* ---------- buka / tutup ---------- */
  function toggle(force) {
    open = typeof force === "boolean" ? force : !open;
    $("tutorPanel").classList.toggle("hidden", !open);
    $("tutorFab").classList.toggle("hidden", open);
    if (open) {
      if (!$("tutorLog").childElementCount) greet();
      renderChips();
      if ($("tutorChips").childElementCount && history.length === 0) $("tutorChips").classList.remove("hidden");
      setTimeout(() => $("tutorInput").focus(), 50);
    }
  }

  function init() {
    $("tutorForm").addEventListener("submit", (e) => {
      e.preventDefault();
      ask($("tutorInput").value);
    });
    $("tutorInput").addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        ask($("tutorInput").value);
      }
    });
  }

  MB.actions.toggleTutor = () => toggle();
  MB.actions.tutorClear = () => {
    greet();
    renderChips();
    $("tutorChips").classList.remove("hidden");
  };

  return { init, toggle, reset: () => { $("tutorLog").innerHTML = ""; history.length = 0; toggle(false); }, localSolve };
})();
