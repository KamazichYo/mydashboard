import { startBackground } from "./background.js";
import { PAINTINGS } from "./paintings.js";
import { startSparks } from "./sparks.js";
import { MODELS, CLAUDE_CODE, TASKS, SPEND, META } from "./models-data.js";

const $ = (s, r = document) => r.querySelector(s);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const fmt = (n) => (n == null ? "—" : Number(n).toLocaleString("ru-RU"));
const rub = (x) => (x < 1 ? x.toFixed(2) : x < 10 ? x.toFixed(1) : Math.round(x)).toString().replace(".", ",");

// ── фон и искры как на домашней ───────────────────────────────
const bg = startBackground($("#bg"), { paintings: PAINTINGS });
startSparks($("#sparks"));
addEventListener("keydown", (e) => {
  if (e.target.closest?.("input, textarea, select") || e.metaKey || e.ctrlKey || e.altKey) return;
  if (e.key === "ArrowRight") bg?.next();
  if (e.key === "ArrowLeft") bg?.prev();
});
$("#stamp").textContent = META.stamp;

// ── данные ────────────────────────────────────────────────────
const tierOf = (c) => (c <= 0.75 ? "cheap" : c < 2.4 ? "mid" : c < 4 ? "pricey" : "huge");
const tierName = { cheap: "дешёвые", mid: "средние", pricey: "дорогие", huge: "очень дорогие" };
const tierClass = (t) => ({ cheap: "t-cheap", mid: "t-mid", pricey: "t-pricey", huge: "t-huge" }[t]);
const ALL = [
  ...MODELS.map((m) => ({ ...m, who: "baza", tier: tierOf(m.coef), value: m.coef ? m.power / m.coef : 0, rub: m.coef * META.rubPerM })),
  ...CLAUDE_CODE.map((m) => ({ ...m, who: "claude", tier: "sub", value: 0, rub: null, coef: null })),
];
const byId = Object.fromEntries(ALL.map((m) => [m.id, m]));
const VENDORS = {};
for (const m of ALL) (VENDORS[m.vendor] ||= []).push(m);
const VCOL = { OpenAI: "#7be0a8", "Claude (Anthropic)": "#ff9d6b", DeepSeek: "#6fb7ff", GLM: "#f5d547", Qwen: "#c59bff", Google: "#ff7b8a", xAI: "#e9edf7", Kimi: "#5fe3e3", Mistral: "#ffa8d1", MiniMax: "#b5d86a", MiMo: "#9fb4ff", Hy: "#d9b38c" };
const vendorColor = (v) => VCOL[v] || "#cfd8ff";

const SORTS = {
  name: { label: "по названию", get: (m) => m.name.toLowerCase(), asc: true },
  coef: { label: "по цене (коэффициент)", get: (m) => m.coef ?? 99, asc: true },
  power: { label: "по силе", get: (m) => m.power ?? -1, asc: false },
  value: { label: "по силе на рубль", get: (m) => m.value, asc: false },
  costB: { label: "по цене простого вопроса (списано)", get: (m) => (m.bench?.tokB && m.coef ? m.bench.tokB * m.coef : 1e9), asc: true },
  tokB: { label: "по токенам в тесте", get: (m) => m.bench?.tokB ?? 1e9, asc: true },
  secB: { label: "по скорости ответа", get: (m) => m.bench?.secB ?? 1e9, asc: true },
  vendor: { label: "по семейству", get: (m) => m.vendor, asc: true },
};
const state = (() => {
  let s = { scope: "baza", view: "table", sort: "coef", dir: 1, group: "", filters: [], q: "", open: null };
  try { Object.assign(s, JSON.parse(localStorage.getItem("models-state") || "{}"), { open: null }); } catch { /* пусто */ }
  return s;
})();
{ const p = new URLSearchParams(location.search); for (const k of ["scope", "view", "sort", "group", "q"]) if (p.get(k)) state[k] = p.get(k); if (p.get("open")) state.open = p.get("open"); }
const save = () => { try { localStorage.setItem("models-state", JSON.stringify({ ...state, open: null })); } catch { /* пусто */ } };

