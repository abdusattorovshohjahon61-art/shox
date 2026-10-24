/* Nilufar Shoes — sharhlar va o'lcham mosligi.
 *
 * Poyabzalda eng ko'p beriladigan savol — "o'lchamiga to'g'ri keladimi?".
 * Shuning uchun har bir sharhda baho bilan birga o'lcham haqida javob
 * so'raladi va mahsulot oynasida umumiy xulosa ko'rsatiladi.
 *
 * Bulut ulangan bo'lsa sharhlar hamma mijozga ko'rinadi; ulanmagan bo'lsa
 * faqat shu brauzerda saqlanadi. */
window.Reviews = (function () {
  if (!window.NS) return {};
  const { Store, t, esc, toast } = NS;
  const KEY = "reviews";
  const FITS = ["small", "true", "large"];

  function local() { return Store.read(KEY, []); }
  function saveLocal(list) { Store.write(KEY, list); }

  async function forProduct(id) {
    if (window.Cloud && Cloud.ready()) {
      try {
        const rows = await Cloud.reviews(id);
        if (rows) return rows.map(r => ({
          productId: r.product_id, name: r.name, rating: r.rating, fit: r.fit, text: r.text, date: r.created_at
        }));
      } catch (e) { /* bulut javob bermasa — mahalliy ro'yxat */ }
    }
    return local().filter(r => r.productId === id);
  }

  async function add(r) {
    const row = {
      productId: r.productId,
      name: String(r.name || "").trim().slice(0, 60) || "—",
      rating: Math.max(1, Math.min(5, +r.rating || 5)),
      fit: FITS.indexOf(r.fit) < 0 ? "true" : r.fit,
      text: String(r.text || "").trim().slice(0, 600),
      date: new Date().toISOString()
    };
    const list = local();
    list.unshift(row);
    saveLocal(list);
    if (window.Cloud && Cloud.ready()) { try { await Cloud.addReview(row); } catch (e) { /* keyinroq */ } }
    return row;
  }

  /* Ro'yxatdan umumiy xulosa: o'rtacha baho va o'lcham maslahati */
  function summary(list) {
    if (!list.length) return null;
    const avg = list.reduce((s, r) => s + (+r.rating || 0), 0) / list.length;
    const count = { small: 0, true: 0, large: 0 };
    list.forEach(r => { if (count[r.fit] != null) count[r.fit]++; });
    let advice = "true", best = -1;
    FITS.forEach(f => { if (count[f] > best) { best = count[f]; advice = f; } });
    const share = list.length ? Math.round((count[advice] / list.length) * 100) : 0;
    return { avg: Math.round(avg * 10) / 10, n: list.length, advice, share, count };
  }

  function stars(v, size) {
    const full = Math.round(v);
    let out = '<span class="stars' + (size === "sm" ? " sm" : "") + '">';
    for (let i = 1; i <= 5; i++) out += '<i class="' + (i <= full ? "on" : "") + '">★</i>';
    return out + "</span>";
  }

  /* Mahsulot oynasidagi blok */
  async function mount(host, productId) {
    if (!host) return;
    const list = await forProduct(productId);
    const sm = summary(list);

    host.innerHTML =
      '<div class="rv">' +
        '<div class="rv-head">' +
          "<h4>" + esc(t("rv.title")) + "</h4>" +
          (sm ? '<div class="rv-avg">' + stars(sm.avg) + "<b>" + sm.avg.toFixed(1) + "</b>" +
                '<span class="muted">' + esc(t("rv.count", { n: sm.n })) + "</span></div>" : "") +
        "</div>" +
        (sm ? '<div class="rv-fit ' + sm.advice + '">' + esc(t("rv.fit." + sm.advice, { p: sm.share })) + "</div>" : "") +
        '<div class="rv-list">' +
          (list.length
            ? list.slice(0, 6).map(r =>
                '<div class="rv-item"><div class="rv-top"><b>' + esc(r.name) + "</b>" + stars(r.rating, "sm") +
                '<span class="muted">' + esc(t("rv.fitShort." + r.fit)) + "</span></div>" +
                (r.text ? "<p>" + esc(r.text) + "</p>" : "") + "</div>").join("")
            : '<p class="muted rv-none">' + esc(t("rv.none")) + "</p>") +
        "</div>" +
        '<button class="link-btn rv-open" id="rvOpen">' + esc(t("rv.write")) + "</button>" +
        '<form class="rv-form" id="rvForm" hidden>' +
          '<div class="rv-row">' +
            '<input name="name" placeholder="' + esc(t("rv.name")) + '" maxlength="60">' +
            '<select name="rating">' +
              [5, 4, 3, 2, 1].map(n => '<option value="' + n + '">' + "★".repeat(n) + "</option>").join("") +
            "</select>" +
          "</div>" +
          '<div class="rv-row rv-fitpick">' +
            "<span>" + esc(t("rv.fitQ")) + "</span>" +
            FITS.map((f, i) => '<label><input type="radio" name="fit" value="' + f + '"' +
              (i === 1 ? " checked" : "") + "> " + esc(t("rv.fitShort." + f)) + "</label>").join("") +
          "</div>" +
          '<textarea name="text" rows="3" maxlength="600" placeholder="' + esc(t("rv.text")) + '"></textarea>' +
          '<button class="btn btn-small btn-primary">' + esc(t("rv.send")) + "</button>" +
        "</form>" +
      "</div>";

    host.querySelector("#rvOpen").addEventListener("click", () => {
      const f = host.querySelector("#rvForm");
      f.hidden = !f.hidden;
      if (!f.hidden) f.querySelector("[name=name]").focus();
    });
    host.querySelector("#rvForm").addEventListener("submit", async e => {
      e.preventDefault();
      const f = e.target;
      await add({
        productId,
        name: f.name.value,
        rating: f.rating.value,
        fit: (f.querySelector("[name=fit]:checked") || {}).value,
        text: f.text.value
      });
      toast(t("rv.thanks"));
      mount(host, productId);
    });
  }

  return { mount, forProduct, add, summary, stars };
})();
