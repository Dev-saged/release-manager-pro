"""قواعد الإشارات البصرية: كل «لقطة: وصف» في النصوص تتحوّل إلى توجيهات حركة يقرؤها العارض (visuals/*.js).
لا يُرسم شيء غير مشتقّ من الإشارة أو من طبقات المشهد؛ القاعدة التي لا تطابق شيئاً تُكشف في الاختبار."""
import re

# أفعال فارس وتعابيره في لقطات المكتبة والختام
FARIS = (
    (r'walks in', ('walk:in',)),
    (r'steps down a ladder', ('walk:ladder',)),
    (r'slides closer', ('move:closer',)),
    (r'lean(s|ing)?\b|peers into', ('pose:lean',)),
    (r'reacts', ('pose:lean', 'expr:wow')),
    (r'grips the edge', ('pose:grip', 'expr:tense')),
    (r'sits back', ('pose:sit_back',)),
    (r'sits up', ('pose:sit_up',)),
    (r'sits on the edge', ('pose:sit_edge',)),
    (r'sits cross-legged', ('pose:cross_legged',)),
    (r'hugs his knees', ('pose:hug_knees',)),
    (r'rests his chin on his hands', ('pose:chin_hands',)),
    (r'rests his chin on the desk', ('pose:chin_desk',)),
    (r'tilts his head', ('pose:tilt',)),
    (r'turns to the viewer', ('look:viewer', 'pose:face')),
    (r'looks up at grandpa|looks at grandpa', ('look:grandpa',)),
    (r'looks up from the page', ('look:up',)),
    (r'looks at the shelves|looks from', ('gest:look_around',)),
    (r'counts?\b.*fingers|counting .*fingers|counts the (drawings|paper towers|paper ships)', ('gest:count',)),
    (r'counts the cities|traces|follows the gold route', ('gest:trace',)),
    (r'points?\b', ('gest:point',)),
    (r'taps his own tooth', ('gest:tap_tooth',)),
    (r'taps (the|his)?(?! his own)', ('gest:tap',)),
    (r'draws a zero in the air', ('gest:draw_air',)),
    (r'pulls a notebook', ('gest:pull', 'hold:notebook')),
    (r'notebook open', ('hold:notebook',)),
    (r'holds? up his phone|holding up his phone|phone in his pocket', ('hold:phone',)),
    (r'hugging a thick old book', ('hold:bigbook',)),
    (r'hugs the big book', ('hold:bigbook', 'gest:hug')),
    (r'picks a small book|holding his chosen book', ('hold:book',)),
    (r'holding a small paper compass', ('hold:compass',)),
    (r'holding a small paper ship', ('hold:ship',)),
    (r'holding the pinhole curtain', ('hold:curtain',)),
    (r'holds the book open to the blank pages|turns past the last story', ('hold:blank', 'book:open')),
    (r'turns to the last pages', ('gest:turn_page',)),
    (r'closes his hands around the lamp', ('gest:cup_lamp',)),
    (r'mimes holding a warm loaf', ('gest:mime_loaf',)),
    (r'mimes a traffic signal', ('gest:mime_signal',)),
    (r'puts his eye near the pinhole', ('gest:peer',)),
    (r'drags a very thick book', ('gest:drag_book', 'book:closed')),
    (r'spins an imaginary globe', ('gest:spin_globe',)),
    (r'stretches his arms wide', ('gest:stretch',)),
    (r'folds a corner of the map', ('gest:fold_map',)),
    (r'claps', ('gest:clap',)),
    (r'shakes his head', ('gest:shake',)),
    (r'wipes his eyes', ('gest:wipe_eyes', 'look:grandpa')),
    (r'nods', ('gest:nod',)),
    (r'laughs', ('gest:laugh',)),
    (r'repeats the word slowly', ('expr:focus',)),
    (r'eyes wide|amazed', ('expr:wide',)),
    (r'puzzled', ('expr:puzzled',)),
    (r'thinking|thoughtfully', ('expr:think',)),
    (r'smil', ('expr:smile',)),
    (r'grins proudly', ('expr:grin', 'pose:proud')),
    (r'surprised', ('expr:wow',)),
    (r'delighted|in wonder', ('expr:delight',)),
    (r'narrows his eyes', ('expr:squint',)),
    (r'eyebrows raised|raises his eyebrows', ('expr:brows',)),
    (r'holds his breath', ('expr:breath',)),
    (r'worried', ('expr:worried',)),
    (r'frowns', ('expr:frown',)),
    (r'curious|listening|stares', ('expr:focus',)),
    (r'lowers his eyes', ('expr:down',)),
)

