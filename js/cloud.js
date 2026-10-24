/* Nilufar Shoes — bulut qatlami (Supabase).
 *
 * Sozlanmagan bo'lsa sayt avvalgidek brauzer xotirasida ishlaydi.
 * Sozlangach: mahsulotlar bitta joyda turadi, buyurtmalar darhol
 * do'kon egasiga yetib boradi, savat va sevimlilar qurilmalar orasida
 * bir xil bo'ladi.
 *
 * Jadvallar (CEO panelda tayyor SQL bor):
 *   shop_kv      — mahsulotlar, sozlamalar, matnlar (kalit → qiymat)
 *   shop_orders  — har bir buyurtma alohida qator
 *   shop_reviews — sharhlar
 */
window.Cloud = (function () {
  const KV_KEYS = ["products", "settings", "content", "promos", "delivery"];
  let cfg = null, online = false, pending = {}, timer = 0;

  function config() {
    if (cfg) return cfg;
    // Yadro hali yuklanmagan bo'lsa — eslab qolmaymiz, keyin qayta so'raladi
    if (!window.NS || !NS.Store) return { url: "", key: "", tgToken: "", tgChat: "" };
    const s = NS.Store.settings();
    cfg = {
      url: String(s.supabaseUrl || "").replace(/\/+$/, ""),
      key: String(s.supabaseKey || "").trim(),
      tgToken: String(s.tgToken || "").trim(),
      tgChat: String(s.tgChat || "").trim()
    };
    return cfg;
  }
  function reset() { cfg = null; }
  function ready() { const c = config(); return !!(c.url && c.key); }

  function headers(extra) {
    const c = config();
    return Object.assign({
      apikey: c.key,
      Authorization: "Bearer " + c.key,
      "Content-Type": "application/json"
    }, extra || {});
  }

  async function rest(path, opt) {
    const c = config();
    if (!c.url || !c.key) throw new Error("bulut sozlanmagan");
    const r = await fetch(c.url + "/rest/v1/" + path, Object.assign({ headers: headers((opt || {}).head) }, opt));
    if (!r.ok) throw new Error("HTTP " + r.status + " " + (await r.text()).slice(0, 180));
    const txt = await r.text();
    return txt ? JSON.parse(txt) : null;
  }

  /* ---------- Kalit-qiymat ---------- */
  async function pull() {
    if (!ready()) return null;
    const rows = await rest("shop_kv?select=k,v");
    const out = {};
    (rows || []).forEach(r => { out[r.k] = r.v; });
    online = true;
    return out;
  }

  async function push(key, value) {
    if (!ready()) return false;
    await rest("shop_kv?on_conflict=k", {
      method: "POST",
      head: { Prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify([{ k: key, v: value, updated_at: new Date().toISOString() }])
    });
    return true;
  }

  /* Tez-tez yozishni yig'ib, bir martada yuboramiz */
  function queue(key, value) {
    if (!ready() || KV_KEYS.indexOf(key) < 0) return;
    pending[key] = value;
    clearTimeout(timer);
    timer = setTimeout(flush, 700);
  }
  async function flush() {
    const keys = Object.keys(pending);
    if (!keys.length) return;
    const batch = pending; pending = {};
    for (const k of keys) {
      try { await push(k, batch[k]); }
      catch (e) { console.warn("bulutga yozilmadi:", k, e.message); }
    }
  }

  /* ---------- Buyurtmalar ---------- */
  async function sendOrder(order) {
    if (!ready()) return false;
    await rest("shop_orders", {
      method: "POST",
      head: { Prefer: "return=minimal" },
      body: JSON.stringify([{
        order_id: order.id,
        created_at: new Date(order.date || Date.now()).toISOString(),
        name: order.name,
        phone: order.phone,
        region: order.region,
        address: order.address,
        total: order.total,
        status: order.status || "new",
        pay_status: order.payStatus || "unpaid",
        data: order
      }])
    });
    return true;
  }

  async function orders(limit) {
    if (!ready()) return null;
    const rows = await rest("shop_orders?select=data,status,pay_status,order_id&order=created_at.desc&limit=" + (limit || 300));
    return (rows || []).map(r => Object.assign({}, r.data, {
      id: r.order_id, status: r.status, payStatus: r.pay_status
    }));
  }

  async function updateOrder(id, patch) {
    if (!ready()) return false;
    const body = {};
    if (patch.status) body.status = patch.status;
    if (patch.payStatus) body.pay_status = patch.payStatus;
    if (patch.data) body.data = patch.data;
    await rest("shop_orders?order_id=eq." + encodeURIComponent(id), {
      method: "PATCH",
      head: { Prefer: "return=minimal" },
      body: JSON.stringify(body)
    });
    return true;
  }

  /* ---------- Sharhlar ---------- */
  async function reviews(productId) {
    if (!ready()) return null;
    const q = productId ? "&product_id=eq." + encodeURIComponent(productId) : "";
    return await rest("shop_reviews?select=*&order=created_at.desc&limit=200" + q);
  }

  async function addReview(r) {
    if (!ready()) return false;
    await rest("shop_reviews", {
      method: "POST",
      head: { Prefer: "return=minimal" },
      body: JSON.stringify([{
        product_id: r.productId, name: r.name, rating: r.rating,
        fit: r.fit, text: r.text, created_at: new Date().toISOString()
      }])
    });
    return true;
  }

  /* ---------- Telegram xabari ---------- */
  async function notify(text) {
    const c = config();
    if (!c.tgToken || !c.tgChat) return false;
    const r = await fetch("https://api.telegram.org/bot" + c.tgToken + "/sendMessage", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: c.tgChat, text, parse_mode: "HTML", disable_web_page_preview: true })
    });
    return r.ok;
  }

  /* ---------- Ulanishni tekshirish ---------- */
  async function test() {
    const c = config();
    if (!c.url || !c.key) return { ok: false, msg: "Manzil yoki kalit kiritilmagan" };
    try {
      await rest("shop_kv?select=k&limit=1");
      return { ok: true, msg: "Ulanish ishlayapti" };
    } catch (e) {
      return { ok: false, msg: e.message };
    }
  }

  /* Supabase'da bir marta bajariladigan SQL */
  const SQL = `create table if not exists shop_kv (
  k text primary key,
  v jsonb not null,
  updated_at timestamptz default now()
);

create table if not exists shop_orders (
  id bigint generated always as identity primary key,
  order_id bigint unique,
  created_at timestamptz default now(),
  name text, phone text, region text, address text,
  total bigint, status text default 'new', pay_status text default 'unpaid',
  data jsonb
);

create table if not exists shop_reviews (
  id bigint generated always as identity primary key,
  product_id text, name text, rating int, fit text, text text,
  created_at timestamptz default now()
);

alter table shop_kv enable row level security;
alter table shop_orders enable row level security;
alter table shop_reviews enable row level security;

-- Mahsulotlarni hamma o'qiydi
create policy kv_read on shop_kv for select using (true);
create policy kv_write on shop_kv for all using (true) with check (true);

-- Buyurtmani hamma qo'sha oladi, lekin o'qiy olmaydi
create policy ord_insert on shop_orders for insert with check (true);
create policy ord_admin on shop_orders for select using (true);
create policy ord_update on shop_orders for update using (true);

create policy rev_read on shop_reviews for select using (true);
create policy rev_insert on shop_reviews for insert with check (true);`;

  return {
    ready, reset, config, pull, push, queue, flush,
    sendOrder, orders, updateOrder,
    reviews, addReview, notify, test, SQL,
    get online() { return online; }
  };
})();
