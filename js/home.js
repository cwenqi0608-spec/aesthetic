/* 首页 · 瀑布：flowing falls, drifting mist, caustics, ripples, and three stone turtles. No text on screen. */
import { Ripple, compile, quad, VERTEX, trackPointer } from './ripple.js?v=dev';

/* Geometry in painting pixels (assets/art/home-falls.jpg is 1280×720). */
const ART = {
  w: 1280, h: 720,
  focus: { wide: [180, 20, 1200, 700], tall: [330, 20, 672, 700] },
  // hidden light spots, each beside a stone: x, y, heading (deg)
  spots: {
    wide: [[300, 614, -16], [478, 552, 12], [935, 512, 28]],
    tall: [[398, 550, -14], [488, 642, 10], [612, 530, 24]],
  },
  base: { x0: 405, x1: 560, y: 426 },            // where the falls strike the pool
  drips: [[392, 46], [521, 66], [549, 176], [566, 300]],
};
const HREF = ['books.html', 'quotes.html', 'palettes.html'];
const NAMES = ['书单', '书摘', '色库'];

const $ = (s) => document.querySelector(s);
const scene = $('.scene');
const img = $('.scene-art img');
const glCanvas = $('#water');
const fx = $('#drops');
const ctx = fx.getContext('2d');
const links = [...document.querySelectorAll('.spot')];
const reduceMQ = matchMedia('(prefers-reduced-motion: reduce)');
let reduced = reduceMQ.matches;
const touchFirst = matchMedia('(hover: none)').matches;
const CAPTURE = /[?&]capture\b/.test(location.search);
const rand = (a, b) => a + Math.random() * (b - a);

let W = 0, H = 0, DPR = 1, kind = 'wide', S = 1, OX = 0, OY = 0, TW = 64; // TW: turtle width in painting px
const toScreen = (x, y) => [OX + x * S, OY + y * S];
const spots = () => ART.spots[kind];

/* ---------- layout ---------- */
function layout() {
  W = innerWidth; H = innerHeight;
  DPR = Math.min(devicePixelRatio || 1, W * H > 1.6e6 ? 1.25 : 1.6);
  kind = W / H < 1 ? 'tall' : 'wide';
  S = Math.max(W / ART.w, H / ART.h);
  const [f0, g0, f1, g1] = ART.focus[kind];
  OX = Math.min(0, Math.max(W - ART.w * S, W / 2 - (f0 + f1) / 2 * S));
  OY = Math.min(0, Math.max(H - ART.h * S, H / 2 - (g0 + g1) / 2 * S));
  img.style.objectPosition = `${OX}px ${OY}px`;
  for (const c of [glCanvas, fx]) { c.width = Math.round(W * DPR); c.height = Math.round(H * DPR); }
  const tCss = W < 700 ? 78 : Math.max(72, Math.min(92, W * 0.056));
  TW = tCss / S;
  spots().forEach(([x, y], i) => {
    const [sx, sy] = toScreen(x, y), a = links[i];
    a.style.left = `${sx - tCss * 0.8}px`; a.style.top = `${sy - tCss * 0.6}px`;
    a.style.width = `${tCss * 1.6}px`; a.style.height = `${tCss * 1.2}px`;
  });
  if (ripple) ripple.resize(W, H);
  kick();
}

/* ---------- physics (scene scale: 1 painting px ≈ 3 cm ⇒ g ≈ 330 px/s²) ---------- */
const G = 9.81 / 0.03;
let now = 0;
let spray = [], streaks = [], drips = [];
const dripSrc = ART.drips.map(([x, y]) => ({ x, y, t: rand(0, 3), grow: rand(2.5, 6) }));

