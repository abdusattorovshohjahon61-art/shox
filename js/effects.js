/* Nilufar Shoes — vizual effektlar */
(function () {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const fine = window.matchMedia("(pointer: fine)").matches;

  /* Zarrachalar foni (hero) */
  function particles() {
    const cv = document.getElementById("particles");
    if (!cv || reduce) return;
    const ctx = cv.getContext("2d");
    let w, h, pts = [];
    const mouse = { x: -999, y: -999 };
    function size() {
      const r = cv.parentElement.getBoundingClientRect();
      w = cv.width = r.width * devicePixelRatio; h = cv.height = r.height * devicePixelRatio;
      cv.style.width = r.width + "px"; cv.style.height = r.height + "px";
      const n = Math.min(90, Math.floor(r.width / 16));
      pts = Array.from({ length: n }, () => ({ x: Math.random() * w, y: Math.random() * h, vx: (Math.random() - .5) * .4, vy: (Math.random() - .5) * .4, r: (Math.random() * 2 + .6) * devicePixelRatio }));
    }
    cv.parentElement.addEventListener("mousemove", e => { const r = cv.getBoundingClientRect(); mouse.x = (e.clientX - r.left) * devicePixelRatio; mouse.y = (e.clientY - r.top) * devicePixelRatio; });
    cv.parentElement.addEventListener("mouseleave", () => { mouse.x = mouse.y = -999; });
    window.addEventListener("resize", size);
    size();
    let visible = true;
    new IntersectionObserver(([en]) => { visible = en.isIntersecting; }).observe(cv);
    (function loop() {
      requestAnimationFrame(loop);
      if (!visible) return;
      const dark = document.documentElement.dataset.theme === "dark";
      const col = dark ? "255,200,215" : "179,18,59";
      ctx.clearRect(0, 0, w, h);
      const link = 120 * devicePixelRatio;
      for (const p of pts) {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0 || p.x > w) p.vx *= -1;
        if (p.y < 0 || p.y > h) p.vy *= -1;
        const dx = p.x - mouse.x, dy = p.y - mouse.y, d = Math.hypot(dx, dy);
        if (d < 100 * devicePixelRatio) { p.x += dx / d * 1.5; p.y += dy / d * 1.5; }
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.283); ctx.fillStyle = `rgba(${col},.55)`; ctx.fill();
      }
      for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++) {
        const a = pts[i], b = pts[j], d = Math.hypot(a.x - b.x, a.y - b.y);
        if (d < link) { ctx.strokeStyle = `rgba(${col},${(1 - d / link) * .22})`; ctx.lineWidth = devicePixelRatio * .7; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); }
      }
    })();
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

  /* Hero: suzuvchi poyabzallar va parallaks */
  function hero() {
    const map = { fs1: ["heels", "#b3123b"], fs2: ["sneakers", "#7c8cff"], fs3: ["boots", "#c49a6c"] };
    Object.keys(map).forEach(id => { const el = document.getElementById(id); if (el) el.innerHTML = NS.shoeSVG(map[id][0], map[id][1]); });
    const v = document.getElementById("heroVisual");
    if (!v || !fine || reduce) return;
    document.querySelector(".hero").addEventListener("mousemove", e => {
      const x = e.clientX / innerWidth - .5, y = e.clientY / innerHeight - .5;
      v.querySelectorAll(".float-shoe, .hero-logo-card, .ring").forEach((el, i) => {
        const k = (i % 3 + 1) * 14;
        el.style.translate = `${x * k}px ${y * k}px`;
      });
    });
  }

  /* Header scroll holati */
  function header() {
    const h = document.querySelector(".header");
    if (!h) return;
    const on = () => h.classList.toggle("scrolled", scrollY > 30);
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

  document.addEventListener("DOMContentLoaded", () => { particles(); counters(); hero(); header(); magnetic(); cursorGlow(); refresh(); });
  if (document.readyState !== "loading") { particles(); counters(); hero(); header(); magnetic(); cursorGlow(); refresh(); }

  window.FX = { refresh, burst, flyToCart, confetti };
})();
