# KMY Saudi Market Platform — منصة كيمي

منصة عربية/إنجليزية لمتابعة السوق الرئيسية السعودية. هذا المستودع هو تنفيذ Full-stack لـBase44، وليس واجهة عرض منفصلة.

## مصدر الشركات وبيانات السوق

- المصدر المثبت لكتالوج أسماء الشركات والقطاعات والمرجع اليومي التاريخي: تقرير تداول السعودية التفصيلي ليوم `2026-07-21`.
- الملف الرسمي المحفوظ: `base44/data/official-main-market-catalog-2026-07-21.json`.
- العدد: `270` شركة، و`270` رمزًا فريدًا.
- بصمة SHA-256: `4BCC19FD271E1D84D1390E8B2E311046243A8CC9B79B024FF43850C4D8F31337`.
- هذا الملف ليس موجز أسعار حياً، ولا تُعرض قيمه على أنها محدثة.
- الوضع التجريبي الافتراضي يجلب شموع `15m` العامة دون مفتاح مدفوع، ويحسب الإغلاق السابق من آخر شمعة في جلسة التداول السابقة بدلاً من بيانات `meta` غير الموثوقة.
- يظل الوضع التجريبي موسوماً بوضوح في واجهة العميل. ويمكن التحويل إلى موجز إنتاج مرخص دون تغيير واجهات القراءة بوضع `KMY_MARKET_DATA_MODE=licensed`.
- تقوم `marketIngestion` بعمل upsert لكتالوج الشركة، ثم تحفظ كل قراءة في `QuoteObservation` قبل ترقية اللقطة السليمة إلى `QuoteLatest` و`CandleChunk`.

### مزامنة السوق السعودي T+15

مسار السعر الوحيد:

```text
Base44 automation
→ قفل دورة التحديث
→ جلب متوازٍ للمصدر التجريبي العام أو طلب مجمع من المزود المرخص
→ توحيد الرموز
→ فحوص الوقت وOHLC والتغير والتغطية
→ QuoteObservation
→ QuoteLatest + CandleChunk
→ marketRead
→ الجدول والرسم والتنبيهات
```

- يبدأ النشر بتأخير 15 دقيقة، ويحسب الخادم التغير من `previous_close`.
- تغطية `99%+` سليمة، ومن `95%` إلى أقل من `99%` جزئية، وأقل من `95%` تفشل دون ترقية اللقطة.
- السهم المفقود يحتفظ بآخر قيمة سليمة بعلامة `stale`; لا يُستبدل بسعر ثابت أو تقديري.
- الجدول والرسم والتنبيهات يقرأون قاعدة البيانات فقط. فتح الرسم لا يتصل بمزود خارجي.
- جداول السوق الفعلية محفوظة داخل `base44/workflows/Market*.jsonc`: 21 دورة `T+15` من 10:15 حتى 15:15، ثم مصالحة الإغلاق 15:26 والتثبيت النهائي 15:36، من الأحد إلى الخميس بتوقيت `Asia/Riyadh`.
- يستخدم التطبيق نظام Base44 Workflows الحديث؛ لذلك يبقى `function.jsonc` مخصصًا لتعريف الوظيفة فقط ولا يحتوي أتمتات النظام القديم.
- التشغيل المتوقع بعد التفعيل: 23 استدعاءً في يوم التداول، أو نحو 506 أرصدة أتمتة في شهر من 22 جلسة.

## التشغيل المحلي

```bash
npm install
npm test
npm run typecheck
npm run lint
npm run build
npm run dev
```

لربط الواجهة محليًا بالـbackend المرجعي الحقيقي:

```bash
VITE_KMY_REFERENCE_API=/reference-api npm run dev
```

يمر المسار `/reference-api` عبر Vite إلى `http://127.0.0.1:3001/api` لتجنب أخطاء CORS. هذا المسار محلي فقط؛ الإنتاج يستخدم وظائف Base44 المحمية.

## Base44

المصدر الوحيد لوظائف الخلفية هو:

`base44/functions/<name>/entry.ts`

وتوضع الوحدات المشتركة داخل:

`base44/shared/`

يتحقق الأمر التالي من أن جميع الوظائف قابلة للتجميع دون إنشاء نسخ متفرقة:

```bash
npm run build:app-editor-functions
```

يتحقق `npm test` أن النسخ المولدة مطابقة للمصدر وليست قديمة.

المستودع هو مصدر الحقيقة للكود. أما مخططات الكيانات فيجب مزامنتها إلى بيئة تجريبية أولاً، ثم إلى الإنتاج بعد نسخة استرجاع ومراجعة عدد السجلات.

بوابة الربط المحلية:

```bash
npm run base44:check-link
```

