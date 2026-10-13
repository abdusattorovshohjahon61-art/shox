/* Nilufar Shoes — CEO panel: boshqaruv, tahlil, mahsulotlar, buyurtmalar, matnlar, sozlamalar */
(function () {
  const { Store, t, money, esc, pname, productVisual, toast, applyI18n, getLang, regionName } = NS;
  const $ = s => document.querySelector(s);
  const SESSION = "nilufar_ceo";
  const STATUSES = ["new", "confirmed", "shipping", "delivered", "cancelled"];
  const PALETTE = ["#b3123b", "#e0457b", "#c9a227", "#7c8cff", "#12a26b", "#ff8f5a", "#5bc0eb", "#9b5de5"];
  let view = "dashboard";

  /* ---------- Kirish ---------- */
  function isAuthed() { return sessionStorage.getItem(SESSION) === "1"; }
  function showApp() {
    $("#login").hidden = isAuthed();
    $("#app").hidden = !isAuthed();
    if (isAuthed()) go(location.hash.slice(1) || "dashboard");
  }
  $("#loginForm").addEventListener("submit", e => {
    e.preventDefault();
    if (e.target.password.value === Store.settings().password) {
      sessionStorage.setItem(SESSION, "1"); e.target.reset(); $("#loginError").textContent = ""; showApp();
    } else {
      $("#loginError").textContent = t("ceo.wrong");
      $(".login-card").classList.add("shake"); setTimeout(() => $(".login-card").classList.remove("shake"), 500);
    }
  });
  $("#logout").addEventListener("click", () => { sessionStorage.removeItem(SESSION); showApp(); });

  /* ---------- Navigatsiya ---------- */
  function go(v) {
    if (!document.getElementById("view-" + v)) v = "dashboard";
    view = v;
    if (location.hash.slice(1) !== v) history.replaceState(null, "", "#" + v);
    document.querySelectorAll(".side-link[data-view]").forEach(b => b.classList.toggle("active", b.dataset.view === v));
    document.querySelectorAll(".view").forEach(s => s.classList.toggle("active", s.id === "view-" + v));
    $("#viewTitle").textContent = t("ceo." + v);
    document.body.classList.remove("side-open");
    render();
  }
  document.querySelectorAll(".side-link[data-view]").forEach(b => b.addEventListener("click", () => go(b.dataset.view)));
  $("#sideBurger").addEventListener("click", () => document.body.classList.toggle("side-open"));
  window.addEventListener("hashchange", () => go(location.hash.slice(1)));

  function render() {
    applyI18n();
    $("#viewTitle").textContent = t("ceo." + view);
    const n = Store.orders().filter(o => o.status === "new").length;
    $("#newOrdersPill").textContent = n || "";
    $("#newOrdersPill").hidden = !n;
    ({ dashboard, analytics, products, orders, content, settings })[view]();
  }

  /* ---------- Hisob-kitoblar ---------- */
  function metrics() {
    const orders = Store.orders();
    const valid = orders.filter(o => o.status !== "cancelled");
    const revenue = valid.reduce((s, o) => s + o.subtotal, 0);
    const stats = Store.stats();
    const views = Object.values(stats).reduce((s, x) => s + (x.views || 0), 0);
    const carts = Object.values(stats).reduce((s, x) => s + (x.carts || 0), 0);
    const sold = Object.values(stats).reduce((s, x) => s + (x.sold || 0), 0);
    const day = 86400000, now = Date.now();
    const inRange = (o, a, b) => o.date >= now - b * day && o.date < now - a * day;
    const rev7 = valid.filter(o => inRange(o, 0, 7)).reduce((s, o) => s + o.subtotal, 0);
    const revPrev7 = valid.filter(o => inRange(o, 7, 14)).reduce((s, o) => s + o.subtotal, 0);
    return {
      orders, valid, revenue, views, carts, sold, stats,
      avg: valid.length ? revenue / valid.length : 0,
      conversion: views ? valid.length / views * 100 : 0,
      trend: revPrev7 ? (rev7 - revPrev7) / revPrev7 * 100 : 0,
      newCount: orders.filter(o => o.status === "new").length
    };
  }

  function productRows() {
    const stats = Store.stats();
    const rows = Store.products().map(p => {
      const s = stats[p.id] || {};
      const views = s.views || 0, carts = s.carts || 0, sold = s.sold || 0;
      return { p, views, carts, favs: s.favs || 0, sold, revenue: s.revenue || 0, conv: views ? sold / views * 100 : 0, stock: p.stock };
    });
    const max = k => Math.max(1, ...rows.map(r => r[k]));
    const mv = max("views"), ms = max("sold"), mf = max("favs"), mr = max("revenue");
    rows.forEach(r => {
      // Umumiy baho (0–100): sotuv, daromad, qiziqish va sevimlilar og'irligi
      r.score = Math.round((r.sold / ms) * 35 + (r.revenue / mr) * 30 + (r.views / mv) * 20 + (r.favs / mf) * 15);
      const avgConv = rows.reduce((s, x) => s + x.conv, 0) / rows.length;
      if (r.stock <= 0) r.advice = ["out", "bad"];
      else if (r.score >= 70) r.advice = r.stock < 5 ? ["lowStock", "warn"] : ["star", "star"];
      else if (r.stock < 5) r.advice = ["lowStock", "warn"];
      else if (r.views > mv * .5 && r.conv < avgConv * .6) r.advice = ["lowConv", "warn"];
      else if (r.score < 25) r.advice = ["cold", ""];
      else r.advice = ["ok", "ok"];
    });
    return rows;
  }

  /* ---------- SVG grafiklar ---------- */
  function lineChart(points) {
    const W = 640, H = 220, P = { l: 56, r: 12, t: 14, b: 28 };
    const max = Math.max(1, ...points.map(p => p.v));
    const step = (W - P.l - P.r) / Math.max(1, points.length - 1);
    const y = v => P.t + (H - P.t - P.b) * (1 - v / max);
    const xy = points.map((p, i) => [P.l + i * step, y(p.v)]);
    const path = xy.map((c, i) => (i ? "L" : "M") + c[0].toFixed(1) + " " + c[1].toFixed(1)).join(" ");
    const area = path + ` L${xy[xy.length - 1][0]} ${H - P.b} L${P.l} ${H - P.b} Z`;
    let grid = "";
    for (let i = 0; i <= 4; i++) {
      const v = max * i / 4, yy = y(v);
      grid += `<line class="grid-line" x1="${P.l}" x2="${W - P.r}" y1="${yy}" y2="${yy}"/><text x="${P.l - 8}" y="${yy + 4}" text-anchor="end">${short(v)}</text>`;
    }
    const labels = points.map((p, i) => i % 2 === 0 ? `<text x="${P.l + i * step}" y="${H - 8}" text-anchor="middle">${p.label}</text>` : "").join("");
    const dots = xy.map((c, i) => `<circle cx="${c[0]}" cy="${c[1]}" r="4" fill="var(--surface)" stroke="var(--accent)" stroke-width="2"><title>${points[i].label}: ${money(points[i].v)}</title></circle>`).join("");
    return `<svg viewBox="0 0 ${W} ${H}"><defs><linearGradient id="lg" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="var(--accent)" stop-opacity=".35"/><stop offset="1" stop-color="var(--accent)" stop-opacity="0"/></linearGradient></defs>${grid}<path class="area" d="${area}" fill="url(#lg)"/><path class="linepath" d="${path}" fill="none" stroke="var(--accent)" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/>${dots}${labels}</svg>`;
  }

  function donut(items) {
    const total = items.reduce((s, x) => s + x.v, 0) || 1;
    const R = 70, C = 2 * Math.PI * R;
    let off = 0;
    const segs = items.map((it, i) => {
      const len = it.v / total * C;
      const s = `<circle r="${R}" cx="100" cy="100" fill="none" stroke="${PALETTE[i % PALETTE.length]}" stroke-width="26" stroke-dasharray="${len} ${C - len}" stroke-dashoffset="${-off}" transform="rotate(-90 100 100)"><title>${esc(it.label)}: ${money(it.v)}</title></circle>`;
      off += len; return s;
    }).join("");
    const legend = items.map((it, i) => `<span><i style="background:${PALETTE[i % PALETTE.length]}"></i>${esc(it.label)} · ${Math.round(it.v / total * 100)}%</span>`).join("");
    return `<div style="max-width:240px;margin:auto"><svg viewBox="0 0 200 200">${segs}<text x="100" y="96" text-anchor="middle" style="font-size:12px">${esc(t("kpi.revenue"))}</text><text x="100" y="116" text-anchor="middle" style="font-size:15px;font-weight:800;fill:var(--text)">${short(total)}</text></svg></div><div class="legend">${legend}</div>`;
  }

  function hbars(items, fmt) {
    const max = Math.max(1, ...items.map(x => x.v));
    return items.map((it, i) => `<div class="hbar"><span class="name" title="${esc(it.label)}">${esc(it.label)}</span><div class="track"><div class="fill" style="width:${it.v / max * 100}%;animation-delay:${i * 70}ms"></div></div><b>${fmt ? fmt(it.v) : it.v}</b></div>`).join("");
  }

  function short(v) {
    if (v >= 1e6) return (v / 1e6).toFixed(1).replace(".0", "") + "M";
    if (v >= 1e3) return Math.round(v / 1e3) + "K";
    return Math.round(v);
  }

  function salesByDay(valid) {
    const days = [];
    const d0 = new Date(); d0.setHours(0, 0, 0, 0);
    for (let i = 13; i >= 0; i--) {
      const start = d0.getTime() - i * 86400000;
      const v = valid.filter(o => o.date >= start && o.date < start + 86400000).reduce((s, o) => s + o.subtotal, 0);
      const d = new Date(start);
      days.push({ label: String(d.getDate()).padStart(2, "0") + "." + String(d.getMonth() + 1).padStart(2, "0"), v });
    }
    return days;
  }
  function byCategory(valid) {
    const prods = Store.products();
    const m = {};
    valid.forEach(o => o.items.forEach(it => { const p = prods.find(x => x.id === it.id); const c = p ? p.category : "other"; m[c] = (m[c] || 0) + it.price * it.qty; }));
    return Object.keys(m).map(k => ({ label: t("cat." + k), v: m[k] })).sort((a, b) => b.v - a.v);
  }
  function byRegion(valid) {
    const m = {};
    valid.forEach(o => { m[o.region] = (m[o.region] || 0) + 1; });
    return Object.keys(m).map(k => ({ label: regionName(k), v: m[k] })).sort((a, b) => b.v - a.v);
  }
  function bySize(valid) {
    const m = {};
    valid.forEach(o => o.items.forEach(it => { m[it.size] = (m[it.size] || 0) + it.qty; }));
    return Object.keys(m).sort((a, b) => a - b).map(k => ({ label: k, v: m[k] }));
  }

  /* ---------- Boshqaruv ---------- */
  function dashboard() {
    const m = metrics();
    const rows = productRows().sort((a, b) => b.sold - a.sold).slice(0, 6);
    const trend = m.trend ? `<small class="${m.trend >= 0 ? "up" : "down"}">${m.trend >= 0 ? "▲" : "▼"} ${Math.abs(m.trend).toFixed(1)}% / 7d</small>` : "";
    $("#view-dashboard").innerHTML = `
      <div class="kpis">
        <div class="kpi"><span>${esc(t("kpi.revenue"))}</span><b>${money(m.revenue)}</b>${trend}</div>
        <div class="kpi"><span>${esc(t("kpi.orders"))}</span><b>${m.valid.length}</b></div>
        <div class="kpi"><span>${esc(t("kpi.avg"))}</span><b>${money(m.avg)}</b></div>
        <div class="kpi"><span>${esc(t("kpi.conversion"))}</span><b>${m.conversion.toFixed(1)}%</b></div>
        <div class="kpi"><span>${esc(t("kpi.newOrders"))}</span><b>${m.newCount}</b></div>
      </div>
      <div class="panels">
        <div class="panel wide"><h3>${esc(t("chart.sales"))}</h3><div class="chart">${lineChart(salesByDay(m.valid))}</div></div>
        <div class="panel"><h3>${esc(t("chart.categories"))}</h3><div class="chart">${donut(byCategory(m.valid))}</div></div>
        <div class="panel"><h3>${esc(t("chart.top"))}</h3>${hbars(rows.map(r => ({ label: pname(r.p), v: r.sold })))}</div>
        <div class="panel wide"><h3>${esc(t("ceo.orders"))} <button class="btn btn-small" data-go="orders">→</button></h3>${ordersTable(m.orders.slice(0, 5), true)}</div>
      </div>`;
  }

  /* ---------- Tahlil ---------- */
  let sortKey = "score", sortDir = -1;
  function analytics() {
    const m = metrics();
    const rows = productRows();
    rows.sort((a, b) => (a[sortKey] - b[sortKey]) * sortDir);
    const top = rows.slice().sort((a, b) => b.revenue - a.revenue)[0];
    const most = rows.slice().sort((a, b) => b.views - a.views)[0];
    const reg = byRegion(m.valid)[0];
    const cat = byCategory(m.valid)[0];
    const low = rows.filter(r => r.stock < 5).length;
    const abandon = m.carts ? Math.max(0, Math.round((1 - m.sold / m.carts) * 100)) : 0;
    const insights = [];
    if (top) insights.push(t("insight.best", { name: pname(top.p), sum: money(top.revenue) }));
    if (most) insights.push(t("insight.views", { name: pname(most.p), n: most.views }));
    if (reg) insights.push(t("insight.region", { name: reg.label }));
    if (cat) insights.push(t("insight.category", { name: cat.label }));
    if (low) insights.push(t("insight.low", { n: low }));
    insights.push(t("insight.abandon", { p: abandon }));

    const cols = [["views", "an.views"], ["carts", "an.carts"], ["favs", "an.favs"], ["sold", "an.sold"], ["revenue", "an.revenue"], ["conv", "an.conv"], ["stock", "an.stock"], ["score", "an.rating"]];
    const arrow = k => sortKey === k ? (sortDir < 0 ? " ↓" : " ↑") : "";
    const favTotal = Object.values(m.stats).reduce((s, x) => s + (x.favs || 0), 0);
    const funnel = [[t("kpi.views"), m.views], [t("an.favs"), favTotal], [t("an.carts"), m.carts], [t("an.sold"), m.sold]];
    const fmax = Math.max(1, funnel[0][1]);

    $("#view-analytics").innerHTML = `
      <div class="kpis">
        <div class="kpi"><span>${esc(t("kpi.views"))}</span><b>${m.views.toLocaleString("ru-RU")}</b></div>
        <div class="kpi"><span>${esc(t("an.carts"))}</span><b>${m.carts}</b></div>
        <div class="kpi"><span>${esc(t("an.sold"))}</span><b>${m.sold}</b></div>
        <div class="kpi"><span>${esc(t("kpi.conversion"))}</span><b>${m.conversion.toFixed(1)}%</b></div>
      </div>
      <div class="panels">
        <div class="panel"><h3>${esc(t("an.insights"))}</h3><ul class="insights">${insights.map(i => `<li>${esc(i)}</li>`).join("")}</ul></div>
        <div class="panel"><h3>${esc(t("chart.funnel"))}</h3>${funnel.map((f, i) => `<div class="funnel-step"><div class="fbar" style="width:${Math.max(18, f[1] / fmax * 100)}%;animation-delay:${i * 100}ms">${f[1].toLocaleString("ru-RU")}</div><span class="muted">${esc(f[0])}</span></div>`).join("")}</div>
        <div class="panel wide"><h3>${esc(t("an.title"))}</h3>
          <div class="table-wrap"><table>
            <thead><tr><th>${esc(t("an.product"))}</th>${cols.map(c => `<th data-sort="${c[0]}">${esc(t(c[1]))}${arrow(c[0])}</th>`).join("")}<th>${esc(t("an.advice"))}</th></tr></thead>
            <tbody>${rows.map(r => `<tr>
              <td><div class="t-prod"><div class="line-img">${productVisual(r.p)}</div><b>${esc(pname(r.p))}</b></div></td>
              <td>${r.views}</td><td>${r.carts}</td><td>${r.favs}</td><td>${r.sold}</td><td>${money(r.revenue)}</td>
              <td>${r.conv.toFixed(1)}%</td>
              <td><span class="pill ${r.stock <= 0 ? "bad" : r.stock < 5 ? "warn" : ""}">${r.stock}</span></td>
              <td><span class="score"><span class="track"><span class="fill" style="width:${r.score}%;display:block"></span></span>${r.score}</span></td>
              <td><span class="pill ${r.advice[1]}">${esc(t("advice." + r.advice[0]))}</span></td>
            </tr>`).join("")}</tbody>
          </table></div>
        </div>
        <div class="panel"><h3>${esc(t("chart.regions"))}</h3>${hbars(byRegion(m.valid))}</div>
        <div class="panel"><h3>${esc(t("chart.sizes"))}</h3>${hbars(bySize(m.valid))}</div>
      </div>`;
    $("#view-analytics").querySelectorAll("[data-sort]").forEach(th => th.addEventListener("click", () => {
      const k = th.dataset.sort;
      if (sortKey === k) sortDir *= -1; else { sortKey = k; sortDir = -1; }
      analytics();
    }));
  }

  /* ---------- Mahsulotlar ---------- */
  function products() {
    const list = Store.products();
    $("#view-products").innerHTML = `
      <div class="sticky-actions">
        <label class="search"><svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/></svg><input id="prodSearch" type="search" placeholder="${esc(t("search"))}"></label>
        <button class="btn btn-primary" id="addProduct">+ ${esc(t("pr.new"))}</button>
      </div>
      <div class="panel"><div class="table-wrap"><table>
        <thead><tr><th>${esc(t("an.product"))}</th><th>${esc(t("pr.category"))}</th><th>${esc(t("pr.price"))}</th><th>${esc(t("pr.stock"))}</th><th>${esc(t("pr.sizes"))}</th><th></th></tr></thead>
        <tbody id="prodRows">${list.map(p => `<tr data-row="${esc([p.name.uz, p.name.ru, p.name.en].join(" ").toLowerCase())}">
          <td><div class="t-prod"><div class="line-img">${productVisual(p)}</div><div><b>${esc(pname(p))}</b>${p.isNew ? ` <span class="pill star">${esc(t("product.new"))}</span>` : ""}</div></div></td>
          <td>${esc(t("cat." + p.category))}</td>
          <td><b>${money(p.price)}</b>${p.oldPrice ? `<br><s class="muted">${money(p.oldPrice)}</s>` : ""}</td>
          <td><span class="pill ${p.stock <= 0 ? "bad" : p.stock < 5 ? "warn" : "ok"}">${p.stock}</span></td>
          <td class="muted">${p.sizes.join(", ")}</td>
          <td><div class="row-actions">
            <button class="icon-btn" data-edit="${p.id}" title="${esc(t("edit"))}"><svg viewBox="0 0 24 24"><path d="M4 20h4L19 9l-4-4L4 16z"/></svg></button>
            <button class="icon-btn" data-del="${p.id}" title="${esc(t("delete"))}"><svg viewBox="0 0 24 24"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/></svg></button>
          </div></td>
        </tr>`).join("")}</tbody>
      </table></div></div>`;
    $("#addProduct").addEventListener("click", () => openProductForm(null));
    $("#prodSearch").addEventListener("input", e => {
      const q = e.target.value.toLowerCase();
      document.querySelectorAll("#prodRows tr").forEach(tr => { tr.hidden = q && !tr.dataset.row.includes(q); });
    });
  }
  function onProductsClick(e) {
    const ed = e.target.closest("[data-edit]");
    if (ed) return openProductForm(ed.dataset.edit);
    const del = e.target.closest("[data-del]");
    if (del && confirm(t("pr.confirmDelete"))) {
      Store.saveProducts(Store.products().filter(p => p.id !== del.dataset.del));
      Store.saveFavs(Store.favs().filter(id => id !== del.dataset.del));
      Store.saveCart(Store.cart().filter(c => c.id !== del.dataset.del));
      render();
    }
  }

  $("#view-products").addEventListener("click", onProductsClick);

  let editingImage = "";
  function openProductForm(id) {
    const p = id ? Store.product(id) : { id: "", category: "heels", price: 0, oldPrice: 0, stock: 10, isNew: true, colors: ["#b3123b"], sizes: [36, 37, 38, 39, 40], name: { uz: "", ru: "", en: "" }, desc: { uz: "", ru: "", en: "" }, image: "" };
    editingImage = p.image || "";
    $("#pfTitle").textContent = t(id ? "pr.edit" : "pr.new");
    const f = $("#productForm");
    f.dataset.id = id || "";
    f.innerHTML = `
      <div class="row2">
        <label class="field">${esc(t("pr.nameUz"))} *<input name="name_uz" required value="${esc(p.name.uz)}"></label>
        <label class="field">${esc(t("pr.nameRu"))}<input name="name_ru" value="${esc(p.name.ru)}"></label>
      </div>
      <div class="row2">
        <label class="field">${esc(t("pr.nameEn"))}<input name="name_en" value="${esc(p.name.en)}"></label>
        <label class="field">${esc(t("pr.category"))}<select name="category">${window.CATEGORIES.map(c => `<option value="${c}" ${c === p.category ? "selected" : ""}>${esc(t("cat." + c))}</option>`).join("")}</select></label>
      </div>
      <div class="row2">
        <label class="field">${esc(t("pr.price"))} *<input name="price" type="number" min="0" step="1000" required value="${p.price}"></label>
        <label class="field">${esc(t("pr.oldPrice"))}<input name="oldPrice" type="number" min="0" step="1000" value="${p.oldPrice || ""}"></label>
      </div>
      <div class="row2">
        <label class="field">${esc(t("pr.stock"))}<input name="stock" type="number" min="0" value="${p.stock}"></label>
        <label class="field">${esc(t("pr.sizes"))}<input name="sizes" value="${esc(p.sizes.join(", "))}"></label>
      </div>
      <label class="field">${esc(t("pr.colors"))}<input name="colors" value="${esc(p.colors.join(", "))}"></label>
      <label class="field">${esc(t("pr.descUz"))}<textarea name="desc_uz" rows="2">${esc(p.desc.uz)}</textarea></label>
      <label class="field">${esc(t("pr.descRu"))}<textarea name="desc_ru" rows="2">${esc(p.desc.ru)}</textarea></label>
      <label class="field">${esc(t("pr.descEn"))}<textarea name="desc_en" rows="2">${esc(p.desc.en)}</textarea></label>
      <div class="field">${esc(t("pr.image"))}
        <div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap">
          <div class="img-preview" id="imgPreview">${productVisual(p)}</div>
          <div style="flex:1;display:flex;flex-direction:column;gap:8px;min-width:200px">
            <input name="image" placeholder="${esc(t("pr.imageUrl"))}" value="${esc(p.image && !p.image.startsWith("data:") ? p.image : "")}">
            <input type="file" accept="image/*" id="imgFile">
          </div>
        </div>
      </div>
      <label class="check"><input type="checkbox" name="isNew" ${p.isNew ? "checked" : ""}> ${esc(t("pr.isNew"))}</label>
      <div style="display:flex;gap:10px;justify-content:flex-end">
        <button type="button" class="btn" data-close>${esc(t("cancel"))}</button>
        <button class="btn btn-primary">${esc(t("save"))}</button>
      </div>`;
    const preview = () => {
      const tmp = { category: f.category.value, colors: parseColors(f.colors.value), image: editingImage, name: { uz: f.name_uz.value } };
      $("#imgPreview").innerHTML = productVisual(tmp);
    };
    f.image.addEventListener("input", () => { editingImage = f.image.value.trim(); preview(); });
    f.category.addEventListener("change", preview);
    f.colors.addEventListener("input", preview);
    $("#imgFile").addEventListener("change", e => {
      const file = e.target.files[0];
      if (!file) return;
      resizeImage(file, 700).then(data => { editingImage = data; f.image.value = ""; preview(); });
    });
    openModal();
  }

  function parseColors(s) {
    const list = s.split(",").map(x => x.trim()).filter(x => /^#[0-9a-f]{3,6}$/i.test(x));
    return list.length ? list : ["#b3123b"];
  }

  /* Yuklangan rasmni kichraytirib, localStorage hajmini tejash */
  function resizeImage(file, max) {
    return new Promise(res => {
      const r = new FileReader();
      r.onload = () => {
        const img = new Image();
        img.onload = () => {
          const k = Math.min(1, max / Math.max(img.width, img.height));
          const c = document.createElement("canvas");
          c.width = img.width * k; c.height = img.height * k;
          c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
          res(c.toDataURL("image/jpeg", .82));
        };
        img.src = r.result;
      };
      r.readAsDataURL(file);
    });
  }

  $("#productForm").addEventListener("submit", e => {
    e.preventDefault();
    const f = e.target;
    if (!f.name_uz.value.trim()) { f.name_uz.classList.add("invalid"); return; }
    const list = Store.products();
    const id = f.dataset.id || "p" + Date.now().toString(36);
    const old = list.find(p => p.id === id);
    const nameUz = f.name_uz.value.trim();
    const data = {
      id,
      category: f.category.value,
      price: Math.max(0, +f.price.value || 0),
      oldPrice: Math.max(0, +f.oldPrice.value || 0),
      stock: Math.max(0, Math.floor(+f.stock.value || 0)),
      isNew: f.isNew.checked,
      sizes: f.sizes.value.split(",").map(x => parseFloat(x)).filter(x => !isNaN(x)),
      colors: parseColors(f.colors.value),
      name: { uz: nameUz, ru: f.name_ru.value.trim() || nameUz, en: f.name_en.value.trim() || nameUz },
      desc: { uz: f.desc_uz.value.trim(), ru: f.desc_ru.value.trim(), en: f.desc_en.value.trim() },
      image: editingImage
    };
    if (!data.sizes.length) data.sizes = [36, 37, 38, 39, 40];
    if (old) Object.assign(old, data); else list.unshift(data);
    if (!Store.saveProducts(list)) { toast("Storage full", "err"); return; }
    closeModal();
    toast(t("set.saved"));
    render();
  });

  /* ---------- Buyurtmalar ---------- */
  let orderFilter = "all";
  function ordersTable(list, compact) {
    if (!list.length) return `<p class="muted">${esc(t("or.empty"))}</p>`;
    const prods = Store.products();
    return `<div class="table-wrap"><table>
      <thead><tr><th>${esc(t("or.id"))}</th><th>${esc(t("or.date"))}</th><th>${esc(t("or.client"))}</th><th>${esc(t("or.region"))}</th>${compact ? "" : `<th>${esc(t("or.items"))}</th>`}<th>${esc(t("or.sum"))}</th><th>${esc(t("or.status"))}</th></tr></thead>
      <tbody>${list.map(o => `<tr>
        <td><b>#${o.id}</b></td>
        <td class="muted">${new Date(o.date).toLocaleString(getLang() === "en" ? "en-GB" : "ru-RU", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</td>
        <td><b>${esc(o.name)}</b><br><a class="muted" href="tel:${esc(o.phone.replace(/\s/g, ""))}">${esc(o.phone)}</a>${o.phone2 ? `<br><small class="muted">${esc(o.phone2)}</small>` : ""}</td>
        <td style="white-space:normal;min-width:160px"><b>${esc(regionName(o.region))}</b>${o.district ? ", " + esc(o.district) : ""}<br><small class="muted">${esc(o.address)}${o.landmark ? " · " + esc(o.landmark) : ""}</small>${o.note ? `<br><small>💬 ${esc(o.note)}</small>` : ""}</td>
        ${compact ? "" : `<td class="order-items">${o.items.map(it => { const p = prods.find(x => x.id === it.id); return `${esc(p ? pname(p) : it.id)} · ${it.size} · ×${it.qty}`; }).join("<br>")}<br><small>${esc(t("pay." + o.payment))}</small></td>`}
        <td><b>${money(o.total)}</b></td>
        <td><select class="status-select" data-status="${o.id}">${STATUSES.map(s => `<option value="${s}" ${s === o.status ? "selected" : ""}>${esc(t("st." + s))}</option>`).join("")}</select></td>
      </tr>`).join("")}</tbody></table></div>`;
  }
  function orders() {
    const all = Store.orders();
    const list = orderFilter === "all" ? all : all.filter(o => o.status === orderFilter);
    $("#view-orders").innerHTML = `
      <div class="chips" style="margin-bottom:16px">
        <button class="chip ${orderFilter === "all" ? "active" : ""}" data-of="all">${esc(t("catalog.all"))} (${all.length})</button>
        ${STATUSES.map(s => `<button class="chip ${orderFilter === s ? "active" : ""}" data-of="${s}">${esc(t("st." + s))} (${all.filter(o => o.status === s).length})</button>`).join("")}
      </div>
      <div class="panel">${ordersTable(list, false)}</div>`;
    $("#view-orders").querySelectorAll("[data-of]").forEach(b => b.addEventListener("click", () => { orderFilter = b.dataset.of; orders(); }));
  }
  document.addEventListener("change", e => {
    const s = e.target.closest("[data-status]");
    if (!s) return;
    const list = Store.orders();
    const o = list.find(x => x.id === +s.dataset.status);
    if (!o) return;
    const prev = o.status;
    o.status = s.value;
    // Bekor qilinsa — qoldiq va statistikani qaytarish; qayta tiklansa — yana ayirish
    if ((prev === "cancelled") !== (o.status === "cancelled")) {
      const sign = o.status === "cancelled" ? 1 : -1;
      const prods = Store.products();
      o.items.forEach(it => {
        const p = prods.find(x => x.id === it.id);
        if (p) p.stock = Math.max(0, p.stock + sign * it.qty);
        Store.track(it.id, "sold", -sign * it.qty, -sign * it.price * it.qty);
      });
      Store.saveProducts(prods);
    }
    Store.saveOrders(list);
    toast(t("st." + o.status));
    render();
  });

  /* ---------- Sayt matnlari ---------- */
  function content() {
    const c = Store.content();
    const langs = ["uz", "ru", "en"];
    $("#view-content").innerHTML = `
      <p class="muted">${esc(t("ct.hint"))}</p>
      <div class="sticky-actions">
        <label class="search"><svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/></svg><input id="ctSearch" type="search" placeholder="${esc(t("ct.filter"))}"></label>
        <a class="btn" href="index.html?edit=1" target="_blank">✎ ${esc(t("ct.inline"))}</a>
        <button class="btn btn-danger" id="ctReset">${esc(t("ct.reset"))}</button>
        <button class="btn btn-primary" id="ctSave">${esc(t("save"))}</button>
      </div>
      <div class="content-list">${window.EDITABLE_KEYS.map(k => `
        <div class="content-item" data-key="${k}">
          <code>${k}</code>
          <div class="langs">${langs.map(l => {
            const v = (c[l] && c[l][k]) || window.I18N[l][k];
            const changed = c[l] && c[l][k] ? "changed" : "";
            return `<label>${l.toUpperCase()}<textarea class="${changed}" data-l="${l}" data-k="${k}" rows="${v.length > 90 ? 3 : 1}">${esc(v)}</textarea></label>`;
          }).join("")}</div>
        </div>`).join("")}</div>`;
    $("#ctSearch").addEventListener("input", e => {
      const q = e.target.value.toLowerCase();
      document.querySelectorAll(".content-item").forEach(it => {
        it.hidden = q && !(it.dataset.key.includes(q) || [...it.querySelectorAll("textarea")].some(x => x.value.toLowerCase().includes(q)));
      });
    });
    $("#ctSave").addEventListener("click", () => {
      const out = { uz: {}, ru: {}, en: {} };
      document.querySelectorAll(".content-item textarea").forEach(ta => {
        const v = ta.value.trim();
        if (v && v !== window.I18N[ta.dataset.l][ta.dataset.k]) out[ta.dataset.l][ta.dataset.k] = v;
      });
      // Ro'yxatda bo'lmagan (inline orqali kiritilgan) kalitlarni saqlab qolish
      const prev = Store.content();
      langs.forEach(l => Object.keys(prev[l] || {}).forEach(k => { if (!window.EDITABLE_KEYS.includes(k)) out[l][k] = prev[l][k]; }));
      Store.saveContent(out);
      toast(t("ct.saved"));
      render();
    });
    $("#ctReset").addEventListener("click", () => {
      if (!confirm(t("ct.reset") + "?")) return;
      Store.saveContent({ uz: {}, ru: {}, en: {} });
      render();
    });
  }

  /* ---------- Sozlamalar ---------- */
  function settings() {
    const s = Store.settings();
    $("#view-settings").innerHTML = `
      <div class="settings-grid">
        <form class="panel form" id="passForm">
          <h3>${esc(t("set.changePass"))}</h3>
          <label class="field">${esc(t("set.password"))}<input name="pass" type="password" minlength="4" required autocomplete="new-password"></label>
          <button class="btn btn-primary">${esc(t("save"))}</button>
        </form>
        <form class="panel form" id="shopForm">
          <h3>${esc(t("cart.delivery"))}</h3>
          <label class="field">${esc(t("set.delivery"))}<input name="deliveryPrice" type="number" min="0" step="1000" value="${s.deliveryPrice}"></label>
          <label class="field">${esc(t("set.freeFrom"))}<input name="freeFrom" type="number" min="0" step="10000" value="${s.freeFrom}"></label>
          <button class="btn btn-primary">${esc(t("save"))}</button>
        </form>
        <div class="panel form">
          <h3>${esc(t("set.data"))}</h3>
          <button class="btn" id="exportBtn">⬇ ${esc(t("set.export"))}</button>
          <label class="btn" style="cursor:pointer">⬆ ${esc(t("set.import"))}<input type="file" accept="application/json" id="importFile" hidden></label>
          <button class="btn btn-danger" id="resetBtn">${esc(t("set.resetDemo"))}</button>
        </div>
      </div>`;
    $("#passForm").addEventListener("submit", e => {
      e.preventDefault();
      Store.saveSettings(Object.assign(Store.settings(), { password: e.target.pass.value }));
      e.target.reset(); toast(t("set.passChanged"));
    });
    $("#shopForm").addEventListener("submit", e => {
      e.preventDefault();
      Store.saveSettings(Object.assign(Store.settings(), { deliveryPrice: +e.target.deliveryPrice.value || 0, freeFrom: +e.target.freeFrom.value || 0 }));
      toast(t("set.saved"));
    });
    $("#exportBtn").addEventListener("click", () => {
      const dump = {};
      ["products", "orders", "stats", "content", "settings"].forEach(k => { dump[k] = Store.read(k, null); });
      NS.download("nilufar-shoes-" + new Date().toISOString().slice(0, 10) + ".json", JSON.stringify(dump, null, 2));
    });
    $("#importFile").addEventListener("change", e => {
      const file = e.target.files[0];
      if (!file) return;
      file.text().then(txt => {
        try {
          const d = JSON.parse(txt);
          ["products", "orders", "stats", "content", "settings"].forEach(k => { if (d[k]) Store.write(k, d[k]); });
          toast(t("set.saved")); render();
        } catch (err) { toast("JSON error", "err"); }
      });
    });
    $("#resetBtn").addEventListener("click", () => {
      if (!confirm(t("set.confirmReset"))) return;
      Store.seedDemo(); Store.saveCart([]); Store.saveFavs([]);
      toast(t("set.saved")); render();
    });
  }

  /* ---------- Modal ---------- */
  function openModal() { $("#productModal").classList.add("open"); $("#overlay").classList.add("open"); document.body.classList.add("lock"); }
  function closeModal() { $("#productModal").classList.remove("open"); $("#overlay").classList.remove("open"); document.body.classList.remove("lock"); }
  document.addEventListener("click", e => {
    if (e.target.closest("[data-close]") || e.target.id === "overlay" || e.target.id === "productModal") closeModal();
    const g = e.target.closest("[data-go]");
    if (g) go(g.dataset.go);
  });
  document.addEventListener("keydown", e => { if (e.key === "Escape") closeModal(); });

  window.addEventListener("lang:change", () => { if (isAuthed()) render(); });
  window.addEventListener("storage", e => { if (isAuthed() && e.key && e.key.startsWith("nilufar_v1") && !/content|settings/.test(e.key)) render(); });

  NS.bindCommon();
  applyI18n();
  showApp();
})();
