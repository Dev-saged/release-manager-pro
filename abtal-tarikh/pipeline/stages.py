"""سجلّ مراحل الإنتاج. كل مرحلة وحدة pipeline/<name>.py تعرّف run(ep, ctx) وتُضاف في مرحلة البناء المقابلة."""
import importlib

STAGES = (
    ('scripts', 2, 'نصوص مشكولة'),
    ('voice', 3, 'أصوات وتوقيت الكلمات'),
    ('sfx', 4, 'مؤثرات صوتية'),
    ('visuals', 5, 'مشاهد المخطوطة والورق المقصوص'),
    ('composer', 6, 'تركيب ومزج وتصدير'),
    ('verify', 7, 'تحقّق'),
)


class Pending(Exception):
    pass


def run(name, ep, ctx):
    try:
        mod = importlib.import_module(f'pipeline.{name}')
    except ModuleNotFoundError as e:
        if e.name == f'pipeline.{name}':
            raise Pending(name) from None
        raise
    return mod.run(ep, ctx)
