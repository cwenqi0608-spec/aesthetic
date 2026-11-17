/* Shared helpers for 书单 / 书摘 / 色库 */
export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];
export const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
export const finePointer = () => matchMedia('(hover: hover) and (pointer: fine)').matches;

export async function loadJSON(name) {
  const r = await fetch(`data/${name}.json`, { cache: 'no-cache' });
  if (!r.ok) throw new Error(`${name}.json ${r.status}`);
  return r.json();
}
export function esc(s = '') {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
export function h(html) { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; }

/* deterministic random for stable brush shapes */
export function rng(seed) { let s = 0; for (const c of String(seed)) s = (s * 31 + c.charCodeAt(0)) >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }

/* A filled, tapered brush stroke along a polyline. Returns an SVG path "d". */
export function brushPath(pts, { w = 6, taperIn = 0.25, taperOut = 0.45, jitter = 0.18, seed = 1, dry = 0 } = {}) {
  const r = rng(seed);
  // resample along a Catmull-Rom spline
  const P = [];
  const seg = (a, b, c, d, t) => { const t2 = t * t, t3 = t2 * t; return 0.5 * ((2 * b) + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3); };
  const n = pts.length;
  for (let i = 0; i < n - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(n - 1, i + 2)];
    const len = Math.hypot(p2[0] - p1[0], p2[1] - p1[1]), steps = Math.max(4, Math.ceil(len / 6));
    for (let k = 0; k < steps; k++) { const t = k / steps; P.push([seg(p0[0], p1[0], p2[0], p3[0], t), seg(p0[1], p1[1], p2[1], p3[1], t)]); }
  }
  P.push(pts[n - 1]);
  const L = [], R = [], m = P.length;
  let wob = 0;
  for (let i = 0; i < m; i++) {
    const a = P[Math.max(0, i - 1)], b = P[Math.min(m - 1, i + 1)];
    let dx = b[0] - a[0], dy = b[1] - a[1]; const d = Math.hypot(dx, dy) || 1; dx /= d; dy /= d;
    const t = i / (m - 1);
    wob += (r() - 0.5) * jitter; wob *= 0.85;
    let ww = w * Math.min(1, t / taperIn, (1 - t) / taperOut) ** 0.6 * (1 + wob) * (1 - dry * t * 0.6);
    ww = Math.max(0.35, ww);
    L.push([P[i][0] - dy * ww / 2, P[i][1] + dx * ww / 2]);
    R.push([P[i][0] + dy * ww / 2, P[i][1] - dx * ww / 2]);
  }
  const f = (p) => `${p[0].toFixed(1)} ${p[1].toFixed(1)}`;
  return `M${f(L[0])}` + L.slice(1).map((p) => `L${f(p)}`).join('') + R.reverse().map((p) => `L${f(p)}`).join('') + 'Z';
}

/* 圆相 ensō: an open brushed ring */
export function ensoPath(cx, cy, rx, ry, { w = 5, seed = 1, gap = 0.12 } = {}) {
  const r = rng(seed);
  const a0 = -Math.PI * 0.62 + r() * 0.5, span = Math.PI * 2 * (1 - gap);
  const pts = [];
  for (let i = 0; i <= 40; i++) {
    const a = a0 + span * i / 40, k = 1 + (r() - 0.5) * 0.035;
    pts.push([cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k]);
  }
  return brushPath(pts, { w, taperIn: 0.08, taperOut: 0.35, seed, jitter: 0.25 });
}

/* SVG <defs> with ink filters, injected once per page */
export function inkDefs() {
  if ($('#ink-defs')) return;
  document.body.insertAdjacentHTML('afterbegin', `<svg id="ink-defs" width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false"><defs>
  <filter id="ink-rough" x="-10%" y="-10%" width="120%" height="120%"><feTurbulence type="fractalNoise" baseFrequency=".85" numOctaves="2" seed="3" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="2.6" xChannelSelector="R" yChannelSelector="G"/></filter>
  <filter id="ink-bleed" x="-20%" y="-20%" width="140%" height="140%"><feTurbulence type="fractalNoise" baseFrequency=".06" numOctaves="3" seed="8" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="7" xChannelSelector="R" yChannelSelector="G" result="d"/><feGaussianBlur in="d" stdDeviation="2.2"/></filter>
  <symbol id="boat" viewBox="0 0 120 54">
    <path d="M4 34 C 22 47, 92 49, 116 31 C 104 33, 92 34, 80 34 L 30 35 C 20 35, 11 35, 4 34 Z" fill="currentColor" filter="url(#ink-rough)"/>
    <path d="M30 34 C 33 19, 44 12, 58 12 C 72 12, 82 19, 85 33 Z" fill="currentColor" opacity=".42" filter="url(#ink-rough)"/>
    <path d="M33 33 C 37 22, 46 16, 58 16 C 70 16, 78 22, 81 32" fill="none" stroke="currentColor" stroke-width="1.6" opacity=".75" filter="url(#ink-rough)"/>
    <path d="M100 30 L 112 5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" filter="url(#ink-rough)"/>
    <path d="M0 44 C 14 41, 22 47, 36 44 M70 47 C 82 44, 92 49, 108 45" fill="none" stroke="currentColor" stroke-width="1" opacity=".35"/>
  </symbol>
  </defs></svg>`);
}

