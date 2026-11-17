import { $, $$, loadJSON, esc, h, inkDefs, rippleOverlay, reduced, fmtDate, brushPath, rng } from './common.js?v=6d04da1';

const root = $('#content');
inkDefs();

function bookEl(b, i) {
  const p = b.coverPalette || {};
  const r = rng(b.id);
  const vtitle = [...b.title].map((c) => `<span>${esc(c)}</span>`).join('');
  const stitches = [0.12, 0.37, 0.63, 0.88].map((y) => `<i style="top:${y * 100}%"></i>`).join('');
  const wash = `radial-gradient(120% 60% at ${30 + r() * 30}% ${70 + r() * 20}%, ${p.spine || '#a5b8ac'}cc, transparent 60%), radial-gradient(80% 50% at ${60 + r() * 20}% ${10 + r() * 20}%, ${p.accent || '#607f72'}55, transparent 70%)`;
  return h(`<li class="book-item" style="--bg:${p.bg || '#d8e0d7'};--ti:${p.title || '#355c53'};--tx:${p.text || '#293e38'};--sp:${p.spine || '#a5b8ac'};--ac:${p.accent || '#607f72'};--i:${i}">
    <button class="book" type="button" aria-haspopup="dialog" aria-label="《${esc(b.title)}》简介">
      <span class="book-3d">
        <span class="b-back"></span>
        <span class="b-pages"></span>
        <span class="b-spine"><span class="b-spine-title">${esc(b.title)}</span></span>
        <span class="b-under"><span class="b-under-lines"></span></span>
        <span class="b-front">
          <span class="b-wash" style="background:${wash}"></span>
          <span class="b-art"></span>
          <span class="b-grain"></span>
          <span class="b-bind">${stitches}</span>
          <span class="b-label"><span class="b-label-t">${vtitle}</span></span>
          <span class="b-meta">
            <span class="b-sub">${esc(b.subtitle || '')}</span>
            <span class="b-auth">${esc(b.authorEn || b.author || '')}</span>
          </span>
          <span class="b-stamp">${esc((b.status || '').slice(0, 2))}</span>
        </span>
        <span class="b-curl" aria-hidden="true"></span>
        <span class="b-probe"></span>
      </span>
    </button>
    <div class="book-cap">
      <p class="book-name">${esc(b.title)}</p>
      <p class="book-by">${esc(b.author || '')}${b.status ? ` · <span class="st">${esc(b.status)}</span>` : ''}</p>
    </div>
    <a class="boat" href="quotes.html?book=${encodeURIComponent(b.id)}" aria-label="乘舟去《${esc(b.title)}》书摘" title="渡至书摘">
      <svg viewBox="0 0 120 54" aria-hidden="true"><use href="#boat"/></svg><span class="boat-tip">渡至书摘</span>
    </a>
  </li>`);
}

function dialogEl() {
  const d = h(`<dialog class="ink-dialog" aria-labelledby="dlg-title">
    <div class="dlg-paper">
      <button class="dlg-close" type="button" aria-label="合上">合上</button>
      <div class="dlg-body"></div>
    </div></dialog>`);
  document.body.appendChild(d);
  d.addEventListener('click', (e) => { if (e.target === d) close(); });
  $('.dlg-close', d).addEventListener('click', () => close());
  function close() { d.classList.add('closing'); setTimeout(() => { d.classList.remove('closing'); d.close(); }, reduced() ? 0 : 260); }
  d.addEventListener('cancel', (e) => { e.preventDefault(); close(); });
  return d;
}

