/* Nilufar Shoes — tashqi analitika.
 * CEO panelda ID kiritilsa, skript o'zi ulanadi; bo'lmasa hech narsa yuklanmaydi. */
(function () {
  if (!window.NS) return;
  const s = NS.Store.settings();

  if (s.gaId) {
    const sc = document.createElement("script");
    sc.async = true;
    sc.src = "https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(s.gaId);
    document.head.appendChild(sc);
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { dataLayer.push(arguments); };
    gtag("js", new Date());
    gtag("config", s.gaId);
  }

  if (s.metrikaId) {
    const id = String(s.metrikaId).replace(/\D/g, "");
    if (id) {
      (function (m, e, t, r, i, k, a) {
        m[i] = m[i] || function () { (m[i].a = m[i].a || []).push(arguments); };
        m[i].l = 1 * new Date();
        k = e.createElement(t); a = e.getElementsByTagName(t)[0];
        k.async = 1; k.src = r; a.parentNode.insertBefore(k, a);
      })(window, document, "script", "https://mc.yandex.ru/metrika/tag.js", "ym");
      ym(id, "init", { clickmap: true, trackLinks: true, accurateTrackBounce: true });
    }
  }

  /* Sotuv hodisasi — ikkala tizimga ham */
  window.addEventListener("order:done", e => {
    const o = e.detail || {};
    if (window.gtag) gtag("event", "purchase", { transaction_id: o.id, value: o.total, currency: "UZS" });
    if (window.ym && s.metrikaId) ym(String(s.metrikaId).replace(/\D/g, ""), "reachGoal", "order");
  });
})();
