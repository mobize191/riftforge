#!/usr/bin/env python3
"""Sandbox-only helper: install Chromium system libraries without root.

Debian 13 sandbox ships without the shared libraries Chromium needs
(libglib, libnss, libX11, ...). This script downloads the required .deb
packages from deb.debian.org (trixie, amd64), extracts them into
~/pw-libs/root and writes a fontconfig config so text renders in
screenshots. Fully idempotent: re-running only downloads missing files.

Usage:
    python3 scripts/setup-pw-libs.py

Then run Playwright with (see docs/HANDOFF-R11.md):
    export LD_LIBRARY_PATH=$HOME/pw-libs/root/usr/lib/x86_64-linux-gnu:$HOME/pw-libs/root/lib/x86_64-linux-gnu
    export FONTCONFIG_FILE=$HOME/pw-libs/fonts.conf
    PORT=4173 pnpm test:e2e
"""

import pickle
import subprocess
import sys
import urllib.request
from pathlib import Path

INDEX_URL = 'http://deb.debian.org/debian/dists/trixie/main/binary-amd64/Packages.gz'
DEB_BASE = 'http://deb.debian.org/debian/'

# Chromium runtime libs + fonts (Debian trixie names, t64 suffix included).
SEEDS = [
    'libasound2t64', 'libatk1.0-0t64', 'libatk-bridge2.0-0t64', 'libatspi2.0-0t64',
    'libdbus-1-3', 'libgbm1', 'libglib2.0-0t64', 'libnspr4', 'libnss3',
    'libx11-6', 'libxcb1', 'libxcomposite1', 'libxdamage1', 'libxext6',
    'libxfixes3', 'libxkbcommon0', 'libxrandr2', 'fontconfig', 'fonts-liberation',
]

FONTS_CONF = '''<?xml version="1.0"?>
<!DOCTYPE fontconfig SYSTEM "fonts.dtd">
<fontconfig>
  <dir>{root}/usr/share/fonts</dir>
  <cachedir>{base}/fc-cache</cachedir>
</fontconfig>
'''


def load_index() -> dict:
    cache = Path('/tmp/pw-pkgs.pkl')
    if cache.exists():
        return pickle.loads(cache.read_bytes())
    raw = urllib.request.urlopen(INDEX_URL, timeout=120).read()
    import gzip
    txt = gzip.decompress(raw).decode('utf-8', 'replace')
    by = {}
    for para in txt.split('\n\n'):
        if not para.strip():
            continue
        fields = {}
        for line in para.split('\n'):
            if ':' in line and not line[0].isspace():
                key, value = line.split(':', 1)
                fields[key] = value.strip()
        if 'Package' in fields:
            by[fields['Package']] = fields
    cache.write_bytes(pickle.dumps(by))
    return by


def resolve(by: dict, seeds: list) -> set:
    seen, stack = set(), list(seeds)
    while stack:
        name = stack.pop()
        if name in seen or name not in by:
            continue
        seen.add(name)
        depends = by[name].get('Depends', '')
        for alt in depends.split(','):
            first = alt.strip().split('|')[0].strip()
            if first:
                dep = first.split()[0]
                if dep in by:
                    stack.append(dep)
    return seen


def main() -> int:
    base = Path.home() / 'pw-libs'
    root = base / 'root'
    debs = Path('/tmp/pw-debs')
    for d in (base, root, debs, base / 'fc-cache'):
        d.mkdir(parents=True, exist_ok=True)

    by = load_index()
    packages = resolve(by, SEEDS)
    print(f'{len(packages)} packages to install')
    for name in sorted(packages):
        filename = by[name]['Filename']
        target = debs / filename.split('/')[-1]
        if not target.exists():
            urllib.request.urlretrieve(DEB_BASE + filename, target)
        subprocess.run(['dpkg', '-x', str(target), str(root)], check=True)
        print('ok', name)

    fonts_conf = base / 'fonts.conf'
    fonts_conf.write_text(FONTS_CONF.format(root=root, base=base))
    print('fontconfig written:', fonts_conf)
    print('Run e2e with:')
    print(f'  export LD_LIBRARY_PATH={root}/usr/lib/x86_64-linux-gnu:{root}/lib/x86_64-linux-gnu')
    print(f'  export FONTCONFIG_FILE={fonts_conf}')
    print('  PORT=4173 pnpm test:e2e')
    return 0


if __name__ == '__main__':
    sys.exit(main())
