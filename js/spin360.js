/* Nilufar Shoes — 360° ko'ruvchi.
 * Yuklangan kadrlarni barmoq (yoki sichqoncha) harakatiga qarab almashtiradi. */
window.Spin360 = (function () {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* host — konteyner, blobs — kadrlar ro'yxati */
  function mount(host, blobs, opt) {
    if (!host || !blobs || !blobs.length) return null;
    if (host.__spin360) host.__spin360.destroy();   // eskisini to'xtatamiz
    const o = opt || {};
    const raw = !!o.raw;
    const urls = raw ? blobs.slice() : Frames.urls(blobs);
    const n = urls.length;
    let idx = 0, dragging = false, lastX = 0, acc = 0, raf = 0, auto = o.auto !== false && !reduce;

    host.innerHTML =
      '<div class="spin360">' +
        '<div class="spin-stage">' +
          urls.map((u, i) => '<img src="' + u + '" alt="" draggable="false"' +
            (i === 0 ? ' class="on"' : "") + (i < 3 ? "" : ' loading="lazy"') + ">").join("") +
        "</div>" +
        '<div class="spin-hint"><svg viewBox="0 0 24 24"><path d="M3 12a9 9 0 0 1 15.5-6.2M21 12a9 9 0 0 1-15.5 6.2"/><path d="M18 3v4h-4M6 21v-4h4"/></svg>' +
          "<span>" + (o.label || "360°") + "</span></div>" +
      "</div>";

    const root = host.querySelector(".spin360");
    const imgs = Array.prototype.slice.call(host.querySelectorAll(".spin-stage img"));

    function show(i) {
      const k = ((i % n) + n) % n;
      if (k === idx) return;
      imgs[idx].classList.remove("on");
      imgs[k].classList.add("on");
      idx = k;
    }

    /* Sekin o'z-o'zidan aylanish — foydalanuvchi tegmaguncha */
    let t0 = 0;
    function loop(t) {
      // Element sahifadan olib tashlangan bo'lsa — to'xtaymiz (xotira oqmasin)
      if (!root.isConnected) { cancelAnimationFrame(raf); if (!raw) Frames.free(urls); host.__spin360 = null; return; }
      raf = requestAnimationFrame(loop);
      if (!auto || dragging) return;
      if (!t0) t0 = t;
      if (t - t0 > 90) { t0 = t; show(idx + 1); }
    }
    function stopAuto() { auto = false; root.classList.add("touched"); }

    const px = e => (e.touches ? e.touches[0] : e).clientX;
    function down(e) {
      dragging = true; lastX = px(e); stopAuto();
      root.classList.add("grabbing");
    }
    function move(e) {
      if (!dragging) return;
      const x = px(e);
      acc += x - lastX;
      lastX = x;
      const step = Math.max(6, root.clientWidth / n / 1.4);   // bir kadrga necha piksel
      while (Math.abs(acc) >= step) {
        show(idx + (acc > 0 ? 1 : -1));
        acc += acc > 0 ? -step : step;
      }
      if (e.cancelable) e.preventDefault();
    }
    function up() { dragging = false; root.classList.remove("grabbing"); }

    root.addEventListener("mousedown", down);
    root.addEventListener("touchstart", down, { passive: true });
    window.addEventListener("mousemove", move);
    root.addEventListener("touchmove", move, { passive: false });
    window.addEventListener("mouseup", up);
    root.addEventListener("touchend", up);
    /* Sichqoncha g'ildiragi bilan ham */
    root.addEventListener("wheel", e => {
      if (!e.deltaX && Math.abs(e.deltaY) < 8) return;
      stopAuto();
      show(idx + (e.deltaX || e.deltaY > 0 ? 1 : -1));
      e.preventDefault();
    }, { passive: false });

    raf = requestAnimationFrame(loop);

    const api = {
      destroy() {
        cancelAnimationFrame(raf);
        host.__spin360 = null;
        window.removeEventListener("mousemove", move);
        window.removeEventListener("mouseup", up);
        if (!raw) Frames.free(urls);
        host.innerHTML = "";
      },
      frames: n
    };
    host.__spin360 = api;
    return api;
  }

  /* Fayl manzillaridan (assets/360/...) ko'rsatish */
  function mountUrls(host, urls, opt) {
    if (!host || !urls || !urls.length) return null;
    if (host.__spin360) host.__spin360.destroy();
    const blobsLike = urls.slice();
    // Bu yerda URL ro'yxati to'g'ridan-to'g'ri ishlatiladi — blob yaratilmaydi
    return mount(host, blobsLike, Object.assign({ raw: true }, opt || {}));
  }

  /* Mahsulot uchun eng yaxshi manbani tanlaydi:
     1) CEO panel orqali yuklangan kadrlar, 2) loyihadagi fayllar */
  async function mountFor(host, productOrId, opt) {
    const p = typeof productOrId === "string"
      ? (window.NS ? NS.Store.product(productOrId) : null)
      : productOrId;
    const id = typeof productOrId === "string" ? productOrId : (p && p.id);

    if (window.Frames && Frames.supported && id) {
      const blobs = await Frames.get(id);
      if (blobs && blobs.length) return mount(host, blobs, opt);
    }
    if (p && p.spin && p.spin.dir && p.spin.count) {
      const urls = [];
      for (let i = 0; i < p.spin.count; i++) {
        const u = p.spin.dir + "/" + String(i).padStart(2, "0") + "." + (p.spin.ext || "jpg");
        // Bitta faylga yig'ilgan versiyada rasmlar hujjat ichida bo'ladi
        urls.push((window.__ASSET_MAP && window.__ASSET_MAP[u]) || u);
      }
      return mountUrls(host, urls, opt);
    }
    /* Kadrlar yo'q, lekin oddiy surat bor — uni avtomat aylantiramiz */
    if (p && p.image && window.Auto3D) return Auto3D.mount(host, p.image, opt);
    return null;
  }

  return { mount, mountFor };
})();
