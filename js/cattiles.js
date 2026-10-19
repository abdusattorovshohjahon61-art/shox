/* Nilufar Shoes — kategoriya plitalari (suratlar bilan) */
(function () {
  if (!window.NS) return;
  const { Store, t, esc } = NS;
  const host = document.getElementById("catTiles");
  if (!host) return;

  function render() {
    const prods = Store.products();
    // Har bir turkum uchun suratli mahsulot tanlaymiz
    const tiles = (window.CATEGORIES || []).map(cat => {
      const p = prods.find(x => x.category === cat && x.photo) || prods.find(x => x.category === cat);
      return p ? { cat, photo: p.photo, count: prods.filter(x => x.category === cat).length } : null;
    }).filter(Boolean);
    if (!tiles.length) { host.hidden = true; return; }

    host.innerHTML =
      '<div class="section-head"><h2>' + esc(t("cats.title")) + "</h2><p>" + esc(t("cats.hint")) + "</p></div>" +
      '<div class="cat-grid">' + tiles.map(x =>
        '<button class="cat-tile" data-cat-tile="' + x.cat + '">' +
          '<span class="cat-photo"><img src="' + esc(x.photo) + '" alt="" loading="lazy"></span>' +
          '<span class="cat-name">' + esc(t("cat." + x.cat)) + "</span>" +
          '<span class="cat-count">' + x.count + "</span>" +
        "</button>").join("") + "</div>";
  }

  host.addEventListener("click", e => {
    const b = e.target.closest("[data-cat-tile]");
    if (!b) return;
    const chip = document.querySelector('#catChips [data-cat="' + b.dataset.catTile + '"]');
    if (chip) chip.click();
    document.getElementById("catalog").scrollIntoView({ behavior: "smooth" });
  });

  window.addEventListener("lang:change", render);
  window.addEventListener("storage", e => { if (e.key && e.key.includes("products")) render(); });
  render();
})();