GRANDPA = (
    (r'sits at the desk', ('pose:rest',)),
    (r'pats the heavy closed book', ('gest:pat', 'book:closed')),
    (r'turns the heavy book toward faris', ('gest:turn_book', 'book:closed')),
    (r'makes room', ('gest:make_room',)),
    (r'turns the page', ('gest:turn_page',)),
    (r'dims the lamp', ('lamp:dim', 'gest:reach_lamp')),
    (r'pins a tiny hole', ('curtain:pinhole',)),
    (r'relights the lamp', ('lamp:on', 'gest:reach_lamp')),
    (r'opens the book|lifts the cover', ('gest:lift_cover', 'book:open')),
    (r'dust motes', ('fx:dust',)),
    (r'ruffles faris', ('gest:ruffle',)),
    (r'smooths the page', ('gest:smooth',)),
    (r'closes the (thick )?book', ('gest:close_book', 'book:closed')),
    (r'folds the map back', ('gest:fold_map', 'map:off', 'book:closed')),
    (r'glint runs along its spine', ('fx:glint',)),
    (r'taps the drawing', ('gest:tap',)),
    (r'rests his hand gently', ('gest:rest_hand',)),
    (r'blank pages catch the lamp light', ('fx:page_glow',)),
    (r'nods toward the shelves', ('gest:nod', 'look:shelves')),
    (r'nods', ('gest:nod',)),
    (r'smil', ('expr:smile',)),
    (r'raises an eyebrow', ('expr:brow',)),
)

# مشهد المكتبة بلا فاعل صريح
ROOM = (
    (r'thin gold beam crosses the dark room', ('fx:beam', 'lamp:dim', 'curtain:pinhole')),
)

HOOK = (
    (r'digits', 'digits'), (r'message slip', 'slip'), (r'instruments', 'instruments'), (r'paper eyes', 'eyes'),
    (r'thick paper book', 'book'), (r'olive branch', 'olive'), (r'dotted route', 'route'), (r'ship rolls up', 'ship'),
    (r'paper lamp', 'lamp'), (r'question mark', 'question'),
)

LESSON = (
    (r'compass', 'compass_map'), (r'block splits', 'steps'), (r'magnifying lens', 'lens'), (r'stitch', 'stitch'),
    (r'four gold icons', 'icons'), (r'bridge of gold pages', 'bridge'), (r'balance scale', 'scale'),
    (r'closed paper door', 'door'), (r'bind together', 'bind'), (r'olive tree stands firm', 'olive_roots'),
)

OBJECT = (
    (r'great rock', 'rock'), (r'question mark in its margin', 'margin_q'), (r'small paper ship sits on the desk', 'desk_ship'),
    (r'word al-jabr', 'title_lift'), (r'number tiles', 'tiles'), (r'recipe card', 'recipe'), (r'digit one', 'hundred'),
    (r'market scale', 'icons3'), (r'chain of gold rings', 'rings'), (r'each ring of the chain lights', 'rings_light'),
    (r'one ring of the paper chain goes grey', 'rings_break'), (r'carved stand', 'book_stand'),
    (r'thirty paper volumes', 'volumes'), (r'old gold drawing slides beside', 'tool_match'), (r'tooth and a splinted arm', 'tooth_arm'),
    (r"physician's name", 'name_ink'), (r'upside-down paper street', 'obscura'), (r'flip the paper street', 'obscura_rays'),
    (r'rays shoot out from a paper eye', 'rays_doubt'), (r'bounces off a paper mirror', 'optics'), (r'rays reverse', 'rays_reverse'), (r'drawing of the eye', 'eye_layers'),
    (r'paper lens, an eye diagram', 'optics_row'), (r'herbs', 'herbs'), (r'second thick paper volume', 'second_volume'),
    (r'stack into a bound book', 'pages_bind'), (r'heavy paper chain', 'harbour_chain'), (r'paper purse', 'purse'),
    (r"teacher's small lamp", 'ledge_lamp'),
)

