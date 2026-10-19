/* Nilufar Shoes — mijoz tomoni: katalog, sevimlilar, savat, buyurtma */
(function () {
  const { Store, t, money, esc, pname, pdesc, productVisual, productVisual3D, toast, applyI18n, getLang } = NS;
  const $ = s => document.querySelector(s);

  const state = { cat: "all", q: "", sort: "popular", favOnly: false };

  /* ---------- Katalog ---------- */
  function renderChips() {
    const cats = ["all"].concat(window.CATEGORIES);
    $("#catChips").innerHTML = cats.map(c =>
      `<button class="chip ${state.cat === c ? "active" : ""}" data-cat="${c}">${esc(c === "all" ? t("catalog.all") : t("cat." + c))}</button>`
    ).join("");
  }

  function popularity(p, stats) {
    const s = stats[p.id] || {};
    return (s.sold || 0) * 5 + (s.carts || 0) * 2 + (s.favs || 0) + (s.views || 0) * 0.1;
  }

  function filtered() {
    const stats = Store.stats();
    const favs = Store.favs();
    const q = state.q.trim().toLowerCase();
    let list = Store.products().filter(p => {
      if (state.cat !== "all" && p.category !== state.cat) return false;
      if (state.favOnly && !favs.includes(p.id)) return false;
      if (q) {
        const hay = [p.name.uz, p.name.ru, p.name.en, t("cat." + p.category)].join(" ").toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
    const order = {
      popular: (a, b) => popularity(b, stats) - popularity(a, stats),
      new: (a, b) => (b.isNew ? 1 : 0) - (a.isNew ? 1 : 0),
      priceAsc: (a, b) => a.price - b.price,
      priceDesc: (a, b) => b.price - a.price
    };
    // Tugagan mahsulotlar har doim oxirida
    return list.sort((a, b) => ((a.stock <= 0) - (b.stock <= 0)) || order[state.sort](a, b));
  }

  const heartSVG = '<svg viewBox="0 0 24 24"><path d="M12 21s-7.5-4.6-10-9.5C.5 8 2.7 4 6.5 4c2.2 0 3.6 1.2 5.5 3.2C13.9 5.2 15.3 4 17.5 4 21.3 4 23.5 8 22 11.5 19.5 16.4 12 21 12 21z"/></svg>';

  function renderGrid() {
    const favs = Store.favs();
    const list = filtered();
    $("#empty").hidden = list.length > 0;
    $("#grid").innerHTML = list.map((p, i) => {
      const sale = p.oldPrice && p.oldPrice > p.price;
      const off = sale ? Math.round((1 - p.price / p.oldPrice) * 100) : 0;
      return `
      <article class="card tilt reveal" style="--d:${i * 60}ms" data-id="${p.id}">
        <div class="card-media" style="--accent:${esc(p.colors[0] || "#b3123b")}">
          <div class="card-tags">
            ${p.isNew ? `<span class="tag tag-new">${esc(t("product.new"))}</span>` : ""}
            ${sale ? `<span class="tag tag-sale">-${off}%</span>` : ""}
          </div>
          <button class="fav-btn ${favs.includes(p.id) ? "on" : ""}" data-fav="${p.id}" aria-label="fav">${heartSVG}</button>
          <div class="card-img">${productVisual3D(p)}</div>
          ${p.stock <= 0 ? `<div class="sold-out">${esc(t("product.outStock"))}</div>` : ""}
        </div>
        <div class="card-body">
          <span class="card-cat">${esc(t("cat." + p.category))}</span>
          <h3 class="card-title">${esc(pname(p))}</h3>
          <div class="swatches">${p.colors.map(c => `<i style="background:${esc(c)}"></i>`).join("")}</div>
          <div class="card-foot">
            <div class="price">
              <b>${money(p.price)}</b>
              ${sale ? `<s>${money(p.oldPrice)}</s>` : ""}
            </div>
            <button class="btn btn-icon" data-open="${p.id}" ${p.stock <= 0 ? "disabled" : ""} aria-label="${esc(t("product.addCart"))}">
              <svg viewBox="0 0 24 24"><path d="M6 7h12l-1 13H7L6 7z"/><path d="M9 7a3 3 0 0 1 6 0M12 11v5M9.5 13.5h5"/></svg>
            </button>
          </div>
        </div>
      </article>`;
    }).join("");
    window.FX && FX.refresh();
    window.Shoe3D && Shoe3D.mountAll($("#grid"));
  }

  /* ---------- Sevimlilar ---------- */
  function toggleFav(id, btn) {
    let favs = Store.favs();
    if (favs.includes(id)) {
      favs = favs.filter(x => x !== id);
      Store.track(id, "favs", -1);
      toast(t("product.favRemove"), "info");
    } else {
      favs.push(id);
      Store.track(id, "favs", 1);
      toast(t("product.favAdd"));
      if (btn && window.FX) FX.burst(btn);
    }
    Store.saveFavs(favs);
    updateCounts();
    document.querySelectorAll(`[data-fav="${id}"]`).forEach(b => b.classList.toggle("on", favs.includes(id)));
    renderFavs();
    if (state.favOnly) renderGrid();
  }

  function renderFavs() {
    const favs = Store.favs();
    const list = favs.map(id => Store.product(id)).filter(Boolean);
    $("#favList").innerHTML = list.length ? list.map(p => `
      <div class="line">
        <div class="line-img">${productVisual(p)}</div>
        <div class="line-info">
          <b>${esc(pname(p))}</b>
          <span>${money(p.price)}</span>
          <div class="line-actions">
            <button class="btn btn-small" data-open="${p.id}" ${p.stock <= 0 ? "disabled" : ""}>${esc(t("product.addCart"))}</button>
            <button class="link-btn" data-fav="${p.id}">${esc(t("cart.remove"))}</button>
          </div>
        </div>
      </div>`).join("") : `<div class="empty-state">${heartSVG}<p>${esc(t("fav.empty"))}</p></div>`;
  }

  /* ---------- Mahsulot oynasi ---------- */
  let current = null;
  let lastOrderId = null;
  /* Vitrinadagi "Xarid qilish" — mahsulot oynasini tanlovlar bilan ochadi */
  window.addEventListener("showcase:open", e => {
    const { id, color, size } = e.detail || {};
    const p = Store.product(id);
    if (!p) return;
    Store.track(id, "views");
    current = { id, size: p.sizes.includes(size) ? size : null, color: color || p.colors[0], qty: 1 };
    renderProduct();
    openModal("#productModal");
  });

  function openProduct(id) {
    const p = Store.product(id);
    if (!p) return;
    Store.track(id, "views");
    current = { id, size: null, color: p.colors[0], qty: 1 };
    renderProduct();
    openModal("#productModal");
  }

  function mount3D(sel) { window.Shoe3D && Shoe3D.mountAll(document.querySelector(sel)); }

  function renderProduct() {
    const p = Store.product(current.id);
    const favs = Store.favs();
    const sale = p.oldPrice && p.oldPrice > p.price;
    $("#productBody").innerHTML = `
      <div class="pd">
        <div class="pd-media" style="--accent:${esc(current.color)}">
          <div class="pd-img" id="pdImg">${productVisual3D(p, current.color, "full")}</div>
          ${(p.has360 || p.spin) ? "" : p.image ? "" : `<span class="view3d">${esc(t("product.view3d"))}</span>`}
        </div>
        <div class="pd-info">
          <span class="card-cat">${esc(t("cat." + p.category))}</span>
          <h2>${esc(pname(p))}</h2>
          <div class="price big"><b>${money(p.price)}</b>${sale ? `<s>${money(p.oldPrice)}</s>` : ""}</div>
          <p class="muted">${esc(pdesc(p))}</p>
          <div class="pd-group">
            <span>${esc(t("product.color"))}</span>
            <div class="color-pick">${p.colors.map(c => `<button class="${c === current.color ? "active" : ""}" data-color="${esc(c)}" style="background:${esc(c)}" aria-label="${esc(c)}"></button>`).join("")}</div>
          </div>
          <div class="pd-group">
            <span>${esc(t("product.size"))}</span>
            <div class="size-pick">${p.sizes.map(s => `<button class="${s === current.size ? "active" : ""}" data-size="${s}">${s}</button>`).join("")}</div>
          </div>
          <div class="pd-group">
            <span>${esc(t("product.qty"))}</span>
            <div class="qty">
              <button data-qty="-1">−</button><b>${current.qty}</b><button data-qty="1">+</button>
            </div>
            <small class="${p.stock < 5 ? "warn" : "muted"}">${p.stock > 0 ? esc(t("product.inStock", { n: p.stock })) : esc(t("product.outStock"))}</small>
          </div>
          <div class="pd-actions">
            <button class="btn btn-primary btn-block" id="pdAdd" ${p.stock <= 0 ? "disabled" : ""}>${esc(t("product.addCart"))}</button>
            <button class="icon-btn fav-big ${favs.includes(p.id) ? "on" : ""}" data-fav="${p.id}" aria-label="fav">${heartSVG}</button>
          </div>
        </div>
      </div>`;
    mount3D("#productBody");
    // Haqiqiy 360° suratlar bo'lsa — ular 3D shakl o'rnini egallaydi
    if ((p.has360 || p.spin) && window.Spin360) {
      Spin360.mountFor($("#pdImg"), p, { label: t("spin.badge") });
    }
  }

  function onProductClick(e) {
    const p = Store.product(current.id);
    const c = e.target.closest("[data-color]");
    if (c) {
      current.color = c.dataset.color;
      const cv = document.querySelector("#pdImg canvas.shoe3d");
      if (cv && cv.__shoe3d) {
        cv.dataset.color = current.color;
        cv.__shoe3d.setColor(current.color);
        document.querySelectorAll("[data-color]").forEach(b => b.classList.toggle("active", b.dataset.color === current.color));
        const media = document.querySelector(".pd-media");
        if (media) media.style.setProperty("--accent", current.color);
      } else renderProduct();
      return;
    }
    const s = e.target.closest("[data-size]");
    if (s) { current.size = +s.dataset.size; renderProduct(); return; }
    const q = e.target.closest("[data-qty]");
    if (q) { current.qty = Math.max(1, Math.min(p.stock, current.qty + +q.dataset.qty)); renderProduct(); return; }
    if (e.target.closest("#pdAdd")) {
      if (!current.size) { toast(t("product.chooseSize"), "warn"); $(".size-pick").classList.add("shake"); setTimeout(() => $(".size-pick") && $(".size-pick").classList.remove("shake"), 500); return; }
      addToCart(current);
      if (window.FX) FX.flyToCart($("#pdImg"), $("#cartBtn"));
      closeAll();
    }
  }

  /* ---------- Savat ---------- */
  function addToCart(item) {
    const cart = Store.cart();
    const ex = cart.find(c => c.id === item.id && c.size === item.size && c.color === item.color);
    const p = Store.product(item.id);
    if (ex) ex.qty = Math.min(p.stock, ex.qty + item.qty);
    else cart.push({ id: item.id, size: item.size, color: item.color, qty: item.qty });
    Store.saveCart(cart);
    Store.track(item.id, "carts", item.qty);
    toast(t("product.added"));
    updateCounts(true);
    renderCart();
  }

  function cartTotals() {
    const cart = Store.cart();
    const st = Store.settings();
    const subtotal = cart.reduce((s, c) => { const p = Store.product(c.id); return s + (p ? p.price * c.qty : 0); }, 0);
    const delivery = subtotal === 0 || subtotal >= st.freeFrom ? 0 : st.deliveryPrice;
    return { subtotal, delivery, total: subtotal + delivery };
  }

  function renderCart() {
    const cart = Store.cart().filter(c => Store.product(c.id));
    if (!cart.length) {
      $("#cartList").innerHTML = `<div class="empty-state"><svg viewBox="0 0 24 24"><path d="M6 7h12l-1 13H7L6 7z"/><path d="M9 7a3 3 0 0 1 6 0"/></svg><p>${esc(t("cart.empty"))}</p></div>`;
      $("#cartFoot").innerHTML = "";
      return;
    }
    $("#cartList").innerHTML = cart.map((c, i) => {
      const p = Store.product(c.id);
      return `
      <div class="line">
        <div class="line-img">${productVisual(p, c.color)}</div>
        <div class="line-info">
          <b>${esc(pname(p))}</b>
          <small class="muted">${esc(t("product.size"))}: ${c.size} · <i class="dot" style="background:${esc(c.color)}"></i></small>
          <span>${money(p.price * c.qty)}</span>
          <div class="line-actions">
            <div class="qty small"><button data-cq="${i}" data-d="-1">−</button><b>${c.qty}</b><button data-cq="${i}" data-d="1">+</button></div>
            <button class="link-btn" data-rm="${i}">${esc(t("cart.remove"))}</button>
          </div>
        </div>
      </div>`;
    }).join("");
    const tt = cartTotals();
    $("#cartFoot").innerHTML = `
      <div class="sum-row"><span>${esc(t("cart.subtotal"))}</span><span>${money(tt.subtotal)}</span></div>
      <div class="sum-row"><span>${esc(t("cart.delivery"))}</span><span>${tt.delivery ? money(tt.delivery) : esc(t("cart.free"))}</span></div>
      <div class="sum-row total"><span>${esc(t("cart.total"))}</span><span>${money(tt.total)}</span></div>
      <button class="btn btn-primary btn-block" id="toCheckout">${esc(t("cart.checkout"))}</button>`;
  }

  function onCartClick(e) {
    const cart = Store.cart();
    const q = e.target.closest("[data-cq]");
    if (q) {
      const it = cart[+q.dataset.cq];
      const p = Store.product(it.id);
      it.qty = Math.max(1, Math.min(p.stock, it.qty + +q.dataset.d));
      Store.saveCart(cart); renderCart(); updateCounts(); return;
    }
    const r = e.target.closest("[data-rm]");
    if (r) {
      const it = cart[+r.dataset.rm];
      Store.track(it.id, "carts", -it.qty);
      cart.splice(+r.dataset.rm, 1);
      Store.saveCart(cart); renderCart(); updateCounts(); return;
    }
    if (e.target.closest("#toCheckout")) openCheckout();
  }

  function updateCounts(bump) {
    const n = Store.cart().reduce((s, c) => s + c.qty, 0);
    const cc = $("#cartCount");
    cc.textContent = n; cc.classList.toggle("hide", !n);
    if (bump) { cc.classList.remove("bump"); void cc.offsetWidth; cc.classList.add("bump"); }
    const f = Store.favs().length;
    $("#favCount").textContent = f; $("#favCount").classList.toggle("hide", !f);
  }

  /* ---------- Buyurtma ---------- */
  function fillRegions() {
    const sel = $("#regionSelect");
    const v = sel.value;
    sel.innerHTML = `<option value="">${esc(t("checkout.chooseRegion"))}</option>` +
      window.REGIONS.map(r => `<option value="${r.id}">${esc(r[getLang()])}</option>`).join("");
    sel.value = v;
  }

  function renderSummary() {
    const tt = cartTotals();
    $("#checkoutSummary").innerHTML = `
      <div class="sum-row"><span>${esc(t("cart.subtotal"))}</span><span>${money(tt.subtotal)}</span></div>
      <div class="sum-row"><span>${esc(t("cart.delivery"))}</span><span>${tt.delivery ? money(tt.delivery) : esc(t("cart.free"))}</span></div>
      <div class="sum-row total"><span>${esc(t("cart.total"))}</span><span>${money(tt.total)}</span></div>`;
  }

  /* To'lov usuliga qarab ko'rsatiladigan ma'lumot */
  function paymentBlock(method, total, orderId) {
    const st = Store.settings();
    const link = method === "click" ? st.clickLink : method === "payme" ? st.paymeLink : "";
    const showCard = method === "card" || ((method === "click" || method === "payme") && !link);
    let html = `<div class="pay-box" data-method="${method}">
      <p class="pay-hint">${esc(t("pay.hint." + method))}</p>`;
    if (method !== "cash") {
      html += `<div class="pay-amount"><span>${esc(t("pay.amount"))}</span><b>${money(total)}</b></div>`;
    }
    if (link) {
      html += `<a class="btn btn-primary btn-block pay-link" href="${esc(link)}" target="_blank" rel="noopener">
        ${esc(t("pay.open"))} <svg viewBox="0 0 24 24"><path d="M14 4h6v6M20 4L10 14M18 13v6a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h6"/></svg></a>`;
    }
    if (showCard && st.cardNumber) {
      html += `<div class="pay-card">
        <div class="pay-card-row">
          <div><small>${esc(t("pay.card.title"))}</small><b class="card-num">${esc(st.cardNumber)}</b></div>
          <button type="button" class="btn btn-small" data-copy="${esc(st.cardNumber)}">${esc(t("pay.copy"))}</button>
        </div>
        <div><small>${esc(t("pay.card.holder"))}</small><b>${esc(st.cardHolder || "")}</b></div>
      </div>`;
    }
    if (method !== "cash" && orderId) {
      html += `<p class="pay-note">${esc(t("pay.note", { id: orderId }))}</p>
        <label class="btn btn-ghost btn-block receipt-btn">
          <svg viewBox="0 0 24 24"><path d="M12 16V4M8 8l4-4 4 4M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3"/></svg>
          <span>${esc(t("pay.receipt"))}</span>
          <input type="file" accept="image/*" id="receiptFile" hidden>
        </label>
        <button type="button" class="btn btn-primary btn-block" id="iPaidBtn">${esc(t("pay.iPaid"))}</button>`;
    }
    return html + "</div>";
  }

  function renderPayBlock() {
    const m = document.querySelector('input[name="payment"]:checked');
    const box = $("#payInfo");
    if (!m || !box) return;
    box.innerHTML = paymentBlock(m.value, cartTotals().total, null);
  }

  function openCheckout() {
    closeAll();
    fillRegions();
    renderSummary();
    $("#checkoutError").textContent = "";
    renderPayBlock();
    openModal("#checkoutModal");
  }

  /* Buyurtma matnini Telegram uchun tayyorlaymiz */
  function telegramLink(order) {
    const st = Store.settings();
    const user = String(st.telegram || "").replace(/^@/, "").trim();
    if (!user) return "";
    const items = order.items.map(it => {
      const p = Store.product(it.id);
      return "• " + (p ? pname(p) : it.id) + " — " + it.size + " — " + it.qty + " dona — " + money(it.price * it.qty);
    }).join("\n");
    const txt = [
      "🛍 " + t("tg.order") + " #" + order.id,
      "",
      "👤 " + t("tg.customer") + ": " + order.name,
      "📞 " + order.phone + (order.phone2 ? " / " + order.phone2 : ""),
      "📍 " + t("tg.address") + ": " + NS.regionName(order.region) + ", " + order.district + ", " + order.address +
        (order.landmark ? " (" + order.landmark + ")" : ""),
      "",
      "👟 " + t("tg.items") + ":",
      items,
      "",
      "💳 " + t("tg.payment") + ": " + t("pay." + order.payment),
      "💰 " + t("tg.total") + ": " + money(order.total),
      order.note ? "\n💬 " + order.note : ""
    ].join("\n");
    return "https://t.me/" + encodeURIComponent(user) + "?text=" + encodeURIComponent(txt);
  }

  function submitOrder(e) {
    e.preventDefault();
    const f = e.target;
    const data = Object.fromEntries(new FormData(f).entries());
    f.querySelectorAll(".invalid").forEach(x => x.classList.remove("invalid"));
    const missing = ["name", "phone", "region", "district", "address"].filter(k => !String(data[k] || "").trim());
    missing.forEach(k => f.elements[k].classList.add("invalid"));
    if (missing.length) { $("#checkoutError").textContent = t("checkout.required"); return; }
    if (data.phone.replace(/\D/g, "").length !== 12) {
      f.elements.phone.classList.add("invalid");
      $("#checkoutError").textContent = t("checkout.badPhone"); return;
    }
    const cart = Store.cart().filter(c => Store.product(c.id));
    if (!cart.length) return;
    const products = Store.products();
    const items = cart.map(c => {
      const p = products.find(x => x.id === c.id);
      p.stock = Math.max(0, p.stock - c.qty);
      Store.track(c.id, "sold", c.qty, p.price * c.qty);
      return { id: c.id, size: c.size, color: c.color, qty: c.qty, price: p.price };
    });
    Store.saveProducts(products);
    const tt = cartTotals();
    const orders = Store.orders();
    const id = orders.reduce((m, o) => Math.max(m, o.id), 1000) + 1;
    const payStatus = data.payment === "cash" ? "cod" : "unpaid";
    orders.unshift(Object.assign({ id, date: Date.now(), status: "new", payStatus, items, lang: getLang() }, data, tt));
    Store.saveOrders(orders);
    Store.saveCart([]);
    f.reset();
    updateCounts(); renderCart(); renderGrid();
    closeAll();
    $("#successText").textContent = t("checkout.successText", { id, phone: data.phone });
    lastOrderId = id;
    const order = orders[0];
    const tg = telegramLink(order);
    $("#successPay").innerHTML =
      (tg ? `<a class="btn btn-tg btn-block" href="${esc(tg)}" target="_blank" rel="noopener">
              <svg viewBox="0 0 24 24"><path d="M21 4L3 11l6 2 2 6 3-4 5 4z"/></svg>
              ${esc(t("tg.send"))}</a>
            <p class="tg-hint">${esc(t("tg.hint"))}</p>` : "") +
      (data.payment === "cash" ? "" :
        `<h4>${esc(t("pay.afterOrder"))}</h4>` + paymentBlock(data.payment, tt.total, id));
    openModal("#successModal");
    if (window.FX) FX.confetti();
  }

  /* ---------- Oynalar ---------- */
  function openModal(sel) {
    document.querySelectorAll(".modal.open").forEach(m => m.classList.remove("open"));
    $(sel).classList.add("open");
    $(sel).setAttribute("aria-hidden", "false");
    $("#overlay").classList.add("open");
    document.body.classList.add("lock");
  }
  function openDrawer(sel) {
    closeAll();
    $(sel).classList.add("open");
    $(sel).setAttribute("aria-hidden", "false");
    $("#overlay").classList.add("open");
    document.body.classList.add("lock");
  }
  function closeAll() {
    document.querySelectorAll(".modal.open, .drawer.open").forEach(m => { m.classList.remove("open"); m.setAttribute("aria-hidden", "true"); });
    $("#overlay").classList.remove("open");
    document.body.classList.remove("lock");
  }

  /* ---------- CEO: saytda tahrirlash rejimi ---------- */
  function initEditMode() {
    const params = new URLSearchParams(location.search);
    if (params.get("edit") !== "1" || sessionStorage.getItem("nilufar_ceo") !== "1") return;
    document.body.classList.add("edit-mode");
    $("#editBar").hidden = false;
    const editable = new Set(window.EDITABLE_KEYS);
    document.querySelectorAll("[data-i18n]").forEach(el => {
      if (!editable.has(el.dataset.i18n) || el.closest(".edit-bar")) return;
      el.contentEditable = "true";
      el.spellcheck = false;
      el.addEventListener("click", ev => { ev.preventDefault(); ev.stopPropagation(); }, true);
      el.addEventListener("keydown", ev => { if (ev.key === "Enter" && !ev.shiftKey) { ev.preventDefault(); el.blur(); } });
      el.addEventListener("blur", () => {
        const key = el.dataset.i18n;
        const val = el.textContent.trim();
        const c = Store.content();
        const lang = getLang();
        c[lang] = c[lang] || {};
        if (!val || val === window.I18N[lang][key]) delete c[lang][key];
        else c[lang][key] = val;
        Store.saveContent(c);
        document.querySelectorAll(`[data-i18n="${key}"]`).forEach(x => { if (x !== el) x.textContent = t(key); });
        toast(t("editMode.saved"));
      });
    });
  }

  /* ---------- Ishga tushirish ---------- */
  function renderAll() {
    applyI18n();
    renderChips(); renderGrid(); renderFavs(); renderCart(); updateCounts();
    if ($("#checkoutModal").classList.contains("open")) { fillRegions(); renderSummary(); }
    if (current && $("#productModal").classList.contains("open")) renderProduct();
    buildMarquee();
  }

  function buildMarquee() {
    const words = window.CATEGORIES.map(c => t("cat." + c)).concat(["Nilufar Shoes"]);
    const row = words.map(w => `<span>${esc(w)}</span><i>✦</i>`).join("");
    $("#marquee").innerHTML = row + row + row;
  }

  document.addEventListener("click", e => {
    const fav = e.target.closest("[data-fav]");
    if (fav) { e.stopPropagation(); toggleFav(fav.dataset.fav, fav); return; }
    const open = e.target.closest("[data-open]");
    if (open) { openProduct(open.dataset.open); return; }
    const card = e.target.closest(".card[data-id]");
    if (card && !document.body.classList.contains("edit-mode")) { openProduct(card.dataset.id); return; }
    if (e.target.closest("[data-close]") || e.target.id === "overlay" || e.target.classList.contains("modal")) closeAll();
  });

  $("#catChips").addEventListener("click", e => {
    const b = e.target.closest("[data-cat]");
    if (!b) return;
    state.cat = b.dataset.cat; renderChips(); renderGrid();
  });
  $("#search").addEventListener("input", e => { state.q = e.target.value; renderGrid(); });
  $("#sort").addEventListener("change", e => { state.sort = e.target.value; renderGrid(); });
  $("#favOnly").addEventListener("click", e => { state.favOnly = !state.favOnly; e.currentTarget.classList.toggle("active", state.favOnly); renderGrid(); });
  $("#cartBtn").addEventListener("click", () => { renderCart(); openDrawer("#cartDrawer"); });
  $("#favBtn").addEventListener("click", () => { renderFavs(); openDrawer("#favDrawer"); });
  $("#productBody").addEventListener("click", onProductClick);
  $("#cartList").addEventListener("click", onCartClick);
  $("#cartFoot").addEventListener("click", onCartClick);
  $("#checkoutForm").addEventListener("submit", submitOrder);
  $("#checkoutForm").addEventListener("change", e => {
    if (e.target.name === "payment") renderPayBlock();
  });

  /* Karta raqamidan nusxa olish, chek yuklash, "to'ladim" */
  document.addEventListener("click", e => {
    const c = e.target.closest("[data-copy]");
    if (c) {
      const txt = c.dataset.copy;
      const done = () => toast(t("pay.copied"));
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(txt).then(done).catch(() => fallbackCopy(txt, done));
      } else fallbackCopy(txt, done);
      return;
    }
    if (e.target.closest("#iPaidBtn")) {
      setPayStatus(lastOrderId, "pending");
      toast(t("pay.thanks"));
      closeAll();
    }
  });
  function fallbackCopy(txt, done) {
    const ta = document.createElement("textarea");
    ta.value = txt; ta.style.cssText = "position:fixed;opacity:0";
    document.body.appendChild(ta); ta.select();
    try { document.execCommand("copy"); done(); } catch (err) {}
    ta.remove();
  }
  function setPayStatus(id, st, receipt) {
    if (!id) return;
    const list = Store.orders();
    const o = list.find(x => x.id === id);
    if (!o) return;
    o.payStatus = st;
    if (receipt) o.receipt = receipt;
    Store.saveOrders(list);
  }
  document.addEventListener("change", e => {
    if (e.target.id !== "receiptFile") return;
    const file = e.target.files[0];
    if (!file) return;
    const r = new FileReader();
    r.onload = () => {
      const img = new Image();
      img.onload = () => {
        const k = Math.min(1, 620 / Math.max(img.width, img.height));
        const cv = document.createElement("canvas");
        cv.width = img.width * k; cv.height = img.height * k;
        cv.getContext("2d").drawImage(img, 0, 0, cv.width, cv.height);
        setPayStatus(lastOrderId, "pending", cv.toDataURL("image/jpeg", .75));
        toast(t("pay.receiptAdded"));
        const b = document.querySelector(".receipt-btn span");
        if (b) b.textContent = t("pay.receiptAdded");
      };
      img.src = r.result;
    };
    r.readAsDataURL(file);
  });
  $("#burger").addEventListener("click", () => document.body.classList.toggle("nav-open"));
  $("#nav").addEventListener("click", e => { if (e.target.tagName === "A") document.body.classList.remove("nav-open"); });
  document.addEventListener("keydown", e => { if (e.key === "Escape") closeAll(); });
  NS.phoneMask(document.querySelector('[name="phone"]'));
  NS.phoneMask(document.querySelector('[name="phone2"]'));
  $("#year").textContent = new Date().getFullYear();

  window.addEventListener("lang:change", renderAll);
  /* Boshqa tabda (CEO panel) o'zgartirilsa — yangilash */
  window.addEventListener("storage", e => { if (e.key && e.key.startsWith("nilufar_v1")) renderAll(); });

  NS.bindCommon();
  renderAll();
  initEditMode();
})();