function step(dt) {
  const b = ART.base;
  // spray thrown up where the falls strike the pool: ballistic arcs
  const nSpray = Math.random() < dt * 26 ? 1 + (Math.random() < 0.3) : 0;
  for (let i = 0; i < nSpray; i++) {
    const x = rand(b.x0, b.x1), a = rand(-1, 1);
    spray.push({ x, y: b.y - rand(4, 16), vx: a * rand(20, 70), vy: -rand(90, 210), r: rand(0.5, 1.3), life: 0 });
  }
  for (let i = spray.length - 1; i >= 0; i--) {
    const p = spray[i]; p.vy += G * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.life += dt;
    if (p.vy > 0 && p.y > b.y + 6) { spray.splice(i, 1); if (ripple && Math.random() < 0.25) splatImg(p.x, b.y + 8, 3, 0.15); }
  }
  // fast pale streaks riding the falling sheet
  if (Math.random() < dt * 9) streaks.push({ x: rand(392, 548), y: rand(30, 120), v: rand(140, 220), len: rand(18, 46) });
  for (let i = streaks.length - 1; i >= 0; i--) { const s = streaks[i]; s.v += G * 0.6 * dt; s.y += s.v * dt; if (s.y > 395) streaks.splice(i, 1); }
  // occasional drips from the cliff lip: swell, detach, fall with g
  for (const d of dripSrc) {
    d.t += dt;
    if (d.t > d.grow) { drips.push({ x: d.x, y: d.y + 2, vy: 0 }); d.t = 0; d.grow = rand(2.5, 7); }
  }
  for (let i = drips.length - 1; i >= 0; i--) { const d = drips[i]; d.vy += G * dt; d.y += d.vy * dt; if (d.y > b.y - 30) drips.splice(i, 1); }
  // rings where the water lands
  if (ripple && Math.random() < dt * 7) splatImg(rand(b.x0 + 10, b.x1 - 10), b.y + rand(0, 10), rand(5, 9), rand(0.25, 0.5));
}
function splatImg(x, y, r, s) { const [sx, sy] = toScreen(x, y); ripple.splat(sx / W, sy / H, r, s); }

function drawOverlay() {
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0); ctx.clearRect(0, 0, W, H);
  if (reduced) return;
  ctx.lineCap = 'round';
  for (const s of streaks) {
    const [x, y] = toScreen(s.x, s.y), L = s.len * S;
    const g = ctx.createLinearGradient(x, y - L, x, y);
    g.addColorStop(0, 'rgba(250,250,247,0)'); g.addColorStop(1, 'rgba(250,250,247,.45)');
    ctx.strokeStyle = g; ctx.lineWidth = Math.max(0.8, 1.1 * S); ctx.beginPath(); ctx.moveTo(x, y - L); ctx.lineTo(x, y); ctx.stroke();
  }
  for (const p of spray) {
    const [x, y] = toScreen(p.x, p.y), a = Math.min(1, p.life * 4) * 0.7;
    ctx.fillStyle = `rgba(248,248,244,${a})`; ctx.beginPath(); ctx.arc(x, y, Math.max(0.6, p.r * S), 0, 7); ctx.fill();
  }
  for (const d of drips) {
    const [x, y] = toScreen(d.x, d.y), r = 1.3 * S, st = 1 + Math.min(1.4, d.vy / 260);
    ctx.fillStyle = 'rgba(236,238,233,.85)'; ctx.strokeStyle = 'rgba(60,62,58,.55)'; ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.ellipse(x, y, r / Math.sqrt(st), r * st, 0, 0, 7); ctx.fill(); ctx.stroke();
  }
  for (const d of dripSrc) {   // swelling pendant drop at each drip source
    const k = d.t / d.grow; if (k < 0.15) continue;
    const [x, y] = toScreen(d.x, d.y), r = 1.3 * S * Math.cbrt(k);
    ctx.fillStyle = 'rgba(236,238,233,.8)'; ctx.strokeStyle = 'rgba(60,62,58,.45)'; ctx.lineWidth = 0.7;
    ctx.beginPath(); ctx.ellipse(x, y + r * (0.6 + k * 0.6), r, r * (1 + k * 0.3), 0, 0, 7); ctx.fill(); ctx.stroke();
  }
}

