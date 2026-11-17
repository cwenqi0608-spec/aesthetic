/* 首页 · 滴水：painted landscape + GPU water + gravity drips. No text on screen. */
import { Ripple, compile, quad, VERTEX, trackPointer } from './ripple.js?v=6d04da1';

/* Geometry measured on the original paintings (pixel coords of the 1280×720 / 720×1280 art). */
const LAYOUTS = {
  wide: {
    w: 1280, h: 720, focus: [250, 330, 1010, 560],
    puddles: [[359, 511, 92, 22], [624, 519, 88, 22], [899, 522, 95, 22]],
    sources: [
      { x: 377, y: 347, kind: 'stream', p: 0, land: [377, 514] },
      { x: 611, y: 196, kind: 'thread', p: 1, land: [611, 521] },
      { x: 913, y: 132, kind: 'thread', p: 2, land: [913, 524] },
    ],
  },
  tall: {
    w: 720, h: 1280, focus: [170, 700, 590, 980],
    puddles: [[260, 897, 78, 15], [500, 905, 75, 18], [372, 946, 78, 19]],
    sources: [
      { x: 250, y: 754, kind: 'stream', p: 0, land: [250, 899] },
      { x: 508, y: 330, kind: 'thread', p: 1, land: [508, 907] },
      { x: 384, y: 470, kind: 'thread', p: 2, land: [384, 948] },
    ],
  },
};
const HREF = ['books.html', 'quotes.html', 'palettes.html'];
const MAX_IMP = 8; // ring slots per puddle

const $ = (s) => document.querySelector(s);
const scene = $('.scene');
const img = $('.scene-art img');
const glCanvas = $('#water');
const fx = $('#drops');
const ctx = fx.getContext('2d');
const words = [...document.querySelectorAll('.pool-word')];
const links = [...document.querySelectorAll('.pool')];
const reduceMQ = matchMedia('(prefers-reduced-motion: reduce)');
let reduced = reduceMQ.matches;
const touchFirst = matchMedia('(hover: none)').matches;

let W = 0, H = 0, DPR = 1, L = LAYOUTS.wide, kind = 'wide';
let S = 1, OX = 0, OY = 0; // image(layout px) → css px
const rand = (a, b) => a + Math.random() * (b - a);

/* ---------- physics scale ---------- */
const M_PER_PX = 0.0025;             // one painted pixel ≈ 2.5 mm of real water
const G = 9.81 / M_PER_PX;           // ≈ 3924 px/s² in painting pixels

/* ---------- layout ---------- */
function pickKind() { return innerWidth / innerHeight < 1 ? 'tall' : 'wide'; }
function layout() {
  W = innerWidth; H = innerHeight; DPR = Math.min(devicePixelRatio || 1, 1.75);
  kind = pickKind(); L = LAYOUTS[kind];
  S = Math.max(W / L.w, H / L.h);
  const [fx0, fy0, fx1, fy1] = L.focus;
  OX = Math.min(0, Math.max(W - L.w * S, W / 2 - (fx0 + fx1) / 2 * S));
  OY = Math.min(0, Math.max(H - L.h * S, H / 2 - (fy0 + fy1) / 2 * S));
  img.style.objectPosition = `${OX}px ${OY}px`;
  for (const c of [glCanvas, fx]) { c.width = Math.round(W * DPR); c.height = Math.round(H * DPR); }
  L.puddles.forEach(([cx, cy, rx, ry], i) => {
    const x = OX + cx * S, y = OY + cy * S, w = rx * S, h = ry * S;
    const a = links[i];
    a.style.left = `${x - w}px`; a.style.top = `${y - h}px`; a.style.width = `${w * 2}px`; a.style.height = `${h * 2}px`;
    const wd = words[i];
    wd.style.left = `${x}px`; wd.style.top = `${y - h * 1.35 - 6}px`;
    wd.style.fontSize = `${Math.max(26, Math.min(66, w * 0.5))}px`;
  });
  if (ripple) ripple.resize(W, H);
  if (reduced) requestDraw();
}
const toScreen = (x, y) => [OX + x * S, OY + y * S];

