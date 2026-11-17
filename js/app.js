'use strict';
const el = (tag, className, text) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined && text !== null) node.textContent = String(text);
  return node;
};
const safeImage = value => {
  if (typeof value !== 'string' || !value.trim() || /^(?:[a-z][a-z\d+.-]*:|\/|\\)/i.test(value)) return null;
  return value;
};
const dateNode = value => {
  const node = el('time', '', value);
  if (/^\d{4}-\d{2}-\d{2}$/.test(value || '')) node.dateTime = value;
  return node;
};
function tags(values) {
  const list = el('div', 'tags');
  if (Array.isArray(values)) values.forEach(value => list.append(el('span', 'tag', value)));
  return list;
}
function empty(title, text, symbol) {
  const box = el('div', 'empty');
  const ornament = el('span', 'empty-symbol', symbol);
  ornament.setAttribute('aria-hidden', 'true');
  box.append(ornament, el('h3', '', title), el('p', '', text));
  return box;
}
function renderBooks(books) {
  const fragment = document.createDocumentFragment();
  if (!books.length) fragment.append(empty('下一本书，尚待相遇', '书单会随着阅读，慢慢生长。', '册'));
  books.forEach((book, index) => {
    const article = el('article', 'book');
    const stage = el('div', 'cover-stage');
    const frame = el('button', 'cover-frame');
    frame.type = 'button';
    frame.setAttribute('aria-label', `《${book.title || ''}》立体封面`);
    frame.setAttribute('aria-pressed', 'false');
    frame.addEventListener('click', () => {
      const turned = frame.classList.toggle('is-turned');
      frame.setAttribute('aria-pressed', String(turned));
    });
    const palette = book.coverPalette || {};
    ['bg', 'title', 'text', 'spine', 'accent'].forEach(key => {
      if (/^#(?:[0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(palette[key] || '')) {
        frame.style.setProperty(`--cover-${key}`, palette[key]);
      }
    });
    const object = el('span', 'cover-object');
    object.setAttribute('aria-hidden', 'true');
    const front = el('span', 'cover-front');
    if (book.originalTitle) front.append(el('span', 'cover-original', book.originalTitle));
    front.append(el('span', 'cover-title', book.title));
    const motif = el('span', 'cover-motif');
    if (book.subtitle) motif.append(el('span', 'cover-subtitle', book.subtitle));
    front.append(motif);
    const credits = el('span', 'cover-credits');
    if (book.authorCredit || book.author) credits.append(el('span', 'cover-author', book.authorCredit || book.author));
    if (book.publisher) credits.append(el('span', 'cover-publisher', book.publisher));
    front.append(credits);
    object.append(el('span', 'cover-back'), el('span', 'cover-pages'), el('span', 'cover-spine', book.title), front);
    frame.append(object);
    stage.append(frame);
    const info = el('div', 'book-info');
    const kicker = el('div', 'book-kicker');
    kicker.append(el('span', 'item-number', String(index + 1).padStart(2, '0')));
    if (book.status) kicker.append(el('span', 'status', book.status));
    info.append(kicker, el('h3', '', book.title));
    if (book.originalTitle) info.append(el('p', 'original-title', book.originalTitle));
    if (book.subtitle) info.append(el('p', 'subtitle', book.subtitle));
    const meta = el('div', 'book-meta');
    const author = book.authorCredit || [book.author, book.authorEn ? `（${book.authorEn}）` : ''].filter(Boolean).join(' ');
    if (author) meta.append(el('span', '', `${author} 著`));
    if (book.translator) meta.append(el('span', '', `${book.translator} 译`));
    if (book.publisher) meta.append(el('span', '', book.publisher));
    if (book.startedAt) { const start = el('span', '', '开始于 '); start.append(dateNode(book.startedAt)); meta.append(start); }
    info.append(meta);
    if (book.summary) info.append(el('p', 'book-summary', book.summary));
    article.append(stage, info); fragment.append(article);
  });
  return fragment;
}
function observeCovers() {
  const covers = document.querySelectorAll('.cover-frame');
  if (!('IntersectionObserver' in window) || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15 });
  covers.forEach(cover => {
    cover.classList.add('will-enter');
    observer.observe(cover);
  });
}
function renderQuotes(quotes, books) {
  if (!quotes.length) return empty('等待一句，恰好读到心里', '读到有共鸣的文字，就留在这里。', '“');
  const fragment = document.createDocumentFragment();
  const groups = new Map();
  quotes.forEach(quote => {
    if (!groups.has(quote.bookId)) groups.set(quote.bookId, []);
    groups.get(quote.bookId).push(quote);
  });
  groups.forEach((entries, bookId) => {
    const group = el('div', 'quote-group');
    const book = books.find(item => item.id === bookId);
    group.append(el('h3', '', book ? `《${book.title}》` : '未关联书籍'));
    entries.forEach(quote => {
      const article = el('article', 'quote-entry');
      const meta = el('div', 'entry-meta');
      if (quote.page !== undefined && quote.page !== null && quote.page !== '') meta.append(el('span', '', `第 ${quote.page} 页`));
      if (quote.chapter) meta.append(el('span', '', quote.chapter));
      if (quote.date) meta.append(dateNode(quote.date));
      article.append(meta, el('blockquote', '', quote.text));
      if (quote.summary) { const summary = el('p', 'quote-summary'); summary.append(el('span', 'summary-label', '读后小记'), document.createTextNode(quote.summary)); article.append(summary); }
      article.append(tags(quote.tags)); group.append(article);
    });
    fragment.append(group);
  });
  return fragment;
}
function renderPalettes(palettes) {
  if (!palettes.length) return empty('让颜色，慢慢相遇', '收藏还未开始，目光已在路上。', '◌');
  const fragment = document.createDocumentFragment();
  palettes.forEach(palette => {
    const article = el('article', 'palette');
    const heading = el('div', 'palette-heading');
    heading.append(el('h3', '', palette.name));
    if (palette.date) heading.append(dateNode(palette.date));
    const swatches = el('div', 'swatches');
    (Array.isArray(palette.colors) ? palette.colors : []).forEach(color => {
      const figure = el('figure', 'swatch');
      const surface = el('div', 'color-surface');
      if (/^#(?:[0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(color.hex || '')) surface.style.setProperty('--swatch', color.hex);
      surface.setAttribute('aria-hidden', 'true');
      const caption = el('figcaption');
      caption.append(el('span', 'hex', color.hex));
      if (color.name) caption.append(el('span', '', color.name));
      figure.append(surface, caption); swatches.append(figure);
    });
    article.append(heading, swatches, tags(palette.tags));
    const path = safeImage(palette.sourceImage);
    if (path) { const img = el('img', 'source-image'); img.src = path; img.alt = `${palette.name || '配色'}的灵感来源`; img.loading = 'lazy'; img.decoding = 'async'; article.append(img); }
    fragment.append(article);
  });
  return fragment;
}
async function readData(name) {
  const response = await fetch(`data/${name}.json`);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const data = await response.json();
  if (!Array.isArray(data)) throw new Error('数据应为数组');
  return data;
}
async function init() {
  const names = ['books', 'quotes', 'palettes'];
  const results = await Promise.allSettled(names.map(readData));
  const books = results[0].status === 'fulfilled' ? results[0].value : [];
  const renderers = [renderBooks, data => renderQuotes(data, books), renderPalettes];
  results.forEach((result, index) => {
    const target = document.getElementById(`${names[index]}-content`);
    if (result.status === 'fulfilled') {
      target.replaceChildren(renderers[index](result.value));
      document.getElementById(`${names[index]}-count`).textContent = String(result.value.length).padStart(2, '0');
    } else {
      const message = el('p', 'error', '这一页暂时未能展开，请稍后刷新重试。');
      message.setAttribute('role', 'alert'); target.replaceChildren(message);
    }
    target.setAttribute('aria-busy', 'false');
  });
}
const navLinks = [...document.querySelectorAll('.section-nav a')];
function updateNav() {
  let current = 'books';
  document.querySelectorAll('.archive-section').forEach(section => {
    if (section.getBoundingClientRect().top <= 155) current = section.id;
  });
  navLinks.forEach(link => {
    if (link.hash === `#${current}`) link.setAttribute('aria-current', 'location');
    else link.removeAttribute('aria-current');
  });
}
let ticking = false;
window.addEventListener('scroll', () => {
  if (!ticking) { requestAnimationFrame(() => { updateNav(); ticking = false; }); ticking = true; }
}, { passive: true });
window.addEventListener('hashchange', updateNav);
init().then(() => { observeCovers(); updateNav(); });
