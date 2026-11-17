"""Subset the two web fonts to the characters the site uses.
Run after adding data:  python3 tools/subset_fonts.py  (needs fonttools + brotli,
and the full fonts in tools/fonts-src/: MaShanZheng-Regular.ttf, NotoSerifSC[wght].ttf)."""
import glob, os, subprocess, sys
os.chdir(os.path.join(os.path.dirname(__file__), '..'))
text = set()
for f in glob.glob('*.html') + glob.glob('js/*.js') + glob.glob('data/*.json') + ['README.md']:
    text |= set(open(f, encoding='utf-8').read())
common = '的一是不了人我在有他这中大来上个国到说们为子和你地出道也时年得就那要下以生会自着去之过家学对可她里后小么心多天而能好都然没日于起还发成事只作当想看文无开手十用主行方又如前所本见经头面公同三已老从动两长知民样现分将外但身些与高意进把法此实回二理美点月明其种声全工己话儿者向情部正名定女问力机给等几很业最间新什打便位因重被走电四第门相次东政海口使教西再平真听世气信北少关并内加化由却代军产入先山五太水万市眼体别处总才场师书比住员九笑性通目华报立马命张活难神数件安表原车白应路期叫死常提感金何更反合放做系计或司利受光王果亲界及今京务制解各任至清物台象记边共风战干接它许八特觉望直服毛林题建南度统色字请交爱让认算论百吃义科怎元社术结六功指思非流每青管夫连远资队跟带花快条院变联言权往展该领传近留红治决周保达办运武半候七必城父强步完革深区即求品士转量空甚众技轻程告江语英基派满式李息写呢识极令黄德收脸钱党倒未持取设始版双历越史商千片容研像找友孩站广改议形委早房音火际则首单直阅读摘录搜索全部暂无示例简介要点整理图库风格交互复制已返回首页书摘书单色库滴水笔墨纸砚：，。、；！？「」『』《》（）—…·〈〉'
text |= set(common)
text |= set(''.join(chr(c) for c in range(0x20, 0x7f)))
chars = ''.join(sorted(c for c in text if c.isprintable()))
open('/tmp/subset-chars.txt', 'w', encoding='utf-8').write(chars)
src = 'tools/fonts-src'
jobs = [(f'{src}/MaShanZheng-Regular.ttf', 'assets/fonts/brush.woff2'), (f'{src}/NotoSerifSC[wght].ttf', 'assets/fonts/serif.woff2')]
for a, b in jobs:
    subprocess.run([sys.executable, '-m', 'fontTools.subset', a, '--text-file=/tmp/subset-chars.txt', f'--output-file={b}', '--flavor=woff2', '--layout-features=*', '--no-hinting'], check=True)
    print(b, os.path.getsize(b) // 1024, 'KB')
