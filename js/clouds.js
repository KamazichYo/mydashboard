// Облака из частиц. Каждое облако — 30–60 мягких «клубов» (point sprites),
// у которых форма и пушистость берутся из шумовой текстуры. Клубы соседних
// облаков на краях смешиваются. Логотип «проецируется» в объём облака:
// в плотной середине он чёткий, по краям тает вместе с дымкой.

const MAXC = 72;

const VERT = `#version 300 es
in vec4 aPuff;     // смещение x,y (в радиусах облака, y вниз), размер, зерно
in float aCloud;   // номер облака
uniform vec4 uC[${MAXC}];   // x, y (css px), радиус px, время анимации
uniform vec4 uL[${MAXC}];   // ячейка атласа x, y, сила логотипа, прозрачность
uniform vec2 uView;
uniform float uDpr;
out vec2 vCenter;
out float vR;
out vec4 vL;
out float vSeed;
out float vY;
flat out int vIdx;
void main() {
  int i = int(aCloud + 0.5);
  vec4 c = uC[i];
  vec4 l = uL[i];
  float t = c.w;
  vec2 off = aPuff.xy + 0.04 * vec2(sin(t * 0.33 + aPuff.w * 17.0), cos(t * 0.27 + aPuff.w * 11.0));
  float size = aPuff.z * (1.0 + 0.07 * sin(t * 0.45 + aPuff.w * 23.0));
  vec2 p = c.xy + off * c.z;
  vCenter = c.xy; vR = max(c.z, 1.0); vL = l; vSeed = aPuff.w; vY = aPuff.y; vIdx = i;
  vec2 clip = p / uView * 2.0 - 1.0;
  gl_Position = vec4(clip.x, -clip.y, 0.0, 1.0);
  gl_PointSize = l.w <= 0.001 ? 0.0 : size * c.z * 2.0 * uDpr;
}`;

const FRAG = `#version 300 es
precision highp float;
in vec2 vCenter;
in float vR;
in vec4 vL;
in float vSeed;
in float vY;
flat in int vIdx;
uniform sampler2D uNoise;
uniform sampler2D uAtlas;
uniform float uCells;
uniform float uDpr;
uniform float uCanvasH;
uniform float uTime;
out vec4 o;

float fbm(vec2 p) {
  return texture(uNoise, p).r * 0.6 + texture(uNoise, p * 2.13 + 0.37).r * 0.3 + texture(uNoise, p * 4.7 + 0.71).r * 0.1;
}

void main() {
  vec2 pc = gl_PointCoord - 0.5;
  float d = length(pc) * 2.0;
  if (d >= 1.0) discard;

  vec2 frag = vec2(gl_FragCoord.x, uCanvasH - gl_FragCoord.y) / uDpr;
  vec2 lp = (frag - vCenter) / vR;                       // координаты внутри облака
  float idx = float(vIdx);
  float n = fbm(lp * 0.55 + vec2(idx * 0.173, idx * 0.311) + uTime * 0.0035);

  // Пушистый клуб: край изъеден шумом, центр плотный.
  float a = smoothstep(1.0, 0.1, d + (n - 0.5) * 1.1);
  a = a * (0.55 + 0.45 * a) * 0.5;

  // Свет сверху-слева: белая шапка, голубовато-серое брюхо.
  float lit = clamp(0.62 - lp.y * 0.55 - pc.y * 0.5 - pc.x * 0.12 + (n - 0.5) * 0.35, 0.0, 1.0);
  vec3 top = vec3(1.0, 0.985, 0.95);
  vec3 bot = vec3(0.58, 0.66, 0.84);
  vec3 col = mix(bot, top, lit);

  // Проекция логотипа: картинка ложится на рельеф облака, как свет проектора.
  vec2 luv = lp / 0.62 + 0.5 + (n - 0.5) * 0.04;
  if (vL.z > 0.0 && luv.x > 0.0 && luv.x < 1.0 && luv.y > 0.0 && luv.y < 1.0) {
    vec2 cell = vec2(mod(vL.x, uCells), vL.y);
    vec4 logo = texture(uAtlas, (cell + 0.05 + luv * 0.9) / uCells);
    float edge = smoothstep(0.0, 0.08, luv.x) * smoothstep(1.0, 0.92, luv.x)
               * smoothstep(0.0, 0.08, luv.y) * smoothstep(1.0, 0.92, luv.y);
    float k = logo.a * vL.z * edge * (0.8 + 0.2 * n);
    vec3 relief = logo.rgb * (0.74 + 0.36 * lit) * (0.9 + 0.2 * n);   // рельеф проступает сквозь картинку
    col = mix(col, relief * 1.06, k * 0.93);
  }
  // Свет проектора: середина облака чуть ярче.
  col += vec3(1.0, 0.97, 0.9) * 0.06 * vL.z * smoothstep(0.85, 0.0, length(lp));

  float alpha = a * vL.w;
  o = vec4(col * alpha, alpha);
}`;