function openBook(dlg, b) {
  const rows = [['作者', b.authorCredit || b.author], ['译者', b.translator], ['出版', b.publisher], ['状态', b.status], ['开读', fmtDate(b.startedAt)], ['读毕', fmtDate(b.finishedAt)]].filter((r) => r[1]);
  $('.dlg-body', dlg).innerHTML = `
    <p class="dlg-kicker">简介</p>
    <h2 id="dlg-title" class="dlg-title">${esc(b.title)}</h2>
    <p class="dlg-orig">${esc(b.originalTitle || '')}${b.subtitle ? ` · ${esc(b.subtitle)}` : ''}</p>
    <svg class="dlg-rule" viewBox="0 0 400 14" preserveAspectRatio="none" aria-hidden="true"><path d="${brushPath([[4, 8], [120, 6], [260, 8], [396, 6]], { w: 5, seed: b.id, taperIn: .05, taperOut: .6 })}" fill="currentColor" filter="url(#ink-rough)"/></svg>
    <p class="dlg-summary">${esc(b.summary || '')}</p>
    <dl class="dlg-meta">${rows.map(([k, v]) => `<div><dt>${k}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>
    <a class="boat boat-lg" href="quotes.html?book=${encodeURIComponent(b.id)}"><svg viewBox="0 0 120 54" aria-hidden="true"><use href="#boat"/></svg><span>乘舟去书摘</span></a>`;
  dlg.showModal();
}

/* page-curl driven by the distance between the ripple cursor and each book's corner */
function curls(items) {
  const state = items.map(() => ({ c: 0, t: 0 }));
  let px = -1e4, py = -1e4, raf = 0;
  const MAX = 64, NEAR = 150;
  const tick = () => {
    raf = 0; let moving = false;
    items.forEach((li, i) => {
      const s = state[i];
      if (!li._forced) {
        const pr = $('.b-probe', li).getBoundingClientRect();
        const d = Math.hypot(px - pr.left, py - pr.top);
        s.t = d < NEAR ? MAX * (1 - d / NEAR) ** 0.8 : 0;
        if ($('.book', li).matches(':focus-visible')) s.t = Math.max(s.t, 38);
      }
      s.c += (s.t - s.c) * 0.2;
      if (Math.abs(s.t - s.c) > 0.2) moving = true;
      li.style.setProperty('--c', `${s.c.toFixed(1)}px`);
    });
    if (moving) raf = requestAnimationFrame(tick);
  };
  const kick = () => { if (!raf) raf = requestAnimationFrame(tick); };
  addEventListener('pointermove', (e) => { px = e.clientX; py = e.clientY; kick(); }, { passive: true });
  addEventListener('scroll', kick, { passive: true });
  document.addEventListener('focusin', kick); document.addEventListener('focusout', kick);
  return { force(li, v) { li._forced = v != null; const i = items.indexOf(li); if (v != null) state[i].t = v; kick(); } };
}

async function main() {
  let books = [];
  try { books = await loadJSON('books'); } catch (e) { root.innerHTML = `<p class="empty">书单暂时读不出来（${esc(e.message)}）。</p>`; return; }
  root.innerHTML = '';
  const intro = h(`<p class="lede">共 <b>${books.length}</b> 本 · ${books.filter((b) => b.status === '在读').length} 本在读</p>`);
  root.appendChild(intro);
  if (!books.length) { root.appendChild(h('<div class="empty"><p>书架还空着。</p></div>')); }
  const shelf = h('<ul class="shelf" role="list"></ul>');
  const items = books.map((b, i) => bookEl(b, i));
  items.forEach((li) => shelf.appendChild(li));
  root.appendChild(shelf);
  root.appendChild(h(`<svg class="shelf-water" viewBox="0 0 1200 40" preserveAspectRatio="none" aria-hidden="true"><path d="${brushPath([[0, 22], [300, 18], [620, 24], [900, 19], [1200, 22]], { w: 4, seed: 'shelf', taperIn: .1, taperOut: .3 })}" fill="currentColor" filter="url(#ink-rough)"/></svg>`));
  root.setAttribute('aria-busy', 'false');
  const dlg = dialogEl();
  const curl = curls(items);
  items.forEach((li, i) => {
    $('.book', li).addEventListener('click', (e) => {
      const touch = matchMedia('(hover: none)').matches;
      if (touch && !reduced()) { curl.force(li, 64); setTimeout(() => { openBook(dlg, books[i]); curl.force(li, null); }, 380); }
      else openBook(dlg, books[i]);
    });
  });
  // idle hint on touch devices: the first book's corner lifts once
  if (matchMedia('(hover: none)').matches && items[0] && !reduced()) setTimeout(() => { curl.force(items[0], 34); setTimeout(() => curl.force(items[0], null), 1400); }, 900);
  rippleOverlay();
}
main();
