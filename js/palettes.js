import { $, $$, loadJSON, esc, h, inkDefs, toast, ensoPath, brushPath, fmtDate } from './common.js?v=94d7b4c';

const root = $('#content');
inkDefs();
const ZONES = [
  { key: '风格', en: 'Style', note: '画面与色调：纸本、摄影、海报、版式。' },
  { key: '交互', en: 'Interaction', note: '会动的颜色：交互插件、动效、演示文稿。' },
];
const TYPE = { image: '图像', ppt: '演示', widget: '交互插件', plugin: '交互插件' };

function lum(hex) { const n = parseInt(hex.slice(1), 16); const r = n >> 16 & 255, g = n >> 8 & 255, b = n & 255; return (0.299 * r + 0.587 * g + 0.114 * b) / 255; }

function media(x) {
  const img = x.sourceImage ? `<img src="${esc(x.sourceImage)}" alt="${esc(x.title)} 原图" loading="lazy" decoding="async">` : '';
  if ((x.type === 'widget' || x.type === 'plugin') && x.embed) {
    return `<div class="pi-frame"><iframe src="${esc(x.embed)}" title="${esc(x.title)}" loading="lazy" sandbox="allow-scripts"></iframe></div>`;
  }
  if (!img) return `<div class="pi-frame pi-blank"><span>${esc(TYPE[x.type] || '收藏')}</span></div>`;
  return `<div class="pi-frame">${img}${x.type === 'ppt' ? '<span class="pi-type">PPT</span>' : ''}</div>`;
}

function itemEl(x, i) {
  const colors = x.colors || [];
  const bar = colors.map((c) => `<span style="background:${esc(c.hex)};flex:${c.weight || 1}"></span>`).join('');
  return `<article class="pi" style="--i:${i}">
    ${x.sample ? '<span class="sample-badge" title="示例条目">示例</span>' : ''}
    <div class="pi-art"><div class="pi-mount">${media(x)}</div><div class="pi-bar" aria-hidden="true">${bar}</div></div>
    <div class="pi-info">
      <p class="pi-kicker">${esc(x.category || '')}${x.type ? ` · ${esc(TYPE[x.type] || x.type)}` : ''}</p>
      <h3 class="pi-title">${esc(x.title)}</h3>
      ${x.note ? `<p class="pi-note">${esc(x.note)}</p>` : ''}
      <ul class="swatches" role="list">
        ${colors.map((c) => `<li><button type="button" class="sw" style="--c:${esc(c.hex)}" data-hex="${esc(c.hex.toUpperCase())}" aria-label="复制 ${esc(c.name || '')} ${esc(c.hex.toUpperCase())}">
          <span class="sw-dab ${lum(c.hex) > .82 ? 'light' : ''}"></span>
          <span class="sw-name">${esc(c.name || '')}</span><span class="sw-hex">${esc(c.hex.toUpperCase())}</span></button></li>`).join('')}
      </ul>
      ${x.file ? `<a class="pi-link" href="${esc(x.file)}" target="_blank" rel="noopener">打开原文件</a>` : ''}
      ${x.date ? `<p class="pi-date">${fmtDate(x.date)}</p>` : ''}
    </div>
  </article>`;
}

function zoneEl(z, items, zi) {
  const cats = [...new Set(items.map((x) => x.category || '未分类'))];
  const body = items.length ? cats.map((c) => `<section class="cat"><h3 class="cat-t"><span>${esc(c)}</span></h3>
      <div class="pi-grid">${items.filter((x) => (x.category || '未分类') === c).map(itemEl).join('')}</div></section>`).join('')
    : `<div class="empty"><svg viewBox="0 0 120 120" aria-hidden="true"><path d="${ensoPath(60, 60, 44, 44, { w: 5, seed: 'z' + zi, gap: .22 })}" class="viz-ink" filter="url(#ink-rough)"/></svg>
       <p class="empty-t">此处尚空</p><p class="empty-s">发截图时说一声放进「${esc(z.key)}」和哪一类，就会连同提取的色块一起陈列在这里。</p></div>`;
  return `<section class="zone" id="zone-${zi}" aria-labelledby="zt-${zi}">
    <header class="zone-head"><h2 id="zt-${zi}" class="zone-t">${esc(z.key)}</h2><p class="zone-en">${z.en}</p><p class="zone-note">${esc(z.note)}</p></header>
    ${body}</section>`;
}

async function copy(hex) {
  try { await navigator.clipboard.writeText(hex); toast(`已复制 ${hex}`); }
  catch { const t = document.createElement('textarea'); t.value = hex; document.body.appendChild(t); t.select(); let ok = false; try { ok = document.execCommand('copy'); } catch {} t.remove(); toast(ok ? `已复制 ${hex}` : `色值 ${hex}`); }
}

async function main() {
  let data = [];
  try { data = await loadJSON('palettes'); } catch (e) { root.innerHTML = `<p class="empty">色库暂时读不出来（${esc(e.message)}）。</p>`; return; }
  const zones = [...ZONES];
  data.forEach((x) => { if (x.zone && !zones.some((z) => z.key === x.zone)) zones.push({ key: x.zone, en: '', note: '' }); });
  const real = data.filter((x) => !x.sample).length;
  root.innerHTML = `<p class="lede">${real ? `共 <b>${real}</b> 组收藏` : '还没有正式收藏'}${data.some((x) => x.sample) ? ' · 1 组示例' : ''}</p>
    <nav class="zone-nav" aria-label="分区">${zones.map((z, i) => `<a href="#zone-${i}">${esc(z.key)}<small>${data.filter((x) => x.zone === z.key).length}</small></a>`).join('')}</nav>
    ${zones.map((z, i) => zoneEl(z, data.filter((x) => x.zone === z.key), i)).join('')}`;
  root.addEventListener('click', (e) => { const b = e.target.closest('.sw'); if (b) { copy(b.dataset.hex); b.classList.remove('copied'); void b.offsetWidth; b.classList.add('copied'); } });
  root.setAttribute('aria-busy', 'false');
}
main();