function visible() {
  let list = ALL.filter((m) => state.scope === "all" || m.who === state.scope);
  const q = state.q.trim().toLowerCase();
  if (q) list = list.filter((m) => (m.name + " " + m.id + " " + m.vendor + " " + (m.best || []).join(" ")).toLowerCase().includes(q));
  const f = state.filters;
  const tiers = f.filter((x) => ["cheap", "mid", "pricey"].includes(x));
  if (tiers.length) list = list.filter((m) => m.who === "claude" || tiers.includes(m.tier === "huge" ? "pricey" : m.tier));
  if (f.includes("reason")) list = list.filter((m) => m.reason);
  if (f.includes("ok")) list = list.filter((m) => m.bench?.okB);
  const s = SORTS[state.sort];
  list.sort((a, b) => {
    const x = s.get(a), y = s.get(b);
    const r = x < y ? -1 : x > y ? 1 : 0;
    return (s.asc ? r : -r) * state.dir || a.name.localeCompare(b.name);
  });
  return list;
}
function groups(list) {
  const k = state.group;
  if (!k) return [{ title: "", items: list }];
  const key = { vendor: (m) => m.vendor, tier: (m) => (m.who === "claude" ? "По подписке (Вера)" : tierName[m.tier]), reason: (m) => (m.reason ? "С рассуждением" : "Без рассуждения") }[k];
  const map = new Map();
  for (const m of list) { const g = key(m); if (!map.has(g)) map.set(g, []); map.get(g).push(m); }
  return [...map].map(([title, items]) => ({ title, items }));
}

// ── части разметки ────────────────────────────────────────────
const dots = (p) => {
  if (p == null) return '<span class="muted">—</span>';
  const n = Math.max(0, Math.min(5, Math.round(p > 5 ? 5 : p)));
  return `<span class="dots" title="${esc(p)} из 5 по оценке провайдера">${[1, 2, 3, 4, 5].map((i) => `<i class="${i <= n ? "f" : ""}"></i>`).join("")}</span>${p > 5 ? ` <small class="muted">${esc(p)}/5</small>` : ""}`;
};
const coefPill = (m) => (m.who === "claude" ? '<span class="pill t-mid">подписка</span>' : `<span class="pill ${tierClass(m.tier)}">×${esc(m.coef)}</span>`);
const tags = (m) => (m.best || []).map((t) => `<span class="tag">${esc(t)}</span>`).join("");
const testCell = (m) => {
  const b = m.bench;
  if (!b) return '<span class="muted">не мерили</span>';
  if (!b.okA) return `<span class="no" title="${esc(b.err || "")}">не ответила</span>`;
  return `<span class="${b.okB ? "ok" : "no"}">${b.okB ? "✓" : "✗"}</span> <span class="muted">${fmt(b.tokB)} ток.</span>${m.coef ? `<br><small class="muted">списано ≈ ${fmt(Math.round(b.tokB * m.coef))} · ${b.secB} с</small>` : ` <small class="muted">${b.secB} с</small>`}`;
};
const detailHtml = (m) => {
  const b = m.bench;
  return `<div class="detail"><div>
    <h4>${esc(m.name)}</h4><p>${esc(m.desc || "")}</p>
    ${m.avoid ? `<p><b>Не брать для:</b> ${esc(m.avoid)}</p>` : ""}
    <div>${tags(m)}</div></div>
    <div><h4>Цифры</h4><div class="kv">
      <span>Идентификатор</span><span>${esc(m.id)}</span>
      <span>Семейство</span><span>${esc(m.vendor)}</span>
      ${m.who === "baza" ? `<span>Цена</span><span>×${esc(m.coef)} · ≈ ${rub(m.rub)} ₽ за 1 млн токенов (пакет 100 млн)</span>
      <span>Сила / рассуждение</span><span>${esc(m.power)}/5 · ${m.reason ? "да" : "нет"}</span>
      <span>Сила на коэффициент</span><span>${m.value.toFixed(1)}</span>` : `<span>Расход</span><span>по подписке, лимиты видны в /usage</span>`}
      ${b ? `<span>Тест «привет»</span><span>${b.okA ? fmt(b.tokA) + " ток., " + b.secA + " с" : "нет ответа"}</span>
      <span>Тест 17×23</span><span>${b.okB ? fmt(b.tokB) + " ток., " + b.secB + " с" + (b.reasonTok ? ", из них рассуждение " + fmt(b.reasonTok) : "") : "ошибка"}</span>` : ""}
    </div></div></div>`;
};