/* ---------- turtles: atlas with carved seal-script names ---------- */
const CELL_W = 384, CELL_H = 576;
let TA = 310 / 512, glyphs = null;
async function buildAtlas() {
  const [im, data] = await Promise.all([
    new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = 'assets/img/turtle.png?v=dev'; }),
    fetch('js/seal-glyphs.json?v=dev').then((r) => r.json()),
  ]);
  glyphs = data.glyphs; const m = data.turtle; TA = im.width / im.height;
  const c = document.createElement('canvas'); c.width = CELL_W * 3; c.height = CELL_H;
  const g = c.getContext('2d');
  const px = (CELL_W - im.width) / 2, py = (CELL_H - im.height) / 2;
  NAMES.forEach((name, i) => {
    const ox = i * CELL_W + px, oy = py;
    g.drawImage(im, ox, oy);
    const chars = [...name], cs = 100;                       // char box in atlas px, stacked vertically
    chars.forEach((ch, k) => {
      const gl = glyphs[ch]; const [x0, y0, x1, y1] = gl.bounds;
      const s = cs / Math.max(x1 - x0, y1 - y0);
      const cx = ox + m.shellX, cy = oy + m.shellY + (k - (chars.length - 1) / 2) * (cs + 6);
      const path = new Path2D(gl.d);
      const draw = (dx, dy, style, lw) => {
        g.save(); g.translate(cx + dx, cy + dy); g.scale(s, -s); g.translate(-(x0 + x1) / 2, -(y0 + y1) / 2);
        g.fillStyle = style; g.strokeStyle = style; g.lineWidth = lw / s; g.lineJoin = 'round'; g.lineCap = 'round';
        g.fill(path); g.stroke(path); g.restore();
      };
      draw(2.2, 2.6, 'rgba(240,238,230,.85)', 7);           // light lower bevel
      draw(0, 0, 'rgba(28,28,26,.95)', 7);                  // recessed stroke
      draw(-1, -1.2, 'rgba(6,6,5,.6)', 2.6);             // deeper inner shadow
    });
  });
  return c;
}

