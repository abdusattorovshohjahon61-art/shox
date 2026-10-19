/* Nilufar Shoes — "Lukbuk": gorizontal lenta, har bir karta o'z rangida.
 * Scroll ko'rsatkichi va vitrinaning scroll bilan jonlanishi ham shu yerda. */
(function () {
  if (!window.NS) return;
  const { Store, t, money, esc, pname } = NS;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- Scroll ko'rsatkichi ---------- */
  const bar = document.createElement("div");
  bar.className = "scroll-bar";
  document.body.appendChild(bar);
  let ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      const h = document.documentElement.scrollHeight - innerHeight;
      bar.style.width = (h > 0 ? (scrollY / h) * 100 : 0) + "%";
      heroParallax();
      ticking = false;
    });
  }

  /* ---------- Vitrina scroll bilan jonlanadi ---------- */
  const panel = document.querySelector(".sc-panel");
  function heroParallax() {
    if (!panel || reduce) return;
    const k = Math.min(1, Math.max(0, scrollY / innerHeight));
    panel.style.transform = "translateY(" + (k * -40).toFixed(1) + "px) scale(" + (1 - k * 0.05).toFixed(3) + ")";
    panel.style.opacity = (1 - k * 0.75).toFixed(2);
    const cv = document.querySelector("#scStage canvas");
    if (cv && cv.__shoe3d) cv.__shoe3d.setAngle(-0.2 + k * 1.5);   // pastga tushganda aylanadi
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ---------- Lukbuk ---------- */
  const host = document.getElementById("lookbook");
  if (!host) return;

  function render() {
    const list = Store.products()
      .filter(p => p.stock > 0)
      .sort((a, b) => (b.isNew ? 1 : 0) - (a.isNew ? 1 : 0))
      .slice(0, 8);
    host.innerHTML =
      '<div class="container">' +
        '<div class="lb-head">' +
          '<h2>' + esc(t("lb.title")) + "</h2>" +
          "<span>" + esc(t("lb.hint")) + "</span>" +
        "</div>" +
        '<div class="lb-rail">' +
          list.map(p => {
            const sale = p.oldPrice && p.oldPrice > p.price;
            const c = p.colors[0] || "#b3123b";
            return '<article class="lb-card" data-open="' + p.id + '" style="--c:' + esc(c) + '">' +
              (p.isNew ? '<span class="lb-badge">' + esc(t("product.new")) + "</span>"
                : sale ? '<span class="lb-badge">-' + Math.round((1 - p.price / p.oldPrice) * 100) + "%</span>" : "") +
              '<div class="lb-shoe">' + (p.image
                ? '<img src="' + esc(p.image) + '" alt="" style="width:100%">'
                : window.Shoe3D && Shoe3D.supported
                  ? Shoe3D.markup(p.category, c, "card", { amp: 0.34, speed: 0.4 })
                  : NS.shoeSVG(p.category, c)) + "</div>" +
              '<span class="lb-cat">' + esc(t("cat." + p.category)) + "</span>" +
              "<h3>" + esc(pname(p)) + "</h3>" +
              '<div class="lb-price">' + money(p.price) + (sale ? "<s>" + money(p.oldPrice) + "</s>" : "") + "</div>" +
              '<button class="lb-go" aria-label="' + esc(t("product.addCart")) + '">' +
                '<svg viewBox="0 0 24 24"><path d="M5 12h13M13 6l6 6-6 6"/></svg></button>' +
              "</article>";
          }).join("") +
        "</div>" +
      "</div>";
    if (window.Shoe3D) Shoe3D.mountAll(host);
    if (window.FX) FX.refresh();
  }

  window.addEventListener("lang:change", render);
  window.addEventListener("storage", e => { if (e.key && e.key.includes("products")) render(); });
  render();
})();