/* Ripple light overlay for 书单 — water shimmer following the cursor across the page */
export async function rippleOverlay() {
  if (reduced()) return null;
  const { Ripple, compile, quad, VERTEX, trackPointer } = await import('./ripple.js?v=6d04da1');
  const c = document.createElement('canvas'); c.className = 'ripple-layer'; c.setAttribute('aria-hidden', 'true');
  document.body.appendChild(c);
  const gl = c.getContext('webgl2', { premultipliedAlpha: true, alpha: true, antialias: false });
  if (!gl) { c.remove(); return null; }
  const sim = new Ripple(gl); if (!sim.ok) { c.remove(); return null; }
  quad(gl);
  const prog = compile(gl, VERTEX, `#version 300 es
  precision highp float; in vec2 vUv; out vec4 o; uniform sampler2D uSim; uniform vec2 uT;
  void main(){
    float l=texture(uSim,vUv-vec2(uT.x,0.)).r, r=texture(uSim,vUv+vec2(uT.x,0.)).r, d=texture(uSim,vUv-vec2(0.,uT.y)).r, u=texture(uSim,vUv+vec2(0.,uT.y)).r;
    float s = (r-l)*-.5 + (u-d)*.8;
    float hi = clamp(s*1.6,0.,1.), lo = clamp(-s*1.6,0.,1.);
    vec4 light = vec4(vec3(1.,1.,.98)*hi*.55, hi*.55);
    vec4 dark = vec4(vec3(.16,.2,.18)*lo*.22, lo*.22);
    o = light + dark*(1.-light.a);
  }`);
  const DPR = Math.min(devicePixelRatio || 1, 1.5);
  const size = () => { c.width = innerWidth * DPR; c.height = innerHeight * DPR; sim.resize(innerWidth, innerHeight); };
  size(); addEventListener('resize', size);
  trackPointer(window, sim, () => ({ w: innerWidth, h: innerHeight }), { radius: 13, gain: 0.9 });
  let last = 0, raf = 0;
  const frame = (t) => {
    raf = 0; const dt = Math.min(0.05, last ? (t - last) / 1000 : 0.016); last = t;
    sim.update(dt);
    gl.useProgram(prog.p); gl.viewport(0, 0, c.width, c.height);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, sim.texture); gl.uniform1i(prog.u.uSim, 0); gl.uniform2f(prog.u.uT, 1 / sim.w, 1 / sim.h);
    gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
    gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    if (!document.hidden && sim.idle < 6) raf = requestAnimationFrame(frame);
  };
  const wake = () => { if (!raf && !document.hidden) { last = 0; raf = requestAnimationFrame(frame); } };
  addEventListener('pointermove', wake, { passive: true }); addEventListener('pointerdown', wake, { passive: true });
  document.addEventListener('visibilitychange', wake);
  wake();
  return sim;
}

/* Faint fading ink trail behind the brush cursor (书摘) */
export function inkTrail() {
  if (!finePointer() || reduced()) return;
  const c = document.createElement('canvas'); c.className = 'ink-trail'; c.setAttribute('aria-hidden', 'true'); document.body.appendChild(c);
  const ctx = c.getContext('2d'); const DPR = Math.min(devicePixelRatio || 1, 2);
  const size = () => { c.width = innerWidth * DPR; c.height = innerHeight * DPR; ctx.setTransform(DPR, 0, 0, DPR, 0, 0); };
  size(); addEventListener('resize', size);
  let last = null, raf = 0, active = 0, w = 2.4;
  addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse') return;
    const p = { x: e.clientX, y: e.clientY, t: performance.now() };
    if (last) {
      const d = Math.hypot(p.x - last.x, p.y - last.y), v = d / Math.max(1, p.t - last.t);
      if (d > 140) { last = p; return; }
      const target = Math.max(0.7, 3.4 - v * 1.6); w += (target - w) * 0.35;  // slow = wetter, thicker
      ctx.strokeStyle = `rgba(30,32,28,${Math.max(0.05, 0.16 - v * 0.03)})`; ctx.lineCap = 'round'; ctx.lineWidth = w;
      ctx.beginPath(); ctx.moveTo(last.x, last.y); ctx.lineTo(p.x, p.y); ctx.stroke();
      if (Math.random() < 0.08 && v < 0.6) { ctx.fillStyle = 'rgba(30,32,28,.06)'; ctx.beginPath(); ctx.arc(p.x + (Math.random() - .5) * 4, p.y + (Math.random() - .5) * 4, w * 1.6, 0, 7); ctx.fill(); }
    }
    last = p; active = 90; if (!raf) raf = requestAnimationFrame(fade);
  }, { passive: true });
  addEventListener('pointerleave', () => (last = null));
  document.addEventListener('mouseleave', () => (last = null));
  function fade() {
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalCompositeOperation = 'destination-out'; ctx.fillStyle = 'rgba(0,0,0,.045)'; ctx.fillRect(0, 0, c.width, c.height); ctx.restore();
    raf = --active > 0 ? requestAnimationFrame(fade) : (ctx.clearRect(0, 0, innerWidth, innerHeight), 0);
  }
}

export function toast(msg) {
  let t = $('.toast'); if (!t) { t = h('<div class="toast" role="status" aria-live="polite"></div>'); document.body.appendChild(t); }
  t.textContent = msg; t.classList.remove('show'); void t.offsetWidth; t.classList.add('show');
  clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove('show'), 1800);
}

export function fmtDate(s) { if (!s) return ''; const [y, m, d] = s.split('-'); return `${y} 年 ${+m} 月 ${+d} 日`; }