// ── виды ──────────────────────────────────────────────────────
function viewTable(list) {
  const cols = [
    ["name", "Модель"], ["vendor", "Семейство"], ["coef", "Цена"], ["power", "Сила"], ["value", "Сила / цена"],
    [null, "Рассуждение"], ["tokB", "Тест"], [null, "Для чего"],
  ];
  const head = cols.map(([k, t]) => `<th ${k ? `data-sort="${k}"` : ""} class="${k === state.sort ? "sorted" : ""}">${t}${k === state.sort ? `<span class="arr">${(SORTS[state.sort].asc ? state.dir : -state.dir) > 0 ? "↑" : "↓"}</span>` : ""}</th>`).join("");
  let body = "";
  for (const g of groups(list)) {
    if (g.title) body += `<tr class="grp"><td colspan="8">${esc(g.title)}</td></tr>`;
    for (const m of g.items) {
      body += `<tr data-id="${esc(m.id)}"><td class="name"><b>${esc(m.name)}</b><small>${esc(m.id)}</small></td>
        <td>${esc(m.vendor)}</td><td>${coefPill(m)}${m.rub != null ? `<br><small class="muted">≈ ${rub(m.rub)} ₽/млн</small>` : ""}</td>
        <td>${dots(m.power)}</td><td>${m.who === "baza" ? `<span class="bar" title="сила / коэффициент"><i style="width:${Math.min(100, m.value * 11)}%"></i></span> <small class="muted">${m.value.toFixed(1)}</small>` : '<span class="muted">—</span>'}</td>
        <td>${m.reason ? "да" : '<span class="muted">нет</span>'}</td><td>${testCell(m)}</td><td>${tags(m)}</td></tr>`;
      if (state.open === m.id) body += `<tr class="det"><td colspan="8">${detailHtml(m)}</td></tr>`;
    }
  }
  return `<div class="panel tbl-wrap"><table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div>`;
}
function viewCards(list) {
  let html = '<div class="grid">';
  for (const g of groups(list)) {
    if (g.title) html += `<div class="grp-h">${esc(g.title)}</div>`;
    for (const m of g.items) {
      html += `<article class="panel card" data-id="${esc(m.id)}"><h3><span>${esc(m.name)}</span>${coefPill(m)}</h3>
        <div class="meta"><span style="color:${vendorColor(m.vendor)}">●</span> ${esc(m.vendor)} ${m.reason ? "· рассуждает" : ""} ${dots(m.power)}</div>
        <p>${esc(m.desc || "")}</p>
        <div class="nums"><div>Цена<b>${m.rub != null ? rub(m.rub) + " ₽" : "—"}</b>за 1 млн ток.</div><div>Сила/цена<b>${m.who === "baza" ? m.value.toFixed(1) : "—"}</b>больше лучше</div><div>Тест<b>${m.bench?.okA ? fmt(m.bench.tokB) : "—"}</b>${m.bench?.okA ? m.bench.secB + " с" : "нет данных"}</div></div>
        <div>${tags(m)}</div></article>`;
    }
  }
  return html + "</div>";
}
function viewChart(list) {
  const pts = list.filter((m) => m.who === "baza" && m.coef && m.power != null);
  if (!pts.length) return '<div class="panel empty">Для графика нужны модели Гермионы (BazaAI).</div>';
  const W = 1100, H = 600, L = 60, R = 24, T = 20, B = 54;
  const xmin = 0.2, xmax = 7, ymax = 10.4;
  const X = (c) => L + (Math.log(c / xmin) / Math.log(xmax / xmin)) * (W - L - R);
  const Y = (p) => H - B - (p / ymax) * (H - T - B);
  const front = pts.slice().sort((a, b) => a.coef - b.coef || b.power - a.power);
  const par = []; let best = -1;
  for (const m of front) if (m.power > best) { best = m.power; par.push(m); }
  let svg = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Цена и сила моделей">`;
  for (const c of [0.25, 0.5, 1, 2, 4, 6]) svg += `<line class="gl" x1="${X(c)}" x2="${X(c)}" y1="${T}" y2="${H - B}"/><text x="${X(c)}" y="${H - B + 20}" text-anchor="middle">×${c}</text>`;
  for (const p of [0, 2, 4, 6, 8, 10]) svg += `<line class="gl" y1="${Y(p)}" y2="${Y(p)}" x1="${L}" x2="${W - R}"/><text x="${L - 10}" y="${Y(p) + 4}" text-anchor="end">${p}</text>`;
  svg += `<line class="ax" x1="${L}" x2="${W - R}" y1="${H - B}" y2="${H - B}"/><line class="ax" x1="${L}" x2="${L}" y1="${T}" y2="${H - B}"/>`;
  svg += `<text x="${(L + W - R) / 2}" y="${H - 8}" text-anchor="middle">цена: коэффициент списания (дешевле ← → дороже, шкала логарифмическая)</text>`;
  svg += `<text transform="translate(16 ${(T + H - B) / 2}) rotate(-90)" text-anchor="middle">сила по оценке провайдера</text>`;
  svg += `<polyline fill="none" stroke="#f5d547" stroke-width="1.6" stroke-dasharray="5 5" opacity=".7" points="${par.map((m) => `${X(m.coef)},${Y(m.power)}`).join(" ")}"/>`;
  for (const m of pts) {
    const lab = par.includes(m) || m.power >= 8;
    svg += `<circle class="pt" data-id="${esc(m.id)}" cx="${X(m.coef)}" cy="${Y(m.power)}" r="${m.reason ? 9 : 7}" fill="${vendorColor(m.vendor)}" fill-opacity=".85" stroke="${m.reason ? "#fff" : "rgba(0,0,0,.5)"}" stroke-width="${m.reason ? 1.6 : 1}"/>`;
    if (lab) svg += `<text class="lbl" ${X(m.coef) > W - 150 ? `text-anchor="end" x="${X(m.coef) - 12}"` : `x="${X(m.coef) + 11}"`} y="${Y(m.power) + 4}">${esc(m.name)}</text>`;
  }
  svg += "</svg>";
  const vs = [...new Set(pts.map((m) => m.vendor))];
  return `<div class="panel chart">${svg}<div class="legend">${vs.map((v) => `<span><i style="background:${vendorColor(v)}"></i>${esc(v)}</span>`).join("")}<span>◯ с белой каймой — рассуждает</span><span style="color:#f5d547">- - граница выгоды: дешевле при той же силе нет</span></div></div>
    <p class="hint">Модели на золотой линии не имеют более дешёвого аналога той же силы. Наведи или нажми на точку, чтобы увидеть детали.</p>`;
}
function viewTasks() {
  return `<div class="tasks">${TASKS.map((t) => `<section class="panel task"><div><h3>${esc(t.title)}</h3><div class="why">${esc(t.why)}</div></div>
    <div class="picks">${t.picks.map((id, i) => { const m = byId[id]; if (!m) return ""; return `<div class="pick" data-id="${esc(id)}"><span class="rk">${i + 1}</span><b>${esc(m.name)}</b><small>${m.coef != null ? "×" + m.coef + " · ≈ " + rub(m.rub) + " ₽/млн" : "подписка"}${t.notes?.[id] ? " · " + esc(t.notes[id]) : ""}</small></div>`; }).join("")}</div></section>`).join("")}</div>`;
}
function viewSpend() {
  const max = Math.max(...SPEND.byModel.map((x) => x.tokens));
  const avg = (x) => (x.req ? Math.round(x.tokens / x.req) : 0);
  const bars = SPEND.byModel.map((x) => `<div class="hbar"><span>${esc(x.name)}</span><div class="trk"><i style="width:${(x.tokens / max) * 100}%"></i></div><span class="v">${fmt(x.tokens)}</span></div>
    <div class="hbar" style="margin-top:-4px"><span class="muted" style="font-size:11.5px">${fmt(x.req)} запросов</span><span></span><span class="v muted" style="font-size:11.5px">≈ ${fmt(avg(x))} на запрос</span></div>`).join("");
  const sel = MODELS.filter((m) => ["deepseek-v4-flash", "deepseek-v4-pro", "gpt-6-luna", "gpt-6.1-terra", "claude-sonnet-5-5", "claude-opus-5-5"].includes(m.id));
  return `<div class="spend">
    <section class="panel"><h3>Куда ушли токены (за 90 дней)</h3>
      <div class="note">Остаток: <b>${fmt(SPEND.balance)}</b> из ${fmt(SPEND.issued)} · использовано ${fmt(SPEND.used)} · в обработке ${fmt(SPEND.pending)}. Данные из дашборда, ${esc(SPEND.date)}.</div>
      ${bars}</section>
    <section class="panel calc"><h3>Калькулятор запроса</h3>
      <label>Размер одного запроса (токенов контекста): <output id="cTok">20 000</output><input id="cTokR" type="range" min="2" max="6" step="0.05" value="4.3"></label>
      <label>Запросов в день: <output id="cReq">20</output><input id="cReqR" type="range" min="0" max="3" step="0.05" value="1.3"></label>
      <div id="cOut"></div>
      <div class="note">Главное правило: цена запроса = токены × коэффициент. У Гермионы запросы по 150–160 тысяч токенов (длинный контекст с историей), поэтому она дорожает даже на средней модели. Помогают короткие ТЗ и новая сессия на каждую мелкую задачу.</div>
    </section>
    <section class="panel span2"><h3>Что показал замер</h3>${SPEND.insights.map((s) => `<div class="note">${esc(s)}</div>`).join("")}</section>
  </div>`;
}
function calcUpdate() {
  const tok = Math.round(10 ** $("#cTokR").value), req = Math.round(10 ** $("#cReqR").value);
  $("#cTok").textContent = fmt(tok); $("#cReq").textContent = fmt(req);
  const sel = ["deepseek-v4-flash", "deepseek-v4-pro", "gpt-6-luna", "gpt-6.1-terra", "claude-sonnet-5-5", "claude-opus-5-5"].map((id) => byId[id]).filter(Boolean);
  $("#cOut").innerHTML = `<div class="kv" style="grid-template-columns:1fr auto auto">` + sel.map((m) => {
    const perReq = (tok * m.coef * META.rubPerM) / 1e6, perDay = perReq * req;
    return `<span>${esc(m.name)} ×${m.coef}</span><span><b>${rub(perReq)} ₽</b> запрос</span><span><b>${rub(perDay)} ₽</b> / день</span>`;
  }).join("") + "</div>";
}