POPUP = (
    (r'strait of sea and gold cliffs', ('cliffs', 'sea')), (r'commander silhouette', ('commander',)),
    (r'ships?\b', ('ships',)), (r'lapis sails', ('sails_lapis',)), (r'gold sails', ('sails_gold',)),
    (r'white walls|white houses', ('white_houses',)), (r'gate opens|open gate|through the open', ('gate_open',)),
    (r'towers?', ('towers',)), (r'bridge', ('bridge',)), (r'hill', ('hills',)), (r'arches', ('arches',)),
    (r'domes?', ('domes',)), (r'palm', ('palms',)), (r'lamps light up in library windows|library windows glow', ('windows_glow',)),
    (r'hall of arches|scholar silhouettes at low desks', ('hall',)), (r'scrolls', ('scrolls',)),
    (r'translator silhouettes', ('translators',)), (r'boy silhouette walks', ('boy_walk',)),
    (r'boy silhouette sits in a circle|in a circle of scholar|students? silhouettes sit around|scholar silhouettes talk around', ('circle',)),
    (r'lamp between them|around a lamp|by lamplight', ('lamp',)), (r'travelers|traveler silhouette', ('travelers',)),
    (r'bundles', ('bundles',)), (r'horseshoe arches .* stretch', ('arch_rows',)), (r'physician silhouette arranges', ('physician',)),
    (r'holds up a single instrument', ('teacher_holds',)), (r'measuring with a rod', ('measure',)), (r'nile', ('nile',)),
    (r'lamp, a screen and a mirror', ('optics_table',)), (r'globe', ('globe',)), (r'ring of light', ('globe_ring',)),
    (r'gold thread wraps', ('globe_thread',)), (r'listens from a doorway', ('doorway',)), (r'stack of paper books that grows', ('book_stack',)),
    (r'scholar silhouette writes', ('scholar_write',)), (r'palace gates', ('palace_gates',)), (r'library of many rooms', ('library_rooms',)), (r'climbs a ladder', ('ladder',)),
    (r'mosque under a crescent moon', ('crescent',)), (r'fortress', ('fortress',)), (r'rider silhouettes', ('riders',)),
    (r'lake', ('lake',)), (r'banners appear', ('banners_rise',)), (r'dome of the rock', ('dome_rock',)),
    (r'chronicle in another script', ('chronicle',)), (r'banners lower', ('banners_lower',)), (r'road', ('road',)),
    (r'staff', ('staff',)), (r'looks back once', ('look_back',)), (r'caravan', ('caravan',)), (r'courtyard', ('courtyard',)),
    (r'camels, horses and a sailing ship', ('procession',)), (r'scribe silhouette writes', ('scribe',)),
    (r'prince silhouette studies', ('prince_study',)), (r'books stacked neatly', ('prince_books',)), (r'starry sky', ('stars',)),
    (r'wooden rails', ('rails',)), (r'rope teams', ('rope_teams',)), (r'float inside the harbour', ('harbour',)),
    (r'markets, schools and new domes', ('city_grow',)), (r'sun climbs|sun rises', ('sun_rise',)),
    (r'village in the green hills', ('village',)), (r'wooden boards under an olive tree', ('olive_school',)),
    (r'campfire', ('campfire',)), (r'olive tree grows', ('olive_grow',)), (r'still-lit lamp', ('lamp',)),
    (r'green mountains and olive trees', ('green', 'olives')), (r'spills over the desk', ('map_spill',)),
    (r'book opens|opens the book|page unfolds|\brises?\b|pops up|unfolds|unrolls', ('rise',)),
    (r'manuscript page', ('manuscript',)), (r'illumination draws', ('illumination',)), (r'at dawn|at sunrise', ('dawn',)), (r'under a lapis sky', ('lapis_sky',)),
    (r'two shores', ('two_shores',)), (r'river|tigris', ('river',)), (r'citadel', ('citadel',)),
    (r'instrument drawings|gold line drawings of slender instruments', ('drawings',)), (r'teacher silhouette', ('teacher',)),
)

SILHOUETTE = (
    (r'two paper armies', ('armies',)), (r'banners', ('banners',)), (r'gold horizon', ('gold_horizon',)), (r'river', ('river',)),
    (r'lake', ('lake',)), (r'walls', ('walls',)), (r'gate that opens|great gate that opens', ('gate_open',)),
    (r'sunrise', ('sunrise',)), (r'fortress rises stone by stone', ('fortress_rise',)), (r'cannon shapes', ('cannons',)),
    (r'horse riders', ('riders',)), (r'green ridges', ('ridges',)), (r'towers', ('towers',)),
)

