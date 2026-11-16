// «Звёздная ночь» × Balatro.
// Вихревое поле из шейдера Balatro (React Bits) не красит экран само,
// а сдвигает координаты, по которым читается картина, — мазки текут.
// Поверх — немного палитры Balatro в цветах Ван Гога и мерцание звёзд.

const VERT = `
attribute vec2 aPos;
varying vec2 vUv;
void main() { vUv = aPos * 0.5 + 0.5; gl_Position = vec4(aPos, 0.0, 1.0); }`;

const FRAG = `
precision highp float;
varying vec2 vUv;
uniform float uTime;
uniform vec2  uRes;
uniform vec2  uMouse;      // 0..1, y вверх
uniform float uMouseAmt;   // 0..1, присутствие курсора
uniform sampler2D uImg;
uniform float uImgAspect;
uniform float uPixel;      // 0 = гладко, иначе пиксель-фильтр Balatro
uniform float uWarp;       // сила течения картины
uniform float uTint;       // сколько палитры Balatro подмешать

const float SPIN_ROTATION = -2.0;
const float SPIN_SPEED    = 3.2;
const float CONTRAST      = 3.5;
const float LIGHTING      = 0.4;
const float SPIN_AMOUNT   = 0.25;
const float SPIN_EASE     = 1.0;

mat2 rot(float a) { float c = cos(a), s = sin(a); return mat2(c, -s, s, c); }

// Ядро Balatro: возвращает веса трёх красок + блик, и итоговое поле flow.
vec4 balatro(vec2 sc, vec2 ss, out vec2 flow) {
  vec2 uv = (sc - 0.5 * ss) / length(ss);
  float uvLen = length(uv);
  float mi = uMouse.x * 2.0 - 1.0;
  float speed = SPIN_ROTATION * SPIN_EASE * 0.2 + 302.2 + mi * 0.1;
  float ang = atan(uv.y, uv.x) + speed
            - SPIN_EASE * 20.0 * (SPIN_AMOUNT * uvLen + (1.0 - SPIN_AMOUNT));
  vec2 mid = (ss / length(ss)) / 2.0;
  uv = vec2(uvLen * cos(ang) + mid.x, uvLen * sin(ang) + mid.y) - mid;
  uv *= 30.0;
  speed = uTime * SPIN_SPEED + mi * 2.0;
  vec2 uv2 = vec2(uv.x + uv.y);
  for (int i = 0; i < 5; i++) {
    uv2 += sin(max(uv.x, uv.y)) + uv;
    uv  += 0.5 * vec2(cos(5.1123314 + 0.353 * uv2.y + speed * 0.131121), sin(uv2.x - 0.113 * speed));
    uv  -= cos(uv.x + uv.y) - sin(uv.x * 0.711 - uv.y);
  }
  flow = uv;
  float cm = 0.25 * CONTRAST + 0.5 * SPIN_AMOUNT + 1.2;
  float pr = min(2.0, max(0.0, length(uv) * 0.035 * cm));
  float c1 = max(0.0, 1.0 - cm * abs(1.0 - pr));
  float c2 = max(0.0, 1.0 - cm * abs(pr));
  float c3 = 1.0 - min(1.0, c1 + c2);
  float light = (LIGHTING - 0.2) * max(c1 * 5.0 - 4.0, 0.0) + LIGHTING * max(c2 * 5.0 - 4.0, 0.0);
  return vec4(c1, c2, c3, light);
}

vec2 cover(vec2 uv) {
  float sa = uRes.x / uRes.y;
  vec2 s = sa > uImgAspect ? vec2(1.0, uImgAspect / sa) : vec2(sa / uImgAspect, 1.0);
  return (uv - 0.5) * s * 0.92 + 0.5;   // лёгкий зум: запас под течение у краёв
}

void main() {
  vec2 uv = vUv;
  float aspect = uRes.x / uRes.y;

  if (uPixel > 0.0) {
    vec2 cells = vec2(uPixel * aspect, uPixel);
    uv = (floor(uv * cells) + 0.5) / cells;
  }

  // Курсор мягко закручивает картину вокруг себя.
  vec2 q = uv - uMouse; q.x *= aspect;
  float r = length(q);
  q = rot(uMouseAmt * 0.9 * exp(-r * r * 14.0)) * q;
  q.x /= aspect;
  vec2 uvW = uMouse + q;

  vec2 flow;
  vec4 b = balatro(uvW * uRes, uRes, flow);

  // Течение: направление поля Balatro + разница красок.
  vec2 dir = flow / (length(flow) + 6.0);
  vec2 disp = dir * uWarp + vec2(b.x - b.y, b.y - b.z) * uWarp * 0.35;
  vec3 art = texture2D(uImg, clamp(cover(uvW + disp), 0.001, 0.999)).rgb;

  // Палитра Balatro, перекрашенная в Ван Гога.
  vec3 C1 = vec3(0.13, 0.25, 0.52);   // кобальт
  vec3 C2 = vec3(0.96, 0.80, 0.30);   // хромовый жёлтый
  vec3 C3 = vec3(0.04, 0.07, 0.15);   // ночь
  vec3 bal = (0.3 / CONTRAST) * C1 + (1.0 - 0.3 / CONTRAST) * (C1 * b.x + C2 * b.y + C3 * b.z) + b.w;
  vec3 col = mix(art, art * (0.55 + bal * 1.1), uTint) + b.w * 0.12 * C2;

  // Звёзды и луна мерцают: жёлтые яркие места пульсируют.
  float star = smoothstep(0.55, 0.95, (art.r + art.g) * 0.5 - art.b * 0.35 + 0.25);
  float tw = 0.5 + 0.5 * sin(uTime * 1.6 + art.r * 18.0 + art.g * 11.0);
  col += star * tw * 0.22 * vec3(1.0, 0.9, 0.6);

  // Виньетка и лёгкое затемнение, чтобы стеклянные панели читались.
  float v = smoothstep(1.15, 0.25, length((vUv - 0.5) * vec2(aspect * 0.75, 1.0)));
  col *= mix(0.55, 0.92, v);

  gl_FragColor = vec4(col, 1.0);
}`;

