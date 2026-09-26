# أبطال في التاريخ — خط الإنتاج

10 حلقات كرتونية عربية · 1080×1920 · 30fps · 120–180 ثانية.

## المراحل
| # | المرحلة | الوحدة | الحالة |
|---|---------|--------|--------|
| 1 | البنية | `config.py` · `build.py` · `pipeline/{deps,schema,design,stages,sample}` | ✓ |
| 2 | النصوص | `episodes/epNN.json` · `pipeline/scripts.py` | — |
| 3 | الصوت | `pipeline/voice.py` | — |
| 4 | المؤثرات | `pipeline/sfx.py` | — |
| 5 | المشاهد | `pipeline/visuals.py` | — |
| 6 | التركيب | `pipeline/composer.py` | — |
| 7 | التحقق | `pipeline/verify.py` | — |

كل مرحلة وحدة `pipeline/<name>.py` تعرّف `run(ep, ctx)`؛ `stages.py` يستدعيها بالترتيب ويعلّم الغائبة «pending».

## البيانات
`episodes/schema.json`: حلقة → `scenes[]` → `lines[]{speaker, text_diacritized, sfx[], visual_beat}`.
المدقّق (`pipeline/schema.py`) يطبّق المخطط ثم فحوصاً دلالية: المتحدث ضمن `cast`، والتشكيل ≥ 0.5 حركة لكل حرف، وتقدير المدة.

## نظام التصميم (مقفل)
مخطوطة مذهّبة × ورق مقصوص بطبقات بارالاكس. OKLCH: لازورد `0.35 0.12 260` · ذهب `0.78 0.14 85` · زمرّد `0.55 0.13 160` · حبر `0.18 0.03 260`.
درجات مشتقّة من الألوان نفسها فقط. العناوين Reem Kufi، والترجمة Readex Pro (OFL، في `assets/fonts`).
مناطق الأمان: لا محتوى في أسفل 22% (y ≥ 1497) ولا في يمين 12% (x ≥ 950).

## الأوامر
```
python build.py --setup     # حزم بايثون في .pypackages
python build.py --test      # اعتماديات + خطوط + مخطط + تباين + عيّنة out/test/sample.png
python build.py --ep N      # حلقة واحدة
python build.py --all       # الحلقات العشر
```
