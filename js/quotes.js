import { $, $$, loadJSON, esc, h, inkDefs, inkTrail, brushPath, ensoPath, rng, fmtDate } from './common.js?v=3636da0';

const root = $('#content');
inkDefs();
inkTrail();

/* ---------- 逻辑图 · brush-ink visualisations ---------- */
let VW = 640;
function label(x, y, t, size = 22, cls = '') { return `<text x="${x}" y="${y}" class="viz-t ${cls}" font-size="${size}" text-anchor="middle" dominant-baseline="central">${esc(t)}</text>`; }
function node(x, y, t, seed, r = 46) {
  const rx = Math.max(r, Math.min(110, 16 + [...t].length * 12.5)), ry = r * 0.84;
  return `<g class="viz-node"><ellipse cx="${x}" cy="${y}" rx="${rx * .86}" ry="${ry * .8}" class="viz-wash" filter="url(#ink-bleed)"/>
    <path d="${ensoPath(x, y, rx, ry, { w: 5.4, seed })}" class="viz-ink" filter="url(#ink-rough)"/>${label(x, y, t)}</g>`;
}
function edge(a, b, seed, { bend = 0, lab = '', shrinkA = 46, shrinkB = 50 } = {}) {
  const dx = b[0] - a[0], dy = b[1] - a[1], d = Math.hypot(dx, dy) || 1, ux = dx / d, uy = dy / d;
  const s = [a[0] + ux * shrinkA, a[1] + uy * shrinkA], e = [b[0] - ux * shrinkB, b[1] - uy * shrinkB];
  const m = [(s[0] + e[0]) / 2 - uy * bend, (s[1] + e[1]) / 2 + ux * bend];
  const r = rng(seed);
  const pts = [s, [m[0] + (r() - .5) * 4, m[1] + (r() - .5) * 4], e];
  // arrow: two quick flicks of the brush
  const ang = Math.atan2(e[1] - m[1], e[0] - m[0]);
  const f = (da) => [[e[0], e[1]], [e[0] - Math.cos(ang + da) * 13, e[1] - Math.sin(ang + da) * 13]];
  let out = `<path d="${brushPath(pts, { w: 4.2, seed, taperIn: .15, taperOut: .2, dry: .5 })}" class="viz-ink" filter="url(#ink-rough)"/>`;
  out += `<path d="${brushPath(f(.5), { w: 2.8, seed: seed + 'a', taperIn: .05, taperOut: .9 })}" class="viz-ink"/><path d="${brushPath(f(-.5), { w: 2.8, seed: seed + 'b', taperIn: .05, taperOut: .9 })}" class="viz-ink"/>`;
  if (lab) out += label(m[0] - uy * 16, m[1] + ux * 16 - (Math.abs(uy) < .3 ? 6 : 0), lab, 16, 'viz-edge-t');
  return out;
}
function vizFlow(v, narrow) {
  const n = v.nodes || []; const byId = Object.fromEntries(n.map((x, i) => [x.id, i]));
  let pos, H;
  if (narrow) { H = 110 + (n.length - 1) * 128; pos = n.map((_, i) => [VW / 2 + (i % 2 ? 22 : -22), 62 + i * 128]); }
  else { const step = (VW - 160) / Math.max(1, n.length - 1); H = 220; pos = n.map((_, i) => [80 + i * step + (n.length === 1 ? (VW - 160) / 2 : 0), 110 + (i % 2 ? 16 : -12)]); }
  let s = (v.edges || []).map((e, k) => edge(pos[byId[e.from]], pos[byId[e.to]], `${v.title}${k}`, { lab: e.label, bend: narrow ? 0 : 10, shrinkA: 58, shrinkB: 62 })).join('');
  s += n.map((x, i) => node(pos[i][0], pos[i][1], x.label, x.id + i)).join('');
  return [s, H];
}
function vizCycle(v) {
  const n = v.nodes || []; const R = 150, cx = VW / 2, cy = 200, H = 400;
  const pos = n.map((_, i) => { const a = -Math.PI / 2 + i * 2 * Math.PI / n.length; return [cx + Math.cos(a) * R * 1.25, cy + Math.sin(a) * R]; });
  const byId = Object.fromEntries(n.map((x, i) => [x.id, i]));
  const edges = (v.edges && v.edges.length) ? v.edges : n.map((x, i) => ({ from: x.id, to: n[(i + 1) % n.length].id }));
  let s = `<path d="${ensoPath(cx, cy, 56, 46, { w: 2.5, seed: 'c' + v.title, gap: .3 })}" class="viz-ink faint"/>`;
  if (v.center) s += label(cx, cy, v.center, 17);
  s += edges.map((e, k) => edge(pos[byId[e.from]], pos[byId[e.to]], `${v.title}c${k}`, { bend: 34, lab: e.label })).join('');
  s += n.map((x, i) => node(pos[i][0], pos[i][1], x.label, x.id + i)).join('');
  return [s, H];
}
function vizTree(v) {
  const n = v.nodes || [], es = v.edges || [];
  const kids = {}; const hasParent = new Set();
  es.forEach((e) => { (kids[e.from] = kids[e.from] || []).push(e.to); hasParent.add(e.to); });
  const rootN = n.find((x) => !hasParent.has(x.id)) || n[0];
  const levels = []; const seen = new Set();
  (function walk(id, d) { if (seen.has(id)) return; seen.add(id); (levels[d] = levels[d] || []).push(id); (kids[id] || []).forEach((k) => walk(k, d + 1)); })(rootN?.id, 0);
  const pos = {}; levels.forEach((ids, d) => ids.forEach((id, i) => { pos[id] = [VW * (i + 1) / (ids.length + 1), 64 + d * 120]; }));
  const lab = Object.fromEntries(n.map((x) => [x.id, x.label]));
  let s = es.filter((e) => pos[e.from] && pos[e.to]).map((e, k) => edge(pos[e.from], pos[e.to], `${v.title}t${k}`, { lab: e.label, shrinkA: 36, shrinkB: 40 })).join('');
  s += Object.entries(pos).map(([id, p], i) => node(p[0], p[1], lab[id] || id, id + i, 34)).join('');
  return [s, 64 + (levels.length - 1) * 120 + 70];
}
function vizCompare(v, narrow) {
  const cols = v.columns || [];
  const cw = VW / Math.max(1, cols.length); let H = 0; let s = '';
  cols.forEach((c, i) => {
    const x = cw * i + cw / 2;
    s += `<path d="${brushPath([[x - cw * .32, 56], [x, 52], [x + cw * .32, 57]], { w: 7, seed: c.title + i, taperIn: .1, taperOut: .5, dry: .6 })}" class="viz-ink" filter="url(#ink-rough)"/>`;
    s += label(x, 28, c.title, 22, 'viz-head');
    (c.items || []).forEach((it, k) => { const y = 96 + k * 46; s += `<circle cx="${x - cw * .36}" cy="${y}" r="3.2" class="viz-dot"/>` + `<text x="${x - cw * .36 + 14}" y="${y}" class="viz-t" font-size="16" dominant-baseline="central">${esc(it)}</text>`; H = Math.max(H, y + 40); });
    if (i > 0) s += `<path d="${brushPath([[cw * i, 20], [cw * i + 2, H / 2 + 40], [cw * i - 1, H + 10]], { w: 1.8, seed: 'd' + i, dry: .8 })}" class="viz-ink faint"/>`;
  });
  return [s, Math.max(H, 140)];
}
function renderViz(v, narrow) {
  if (!v) return '';
  const f = { flow: vizFlow, cycle: vizCycle, tree: vizTree, compare: vizCompare }[v.type];
  if (!f) return '';
  VW = narrow && v.type === 'flow' ? 360 : 640;
  const [svg, H] = f(v, narrow);
  return `<figure class="viz viz-${v.type}"><figcaption>${esc(v.title || '逻辑图')}</figcaption><svg viewBox="0 0 ${VW} ${H}" role="img" aria-label="${esc(v.title || '逻辑图')}">${svg}</svg></figure>`;
}

