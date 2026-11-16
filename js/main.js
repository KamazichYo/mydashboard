import { FAVORITES, GROUPS } from "./links.js";
import { startBackground } from "./background.js";
import { startSparks } from "./sparks.js";
import { startFloat } from "./float.js";
import { startSearch } from "./search.js";

const $ = (s) => document.querySelector(s);

// ── иконки сайтов ────────────────────────────────────────────
const host = (url) => new URL(url).hostname;
function icon(item, size) {
  const img = document.createElement("img");
  img.alt = "";
  img.loading = "lazy";
  img.width = img.height = size;
  img.src = item.icon || `https://www.google.com/s2/favicons?domain=${host(item.url)}&sz=64`;
  img.onerror = () => {
    img.onerror = null;
    img.src = `https://icons.duckduckgo.com/ip3/${host(item.url)}.ico`;
  };
  return img;
}

// ── избранное ────────────────────────────────────────────────
const fav = $("#favorites");
for (const item of FAVORITES) {
  const a = document.createElement("a");
  a.className = "fav";
  a.href = item.url;
  a.title = item.name;
  const tile = document.createElement("span");
  tile.className = "fav-icon";
  tile.append(icon(item, 28));
  const label = document.createElement("span");
  label.className = "fav-label";
  label.textContent = item.name;
  a.append(tile, label);
  fav.append(a);
}

// ── панели ───────────────────────────────────────────────────
const grid = $("#groups");
GROUPS.forEach((g, i) => {
  const sec = document.createElement("section");
  sec.className = "glass panel group";
  sec.style.setProperty("--i", i);
  const h = document.createElement("h2");
  h.textContent = g.title;
  const ul = document.createElement("ul");
  for (const item of g.items) {
    const li = document.createElement("li");
    const a = document.createElement("a");
    a.href = item.url;
    const name = document.createElement("span");
    name.textContent = item.name;
    a.append(icon(item, 18), name);
    li.append(a);
    ul.append(li);
  }
  sec.append(h, ul);
  grid.append(sec);
});

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
startBackground($("#bg"), {
  src: "assets/starry-night.jpg",
  pixel: Number(params.get("pixel")) || 0,   // ?pixel=220 — ретро-пиксели как в Balatro
});
startSparks($("#sparks"));
startSearch($("#search"), toast);
startFloat([...document.querySelectorAll(".panel")]);
requestAnimationFrame(() => document.body.classList.add("loaded"));
