/* Nilufar Shoes — bitta suratdan avtomat 3D aylanish.
 *
 * Yuklangan oddiy surat (1 dona) bo'lsa ham mahsulot 360° aylanayotgandek
 * ko'rinadi: surat fonidan ajratiladi va kichik strip-larga bo'lib,
 * perspektiva bilan vertikal o'q atrofida aylantiriladi.
 *
 * Shu sababli CEO paneldan 24 ta kadr yuklash SHART emas —
 * bitta surat ham yetarli. Haqiqiy kadrlar bo'lsa, ular ustun turadi. */
window.Auto3D = (function () {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const STRIP = 2;          // bir ustun kengligi (px) — kichikroq = silliqroq
  const DEPTH = 2.6;        // kameragacha masofa (kenglikka nisbatan)
  const cache = new Map();  // surat manzili -> tayyorlangan kanvas

  /* ---------- Fonni ajratish ----------
     Chekkadan boshlab bir xil rangli sohani shaffof qilamiz. Oq krossovka
     oq fonda turgan holat uchun bardosh past olinadi va natija mantiqsiz
     chiqsa (deyarli hammasi yoki deyarli hech narsa o'chsa) — surat
     o'zgarishsiz qoladi. */
  function cutout(img) {
    const w = img.naturalWidth || img.width, h = img.naturalHeight || img.height;
    if (!w || !h) return null;
    const cv = document.createElement("canvas");
    cv.width = w; cv.height = h;
    const ctx = cv.getContext("2d", { willReadFrequently: true });
    ctx.drawImage(img, 0, 0, w, h);

    let d;
    try { d = ctx.getImageData(0, 0, w, h); } catch (e) { return cv; }   // boshqa manbadagi surat
    const px = d.data;

    /* Chekka ranglarining o'rtachasi va tarqoqligi */
    const edge = [];
    for (let x = 0; x < w; x += Math.max(1, (w / 40) | 0)) {
      edge.push((x) * 4, ((h - 1) * w + x) * 4);
    }
    for (let y = 0; y < h; y += Math.max(1, (h / 40) | 0)) {
      edge.push((y * w) * 4, (y * w + w - 1) * 4);
    }
    let br = 0, bg = 0, bb = 0;
    edge.forEach(i => { br += px[i]; bg += px[i + 1]; bb += px[i + 2]; });
    br /= edge.length; bg /= edge.length; bb /= edge.length;
    let spread = 0;
    edge.forEach(i => {
      spread += Math.abs(px[i] - br) + Math.abs(px[i + 1] - bg) + Math.abs(px[i + 2] - bb);
    });
    spread /= edge.length;

    const tol = Math.min(78, Math.max(26, spread * 2.2 + 24));
    const soft = tol * 1.7;                        // yumshoq chegara
    const near = i => Math.abs(px[i] - br) + Math.abs(px[i + 1] - bg) + Math.abs(px[i + 2] - bb);

    /* Chekkalardan to'lqinli tarqalish (flood fill) */
    const seen = new Uint8Array(w * h);
    const stack = [];
    for (let x = 0; x < w; x++) { stack.push(x, (h - 1) * w + x); }
    for (let y = 0; y < h; y++) { stack.push(y * w, y * w + w - 1); }
    let cut = 0;
    while (stack.length) {
      const p = stack.pop();
      if (seen[p]) continue;
      seen[p] = 1;
      const i = p * 4;
      const dist = near(i);
      if (dist > soft) continue;
      // Chegaraga yaqin piksellar yarim shaffof — qirralari tishli bo'lmasin
      px[i + 3] = dist <= tol ? 0 : Math.round(255 * ((dist - tol) / (soft - tol)));
      cut++;
      const x = p % w, y = (p / w) | 0;
      if (x > 0) stack.push(p - 1);
      if (x < w - 1) stack.push(p + 1);
      if (y > 0) stack.push(p - w);
      if (y < h - 1) stack.push(p + w);
    }

    const share = cut / (w * h);
    if (share < 0.08 || share > 0.9) return cv;    // ishonchsiz natija — asl surat

    /* Yolg'iz qolgan nuqtalarni tozalaymiz — fon "chang"i qolmasin */
    for (let pass = 0; pass < 2; pass++) {
      const a = new Uint8Array(w * h);
      for (let i = 0; i < w * h; i++) a[i] = px[i * 4 + 3];
      for (let y = 1; y < h - 1; y++) {
        for (let x = 1; x < w - 1; x++) {
          const p = y * w + x;
          if (!a[p]) continue;
          let empty = 0;
          if (!a[p - 1]) empty++;
          if (!a[p + 1]) empty++;
          if (!a[p - w]) empty++;
          if (!a[p + w]) empty++;
          if (empty >= 3) px[p * 4 + 3] = 0;
        }
      }
    }

    ctx.putImageData(d, 0, 0);
    return cv;
  }

  function prepare(src) {
    if (cache.has(src)) return cache.get(src);
    const p = new Promise(res => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => res(cutout(img) || img);
      img.onerror = () => res(null);
      img.src = src;
    });
    cache.set(src, p);
    return p;
  }

  /* ---------- Aylantirish ---------- */
  async function mount(host, src, opt) {
    if (!host || !src) return null;
    if (host.__auto3d) host.__auto3d.destroy();
    if (host.__spin360) host.__spin360.destroy();
    const o = opt || {};

    const tex = await prepare(src);
    if (!tex || !host.isConnected) return null;

    host.innerHTML =
      '<div class="auto3d">' +
        '<canvas class="auto3d-cv"></canvas>' +
        '<div class="spin-hint"><svg viewBox="0 0 24 24">' +
          '<path d="M3 12a9 9 0 0 1 15.5-6.2M21 12a9 9 0 0 1-15.5 6.2"/><path d="M18 3v4h-4M6 21v-4h4"/>' +
        '</svg><span>' + (o.label || "360°") + "</span></div>" +
      "</div>";

    const root = host.querySelector(".auto3d");
    const cv = host.querySelector(".auto3d-cv");
    const ctx = cv.getContext("2d");
    const tw = tex.width || tex.naturalWidth, th = tex.height || tex.naturalHeight;

    let angle = -0.3, auto = o.auto !== false && !reduce, raf = 0, last = 0;
    let dragging = false, lastX = 0;

    function size() {
      const r = root.getBoundingClientRect();
      const dpr = Math.min(2, devicePixelRatio || 1);
      const w = Math.max(1, r.width), h = Math.max(1, w * (th / tw));
      cv.width = w * dpr; cv.height = h * dpr;
      cv.style.height = h + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      return { w, h };
    }
    let box = size();

    function draw() {
      const { w, h } = box;
      ctx.clearRect(0, 0, w, h);

      const cos = Math.cos(angle), sin = Math.sin(angle);
      const back = cos < 0;                      // orqa tomoni ko'rinyapti
      const cx = w / 2, cy = h / 2;
      const d = w * DEPTH;
      const strips = Math.ceil(tw / (tw / w) / STRIP);

      for (let s = 0; s < strips; s++) {
        // Manbadagi ustun
        const u0 = (s * STRIP) / w, u1 = Math.min(1, ((s + 1) * STRIP) / w);
        const su = back ? 1 - u1 : u0;           // orqasi — ko'zgu aksi
        const sx = su * tw, sw = (u1 - u0) * tw;
        if (sw <= 0) continue;

        // Tekislikni vertikal o'q atrofida burish + perspektiva
        const px0 = (u0 - 0.5) * w, px1 = (u1 - 0.5) * w;
        const z0 = px0 * sin, z1 = px1 * sin;
        const k0 = d / (d - z0), k1 = d / (d - z1);
        const X0 = cx + px0 * cos * k0, X1 = cx + px1 * cos * k1;
        const dw = X1 - X0;
        if (Math.abs(dw) < 0.01) continue;
        const kk = (k0 + k1) / 2;
        const dh = h * kk;

        ctx.save();
        ctx.globalAlpha = 1;
        ctx.drawImage(tex, sx, 0, sw, th, Math.min(X0, X1), cy - dh / 2, Math.abs(dw) + 0.6, dh);
        ctx.restore();
      }

      /* Silindr soyasi — aylanish his qilinsin */
      const g = ctx.createLinearGradient(0, 0, w, 0);
      const lit = (back ? -cos : cos);
      g.addColorStop(0, "rgba(28,22,14," + (0.3 * (1 - lit * 0.4)).toFixed(3) + ")");
      g.addColorStop(0.42 + sin * 0.16, "rgba(255,255,255,0)");
      g.addColorStop(1, "rgba(28,22,14," + (0.22 * (1 - lit * 0.4)).toFixed(3) + ")");
      ctx.save();
      ctx.globalCompositeOperation = "source-atop";
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
      // Orqa tomoni biroz xiraroq — hajm sezilsin
      if (back) { ctx.fillStyle = "rgba(30,24,16,.2)"; ctx.fillRect(0, 0, w, h); }
      ctx.restore();
    }

    function loop(t) {
      if (!root.isConnected) { cancelAnimationFrame(raf); host.__auto3d = null; return; }
      raf = requestAnimationFrame(loop);
      if (!last) last = t;
      const dt = Math.min(64, t - last); last = t;
      if (auto && !dragging) angle += dt * 0.00052;
      draw();
    }

    const px = e => (e.touches ? e.touches[0] : e).clientX;
    function down(e) { dragging = true; lastX = px(e); auto = false; root.classList.add("grabbing"); }
    function move(e) {
      if (!dragging) return;
      const x = px(e);
      angle += (x - lastX) / 150;
      lastX = x;
      if (e.cancelable) e.preventDefault();
    }
    function up() { dragging = false; root.classList.remove("grabbing"); }

    root.addEventListener("mousedown", down);
    root.addEventListener("touchstart", down, { passive: true });
    window.addEventListener("mousemove", move);
    root.addEventListener("touchmove", move, { passive: false });
    window.addEventListener("mouseup", up);
    root.addEventListener("touchend", up);

    const ro = window.ResizeObserver ? new ResizeObserver(() => { box = size(); draw(); }) : null;
    if (ro) ro.observe(root);

    raf = requestAnimationFrame(loop);

    const api = {
      destroy() {
        cancelAnimationFrame(raf);
        if (ro) ro.disconnect();
        window.removeEventListener("mousemove", move);
        window.removeEventListener("mouseup", up);
        host.__auto3d = null;
        host.innerHTML = "";
      }
    };
    host.__auto3d = api;
    return api;
  }

  return { mount };
})();