# أسماء الأماكن على الخرائط: خط الطول، العرض، الاسم العربي
PLACES = {
    'tangier': (-5.81, 35.77, 'طنجة'), 'strait': (-5.45, 35.98, 'المضيق'), 'cordoba': (-4.78, 37.88, 'قرطبة'),
    'toledo': (-4.02, 39.86, 'طليطلة'), 'fes': (-5.00, 34.03, 'فاس'), 'cairo': (31.24, 30.04, 'القاهرة'),
    'baghdad': (44.36, 33.31, 'بغداد'), 'basra': (47.78, 30.51, 'البصرة'), 'khwarazm': (60.36, 41.38, 'خوارزم'),
    'bukhara': (64.42, 39.77, 'بخارى'), 'mecca': (39.83, 21.42, 'مكة'), 'damascus': (36.29, 33.51, 'دمشق'),
    'jerusalem': (35.23, 31.78, 'القدس'), 'tikrit': (43.68, 34.60, 'تكريت'), 'hamadan': (48.51, 34.80, 'همذان'),
    'rayy': (51.43, 35.60, 'الري'), 'isfahan': (51.67, 32.65, 'أصفهان'), 'constantinople': (28.98, 41.01, 'القسطنطينية'),
    'china': (118.6, 24.9, 'الصين'), 'mali': (-3.00, 16.77, 'مالي'), 'benghazi': (20.07, 32.12, 'برقة'),
    'bologna': (11.34, 44.49, 'بولونيا'), 'paris': (2.35, 48.86, 'باريس'), 'oxford': (-1.26, 51.75, 'أكسفورد'),
    'montpellier': (3.88, 43.61, 'مونبلييه'), 'padua': (11.88, 45.41, 'بادوفا'), 'mid_sea': (17.5, 35.2, ''),
}
MAP_WORDS = (
    (r'tangier', 'tangier'), (r'narrow strait', 'strait'), (r'khwarazm', 'khwarazm'), (r'baghdad', 'baghdad'),
    (r'mediterranean', 'mid_sea'), (r'bukhara', 'bukhara'), (r'mecca', 'mecca'), (r'egypt', 'cairo'), (r'cairo', 'cairo'),
    (r'\bsham\b', 'damascus'), (r'damascus', 'damascus'), (r'arabia', 'mecca'), (r'\biraq\b', 'baghdad'), (r'persia', 'isfahan'),
    (r'cordoba', 'cordoba'), (r'toledo', 'toledo'), (r'basra', 'basra'), (r'tikrit', 'tikrit'), (r'china', 'china'),
    (r'morocco', 'fes'), (r'mali', 'mali'), (r"libya", 'benghazi'),
    (r'europe(an)? (university towns|cities)|to europe', ('bologna', 'paris', 'oxford', 'montpellier')),
)
MAP_TAGS = (
    (r'route|gold line|travel', 'route'), (r'caravan', 'caravan'), (r'rider silhouette', 'rider'), (r'digits', 'digits'),
    (r'copies of the book|the book travels|paper book from', 'book'), (r'lights? up|marked in gold', 'markers'),
    (r'gold circle is drawn', 'circle'), (r'regions slide together', 'stitch'), (r'world map', 'world'),
    (r'coordinate lines', 'graticule'), (r'dark paper ships approach', 'ships_approach'), (r'north africa', 'north_africa'),
    (r'one for every city', 'many_markers'), (r'hops between cities', 'hops'), (r'curls back', 'curl'),
)
EUROPE = ('bologna', 'paris', 'oxford', 'montpellier', 'padua')
# منشأ الطريق إلى أوروبا حين تبدأ الإشارة بها: القانون تُرجم في طليطلة
MAP_ORIGIN = {'ep06': ('hamadan', 'toledo')}
# مسارات موثّقة حين لا تسمّي الإشارة المدن: رحلة ابن سينا، وانتقال القانون إلى أوروبا، ومصر والشام لصلاح الدين
MAP_DEFAULTS = {
    ('ep06', 'hops'): ('bukhara', 'khwarazm', 'rayy', 'hamadan', 'isfahan'),
    ('ep07', 'stitch'): ('cairo', 'damascus'),
    ('ep03', 'many_markers'): ('bukhara', 'baghdad', 'cairo', 'damascus', 'mecca', 'cordoba', 'fes', 'constantinople', 'isfahan', 'khwarazm', 'basra', 'china', 'mali'),
    ('ep09', 'circle'): ('constantinople',),
    ('ep10', 'ships_approach'): ('benghazi',),
    ('ep08', 'markers'): ('tangier',),
}

CITIES = (
    (r'tangier', 'tangier'), (r'toledo', 'toledo'), (r'cordoba', 'cordoba'), (r'baghdad', 'baghdad'), (r'bukhara', 'bukhara'),
    (r'basra', 'basra'), (r'nile|cairo', 'cairo'), (r'tikrit', 'tikrit'), (r'jerusalem|dome of the rock', 'jerusalem'),
    (r'\bfes\b', 'fes'), (r'city on two shores|harbour|paper city fills', 'constantinople'), (r'barqa', 'barqa'),
)