/* ---------- page ---------- */
let books = [], quotes = [], sel = 'all', q = '';
const narrow = () => innerWidth < 640;

function quoteEl(x, i) {
  const book = books.find((b) => b.id === x.bookId);
  const src = book ? `《${esc(book.title)}》` : '';
  const where = [src, esc(x.chapter || ''), x.page ? `第 ${esc(x.page)} 页` : ''].filter(Boolean).join(' · ');
  return `<article class="quote" id="${esc(x.id)}" style="--i:${i}">
    ${x.sample ? '<span class="sample-badge" title="示例条目，不出自任何书籍">示例</span>' : ''}
    <div class="q-left">
      <blockquote class="q-text"><p>${esc(x.text).replace(/\n/g, '<br>')}</p></blockquote>
      <p class="q-src">${where}${x.date ? `<span class="q-date">${fmtDate(x.date)}</span>` : ''}</p>
      ${x.tags?.length ? `<p class="q-tags">${x.tags.map((t) => `<span>${esc(t)}</span>`).join('')}</p>` : ''}
    </div>
    <div class="q-right">
      ${x.summary ? `<section class="q-sec"><h3>整理</h3><p>${esc(x.summary)}</p></section>` : ''}
      ${x.keyPoints?.length ? `<section class="q-sec"><h3>要点</h3><ol class="q-points">${x.keyPoints.map((p) => `<li>${esc(p)}</li>`).join('')}</ol></section>` : ''}
      ${renderViz(x.viz, narrow())}
    </div>
  </article>`;
}

