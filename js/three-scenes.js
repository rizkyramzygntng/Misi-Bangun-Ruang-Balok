/* =========================================================
   three-scenes.js — semua adegan 3D (Three.js r128)
   Setiap misi punya builder; scene dibuat saat layar pertama kali dibuka.
   ========================================================= */
MB.three = (function () {
  const registry = {};
  const api = {};
  let looping = false;

  const COL = { tb: 0x3b82f6, fb: 0x10b981, lr: 0xf59e0b };
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const defaultCam = () => new THREE.Vector3(5, 3.6, 7);

  function fallback(container, msg) {
    container.innerHTML = `<div class="canvas-fallback"><i class="fa-solid fa-triangle-exclamation"></i><p>${msg}</p></div>`;
  }

  function addTools(ctx) {
    const tools = document.createElement("div");
    tools.className = "canvas-tools";
    tools.innerHTML = `
      <button type="button" data-t="in" title="Perbesar"><i class="fa-solid fa-plus"></i></button>
      <button type="button" data-t="out" title="Perkecil"><i class="fa-solid fa-minus"></i></button>
      <button type="button" data-t="reset" title="Reset sudut"><i class="fa-solid fa-arrow-rotate-left"></i></button>`;
    tools.addEventListener("pointerdown", (e) => e.stopPropagation());
    tools.addEventListener("click", (e) => {
      const b = e.target.closest("button");
      if (!b) return;
      const t = b.dataset.t;
      if (t === "reset") {
        ctx.group.rotation.set(0, 0, 0);
        ctx.camera.position.copy(defaultCam());
      } else {
        const f = t === "in" ? 0.85 : 1.18;
        const len = ctx.camera.position.length() * f;
        if (len > 3.5 && len < 17) ctx.camera.position.multiplyScalar(f);
      }
      ctx.camera.lookAt(0, 0, 0);
    });
    ctx.container.appendChild(tools);
  }

  function init(view) {
    const container = document.getElementById("canvas-" + view);
    if (!container) return null;
    if (!window.THREE) {
      fallback(container, "Pustaka 3D belum termuat. Periksa koneksi internet lalu muat ulang halaman.");
      return null;
    }
    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch (e) {
      fallback(container, "Browser/perangkat ini tidak mendukung WebGL, jadi balok 3D tidak bisa ditampilkan.");
      return null;
    }
    container.innerHTML = "";
    const w = container.clientWidth || 420;
    const h = container.clientHeight || 340;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 100);
    camera.position.copy(defaultCam());
    camera.lookAt(0, 0, 0);

    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    container.appendChild(renderer.domElement);

    scene.add(new THREE.AmbientLight(0xffffff, 0.8));
    const d1 = new THREE.DirectionalLight(0xffffff, 0.9);
    d1.position.set(5, 10, 7);
    scene.add(d1);
    const d2 = new THREE.DirectionalLight(0x88aaff, 0.35);
    d2.position.set(-6, -3, -5);
    scene.add(d2);

    const grid = new THREE.GridHelper(12, 12, 0x3b4a8f, 0x232c5e);
    grid.position.y = -1.7;
    scene.add(grid);

    const group = new THREE.Group();
    scene.add(group);

    const ctx = { view, container, scene, camera, renderer, group, dragging: false, last: { x: 0, y: 0 } };

    container.addEventListener("pointerdown", (e) => {
      ctx.dragging = true;
      ctx.last = { x: e.clientX, y: e.clientY };
      try {
        container.setPointerCapture(e.pointerId);
      } catch (err) {}
    });
    container.addEventListener("pointermove", (e) => {
      if (!ctx.dragging) return;
      group.rotation.y += (e.clientX - ctx.last.x) * 0.01;
      group.rotation.x = clamp(group.rotation.x + (e.clientY - ctx.last.y) * 0.01, -1.4, 1.4);
      ctx.last = { x: e.clientX, y: e.clientY };
    });
    const end = () => (ctx.dragging = false);
    container.addEventListener("pointerup", end);
    container.addEventListener("pointercancel", end);

    addTools(ctx);
    registry[view] = ctx;
    startLoop();
    return ctx;
  }

  function startLoop() {
    if (looping) return;
    looping = true;
    (function loop() {
      requestAnimationFrame(loop);
      for (const id in registry) {
        const c = registry[id];
        if (c.container.offsetParent === null) continue; // layar sedang tersembunyi
        if (!c.dragging) c.group.rotation.y += 0.004;
        c.renderer.render(c.scene, c.camera);
      }
    })();
    window.addEventListener("resize", () => {
      for (const id in registry) {
        const c = registry[id];
        const w = c.container.clientWidth;
        const h = c.container.clientHeight;
        if (!w || !h) continue;
        c.camera.aspect = w / h;
        c.camera.updateProjectionMatrix();
        c.renderer.setSize(w, h);
      }
    });
  }

  /* ---------- helper geometri ---------- */
  function cylinderBetween(a, b, radius, mat) {
    const dir = new THREE.Vector3().subVectors(b, a);
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, dir.length(), 10), mat);
    mesh.position.copy(a).add(b).multiplyScalar(0.5);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
    return mesh;
  }

  function makeLabel(text, color = "#ffffff", wide = false) {
    const c = document.createElement("canvas");
    c.width = wide ? 192 : 64;
    c.height = 64;
    const g = c.getContext("2d");
    g.font = "800 38px Nunito, Arial, sans-serif";
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.lineWidth = 6;
    g.strokeStyle = "rgba(8,10,30,.9)";
    g.strokeText(text, c.width / 2, 34);
    g.fillStyle = color;
    g.fillText(text, c.width / 2, 34);
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthTest: false }));
    sp.scale.set(wide ? 1.2 : 0.4, 0.4, 1);
    return sp;
  }

  function outline(mesh, geo, opacity = 0.7) {
    mesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo), new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity })));
  }

  /* [kanan, kiri, atas, bawah, depan, belakang] sesuai urutan BoxGeometry */
  function faceMaterials(opacity) {
    return [COL.lr, COL.lr, COL.tb, COL.tb, COL.fb, COL.fb].map(
      (c) => new THREE.MeshPhongMaterial({ color: c, transparent: true, opacity })
    );
  }

  /* =========================================================
     BUILDERS
     ========================================================= */
  const builders = {
    /* ---------- Misi 1: unsur balok ---------- */
    misi1(ctx) {
      const g = ctx.group;
      const p = 3.6, l = 2.2, t = 2.0;
      const hp = p / 2, ht = t / 2, hl = l / 2;
      const V = [
        [-hp, -ht, -hl], [hp, -ht, -hl], [hp, ht, -hl], [-hp, ht, -hl],
        [-hp, -ht, hl], [hp, -ht, hl], [hp, ht, hl], [-hp, ht, hl],
      ].map((a) => new THREE.Vector3(a[0], a[1], a[2]));

      const faceMats = faceMaterials(0.85);
      g.add(new THREE.Mesh(new THREE.BoxGeometry(p, t, l), faceMats));

      const neutral = 0x94a3b8;
      const edgeMats = {
        p: new THREE.MeshBasicMaterial({ color: neutral, transparent: true }),
        l: new THREE.MeshBasicMaterial({ color: neutral, transparent: true }),
        t: new THREE.MeshBasicMaterial({ color: neutral, transparent: true }),
      };
      const pairs = {
        p: [[0, 1], [3, 2], [4, 5], [7, 6]],
        l: [[0, 4], [1, 5], [2, 6], [3, 7]],
        t: [[0, 3], [1, 2], [4, 7], [5, 6]],
      };
      Object.keys(pairs).forEach((k) => pairs[k].forEach(([a, b]) => g.add(cylinderBetween(V[a], V[b], 0.04, edgeMats[k]))));

      const vGroup = new THREE.Group();
      const sph = new THREE.SphereGeometry(0.13, 16, 16);
      const sphMat = new THREE.MeshStandardMaterial({ color: 0xfbbf24, emissive: 0xb45309 });
      "ABCDEFGH".split("").forEach((ch, i) => {
        const s = new THREE.Mesh(sph, sphMat);
        s.position.copy(V[i]);
        vGroup.add(s);
        const lab = makeLabel(ch, "#fde68a");
        lab.position.copy(V[i]).multiplyScalar(1.22);
        vGroup.add(lab);
      });
      g.add(vGroup);

      const dGroup = new THREE.Group();
      const dMat = new THREE.MeshBasicMaterial({ color: 0xfb7185 });
      [[0, 6], [1, 7], [2, 4], [3, 5]].forEach(([a, b]) => dGroup.add(cylinderBetween(V[a], V[b], 0.03, dMat)));
      g.add(dGroup);

      const typeColor = { p: 0xfbbf24, l: 0x34d399, t: 0xff5ca8 };
      function setMode(mode) {
        const op = { sisi: 0.85, rusuk: 0.07, sudut: 0.12, diagonal: 0.14 }[mode];
        faceMats.forEach((m) => (m.opacity = op));
        const colored = mode === "rusuk";
        Object.keys(edgeMats).forEach((k) => {
          edgeMats[k].color.setHex(colored ? typeColor[k] : neutral);
          edgeMats[k].opacity = colored ? 1 : mode === "sisi" ? 0.55 : 0.4;
        });
        vGroup.visible = mode === "sudut";
        dGroup.visible = mode === "diagonal";
      }
      setMode("sisi");
      return { setMode };
    },

    /* ---------- Misi 2: buka-lipat jaring-jaring ---------- */
    misi2(ctx) {
      const p = 3.0, l = 2.0, t = 1.4;
      const inner = new THREE.Group();
      inner.position.set(0, -t / 2, 1.0);
      ctx.group.add(inner);

      const mat = (c) => new THREE.MeshStandardMaterial({ color: c, side: THREE.DoubleSide });

      // alas (tetap di tempat)
      const baseGeo = new THREE.PlaneGeometry(p, l);
      const base = new THREE.Mesh(baseGeo, mat(COL.tb));
      base.rotation.x = Math.PI / 2;
      inner.add(base);
      const baseOutline = new THREE.Group();
      baseOutline.rotation.x = Math.PI / 2;
      outline(baseOutline, baseGeo);
      inner.add(baseOutline);

      function flap(w, h, color, pos) {
        const geo = new THREE.PlaneGeometry(w, h);
        geo.translate(0, h / 2, 0);
        const grp = new THREE.Group();
        grp.position.set(pos.x, pos.y, pos.z);
        const m = new THREE.Mesh(geo, mat(color));
        outline(m, geo);
        grp.add(m);
        return { grp, geo };
      }

      const front = flap(p, t, COL.fb, { x: 0, y: 0, z: l / 2 });
      const back = flap(p, t, COL.fb, { x: 0, y: 0, z: -l / 2 });
      const top = flap(p, l, COL.tb, { x: 0, y: t, z: 0 });
      back.grp.add(top.grp); // tutup menempel di sisi belakang

      const sideGeo = () => {
        const geo = new THREE.PlaneGeometry(l, t);
        geo.translate(0, t / 2, 0);
        geo.rotateY(Math.PI / 2);
        return geo;
      };
      const mkSide = (x) => {
        const geo = sideGeo();
        const grp = new THREE.Group();
        grp.position.set(x, 0, 0);
        const m = new THREE.Mesh(geo, mat(COL.lr));
        outline(m, geo);
        grp.add(m);
        return grp;
      };
      const left = mkSide(-p / 2);
      const right = mkSide(p / 2);

      [front.grp, back.grp, left, right].forEach((o) => inner.add(o));

      function setUnfold(f) {
        const h = Math.PI / 2;
        front.grp.rotation.x = h * f;
        back.grp.rotation.x = -h * f;
        top.grp.rotation.x = h * (1 - f);
        left.rotation.z = h * f;
        right.rotation.z = -h * f;
      }
      setUnfold(0);
      return { setUnfold };
    },

    /* ---------- Misi 3: volume + kubus satuan ---------- */
    misi3(ctx) {
      const S = 0.26;
      const MAX = 12 * 10 * 10;
      const box = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshPhongMaterial({ color: 0x3b82f6, transparent: true, opacity: 0.8 }));
      outline(box, new THREE.BoxGeometry(1, 1, 1), 0.9);
      ctx.group.add(box);

      const inst = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshPhongMaterial({ color: 0xffffff }), MAX);
      inst.count = 0;
      ctx.group.add(inst);

      const dummy = new THREE.Object3D();
      const col = new THREE.Color();

      function update(p, l, t, units) {
        box.scale.set(p * S, t * S, l * S);
        box.material.opacity = units ? 0.1 : 0.8;
        inst.visible = units;
        if (!units) return;
        let n = 0;
        for (let y = 0; y < t; y++) {
          col.setHSL(0.58 + (y / Math.max(t, 1)) * 0.12, 0.85, 0.55);
          for (let x = 0; x < p; x++) {
            for (let z = 0; z < l; z++) {
              dummy.position.set((x + 0.5 - p / 2) * S, (y + 0.5 - t / 2) * S, (z + 0.5 - l / 2) * S);
              dummy.scale.setScalar(S * 0.88);
              dummy.updateMatrix();
              inst.setMatrixAt(n, dummy.matrix);
              inst.setColorAt(n, col);
              n++;
            }
          }
        }
        inst.count = n;
        inst.instanceMatrix.needsUpdate = true;
        if (inst.instanceColor) inst.instanceColor.needsUpdate = true;
      }
      update(8, 5, 4, true);
      return { update };
    },

    /* ---------- Misi 4: pasangan sisi ---------- */
    misi4(ctx) {
      const geo = new THREE.BoxGeometry(3.2, 1.6, 2.0);
      const mats = faceMaterials(1);
      const mesh = new THREE.Mesh(geo, mats);
      ctx.group.add(mesh);
      outline(mesh, geo, 0.9);

      const idx = { topbottom: [2, 3], frontback: [4, 5], sides: [0, 1] };
      function setPair(pair) {
        mats.forEach((m, i) => {
          const on = pair === "all" || (idx[pair] || []).includes(i);
          m.opacity = on ? 1 : 0.12;
        });
      }
      setPair("all");
      return { setPair };
    },

    /* ---------- Misi 5: diagonal ruang ---------- */
    misi5(ctx) {
      const g = ctx.group;
      const p = 3.6, l = 2.7, t = 2.4; // perbandingan 12 : 9 : 8
      const hp = p / 2, ht = t / 2, hl = l / 2;
      const geo = new THREE.BoxGeometry(p, t, l);
      const box = new THREE.Mesh(geo, new THREE.MeshPhongMaterial({ color: 0x64748b, transparent: true, opacity: 0.2 }));
      outline(box, geo, 0.8);
      g.add(box);

      const A = new THREE.Vector3(-hp, -ht, -hl);
      const B = new THREE.Vector3(hp, -ht, hl); // ujung diagonal alas
      const C = new THREE.Vector3(hp, ht, hl); // ujung diagonal ruang

      // segitiga siku-siku (A, B, C)
      const tri = new THREE.BufferGeometry().setFromPoints([A, B, C]);
      tri.computeVertexNormals();
      g.add(new THREE.Mesh(tri, new THREE.MeshBasicMaterial({ color: 0xfb7185, transparent: true, opacity: 0.22, side: THREE.DoubleSide })));

      g.add(cylinderBetween(A, B, 0.035, new THREE.MeshBasicMaterial({ color: 0x22d3ee })));
      g.add(cylinderBetween(B, C, 0.035, new THREE.MeshBasicMaterial({ color: 0xfbbf24 })));
      g.add(cylinderBetween(A, C, 0.045, new THREE.MeshBasicMaterial({ color: 0xfb7185 })));

      const mid = (a, b) => a.clone().add(b).multiplyScalar(0.5);
      const l1 = makeLabel("d alas", "#67e8f9", true);
      l1.position.copy(mid(A, B)).add(new THREE.Vector3(0, -0.28, 0));
      const l2 = makeLabel("t", "#fde68a");
      l2.position.copy(mid(B, C)).add(new THREE.Vector3(0.28, 0, 0));
      const l3 = makeLabel("d ruang", "#fda4af", true);
      l3.position.copy(mid(A, C)).add(new THREE.Vector3(-0.1, 0.34, 0));
      [l1, l2, l3].forEach((s) => g.add(s));

      [A, B, C].forEach((v) => {
        const s = new THREE.Mesh(new THREE.SphereGeometry(0.09, 12, 12), new THREE.MeshBasicMaterial({ color: 0xffffff }));
        s.position.copy(v);
        g.add(s);
      });
      return {};
    },
  };

  /* Membuat adegan bila belum ada; mengembalikan API-nya */
  function ensure(view) {
    if (api[view]) return api[view];
    if (!builders[view]) return null;
    const ctx = registry[view] || init(view);
    if (!ctx) return null;
    api[view] = builders[view](ctx);
    return api[view];
  }

  return { api, ensure };
})();