إذا كان الهدف مشروع Base44 Backend مستقلًا موجودًا، يسجل المالك الدخول ثم يربط المجلد ويشغّل النشر الكامل:

```bash
npx base44 login
npx base44 link
npm run base44:check-link
npx base44 deploy -y
```

لا يُحذف أي مخطط مكرر أو سجل قبل نسخة الاسترجاع وموافقة المالك الصريحة وقت التنفيذ.

قبل النشر يجب أن تنجح الاختبارات، ثم تُزامن 45 كيانًا مخصصًا و20 وظيفة إلى البيئة التجريبية. يمكن تشغيل الوضع التجريبي بلا أسرار، بينما لا تُشغّل المزامنة المرخصة حتى تكتمل خرائط الأدوات الـ270 والعقد والأسرار.

## أسرار بيانات السوق

تُضاف في أسرار Base44 فقط، ولا تدخل GitHub أو الواجهة:

- `KMY_MARKET_DATA_PROVIDER_CODE`
- `KMY_MARKET_DATA_URL`
- `KMY_MARKET_DATA_TOKEN`
- `KMY_MARKET_DATA_MODE`

القيمة الافتراضية لـ`KMY_MARKET_DATA_MODE` هي `experimental_public` ولا تحتاج رابطاً أو رمزاً. عند اختيار `licensed` يجب أن يكون الرابط `HTTPS` وأن يعيد لقطة مجمعة لكل السوق مع `provider_as_of`, `quotes[]` و—إن كانت متاحة—شموع `15m`. إنشاء المصدر وحده لا يفعّل العرض المرخص؛ يلزم أيضاً `license_status=approved`, و`public_enabled=true`، و270 سجل `ProviderInstrumentMap` معتمد.

## أسرار التنبيهات

لا تُحفظ الأسرار في Git. تُضاف في إعدادات أسرار Base44:

- `TELEGRAM_BOT_TOKEN`
- `WHATSAPP_ACCESS_TOKEN`
- `WHATSAPP_PHONE_NUMBER_ID`
- `WHATSAPP_GRAPH_VERSION`
- `WHATSAPP_ALERT_TEMPLATE_NAME`
- `WHATSAPP_ALERT_TEMPLATE_LANGUAGE`

تنبيهات WhatsApp تستخدم قالبًا معتمدًا بخمسة متغيرات مرتبة: اسم الشركة، الرمز، السعر، الشرط، ووقت السعر. لا يُرسل أي رقم دون موافقة موثقة، ولا تُرجع واجهة العميل الرقم الكامل.

## الأمان

- القراءة والكتابة المباشرة من المتصفح مرفوضة في جميع كيانات Base44.
- الوصول يتم عبر وظائف خلفية تتحقق من المستخدم والجلسة النشطة والاشتراك والدور وملكية الكائن.
- دخول جهاز جديد يبطل الجلسة السابقة بعد نجاح التحقق.
- أحداث التسليم لها مفتاح منع تكرار وحد أقصى للمحاولات.
- لا يوجد fallback صامت: الوضع التجريبي العام اختيار صريح، وعند فشله تبقى آخر لقطة سليمة مع وقتها الحقيقي ولا تُستبدل ببيانات الكتالوج.
- الأدوار المخصصة والصلاحيات والاشتراكات تُفحص في الخادم، مع منع افتراضي وسجل قبل/بعد ورقم مراجعة.
- تشغيل جلب السوق اليدوي يتطلب صلاحية مستقلة وجلسة نشطة.
- هوية الأداة المالية مركبة من السوق ورمز الأداة، والأسواق غير المرخصة تبقى معطلة.

## التحقق

`npm test` يتحقق من عدد الشركات، تفرد الرموز، بصمة الملف، نافذة T+15، جدولة السوق، حساب التغير من إغلاق جلسة التداول السابقة، رفض OHLC والنسب المتناقضة، التخزين قبل الترقية، رفض الوصول المباشر لجميع الكيانات، هندسة القنوات والقياسات، وحواجز الصلاحيات والملكية والمراجعات المتزامنة.

توثيق تكامل GitHub مع Base44: <https://docs.base44.com/Integrations/Using-GitHub>

### Company intelligence feed

The `companyIntelligence` backend function is fail-closed and never fabricates announcements, major-shareholder ownership, or financial statements. Configure these Base44 secrets before enabling its schedules:

- `SAUDI_EXCHANGE_COMPANY_FEED_URL`: the licensed/authenticated batch endpoint.
- `SAUDI_EXCHANGE_COMPANY_FEED_TOKEN`: the endpoint bearer token.

The endpoint must return official `https://*.saudiexchange.sa/` provenance URLs for every accepted record. `CompanyIntelligenceDaily` runs after close from Sunday through Thursday; `CompanyFinancialsTwiceWeekly` runs on Monday and Thursday.
