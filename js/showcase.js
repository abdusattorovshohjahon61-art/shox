/* Nilufar Shoes — bosh ekrandagi vitrina.
 * Tanlangan modelga qarab fon rangi ham o'zgaradi. */
(function () {
  if (!window.NS) return;
  const { Store, t, money, esc, pname, pdesc, shade } = NS;
  const $ = s => document.querySelector(s);
  const panel = $(".showcase");
  if (!panel) return;

  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let items = [], i = 0, size = null, color = null, bgFlip = false;

  /* Vitrinaga tushadigan mahsulotlar: avval yangi va chegirmalilar */
  function pick() {
    const all = Store.products().filter(p => p.stock > 0);
    const score = p => (p.isNew ? 2 : 0) + (p.oldPrice > p.price ? 1 : 0);
    return all.sort((a, b) => score(b) - score(a)).slice(0, 6);
  }

  /* Rangni HSL ga o'tkazamiz — fon uchun to'yingan versiyasini olamiz */
  function toHSL(hex) {
    let c = String(hex || "").replace("#", "");
    if (c.length === 3) c = c.split("").map(x => x + x).join("");
    const n = parseInt(c, 16) || 0;
    const r = ((n >> 16) & 255) / 255, g = ((n >> 8) & 255) / 255, bl = (n & 255) / 255;
    const mx = Math.max(r, g, bl), mn = Math.min(r, g, bl), d = mx - mn;
    let h = 0;
    if (d) {
      if (mx === r) h = ((g - bl) / d) % 6;
      else if (mx === g) h = (bl - r) / d + 2;
      else h = (r - g) / d + 4;
      h *= 60; if (h < 0) h += 360;
    }
    const l = (mx + mn) / 2;
    const sat = d ? d / (1 - Math.abs(2 * l - 1)) : 0;
    return { h, s: sat, l };
  }

  /* Mahsulot rangi fonga juda yengil ohang beradi — tinch, suyak rangli sahna */
  function gradient(hex) {
    let { h, s } = toHSL(hex || "#a8865f");
    if (s < 0.16) { h = 32; s = 0.26; }          // qora/oq/kulrang — iliq neytral ohang
    const dark = document.documentElement.dataset.theme === "dark";
    const S = Math.round(Math.min(0.44, Math.max(0.16, s)) * 100);
    const L = dark ? 20 : 90;
    return "radial-gradient(74% 64% at 50% 44%, hsl(" + h.toFixed(0) + " " + S + "% " + L + "%) 0%, transparent 72%)";
  }

  function paintBg(hex) {
    const next = bgFlip ? $("#scBgA") : $("#scBgB");
    const cur = bgFlip ? $("#scBgB") : $("#scBgA");
    next.style.background = gradient(hex);
    next.style.opacity = "1";
    cur.style.opacity = "0";
    bgFlip = !bgFlip;
    document.documentElement.style.setProperty("--sc-accent", hex);
  }

  function product() { return items[i]; }

  function renderStage() {
    const p = product();
    const stage = $("#scStage");
    stage.innerHTML = p.image
      ? '<img src="' + esc(p.image) + '" alt="' + esc(pname(p)) + '">'
      : Shoe3D.markup(p.category, color, "full", { amp: 0.26, speed: 0.4 });
    const cv = stage.querySelector("canvas");
    if (cv) {
      cv.dataset.spin = "0";       // o'z-o'zidan to'liq aylanmaydi, sekin tebranadi
      Shoe3D.mountAll(stage);
    }
    stage.classList.remove("in");
    requestAnimationFrame(() => stage.classList.add("in"));
  }

  function renderSide() {
    const p = product();
    const sale = p.oldPrice && p.oldPrice > p.price;
    $("#scPrice").textContent = money(p.price);
    $("#scOld").textContent = sale ? money(p.oldPrice) : "";
    $("#scOld").hidden = !sale;
    $("#scDesc").textContent = pdesc(p) || t("hero.subtitle");

    $("#scSizes").innerHTML = p.sizes.map(s =>
      '<button class="sc-size' + (s === size ? " on" : "") + '" data-size="' + s + '">' + s + "</button>").join("");
    $("#scColors").innerHTML = p.colors.map(c =>
      '<button class="sc-color' + (c === color ? " on" : "") + '" data-color="' + esc(c) +
      '" style="background:' + esc(c) + '" aria-label="' + esc(c) + '"></button>').join("");

    const n = items[(i + 1) % items.length];
    $("#scNextName").textContent = pname(n);
    $("#scNextPrice").textContent = money(n.price);
    $("#scNextThumb").innerHTML = n.image
      ? '<img src="' + esc(n.image) + '" alt="">'
      : NS.shoeSVG(n.category, n.colors[0]);
  }

  function show(dir) {
    const p = product();
    color = p.colors[0];
    size = null;
    paintBg(color);
    const panelEl = $(".sc-panel");
    if (!reduce && dir) {
      panelEl.classList.remove("slide-l", "slide-r");
      void panelEl.offsetWidth;
      panelEl.classList.add(dir > 0 ? "slide-l" : "slide-r");
    }
    renderStage();
    renderSide();
  }

  function go(step) {
    i = (i + step + items.length) % items.length;
    show(step);
  }

  /* ---------- Hodisalar ---------- */
  panel.addEventListener("click", e => {
    const sz = e.target.closest("[data-size]");
    if (sz) {
      size = +sz.dataset.size;
      panel.querySelectorAll("[data-size]").forEach(b => b.classList.toggle("on", b === sz));
      return;
    }
    const cl = e.target.closest("[data-color]");
    if (cl) {
      color = cl.dataset.color;
      panel.querySelectorAll("[data-color]").forEach(b => b.classList.toggle("on", b === cl));
      paintBg(color);
      const cv = $("#scStage canvas");
      if (cv && cv.__shoe3d) cv.__shoe3d.setColor(color); else renderStage();
      return;
    }
    if (e.target.closest("#scPrev")) return go(-1);
    if (e.target.closest("#scNext") || e.target.closest("#scNextCard")) return go(1);
    if (e.target.closest("#scCta")) {
      // Mahsulot oynasini ochamiz — tanlangan rang va o'lcham bilan
      window.dispatchEvent(new CustomEvent("showcase:open", {
        detail: { id: product().id, color, size }
      }));
    }
  });

  document.addEventListener("keydown", e => {
    if (!panel.getBoundingClientRect().height || scrollY > innerHeight * 0.8) return;
    if (e.key === "ArrowLeft") go(-1);
    if (e.key === "ArrowRight") go(1);
  });

  /* Sensorli ekranda surish */
  let x0 = null;
  panel.addEventListener("touchstart", e => { x0 = e.touches[0].clientX; }, { passive: true });
  panel.addEventListener("touchend", e => {
    if (x0 == null) return;
    const dx = e.changedTouches[0].clientX - x0;
    if (Math.abs(dx) > 60) go(dx < 0 ? 1 : -1);
    x0 = null;
  }, { passive: true });

  function rebuild() {
    items = pick();
    if (!items.length) { panel.hidden = true; return; }
    if (i >= items.length) i = 0;
    show(0);
  }

  window.addEventListener("lang:change", () => { renderSide(); });
  new MutationObserver(() => paintBg(color)).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  window.addEventListener("storage", e => { if (e.key && e.key.includes("products")) rebuild(); });

  rebuild();
})();
