# 审美积累 · 滴水

私人的阅读与色彩存档。首页是一幅会动的水墨瀑布：瀑布持续下泻、水雾飘移、落水处水花与涟漪、鼠标划水起波、水底光斑；光斑里藏着三处稍亮的地方，鼠标靠近（触屏点一下）便有一只刻着「书单 / 书摘 / 色库」的石龟从水下浮起，点它进入。纯静态 HTML / CSS / JavaScript，无构建步骤，全部相对路径，GitHub Pages 推送 `main` 自动部署。

线上地址：<https://cwenqi0608-spec.github.io/aesthetic/>

## 本地预览

```sh
python3 -m http.server 8000      # 在仓库根目录
```

打开 `http://localhost:8000`。不要用 `file://` 打开，浏览器不能读取 JSON。

## 文件

```text
index.html            首页（无文字，仅左上角闲章「滴水」）
books.html            书单：立体线装书、页角卷起、简介、乘舟去书摘
quotes.html           书摘：选书、搜索、原文 + 整理 + 要点 + 水墨逻辑图，毛笔光标
palettes.html         色库：风格 / 交互两区，原图 + 提取色块（点击复制 HEX）
css/base.css          色板、字体、纸纹、闲章
css/home.css          首页
css/pages.css         三个内页
js/ripple.js          GPU 水面（高度场波动方程），首页折射、书单水纹光
js/home.js            首页：瀑布流动（双相位 flow map）、水雾、水花、水底光斑、石龟浮现、悬停 / 触屏
js/seal-glyphs.json   石龟背上的篆字轮廓（由 tools/build_falls.py 从 JFZSKSealScript 提取）
js/common.js          数据读取、笔触 / 圆相生成、墨迹光标、提示
js/books.js / quotes.js / palettes.js   三个内页
data/*.json           全部内容
assets/art/           原始画作（home-falls.jpg 首页、turtle-raw.jpg 石龟、闲章原稿；home-wide/tall 为旧版）
assets/img/           网页图（2× 放大 + 锐化，WebP / JPEG）：falls-*、falls-mask、turtle、band-* 由 tools/build_falls.py 生成，其余由 tools/build_art.py 生成
assets/fonts/         子集化字体（马善政毛笔体、思源宋体），由 tools/subset_fonts.py 生成
assets/palettes/      色库原图；assets/covers/ 封面照片存档（页面不直接展示）
tools/                build_falls.py、build_art.py、subset_fonts.py、bust.sh
```

## 添加一本书 · `data/books.json`

```json
{
  "id": "naval-almanack",
  "title": "纳瓦尔宝典",
  "originalTitle": "The Almanack of Naval Ravikant",
  "subtitle": "财富与幸福指南",
  "author": "埃里克·乔根森",
  "authorEn": "Eric Jorgenson",
  "authorCredit": "[美] 埃里克·乔根森（Eric Jorgenson）",
  "translator": "赵灿",
  "publisher": "中信出版集团",
  "status": "在读",
  "startedAt": "2026-11-17",
  "finishedAt": "",
  "summary": "简介文字",
  "coverPalette": { "bg": "#d8e0d7", "title": "#355c53", "text": "#293e38", "spine": "#a5b8ac", "accent": "#607f72" }
}
```

封面由数据排版成线装书（题签竖排书名、订线、书脊、书口、淡墨山影），`coverPalette` 决定颜色。`id` 唯一，书摘用它关联。

## 添加书摘 · `data/quotes.json`

```json
{
  "id": "naval-001",
  "bookId": "naval-almanack",
  "chapter": "章节",
  "page": "页码",
  "text": "截图里高亮的原文，逐字照录；换行写 \n",
  "summary": "整理：用自己的话概括",
  "keyPoints": ["要点一", "要点二"],
  "tags": ["财富", "杠杆"],
  "date": "2026-11-18",
  "viz": { "type": "flow", "title": "图题", "nodes": [{ "id": "a", "label": "专长" }, { "id": "b", "label": "杠杆" }], "edges": [{ "from": "a", "to": "b", "label": "放大" }] }
}
```