def _match(table, text):
    hits, out = [], []
    for pat, val in table:
        if re.search(pat, text):
            hits.append(pat)
            out.extend(val if isinstance(val, tuple) else (val,))
    return hits, out


def _first(table, text):
    return next((val for pat, val in table if re.search(pat, text)), None)


def _actor(clause, who):
    hits, toks = _match(FARIS if who == 'faris' else GRANDPA, clause)
    act = {}
    for tok in toks:
        k, v = tok.split(':', 1)
        if k in ('gest', 'expr', 'hold', 'look') and k in act:
            continue
        act[k] = v
    return hits, act


def parse(beat, layers, speaker, ep_id='ep00'):
    shot, _, desc = beat.partition(':')
    shot, text = shot.strip(), desc.strip().lower()
    d = {'shot': shot, 'text': desc.strip(), 'layers': list(layers), 'speaker': speaker, 'actors': {}, 'state': {}, 'fx': [], 'matched': []}
    if shot in ('library', 'closing'):
        clauses = re.split(r';| and (?=grandpa|faris)|, then ', text)
        subject = None
        for c in clauses:
            who = 'grandpa' if c.strip().startswith('grandpa') else 'faris' if c.strip().startswith('faris') else None
            if who:
                subject = subject or who
                hits, act = _actor(c, who)
                d['matched'] += hits
                d['actors'].setdefault(who, {}).update({k: v for k, v in act.items() if k not in ('book', 'lamp', 'map', 'curtain', 'fx')})
                for k, v in act.items():
                    if k in ('book', 'lamp', 'map', 'curtain'):
                        d['state'][k] = v
                    elif k == 'fx':
                        d['fx'].append(v)
        hits, toks = _match(ROOM, text)
        d['matched'] += hits
        for tok in toks:
            k, v = tok.split(':', 1)
            (d['fx'].append(v) if k == 'fx' else d['state'].__setitem__(k, v))
        d['subject'] = subject or ('wall' if 'beam' in d['fx'] else None)
        if 'faris' in d['actors'] and 'faris' in text.split('grandpa', 1)[-1] and subject == 'grandpa':
            d['actors']['faris'].setdefault('look', 'grandpa')
    elif shot == 'hook':
        d['motif'] = _first(HOOK, text) or 'question'
        d['matched'].append(d['motif'])
    elif shot == 'lesson':
        d['emblem'] = _first(LESSON, text)
        d['matched'] += [d['emblem']] if d['emblem'] else []
    elif shot == 'object':
        d['object'] = _first(OBJECT, text)
        d['matched'] += [d['object']] if d['object'] else []
    elif shot == 'popup':
        hits, d['tags'] = _match(POPUP, text)
        d['city'] = _first(CITIES, text)
        d['matched'] += hits
        if re.search(r'book opens|opens the book|page unfolds', text):
            d['state']['book'] = 'open'
        if 'relights the lamp' in text:
            d['state']['lamp'] = 'on'
        if 'map_spill' in d['tags']:
            d['state']['map'] = 'on'
    elif shot == 'silhouette':
        hits, d['tags'] = _match(SILHOUETTE, text)
        d['matched'] += hits
    elif shot == 'map':
        places, tags = [], []
        for pat, val in MAP_WORDS:
            for m in re.finditer(pat, text):
                places.append((m.start(), val))
        d['places'] = []
        for _, val in sorted(places):
            for p in (val if isinstance(val, tuple) else (val,)):
                if p not in d['places']:
                    d['places'].append(p)
        hits, tags = _match(MAP_TAGS, text)
        d['tags'] = tags
        for tag in sorted(tags, key=lambda t: t == 'route'):
            if (ep_id, tag) in MAP_DEFAULTS and not d['places']:
                d['places'] = list(MAP_DEFAULTS[ep_id, tag])
        if d['places'] and set(d['places']) <= set(EUROPE) and ep_id in MAP_ORIGIN:
            d['places'] = list(MAP_ORIGIN[ep_id]) + d['places']
        d['matched'] += hits + d['places']
    if re.search(r'open (page|book)|last pages', text):
        d['state'].setdefault('book', 'open')
    return d


def coverage(d):
    """ما لم يُترجَم من الإشارة إلى حركة: فاعل بلا فعل، أو لقطة بلا عنصر."""
    if d['shot'] in ('library', 'closing'):
        if d['subject'] in ('faris', 'grandpa') and not d['actors'].get(d['subject']):
            return f'{d["subject"]} action not recognized'
        return None if d['matched'] else 'no action recognized'
    return None if d['matched'] else f'{d["shot"]}: no element recognized'