/* ---------- shader ---------- */
const FRAG = `#version 300 es
precision highp float;
in vec2 vUv; out vec4 o;
uniform sampler2D uImg, uMask, uSim, uTur;
uniform vec2 uRes, uImgSize, uSimTexel;
uniform vec4 uView;            // ox, oy (device px), scale, sim on
uniform float uTime;
uniform vec4 uSpot[3];         // x, y, glow boost, -
uniform vec4 uTurt[3];         // x, y, width (painting px), heading (rad)
uniform float uEm[3];
uniform float uTA;             // turtle aspect w/h
uniform vec2 uCell;            // turtle size / cell size
uniform vec3 uPaper;

float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
vec2 hash2(vec2 p){ return fract(sin(vec2(dot(p,vec2(127.1,311.7)), dot(p,vec2(269.5,183.3))))*43758.5453); }
float noise(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f);
  return mix(mix(hash(i),hash(i+vec2(1,0)),f.x), mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x), f.y); }
float fbm(vec2 p){ float a=.5, s=0.; for(int i=0;i<4;i++){ s+=a*noise(p); p=p*2.02+vec2(1.7,9.2); a*=.5; } return s; }
// cellular caustic: bright where two nearest cell centres are equidistant
float caustic(vec2 p, float t){
  vec2 i = floor(p), f = fract(p); float d1 = 8., d2 = 8.;
  for(int y=-1;y<=1;y++) for(int x=-1;x<=1;x++){
    vec2 g = vec2(x,y); vec2 h = hash2(i+g); vec2 c = g + .5 + .42*sin(t*.9 + 6.2831*h) - f;
    float d = dot(c,c); if(d<d1){ d2=d1; d1=d; } else if(d<d2) d2=d;
  }
  return 1. - smoothstep(0., .22, sqrt(d2) - sqrt(d1));
}
vec3 img(vec2 ip){ return texture(uImg, ip / uImgSize).rgb; }

void main(){
  vec2 frag = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y);
  vec2 ip = (frag - uView.xy) / uView.z;
  vec3 m = texture(uMask, ip / uImgSize).rgb;
  float t = uTime;

  // --- water surface: heightfield ripples (jquery.ripples style: refraction + specular) ---
  vec2 g = vec2(0.);
  if(uView.w > .5){
    float hl = texture(uSim, vUv - vec2(uSimTexel.x,0.)).r, hr = texture(uSim, vUv + vec2(uSimTexel.x,0.)).r;
    float hd = texture(uSim, vUv - vec2(0.,uSimTexel.y)).r, hu = texture(uSim, vUv + vec2(0.,uSimTexel.y)).r;
    g = vec2(hr - hl, hd - hu);
  }
  float ws = mix(.28, 1., m.g);
  vec2 off = g * 6. * ws / uView.z * 2.;
  vec3 col = img(ip + off);

  // --- 瀑布: two-phase flow sampling (no seam), accelerating downward ---
  if(m.r > .01){
    float y01 = clamp((ip.y - 20.) / 380., 0., 1.);
    // phase advances uniformly (no shear over time); the travel length grows downward, so the water accelerates
    float L = 34. + 50. * y01;
    float ph = t * 2.3 + noise(vec2(ip.x * .07, 3.)) * 1.7;
    float p0 = fract(ph), p1 = fract(ph + .5);
    float lip = smoothstep(20., 90., ip.y);
    float jx = (noise(vec2(ip.x * .05, ip.y * .012 - t * 1.4)) - .5) * 3.5 * lip;
    vec3 a = img(ip + off + vec2(jx, -p0 * L * lip));
    vec3 b = img(ip + off + vec2(-jx, -p1 * L * lip));
    float w0 = 1. - abs(2. * p0 - 1.);
    vec3 fc = a * w0 + b * (1. - w0);
    float st = fbm(vec2(ip.x * .42, (ip.y - 60. * y01 * y01) * .011 - t * 2.2));
    fc += smoothstep(.6, .86, st) * .16 - smoothstep(.34, .16, st) * .05;
    col = mix(col, fc, m.r);
  }

  // --- 水底光斑: caustics under the pool, wobbling with the ripples ---
  if(m.g > .01){
    vec2 cp = vec2(ip.x * .030, ip.y * .072) + g * 2.2 + vec2(fbm(ip * .01 + t * .05), 0.) * .8;
    float c = caustic(cp, t) * .6 + caustic(cp * 1.63 + 7.3, t * 1.3) * .4;
    float glow = 0.;
    for(int i=0;i<3;i++){
      vec2 d = (ip - uSpot[i].xy) / vec2(46., 22.);
      float k = exp(-dot(d,d));
      glow += k * (.55 + .2 * sin(t * 1.4 + float(i) * 2.1) + uSpot[i].z);
    }
    float caus = c * (.07 + glow * .35);
    col += vec3(.90, .96, .94) * caus * m.g;
    col += vec3(.86, .93, .91) * glow * .07 * m.g;
  }

  // --- 石龟 rising from beneath the water ---
  for(int i=0;i<3;i++){
    float e = uEm[i];
    if(e < .003) continue;
    vec4 T = uTurt[i];
    vec2 p = ip - T.xy; p.y -= (1. - e) * 9.;           // drifts up as it surfaces
    p.y /= .62;                                         // laid on the water plane
    float cs = cos(-T.w), sn = sin(-T.w); p = vec2(cs*p.x - sn*p.y, sn*p.x + cs*p.y);
    float wdt = T.z * (.88 + .12 * e);
    vec2 tuv = vec2(p.x / wdt, p.y / (wdt / uTA)) + .5;
    float sub = 1. - e;
    tuv += (vec2(noise(tuv * 6. + t), noise(tuv * 6. - t + 4.)) - .5) * .07 * sub + g * .12 * sub;
    vec2 cuv = (tuv - .5) * uCell + .5;
    if(cuv.x < 0. || cuv.x > 1. || cuv.y < 0. || cuv.y > 1.) continue;
    vec2 auv = vec2((cuv.x + float(i)) / 3., cuv.y);
    float lod = pow(sub, 1.4) * 5.;
    // soft shadow on the water
    vec4 sh = texture(uTur, vec2((clamp(cuv.x - .02, 0., 1.) + float(i)) / 3., clamp(cuv.y - .03, 0., 1.)), 4.);
    col *= 1. - sh.a * .22 * e * e;
    vec4 s = texture(uTur, auv, lod);
    vec3 tc = mix(s.rgb * vec3(.80, .82, .80), vec3(.70, .76, .73) * col, sub * .7);
    tc += g.y * .5 * e;                                  // wet sheen follows the ripples
    col = mix(col, tc, s.a * smoothstep(0., .55, e) * mix(.45, 1., e));
  }

  // specular glints on ripples
  vec3 n = normalize(vec3(-g * 2.2, 1.));
  float spec = pow(max(0., dot(n, normalize(vec3(-.6, .9, 1.2)))), 60.);
  col += spec * .22 * ws * step(.001, length(g));

  // --- 水雾: drifting fog at the base of the falls and across the pool ---
  if(m.b > .01 || m.g > .01){
    vec2 mp = ip * .0055;
    float f1 = fbm(mp * vec2(1., 1.7) + vec2(t * .021, -t * .034));
    float f2 = fbm(mp * 2.4 - vec2(t * .03, t * .015) + f1);
    float fog = m.b * smoothstep(.32, .82, f1 * .6 + f2 * .55) * .62 + m.g * .10 * smoothstep(.45, .85, f2);
    col = mix(col, uPaper, clamp(fog, 0., .85));
  }
  o = vec4(col, 1.);
}`;