/* ---------- drips ---------- */
class Source {
  constructor(def) { this.def = def; this.reset(true); }
  reset(first) {
    const thread = this.def.kind === 'thread';
    this.grow = thread ? rand(2.4, 5.2) : rand(1.5, 3.4);
    this.t = first ? rand(0, this.grow * (this.def.p === 0 ? 0.8 : 0.5)) : 0;
    this.rMax = thread ? rand(3.0, 3.9) : rand(4.4, 5.4);
    this.snap = 0;
  }
  get k() { return Math.min(1, this.t / this.grow); }
  update(dt) {
    this.t += dt; this.snap = Math.max(0, this.snap - dt);
    if (this.t >= this.grow) {
      const r = this.rMax, neck = this.neck();
      drops.push({ x: this.def.x, y: this.def.y + neck + r, vy: 0, r, src: this.def });
      this.reset(false); this.snap = 0.18;
    }
  }
  neck() { const k = this.k; return this.rMax * (0.4 + 1.3 * k * k * k); }
  get r() { const k = this.k; return this.rMax * Math.cbrt(Math.max(0.02, k)); }
}
let sources = [];
let drops = [], particles = [], jets = [];
const impacts = [[], [], []];

function addImpact(p, x, y, amp) {
  const list = impacts[p];
  list.push({ x, y, t0: now, amp });
  if (list.length > MAX_IMP) list.shift();
}

function splash(d, vImpact) {
  const p = d.src.p, [cx, cy, rx, ry] = L.puddles[p];
  const [lx, ly] = d.src.land;
  addImpact(p, lx, ly, 1);
  const e = Math.min(1.25, vImpact / 1100);
  const n = Math.round(rand(7, 11));
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + rand(-0.3, 0.3);
    const vh = rand(45, 120) * e, vz = rand(320, 560) * e;
    particles.push({ p, gx: lx, gy: ly, vx: Math.cos(a) * vh, vy: Math.sin(a) * vh, z: 1, vz, r: rand(1.1, 2.3) * (d.r / 4.5), ring: i % 4 === 0 });
  }
  jets.push({ p, x: lx, y: ly, t: 0, r: d.r * 0.75, fired: false, e });
}

function step(dt) {
  for (const s of sources) s.update(dt);
  for (let i = drops.length - 1; i >= 0; i--) {
    const d = drops[i];
    d.vy += G * dt; d.y += d.vy * dt;           // constant acceleration
    if (d.y >= d.src.land[1]) { splash(d, d.vy); drops.splice(i, 1); }
  }
  for (let i = particles.length - 1; i >= 0; i--) {
    const q = particles[i];
    q.gx += q.vx * dt; q.gy += q.vy * dt; q.vz -= G * dt; q.z += q.vz * dt;  // ballistic arc
    if (q.z <= 0) {
      const [cx, cy, rx, ry] = L.puddles[q.p];
      const yy = cy + (q.gy - cy) * ry / rx;
      if (q.ring && ((q.gx - cx) / rx) ** 2 + ((yy - cy) / ry) ** 2 < 0.8) addImpact(q.p, q.gx, yy, 0.22);
      particles.splice(i, 1);
    }
  }
  for (let i = jets.length - 1; i >= 0; i--) {
    const j = jets[i]; j.t += dt;
    if (!j.fired && j.t > 0.13) {               // Worthington jet pinches off a drop
      j.fired = true;
      particles.push({ p: j.p, gx: j.x, gy: j.y, vx: rand(-8, 8), vy: 0, z: j.r * 6 * j.e, vz: rand(260, 360) * j.e, r: j.r, ring: true, rebound: true });
    }
    if (j.t > 0.26) jets.splice(i, 1);
  }
  for (const list of impacts) while (list.length && now - list[0].t0 > 3.2) list.shift();
}