// ── шумовая текстура ─────────────────────────────────────────
function noiseCanvas(size = 128) {
  const lattice = (s, seed) => {
    const g = new Float32Array(s * s);
    let x = seed;
    for (let i = 0; i < g.length; i++) { x = (x * 16807) % 2147483647; g[i] = x / 2147483647; }
    return g;
  };
  const data = new Uint8Array(size * size);
  const octaves = [[8, 0.55], [16, 0.3], [32, 0.15]];
  const grids = octaves.map(([s], i) => lattice(s, 1234 + i * 777));
  const smooth = (t) => t * t * (3 - 2 * t);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let v = 0;
      octaves.forEach(([s, w], o) => {
        const g = grids[o];
        const fx = (x / size) * s, fy = (y / size) * s;
        const x0 = Math.floor(fx), y0 = Math.floor(fy);
        const tx = smooth(fx - x0), ty = smooth(fy - y0);
        const at = (i, j) => g[((j % s) * s) + (i % s)];
        const a = at(x0, y0), b = at(x0 + 1, y0), c = at(x0, y0 + 1), d = at(x0 + 1, y0 + 1);
        v += w * (a + (b - a) * tx + (c - a) * ty + (a - b - c + d) * tx * ty);
      });
      data[y * size + x] = Math.round(v * 255);
    }
  }
  return { data, size };
}

// ── форма облака ─────────────────────────────────────────────
function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function cloudShape(seed, n) {
  const r = rng(seed);
  const p = [];
  // Основание: плоское снизу, выпуклое сверху.
  for (let k = 0; k < n; k++) {
    const u = r() * 2 - 1;
    const top = 0.42 * Math.sqrt(1 - u * u) + 0.1;
    const y = 0.26 - r() * (0.26 + top);
    p.push([u * 0.9, y, (0.3 + r() * 0.24) * (1 - 0.3 * Math.abs(u)), r()]);
  }
  // Крупные «кочаны» сверху.
  const bumps = 2 + Math.floor(r() * 3);
  for (let b = 0; b < bumps; b++) {
    const u = ((b + 0.5) / bumps) * 1.3 - 0.65 + (r() - 0.5) * 0.15;
    p.push([u * 0.85, -0.24 - r() * 0.2 * (1 - Math.abs(u)), 0.44 + r() * 0.16, r()]);
  }
  // Плотное ядро — на нём логотип.
  for (let k = 0; k < 9; k++) p.push([(r() - 0.5) * 0.6, (r() - 0.5) * 0.4 - 0.05, 0.46, r()]);
  // Снизу вверх: верхние клубы рисуются поверх.
  return p.sort((a, b) => b[1] - a[1]);
}

