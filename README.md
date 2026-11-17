# 审美积累

一处关于阅读、文字与色彩的私人存档。水墨山水首页，三处水面分别通往书单、书摘与色库。纯静态 HTML / CSS / JavaScript，无框架、构建步骤或统计脚本。

## 本地预览

在仓库根目录运行：

```sh
python3 -m http.server 8000
```

打开 `http://localhost:8000`。不能用 `file://` 双击预览：浏览器无法正常 fetch JSON。字体通过 Google Fonts 加载 Noto Serif SC；离线时回退到思源宋体、宋体等本地字体。

## 文件结构

```text
index.html                 山水首页
books.html                 书单、简介对话框
quotes.html                书摘筛选、搜索与逻辑图
palettes.html              风格 / 交互收藏
css/style.css              共享视觉与响应式样式
css/cover.css              立体排版封面基础
js/home.js                 原创 Canvas 山水、滴水与涟漪
js/app.js                  数据加载、三个内页与交互
assets/ui/                 纸纹、笔形光标
assets/palettes/            收藏图像与参考预览
assets/ref/                风格参考（不作为首页背景）
assets/covers/             原始封面档案（不在站内展示）
data/books.json            书目数组
data/quotes.json           书摘数组
data/palettes.json         色库数组
```

## 添加一本书

在 `data/books.json` 数组增加对象，`id` 必须唯一。使用 `title`、`originalTitle`、`subtitle`、`author`、`authorEn`、`authorCredit`、`translator`、`publisher`、`status`、`startedAt`、可选的 `finishedAt`、`summary`。

`coverPalette` 是封面的五个六位 HEX 色值：`bg`（底色）、`title`（标题）、`text`（正文）、`spine`（书脊）、`accent`（纹饰）。封面为 CSS 3D 排版对象，**不要把原始书封照片放进页面**。`cover` 可以保留作档案来源，渲染器不读取它。

点击封面打开简介，右下页角悬停时卷起；键盘聚焦封面也会展示页角。船形链接进入 `quotes.html?book=书目id`。

## 添加真实书摘

当前没有真实书摘。JSON 中恰有一个 `sample: true` 的原创审美笔记，与任何书籍都不关联，绝不是《纳瓦尔宝典》引文。删除这个对象即可完全移除示例。它不会出现在指定书籍的筛选结果中，也不计入真实书摘数。

真实条目示意（请以核实的原文替换占位说明）：

```json
{
  "id": "唯一标识",
  "bookId": "naval-almanack",
  "page": "已核实页码",
  "chapter": "章节名",
  "text": "此处填写已核实原文；换行使用 \n",
  "summary": "自己的读后整理",
  "keyPoints": ["自己的要点"],
  "tags": ["主题"],
  "date": "2026-11-17",
  "sample": false,
  "viz": {
    "type": "flow",
    "title": "逻辑图标题",
    "nodes": [
      { "id": "a", "label": "观察" },
      { "id": "b", "label": "整理" }
    ],
    "edges": [{ "from": "a", "to": "b", "label": "联系" }]
  }
}
```

`viz` 可省略。支持 `flow`（纵向流程）、`compare`（并列对照）、`tree`（层级树）、`cycle`（环形）。节点 id 必须唯一，边引用已有节点；树应为无环图。环形未填写边时自动首尾连接。为阅读效果，建议每图 2–6 个节点，节点标签不超过 14 字。复杂图拆为较小的图。搜索覆盖原文、整理、要点、章节与标签；书籍筛选与搜索同时生效。

## 添加色库收藏

在 `data/palettes.json` 添加对象：

```json
{
  "id": "唯一标识",
  "zone": "风格",
  "category": "纸本",
  "type": "image",
  "title": "收藏名称",
  "sourceImage": "assets/palettes/example.jpg",
  "colors": [{ "hex": "#92B2A3", "name": "青灰" }],
  "file": "assets/palettes/example.pdf",
  "date": "2026-11-17",
  "sample": false
}
```

`zone` 选 `风格` 或 `交互`，`category` 可自定义，`type` 选 `image`、`ppt`、`plugin` 或 `widget`。图片放 `assets/palettes/`；`sourceImage` 显示原图或 PPT / 组件的预览图。可选 `file` 是相对路径，链接到原文件或组件静态页面；不执行 JSON 中的脚本，不自动嵌入第三方网页。组件和 PPT 建议提供截图，未提供时显示文字预览。色值为六位 HEX，支持按钮点击与键盘复制，失败时显示可手动复制的值。

目前没有正式收藏。唯一 `sample: true` 的水墨参考条目位于 `风格`；删除整个对象即可移除示例。两个分区在没有真实内容时仍显示诚实的空状态。

## 交互与维护

- 首页桌面悬停水面显示名称，点击进入；触屏第一次点击揭示，第二次进入。底部文字导航始终可用，键盘聚焦水面显示名称。
- 系统开启“减少动态效果”时展示静止山水与水面名称，无滴水或涟漪循环。
- 隐藏标签页停止动画，内页不加载首页物理循环。粒子有上限，指针涟漪节流，Canvas 像素比最高为 2。
- 全部站内资源使用相对路径，兼容根路径与 GitHub Pages 的 `/aesthetic/`。Google Fonts 为唯一外部样式资源。
- 修改 CSS / JS 后，同步更新所有引用它们的 HTML 的 `?v=` 版本（当前 `ink3`）。
- 保留 `.nojekyll`、`.github/workflows/pages.yml` 与 `.gitignore` 条目。人工推送 `main` 后由现有 GitHub Pages 工作流部署；本次改版不自动提交或推送。
