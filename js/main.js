import { startBackground } from "./background.js";
import { PAINTINGS } from "./paintings.js";
import { startSparks } from "./sparks.js";
import { startSearch } from "./search.js";
import { startSky } from "./sky.js";

const $ = (s) => document.querySelector(s);

// ── часы ─────────────────────────────────────────────────────
const timeEl = $("#time"), dateEl = $("#date"), helloEl = $("#hello");
const dateFmt = new Intl.DateTimeFormat("ru-RU", { weekday: "long", day: "numeric", month: "long" });
function tick() {
  const d = new Date();
  timeEl.textContent = d.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
  dateEl.textContent = dateFmt.format(d);
  const h = d.getHours();
  helloEl.textContent = h < 5 ? "Доброй ночи" : h < 12 ? "Доброе утро" : h < 18 ? "Добрый день" : "Добрый вечер";
}
tick();
setInterval(tick, 1000);

// ── тост ─────────────────────────────────────────────────────
const toastEl = $("#toast");
let toastTimer;
function toast(msg) {
  toastEl.textContent = msg;
  toastEl.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove("show"), 2600);
}

// ── запуск ───────────────────────────────────────────────────
const params = new URLSearchParams(location.search);
const bg = startBackground($("#bg"), {
  paintings: PAINTINGS,
  pixel: Number(params.get("pixel")) || 0,   // ?pixel=220 — ретро-пиксели как в Balatro
});
// Смена картины: облачка снизу и стрелки ← → на клавиатуре; название всплывает на несколько секунд.
const titleEl = $("#paint-title");
let titleTimer;
bg?.onChange((p) => {
  titleEl.textContent = p.title;
  titleEl.classList.add("show");
  clearTimeout(titleTimer);
  titleTimer = setTimeout(() => titleEl.classList.remove("show"), 4500);
});
document.querySelectorAll(".nav-btn").forEach((b) =>
  b.addEventListener("click", () => (b.dataset.nav === "next" ? bg?.next() : bg?.prev())));
addEventListener("keydown", (e) => {
  if (e.target.closest?.("input, textarea") || e.metaKey || e.ctrlKey || e.altKey) return;
  if (e.key === "ArrowRight") bg?.next();
  if (e.key === "ArrowLeft") bg?.prev();
});
startSparks($("#sparks"));
startSearch($("#search"), toast);

try {
  const { all } = startSky({
    canvas: $("#clouds"),
    labels: $("#labels"),
    center: $("#center"),
    engines: [...document.querySelectorAll(".engine")],
    navs: [...document.querySelectorAll(".nav-btn")],
  });
  // Невидимый список ссылок — для клавиатуры (Tab) и скринридеров.
  const nav = $("#a11y");
  for (const it of all) {
    const a = document.createElement("a");
    a.href = it.url;
    a.target = "_blank";
    a.rel = "noopener";
    a.textContent = it.name;
    nav.append(a);
  }
} catch (err) {
  console.error(err);
  toast("Облака не запустились: браузер без WebGL2");
}
requestAnimationFrame(() => document.body.classList.add("loaded"));
