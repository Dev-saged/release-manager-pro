"""مدقّق JSON Schema مصغّر (المجموعة المستخدمة في schema.json) وفحوص دلالية للحلقات."""
import json
import re
from config import PATHS, VIDEO, SPEECH

TYPES = {'object': dict, 'array': list, 'string': str, 'integer': int, 'number': (int, float), 'boolean': bool}
ARABIC_LETTER = re.compile(r'[ء-ي]')
HARAKA = re.compile(r'[ً-ْ]')


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


def diacritic_ratio(text):
    letters = len(ARABIC_LETTER.findall(text))
    return len(HARAKA.findall(text)) / letters if letters else 0.0


def lint(ep):
    errs, warns = [], []
    ids = [s['id'] for s in ep['scenes']]
    if len(ids) != len(set(ids)):
        errs.append('scene ids are not unique')
    words = 0
    for s in ep['scenes']:
        for i, ln in enumerate(s['lines']):
            where = f'{s["id"]}.lines[{i}]'
            if ln['speaker'] not in ep['cast']:
                errs.append(f'{where}: speaker "{ln["speaker"]}" not in cast')
            r = diacritic_ratio(ln['text_diacritized'])
            if r < SPEECH['min_diacritic_ratio']:
                errs.append(f'{where}: text not fully diacritized ({r:.2f} marks/letter)')
            words += len(ln['text_diacritized'].split())
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