`viz` 可省略；逻辑性强的摘录才画图，以笔触与圆相绘制：

- `flow` 流程：`nodes` + `edges`（手机上自动改为竖排）
- `cycle` 循环：`nodes`，`edges` 可省略（自动首尾相连），可加 `center` 写中心词
- `tree` 层级：`nodes` + `edges`，无入边的节点为根
- `compare` 对照：`"columns": [{ "title": "短期", "items": ["…"] }, { "title": "长期", "items": ["…"] }]`

现在没有真实书摘。唯一一条 `"sample": true` 的条目是原创示例（`bookId` 为空，不归属任何书），只在「全部」里出现并标「示例」；有了真实书摘后删掉它即可。

## 添加色库 · `data/palettes.json`

```json
{
  "id": "唯一标识",
  "zone": "风格",
  "category": "海报",
  "type": "image",
  "title": "名称",
  "note": "可选说明",
  "sourceImage": "assets/palettes/xxx.jpg",
  "colors": [{ "hex": "#92B2A3", "name": "青灰", "weight": 2 }],
  "file": "assets/palettes/xxx.pptx",
  "embed": "assets/palettes/widget/index.html",
  "date": "2026-11-18"
}
```

`zone` 为 `风格` 或 `交互`（写别的名字会自动新开一区）；`category` 自定，同类自动归组；`type` 为 `image`、`ppt`、`widget`（交互插件）。原图保留展示，色块单独陈列，点击复制 HEX。`weight` 控制原图下方色带比例。交互插件用 `embed` 指向仓库内的静态页面（沙盒 iframe）。目前唯一一条 `sample: true` 为示例。

## 修改之后

1. 新增了书名、标题等新汉字时运行 `python3 tools/subset_fonts.py`（需要 `pip install fonttools brotli`，并把完整字体放进 `tools/fonts-src/`：MaShanZheng-Regular.ttf、NotoSerifSC[wght].ttf，均为 OFL 开源字体）。没跑也能显示，只是生字会回退到系统字体。
2. 换了首页画作运行 `python3 tools/build_falls.py`（瀑布 / 水面 / 水雾遮罩的多边形写在脚本顶部，按 1280×720 原画像素）；光斑与石龟位置在 `js/home.js` 顶部 `ART.spots`。注意 `tools/build_art.py` 也会写 band-* 图，只需重做纸纹 / 闲章时再运行它，并随后重跑 build_falls.py。
3. 提交后运行 `sh tools/bust.sh` 再提交一次，所有 `?v=` 换成当前提交号，浏览器立即取新版。

## 动效与无障碍

- 一个 WebGL2 全屏片元着色器完成全部水面效果：高度场水波（jquery.ripples 式折射 + 高光，MIT 思路移植，无 jQuery）、瀑布双相位流动采样（无接缝，越往下越快）、fbm 水雾、Voronoi 水底光斑；水花与细水线在一层 2D canvas 上按重力（1 原画像素 ≈ 3 cm，g ≈ 327 px/s²）运动。
- 石龟：透明底石龟图 + 代码刻字（阴刻 + 高光斜面），浮起时由模糊到清晰、透明到实、略放大并上移，水下时随水波折射；出水激起涟漪，浮着时轻轻划水；鼠标离开即沉下。
- 触屏：第一次点光斑浮起石龟，第二次点进入。光斑链接有 `aria-label`，Tab 聚焦即浮起，Enter 进入。
- 系统开启「减少动态效果」时画面静止、无粒子，悬停时石龟直接出现；标签页隐藏时暂停。

## 字体与授权

石龟背上的篆字取自 **JFZSKSealScript（经峰说文篆书）V3.5**，作者 Jingfeng Liu，SIL Open Font License 1.1（全文见 `assets/fonts/OFL-JFZSKSealScript.txt`）。仓库只保存提取出的 6 个字形轮廓（`js/seal-glyphs.json`），不分发、不改名字体文件，保留字体名 JFZSKSealScript 未被使用。