let gl = null, prog, texImg, texMask, texTur, ripple = null, texKindReady = false, atlasReady = false;
function mkTex(src, mip) {
  const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src);
  if (mip) gl.generateMipmap(gl.TEXTURE_2D);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, mip ? gl.LINEAR_MIPMAP_LINEAR : gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  return t;
}
function initGL() {
  try {
    gl = glCanvas.getContext('webgl2', { antialias: false, alpha: false, powerPreference: 'high-performance' });
    if (!gl) throw new Error('no webgl2');
    quad(gl); prog = compile(gl, VERTEX, FRAG);
    ripple = new Ripple(gl); if (!ripple.ok) ripple = null;
    const mask = new Image(); mask.onload = () => { texMask = mkTex(mask, false); kick(); }; mask.src = 'assets/img/falls-mask.png?v=dev';
    buildAtlas().then((c) => { texTur = mkTex(c, true); atlasReady = true; kick(); }).catch((e) => console.warn(e));
    return true;
  } catch (e) { console.warn('WebGL off', e); gl = null; glCanvas.remove(); return false; }
}
function uploadImage() { if (!gl || !img.complete || !img.naturalWidth) return; if (texImg) gl.deleteTexture(texImg); texImg = mkTex(img, true); texKindReady = true; }

/* turtles: emergence state */
const em = [0, 0, 0], target = [0, 0, 0], boost = [0, 0, 0], surfaced = [false, false, false];
let hovered = -1, revealed = -1;
const turtleArr = new Float32Array(12), spotArr = new Float32Array(12);
function updateTurtles(dt) {
  for (let i = 0; i < 3; i++) {
    const want = target[i];
    if (reduced) em[i] = want;
    else em[i] += (want - em[i]) * Math.min(1, dt * (want > em[i] ? 1.25 : 1.6));
    boost[i] += ((i === hovered ? .6 : 0) - boost[i]) * Math.min(1, dt * 3);
    if (!surfaced[i] && em[i] > .35 && want > 0) { surfaced[i] = true; if (ripple) { const [x, y] = spots()[i]; splatImg(x, y, 14, 1.4); } }
    if (surfaced[i] && em[i] < .2) surfaced[i] = false;
    if (ripple && em[i] > .7 && !reduced && Math.random() < dt * .9) { const [x, y] = spots()[i]; splatImg(x + rand(-TW * .4, TW * .4), y + rand(-6, 6), 6, .35); } // paddling
  }
}
function drawGL() {
  if (!gl || !texImg || !texMask) return;
  if (ripple) ripple.update(dtLast);
  gl.useProgram(prog.p); gl.viewport(0, 0, glCanvas.width, glCanvas.height);
  const u = prog.u;
  const bind = (unit, tex, name) => { gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, tex); gl.uniform1i(u[name], unit); };
  bind(0, texImg, 'uImg'); bind(1, texMask, 'uMask');
  if (ripple) { bind(2, ripple.texture, 'uSim'); gl.uniform2f(u.uSimTexel, 1 / ripple.w, 1 / ripple.h); }
  if (atlasReady) bind(3, texTur, 'uTur');
  gl.uniform2f(u.uRes, glCanvas.width, glCanvas.height);
  gl.uniform2f(u.uImgSize, ART.w, ART.h);
  gl.uniform4f(u.uView, OX * DPR, OY * DPR, S * DPR, ripple ? 1 : 0);
  gl.uniform1f(u.uTime, now);
  spots().forEach(([x, y, hd], i) => {
    spotArr.set([x, y, boost[i], 0], i * 4);
    const bob = reduced ? 0 : Math.sin(now * 1.3 + i * 2) * 1.2;
    turtleArr.set([x + (reduced ? 0 : Math.sin(now * .5 + i) * 1.5), y + bob, TW, (hd + (reduced ? 0 : Math.sin(now * .8 + i) * 4)) * Math.PI / 180], i * 4);
  });
  gl.uniform4fv(u.uSpot, spotArr); gl.uniform4fv(u.uTurt, turtleArr);
  gl.uniform1fv(u.uEm, new Float32Array(atlasReady ? em : [0, 0, 0]));
  gl.uniform1f(u.uTA, TA);
  gl.uniform2f(u.uCell, (TA * 512) / CELL_W, 512 / CELL_H);
  gl.uniform3f(u.uPaper, 0.905, 0.885, 0.85);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
}

