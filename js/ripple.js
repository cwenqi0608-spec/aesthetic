/* 水面 — a heightfield wave-equation simulation on the GPU (WebGL2).
   Shared by the home painting (refraction) and the 书单 page (light overlay). */
const VERT = `#version 300 es
in vec2 aPos; out vec2 vUv;
void main(){ vUv = aPos*0.5+0.5; gl_Position = vec4(aPos,0.,1.); }`;

const SIM = `#version 300 es
precision highp float;
in vec2 vUv; out vec4 o;
uniform sampler2D uState; uniform vec2 uTexel; uniform float uDamp; uniform float uAspect;
uniform vec4 uSplat[16]; uniform int uN;
void main(){
  vec4 s = texture(uState, vUv);
  float l = texture(uState, vUv - vec2(uTexel.x,0.)).r;
  float r = texture(uState, vUv + vec2(uTexel.x,0.)).r;
  float d = texture(uState, vUv - vec2(0.,uTexel.y)).r;
  float u = texture(uState, vUv + vec2(0.,uTexel.y)).r;
  float h = ((l+r+u+d)*0.5 - s.g) * uDamp;
  for(int i=0;i<16;i++){ if(i>=uN) break;
    vec2 dd = (vUv - uSplat[i].xy) * vec2(uAspect,1.);
    h += uSplat[i].w * exp(-dot(dd,dd)/(uSplat[i].z*uSplat[i].z));
  }
  // soft edge absorption so waves don't bounce off the frame
  vec2 e = min(vUv, 1.-vUv); float edge = smoothstep(0., 0.02, min(e.x,e.y));
  o = vec4(clamp(h,-4.,4.)*mix(0.9,1.,edge), s.r, 0., 1.);
}`;

export function compile(gl, vs, fs) {
  const p = gl.createProgram();
  for (const [t, src] of [[gl.VERTEX_SHADER, vs], [gl.FRAGMENT_SHADER, fs]]) {
    const s = gl.createShader(t); gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
    gl.attachShader(p, s);
  }
  gl.bindAttribLocation(p, 0, 'aPos'); gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
  const u = {}; const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
  for (let i = 0; i < n; i++) { const a = gl.getActiveUniform(p, i); u[a.name.replace(/\[0\]$/, '')] = gl.getUniformLocation(p, a.name); }
  return { p, u };
}

export function quad(gl) {
  const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
}

export const VERTEX = VERT;

export class Ripple {
  constructor(gl) {
    this.gl = gl;
    this.ok = !!(gl.getExtension('EXT_color_buffer_float') || gl.getExtension('EXT_color_buffer_half_float'));
    gl.getExtension('OES_texture_float_linear');
    if (!this.ok) return;
    this.prog = compile(gl, VERT, SIM);
    this.splats = []; this.acc = 0; this.idle = 0;
  }
  resize(cssW, cssH) {
    const gl = this.gl; if (!this.ok) return;
    const scale = Math.min(1, 420 / Math.max(cssW, cssH)) ; // ~1 cell per 2–4 css px
    const w = Math.max(64, Math.round(cssW * scale)), h = Math.max(64, Math.round(cssH * scale));
    if (w === this.w && h === this.h) return;
    this.w = w; this.h = h; this.aspect = w / h; this.cell = cssW / w;
    this.tex = []; this.fb = [];
    for (let i = 0; i < 2; i++) {
      const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, w, h, 0, gl.RGBA, gl.HALF_FLOAT, null);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      const f = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, f);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0);
      gl.clearColor(0, 0, 0, 1); gl.clear(gl.COLOR_BUFFER_BIT);
      this.tex.push(t); this.fb.push(f);
    }
    if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) this.ok = false;
    gl.bindFramebuffer(gl.FRAMEBUFFER, null); this.cur = 0;
  }
  /* x,y in 0..1 (y down), radius in css px, strength ~ 0..1 */
  splat(x, y, radiusPx, strength) {
    if (!this.ok) return;
    if (this.splats.length >= 16) this.splats.shift();
    this.splats.push([x, 1 - y, radiusPx / (this.cell * this.h), strength]);
    this.idle = 0;
  }
  /* fixed 90Hz steps for frame-rate independence */
  update(dt) {
    if (!this.ok) return;
    this.acc = Math.min(this.acc + dt, 0.05); this.idle += dt;
    if (this.idle > 6) return; // surface is still: skip work
    const gl = this.gl, P = this.prog;
    gl.useProgram(P.p); gl.viewport(0, 0, this.w, this.h);
    gl.uniform2f(P.u.uTexel, 1 / this.w, 1 / this.h);
    gl.uniform1f(P.u.uDamp, 0.988); gl.uniform1f(P.u.uAspect, this.aspect);
    gl.activeTexture(gl.TEXTURE0); gl.uniform1i(P.u.uState, 0);
    while (this.acc >= 1 / 90) {
      this.acc -= 1 / 90;
      const n = this.splats.length; const arr = new Float32Array(64); this.splats.forEach((s, i) => arr.set(s, i * 4));
      gl.uniform4fv(P.u.uSplat, arr); gl.uniform1i(P.u.uN, n); this.splats = [];
      gl.bindTexture(gl.TEXTURE_2D, this.tex[this.cur]);
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.fb[1 - this.cur]);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      this.cur = 1 - this.cur;
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }
  get texture() { return this.tex ? this.tex[this.cur] : null; }
}

/* Pointer → splats along the path, scaled by speed. */
export function trackPointer(target, ripple, getSize, opts = {}) {
  let last = null;
  const radius = opts.radius || 11, gain = opts.gain || 1;
  let travel = 0;
  const move = (e) => {
    const { w, h, left = 0, top = 0 } = getSize();
    const x = e.clientX - left, y = e.clientY - top;
    if (last) {
      const dx = x - last.x, dy = y - last.y, d = Math.hypot(dx, dy);
      // drop discrete pulses along the path, like a fingertip skimming water
      const gap = opts.gap || 22;
      let t = gap - travel;
      while (t <= d) {
        const k = t / d;
        ripple.splat((last.x + dx * k) / w, (last.y + dy * k) / h, radius, (opts.strength || 0.55) * gain);
        t += gap;
      }
      travel = (travel + d) % gap;
    }
    last = { x, y };
  };
  target.addEventListener('pointermove', move, { passive: true });
  target.addEventListener('pointerleave', () => (last = null));
  target.addEventListener('pointerdown', (e) => {
    const { w, h, left = 0, top = 0 } = getSize();
    ripple.splat((e.clientX - left) / w, (e.clientY - top) / h, radius * 1.3, 1.1 * gain); last = { x: e.clientX - left, y: e.clientY - top };
  }, { passive: true });
}
