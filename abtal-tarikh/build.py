#!/usr/bin/env python3
"""«أبطال في التاريخ» — واجهة البناء: python build.py --ep N | --all | --test | --setup"""
import argparse
import hashlib
import json
import sys
import config
from pipeline import deps, design, schema, stages, sample


def ep_path(n):
    return config.PATHS['episodes'] / f'ep{n:02d}.json'


def build_episode(n):
    path = ep_path(n)
    tag = f'ep{n:02d}'
    if not path.is_file():
        print(f'{tag}: script missing → {path.relative_to(config.ROOT)}')
        return False
    ep, errs, warns, est = schema.load(path)
    for m in errs:
        print(f'{tag}: ✗ {m}')
    for m in warns:
        print(f'{tag}: ! {m}')
    if errs:
        return False
    print(f'{tag}: «{ep["title"]}» · {len(ep["scenes"])} scenes · ~{est:.0f}s')
    ctx = {'tag': tag, 'out': config.PATHS['out'] / tag, 'cache': config.PATHS['cache'] / tag}
    for name, phase, desc in stages.STAGES:
        try:
            stages.run(name, ep, ctx)
            print(f'  ✓ {name:<9} {desc}')
        except stages.Pending:
            print(f'  · {name:<9} pending (phase {phase})')
            return False
    return True


def check_fonts():
    ok = True
    for role, f in config.FONTS.items():
        p = config.PATHS['fonts'] / f['file']
        good = p.is_file() and p.read_bytes()[:4] in (b'\x00\x01\x00\x00', b'true') and (config.PATHS['fonts'] / f['license']).is_file()
        ok &= good
        digest = hashlib.sha256(p.read_bytes()).hexdigest()[:12] if p.is_file() else '—'
        print(f'  {"✓" if good else "✗"} {role:<9} {f["family"]} · {digest}')
    return ok


def check_schema():
    ep, errs, _, _ = schema.load(config.PATHS['fixture'])
    bad = {**ep, 'scenes': [{**ep['scenes'][0], 'lines': [{**ep['scenes'][0]['lines'][0], 'text_diacritized': 'نص بلا تشكيل', 'speaker': 'ghost'}]}]}
    e2, _, _ = schema.lint(bad)
    caught = sum('diacritized' in m or 'not in cast' in m for m in e2) == 2
    extra = schema.validate({**ep, 'x': 1}, json.loads(config.PATHS['schema'].read_text(encoding='utf-8')))
    ok = not errs and caught and bool(extra)
    print(f'  {"✓" if ok else "✗"} fixture valid · rejects undiacritized text, unknown speaker, extra keys' + ('' if ok else f' · {errs or e2 or extra}'))
    return ok


def check_design():
    x0, y0, x1, y1 = design.SAFE_BOX
    pairs = (('gold', 'lapis'), ('gold', 'ink'), ('parchment', 'ink'), ('parchment', 'lapis_deep'))
    ratios = {f'{a}/{b}': design.contrast(a, b) for a, b in pairs}
    ok = all(r >= 4.5 for r in ratios.values())
    print(f'  {"✓" if ok else "✗"} safe box x<{x1} y<{y1} · ' + ' · '.join(f'{k} {v:.1f}' for k, v in ratios.items()))
    return ok


def selftest():
    print('dependencies'); ok = deps.report()
    print('fonts'); ok &= check_fonts()
    print('schema'); ok &= check_schema()
    print('design'); ok &= check_design()
    print('sample')
    png = config.PATHS['out'] / 'test' / 'sample.png'
    try:
        r = sample.render(png)
        loaded = {f.split(':')[0] for f in r['faces'] if f.endswith(':loaded')}
        need = {f['family'] for f in config.FONTS.values()}
        good = need <= loaded and not r['errors']
        print(f'  {"✓" if good else "✗"} {png.relative_to(config.ROOT)} · fonts {", ".join(sorted(loaded)) or "none"}')
        ok &= good
    except Exception as e:
        print(f'  ✗ render failed: {e}')
        ok = False
    print('OK' if ok else 'FAILED')
    return ok


def main():
    ap = argparse.ArgumentParser(description=f'{config.SERIES["title"]} v{config.VERSION}')
    g = ap.add_mutually_exclusive_group(required=True)
    g.add_argument('--ep', type=int, choices=range(1, config.SERIES['episodes'] + 1), metavar='N')
    g.add_argument('--all', action='store_true')
    g.add_argument('--test', action='store_true')
    g.add_argument('--setup', action='store_true')
    a = ap.parse_args()
    if a.setup:
        return 0 if deps.setup() and deps.report() else 1
    if a.test:
        return 0 if selftest() else 1
    if not deps.report():
        return 1
    eps = range(1, config.SERIES['episodes'] + 1) if a.all else (a.ep,)
    return 0 if all([build_episode(n) for n in eps]) else 1


if __name__ == '__main__':
    sys.exit(main())