/* ---------- 2D overlay: threads, drops, splash ---------- */
function teardrop(x, y, r, tail, squeeze = 1, alpha = 1) {
  // bulb centred (x,y), radius r, tail of length `tail` pointing up
  const rw = r * squeeze;
  ctx.beginPath();
  ctx.moveTo(x, y - r - tail);
  ctx.bezierCurveTo(x + rw * 0.15, y - r - tail * 0.45, x + rw, y - r * 0.9, x + rw, y);
  ctx.arc(x, y, rw, 0, Math.PI, false);
  ctx.bezierCurveTo(x - rw, y - r * 0.9, x - rw * 0.15, y - r - tail * 0.45, x, y - r - tail);
  ctx.closePath();
  const g = ctx.createRadialGradient(x - rw * 0.3, y - r * 0.2, r * 0.1, x, y, r * 1.2);
  g.addColorStop(0, `rgba(246,246,239,${0.92 * alpha})`);
  g.addColorStop(0.7, `rgba(206,216,209,${0.78 * alpha})`);
  g.addColorStop(1, `rgba(140,154,147,${0.85 * alpha})`);
  ctx.fillStyle = g; ctx.fill();
  ctx.lineWidth = Math.max(0.9, r * 0.16);
  ctx.strokeStyle = `rgba(52,58,54,${0.72 * alpha})`; ctx.stroke();
  ctx.beginPath(); ctx.ellipse(x - rw * 0.32, y - r * 0.12, rw * 0.22, r * 0.34, -0.3, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(255,255,255,${0.85 * alpha})`; ctx.fill();
}

function drawThread(s) {
  const [x, y] = toScreen(s.def.x, s.def.y);
  const top = Math.max(-10, y - 520 * S);
  const lw = Math.max(1.2, S * 1.4);
  const edge = ctx.createLinearGradient(0, top, 0, y);
  edge.addColorStop(0, 'rgba(110,128,120,0)'); edge.addColorStop(0.55, 'rgba(110,128,120,0.10)'); edge.addColorStop(1, 'rgba(90,106,99,0.32)');
  const core = ctx.createLinearGradient(0, top, 0, y);
  core.addColorStop(0, 'rgba(250,250,246,0)'); core.addColorStop(1, 'rgba(250,250,246,0.75)');
  const path = () => { ctx.beginPath(); ctx.moveTo(x, top); for (let i = 1; i <= 30; i++) { const yy = top + (y - top) * i / 30; ctx.lineTo(x + Math.sin(i * 1.3 + s.def.p * 2 + now * 0.7) * 0.35 * S * (i / 30), yy); } };
  ctx.lineCap = 'round';
  path(); ctx.strokeStyle = edge; ctx.lineWidth = lw; ctx.stroke();
  path(); ctx.strokeStyle = core; ctx.lineWidth = lw * 0.45; ctx.stroke();
}

function drawOverlay() {
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  ctx.clearRect(0, 0, W, H);
  for (const s of sources) {
    if (s.def.kind === 'thread') drawThread(s);
    const [x, y] = toScreen(s.def.x, s.def.y);
    const r = s.r * S, neck = s.neck() * S;
    if (r > 0.6) teardrop(x, y + neck + r * 0.2, r, neck * 0.9, 1, Math.min(1, s.k * 4));
    if (s.snap > 0) { // the retracting neck bead after pinch-off
      const k = s.snap / 0.18;
      ctx.beginPath(); ctx.arc(x, y + 1.5 * S * k, 1.4 * S * k, 0, Math.PI * 2); ctx.fillStyle = 'rgba(200,212,205,.8)'; ctx.fill();
      ctx.strokeStyle = 'rgba(52,58,54,.6)'; ctx.lineWidth = 0.8; ctx.stroke();
    }
  }
  for (const d of drops) {
    const [x, y] = toScreen(d.x, d.y);
    const st = 1 + Math.min(1.5, d.vy / 700);          // stretch with velocity
    teardrop(x, y, d.r * S, d.r * S * (st - 1) * 1.5, 1 / Math.sqrt(st));
  }
  for (const j of jets) {
    const [cx, cy, rx, ry] = L.puddles[j.p];
    const [x, y] = toScreen(j.x, j.y);
    if (j.t < 0.09) {                                    // crown rim
      const k = j.t / 0.09, R = (4 + 13 * k) * S * j.e, h = Math.sin(k * Math.PI) * 7 * S * j.e;
      ctx.strokeStyle = `rgba(70,80,76,${0.55 * (1 - k)})`; ctx.lineWidth = 1;
      ctx.fillStyle = `rgba(236,240,234,${0.6 * (1 - k)})`;
      ctx.beginPath(); ctx.ellipse(x, y, R, R * ry / rx, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      for (let i = 0; i < 10; i++) {
        const a = i / 10 * Math.PI * 2, px = x + Math.cos(a) * R, py = y + Math.sin(a) * R * ry / rx;
        ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px + Math.cos(a) * 1.5 * S, py - h * (0.7 + 0.3 * Math.sin(i * 3.1))); ctx.stroke();
      }
    }
    const jt = j.t - 0.05;
    if (jt > 0 && jt < 0.2) {                            // Worthington column
      const h = Math.sin(jt / 0.2 * Math.PI) * j.r * 6 * S * j.e, w = j.r * S * 0.8;
      ctx.beginPath(); ctx.moveTo(x - w, y); ctx.quadraticCurveTo(x - w * 0.35, y - h * 0.6, x, y - h); ctx.quadraticCurveTo(x + w * 0.35, y - h * 0.6, x + w, y); ctx.closePath();
      ctx.fillStyle = 'rgba(226,233,227,.8)'; ctx.fill(); ctx.strokeStyle = 'rgba(52,58,54,.55)'; ctx.lineWidth = 0.9; ctx.stroke();
    }
  }
  for (const q of particles) {
    const [cx, cy, rx, ry] = L.puddles[q.p];
    const [x, y] = toScreen(q.gx, cy + (q.gy - cy) * ry / rx - q.z);
    const st = 1 + Math.min(1, Math.abs(q.vz) / 900);
    teardrop(x, y, q.r * S, q.vz < 0 ? q.r * S * (st - 1) * 2 : 0, 1 / Math.sqrt(st));
  }
  if (!gl) drawFallbackRings();
}

function drawFallbackRings() {
  L.puddles.forEach(([cx, cy, rx, ry], p) => {
    ctx.save(); const [x, y] = toScreen(cx, cy);
    ctx.beginPath(); ctx.ellipse(x, y, rx * S, ry * S, 0, 0, Math.PI * 2); ctx.clip();
    for (const im of impacts[p]) {
      const age = now - im.t0, r = age * 100;
      for (let k = 0; k < 3; k++) {
        const rr = r - k * 7; if (rr <= 0) continue;
        const [ix, iy] = toScreen(im.x, im.y);
        ctx.strokeStyle = `rgba(250,250,245,${0.5 * im.amp * Math.exp(-age * 1.5)})`; ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.ellipse(ix, iy, rr * S, rr * S * ry / rx, 0, 0, Math.PI * 2); ctx.stroke();
      }
    }
    ctx.restore();
  });
}

/* ---------- WebGL painting with refraction ---------- */
const FRAG = `#version 300 es
precision highp float;
in vec2 vUv; out vec4 o;
uniform sampler2D uImg, uSim;
uniform vec2 uRes;          // device px
uniform vec4 uView;         // ox, oy (device px), scale (device px per painting px), sim on/off
uniform vec2 uImgSize;      // painting px
uniform vec4 uPud[3];
uniform vec4 uImp[${3 * MAX_IMP}];
uniform float uHover[3];
uniform float uTime;
uniform vec2 uSimTexel;

float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
float noise(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f);
  return mix(mix(hash(i),hash(i+vec2(1,0)),f.x), mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x), f.y); }
