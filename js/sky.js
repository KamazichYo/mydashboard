// Небо: раскладка облаков, медленная физика, замирание у курсора,
// распаковка групп, клики. Рисует CloudRenderer, подписи — DOM.
import { FAVORITES, GROUPS, SEARCH_ICONS } from "./links.js";
import { CloudRenderer, cloudShape, buildAtlas } from "./clouds.js";

const host = (url) => new URL(url).hostname;
const iconSrc = (item) => item.icon || `assets/icons/${host(item.url)}.png`;
const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const ease = (x) => 1 - Math.pow(1 - Math.min(1, Math.max(0, x)), 3);

export function startSky({ canvas, labels, center, engines }) {
  const R = new CloudRenderer(canvas);
  const bodies = [];
  let seed = 7;

  const make = (o) => {
    const b = {
      x: innerWidth / 2, y: innerHeight / 2, vx: 0, vy: 0, r: 60, base: 60,
      calm: 0, appear: 0, appearTo: 1, t: Math.random() * 100, anim: Math.random() * 100,
      ph: [Math.random() * 6.3, Math.random() * 6.3], freq: [0.7 + Math.random() * 0.6, 0.7 + Math.random() * 0.6],
      shape: cloudShape(seed++ * 9973, o.puffs || 34), logo: 0, labelA: 0, ...o,
    };
    b.idx = bodies.length;
    bodies.push(b);
    if (o.label) {
      const el = document.createElement("div");
      el.className = `cloud-label ${o.kind}`;
      el.textContent = o.label;
      labels.append(el);
      b.el = el;
    }
    return b;
  };

  // Группы и их дети — первыми (рисуются ниже), избранное, потом поиск.
  const groups = GROUPS.map((g) => {
    const gb = make({ kind: "group", label: g.title, size: 1.1, puffs: 44, key: `g:${g.title}`, data: g });
    gb.children = g.items.map((it) =>
      make({ kind: "child", label: it.name, url: it.url, size: 0.56, puffs: 28, key: it.url, parent: gb, appear: 0, appearTo: 0, item: it }),
    );
    return gb;
  });
  const favs = FAVORITES.map((it) =>
    make({ kind: "fav", label: it.name, url: it.url, size: it.size || 1, puffs: 40, key: it.url, item: it }),
  );
  const search = engines.map((btn) =>
    make({ kind: "search", btn, size: 0.46, puffs: 26, key: `s:${btn.dataset.engine}`, item: { url: SEARCH_ICONS[btn.dataset.engine] } }),
  );
  const clock = { kind: "clock", x: 0, y: 0, r: 200, vx: 0, vy: 0, t: 0, calm: 0 };
  R.setShapes(bodies.map((b) => b.shape));

  // ── атлас ────────────────────────────────────────────────
  const entries = bodies.map((b) =>
    b.kind === "group"
      ? { key: b.key, icons: b.data.items.slice(0, 4).map(iconSrc), letters: b.data.items.map((i) => i.name[0]) }
      : { key: b.key, icons: [iconSrc(b.item)], letter: (b.label || "?")[0] },
  );
  buildAtlas(entries).then(({ canvas: atlas, cells, map }) => {
    R.setAtlas(atlas, cells);
    bodies.forEach((b) => { b.cell = map.get(b.key); b.logoTo = 1; });
  });

  // ── раскладка: часы в центре, облака — по бокам ───────────
  let W = innerWidth, H = innerHeight, S = 1;
  // Чередуем: большое облако, группа, большое, группа… — чтобы бока были разнообразными.
  const top = [];
  for (let i = 0; i < Math.max(favs.length, groups.length); i++) {
    if (favs[i]) top.push(favs[i]);
    if (groups[i]) top.push(groups[i]);
  }
  const order = top.map((_, i) => i);
  const layout = () => {
    W = innerWidth; H = innerHeight;
    S = Math.min(1.3, Math.max(0.55, Math.min(W / 1600, H / 950)));
    bodies.forEach((b) => (b.base = b.r = 90 * b.size * S));
    const sides = [[], []];
    order.forEach((i, k) => sides[(k % 4 === 0 || k % 4 === 3) ? 0 : 1].push(top[i]));
    sides.forEach((list, side) => {
      const x0 = side ? W * 0.665 : W * 0.035, zw = W * 0.30;
      const rows = Math.ceil(list.length / 2);
      list.forEach((b, k) => {
        const row = Math.floor(k / 2), col = k % 2;
        const zig = row % 2 ? 0.18 : -0.18;
        b.home = {
          x: x0 + zw * ((col + 0.5) / 2 + zig * (side ? -1 : 1) * 0.5),
          y: H * (0.1 + 0.8 * (row + 0.5) / rows) + (col ? H * 0.06 : -H * 0.02),
        };
      });
    });
    R.resize();
  };
  layout();
  top.forEach((b, k) => {
    b.x = b.home.x + (Math.random() - 0.5) * 40;
    b.y = b.home.y + 60 + Math.random() * 40;
    b.delay = 0.15 + k * 0.09;
  });
  addEventListener("resize", layout);

  // ── курсор ───────────────────────────────────────────────
  const cur = { x: -1e4, y: -1e4, in: false };
  addEventListener("pointermove", (e) => { cur.x = e.clientX; cur.y = e.clientY; cur.in = true; });
  document.addEventListener("pointerleave", () => { cur.in = false; cur.x = cur.y = -1e4; });

  const hit = () => {
    if (!cur.in || center.contains(document.elementFromPoint(cur.x, cur.y))) return null;
    let best = null, bd = Infinity;
    for (const b of bodies) {
      if (b.kind === "search" || b.appear < 0.6) continue;
      const d = Math.hypot(cur.x - b.x, cur.y - b.y) / (b.r * (b.kind === "child" ? 1.05 : 0.95));
      const pri = b.kind === "child" ? d - 0.3 : d;
      if (d < 1 && pri < bd) { bd = pri; best = b; }
    }
    return best;
  };

  // ── группы ───────────────────────────────────────────────
  let open = null, pinned = false, lastInside = 0;
  const expand = (g) => {
    if (open && open !== g) collapse(open);
    open = g;
    g.children.forEach((c) => {
      if (c.appear < 0.05) { c.x = g.x + (Math.random() - 0.5) * 10; c.y = g.y + (Math.random() - 0.5) * 10; c.vx = c.vy = 0; }
      c.appearTo = 1;
    });
    lastInside = performance.now();
  };
  const collapse = (g) => {
    g.children.forEach((c) => (c.appearTo = 0));
    if (open === g) { open = null; pinned = false; }
  };
  const ringTargets = (g) => {
    const n = g.children.length, rc = g.children[0].base;
    const toC = Math.atan2(H / 2 - g.y, W / 2 - g.x);
    const rings = n > 6 ? [Math.ceil(n / 2), Math.floor(n / 2)] : [n];
    const out = [];
    let k = 0;
    rings.forEach((m, ri) => {
      const arc = ri === 0 ? Math.PI * 1.05 : Math.PI * 0.75;
      const R0 = g.r * 0.95 + rc * (1.25 + ri * 2.25);
      const need = (m * rc * 2.3) / arc;
      const Rr = Math.max(R0, need + ri * rc * 2.2);
      for (let j = 0; j < m; j++, k++) {
        const a = toC + (m === 1 ? 0 : (j / (m - 1) - 0.5) * arc);
        out.push({
          x: Math.min(W - rc, Math.max(rc, g.x + Math.cos(a) * Rr)),
          y: Math.min(H - rc * 0.9, Math.max(rc * 0.9, g.y + Math.sin(a) * Rr)),
        });
      }
    });
    return out;
  };

  // ── клики ────────────────────────────────────────────────
  addEventListener("click", (e) => {
    if (center.contains(e.target)) return;
    const b = hit();
    if (!b) { if (open && pinned) collapse(open); return; }
    if (b.kind === "group") {
      if (open === b && pinned) collapse(b);
      else { expand(b); pinned = true; }
      return;
    }
    if (b.url) {
      if (e.metaKey || e.ctrlKey) window.open(b.url, "_blank");
      else location.href = b.url;
    }
  });
  addEventListener("auxclick", (e) => {
    if (e.button !== 1) return;
    const b = hit();
    if (b?.url) window.open(b.url, "_blank");
  });
  addEventListener("keydown", (e) => { if (e.key === "Escape" && open) collapse(open); });

  // ── кадр ─────────────────────────────────────────────────
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const speed = reduced ? 0.25 : 1;
  let last = performance.now(), T = 0, hovered = null, raf = 0;
  const states = bodies.map(() => ({ x: 0, y: 0, r: 0, t: 0, cx: 0, cy: 0, logo: 0, alpha: 0 }));

  const frame = (now) => {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now; T += dt;

    // часы медленно плавают в центре и тоже замирают у курсора
    const cr = center.getBoundingClientRect();
    const cdist = Math.hypot(cur.x - (cr.left + cr.width / 2), cur.y - (cr.top + cr.height / 2)) - Math.max(cr.width, cr.height) / 2;
    clock.calm += ((1 - smooth(0, 220, cdist)) - clock.calm) * (1 - Math.exp(-dt * 2.5));
    clock.t += dt * speed * (1 - clock.calm);
    const ox = Math.sin(clock.t * 0.13) * W * 0.035 + Math.sin(clock.t * 0.051) * W * 0.02;
    const oy = Math.sin(clock.t * 0.1 + 1.3) * H * 0.035;
    center.style.transform = `translate(calc(-50% + ${ox.toFixed(1)}px), calc(-50% + ${oy.toFixed(1)}px))`;
    clock.x = W / 2 + ox; clock.y = H / 2 + oy;
    clock.r = Math.hypot(cr.width, cr.height * 1.2) / 2 * 0.82 + 20 * S;

    // наведение
    const h = hit();
    if (h !== hovered) { hovered = h; document.documentElement.style.cursor = h ? "pointer" : ""; }
    if (h?.kind === "group" && open !== h) { expand(h); pinned = false; }
    if (open) {
      const inside = Math.hypot(cur.x - open.x, cur.y - open.y) < open.r * 1.2 ||
        open.children.some((c) => Math.hypot(cur.x - c.x, cur.y - c.y) < c.r * 1.35);
      if (inside) lastInside = now;
      else if (!pinned && now - lastInside > 650) collapse(open);
    }
    const targets = open ? ringTargets(open) : null;

    // силы
    const active = [];
    for (const b of bodies) {
      if (b.kind === "child" && b.appear < 0.01 && b.appearTo === 0) continue;
      active.push(b);
      b.ax = 0; b.ay = 0;
      if (b.delay > 0) { b.delay -= dt; continue; }
      b.appear += (b.appearTo - b.appear) * (1 - Math.exp(-dt * (b.kind === "child" ? 4.5 : 1.6)));
      b.logo = (b.logo || 0) + ((b.logoTo || 0) - (b.logo || 0)) * (1 - Math.exp(-dt * 2));

      const d = Math.hypot(cur.x - b.x, cur.y - b.y) - b.r;
      b.calm += ((1 - smooth(20, 230 * S, d)) - b.calm) * (1 - Math.exp(-dt * 2.2));
      b.t += dt * speed * (1 - b.calm);
      b.anim += dt * speed * (1 - b.calm * 0.75);

      const hoverGrow = hovered === b ? 1.07 : 1;
      const shrink = b.kind === "group" && open === b ? 0.88 : 1;
      const grow = b.kind === "search" && b.btn.classList.contains("active") ? 1.12 : 1;
      b.r += (b.base * hoverGrow * shrink * grow - b.r) * (1 - Math.exp(-dt * 5));

      if (b.kind === "search") {
        const br = b.btn.getBoundingClientRect();
        b.x = br.left + br.width / 2; b.y = br.top + br.height / 2;
        continue;
      }
      let tx, ty, k, c;
      if (b.kind === "child") {
        const p = b.parent;
        const i = p.children.indexOf(b);
        const tg = b.appearTo && targets && open === p ? targets[i] : { x: p.x, y: p.y };
        tx = tg.x + Math.sin(b.t * 0.21 + b.ph[0]) * 6; ty = tg.y + Math.cos(b.t * 0.17 + b.ph[1]) * 6;
        k = 9; c = 5.5;
      } else {
        const A = 46 * S;
        tx = b.home.x + Math.sin(b.t * 0.055 * b.freq[0] + b.ph[0]) * A + Math.sin(b.t * 0.021 + b.ph[1]) * A * 0.6;
        ty = b.home.y + Math.cos(b.t * 0.047 * b.freq[1] + b.ph[1]) * A * 0.8;
        k = 0.5; c = 1.5 + b.calm * 4;
      }
      b.ax += (tx - b.x) * k - b.vx * c;
      b.ay += (ty - b.y) * k - b.vy * c;

      // мягкие стенки
      const m = b.r * 0.75;
      if (b.x < m) b.ax += (m - b.x) * 6; if (b.x > W - m) b.ax -= (b.x - (W - m)) * 6;
      if (b.y < m * 0.8) b.ay += (m * 0.8 - b.y) * 6; if (b.y > H - m * 0.8) b.ay -= (b.y - (H - m * 0.8)) * 6;
    }

    // столкновения: мягкие, края смешиваются, но облака не проходят друг сквозь друга
    const colliders = [...active, clock];
    const mass = (b) =>
      b.kind === "clock" || b.kind === "search" ? Infinity :
      b === open ? Infinity : b.kind === "child" ? 0.7 : b.kind === "group" ? 1.4 : 1;
    for (let i = 0; i < colliders.length; i++) {
      for (let j = i + 1; j < colliders.length; j++) {
        const a = colliders[i], b = colliders[j];
        const ma = mass(a), mb = mass(b);
        if (ma === Infinity && mb === Infinity) continue;
        if ((a.kind === "search" && b.kind === "clock") || (b.kind === "search" && a.kind === "clock")) continue;
        const ra = a.kind === "clock" ? a.r : a.r * ease(a.appear);
        const rb = b.kind === "clock" ? b.r : b.r * ease(b.appear);
        const minD = (ra + rb) * 0.98;
        let dx = b.x - a.x, dy = b.y - a.y;
        let dd = Math.hypot(dx, dy);
        if (dd >= minD || minD < 1) continue;
        if (dd < 0.01) { dx = Math.random() - 0.5; dy = Math.random() - 0.5; dd = Math.hypot(dx, dy); }
        const nx = dx / dd, ny = dy / dd, over = minD - dd;
        const wa = ma === Infinity ? 0 : 1 / ma, wb = mb === Infinity ? 0 : 1 / mb, ws = wa + wb;
        const F = over * 7;
        if (a.ax !== undefined) { a.ax -= nx * F * wa / ws; a.ay -= ny * F * wa / ws; }
        if (b.ax !== undefined) { b.ax += nx * F * wb / ws; b.ay += ny * F * wb / ws; }
        // жёсткая страховка от взаимного проникновения
        const hard = over - minD * 0.12;
        if (hard > 0) {
          if (a.kind !== "clock" && a.kind !== "search") { a.x -= nx * hard * 0.25 * wa / ws; a.y -= ny * hard * 0.25 * wa / ws; }
          if (b.kind !== "clock" && b.kind !== "search") { b.x += nx * hard * 0.25 * wb / ws; b.y += ny * hard * 0.25 * wb / ws; }
        }
      }
    }

    // интеграция
    for (const b of active) {
      if (b.kind === "search" || b.delay > 0) continue;
      b.vx += b.ax * dt; b.vy += b.ay * dt;
      const v = Math.hypot(b.vx, b.vy), vmax = (b.kind === "child" ? 900 : 160) * S;
      if (v > vmax) { b.vx *= vmax / v; b.vy *= vmax / v; }
      b.x += b.vx * dt; b.y += b.vy * dt;
    }

    // отрисовка + подписи
    bodies.forEach((b, i) => {
      const s = states[i];
      const ap = b.delay > 0 ? 0 : b.appear;
      s.x = b.x; s.y = b.y; s.r = b.r * (0.35 + 0.65 * ease(ap)); s.t = b.anim;
      s.cx = b.cell ? b.cell[0] : 0; s.cy = b.cell ? b.cell[1] : 0;
      s.logo = b.cell ? b.logo * ease(ap) : 0;
      s.alpha = Math.min(1, ap * 1.4);
      if (b.el) {
        const want = b.kind === "group" ? (open === b ? 0.5 : 1) * ap :
          b.kind === "child" ? smooth(0.6, 1, ap) :
          Math.max(b.calm * 0.95, hovered === b ? 1 : 0) * ap;
        b.labelA += (want - b.labelA) * (1 - Math.exp(-dt * 6));
        b.el.style.opacity = b.labelA.toFixed(3);
        b.el.style.transform = `translate(${b.x.toFixed(1)}px, ${(b.y + b.r * 0.5).toFixed(1)}px) translate(-50%, 0)`;
      }
    });
    R.draw(states, T);
    raf = requestAnimationFrame(frame);
  };
  raf = requestAnimationFrame(frame);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) cancelAnimationFrame(raf);
    else { last = performance.now(); raf = requestAnimationFrame(frame); }
  });

  return { all: [...favs, ...GROUPS.flatMap((g) => g.items)] };
}
