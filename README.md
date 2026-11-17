# 审美积累

纯静态单页，无构建步骤。使用本地 HTTP 服务器预览（例如 `python3 -m http.server 8000`），访问 `http://localhost:8000`；直接打开 HTML 无法通过 fetch 读取数据。

## 文件与数据

- `index.html`、`css/style.css`、`js/app.js`：页面、样式和数据渲染。
- `data/books.json`：书单数组。每项包含 `id`、`title`、`originalTitle`、`subtitle`、`author`、`authorEn`、`authorCredit`、`translator`、`publisher`、`status`（`在读` 或 `读完`）、`startedAt`（YYYY-MM-DD）、`cover`、`summary`。作者优先显示完整署名 `authorCredit`，否则组合 `author` 与 `authorEn`。
- `data/quotes.json`：书摘数组。每项包含 `id`、`bookId`（对应书的 id）、`page`、`chapter`、`text`（完整原文，换行写作 `\n`）、`summary`（读后小记）、`tags`（字符串数组）、`date`（YYYY-MM-DD）。按书分组，全文显示。
- `data/palettes.json`：配色数组。每项包含 `id`、`name`、`date`、`tags`（字符串数组）、`colors`（由 `{ "hex": "#六位色值", "name": "颜色名称" }` 组成的数组）；可选 `sourceImage` 为来源图片路径。

## 增加内容

在对应 JSON 数组中增加对象，保持合法 JSON，id 使用唯一字符串。书封面放入 `assets/covers/`，配色来源图放入 `assets/palettes/`，图片路径相对于网站根目录，例如 `assets/covers/example.jpg`。书摘的 `bookId` 与书单中的 `id` 一致。空数组会显示留白提示，不生成示例内容。

保存后提交并推送到已配置部署的仓库，或重新上传整个文件夹即可更新。所有站内路径均为相对路径，兼容域名根目录和 GitHub Pages 项目子路径；保留 `.nojekyll`。网站无追踪、无外部脚本；字体由 Google Fonts 提供，无法连接时使用本机字体。
