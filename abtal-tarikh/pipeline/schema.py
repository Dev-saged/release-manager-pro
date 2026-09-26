"""مدقّق JSON Schema مصغّر (المجموعة المستخدمة في schema.json) وفحوص دلالية للحلقات."""
import json
import re
from config import PATHS, VIDEO, SPEECH, SERIES, CUES, RULES

TYPES = {'object': dict, 'array': list, 'string': str, 'integer': int, 'number': (int, float), 'boolean': bool}
MARKS = set(map(chr, range(0x064B, 0x0653))) | {'\u0670'}
LETTER = re.compile(r'[\u0621-\u064A\u0671]')
WORD = re.compile(r'[\u0621-\u0652\u0670\u0671]+')
SHADDA, DAMMA, KASRA = '\u0651', '\u064F', '\u0650'
MARK_RUN = re.compile(r'[\u064B-\u0652\u0670]*')


def _resolve(root, ref):
    node = root
    for part in ref.lstrip('#/').split('/'):
        node = node[part]
    return node


def validate(inst, sch, root=None, path='$'):
    root = root or sch
    if '$ref' in sch:
        return validate(inst, _resolve(root, sch['$ref']), root, path)
    t = sch.get('type')
    if t and (not isinstance(inst, TYPES[t]) or (t in ('integer', 'number') and isinstance(inst, bool))):
        return [f'{path}: expected {t}']
    errs = []
    if 'enum' in sch and inst not in sch['enum']:
        errs.append(f'{path}: not one of {sch["enum"]}')
    if isinstance(inst, str):
        if len(inst) < sch.get('minLength', 0):
            errs.append(f'{path}: shorter than {sch["minLength"]}')
        if 'pattern' in sch and not re.search(sch['pattern'], inst):
            errs.append(f'{path}: does not match {sch["pattern"]}')
    if isinstance(inst, (int, float)) and not isinstance(inst, bool):
        if 'minimum' in sch and inst < sch['minimum']:
            errs.append(f'{path}: below {sch["minimum"]}')
        if 'maximum' in sch and inst > sch['maximum']:
            errs.append(f'{path}: above {sch["maximum"]}')
    if isinstance(inst, list):
        if len(inst) < sch.get('minItems', 0):
            errs.append(f'{path}: fewer than {sch["minItems"]} items')
        if 'items' in sch:
            for i, v in enumerate(inst):
                errs += validate(v, sch['items'], root, f'{path}[{i}]')
    if isinstance(inst, dict):
        errs += [f'{path}: missing "{k}"' for k in sch.get('required', ()) if k not in inst]
        props, extra = sch.get('properties', {}), sch.get('additionalProperties', True)
        for k, v in inst.items():
            if k in props:
                errs += validate(v, props[k], root, f'{path}.{k}')
            elif isinstance(extra, dict):
                errs += validate(v, extra, root, f'{path}.{k}')
            elif extra is False:
                errs.append(f'{path}: unexpected "{k}"')
    return errs


def bare_words(text):
    # كل حرف يحمل علامة، عدا: الألف والألف المقصورة، وحرفَي المدّ بعد حركتهما، ولام التعريف الشمسية
    bad = []
    for w in WORD.findall(text):
        for i, ch in enumerate(w):
            nxt, prev = w[i + 1:i + 2], w[i - 1:i]
            if not LETTER.match(ch) or nxt in MARKS or ch in 'اىآٱ':
                continue
            j = i
            while j and w[j - 1] in MARKS:
                j -= 1
            if (ch == 'و' and DAMMA in w[j:i]) or (ch == 'ي' and KASRA in w[j:i]):
                continue
            if ch == 'ل' and SHADDA in MARK_RUN.match(w, i + 2).group() and (prev in 'اٱ' or w[i - 2:i - 1] == 'ل'):
                continue
            bad.append(w)
            break
    return bad


def norm(text):
    return re.sub(r'[\u064B-\u0652\u0670\u0640]', '', text)


def lint_beat(where, beat, errs):
    shot, _, desc = beat.partition(':')
    low = beat.lower()
    if shot not in CUES['shots'] or not desc.strip():
        errs.append(f'{where}: visual_beat must start with one of {CUES["shots"]} + ":"')
    errs += [f'{where}: visual_beat breaks limits ("{t}")' for t in RULES['banned_visual'] if t in low]
    if any(t in low for t in RULES['battle_terms']) and shot != RULES['battle_shot']:
        errs.append(f'{where}: battle imagery must use the "{RULES["battle_shot"]}" shot')


def lint_structure(ep, errs):
    parts = [s['part'] for s in ep['scenes']]
    order = [SERIES['parts'].index(p) for p in parts]
    if order != sorted(order) or parts[0] != 'hook' or parts[-1] != 'closing' or parts.count('lesson') != 1 or 'story' not in parts:
        errs.append(f'structure must be hook → frame → story → one lesson → closing, got {parts}')
        return
    hook = ep['scenes'][0]['lines']
    if len(hook) != 1 or len(hook[0]['text_diacritized'].split()) > SPEECH['hook_max_words'] or '؟' not in hook[0]['text_diacritized']:
        errs.append(f'hook must be one question of ≤ {SPEECH["hook_max_words"]} words')
    tail = norm(' '.join(ln['text_diacritized'] for ln in ep['scenes'][-1]['lines']))
    if '؟' not in tail or 'التعليقات' not in tail:
        errs.append('closing must ask a question and invite comments')
    if set(ep['cast']) - set(SERIES['cast']):
        errs.append(f'cast limited to {tuple(SERIES["cast"])}; historical figures never speak')
    if len(ep.get('sources', ())) < RULES['min_sources']:
        errs.append(f'at least {RULES["min_sources"]} sources required')


def lint(ep):
    errs, warns = [], []
    ids = [s['id'] for s in ep['scenes']]
    if len(ids) != len(set(ids)):
        errs.append('scene ids are not unique')
    words = 0
    for s in ep['scenes']:
        errs += [f'{s["id"]}: unknown layer "{l}"' for l in s.get('layers', ()) if l not in CUES['layers']]
        for i, ln in enumerate(s['lines']):
            where = f'{s["id"]}.lines[{i}]'
            if ln['speaker'] not in ep['cast']:
                errs.append(f'{where}: speaker "{ln["speaker"]}" not in cast')
            bare = bare_words(ln['text_diacritized'])
            if bare:
                errs.append(f'{where}: text not fully diacritized → {" ".join(bare)}')
            errs += [f'{where}: unknown sfx "{x}"' for x in ln['sfx'] if x not in CUES['sfx']]
            lint_beat(where, ln['visual_beat'], errs)
            words += len(ln['text_diacritized'].split())
    if ep['number']:
        lint_structure(ep, errs)
        lo, hi = SPEECH['words']
        if not lo <= words <= hi:
            errs.append(f'{words} spoken words, need {lo}–{hi}')
    est = words / SPEECH['wps_estimate'] + SPEECH['scene_gap_s'] * len(ep['scenes'])
    if ep['number'] and not VIDEO['min_s'] <= est <= VIDEO['max_s']:
        warns.append(f'estimated runtime {est:.0f}s outside {VIDEO["min_s"]}–{VIDEO["max_s"]}s')
    return errs, warns, est


def load(path):
    ep = json.loads(path.read_text(encoding='utf-8'))
    errs = validate(ep, json.loads(PATHS['schema'].read_text(encoding='utf-8')))
    if errs:
        return ep, errs, [], 0.0
    e2, warns, est = lint(ep)
    return ep, e2, warns, est
