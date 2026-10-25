#!/usr/bin/env python3
"""把游戏打包成单一 HTML（所有 CSS / JS 内联），用于托管为单页面。
用法：python3 tools/build_single.py <输出文件>"""
import re, sys, pathlib
root = pathlib.Path(__file__).resolve().parent.parent
html = (root / 'index.html').read_text(encoding='utf-8')
css = (root / 'css/style.css').read_text(encoding='utf-8')
body = re.search(r'<body>(.*)</body>', html, re.S).group(1)
scripts = re.findall(r'<script src="([^"]+)"></script>', body)
body = re.sub(r'\s*<script src="[^"]+"></script>', '', body)
js = '\n'.join(f'// ==== {s} ====\n' + (root / s).read_text(encoding='utf-8') for s in scripts)
js = js.replace('</script', '<\\/script')
out = f'''<title>超时空英雄传说</title>
<meta name="theme-color" content="#07041a">
<style>
:root {{ color-scheme: dark; }}
html, body {{ background: #0d0a1e; }}
{css}
</style>
{body.strip()}
<script>
{js}
</script>
'''
pathlib.Path(sys.argv[1]).write_text(out, encoding='utf-8')
print('wrote', sys.argv[1], len(out) // 1024, 'KB,', len(scripts), 'scripts inlined')
