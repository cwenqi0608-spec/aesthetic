"use strict";
(() => {
  const canvas = document.querySelector("#ink-scene"),
    ctx = canvas.getContext("2d");
  const still = document.createElement("canvas"),
    art = still.getContext("2d");
  const links = [...document.querySelectorAll(".puddle-link")];
  const motion = matchMedia("(prefers-reduced-motion: reduce)"),
    coarse = matchMedia("(pointer: coarse)");
  let w,
    h,
    dpr,
    pools = [],
    drops = [],
    sprays = [],
    rings = [],
    raf = 0,
    last = 0,
    pointerTime = 0;
  let seed = 13;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  function wash(x, y, rx, ry, color, opacity = 1) {
    art.save();
    art.translate(x, y);
    art.scale(rx, ry);
    const g = art.createRadialGradient(0, 0, 0.04, 0, 0, 1);
    g.addColorStop(0, color);
    g.addColorStop(0.6, color);
    g.addColorStop(1, "transparent");
    art.globalAlpha = opacity;
    art.fillStyle = g;
    art.beginPath();
    art.arc(0, 0, 1, 0, Math.PI * 2);
    art.fill();
    art.restore();
  }
  function roughPath(points, jitter = 2) {
    art.beginPath();
    points.forEach((point, i) => {
      const prev = points[(i + points.length - 1) % points.length];
      if (!i) art.moveTo(prev[0], prev[1]);
      const steps = Math.max(
        2,
        Math.hypot(point[0] - prev[0], point[1] - prev[1]) / 7,
      );
      for (let k = 1; k <= steps; k++) {
        const t = k / steps;
        art.lineTo(
          prev[0] + (point[0] - prev[0]) * t + (rand() - 0.5) * jitter,
          prev[1] + (point[1] - prev[1]) * t + (rand() - 0.5) * jitter,
        );
      }
      art.lineTo(...point);
    });
    art.closePath();
  }
  function mineral(points, base, dark, texture = 1) {
    art.save();
    roughPath(points, 3);
    art.clip();
    art.fillStyle = base;
    art.fillRect(0, 0, w, h);
    const xs = points.map((p) => p[0]),
      ys = points.map((p) => p[1]);
    const left = Math.min(...xs),
      top = Math.min(...ys),
      rw = Math.max(...xs) - left,
      rh = Math.max(...ys) - top;
    for (let i = 0; i < 70; i++)
      wash(
        left + rand() * rw,
        top + rand() * rh,
        rw * (0.05 + rand() * 0.3),
        rh * (0.1 + rand() * 0.4),
        dark,
        0.025 + rand() * 0.07,
      );
    for (let i = 0; i < 900 * texture; i++) {
      const x = left + rand() * rw,
        y = top + rand() * rh;
      art.strokeStyle =
        rand() > 0.35
          ? `rgba(38,49,40,${rand() * 0.11})`
          : `rgba(246,246,233,${rand() * 0.18})`;
      art.lineWidth = 0.3 + rand() * 2;
      art.beginPath();
      art.moveTo(x, y);
      art.lineTo(x + rw * (rand() * 0.065), y - rh * rand() * 0.025);
      art.stroke();
    }
    art.restore();
  }
  function stone(x, y, rx, ry) {
    // Faceted rock faces continue down into the mist; each basin is a hollow in a ledge.
    const top = [
      [x - rx, y + ry * 0.2],
      [x - rx * 0.75, y - ry * 0.65],
      [x - rx * 0.13, y - ry * 0.9],
      [x + rx * 0.45, y - ry * 0.65],
      [x + rx * 0.95, y - ry * 0.14],
      [x + rx * 0.8, y + ry * 0.6],
      [x + rx * 0.17, y + ry * 0.86],
      [x - rx * 0.6, y + ry * 0.7],
    ];
    const face = [
      top[0],
      top[7],
      top[6],
      top[5],
      [x + rx * 0.62, y + ry * 2.4],
      [x + rx * 0.8, h + 50],
      [x - rx * 0.3, h + 60],
      [x - rx * 0.7, y + ry * 2.1],
    ];
    mineral(face, "#c1cdbf", "#415e4c");
    mineral(
      [
        top[6],
        top[5],
        top[4],
        [x + rx * 0.8, y + ry * 1.9],
        [x + rx * 0.65, h + 40],
        [x + rx * 0.2, h + 60],
      ],
      "#82988a",
      "#263c2e",
      0.6,
    );
    mineral(top, "#e4e5d7", "#819383");
    art.save();
    roughPath(face, 2);
    art.clip();
    for (let i = 0; i < 30; i++) {
      const xx = x - rx * 0.6 + rand() * rx * 1.3,
        yy = y + ry * (0.5 + rand() * 1.9);
      art.strokeStyle = `rgba(34,48,38,${0.05 + rand() * 0.16})`;
      art.lineWidth = 1 + rand() * 6;
      art.beginPath();
      art.moveTo(xx, yy);
      art.bezierCurveTo(
        xx - rx * 0.2,
        yy + ry * 0.4,
        xx - rx * 0.18,
        yy + ry * 1.2,
        xx - rx * 0.3,
        yy + ry * 1.8,
      );
      art.stroke();
    }
    art.restore();
    art.strokeStyle = "#435a4860";
    art.lineWidth = 1;
    art.beginPath();
    art.moveTo(x - rx * 0.8, y + ry * 0.15);
    art.lineTo(x - rx * 0.5, y - ry * 0.07);
    art.lineTo(x - rx * 0.36, y - ry * 0.45);
    art.stroke();
  }
  function paint() {
    seed = 72;
    art.clearRect(0, 0, w, h);
    art.fillStyle = "#f3f3eb";
    art.fillRect(0, 0, w, h);
    const mobile = w < 700;
    // Distant ridges fade into rice paper rather than closing as geometric polygons.
    for (let j = 0; j < 4; j++) {
      art.beginPath();
      art.moveTo(-w * 0.1, h * 1.1);
      for (let i = 0; i <= 110; i++) {
        const x = -w * 0.1 + i * w * 0.012;
        const y =
          h * (0.58 + j * 0.06) +
          Math.sin(i * 0.075 + j) * h * 0.12 +
          Math.sin(i * 0.17) * h * 0.015;
        art.lineTo(x, y);
      }
      art.lineTo(w * 1.3, h * 1.1);
      art.closePath();
      const haze = art.createLinearGradient(0, h * 0.4, 0, h);
      haze.addColorStop(0, "#a8cdbc28");
      haze.addColorStop(0.5, "#b4d1bf30");
      haze.addColorStop(1, "#edf0e500");
      art.fillStyle = haze;
      art.fill();
    }
    for (let i = 0; i < 80; i++)
      wash(
        rand() * w,
        h * (0.35 + rand() * 0.65),
        w * (0.05 + rand() * 0.13),
        h * (0.06 + rand() * 0.12),
        "#a7c9b8",
        0.015 + rand() * 0.025,
      );
    // A split ink cliff, with a tapered shelf reaching toward the first basin.
    const first = pools[0],
      right = mobile ? w * 1.2 : w * 0.96;
    mineral(
      [
        [right - w * 0.18, -40],
        [right + w * 0.1, -40],
        [right + w * 0.03, h * 0.2],
        [right - w * 0.09, h * 0.29],
        [first.x + w * 0.08, first.source - 25],
        [first.x, first.source],
        [first.x - w * 0.03, first.source - 9],
        [right - w * 0.18, h * 0.23],
      ],
      "#c1d0bf",
      "#314a39",
      1.5,
    );
    const cx = right - w * 0.1;
    for (let i = 0; i < 75; i++) {
      const x = cx + (rand() - 0.4) * w * 0.13,
        y = -20 + rand() * h * 0.16;
      art.beginPath();
      art.moveTo(x, y);
      art.bezierCurveTo(
        x - w * 0.01,
        y + h * 0.03,
        x - w * 0.005,
        y + h * 0.07,
        x - w * 0.025,
        y + h * 0.14,
      );
      art.strokeStyle = `rgba(30,47,35,${rand() * 0.17})`;
      art.lineWidth = 0.3 + rand() * w * 0.003;
      art.stroke();
    }
    // Fine wave language from the monochrome reference.
    for (let i = 0; i < 35; i++) {
      const x = rand() * w,
        y = h * (0.73 + rand() * 0.3),
        len = w * (0.04 + rand() * 0.13);
      art.strokeStyle = `rgba(73,105,86,${0.035 + rand() * 0.06})`;
      art.lineWidth = 0.5 + rand() * 0.5;
      art.beginPath();
      art.moveTo(x, y);
      art.bezierCurveTo(
        x + len * 0.4,
        y - 9,
        x + len * 0.55,
        y + 4,
        x + len,
        y - 3,
      );
      art.stroke();
    }
    pools.forEach((p, i) => {
      stone(
        p.x - p.rx * 0.12,
        p.y + p.ry * 0.45,
        p.rx * (i === 0 ? 1.7 : 1.55),
        p.ry * 2.7,
      );
      // Fine hanging ink gathers into a droplet at the shelf's tip.
      const sy = p.source;
      if (i > 0) {
        const prev = pools[i - 1];
        mineral(
          [
            [prev.x + prev.rx * 0.8, prev.y + prev.ry * 0.25],
            [p.x + p.rx * 0.18, sy - 14],
            [p.x, sy],
            [p.x - p.rx * 0.08, sy - 7],
            [prev.x + prev.rx * 0.6, prev.y],
          ],
          "#b3c5b5",
          "#415b45",
          0.25,
        );
      }
      art.strokeStyle = "#3d5c4888";
      art.lineWidth = 1;
      art.beginPath();
      art.moveTo(p.x, sy - 6);
      art.quadraticCurveTo(p.x + 2, sy + 6, p.x, sy + 13);
      art.stroke();
      art.beginPath();
      for (let k = 0; k < 80; k++) {
        const a = (k / 80) * Math.PI * 2;
        const r =
          1 +
          Math.sin(a * 3) * 0.035 +
          Math.sin(a * 7) * 0.018 +
          rand() * 0.012;
        const x = p.x + Math.cos(a) * p.rx * r,
          y = p.y + Math.sin(a) * p.ry * r;
        k ? art.lineTo(x, y) : art.moveTo(x, y);
      }
      art.closePath();
      const g = art.createLinearGradient(0, p.y - p.ry, 0, p.y + p.ry);
      g.addColorStop(0, "#2d473c");
      g.addColorStop(0.3, "#527769");
      g.addColorStop(1, "#a9c7b5");
      art.fillStyle = g;
      art.fill();
      art.strokeStyle = "#39564788";
      art.lineWidth = 2;
      art.stroke();
      for (let k = 0; k < 3; k++) {
        art.beginPath();
        art.ellipse(
          p.x,
          p.y + p.ry * 0.1,
          p.rx * (0.48 + k * 0.17),
          p.ry * (0.4 + k * 0.16),
          -0.03,
          0,
          Math.PI * 1.7,
        );
        art.strokeStyle = "#e3ece04d";
        art.lineWidth = 0.7;
        art.stroke();
      }
      // A static, caught drop remains visible in the motion-free landscape.
      if (motion.matches) {
        art.fillStyle = "#648975";
        art.beginPath();
        art.ellipse(p.x, p.source + 30, 2, 5, 0, 0, Math.PI * 2);
        art.fill();
      }
    });
    const mist = art.createLinearGradient(0, h * 0.87, 0, h);
    mist.addColorStop(0, "#f3f3eb00");
    mist.addColorStop(1, "#f3f3ebf0");
    art.fillStyle = mist;
    art.fillRect(0, h * 0.87, w, h * 0.13);
    // Grain is baked once, not redrawn in the animation loop.
    for (let i = 0; i < Math.min(24000, (w * h) / 35); i++) {
      art.fillStyle = rand() > 0.5 ? "#29453608" : "#ffffff35";
      art.fillRect(rand() * w, rand() * h, rand() * 1.7 + 0.2, 0.5 + rand());
    }
  }
  function resize() {
    const rect = canvas.getBoundingClientRect();
    w = rect.width;
    h = rect.height;
    dpr = Math.min(devicePixelRatio || 1, 2);
    for (const c of [canvas, still]) {
      c.width = Math.round(w * dpr);
      c.height = Math.round(h * dpr);
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    art.setTransform(dpr, 0, 0, dpr, 0, 0);
    const mobile = w < 700;
    const layout = mobile
      ? [
          [0.29, 0.46, 0.16],
          [0.7, 0.65, 0.16],
          [0.39, 0.82, 0.2],
        ]
      : [
          [0.4, 0.58, 0.09],
          [0.65, 0.7, 0.078],
          [0.84, 0.83, 0.09],
        ];
    pools = layout.map(([x, y, r], i) => ({
      x: x * w,
      y: y * h,
      rx: r * w,
      ry: mobile ? 16 + i * 2 : 22 + i * 2,
      source: y * h - (mobile ? 95 : 145),
      timer: 0.6 + i * 0.8,
    }));
    pools.forEach((p, i) =>
      Object.assign(links[i].style, {
        left: p.x + "px",
        top: p.y + "px",
        width: p.rx * 2 + "px",
        height: Math.max(48, p.ry * 2) + "px",
      }),
    );
    drops = [];
    sprays = [];
    rings = [];
    paint();
    render();
  }
  function ripple(x, y, strength = 1, pool = null) {
    if (motion.matches) return;
    rings.push({ x, y, age: 0, strength, pool });
    if (rings.length > 42) rings.shift();
  }
  function impact(p) {
    ripple(p.x, p.y, 1, p);
    for (let i = 0; i < 7; i++) {
      if (sprays.length >= 65) break;
      sprays.push({
        x: p.x,
        y: p.y,
        vx: (Math.random() - 0.5) * 100,
        vy: -45 - Math.random() * 65,
        ground: p.y + Math.random() * 12,
        age: 0,
        r: 1 + Math.random() * 1.2,
      });
    }
  }
  function render() {
    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(still, 0, 0, w, h);
    rings.forEach((r) => {
      for (let i = 0; i < 2; i++) {
        const age = r.age - i * 0.16;
        if (age < 0) return;
        const radius = 3 + age * 35 * r.strength;
        ctx.save();
        if (r.pool) {
          ctx.beginPath();
          ctx.ellipse(
            r.pool.x,
            r.pool.y,
            r.pool.rx,
            r.pool.ry,
            0,
            0,
            Math.PI * 2,
          );
          ctx.clip();
        }
        ctx.beginPath();
        ctx.ellipse(
          r.x,
          r.y,
          radius,
          radius * (r.pool ? 0.26 : 0.38),
          0,
          0,
          Math.PI * 2,
        );
        ctx.strokeStyle = `rgba(69,107,88,${Math.max(0, (1 - age / 2) * 0.3)})`;
        ctx.lineWidth = 0.7;
        ctx.stroke();
        ctx.restore();
      }
    });
    drops.forEach((d) => {
      const length = 4 + Math.min(16, d.vy * 0.035);
      ctx.save();
      ctx.translate(d.x, d.y);
      ctx.beginPath();
      ctx.moveTo(0, -length);
      ctx.bezierCurveTo(-1, -length * 0.25, -5, 1, 0, 4);
      ctx.bezierCurveTo(5, 1, 1, -length * 0.25, 0, -length);
      const g = ctx.createLinearGradient(-3, 0, 3, 0);
      g.addColorStop(0, "#4e7669aa");
      g.addColorStop(0.55, "#e7efe7cc");
      g.addColorStop(1, "#517a6899");
      ctx.fillStyle = g;
      ctx.fill();
      ctx.strokeStyle = "#50756566";
      ctx.lineWidth = 0.6;
      ctx.stroke();
      ctx.restore();
    });
    sprays.forEach((s) => {
      ctx.fillStyle = "#749b85aa";
      ctx.beginPath();
      ctx.ellipse(
        s.x,
        s.y,
        s.r,
        s.r * (1 + Math.abs(s.vy) / 150),
        Math.atan2(s.vy, s.vx) - Math.PI / 2,
        0,
        Math.PI * 2,
      );
      ctx.fill();
    });
  }
  function frame(now) {
    const dt = Math.min((now - (last || now)) / 1000, 0.05);
    last = now;
    pools.forEach((p) => {
      p.timer -= dt;
      if (p.timer <= 0) {
        drops.push({
          x: p.x + (Math.random() - 0.5) * 4,
          y: p.source,
          vy: 0,
          p,
        });
        p.timer = 2.1 + Math.random() * 2.2;
      }
    });
    drops = drops.filter((d) => {
      d.vy += 350 * dt;
      d.y += d.vy * dt;
      if (d.y >= d.p.y) {
        impact(d.p);
        return false;
      }
      return true;
    });
    sprays = sprays.filter((s) => {
      s.age += dt;
      s.vy += 300 * dt;
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      return s.y < s.ground && s.age < 1.5;
    });
    rings = rings.filter((r) => {
      r.age += dt;
      return r.age < 2;
    });
    render();
    raf = requestAnimationFrame(frame);
  }
  function start() {
    cancelAnimationFrame(raf);
    raf = 0;
    last = 0;
    if (!document.hidden && !motion.matches) raf = requestAnimationFrame(frame);
    else render();
  }
  document.addEventListener("visibilitychange", start);
  motion.addEventListener("change", () => {
    resize();
    start();
  });
  window.addEventListener("resize", resize);
  document.addEventListener(
    "pointermove",
    (e) => {
      if (performance.now() - pointerTime > 160) {
        ripple(e.clientX, e.clientY, 0.7);
        pointerTime = performance.now();
      }
    },
    { passive: true },
  );
  document.addEventListener(
    "pointerdown",
    (e) => ripple(e.clientX, e.clientY, 1.5),
    { passive: true },
  );
  links.forEach((link) =>
    link.addEventListener("click", (e) => {
      if (
        coarse.matches &&
        !link.classList.contains("is-revealed") &&
        !motion.matches
      ) {
        e.preventDefault();
        links.forEach((l) => l.classList.remove("is-revealed"));
        link.classList.add("is-revealed");
      }
    }),
  );
  resize();
  start();
})();
