# KMY Saudi Market Platform — منصة كيمي

منصة عربية/إنجليزية لمتابعة السوق الرئيسية السعودية. هذا المستودع هو تنفيذ Full-stack لـBase44، وليس واجهة عرض منفصلة.

## مصدر الشركات والأسعار

- المصدر المثبت لأسماء الشركات والقطاعات والأسعار اليومية: تقرير تداول السعودية التفصيلي ليوم `2026-07-21`.
- الملف الرسمي المحفوظ: `base44/data/official-main-market-catalog-2026-07-21.json`.
- العدد: `270` شركة، و`270` رمزًا فريدًا.
- بصمة SHA-256: `4BCC19FD271E1D84D1390E8B2E311046243A8CC9B79B024FF43850C4D8F31337`.
- الشموع التاريخية تُجلب من Yahoo Finance بالرمز السعودي `SYMBOL.SR`، ولا توجد شموع مولدة أو بدائل عشوائية.
- تقوم `marketIngestion` بعمل upsert للاسم العربي والإنجليزي والقطاع في كل دورة، لذلك تستبدل أسماء Base44 القديمة ولا تحتفظ بها.

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

قبل النشر يجب أن تنجح الاختبارات، ثم تُزامن 44 كيانًا مخصصًا و18 وظيفة إلى البيئة التجريبية. بعد التحقق تُشغّل مزامنة السوق مرة واحدة، ولا يُعتمد العمل حتى يثبت الاستعلام الفعلي وجود `CustomerProfile` و270 سجل `Instrument` و270 سجل `QuoteLatest`.

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
- بيانات السوق لا تُستبدل ببيانات Mock عند فشل المصدر.
- الأدوار المخصصة والصلاحيات والاشتراكات تُفحص في الخادم، مع منع افتراضي وسجل قبل/بعد ورقم مراجعة.
- تشغيل جلب السوق اليدوي يتطلب صلاحية مستقلة وجلسة نشطة.
- هوية الأداة المالية مركبة من السوق ورمز الأداة، والأسواق غير المرخصة تبقى معطلة.

## التحقق

`npm test` يتحقق من عدد الشركات، تفرد الرموز، بصمة الملف، الاسم الصحيح للشركة `4210`، ربط الجلب بالملف الرسمي، الجدولة، رفض الوصول المباشر لجميع الكيانات، هندسة القنوات والقياسات، وحواجز الصلاحيات والملكية والمراجعات المتزامنة.

توثيق تكامل GitHub مع Base44: <https://docs.base44.com/Integrations/Using-GitHub>

### Company intelligence feed

The `companyIntelligence` backend function is fail-closed and never fabricates announcements, major-shareholder ownership, or financial statements. Configure these Base44 secrets before enabling its schedules:

- `SAUDI_EXCHANGE_COMPANY_FEED_URL`: the licensed/authenticated batch endpoint.
- `SAUDI_EXCHANGE_COMPANY_FEED_TOKEN`: the endpoint bearer token.

The endpoint must return official `https://*.saudiexchange.sa/` provenance URLs for every accepted record. `CompanyIntelligenceDaily` runs after close from Sunday through Thursday; `CompanyFinancialsTwiceWeekly` runs on Monday and Thursday.
