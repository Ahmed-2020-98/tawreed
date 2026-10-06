# نشر تطبيقات توريد على Google Play

| التطبيق | Package | مشروع Expo |
|---|---|---|
| توريد (المشتري) | `sa.tawreed.buyer` | https://expo.dev/accounts/ahmedgamalmansour11sa/projects/tawreed-buyer |
| توريد للموردين | `sa.tawreed.supplier` | https://expo.dev/accounts/ahmedgamalmansour11sa/projects/tawreed-supplier |
| توريد للسائقين | `sa.tawreed.driver` | https://expo.dev/accounts/ahmedgamalmansour11sa/projects/tawreed-driver |

كل مجلد (`buyer/` `supplier/` `driver/`) فيه:
- `icon-512.png`: أيقونة المتجر.
- `feature-1024x500.png`: صورة الواجهة.
- `screenshots/`: صور شاشات الجوال (1080×1920).
- `listing.md`: الاسم والوصف المختصر والكامل بالعربي والإنجليزي.

روابط مشتركة:
- **سياسة الخصوصية:** https://tawreed-sa.vercel.app/pages/privacy
- **حذف الحساب:** https://tawreed-sa.vercel.app/pages/delete-account
- **الموقع:** https://tawreed-sa.vercel.app

## آخر ملفات AAB (versionCode 4 — 2026-09-29)
- توريد: https://expo.dev/artifacts/eas/-EbPDt5GYZV2dIsJdfCkUT9U6-cca_K-4LKyWcUsp4I.aab
- توريد للموردين: https://expo.dev/artifacts/eas/bprv1dQdsXqYtOOLn6BtaOU0Xhc7u-WvwkhW8_hwCzk.aab
- توريد للسائقين: https://expo.dev/artifacts/eas/TZp2n9b4hU5tzLxvVCBz-OZQ0_PiHjXF4M2C3iQ3T_M.aab

## نسخ APK للتجربة على الجوال مباشرةً (بدون المتجر)
- توريد: https://expo.dev/artifacts/eas/Qhwhigd21BDGC9622pTsOpxyG6RM3Lf6XF3XyJobGQc.apk
- توريد للموردين: https://expo.dev/artifacts/eas/BpZlnwNqvD_ziMnSNcTIt6hYCqBfzfG6hk7cEYW2RXg.apk
- توريد للسائقين: https://expo.dev/artifacts/eas/gY1jmSglzzMeNveMmbHoyAcrEMe6FyuX3nxr3fHdbeM.apk

---

## 1) ملفات التطبيقات (AAB)
الملفات بتتبني على سيرفرات Expo (EAS)، ومفتاح التوقيع محفوظ على حساب Expo.
- رابط التحميل بيظهر في صفحة كل مشروع ← Builds ← آخر build ← **Download**.
- لبناء نسخة جديدة (من مجلد التطبيق):
  ```bash
  cd apps/buyer-app   # أو supplier-app / driver-app
  EAS_NO_VCS=1 EAS_PROJECT_ROOT=../.. npx eas-cli build -p android --profile production
  ```
- **نسخة APK للتجربة على الجوال مباشرة:** نفس الأمر مع `--profile preview`.
- رقم الإصدار (versionCode) بيزيد تلقائيًا مع كل build.
- **مفتاح التوقيع:** للاحتفاظ بنسخة احتياطية منه شغّل `npx eas-cli credentials` واختر Android ← Download keystore. احتفظ بالنسخة في مكان آمن.

## 2) إنشاء التطبيق في Play Console (يدوي، مرة لكل تطبيق)
1. Play Console ← **Create app**:
   - اسم التطبيق من `listing.md`.
   - اللغة الافتراضية: العربية (ar).
   - النوع: App، مجاني.
   - وافق على الإقرارات.
2. **Testing ← Internal testing ← Create new release:**
   - ارفع ملف الـ AAB.
   - وافق على **Play App Signing**.
   - أضف إيميلك كمختبِر.
   - Save ← Review ← Rollout.
   - Google مش بيسمح بإنشاء التطبيق بشكل آلي، فأول رفع لازم يكون يدوي.

## 3) Store listing
- الاسم والوصف المختصر والكامل (عربي، وأضف English من «Manage translations»): انسخهم من `listing.md`.
- الأيقونة، وصورة الواجهة، و2 إلى 8 صور شاشة: من المجلد.
- التصنيف: **Business** لتطبيقي الموردين والسائقين، و**Shopping** أو **Business** لتطبيق المشتري.
- بيانات التواصل: إيميلك والموقع.

