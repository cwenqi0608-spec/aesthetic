"use strict";
const el = (tag, cls, text) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text !== undefined) n.textContent = text;
  return n;
};
const relative = (value) =>
  typeof value === "string" &&
  value.trim() &&
  !/^(?:[a-z][a-z\d+.-]*:|\/|\\)/i.test(value) &&
  !value.includes("\\")
    ? value
    : null;
const hex = (value) => /^#[0-9a-f]{6}$/i.test(value || "");
const empty = (title, description) => {
  const n = el("div", "empty");
  n.append(el("h3", "", title), el("p", "", description));
  return n;
};
async function read(name) {
  const r = await fetch(`data/${name}.json`);
  if (!r.ok) throw Error(r.status);
  const data = await r.json();
  if (!Array.isArray(data)) throw Error("数据应为数组");
  return data;
}
function metadata(book) {
  const n = el("div", "book-meta");
  [
    ["", book.authorCredit || book.author],
    ["译者 · ", book.translator],
    ["出版 · ", book.publisher],
    ["阅读状态 · ", book.status],
    ["开始阅读 · ", book.startedAt],
    ["读完于 · ", book.finishedAt],
  ].forEach(([prefix, value]) => {
    if (value) n.append(el("span", "", prefix + value));
  });
  return n;
}
function showBook(book) {
  const dialog = document.querySelector("#book-dialog"),
    body = document.querySelector("#dialog-content");
  const h = el("h2", "", book.title);
  h.id = "dialog-title";
  body.replaceChildren(
    el("p", "eyebrow", "书 籍 简 介"),
    h,
    el("p", "original-title", book.originalTitle),
    el("p", "subtitle", book.subtitle),
    metadata(book),
    el("p", "book-summary", book.summary || "简介待补。"),
  );
  dialog.showModal();
}
function boat(book) {
  const a = el("a", "boat-link");
  a.href = `quotes.html?book=${encodeURIComponent(book.id)}`;
  a.setAttribute("aria-label", `前往《${book.title}》书摘`);
  a.innerHTML =
    '<svg viewBox="0 0 60 38" fill="none" aria-hidden="true"><path d="M5 24q24 8 50-1l-10 8H17Z" fill="currentColor" opacity=".8"/><path d="m30 5-13 17h13Zm3 1v18M4 35q12-4 25 0t27-1" stroke="currentColor" stroke-width="1.2"/></svg>';
  a.append(el("span", "", "乘舟读摘 ↗"));
  return a;
}
function renderBooks(books) {
  const frag = document.createDocumentFragment();
  if (!books.length)
    frag.append(empty("下一本书，尚待相遇", "书单会随着阅读，慢慢生长。"));
  books.forEach((book, i) => {
    const article = el("article", "book"),
      stage = el("div", "cover-stage"),
      frame = el("button", "cover-frame");
    frame.type = "button";
    frame.setAttribute("aria-label", `打开《${book.title}》简介`);
    frame.setAttribute("aria-haspopup", "dialog");
    frame.addEventListener("click", () => showBook(book));
    Object.entries(book.coverPalette || {}).forEach(([k, v]) => {
      if (["bg", "title", "text", "spine", "accent"].includes(k) && hex(v))
        frame.style.setProperty(`--cover-${k}`, v);
    });
    const object = el("span", "cover-object");
    object.setAttribute("aria-hidden", "true");
    const front = el("span", "cover-front");
    front.append(
      el("span", "cover-original", book.originalTitle),
      el("span", "cover-title", book.title),
    );
    const motif = el("span", "cover-motif");
    motif.append(el("span", "cover-subtitle", book.subtitle));
    front.append(motif);
    const credits = el("span", "cover-credits"),
      author = el("span", "cover-author");
    author.append(
      el("span", "", book.author),
      el("span", "cover-author-name", book.authorEn),
    );
    credits.append(author, el("span", "cover-publisher", book.publisher));
    front.append(credits, el("span", "page-corner"));
    object.append(
      el("span", "cover-back"),
      el("span", "cover-pages"),
      el("span", "cover-spine", book.title),
      front,
    );
    frame.append(object);
    stage.append(frame, el("p", "cover-hint", "轻触封面，展开简介"));
    const info = el("div", "book-info"),
      kicker = el("div", "book-kicker");
    kicker.append(
      el("span", "", String(i + 1).padStart(2, "0") + " / 藏 书"),
      el("span", "status", book.status),
    );
    info.append(
      kicker,
      el("h2", "", book.title),
      el("p", "original-title", book.originalTitle),
      el("p", "subtitle", book.subtitle),
      metadata(book),
    );
    const actions = el("div", "book-actions"),
      open = el("button", "text-button", "展开简介 ↗");
    open.addEventListener("click", () => showBook(book));
    actions.append(open, boat(book));
    info.append(actions);
    article.append(stage, info);
    frag.append(article);
  });
  const dialog = document.querySelector("#book-dialog");
  dialog
    .querySelector(".dialog-close")
    .addEventListener("click", () => dialog.close());
  dialog.addEventListener("click", (e) => {
    const r = dialog.getBoundingClientRect();
    if (
      e.target === dialog &&
      (e.clientX < r.left ||
        e.clientX > r.right ||
        e.clientY < r.top ||
        e.clientY > r.bottom)
    )
      dialog.close();
  });
  return frag;
}
let diagramId = 0;
function diagram(viz) {
  if (
    !viz ||
    !Array.isArray(viz.nodes) ||
    !viz.nodes.length ||
    !["flow", "compare", "tree", "cycle"].includes(viz.type)
  )
    return null;
  const nodes = viz.nodes,
    edges = Array.isArray(viz.edges) ? viz.edges : [],
    type = viz.type,
    n = nodes.length;
  const fig = el("figure", `diagram diagram--${type}`);
  if (viz.title) fig.append(el("figcaption", "", viz.title));
  const ns = "http://www.w3.org/2000/svg",
    sv = (tag, attrs, text) => {
      const node = document.createElementNS(ns, tag);
      Object.entries(attrs || {}).forEach(([k, v]) => node.setAttribute(k, v));
      if (text !== undefined) node.textContent = text;
      return node;
    };
  const width = type === "flow" ? 320 : 600,
    height =
      type === "flow"
        ? Math.max(130, n * 80)
        : type === "compare"
          ? Math.max(180, Math.ceil(n / 3) * 140)
          : Math.max(360, n * 65);
  const svg = sv("svg", {
      viewBox: `0 0 ${width} ${height}`,
      role: "img",
      "aria-label": viz.title || "逻辑结构图",
    }),
    id = `arrow-${diagramId++}`;
  const defs = sv("defs"),
    marker = sv("marker", {
      id,
      viewBox: "0 0 10 10",
      refX: 9,
      refY: 5,
      markerWidth: 6,
      markerHeight: 6,
      orient: "auto-start-reverse",
    });
  marker.append(
    sv("path", {
      d: "M 1 1 L 9 5 L 1 9",
      fill: "none",
      stroke: "#52796a",
      "stroke-width": 1.5,
    }),
  );
  defs.append(marker);
  svg.append(defs);
  const pos = new Map();
  if (type === "flow") {
    nodes.forEach((node, i) =>
      pos.set(node.id, { x: width / 2, y: 42 + i * 80 }),
    );
  }
  if (type === "compare") {
    const cols = Math.min(3, n);
    nodes.forEach((node, i) =>
      pos.set(node.id, {
        x: (((i % cols) + 0.5) * width) / cols,
        y: 65 + Math.floor(i / cols) * 140,
      }),
    );
  }
  if (type === "cycle") {
    nodes.forEach((node, i) => {
      const a = -Math.PI / 2 + (i / n) * 2 * Math.PI;
      pos.set(node.id, {
        x: 300 + Math.cos(a) * 200,
        y: height / 2 + Math.sin(a) * (height / 2 - 50),
      });
    });
  }
  if (type === "tree") {
    const indegree = new Map(nodes.map((node) => [node.id, 0])),
      levels = new Map();
    edges.forEach((e) => {
      if (indegree.has(e.to) && indegree.has(e.from))
        indegree.set(e.to, indegree.get(e.to) + 1);
    });
    const queue = nodes
      .filter((node) => !indegree.get(node.id))
      .map((node) => node.id);
    queue.forEach((id) => levels.set(id, 0));
    for (let at = 0; at < queue.length; at++) {
      const id = queue[at];
      edges
        .filter((e) => e.from === id && indegree.has(e.to))
        .forEach((e) => {
          levels.set(e.to, Math.max(levels.get(e.to) || 0, levels.get(id) + 1));
          indegree.set(e.to, indegree.get(e.to) - 1);
          if (!indegree.get(e.to)) queue.push(e.to);
        });
    }
    nodes.forEach((node) => {
      if (!levels.has(node.id)) levels.set(node.id, 0);
    });
    const max = Math.max(...levels.values());
    for (let l = 0; l <= max; l++) {
      const group = nodes.filter((node) => levels.get(node.id) === l);
      group.forEach((node, i) =>
        pos.set(node.id, {
          x: ((i + 1) * width) / (group.length + 1),
          y: 45 + (l * (height - 90)) / Math.max(1, max),
        }),
      );
    }
  }
  const usedEdges =
    type === "cycle" && !edges.length
      ? nodes.map((node, i) => ({ from: node.id, to: nodes[(i + 1) % n].id }))
      : edges;
  usedEdges.forEach((e) => {
    const a = pos.get(e.from),
      b = pos.get(e.to);
    if (!a || !b) return;
    const dx = b.x - a.x,
      dy = b.y - a.y,
      len = Math.hypot(dx, dy);
    if (!len) return;
    const ux = dx / len,
      uy = dy / len;
    const offsetA = Math.min(
      64 / Math.max(Math.abs(ux), 0.01),
      24 / Math.max(Math.abs(uy), 0.01),
    );
    const offsetB = offsetA + 5;
    const x1 = a.x + ux * offsetA,
      y1 = a.y + uy * offsetA,
      x2 = b.x - ux * offsetB,
      y2 = b.y - uy * offsetB;
    svg.append(
      sv("path", {
        d:
          type === "cycle"
            ? `M${x1},${y1} Q${(a.x + b.x) / 2 - uy * 25},${(a.y + b.y) / 2 + ux * 25} ${x2},${y2}`
            : `M${x1},${y1} L${x2},${y2}`,
        fill: "none",
        stroke: "#52796a",
        "stroke-width": 1.2,
        "marker-end": `url(#${id})`,
      }),
    );
    if (e.label)
      svg.append(
        sv(
          "text",
          { x: (a.x + b.x) / 2 + 12, y: (a.y + b.y) / 2 - 6, "font-size": 13 },
          e.label,
        ),
      );
  });
  nodes.forEach((node) => {
    const p = pos.get(node.id);
    svg.append(
      sv("rect", {
        x: p.x - 64,
        y: p.y - 24,
        width: 128,
        height: 48,
        rx: 2,
        fill: "#d3dfd0",
        stroke: "#91a896",
        "stroke-width": 0.7,
      }),
    );
    const label = String(node.label || ""),
      text = sv("text", {
        x: p.x,
        y: p.y + 5,
        "text-anchor": "middle",
        "font-size": 16,
      });
    const lines = label.match(/.{1,7}/gu) || [""];
    if (lines.length > 1) {
      text.setAttribute("font-size", 12);
      lines.forEach((line, i) =>
        text.append(
          sv(
            "tspan",
            { x: p.x, y: p.y - (Math.min(lines.length, 3) - 1) * 7 + i * 14 },
            line,
          ),
        ),
      );
    } else text.textContent = label;
    svg.append(text);
  });
  fig.append(svg);
  const desc = el(
    "p",
    "diagram-description",
    nodes.map((node) => node.label).join(type === "compare" ? " / " : " · "),
  );
  fig.append(desc);
  return fig;
}
function quoteCard(q, books) {
  const a = el("article", "quote-entry"),
    meta = el("div", "entry-meta");
  if (q.sample)
    meta.append(
      el("span", "sample-badge", "示例"),
      el("span", "", "原创笔记 · 非书籍摘录"),
    );
  else {
    const book = books.find((b) => b.id === q.bookId);
    if (book) meta.append(el("span", "", `《${book.title}》`));
  }
  if (q.chapter && !(q.sample && q.chapter.includes("非书籍摘录")))
    meta.append(el("span", "", q.chapter));
  if (q.page) meta.append(el("span", "", `第 ${q.page} 页`));
  if (q.date) meta.append(el("time", "", q.date));
  a.append(meta, el("blockquote", "", q.text));
  const notes = el("div", "quote-notes");
  if (q.summary) {
    const section = el("section");
    section.append(el("h3", "", "读后整理"), el("p", "", q.summary));
    notes.append(section);
  }
  if (q.keyPoints?.length) {
    const section = el("section"),
      ul = el("ul");
    q.keyPoints.forEach((k) => ul.append(el("li", "", k)));
    section.append(el("h3", "", "要点"), ul);
    notes.append(section);
  }
  a.append(notes);
  const viz = diagram(q.viz);
  if (viz) a.append(viz);
  const tags = el("div", "tags");
  (q.tags || []).forEach((t) => tags.append(el("span", "", "# " + t)));
  a.append(tags);
  return a;
}
function initQuotes(quotes, books, target) {
  const select = document.querySelector("#book-filter"),
    search = document.querySelector("#quote-search");
  books.forEach((b) => {
    const o = el("option", "", b.title);
    o.value = b.id;
    select.append(o);
  });
  const requested = new URLSearchParams(location.search).get("book");
  if (books.some((b) => b.id === requested)) select.value = requested;
  document
    .querySelector(".quote-filters")
    .addEventListener("submit", (e) => e.preventDefault());
  function update() {
    const query = search.value.trim().toLocaleLowerCase(),
      filtered = quotes.filter(
        (q) =>
          (!select.value || q.bookId === select.value) &&
          [
            q.text,
            q.summary,
            q.chapter,
            ...(q.keyPoints || []),
            ...(q.tags || []),
          ]
            .join(" ")
            .toLocaleLowerCase()
            .includes(query),
      );
    target.replaceChildren();
    const real = filtered.filter((q) => !q.sample).length;
    document.querySelector("#result-count").textContent =
      `${real} 则书摘${filtered.some((q) => q.sample) ? " · 含 1 则独立版式示例" : ""}`;
    if (!real)
      target.append(
        empty(
          query ? "未找到对应的书摘" : "尚无书摘，留白以待",
          query
            ? "试试另一个词，或切换所读之书。"
            : filtered.length
              ? "下面是一则原创示例，仅展示整理与图解的方式。"
              : "读到有共鸣的文字，再把它留在这里。",
        ),
      );
    filtered.forEach((q) => target.append(quoteCard(q, books)));
  }
  select.addEventListener("change", () => {
    const url = new URL(location.href);
    if (select.value) url.searchParams.set("book", select.value);
    else url.searchParams.delete("book");
    history.replaceState(null, "", url);
    update();
  });
  search.addEventListener("input", update);
  update();
}
async function copy(text) {
  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const area = el("textarea");
  area.value = text;
  area.style.cssText = "position:fixed;opacity:0;pointer-events:none";
  document.body.append(area);
  const active = document.activeElement;
  area.select();
  const ok = document.execCommand("copy");
  area.remove();
  active?.focus();
  if (!ok) throw Error("复制失败");
}
function renderPalettes(items) {
  const frag = document.createDocumentFragment();
  ["风格", "交互"].forEach((zone, i) => {
    const section = el("section", "palette-zone");
    section.id = i ? "interaction" : "style";
    const heading = el("div", "zone-heading"),
      entries = items.filter((p) => p.zone === zone);
    heading.append(
      el("h2", "", zone),
      el(
        "span",
        "",
        i ? "动作、体验，与微小的惊喜" : "纸本、图像，与色彩的相遇",
      ),
    );
    section.append(heading);
    if (!entries.some((p) => !p.sample))
      section.append(
        empty(
          i ? "交互的灵感，待续" : "还没有正式收藏",
          entries.length
            ? "先以一幅水墨参考，试着留住它的颜色。"
            : "遇见喜欢的体验，再收藏到这里。",
        ),
      );
    entries.forEach((p) => {
      const article = el("article", "palette");
      const image = relative(p.sourceImage);
      if (image) {
        const img = el("img", "source-image");
        img.src = image;
        img.alt = `${p.title}的${p.sample ? "示例参考图" : "原始图像"}`;
        img.loading = "lazy";
        article.append(img);
      } else
        article.append(
          el(
            "div",
            "preview-placeholder",
            { ppt: "幻灯片", widget: "交互组件", plugin: "插件" }[p.type] ||
              "图像待补",
          ),
        );
      const info = el("div", "palette-info"),
        meta = el("div", "entry-meta");
      if (p.sample) meta.append(el("span", "sample-badge", "示例"));
      meta.append(
        el("span", "", `${zone} / ${p.category || ""}`),
        el("span", "", p.date || ""),
      );
      info.append(meta, el("h3", "", p.title));
      if (p.sample)
        info.append(
          el(
            "p",
            "palette-description",
            "取色自水墨风格参考图，用于展示收藏版式。\n青绿浸入纸面，浓淡之间，自有呼吸。",
          ),
        );
      const swatches = el("div", "swatches"),
        status = el("p", "copy-status");
      status.setAttribute("role", "status");
      (p.colors || [])
        .filter((c) => hex(c.hex))
        .forEach((c) => {
          const button = el("button", "swatch");
          button.type = "button";
          button.setAttribute("aria-label", `复制${c.name || ""}色值 ${c.hex}`);
          button.style.setProperty("--swatch", c.hex);
          button.append(
            el("span", "color-surface"),
            el("span", "", c.name),
            el("span", "hex", c.hex.toUpperCase()),
          );
          button.addEventListener("click", async () => {
            try {
              await copy(c.hex);
              status.textContent = `已复制 ${c.hex.toUpperCase()}`;
              setTimeout(() => {
                if (status.textContent.includes(c.hex.toUpperCase()))
                  status.textContent = "点击色块，收藏一抹颜色。";
              }, 2200);
            } catch {
              status.textContent = `复制未成功，请手动复制：${c.hex}`;
            }
          });
          swatches.append(button);
        });
      info.append(swatches, status);
      status.textContent = "点击色块，收藏一抹颜色。";
      const file = relative(p.file);
      if (file) {
        const link = el(
          "a",
          "asset-link",
          p.type === "ppt" ? "查看幻灯片 ↗" : "打开原作 ↗",
        );
        link.href = file;
        info.append(link);
      }
      article.append(info);
      section.append(article);
    });
    frag.append(section);
  });
  return frag;
}
(async () => {
  const page = document.body.dataset.page,
    target = document.querySelector("#content");
  try {
    if (page === "books")
      target.replaceChildren(renderBooks(await read("books")));
    if (page === "quotes") {
      const [quotes, books] = await Promise.all([
        read("quotes"),
        read("books"),
      ]);
      initQuotes(quotes, books, target);
    }
    if (page === "palettes")
      target.replaceChildren(renderPalettes(await read("palettes")));
  } catch (error) {
    console.error(error);
    const message = el(
      "p",
      "error",
      "纸页暂未展开，请刷新重试。若在本地预览，请通过 HTTP 服务打开。",
    );
    message.setAttribute("role", "alert");
    target.replaceChildren(message);
  } finally {
    target.setAttribute("aria-busy", "false");
  }
})();