function hay(x) { return [x.text, x.summary, x.chapter, ...(x.keyPoints || []), ...(x.tags || []), x.viz?.title, ...(x.viz?.nodes || []).map((n) => n.label)].join(' ').toLowerCase(); }

function render() {
  const list = $('.q-list'); const info = $('.q-count');
  let items = quotes.filter((x) => sel === 'all' ? true : (x.bookId === sel && !x.sample));
  if (q) items = items.filter((x) => hay(x).includes(q.toLowerCase()));
  const real = quotes.filter((x) => !x.sample && (sel === 'all' || x.bookId === sel)).length;
  info.textContent = q ? `找到 ${items.length} 则` : `${real} 则摘录${items.some((x) => x.sample) ? ' · 另有 1 则示例' : ''}`;
  if (!items.length) {
    const b = books.find((x) => x.id === sel);
    list.innerHTML = `<div class="empty"><svg viewBox="0 0 120 120" aria-hidden="true"><path d="${ensoPath(60, 60, 44, 44, { w: 5, seed: 'empty', gap: .18 })}" class="viz-ink" filter="url(#ink-rough)"/><circle cx="60" cy="60" r="4" class="viz-dot"/></svg>
      <p class="empty-t">${q ? `没有找到「${esc(q)}」` : b ? `《${esc(b.title)}》还没有摘录` : '还没有摘录'}</p>
      <p class="empty-s">${q ? '换个词试试，或清空搜索。' : '发来高亮截图，就会整理成原文、要点与逻辑图，落在这里。'}</p></div>`;
    return;
  }
  list.innerHTML = items.map(quoteEl).join('<div class="q-divider" aria-hidden="true"></div>');
}

async function main() {
  try { [books, quotes] = await Promise.all([loadJSON('books'), loadJSON('quotes')]); }
  catch (e) { root.innerHTML = `<p class="empty">书摘暂时读不出来（${esc(e.message)}）。</p>`; return; }
  const want = new URLSearchParams(location.search).get('book');
  if (want && books.some((b) => b.id === want)) sel = want;
  root.innerHTML = `
    <div class="q-tools">
      <div class="q-books" role="radiogroup" aria-label="选书">
        <button type="button" role="radio" data-id="all">全部</button>
        ${books.map((b) => `<button type="button" role="radio" data-id="${esc(b.id)}">${esc(b.title)}</button>`).join('')}
      </div>
      <label class="q-search"><span class="sr-only">搜索书摘</span>
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="${ensoPath(10, 10, 6.5, 6.5, { w: 1.8, seed: 's', gap: .05 })}" fill="currentColor"/><path d="${brushPath([[15, 15], [21, 21]], { w: 2.2, seed: 'h', taperIn: .2, taperOut: .5 })}" fill="currentColor"/></svg>
        <input type="search" placeholder="搜索原文、整理、要点或标签" autocomplete="off" enterkeyhint="search">
      </label>
      <p class="q-count" aria-live="polite"></p>
    </div>
    <div class="q-list"></div>`;
  const btns = $$('.q-books button');
  const sync = () => btns.forEach((b) => { const on = b.dataset.id === sel; b.setAttribute('aria-checked', String(on)); b.tabIndex = on ? 0 : -1; });
  btns.forEach((b) => b.addEventListener('click', () => {
    sel = b.dataset.id; sync(); render();
    const u = new URL(location.href); if (sel === 'all') u.searchParams.delete('book'); else u.searchParams.set('book', sel); history.replaceState(null, '', u);
  }));
  $('.q-books').addEventListener('keydown', (e) => {
    const i = btns.findIndex((b) => b.dataset.id === sel); const d = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
    if (d) { e.preventDefault(); const nb = btns[(i + d + btns.length) % btns.length]; nb.focus(); nb.click(); }
  });
  let t; $('.q-search input').addEventListener('input', (e) => { clearTimeout(t); t = setTimeout(() => { q = e.target.value.trim(); render(); }, 120); });
  sync(); render();
  root.setAttribute('aria-busy', 'false');
  let wasNarrow = narrow(); addEventListener('resize', () => { if (narrow() !== wasNarrow) { wasNarrow = narrow(); render(); } });
}
main();
