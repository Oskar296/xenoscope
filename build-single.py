#!/usr/bin/env python3
"""Inline the CSS and every script into one standalone HTML file.

itch.io accepts a single .html upload as a playable browser game, so this is
the smallest thing you can hand it. Output goes to xenoscope-single.html;
rename it to index.html when you upload.

    python3 build-single.py
"""
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
SCRIPTS = ['data', 'sfx', 'sim', 'world', 'draw', 'game', 'ui', 'main']
OUT = 'xenoscope-single.html'


def read(*parts):
    with open(os.path.join(HERE, *parts), encoding='utf-8') as fh:
        return fh.read()


def main():
    html = read('index.html')

    css = read('css', 'styles.css').strip()
    link = '<link rel="stylesheet" href="./css/styles.css"/>'
    if link not in html:
        sys.exit('index.html no longer links the stylesheet the way this script expects')
    html = html.replace(link, '<style>\n%s\n</style>' % css)

    for name in SCRIPTS:
        js = read('js', '%s.js' % name).strip()
        # A literal closing tag inside a string would end the inlined block early.
        if '</script' in js.lower():
            sys.exit('%s.js contains a closing script tag and cannot be inlined as-is' % name)
        tag = '<script src="./js/%s.js"></script>' % name
        if tag not in html:
            sys.exit('index.html does not load js/%s.js the way this script expects' % name)
        html = html.replace(tag, '<script>\n/* %s.js */\n%s\n</script>' % (name, js))

    if 'src="./js' in html or 'href="./css' in html:
        sys.exit('something is still loaded from disk; the bundle would be broken')

    path = os.path.join(HERE, OUT)
    with open(path, 'w', encoding='utf-8') as fh:
        fh.write(html)
    print('%s  (%.0f KB)' % (OUT, os.path.getsize(path) / 1024))


if __name__ == '__main__':
    main()