// ── рендерер ─────────────────────────────────────────────────
export class CloudRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    const gl = canvas.getContext("webgl2", { premultipliedAlpha: true, antialias: false, alpha: true });
    if (!gl) throw new Error("WebGL2 недоступен");
    this.gl = gl;

    const sh = (type, src) => {
      const s = gl.createShader(type);
      gl.shaderSource(s, src); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
      return s;
    };
    const prog = (this.prog = gl.createProgram());
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
    gl.useProgram(prog);

    this.u = {};
    for (const n of ["uC", "uL", "uView", "uDpr", "uNoise", "uAtlas", "uCells", "uCanvasH", "uTime"])
      this.u[n] = gl.getUniformLocation(prog, n);

    // шум
    const { data, size } = noiseCanvas();
    const nt = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, nt);
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.R8, size, size, 0, gl.RED, gl.UNSIGNED_BYTE, data);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
    gl.uniform1i(this.u.uNoise, 0);

    // атлас (пока пустой)
    this.atlasTex = gl.createTexture();
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.atlasTex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(4));
    gl.uniform1i(this.u.uAtlas, 1);

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

    this.cArr = new Float32Array(MAXC * 4);
    this.lArr = new Float32Array(MAXC * 4);
    this.count = 0;
    this.resize();
  }

  // shapes: массив облаков, у каждого массив клубов [x, y, size, seed]
  setShapes(shapes) {
    if (shapes.length > MAXC) throw new Error(`Слишком много облаков: ${shapes.length} > ${MAXC}`);
    const gl = this.gl;
    const puffs = [], ids = [];
    shapes.forEach((s, i) => s.forEach((p) => { puffs.push(...p); ids.push(i); }));
    this.count = ids.length;
    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    const b1 = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, b1);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(puffs), gl.STATIC_DRAW);
    const a1 = gl.getAttribLocation(this.prog, "aPuff");
    gl.enableVertexAttribArray(a1);
    gl.vertexAttribPointer(a1, 4, gl.FLOAT, false, 0, 0);
    const b2 = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, b2);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(ids), gl.STATIC_DRAW);
    const a2 = gl.getAttribLocation(this.prog, "aCloud");
    gl.enableVertexAttribArray(a2);
    gl.vertexAttribPointer(a2, 1, gl.FLOAT, false, 0, 0);
  }

  setAtlas(canvas, cells) {
    const gl = this.gl;
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.atlasTex);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvas);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.uniform1f(this.u.uCells, cells);
  }

  resize() {
    const gl = this.gl;
    this.dpr = Math.min(devicePixelRatio || 1, 1.5);
    this.w = innerWidth; this.h = innerHeight;
    this.canvas.width = Math.round(this.w * this.dpr);
    this.canvas.height = Math.round(this.h * this.dpr);
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.uniform2f(this.u.uView, this.w, this.h);
    gl.uniform1f(this.u.uDpr, this.dpr);
    gl.uniform1f(this.u.uCanvasH, this.canvas.height);
  }

  // states[i] = { x, y, r, t, cx, cy, logo, alpha }
  draw(states, time) {
    const gl = this.gl, C = this.cArr, L = this.lArr;
    states.forEach((s, i) => {
      C[i * 4] = s.x; C[i * 4 + 1] = s.y; C[i * 4 + 2] = s.r; C[i * 4 + 3] = s.t;
      L[i * 4] = s.cx; L[i * 4 + 1] = s.cy; L[i * 4 + 2] = s.logo; L[i * 4 + 3] = s.alpha;
    });
    gl.uniform4fv(this.u.uC, C);
    gl.uniform4fv(this.u.uL, L);
    gl.uniform1f(this.u.uTime, time);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.POINTS, 0, this.count);
  }
}

// ── атлас логотипов ──────────────────────────────────────────
// entries: [{ key, icons: [src...] , letter }] — 1 иконка или 2×2 мозаика.
export async function buildAtlas(entries, cell = 128) {
  const cells = Math.ceil(Math.sqrt(entries.length));
  const pow = 2 ** Math.ceil(Math.log2(cells * cell));
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = pow;
  const n = pow / cell;
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingQuality = "high";

  const load = (src) => new Promise((res) => {
    const img = new Image();
    if (!src.startsWith("assets/")) img.crossOrigin = "anonymous";
    img.onload = () => res(img);
    img.onerror = () => res(null);
    img.src = src;
    setTimeout(() => res(null), 4000);
  });

  const letter = (ch, x, y, s) => {
    ctx.fillStyle = "#2a3f7a";
    ctx.beginPath();
    ctx.roundRect(x, y, s, s, s * 0.22);
    ctx.fill();
    ctx.fillStyle = "#f5d547";
    ctx.font = `700 ${s * 0.62}px Manrope, system-ui, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(ch.toUpperCase(), x + s / 2, y + s / 2 + s * 0.04);
  };

  const map = new Map();
  await Promise.all(entries.map(async (e, i) => {
    const cx = i % n, cy = Math.floor(i / n);
    const x0 = cx * cell, y0 = cy * cell;
    map.set(e.key, [cx, cy]);
    if (e.icons.length === 1) {
      const img = await load(e.icons[0]);
      if (img) ctx.drawImage(img, x0, y0, cell, cell);
      else letter(e.letter, x0 + 8, y0 + 8, cell - 16);
    } else {
      const imgs = await Promise.all(e.icons.slice(0, 4).map(load));
      const s = cell / 2 - 6;
      imgs.forEach((img, k) => {
        const x = x0 + (k % 2) * (cell / 2) + 3, y = y0 + Math.floor(k / 2) * (cell / 2) + 3;
        if (img) ctx.drawImage(img, x, y, s, s);
        else letter(e.letters[k] || "?", x, y, s);
      });
    }
  }));
  return { canvas, cells: n, map };
}
