# وثيقة معمارية برمجية: Release Manager Pro

تصف هذه الوثيقة البنية المعمارية والقرارات التصميمية الخاصة بتطبيق **Release Manager Pro**، وهو نظام متكامل لإدارة وإصدار المشاريع البرمجية وتحليلها.

---

## 1. نظرة عامة

تطبيق **Release Manager Pro** هو أداة ويب متكاملة تتيح للمطورين إدارة وإصدار مشار

---

## 📊 البيانات التقنية التفصيلية

## 📁 ملفات المشروع

| الملف | الأسطر | الدوال | المكونات | المسارات |
|---|---|---|---|---|
| `release-manager-pro-12.html` | ٢٬٧٤٨ | 161 | 0 | 0 |

## ⚙️ الدوال الرئيسية (161 دالة)

### `release-manager-pro-12.html`
- `_xor()`
- `_encKey()`
- `_decKey()`
- `getGeminiKey()`
- `_storeKey()`
- `_ghXor()`
- `_ghEnc()`
- `_ghDec()`
- `getGlobalGHToken()`
- `getToken()`
- `saveGlobalToken()`
- `clearGlobalToken()`
- `testGlobalToken()`
- `showGhtStatus()`
- `renderGhtStatus()`
- `_updateModalTokenHint()`
- `_migrateTokens()`
- `_clearProjectState()`
- `saveGeminiKeyUI()`
- `clearGeminiKeyUI()`
- `renderGkStatus()`
- `showGkStatus()`
- `testGeminiKey()`
- `updateAiDot()`
- `getValidModel()`
- `loadSettingsUI()`
- `showAiLog()`
- `hideAiLog()`
- `logStep()`
- `startTimer()`
- *(+131 دالة أخرى)*


## 💾 مخطط التخزين المحلي

- `rm2_model`
- `rm2_maxchars`
- `rm2_gk`
- `rm2_ght`
- `rm2_projects`
- `rm2_bl_`
- `rm2_hist_`
- `rm2_arch_`
- `rm2_tpl_`

## 🌐 نقاط الاتصال الخارجي

- `https://api.github.com/user`
- `https://generativelanguage.googleapis.com/v1beta/models/`
- `https://api.github.com/repos/${owner}/${repo}/releases`
- `https://api.github.com/user/repos?per_page=100&sort=updated`
- `https://api.github.com/repos/${owner}/${repo}`

## ⚠️ القيود التقنية والمعمارية

- التخزين محلي فقط (localStorage) — حد ~5–10 MB
- يعمل بدون خادم في الوضع الأساسي
- التشفير: XOR cipher (حماية من الفضول، ليس تشفير قوي)
- كل الشبكة مُغلّفة بـ try/catch مع fallback للوضع الأوفلاين
- لا secrets في الكود — التوكنات مشفرة ومخزنة محلياً

---

*تم التوليد تلقائياً بواسطة Release Manager Pro v2.6.0 — ١١ سبتمبر ٢٠٢٦*