## 4) App content (الإجابات)
| البند | الإجابة |
|---|---|
| Privacy policy | https://tawreed-sa.vercel.app/pages/privacy |
| App access | **All or some functionality is restricted** ← أضف تعليمات المراجع (تحت) |
| Ads | لا يحتوي إعلانات |
| Content rating | الاستبيان: فئة Utility/Productivity، ولا عنف ولا محتوى جنسي ولا مقامرة. التطبيق **يتيح تواصل المستخدمين؟ لا**. **يشارك الموقع مع مستخدمين آخرين؟** نعم لتطبيق السائق (تتبّع الشحنة)، ولا للباقي |
| Target audience | 18+ (منشآت تجارية) |
| News / Health / Government | لا |
| Financial features | تطبيق المشتري: الدفع الآجل **ائتمان تجاري بين منشآت (B2B)** وليس قروضًا شخصية. اختر ما ينطبق أو «التطبيق لا يقدم منتجات مالية للأفراد» |
| Data safety | الجدول تحت |
| Delete account URL | https://tawreed-sa.vercel.app/pages/delete-account (داخل التطبيق: الحساب ← حذف الحساب) |

### تعليمات المراجع (App access)
> This app is for registered businesses. Log in with the demo account:
> Buyer app: phone **0500000001**, code **123456**
> Supplier app: phone **0500000101**, code **123456**
> Driver app: phone **0500000211**, code **123456**
> (The demo server accepts the fixed code 123456 instead of an SMS.)

### Data safety
- **مشفّرة أثناء النقل:** نعم. **يمكن طلب حذفها:** نعم.
- **مشاركة البيانات مع طرف ثالث:** لا. البيانات بتوصل لمزوّدي الخدمة (الدفع والرسائل) وللمورد والسائق عشان ينفذوا الطلب، وده مش «مشاركة» بتعريف Google.

| نوع البيانات | المشتري | المورد | السائق | الغرض |
|---|---|---|---|---|
| الاسم، رقم الجوال | ✔ مطلوب | ✔ مطلوب | ✔ مطلوب | الحساب، وظائف التطبيق |
| البريد الإلكتروني | اختياري | اختياري | — | الحساب |
| العنوان | ✔ | — | — | التوصيل |
| الموقع الدقيق | اختياري (تحديد العنوان) | — | ✔ أثناء التوصيل | وظائف التطبيق |
| الصور | اختياري (إيصالات، مستندات) | — | ✔ (إثبات التسليم) | وظائف التطبيق |
| الملفات والمستندات | اختياري (مستندات المنشأة) | — | — | التحقق من الحساب |
| سجل المشتريات | ✔ | ✔ (طلبات المورد) | — | وظائف التطبيق |
| معلومات مالية أخرى (الائتمان) | ✔ | — | — | الدفع الآجل |

- بيانات البطاقة بيعالجها **Tap** مباشرةً، والتطبيق ما بيجمعهاش.
- لا تحليلات ولا إعلانات ولا معرّفات جهاز.

## 5) الانتقال للإنتاج
- **حساب مطوّر شخصي أُنشئ بعد نوفمبر 2023:** لازم **Closed testing** بـ **12 مختبِرًا على الأقل لمدة 14 يومًا متواصلة**، وبعدها تطلب **Production access** من لوحة التحكم.
- **حساب منشأة (Organization):** تقدر تنشر على Production مباشرةً بعد المراجعة.
- المراجعة الأولى بتاخد غالبًا من ساعات لكام يوم.

## 6) الرفع التلقائي بعد كده (اختياري)
1. Play Console ← Setup ← API access ← أنشئ **Service account**، وادّيله صلاحية Release manager، ونزّل ملف JSON.
2. حط مسار الملف في `eas.json` تحت `submit.production.android.serviceAccountKeyPath` (ما ترفعهوش على git).
3. `npx eas-cli submit -p android --latest` بيرفع آخر build على مسار internal كـ draft.

## ملاحظات مهمة
- **الخرائط على Android:** محتاجة **Google Maps API key**:
  1. Google Cloud ← فعّل «Maps SDK for Android».
  2. أنشئ مفتاح.
  3. `npx eas-cli env:create --name GOOGLE_MAPS_ANDROID_KEY --value <KEY> --environment production`.
  4. أعد البناء.
  - من غير المفتاح التطبيق مش بيقع: بيظهر كارت «افتح في الخرائط» مكان الخريطة.
- **السيرفر:** التطبيقات متوصلة بـ https://tawreed-api.vercel.app، وده سيرفر عرض برمز الدخول الثابت `123456`.
- **قبل الإطلاق الحقيقي:**
  - اربط مزوّد SMS (Unifonic أو Taqnyat).
  - اقفل `DEMO_MODE` و `DEV_FIXED_OTP` في إعدادات Vercel.
  - خلّي `APP_ENV=production`.
- **الإشعارات الفورية (Push):** محتاجة إعداد Firebase (FCM) في مرحلة لاحقة. حاليًا الإشعارات جوه التطبيق بس.
