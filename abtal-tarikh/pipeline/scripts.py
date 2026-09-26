"""مرحلة النصوص: تسطيح الحلقة إلى أسطر مرقّمة لمراحل الصوت والمشاهد، ونسخة مقروءة للمراجعة."""
import json
from config import SERIES


def lines(ep):
    for s in ep['scenes']:
        for i, ln in enumerate(s['lines'], 1):
            yield {'id': f'{s["id"]}.l{i:02d}', 'scene': s['id'], 'part': s['part'], **ln}


def markdown(ep):
    out = [f'# {SERIES["title"]} — {ep["title"]}', '', f'{ep["hero"]["name"]} · {ep["hero"]["era"]}', '']
    for s in ep['scenes']:
        out += [f'## {s["id"]} · {s["part"]} · {s["setting"]}', '']
        for ln in s['lines']:
            sfx = f' 〔{", ".join(ln["sfx"])}〕' if ln['sfx'] else ''
            out += [f'**{ep["cast"][ln["speaker"]]["role"]}:** {ln["text_diacritized"]}{sfx}', f'> {ln["visual_beat"]}', '']
    out += ['## المصادر', ''] + [f'- {src}' for src in ep.get('sources', ())]
    return '\n'.join(out) + '\n'


def run(ep, ctx):
    ctx['out'].mkdir(parents=True, exist_ok=True)
    ctx['cache'].mkdir(parents=True, exist_ok=True)
    (ctx['out'] / 'script.md').write_text(markdown(ep), encoding='utf-8')
    (ctx['cache'] / 'lines.json').write_text(json.dumps(list(lines(ep)), ensure_ascii=False, indent=1), encoding='utf-8')
