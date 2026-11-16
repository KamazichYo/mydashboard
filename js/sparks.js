// Click Spark (React Bits) на чистом canvas: искры при каждом клике.
export function startSparks(canvas, {
  colors = ["#f5d547", "#cfe6ff"],
  count = 10, size = 12, radius = 26, duration = 480,
} = {}) {
  const ctx = canvas.getContext("2d");
  const sparks = [];
  let raf = 0;

  const resize = () => {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    canvas.width = innerWidth * dpr;
    canvas.height = innerHeight * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  addEventListener("resize", resize);
  resize();

  const draw = (now) => {
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    for (let i = sparks.length - 1; i >= 0; i--) {
      const s = sparks[i];
      const t = (now - s.start) / duration;
      if (t >= 1) { sparks.splice(i, 1); continue; }
      const e = t * (2 - t);                     // ease-out
      const d = e * radius;
      const len = size * (1 - e);
      const cx = Math.cos(s.a), cy = Math.sin(s.a);
      ctx.strokeStyle = s.color;
      ctx.shadowColor = s.color;
      ctx.shadowBlur = 8;
      ctx.lineWidth = 2;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(s.x + d * cx, s.y + d * cy);
      ctx.lineTo(s.x + (d + len) * cx, s.y + (d + len) * cy);
      ctx.stroke();
    }
    raf = sparks.length ? requestAnimationFrame(draw) : 0;
  };

  addEventListener("pointerdown", (e) => {
    const now = performance.now();
    const jitter = Math.random() * Math.PI;
    for (let i = 0; i < count; i++) {
      sparks.push({
        x: e.clientX, y: e.clientY, start: now,
        a: jitter + (2 * Math.PI * i) / count,
        color: colors[i % colors.length],
      });
    }
    if (!raf) raf = requestAnimationFrame(draw);
  });
}
