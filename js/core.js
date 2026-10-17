/* Nilufar Shoes — umumiy yadro: saqlash, til, mavzu, yordamchi funksiyalar.
 * Barcha ma'lumotlar brauzer localStorage'ida saqlanadi (backend talab qilinmaydi). */
(function () {
  const KEY = "nilufar_v1";
  const DEFAULT_SETTINGS = {
    storeName: "Nilufar Shoes",
    password: "admin123",
    deliveryPrice: 30000,
    freeFrom: 500000,
    cardNumber: "8600 1234 5678 9012",
    cardHolder: "NILUFAR SHOES",
    clickLink: "",
    paymeLink: ""
  };

  /* ---------- Saqlash ---------- */
  function read(name, fallback) {
    try {
      const v = localStorage.getItem(KEY + ":" + name);
      return v == null ? fallback : JSON.parse(v);
    } catch (e) { return fallback; }
  }
  function write(name, value) {
    try { localStorage.setItem(KEY + ":" + name, JSON.stringify(value)); } catch (e) { return false; }
    window.dispatchEvent(new CustomEvent("store:change", { detail: name }));
    return true;
  }

  /* ---------- Demo mahsulotlar ---------- */
  const SEED_PRODUCTS = [
    { id: "p1", category: "heels", price: 489000, oldPrice: 590000, stock: 14, isNew: true,
      colors: ["#111111", "#b3123b", "#d9b38c"], sizes: [35, 36, 37, 38, 39, 40],
      name: { uz: "Klassik qora tufli", ru: "Классические чёрные туфли", en: "Classic black heels" },
      desc: { uz: "Natural charmdan tikilgan 9 sm poshnali klassik tufli. Kechki va ofis uslubi uchun.", ru: "Классические туфли на 9 см каблуке из натуральной кожи. Для офиса и вечера.", en: "Classic 9 cm heels in genuine leather. Perfect for office and evenings." } },
    { id: "p2", category: "heels", price: 545000, oldPrice: 0, stock: 6, isNew: true,
      colors: ["#e8c4b8", "#f5f0e6"], sizes: [36, 37, 38, 39],
      name: { uz: "Pudra rang bosonojka", ru: "Босоножки пудрового цвета", en: "Powder pink stilettos" },
      desc: { uz: "Nozik pudra rangdagi yengil bosonojka, to'y va bayramlar uchun.", ru: "Нежные босоножки пудрового цвета для свадеб и праздников.", en: "Delicate powder-pink stilettos for weddings and celebrations." } },
    { id: "p3", category: "sneakers", price: 399000, oldPrice: 459000, stock: 25, isNew: false,
      colors: ["#f4f4f4", "#1d1d1d", "#7c8cff"], sizes: [36, 37, 38, 39, 40, 41, 42, 43],
      name: { uz: "Oq Cloud krossovka", ru: "Белые кроссовки Cloud", en: "White Cloud sneakers" },
      desc: { uz: "Havo yostiqli yengil krossovka. Kun bo'yi qulaylik.", ru: "Лёгкие кроссовки с воздушной подошвой. Комфорт весь день.", en: "Lightweight air-cushion sneakers. All-day comfort." } },
    { id: "p4", category: "sneakers", price: 459000, oldPrice: 0, stock: 3, isNew: true,
      colors: ["#ff6b6b", "#222222"], sizes: [38, 39, 40, 41, 42, 43, 44],
      name: { uz: "Runner Pro sport", ru: "Спортивные Runner Pro", en: "Runner Pro sport" },
      desc: { uz: "Yugurish va sport zali uchun mustahkam taglikli krossovka.", ru: "Кроссовки с прочной подошвой для бега и зала.", en: "Durable-sole sneakers for running and the gym." } },
    { id: "p5", category: "boots", price: 789000, oldPrice: 920000, stock: 9, isNew: false,
      colors: ["#4a2c1d", "#111111"], sizes: [36, 37, 38, 39, 40],
      name: { uz: "Charm etik Milano", ru: "Кожаные сапоги Milano", en: "Milano leather boots" },
      desc: { uz: "Ichi mo'ynali, qishki charm etik. Sovuqdan ishonchli himoya.", ru: "Зимние кожаные сапоги на меху. Надёжная защита от холода.", en: "Fur-lined winter leather boots. Reliable protection from cold." } },
    { id: "p6", category: "boots", price: 649000, oldPrice: 0, stock: 0, isNew: false,
      colors: ["#8b6b4a", "#2b2b2b"], sizes: [37, 38, 39, 40, 41],
      name: { uz: "Chelsea botinka", ru: "Ботинки Челси", en: "Chelsea boots" },
      desc: { uz: "Zamonaviy Chelsea uslubidagi kuzgi botinka.", ru: "Осенние ботинки в стиле Челси.", en: "Modern Chelsea-style autumn boots." } },
    { id: "p7", category: "sandals", price: 259000, oldPrice: 299000, stock: 30, isNew: false,
      colors: ["#d9b38c", "#ffffff", "#111111"], sizes: [35, 36, 37, 38, 39, 40],
      name: { uz: "Yozgi sandal Riviera", ru: "Летние сандалии Riviera", en: "Riviera summer sandals" },
      desc: { uz: "Yumshoq taglikli yengil yozgi sandal.", ru: "Лёгкие летние сандалии с мягкой стелькой.", en: "Light summer sandals with a soft insole." } },
    { id: "p8", category: "flats", price: 299000, oldPrice: 0, stock: 18, isNew: true,
      colors: ["#b3123b", "#111111", "#e8c4b8"], sizes: [35, 36, 37, 38, 39],
      name: { uz: "Balet tufli Grace", ru: "Балетки Grace", en: "Grace ballet flats" },
      desc: { uz: "Har kuni kiyish uchun qulay balet tufli.", ru: "Удобные балетки на каждый день.", en: "Comfortable everyday ballet flats." } },
    { id: "p9", category: "loafers", price: 429000, oldPrice: 0, stock: 11, isNew: false,
      colors: ["#3b2416", "#111111"], sizes: [39, 40, 41, 42, 43, 44, 45],
      name: { uz: "Erkaklar loferi Oxford", ru: "Мужские лоферы Oxford", en: "Oxford men's loafers" },
      desc: { uz: "Klassik erkaklar loferi, natural charm.", ru: "Классические мужские лоферы из натуральной кожи.", en: "Classic men's loafers in genuine leather." } },
    { id: "p10", category: "loafers", price: 379000, oldPrice: 449000, stock: 4, isNew: false,
      colors: ["#f5f0e6", "#c49a6c"], sizes: [36, 37, 38, 39, 40],
      name: { uz: "Ayollar loferi Soft", ru: "Женские лоферы Soft", en: "Soft women's loafers" },
      desc: { uz: "Yumshoq zamshdan tikilgan ayollar loferi.", ru: "Женские лоферы из мягкой замши.", en: "Women's loafers in soft suede." } },
    { id: "p11", category: "heels", price: 519000, oldPrice: 0, stock: 8, isNew: false,
      colors: ["#c9a227", "#c0c0c0"], sizes: [36, 37, 38, 39],
      name: { uz: "Oltin kechki tufli", ru: "Золотые вечерние туфли", en: "Golden evening heels" },
      desc: { uz: "Yaltiroq oltin rangli kechki tufli.", ru: "Блестящие вечерние туфли золотого цвета.", en: "Shimmering gold evening heels." } },
    { id: "p12", category: "sandals", price: 219000, oldPrice: 0, stock: 22, isNew: true,
      colors: ["#7fc8a9", "#ffffff"], sizes: [36, 37, 38, 39, 40, 41],
      name: { uz: "Platformali shlyopanets", ru: "Шлёпанцы на платформе", en: "Platform slides" },
      desc: { uz: "Plyaj va dam olish uchun platformali shlyopanets.", ru: "Шлёпанцы на платформе для пляжа и отдыха.", en: "Platform slides for the beach and leisure." } }
  ];

  const FIRST_NAMES = ["Malika", "Dilnoza", "Sevara", "Aziza", "Madina", "Shahzoda", "Jasur", "Bekzod", "Gulnora", "Nodira", "Sardor", "Kamola"];
  const LAST_NAMES = ["Karimova", "Yusupova", "Rahimova", "Aliyeva", "Tursunova", "Ergashev", "Nazarov", "Saidova"];

  function rnd(n) { return Math.floor(Math.random() * n); }

  /* Tahlil sahifasi bo'sh bo'lmasligi uchun demo buyurtma va statistikalar */
  function seedDemo() {
    const products = JSON.parse(JSON.stringify(SEED_PRODUCTS));
    const stats = {};
    products.forEach(p => {
      const pop = 0.4 + Math.random() * 1.6;
      stats[p.id] = { views: Math.round(80 * pop + rnd(60)), carts: 0, favs: Math.round(10 * pop + rnd(8)), sold: 0, revenue: 0 };
    });
    const regionW = ["tashkent_city", "tashkent_city", "tashkent_city", "tashkent", "samarkand", "fergana", "andijan", "bukhara", "namangan", "kashkadarya", "khorezm", "navoi"];
    const statuses = ["delivered", "delivered", "delivered", "shipping", "confirmed", "new", "cancelled"];
    const orders = [];
    const now = Date.now();
    for (let i = 0; i < 46; i++) {
      const items = [];
      const count = 1 + rnd(2);
      for (let j = 0; j < count; j++) {
        const p = products[rnd(products.length)];
        items.push({ id: p.id, size: p.sizes[rnd(p.sizes.length)], color: p.colors[0], qty: 1 + (Math.random() < 0.15 ? 1 : 0), price: p.price });
      }
      const subtotal = items.reduce((s, it) => s + it.price * it.qty, 0);
      const delivery = subtotal >= DEFAULT_SETTINGS.freeFrom ? 0 : DEFAULT_SETTINGS.deliveryPrice;
      const daysAgo = rnd(14);
      const status = statuses[rnd(statuses.length)];
      const o = {
        id: 1000 + i,
        date: now - daysAgo * 86400000 - rnd(80000000),
        name: FIRST_NAMES[rnd(FIRST_NAMES.length)] + " " + LAST_NAMES[rnd(LAST_NAMES.length)],
        phone: "+998 9" + rnd(10) + " " + (100 + rnd(900)) + " " + (10 + rnd(90)) + " " + (10 + rnd(90)),
        phone2: "", region: regionW[rnd(regionW.length)], district: "", address: "—", landmark: "",
        payment: ["cash", "click", "payme", "card"][rnd(4)], note: "",
        items, subtotal, delivery, total: subtotal + delivery, status
      };
      // To'lov holati: naqd — yetkazishda, boshqalari — holatiga qarab
      o.payStatus = o.payment === "cash" ? "cod"
        : status === "delivered" ? "paid"
          : status === "cancelled" ? "unpaid"
            : ["paid", "pending", "unpaid"][rnd(3)];
      orders.push(o);
      items.forEach(it => {
        stats[it.id].carts += it.qty + rnd(2);
        if (status !== "cancelled") { stats[it.id].sold += it.qty; stats[it.id].revenue += it.price * it.qty; }
      });
    }
    products.forEach(p => { stats[p.id].carts += rnd(10); stats[p.id].views += stats[p.id].carts * 2; });
    orders.sort((a, b) => b.date - a.date);
    write("products", products);
    write("stats", stats);
    write("orders", orders);
    write("content", { uz: {}, ru: {}, en: {} });
    write("settings", Object.assign({}, DEFAULT_SETTINGS));
    write("seeded", true);
  }

  if (!read("seeded", false)) seedDemo();

  /* ---------- Do'kon API ---------- */
  const Store = {
    read, write, seedDemo,
    products: () => read("products", []),
    saveProducts: list => write("products", list),
    product: id => read("products", []).find(p => p.id === id),
    orders: () => read("orders", []),
    saveOrders: list => write("orders", list),
    settings: () => Object.assign({}, DEFAULT_SETTINGS, read("settings", {})),
    saveSettings: s => write("settings", s),
    content: () => read("content", { uz: {}, ru: {}, en: {} }),
    saveContent: c => write("content", c),
    cart: () => read("cart", []),
    saveCart: c => write("cart", c),
    favs: () => read("favs", []),
    saveFavs: f => write("favs", f),
    stats: () => read("stats", {}),
    /* Analitika hodisasi: views | carts | favs | sold */
    track(id, field, amount = 1, revenue = 0) {
      const s = read("stats", {});
      s[id] = s[id] || { views: 0, carts: 0, favs: 0, sold: 0, revenue: 0 };
      s[id][field] = Math.max(0, (s[id][field] || 0) + amount);
      if (revenue) s[id].revenue += revenue;
      write("stats", s);
    }
  };

  /* ---------- Til ---------- */
  let lang = read("lang", "uz");
  if (!window.I18N[lang]) lang = "uz";

  function t(key, vars) {
    const c = Store.content();
    let s = (c[lang] && c[lang][key]) || window.I18N[lang][key] || window.I18N.uz[key] || key;
    if (vars) Object.keys(vars).forEach(k => { s = s.split("{" + k + "}").join(vars[k]); });
    return s;
  }
  function setLang(l) {
    lang = l; write("lang", l);
    document.documentElement.lang = l;
    applyI18n();
    window.dispatchEvent(new CustomEvent("lang:change"));
  }
  /* data-i18n, data-i18n-ph (placeholder), data-i18n-title atributlarini to'ldiradi */
  function applyI18n(root = document) {
    root.querySelectorAll("[data-i18n]").forEach(el => {
      if (el.isContentEditable && document.activeElement === el) return;
      el.textContent = t(el.dataset.i18n);
    });
    root.querySelectorAll("[data-i18n-ph]").forEach(el => { el.placeholder = t(el.dataset.i18nPh); });
    root.querySelectorAll("[data-i18n-title]").forEach(el => { el.title = t(el.dataset.i18nTitle); el.setAttribute("aria-label", el.title); });
    document.querySelectorAll(".lang-switch button").forEach(b => b.classList.toggle("active", b.dataset.lang === lang));
  }

  /* ---------- Kun / tun rejimi ---------- */
  function initTheme() {
    const saved = read("theme", null);
    const sysDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
    setTheme(saved || (sysDark ? "dark" : "light"), false);
  }
  function setTheme(th, persist = true) {
    document.documentElement.dataset.theme = th;
    if (persist) write("theme", th);
  }
  function toggleTheme() {
    const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    document.documentElement.classList.add("theme-anim");
    setTheme(next);
    setTimeout(() => document.documentElement.classList.remove("theme-anim"), 500);
  }

  /* ---------- Yordamchilar ---------- */
  function money(n) {
    return Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ") + " " + t("currency");
  }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }
  function pname(p) { return (p.name && (p.name[lang] || p.name.uz)) || ""; }
  function pdesc(p) { return (p.desc && (p.desc[lang] || p.desc.uz)) || ""; }
  function regionName(id) {
    const r = window.REGIONS.find(r => r.id === id);
    return r ? r[lang] : id || "—";
  }

  function toast(msg, type = "ok") {
    let box = document.querySelector(".toasts");
    if (!box) { box = document.createElement("div"); box.className = "toasts"; document.body.appendChild(box); }
    const el = document.createElement("div");
    el.className = "toast toast-" + type;
    el.textContent = msg;
    box.appendChild(el);
    requestAnimationFrame(() => el.classList.add("show"));
    setTimeout(() => { el.classList.remove("show"); setTimeout(() => el.remove(), 400); }, 2600);
  }

  /* Rasm bo'lmasa — mahsulot rangidagi stilizatsiyalangan poyabzal SVG */
  const SHOE_PATHS = {
    heels: '<path d="M18 142 C18 130 28 124 46 123 C66 122 84 116 102 104 C118 93 132 80 148 70 C156 65 166 64 173 68 C177 86 177 104 171 120 L122 136 C100 143 60 146 30 146 C22 146 18 145 18 142 Z" fill="C"/><path d="M104 106 C120 96 136 84 150 76 C158 72 166 72 171 74 C171 80 169 84 165 86 C146 95 126 104 104 106 Z" fill="D"/><path d="M155 120 L172 117 L169 168 L163 168 Z" fill="D"/><path d="M18 142 C18 145 22 146 30 146 C60 146 100 143 122 136 L124 140 C100 148 60 150 30 150 C22 150 18 148 18 142 Z" fill="D"/>',
    sneakers: '<path d="M16 120 C16 96 30 80 52 78 L84 76 C96 76 104 88 116 94 L160 108 C178 113 186 122 186 132 L186 140 L16 140 Z" fill="C"/><path d="M16 140 L186 140 L186 150 C186 154 182 156 178 156 L22 156 C18 156 16 154 16 150 Z" fill="D"/><path d="M60 92 L76 108 M74 88 L90 104 M88 92 L102 104" stroke="D" stroke-width="5" stroke-linecap="round"/>',
    boots: '<path d="M56 24 L112 24 L114 112 C130 116 160 122 174 130 C184 136 186 144 186 150 L186 154 L56 154 Z" fill="C"/><path d="M56 154 L186 154 L186 166 L56 166 Z" fill="D"/><path d="M56 40 L112 40" stroke="D" stroke-width="6"/>',
    sandals: '<path d="M18 132 C18 122 28 118 44 118 L168 118 C182 118 188 124 188 132 C188 140 182 144 168 144 L44 144 C28 144 18 142 18 132 Z" fill="C"/><path d="M58 120 C62 94 96 84 118 95 C133 102 139 110 142 120 L126 120 C122 108 112 101 99 101 C85 101 77 108 73 120 Z" fill="D"/><path d="M132 120 C136 104 152 98 164 106 C170 110 172 115 173 120 L160 120 C157 114 150 111 144 114 C140 116 139 118 138 120 Z" fill="D"/>',
    flats: '<path d="M18 120 C18 100 36 92 60 92 L120 94 C150 96 176 104 186 118 C190 126 186 136 176 136 L30 136 C22 136 18 130 18 120 Z" fill="C"/><path d="M24 136 L180 136 L178 142 L28 142 Z" fill="D"/><path d="M110 100 C116 92 128 92 132 100 C128 108 116 108 110 100 Z" fill="D"/>',
    loafers: '<path d="M16 122 C16 98 34 86 60 84 L110 84 C140 86 172 98 184 116 C190 126 186 138 174 138 L28 138 C20 138 16 132 16 122 Z" fill="C"/><path d="M16 138 L184 138 L184 148 L16 148 Z" fill="D"/><path d="M96 92 L140 100" stroke="D" stroke-width="6" stroke-linecap="round"/>'
  };
  function shade(hex, amt) {
    let c = hex.replace("#", "");
    if (c.length === 3) c = c.split("").map(x => x + x).join("");
    const n = parseInt(c, 16);
    const f = v => Math.max(0, Math.min(255, v + amt));
    const r = f(n >> 16), g = f((n >> 8) & 255), b = f(n & 255);
    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  }
  function shoeSVG(category, color) {
    const c = color || "#b3123b";
    const lum = parseInt(c.replace("#", "").padEnd(6, "0"), 16);
    const light = ((lum >> 16) * 0.3 + ((lum >> 8) & 255) * 0.59 + (lum & 255) * 0.11) > 200;
    const d = light ? shade(c, -70) : shade(c, -45);
    const path = (SHOE_PATHS[category] || SHOE_PATHS.heels).split('"C"').join('"' + c + '"').split('"D"').join('"' + d + '"');
    return '<svg class="shoe-svg" viewBox="0 0 200 180" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
      '<ellipse cx="100" cy="170" rx="80" ry="7" fill="rgba(0,0,0,.18)"/>' + path + '</svg>';
  }
  function productVisual(p, color) {
    if (p.image) return '<img src="' + esc(p.image) + '" alt="' + esc(pname(p)) + '" loading="lazy">';
    return shoeSVG(p.category, color || (p.colors && p.colors[0]));
  }

  /* Vitrina uchun 3D ko'rinish (Shoe3D bo'lmasa — SVG) */
  function productVisual3D(p, color, mode) {
    if (p.image) return '<img src="' + esc(p.image) + '" alt="' + esc(pname(p)) + '" loading="lazy">';
    const c = color || (p.colors && p.colors[0]) || "#b3123b";
    if (window.Shoe3D && Shoe3D.supported) {
      // Har bir mahsulot o'z fazasida tebransin — setka bir xil harakatlanmasin
      const seed = p.id.split("").reduce((a, ch) => a + ch.charCodeAt(0), 0);
      return Shoe3D.markup(p.category, c, mode, {
        phase: ((seed % 63) / 10).toFixed(2),
        speed: (0.45 + (seed % 5) * 0.06).toFixed(2)
      });
    }
    return shoeSVG(p.category, c);
  }

  function download(name, text) {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([text], { type: "application/json" }));
    a.download = name; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  /* Telefon maskasi: +998 XX XXX XX XX */
  function phoneMask(input) {
    input.addEventListener("input", () => {
      let d = input.value.replace(/\D/g, "");
      if (d.startsWith("998")) d = d.slice(3);
      d = d.slice(0, 9);
      let out = "+998";
      if (d.length) out += " " + d.slice(0, 2);
      if (d.length > 2) out += " " + d.slice(2, 5);
      if (d.length > 5) out += " " + d.slice(5, 7);
      if (d.length > 7) out += " " + d.slice(7, 9);
      input.value = out;
    });
    input.addEventListener("focus", () => { if (!input.value) input.value = "+998 "; });
  }

  /* Header'dagi umumiy boshqaruvlar */
  function bindCommon() {
    document.querySelectorAll(".lang-switch button").forEach(b => b.addEventListener("click", () => setLang(b.dataset.lang)));
    document.querySelectorAll("[data-theme-toggle]").forEach(b => b.addEventListener("click", toggleTheme));
  }

  initTheme();
  document.documentElement.lang = lang;

  window.NS = {
    Store, t, setLang, getLang: () => lang, applyI18n, toggleTheme, money, esc, pname, pdesc,
    regionName, toast, shoeSVG, productVisual, productVisual3D, download, phoneMask, bindCommon, rnd,
    SHOE_PATHS, shade
  };
})();
