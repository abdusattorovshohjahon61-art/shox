/* Har bir mahsulot uchun alohida sahifa va sitemap yasaydi.
 *
 * Google bitta sahifadagi mahsulotni alohida ko'rmaydi — shuning uchun
 * har biriga o'z manzili bo'lgan kichik sahifa kerak: mahsulot/<id>.html
 *
 * Ishlatish:
 *   python3 -m http.server 8765      (loyiha papkasida)
 *   node tools/pages.js
 */
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const BASE = "https://abdusattorovshohjahon61-art.github.io/shox";
const OUT = path.join(ROOT, "mahsulot");

const esc = s => String(s == null ? "" : s)
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const slug = s => String(s).toLowerCase()
  .replace(/['’`]/g, "").replace(/[^a-z0-9Ѐ-ӿ]+/g, "-")
  .replace(/^-|-$/g, "").slice(0, 60);

function page(p) {
  const title = p.name.uz + " — Nilufar Shoes";
  const desc = (p.desc.uz || "").slice(0, 160) ||
    "Nilufar Shoes — O'zbekiston bo'ylab yetkazib berish bilan sifatli poyabzal.";
  const img = BASE + "/assets/products/" + p.id + ".jpg";
  const url = BASE + "/mahsulot/" + p.slug + ".html";
  const ld = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: p.name.uz,
    image: [img],
    description: desc,
    brand: { "@type": "Brand", name: "Nilufar Shoes" },
    sku: p.id,
    offers: {
      "@type": "Offer",
      url,
      priceCurrency: "UZS",
      price: p.price,
      availability: p.stock > 0
        ? "https://schema.org/InStock" : "https://schema.org/OutOfStock"
    }
  };
  return `<!doctype html>
<html lang="uz">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${url}">
<link rel="icon" href="../assets/logo.png">
<meta property="og:type" content="product">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:image" content="${img}">
<meta property="og:url" content="${url}">
<meta name="twitter:card" content="summary_large_image">
<script type="application/ld+json">${JSON.stringify(ld)}</script>
<link rel="stylesheet" href="../css/style.css">
<style>
  .lp { max-width: 980px; margin: 0 auto; padding: 48px 20px 80px; }
  .lp-grid { display: grid; gap: 36px; grid-template-columns: 1fr 1fr; align-items: start; }
  .lp img { width: 100%; height: auto; }
  .lp h1 { font-family: "Cormorant Garamond", Georgia, serif; font-size: clamp(28px, 5vw, 44px); font-weight: 400; margin: 0 0 10px; }
  .lp .price { font-family: "Cormorant Garamond", Georgia, serif; font-size: 26px; color: var(--accent); }
  .lp .meta { font-size: 13px; color: var(--muted); line-height: 1.8; margin: 18px 0; }
  .lp .cta { display: inline-block; margin-top: 18px; padding: 14px 28px; background: var(--text); color: var(--bg);
             text-decoration: none; font-size: 11.5px; letter-spacing: .22em; text-transform: uppercase; }
  .lp .back { display: inline-block; margin-bottom: 26px; font-size: 11.5px; letter-spacing: .2em;
              text-transform: uppercase; color: var(--muted); text-decoration: none; }
  @media (max-width: 760px) { .lp-grid { grid-template-columns: 1fr; } }
</style>
</head>
<body>
<main class="lp">
  <a class="back" href="../index.html">← Nilufar Shoes</a>
  <div class="lp-grid">
    <img src="../assets/products/${p.id}.jpg" alt="${esc(p.name.uz)}" width="860" height="760">
    <div>
      <h1>${esc(p.name.uz)}</h1>
      <div class="price">${p.price.toLocaleString("uz-UZ")} so'm${
        p.oldPrice > p.price ? ` <s style="font-size:16px;color:var(--muted)">${p.oldPrice.toLocaleString("uz-UZ")} so'm</s>` : ""}</div>
      <p class="meta">${esc(p.desc.uz)}</p>
      <p class="meta">
        O'lchamlar: ${p.sizes.join(", ")}<br>
        Holati: ${p.stock > 0 ? "sotuvda" : "vaqtincha yo'q"}<br>
        Yetkazib berish: O'zbekiston bo'ylab, 1–4 kun
      </p>
      <a class="cta" href="../index.html#p=${p.id}">Saytda ko'rish va buyurtma berish</a>
    </div>
  </div>
  <p class="meta" style="margin-top:40px">
    ${esc(p.name.ru)} · ${esc(p.name.en)} — Nilufar Shoes, Toshkent.
  </p>
</main>
</body>
</html>`;
}

(async () => {
  const b = await chromium.launch();
  const pg = await b.newPage();
  await pg.goto("http://localhost:8765/index.html");
  await pg.waitForFunction(() => window.NS && NS.Store.products().length);
  const products = await pg.evaluate(() => NS.Store.products().map(p => ({
    id: p.id, name: p.name, desc: p.desc, price: p.price, oldPrice: p.oldPrice,
    sizes: p.sizes, stock: p.stock, category: p.category
  })));
  await b.close();

  fs.mkdirSync(OUT, { recursive: true });
  fs.readdirSync(OUT).forEach(f => { if (f.endsWith(".html")) fs.unlinkSync(path.join(OUT, f)); });

  const urls = [BASE + "/"];
  products.forEach(p => {
    p.slug = slug(p.name.uz) || p.id;
    fs.writeFileSync(path.join(OUT, p.slug + ".html"), page(p));
    urls.push(BASE + "/mahsulot/" + p.slug + ".html");
  });

  const today = new Date().toISOString().slice(0, 10);
  fs.writeFileSync(path.join(ROOT, "sitemap.xml"),
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    urls.map((u, i) => "  <url>\n    <loc>" + u + "</loc>\n    <lastmod>" + today +
      "</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>" +
      (i === 0 ? "1.0" : "0.8") + "</priority>\n  </url>").join("\n") +
    "\n</urlset>\n");

  console.log("sahifalar:", products.length, "+ sitemap");
})();
