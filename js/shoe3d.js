/* Nilufar Shoes — 3D vitrina.
 * Poyabzal siluetini hajmli (ekstruziya qilingan) modelga aylantiradi va canvas'da chizadi.
 * Tashqi kutubxona ishlatilmaydi — sayt internetsiz ham ishlaydi. */
window.Shoe3D = (function () {
  const SVGNS = "http://www.w3.org/2000/svg";
  const VB = { w: 200, h: 180, cx: 100, cy: 100 };   // SVG viewBox va model markazi
  const LIGHT = norm3([-0.35, -0.55, 0.78]);          // yorug'lik yo'nalishi
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  let hiddenSVG = null;
  function svgHost() {
    if (!hiddenSVG) {
      hiddenSVG = document.createElementNS(SVGNS, "svg");
      hiddenSVG.setAttribute("width", "0");
      hiddenSVG.setAttribute("height", "0");
      hiddenSVG.setAttribute("aria-hidden", "true");
      hiddenSVG.style.cssText = "position:absolute;width:0;height:0;overflow:hidden";
      document.body.appendChild(hiddenSVG);
    }
    return hiddenSVG;
  }

  /* ---------- Yordamchi matematika ---------- */
  function norm3(v) {
    const l = Math.hypot(v[0], v[1], v[2]) || 1;
    return [v[0] / l, v[1] / l, v[2] / l];
  }
  function hex2rgb(hex) {
    let c = String(hex || "#b3123b").replace("#", "");
    if (c.length === 3) c = c.split("").map(x => x + x).join("");
    const n = parseInt(c, 16) || 0;
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  function tone(rgb, k, tint) {
    // k — yoritilganlik (0..1.4), tint — ko'k soya aralashmasi
    const f = v => Math.max(0, Math.min(255, Math.round(v * k + (tint || 0))));
    return "rgb(" + f(rgb[0]) + "," + f(rgb[1] * 0.995) + "," + f(rgb[2] * 1.01) + ")";
  }

  /* ---------- Siluetni nuqtalarga aylantirish ---------- */
  const sampleCache = new Map();
  function samplePath(d, n) {
    const key = n + "|" + d;
    if (sampleCache.has(key)) return sampleCache.get(key);
    const el = document.createElementNS(SVGNS, "path");
    el.setAttribute("d", d);
    svgHost().appendChild(el);
    let pts = [];
    try {
      const L = el.getTotalLength();
      for (let i = 0; i < n; i++) {
        const p = el.getPointAtLength((L * i) / n);
        pts.push([p.x - VB.cx, p.y - VB.cy]);
      }
    } catch (e) { pts = []; }
    svgHost().removeChild(el);
    sampleCache.set(key, pts);
    return pts;
  }

  /* core.js dagi siluet yo'llarini ajratib olish */
  function partsOf(category) {
    const src = (window.NS && NS.SHOE_PATHS && (NS.SHOE_PATHS[category] || NS.SHOE_PATHS.heels)) || "";
    const out = [];
    const re = /<path\b([^>]*)\/>/g;
    let m;
    while ((m = re.exec(src))) {
      const attrs = m[1];
      const d = (attrs.match(/\bd="([^"]+)"/) || [])[1];
      if (!d) continue;
      const fill = (attrs.match(/\bfill="([^"]*)"/) || [])[1];
      const stroke = (attrs.match(/\bstroke="([^"]*)"/) || [])[1];
      const sw = parseFloat((attrs.match(/\bstroke-width="([^"]*)"/) || [])[1] || 0);
      out.push({ d, fill, stroke, sw });
    }
    return out;
  }

  /* ---------- Model ---------- */
  const modelCache = new Map();

  /* Bitta siluetdan hajmli qism yasaymiz */
  /* Kenglik profillari: taglik deyarli tekis, ust qismi dumaloq */
  const PROFILE = {
    main: u => Math.pow(1 - 0.80 * Math.pow(Math.abs(u), 2.6), 0.44),
    dark: u => Math.pow(1 - 0.84 * Math.pow(Math.abs(u), 2.8), 0.42),
    sole: u => 1 - 0.34 * Math.pow(Math.abs(u), 5)
  };

  function makeMesh(d, quality, depth, dark, kind) {
    const outline = samplePath(d, quality);
    if (outline.length < 3) return null;
    const normals = [];
    for (let i = 0; i < outline.length; i++) {
      const a = outline[i], b = outline[(i + 1) % outline.length];
      const dx = b[0] - a[0], dy = b[1] - a[1];
      const l = Math.hypot(dx, dy) || 1;
      normals.push([dy / l, -dx / l]);
    }
    let area = 0, sx = 0, maxY = -1e9;
    for (let i = 0; i < outline.length; i++) {
      const a = outline[i], b = outline[(i + 1) % outline.length];
      area += a[0] * b[1] - b[0] * a[1];
      sx += a[0];
      if (a[1] > maxY) maxY = a[1];
    }
    /* Haqiqiy poyabzalda kesim tepaga qarab torayadi: shuni har bir
       nuqtaga balandligiga qarab kenglik koeffitsienti sifatida beramiz. */
    let minYp = 1e9, maxYp = -1e9;
    for (const q of outline) { if (q[1] < minYp) minYp = q[1]; if (q[1] > maxYp) maxYp = q[1]; }
    const span = (maxYp - minYp) || 1;
    const narrow = kind === "sole" ? 0.12 : 0.42;
    for (const q of outline) q[2] = 1 - narrow * Math.pow(1 - (q[1] - minYp) / span, 1.5);

    const prof = PROFILE[kind] || PROFILE.main;
    const SL = kind === "sole" ? 7 : 11, slices = [];
    for (let i = 0; i < SL; i++) {
      const u = -1 + (2 * i) / (SL - 1);
      slices.push({ z: u * (depth / 2), s: prof(u) });
    }
    return {
      outline, normals, slices, dark, kind,
      flip: area > 0 ? 1 : -1,
      center: [sx / outline.length, maxY]
    };
  }

  function buildModel(category, quality) {
    const key = category + "|" + quality;
    if (modelCache.has(key)) return modelCache.get(key);
    const parts = partsOf(category);
    const depth = { heels: 30, sneakers: 40, boots: 40, sandals: 34, flats: 34, loafers: 38 }[category] || 34;
    const meshes = [];
    const strokes = [];
    parts.forEach((p, i) => {
      if (!p.fill || p.fill === "none") { if (p.stroke) strokes.push(p); return; }
      const dark = i > 0 && p.fill === "D";   // birinchi qism — har doim asosiy tana
      /* Pastda yotgan to'q qism — taglik. U ustki qismdan kengroq va tekisroq,
         shuning uchun poyabzal pastdan qaralganda tovoni ko'rinadi. */
      const pts = samplePath(p.d, 40);
      const avgY = pts.length ? pts.reduce((t, q) => t + q[1], 0) / pts.length : 0;
      const kind = i === 0 ? "main" : (dark && avgY > 16) ? "sole" : dark ? "dark" : "main";
      const dep = kind === "sole" ? depth * 1.08 : i === 0 ? depth : depth * 0.88;
      const q = i === 0 ? quality : Math.max(34, Math.round(quality * 0.45));
      const m = makeMesh(p.d, q, dep, dark, kind);
      if (m) meshes.push(m);
    });
    const model = { meshes, strokes, depth, category };
    modelCache.set(key, model);
    return model;
  }

  /* ---------- Chizish ---------- */
  function draw(ctx, model, opt) {
    const { w, h, angle, tilt, color, scale } = opt;
    const dpr = opt.dpr || 1;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, w * dpr, h * dpr);
    if (!model.meshes.length) return;

    const ca = Math.cos(angle), sa = Math.sin(angle);
    const ct = Math.cos(tilt), st = Math.sin(tilt);
    const k = scale * dpr;
    const ox = (w / 2) * dpr, oy = (h / 2) * dpr + 8 * dpr;

    function proj(x, y, z) {
      const X = x * ca + z * sa;
      const Z0 = -x * sa + z * ca;
      return [ox + X * k, oy + (y * ct - Z0 * st) * k, y * st + Z0 * ct];
    }
    function rotN(nx, ny, nz) {
      const X = nx * ca + nz * sa;
      const Z0 = -nx * sa + nz * ca;
      return [X, ny * ct - Z0 * st, ny * st + Z0 * ct];
    }

    const rgb = hex2rgb(color);
    // Taglik rezinasi — mahsulot rangidan ancha to'q va neytral
    const sole = [Math.round(rgb[0] * 0.3 + 34), Math.round(rgb[1] * 0.28 + 31), Math.round(rgb[2] * 0.26 + 29)];
    const RIM = norm3([0.62, 0.3, -0.72]);        // orqadan yoritish — qirralar yonsin
    const F = rotN(0, 0, 1);
    const frontVisible = F[2] > 0;
    const faces = [];

    for (const mesh of model.meshes) {
      const cen = mesh.center;
      const n = mesh.outline.length;
      const SL = mesh.slices;
      const isSole = mesh.kind === "sole";
      const base = isSole ? sole : rgb;
      const shadeK = isSole ? 1 : mesh.dark ? 0.62 : 1;   // tafsilot qismlari to'qroq
      const at = (p, sl) => {
        const f = sl.s * (p[2] || 1);     // kesim kengligi × nuqtaning kengligi
        return proj(cen[0] + (p[0] - cen[0]) * sl.s, cen[1] + (p[1] - cen[1]) * sl.s, sl.z * f);
      };

      for (let j = 0; j < SL.length - 1; j++) {
        const s1 = SL[j], s2 = SL[j + 1];
        const slope = (s2.z - s1.z) === 0 ? 0 : -(s2.s - s1.s) / (s2.z - s1.z);
        for (let i = 0; i < n; i++) {
          const a = mesh.outline[i], b = mesh.outline[(i + 1) % n];
          const p1 = at(a, s1), p2 = at(b, s1), p3 = at(b, s2), p4 = at(a, s2);
          const nn = mesh.normals[i];
          let nx = nn[0] * mesh.flip, ny = nn[1] * mesh.flip, nz = slope * 42;
          const ln = Math.hypot(nx, ny, nz) || 1;
          const N = rotN(nx / ln, ny / ln, nz / ln);
          if (N[2] <= 0.015) continue;
          const lam = Math.max(0, N[0] * LIGHT[0] + N[1] * LIGHT[1] + N[2] * LIGHT[2]);
          // Yarqiroq nuqta (Blinn) — charm yaltirasin; taglik rezinasi xira
          const HL = norm3([LIGHT[0], LIGHT[1], LIGHT[2] + 1]);
          const spec = isSole ? 0
            : Math.pow(Math.max(0, N[0] * HL[0] + N[1] * HL[1] + N[2] * HL[2]), 26) * 0.9;
          const rim = Math.pow(Math.max(0, N[0] * RIM[0] + N[1] * RIM[1] + N[2] * RIM[2]), 2.4) * 0.3;
          // Pastga qarab qorong'ilashish — poyabzal yerga tegib turgandek
          const ao = 1 - Math.max(0, Math.min(0.3, ((a[1] + b[1]) / 2 + 10) / 160));
          faces.push({
            z: (p1[2] + p2[2] + p3[2] + p4[2]) / 4,
            pts: [p1, p2, p3, p4],
            fill: tone(base, (0.5 + 0.62 * lam) * shadeK * ao, (spec * 150 + rim * 90) * shadeK * ao)
          });
        }
      }

      const capSlice = frontVisible ? SL[SL.length - 1] : SL[0];
      const cap = [];
      for (let i = 0; i < n; i++) cap.push(at(mesh.outline[i], capSlice));
      const lamF = Math.max(0, Math.abs(F[2]) * LIGHT[2] + (frontVisible ? F[1] : -F[1]) * LIGHT[1] * 0.4);
      faces.push({
        z: cap.reduce((s, p) => s + p[2], 0) / n + (frontVisible ? 0.6 : -0.6),
        pts: cap,
        fill: tone(base, (0.66 + 0.5 * lamF) * shadeK, 24 * lamF * shadeK),
        cap: !mesh.dark, slice: capSlice, cen, lamF
      });
    }

    faces.sort((f1, f2) => f1.z - f2.z);

    for (const f of faces) {
      ctx.beginPath();
      ctx.moveTo(f.pts[0][0], f.pts[0][1]);
      for (let i = 1; i < f.pts.length; i++) ctx.lineTo(f.pts[i][0], f.pts[i][1]);
      ctx.closePath();
      ctx.fillStyle = f.fill;
      ctx.fill();
      ctx.lineWidth = 1 * dpr;
      ctx.strokeStyle = f.fill;
      ctx.stroke();

      // Chiziqli tafsilotlar (bog'ich, tasma) — faqat old yuzada
      if (f.cap && model.strokes.length && Math.abs(F[2]) > 0.3) {
        const sl = f.slice, cen = f.cen;
        const z = sl.z + (frontVisible ? 0.35 : -0.35);
        const O = proj(cen[0], cen[1], z);
        const EX = proj(cen[0] + sl.s, cen[1], z);
        const EY = proj(cen[0], cen[1] + sl.s, z);
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(f.pts[0][0], f.pts[0][1]);
        for (let i = 1; i < f.pts.length; i++) ctx.lineTo(f.pts[i][0], f.pts[i][1]);
        ctx.closePath();
        ctx.clip();
        ctx.globalAlpha = Math.min(1, (Math.abs(F[2]) - 0.3) / 0.35);
        ctx.setTransform(EX[0] - O[0], EX[1] - O[1], EY[0] - O[0], EY[1] - O[1], O[0], O[1]);
        ctx.translate(-cen[0] - VB.cx, -cen[1] - VB.cy);
        ctx.strokeStyle = tone(rgb, 0.34 + 0.28 * f.lamF, 0);
        ctx.lineCap = "round";
        for (const p of model.strokes) {
          ctx.lineWidth = p.sw || 4;
          ctx.stroke(new Path2D(p.d));
        }
        ctx.restore();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
      }
    }

    // Yerdagi soya
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const gy = oy + 52 * k;
    const sh = ctx.createRadialGradient(ox, gy, 2, ox, gy, 95 * k * 0.8);
    sh.addColorStop(0, "rgba(0,0,0,.26)");
    sh.addColorStop(0.55, "rgba(0,0,0,.10)");
    sh.addColorStop(1, "rgba(0,0,0,0)");
    ctx.globalCompositeOperation = "destination-over";
    ctx.fillStyle = sh;
    ctx.fillRect(0, 0, w * dpr, h * dpr);
    ctx.restore();
  }

  /* ---------- Bitta canvas uchun boshqaruvchi ---------- */
  function mount(canvas) {
    if (canvas.dataset.mounted === "1") return null;
    canvas.dataset.mounted = "1";

    const category = canvas.dataset.cat || "heels";
    const interactive = canvas.dataset.mode === "full";
    const quality = interactive ? 150 : 86;
    const model = buildModel(category, quality);
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    const noSpin = canvas.dataset.spin === "0";
    const idle = canvas.dataset.idle !== "0" && !reduce && (!interactive || noSpin);
    const st = {
      base: -0.17,
      angle: interactive ? -0.22 : -0.17,
      tilt: 0.17,
      tiltBase: 0.17,
      tiltFree: false,          // foydalanuvchi o'zi burganmi
      sweep: interactive && !reduce && !noSpin,   // kamera yuqoridan pastga suriladi
      color: canvas.dataset.color || "#b3123b",
      spin: interactive && !reduce && !noSpin,
      hover: false,
      dragging: false,
      raf: 0,
      visible: true,
      idle,
      phase: parseFloat(canvas.dataset.phase || (Math.random() * 6.28)),
      amp: parseFloat(canvas.dataset.amp || 0.30),   // tebranish kengligi (radian)
      speed: parseFloat(canvas.dataset.speed || 0.55),
      clock: 0
    };

    function size() {
      const r = canvas.getBoundingClientRect();
      const w = Math.max(40, Math.round(r.width || canvas.clientWidth || 200));
      const h = Math.max(40, Math.round(r.height || w * 0.8));
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      st.w = w; st.h = h; st.dpr = dpr;
      st.scale = Math.min(w / VB.w, h / (VB.h * 0.9)) * 1.02;
    }

    function render() {
      if (!st.w) size();
      draw(ctx, model, {
        w: st.w, h: st.h, dpr: st.dpr, scale: st.scale,
        angle: st.angle, tilt: st.tilt, color: st.color
      });
    }

    let last = 0;
    function loop(now) {
      st.raf = requestAnimationFrame(loop);
      const dt = Math.min(0.05, (now - last) / 1000 || 0.016);
      last = now;
      if (!st.visible) return;
      if (st.dragging) return;
      st.clock += dt;
      /* Kamera sekin yuqoridan pastga suriladi: poyabzal ham ustidan,
         ham tagidan (tovoni bilan) ko'rinadi. */
      if (st.sweep && !st.tiltFree) st.tilt = 0.06 + 0.34 * Math.sin(st.clock * 0.42);
      if (st.spin) {                       // mahsulot oynasi: to'liq aylanish
        st.angle += dt * 0.55;
        render();
      } else if (st.hover) {               // sichqoncha ustida: tezroq aylanadi
        st.angle += dt * 1.25;
        render();
      } else if (st.ease) {                // sichqoncha ketgach — tebranishga qaytish
        const target = st.base + Math.sin(st.clock * st.speed + st.phase) * st.amp;
        let diff = ((target - st.angle + Math.PI) % (Math.PI * 2)) - Math.PI;
        if (Math.abs(diff) < 0.02) { st.ease = false; }
        else st.angle += diff * Math.min(1, dt * 4);
        render();
      } else if (st.idle) {                // tinch holat: sekin tebranish
        st.angle = st.base + Math.sin(st.clock * st.speed + st.phase) * st.amp;
        render();
      }
    }

    function start() { if (!st.raf) { last = performance.now(); st.raf = requestAnimationFrame(loop); } }
    function stop() { cancelAnimationFrame(st.raf); st.raf = 0; }

    size();
    render();

    // Ko'rinmayotgan kartalar hisoblanmaydi
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(es => es.forEach(e => {
        st.visible = e.isIntersecting;
        if (e.isIntersecting) start(); else stop();
      }), { rootMargin: "120px" }).observe(canvas);
    } else start();

    if (!reduce) {
      const host = canvas.closest(".card") || canvas.parentElement;
      if (host && !interactive) {
        host.addEventListener("mouseenter", () => { st.hover = true; st.ease = false; start(); });
        host.addEventListener("mouseleave", () => { st.hover = false; st.ease = true; });
      }
    }

    if (interactive) {
      canvas.style.touchAction = "pan-y";
      let px = 0, py = 0;
      const down = e => {
        const t = e.touches ? e.touches[0] : e;
        st.dragging = true; px = t.clientX; py = t.clientY;
        canvas.classList.add("grabbing");
      };
      const move = e => {
        if (!st.dragging) return;
        const t = e.touches ? e.touches[0] : e;
        st.angle += (t.clientX - px) * 0.012;
        // Tepaga-pastga surish kamerani ko'taradi/tushiradi — tovonni ko'rish uchun
        st.tiltFree = true;
        st.tilt = Math.max(-0.78, Math.min(0.78, st.tilt + (t.clientY - py) * 0.008));
        px = t.clientX; py = t.clientY;
        render();
        if (e.cancelable) e.preventDefault();
      };
      const up = () => { st.dragging = false; canvas.classList.remove("grabbing"); };
      canvas.addEventListener("mousedown", down);
      canvas.addEventListener("touchstart", down, { passive: true });
      window.addEventListener("mousemove", move);
      canvas.addEventListener("touchmove", move, { passive: false });
      window.addEventListener("mouseup", up);
      canvas.addEventListener("touchend", up);
    }

    window.addEventListener("resize", () => { size(); render(); });

    const api = {
      setColor(c) { st.color = c; render(); },
      setAngle(a) { st.angle = a; render(); },
      render, start, stop
    };
    canvas.__shoe3d = api;
    return api;
  }

  /* Sahifadagi barcha 3D canvaslarni ishga tushirish */
  function mountAll(root) {
    (root || document).querySelectorAll("canvas.shoe3d").forEach(c => {
      try { mount(c); } catch (e) { fallback(c); }
    });
  }

  /* Xatolik bo'lsa — oddiy SVG ko'rinishga qaytish */
  function fallback(canvas) {
    if (!window.NS) return;
    const span = document.createElement("div");
    span.innerHTML = NS.shoeSVG(canvas.dataset.cat, canvas.dataset.color);
    span.firstChild && canvas.replaceWith(span.firstChild);
  }

  /* 3D qo'llab-quvvatlanadimi */
  const supported = (function () {
    try {
      const c = document.createElement("canvas");
      return !!(c.getContext && c.getContext("2d") && window.Path2D &&
        document.createElementNS(SVGNS, "path").getPointAtLength);
    } catch (e) { return false; }
  })();

  function markup(category, color, mode, opt) {
    const o = opt || {};
    return '<canvas class="shoe3d" data-cat="' + category + '" data-color="' + color +
      '" data-mode="' + (mode || "card") + '"' +
      (o.phase != null ? ' data-phase="' + o.phase + '"' : "") +
      (o.amp != null ? ' data-amp="' + o.amp + '"' : "") +
      (o.speed != null ? ' data-speed="' + o.speed + '"' : "") +
      ' aria-hidden="true"></canvas>';
  }

  return { mount, mountAll, markup, supported };
})();