// ── отрисовка и события ───────────────────────────────────────
const out = $("#out");
const sortSel = $("#sortKey");
sortSel.innerHTML = Object.entries(SORTS).map(([k, v]) => `<option value="${k}">${v.label}</option>`).join("");

function render() {
  const list = visible();
  const modelView = ["table", "cards", "chart"].includes(state.view);
  $("#filterRow").style.display = modelView ? "" : "none";
  for (const b of document.querySelectorAll("#scope button")) b.classList.toggle("on", b.dataset.v === state.scope);
  for (const b of document.querySelectorAll("#views button")) b.classList.toggle("on", b.dataset.v === state.view);
  for (const b of document.querySelectorAll("#tierChips .chip")) b.classList.toggle("on", state.filters.includes(b.dataset.t));
  sortSel.value = state.sort; $("#sortDir").textContent = (SORTS[state.sort].asc ? state.dir : -state.dir) > 0 ? "↑" : "↓"; $("#groupKey").value = state.group; $("#q").value = state.q;
  if (!list.length && modelView) out.innerHTML = '<div class="panel empty">Ничего не нашлось. Сбрось фильтры или поиск.</div>';
  else out.innerHTML = { table: viewTable, cards: viewCards, chart: viewChart, tasks: viewTasks, spend: viewSpend }[state.view](list);
  if (state.view === "spend") { for (const id of ["cTokR", "cReqR"]) $("#" + id).addEventListener("input", calcUpdate); calcUpdate(); }
  save();
}
function openDetail(id) {
  if (state.view === "tasks" || state.view === "chart") { state.view = "table"; state.q = ""; state.filters = []; state.scope = "all"; }
  state.open = state.open === id ? null : id; render();
  $(`tr[data-id="${CSS.escape(id)}"]`)?.scrollIntoView({ block: "center", behavior: "smooth" });
}
$("#scope").addEventListener("click", (e) => { const b = e.target.closest("button"); if (b) { state.scope = b.dataset.v; render(); } });
$("#views").addEventListener("click", (e) => { const b = e.target.closest("button"); if (b) { state.view = b.dataset.v; render(); } });
$("#tierChips").addEventListener("click", (e) => { const b = e.target.closest(".chip"); if (!b) return; const t = b.dataset.t; state.filters = state.filters.includes(t) ? state.filters.filter((x) => x !== t) : [...state.filters, t]; render(); });
sortSel.addEventListener("change", () => { state.sort = sortSel.value; state.dir = 1; render(); });
$("#sortDir").addEventListener("click", () => { state.dir *= -1; render(); });
$("#groupKey").addEventListener("change", (e) => { state.group = e.target.value; render(); });
$("#q").addEventListener("input", (e) => { state.q = e.target.value; render(); $("#q").focus(); });
out.addEventListener("click", (e) => {
  const th = e.target.closest("th[data-sort]");
  if (th) { const k = th.dataset.sort; if (state.sort === k) state.dir *= -1; else { state.sort = k; state.dir = 1; } render(); return; }
  const el = e.target.closest("[data-id]");
  if (el && !e.target.closest(".det")) openDetail(el.dataset.id);
});
// всплывающая подсказка для графика
const tip = $("#tip");
out.addEventListener("mousemove", (e) => {
  const pt = e.target.closest?.(".pt");
  if (!pt) { tip.classList.remove("show"); return; }
  const m = byId[pt.dataset.id];
  tip.innerHTML = `<b>${esc(m.name)}</b>×${esc(m.coef)} · сила ${esc(m.power)} · ≈ ${rub(m.rub)} ₽/млн<br>${esc((m.desc || "").slice(0, 130))}`;
  tip.style.left = Math.min(innerWidth - 300, e.clientX + 14) + "px"; tip.style.top = e.clientY + 14 + "px"; tip.classList.add("show");
});
out.addEventListener("mouseleave", () => tip.classList.remove("show"));
render();
