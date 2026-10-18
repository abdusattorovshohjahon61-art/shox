/* Nilufar Shoes — vizual effektlar */
(function () {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const fine = window.matchMedia("(pointer: fine)").matches;

  /* So'zma-so'z chiqish: sarlavha so'zlari navbatma-navbat ko'tariladi */
  function splitWords(el) {
    const txt = (el.dataset.text || el.textContent).trim();
    el.dataset.text = txt;
    el.innerHTML = txt.split(/\s+/).map((w, i) =>
      '<span style="--d:' + (0.15 + i * 0.08).toFixed(2) + 's">' + w.replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c])) + '</span>'
    ).join(' ');
  }

  function revealOnView(el) {
    if (reduce) { el.classList.add('in'); return; }
    new IntersectionObserver((es, ob) => es.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('in'); ob.unobserve(e.target); }
    }), { threshold: 0.2 }).observe(el);
  }

  function heroText() {
    document.querySelectorAll('[data-split-words]').forEach(el => {
      splitWords(el);
      revealOnView(el);
    });
    document.querySelectorAll('.fade-up').forEach(el => {
      el.style.setProperty('--d', (parseFloat(el.dataset.fade) || 0) + 's');
      revealOnView(el);
    });
  }
  /* Til almashtirilganda sarlavha qayta bo'linadi */
  window.addEventListener('lang:change', () => {
    document.querySelectorAll('[data-split-words]').forEach(el => {
      delete el.dataset.text;
      splitWords(el);
      el.classList.add('in');
    });
  });

  /* Fon video: ko'rinmaganda to'xtab turadi (batareya va protsessor uchun) */
  function bgVideo() {
    const v = document.getElementById('bgVideo');
    if (!v) return;
    if (reduce) { v.removeAttribute('autoplay'); v.pause(); return; }
    const play = () => { const p = v.play(); if (p && p.catch) p.catch(() => {}); };
    play();
    document.addEventListener('click', play, { once: true });
    const hero = document.querySelector('.hero');
    if (hero && 'IntersectionObserver' in window) {
      new IntersectionObserver(([e]) => { e.isIntersecting ? play() : v.pause(); },
        { threshold: 0.02 }).observe(hero);
    }
  }

  /* Scroll paytida paydo bo'lish */
  let io;
  function reveal() {
    if (!("IntersectionObserver" in window) || reduce) { document.querySelectorAll(".reveal").forEach(e => e.classList.add("in")); return; }
    io = io || new IntersectionObserver(ens => ens.forEach(en => { if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); } }), { threshold: .12 });
    document.querySelectorAll(".reveal:not(.in)").forEach(e => io.observe(e));
  }

  /* 3D egilish (kartochkalar) */
  function tilt() {
    if (!fine || reduce) return;
    document.querySelectorAll(".tilt:not([data-tilt])").forEach(el => {
      el.dataset.tilt = "1";
      el.addEventListener("mousemove", e => {
        const r = el.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
        el.style.transform = `perspective(900px) rotateY(${x * 10}deg) rotateX(${-y * 10}deg) translateY(-6px)`;
        el.style.setProperty("--mx", (x + .5) * 100 + "%"); el.style.setProperty("--my", (y + .5) * 100 + "%");
      });
      el.addEventListener("mouseleave", () => { el.style.transform = ""; });
    });
  }

  /* Magnit tugma */
  function magnetic() {
    if (!fine || reduce) return;
    document.querySelectorAll(".magnetic").forEach(el => {
      el.addEventListener("mousemove", e => { const r = el.getBoundingClientRect(); el.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * .25}px, ${(e.clientY - r.top - r.height / 2) * .35}px)`; });
      el.addEventListener("mouseleave", () => { el.style.transform = ""; });
    });
  }

  /* Kursor nuri */
  function cursorGlow() {
    const g = document.querySelector(".cursor-glow");
    if (!g || !fine || reduce) return;
    let x = 0, y = 0, cx = 0, cy = 0;
    window.addEventListener("mousemove", e => { x = e.clientX; y = e.clientY; g.classList.add("on"); });
    (function loop() { cx += (x - cx) * .12; cy += (y - cy) * .12; g.style.transform = `translate(${cx}px, ${cy}px)`; requestAnimationFrame(loop); })();
  }

  /* Raqamlar sanog'i */
  function counters() {
    const els = document.querySelectorAll(".count");
    const run = el => {
      const to = +el.dataset.to, start = performance.now(), dur = 1800;
      (function step(now) {
        const k = Math.min(1, (now - start) / dur), e = 1 - Math.pow(1 - k, 3);
        el.textContent = Math.round(to * e).toLocaleString("ru-RU");
        if (k < 1) requestAnimationFrame(step);
      })(start);
    };
    if (reduce) { els.forEach(el => { el.textContent = (+el.dataset.to).toLocaleString("ru-RU"); }); return; }
    const ob = new IntersectionObserver(ens => ens.forEach(en => { if (en.isIntersecting) { run(en.target); ob.unobserve(en.target); } }));
    els.forEach(el => ob.observe(el));
  }

  /* Header scroll holati */
  function header() {
    const h = document.querySelector(".header");
    if (!h) return;
    const hero = document.querySelector(".hero");
    const on = () => {
      h.classList.toggle("scrolled", scrollY > 30);
      // Hero (video) ustida turganda — shaffof va oq matnli header
      if (hero) h.classList.toggle("over-video", scrollY < hero.offsetHeight - 90);
    };
    window.addEventListener("scroll", on, { passive: true }); on();
  }

  /* Yurakchalar portlashi */
  function burst(el) {
    if (reduce) return;
    const r = el.getBoundingClientRect();
    for (let i = 0; i < 10; i++) {
      const s = document.createElement("span");
      s.className = "burst"; s.textContent = "❤";
      s.style.left = r.left + r.width / 2 + "px"; s.style.top = r.top + r.height / 2 + "px";
      const a = Math.random() * Math.PI * 2, d = 30 + Math.random() * 40;
      s.style.setProperty("--tx", Math.cos(a) * d + "px"); s.style.setProperty("--ty", Math.sin(a) * d + "px");
      document.body.appendChild(s);
      setTimeout(() => s.remove(), 800);
    }
  }

  /* Savatga uchish animatsiyasi */
  function flyToCart(src, target) {
    if (!src || !target || reduce) return;
    const a = src.getBoundingClientRect(), b = target.getBoundingClientRect();
    const c = src.cloneNode(true);
    c.className = "fly";
    Object.assign(c.style, { left: a.left + "px", top: a.top + "px", width: a.width + "px", height: a.height + "px" });
    document.body.appendChild(c);
    requestAnimationFrame(() => {
      c.style.transform = `translate(${b.left + b.width / 2 - a.left - a.width / 2}px, ${b.top + b.height / 2 - a.top - a.height / 2}px) scale(.08)`;
      c.style.opacity = ".3";
    });
    setTimeout(() => { c.remove(); target.classList.add("wiggle"); setTimeout(() => target.classList.remove("wiggle"), 600); }, 800);
  }

  /* Konfetti */
  function confetti() {
    if (reduce) return;
    const cv = document.createElement("canvas");
    cv.className = "confetti";
    document.body.appendChild(cv);
    const ctx = cv.getContext("2d");
    cv.width = innerWidth; cv.height = innerHeight;
    const cols = ["#b3123b", "#ffd166", "#06d6a0", "#7c8cff", "#ff8fab", "#111"];
    const ps = Array.from({ length: 160 }, () => ({ x: innerWidth / 2, y: innerHeight / 2, vx: (Math.random() - .5) * 16, vy: Math.random() * -16 - 4, s: Math.random() * 6 + 4, c: cols[Math.floor(Math.random() * cols.length)], r: Math.random() * 6, vr: (Math.random() - .5) * .3 }));
    const start = performance.now();
    (function loop(now) {
      ctx.clearRect(0, 0, cv.width, cv.height);
      ps.forEach(p => { p.vy += .4; p.vx *= .99; p.x += p.vx; p.y += p.vy; p.r += p.vr; ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r); ctx.fillStyle = p.c; ctx.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2); ctx.restore(); });
      if (now - start < 3000) requestAnimationFrame(loop); else cv.remove();
    })(start);
  }

  /* Tugmalardagi to'lqin (ripple) */
  document.addEventListener("pointerdown", e => {
    const b = e.target.closest(".btn");
    if (!b || reduce) return;
    const r = b.getBoundingClientRect();
    const s = document.createElement("span");
    s.className = "ripple";
    s.style.left = e.clientX - r.left + "px"; s.style.top = e.clientY - r.top + "px";
    b.appendChild(s);
    setTimeout(() => s.remove(), 600);
  });

  function refresh() { reveal(); tilt(); }

  function boot() { heroText(); bgVideo(); counters(); header(); magnetic(); cursorGlow(); refresh(); }
  document.addEventListener("DOMContentLoaded", boot);
  if (document.readyState !== "loading") boot();

  window.FX = { refresh, burst, flyToCart, confetti };
})();