float fbm(vec2 p){ float a=.5, s=0.; for(int i=0;i<5;i++){ s+=a*noise(p); p*=2.03; a*=.5; } return s; }

float rings(vec2 q, int p, vec4 P){
  float s = 0.;
  for(int k=0;k<${MAX_IMP};k++){
    vec4 im = uImp[p*${MAX_IMP}+k];
    float age = uTime - im.z;
    if(im.w <= 0. || age < 0. || age > 3.2) continue;
    vec2 c = vec2(im.x, P.y + (im.y - P.y) * P.z / P.w);
    float r = age * 95.;
    float ph = length(q - c) - r;
    float sig = 3.5 + age * 9.;
    s += im.w * exp(-ph*ph/(2.*sig*sig)) * sin(ph * .72) * exp(-age*1.3) * 2.2 / sqrt(1. + r*0.06);
  }
  return s;
}

void main(){
  vec2 frag = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y);
  vec2 ip = (frag - uView.xy) / uView.z;             // painting px
  vec2 off = vec2(0.);
  float shade = 0.;
  if(uView.w > .5){
    vec2 su = vUv;
    float hl = texture(uSim, su - vec2(uSimTexel.x,0.)).r, hr = texture(uSim, su + vec2(uSimTexel.x,0.)).r;
    float hd = texture(uSim, su - vec2(0.,uSimTexel.y)).r, hu = texture(uSim, su + vec2(0.,uSimTexel.y)).r;
    vec2 g = vec2(hr - hl, hd - hu);                 // y flipped to screen space
    off += g * 7. / uView.z * 2.;
    shade += (-g.x*.35 - g.y*.6) * .11;
  }
  vec3 ink = vec3(0.0);
  for(int p=0;p<3;p++){
    vec4 P = uPud[p];
    vec2 n = (ip - P.xy) / P.zw;
    float e = dot(n,n);
    if(e > 1.15) continue;
    float m = 1. - smoothstep(.78, 1.0, e);
    vec2 q = vec2(ip.x, P.y + (ip.y - P.y) * P.z / P.w);
    float f0 = rings(q, p, P), fx = rings(q + vec2(1.,0.), p, P), fy = rings(q + vec2(0.,1.), p, P);
    vec2 g = vec2(fx - f0, fy - f0);
    off += g * 2.4 * m;
    shade += (-g.y * 1.1 - g.x * .35) * .26 * m;
    float hv = uHover[p];
    if(hv > 0.001){
      float rad = sqrt(e);
      float cloud = fbm(q * .055 + vec2(uTime*.05, -uTime*.03) + float(p)*7.);
      float spread = smoothstep(hv * 1.25, hv * 1.25 - .55, rad + (cloud - .5) * .6);
      ink.x = max(ink.x, spread * smoothstep(.3, .7, cloud) * hv * m);
    }
  }
  vec2 uv = (ip + off) / uImgSize;
  vec3 col = texture(uImg, uv).rgb;
  col += shade * (0.55 + 0.45 * col);
  col = mix(col, vec3(.13,.14,.13), ink.x * .62);
  o = vec4(col, 1.);
}`;

let gl = null, prog, tex, ripple = null;
function initGL() {
  try {
    gl = glCanvas.getContext('webgl2', { antialias: false, alpha: false, premultipliedAlpha: false, powerPreference: 'high-performance' });
    if (!gl) throw 0;
    quad(gl);
    prog = compile(gl, VERTEX, FRAG);
    ripple = new Ripple(gl);
    if (!ripple.ok) ripple = null;
    tex = gl.createTexture();
    return true;
  } catch (e) { console.warn('WebGL off', e); gl = null; glCanvas.remove(); return false; }
}
function uploadImage() {
  if (!gl || !img.complete || !img.naturalWidth) return;
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, img);
  gl.generateMipmap(gl.TEXTURE_2D);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  texKind = /home-tall/.test(img.currentSrc) ? 'tall' : 'wide'; scene.classList.add('gl-ready');
}
let texKind = null;
const impArr = new Float32Array(3 * MAX_IMP * 4);
function drawGL() {
  if (!gl) return;
  glCanvas.style.opacity = texKind === kind ? '' : '0';
  if (texKind !== kind) return;
  if (ripple) ripple.update(dtLast);
  gl.useProgram(prog.p);
  gl.viewport(0, 0, glCanvas.width, glCanvas.height);
  const u = prog.u;
  gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, tex); gl.uniform1i(u.uImg, 0);
  if (ripple) { gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, ripple.texture); gl.uniform1i(u.uSim, 1); gl.uniform2f(u.uSimTexel, 1 / ripple.w, 1 / ripple.h); }
  gl.uniform2f(u.uRes, glCanvas.width, glCanvas.height);
  gl.uniform4f(u.uView, OX * DPR, OY * DPR, S * DPR, ripple ? 1 : 0);
  gl.uniform2f(u.uImgSize, L.w, L.h);
  gl.uniform4fv(u.uPud, new Float32Array(L.puddles.flat()));
  impArr.fill(0);
  impacts.forEach((list, p) => list.forEach((im, k) => impArr.set([im.x, im.y, im.t0, im.amp], (p * MAX_IMP + k) * 4)));
  gl.uniform4fv(u.uImp, impArr);
  gl.uniform1fv(u.uHover, new Float32Array(hoverAmt));
  gl.uniform1f(u.uTime, now);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
}

/* ---------- hover / tap ---------- */
const hoverAmt = [0, 0, 0];
let hovered = -1, revealed = -1;
function puddleAt(x, y) {
  let best = -1, bd = 1;
  L.puddles.forEach(([cx, cy, rx, ry], i) => {
    const [sx, sy] = toScreen(cx, cy);
    const ax = rx * S + 12, ay = Math.max(ry * S + 10, 22);
    const d = ((x - sx) / ax) ** 2 + ((y - sy) / ay) ** 2;
    if (d < bd) { bd = d; best = i; }
  });
  return best;
}
function setHover(i) {
  if (i === hovered) return;
  hovered = i;
  words.forEach((w, k) => w.classList.toggle('on', k === i));
  scene.style.cursor = i >= 0 ? 'pointer' : '';
  requestDraw();
}
function enter(i) {
  if (ripple) { const [x, y] = toScreen(...L.puddles[i]); ripple.splat(x / W, y / H, 30, 3); }
  scene.classList.add('leaving');
  setTimeout(() => (location.href = HREF[i]), reduced ? 0 : 420);
}
scene.addEventListener('pointermove', (e) => { if (e.pointerType === 'mouse') setHover(puddleAt(e.clientX, e.clientY)); });
scene.addEventListener('pointerleave', () => setHover(-1));
scene.addEventListener('click', (e) => {
  if (e.target.closest('.seal')) return;
  const i = puddleAt(e.clientX, e.clientY);
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
let now = 0, last = 0, raf = 0, dtLast = 0, drawPending = false;
function tick(dt) {
  dtLast = dt; now += dt;
  for (let i = 0; i < 3; i++) hoverAmt[i] += ((i === hovered ? 1 : 0) - hoverAmt[i]) * Math.min(1, dt * (i === hovered ? 1.6 : 4));
  if (!reduced) step(dt);
  drawGL(); drawOverlay();
}
const CAPTURE = /[?&]capture\b/.test(location.search);
function frame(t) {
  raf = 0;
  const dt = Math.min(0.05, last ? (t - last) / 1000 : 0.016); last = t;
  tick(dt);
  const settling = hoverAmt.some((v, i) => Math.abs(v - (i === hovered ? 1 : 0)) > 0.01);
  if (!document.hidden && (!reduced || settling)) raf = requestAnimationFrame(frame);
}
function start() { if (CAPTURE) return; if (!raf && !document.hidden) { last = 0; raf = requestAnimationFrame(frame); } }
function requestDraw() { start(); }
document.addEventListener('visibilitychange', () => { if (document.hidden) { cancelAnimationFrame(raf); raf = 0; } else start(); });
reduceMQ.addEventListener?.('change', (e) => { reduced = e.matches; start(); });

function init() {
  initGL();
  layout();
  sources = L.sources.map((d) => new Source(d));
  if (reduced) sources.forEach((s) => { s.t = s.grow * 0.85; });
  if (ripple) trackPointer(scene, ripple, () => ({ w: W, h: H }), { radius: 7, gap: 26, strength: 0.6, gain: reduced ? 0 : 1 });
  const onImg = () => { uploadImage(); start(); };
  if (img.complete && img.naturalWidth) onImg();
  img.addEventListener('load', onImg);
  let rt; addEventListener('resize', () => {
    clearTimeout(rt); rt = setTimeout(() => {
      const prev = kind; layout();
      if (prev !== kind) { sources = L.sources.map((d) => new Source(d)); drops = []; particles = []; jets = []; impacts.forEach((l) => (l.length = 0)); }
      if (img.complete && texKind !== kind && img.currentSrc.includes(kind === 'tall' ? 'tall' : 'wide')) uploadImage();
      start();
    }, 80);
  });
  start();
  if (CAPTURE) window.__tick = (dt, n = 1) => { for (let i = 0; i < n; i++) tick(dt); };
  window.__dishui = { puddles: () => L.puddles.map(([cx, cy, rx, ry]) => ({ x: OX + cx * S, y: OY + cy * S, rx: rx * S, ry: ry * S })), kind: () => kind };
}
init();
