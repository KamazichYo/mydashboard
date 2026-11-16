// «Воздушные» панели: еле заметно покачиваются и чуть отступают от курсора.
// Пружина держит их на месте — далеко не уплывают.
export function startFloat(els, {
  push = 7,        // макс. отступ от курсора, px
  reach = 150,     // радиус влияния курсора от края панели, px
  bob = 2.5,       // амплитуда покачивания, px
  tilt = 1.2,      // макс. наклон, градусы
} = {}) {
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const state = els.map((el, i) => ({
    el, x: 0, y: 0, vx: 0, vy: 0, rx: 0, ry: 0,
    phase: i * 1.7 + Math.random(), period: 6 + Math.random() * 3,
  }));
  const cur = { x: -1e4, y: -1e4 };
  addEventListener("pointermove", (e) => { cur.x = e.clientX; cur.y = e.clientY; });
  document.addEventListener("pointerleave", () => { cur.x = cur.y = -1e4; });

  const frame = (now) => {
    const t = now / 1000;
    for (const s of state) {
      const r = s.el.getBoundingClientRect();
      const left = r.left - s.x, top = r.top - s.y;
      const cx = left + r.width / 2, cy = top + r.height / 2;

      // Расстояние от курсора до края панели (0, если курсор внутри).
      const nx = Math.max(left, Math.min(cur.x, left + r.width));
      const ny = Math.max(top, Math.min(cur.y, top + r.height));
      const dist = Math.hypot(cur.x - nx, cur.y - ny);
      let dx = cx - cur.x, dy = cy - cur.y;
      const dl = Math.hypot(dx, dy) || 1;
      dx /= dl; dy /= dl;
      const f = Math.exp(-dist / reach) * (dist === 0 ? 0.6 : 1);

      const w = (2 * Math.PI) / s.period;
      const tx = dx * push * f + Math.sin(t * w * 0.7 + s.phase) * bob * 0.6;
      const ty = dy * push * f + Math.sin(t * w + s.phase) * bob;

      // Мягкая пружина с демпфированием.
      s.vx = s.vx * 0.82 + (tx - s.x) * 0.045;
      s.vy = s.vy * 0.82 + (ty - s.y) * 0.045;
      s.x += s.vx; s.y += s.vy;

      // Наклон «от курсора», когда он рядом.
      const trx = -dy * tilt * f, tr_y = dx * tilt * f;
      s.rx += (trx - s.rx) * 0.06;
      s.ry += (tr_y - s.ry) * 0.06;

      s.el.style.transform =
        `translate3d(${s.x.toFixed(2)}px, ${s.y.toFixed(2)}px, 0) rotateX(${s.rx.toFixed(3)}deg) rotateY(${s.ry.toFixed(3)}deg)`;
    }
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}