/* ---------- hover / tap ---------- */
function spotAt(x, y) {
  let best = -1, bd = 1;
  spots().forEach(([sx0, sy0], i) => {
    const [sx, sy] = toScreen(sx0, sy0), r = TW * S;
    const d = ((x - sx) / (r * .85)) ** 2 + ((y - sy) / (r * .62)) ** 2;
    if (d < bd) { bd = d; best = i; }
  });
  return best;
}
function setHover(i) {
  hovered = i;
  for (let k = 0; k < 3; k++) target[k] = k === i ? 1 : 0;
  scene.style.cursor = i >= 0 ? 'pointer' : '';
  kick();
}
function enter(i) {
  if (ripple) { const [x, y] = spots()[i]; splatImg(x, y, 26, 2.2); }
  target[i] = 1; scene.classList.add('leaving');
  setTimeout(() => (location.href = HREF[i]), reduced ? 0 : 450);
}
scene.addEventListener('pointermove', (e) => { if (e.pointerType === 'mouse') { const i = spotAt(e.clientX, e.clientY); if (i !== hovered) setHover(i); } kick(); });
scene.addEventListener('pointerleave', () => setHover(-1));
scene.addEventListener('click', (e) => {
  if (e.target.closest('.seal')) return;
  const i = spotAt(e.clientX, e.clientY);
  if (i < 0) { revealed = -1; setHover(-1); return; }
  const touchy = touchFirst || (e.pointerType && e.pointerType !== 'mouse');
  if (touchy && revealed !== i) { revealed = i; setHover(i); return; }
  enter(i);
});
links.forEach((a, i) => {
  a.addEventListener('focus', () => setHover(i));
  a.addEventListener('blur', () => setHover(-1));
  a.addEventListener('click', (e) => { e.preventDefault(); enter(i); });
});

/* ---------- loop ---------- */
let last = 0, raf = 0, dtLast = 0.016;
function tick(dt) {
  dtLast = dt;
  if (!reduced) { now += dt; step(dt); }
  updateTurtles(dt);
  drawGL(); drawOverlay();
}
function frame(t) {
  raf = 0;
  const dt = Math.min(0.05, last ? (t - last) / 1000 : 0.016); last = t;
  tick(dt);
  const settling = em.some((v, i) => Math.abs(v - target[i]) > .005);
  if (!document.hidden && (!reduced || settling)) raf = requestAnimationFrame(frame);
}
function kick() { if (CAPTURE) return; if (!raf && !document.hidden) { last = 0; raf = requestAnimationFrame(frame); } }
document.addEventListener('visibilitychange', () => { if (document.hidden) { cancelAnimationFrame(raf); raf = 0; } else kick(); });
reduceMQ.addEventListener?.('change', (e) => { reduced = e.matches; kick(); });

function init() {
  initGL();
  if (reduced) now = 7.3;          // a fixed, calm moment
  layout();
  if (ripple && !reduced) trackPointer(scene, ripple, () => ({ w: W, h: H }), { radius: 8, gap: 24, strength: 0.6 });
  const onImg = () => { uploadImage(); scene.classList.add('gl-ready'); kick(); };
  if (img.complete && img.naturalWidth) onImg();
  img.addEventListener('load', onImg);
  let rt; addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(layout, 80); });
  if (CAPTURE) window.__tick = (dt, n = 1) => { for (let i = 0; i < n; i++) tick(dt); };
  window.__dishui = { spots: () => spots().map(([x, y]) => { const [sx, sy] = toScreen(x, y); return { x: sx, y: sy }; }), ready: () => !!(texImg && texMask && atlasReady), em: () => em.slice() };
  kick();
}
init();