export function startBackground(canvas, { src, warp = 0.035, tint = 0.32, pixel = 0 } = {}) {
  const gl = canvas.getContext("webgl", { antialias: false, alpha: false, powerPreference: "low-power" });
  if (!gl) { canvas.classList.add("fallback"); return; }

  const sh = (type, code) => {
    const s = gl.createShader(type);
    gl.shaderSource(s, code); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
    return s;
  };
  const prog = gl.createProgram();
  gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT));
  gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG));
  gl.linkProgram(prog);
  gl.useProgram(prog);

  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const aPos = gl.getAttribLocation(prog, "aPos");
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

  const U = {};
  for (const n of ["uTime", "uRes", "uMouse", "uMouseAmt", "uImg", "uImgAspect", "uPixel", "uWarp", "uTint"])
    U[n] = gl.getUniformLocation(prog, n);
  gl.uniform1f(U.uWarp, warp);
  gl.uniform1f(U.uTint, tint);
  gl.uniform1f(U.uPixel, pixel);
  gl.uniform1i(U.uImg, 0);

  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, 1, 1, 0, gl.RGB, gl.UNSIGNED_BYTE, new Uint8Array([20, 34, 70]));
  gl.uniform1f(U.uImgAspect, 1.263);

  let ready = false;
  const img = new Image();
  img.onload = () => {
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, img);
    gl.uniform1f(U.uImgAspect, img.naturalWidth / img.naturalHeight);
    ready = true;
    requestAnimationFrame(() => canvas.classList.add("ready"));
  };
  img.src = src;

  // Рендерим в пониженном разрешении: поле размытое, разницы не видно.
  const resize = () => {
    const scale = Math.min(window.devicePixelRatio || 1, 2) * 0.6;
    const w = Math.round(innerWidth * scale), h = Math.round(innerHeight * scale);
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
    gl.viewport(0, 0, w, h);
    gl.uniform2f(U.uRes, w, h);
  };
  addEventListener("resize", resize);
  resize();

  const target = { x: 0.5, y: 0.5, amt: 0 };
  const mouse = { x: 0.5, y: 0.5, amt: 0 };
  addEventListener("pointermove", (e) => {
    target.x = e.clientX / innerWidth;
    target.y = 1 - e.clientY / innerHeight;
    target.amt = 1;
  });
  document.addEventListener("pointerleave", () => (target.amt = 0));

  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const timeScale = reduced ? 0.15 : 1;
  let t = 0, last = performance.now(), raf = 0;

  const frame = (now) => {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    t += dt * timeScale;
    const k = 1 - Math.pow(0.02, dt);  // плавное догоняние курсора
    mouse.x += (target.x - mouse.x) * k;
    mouse.y += (target.y - mouse.y) * k;
    mouse.amt += (target.amt - mouse.amt) * k * 0.5;
    gl.uniform1f(U.uTime, t);
    gl.uniform2f(U.uMouse, mouse.x, mouse.y);
    gl.uniform1f(U.uMouseAmt, mouse.amt);
    if (ready) gl.drawArrays(gl.TRIANGLES, 0, 3);
    raf = requestAnimationFrame(frame);
  };
  raf = requestAnimationFrame(frame);

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) cancelAnimationFrame(raf);
    else { last = performance.now(); raf = requestAnimationFrame(frame); }
  });
}
