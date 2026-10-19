/* Nilufar Shoes — sayt ochilishidagi qisqa brend taqdimoti.
 * Bir seansda faqat bir marta ko'rsatiladi, bosilsa darhol o'tkazib yuboriladi. */
(function () {
  const KEY = "nilufar_intro_seen";
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let done = false;

  if (reduce || sessionStorage.getItem(KEY) === "1") {
    document.documentElement.classList.add("intro-done");
    return;
  }
  sessionStorage.setItem(KEY, "1");
  document.documentElement.classList.add("intro-on");

  const el = document.createElement("div");
  el.className = "intro";
  el.innerHTML =
    '<div class="intro-inner">' +
      '<div class="intro-logo"><img src="assets/logo.png" alt=""></div>' +
      '<div class="intro-name"><b>Nilufar</b><span>SHOES</span></div>' +
      '<div class="intro-bar"><i></i></div>' +
    '</div>' +
    '<div class="intro-curtain l"></div><div class="intro-curtain r"></div>';

  function mount() {
    document.body.appendChild(el);
    setTimeout(finish, 2100);
  }

  function finish() {
    if (done) return;
    done = true;
    el.classList.add("out");
    document.documentElement.classList.remove("intro-on");
    document.documentElement.classList.add("intro-done");
    setTimeout(() => el.remove(), 900);
  }

  el.addEventListener("click", finish);
  window.addEventListener("keydown", finish, { once: true });
  window.addEventListener("wheel", finish, { once: true, passive: true });

  if (document.body) mount();
  else document.addEventListener("DOMContentLoaded", mount);
})();
