# متاهات المغامرة — Android

مشروع Expo/React Native مع سير عمل GitHub Actions لبناء APK.

## الميزات
- 25 مستوى متدرجًا ومتاهات مولّدة برمجيًا.
- تحكم باللمس، عدّاد الحركات، الوقت، التلميح، وإعادة المستوى.
- شاشة اختيار المستوى وحالة إكمال المراحل خلال جلسة التشغيل.
- واجهة عربية RTL، وضع فاتح/داكن.
- بناء APK عبر GitHub Actions دون الحاجة إلى جهاز Android محلي.

## إنشاء APK عبر GitHub
1. أنشئ مستودعًا جديدًا على GitHub باسم `maze-adventure-android`.
2. ارفع محتويات هذا المجلد إلى الفرع `main` (لا ترفع المجلد الأب بدلًا من محتوياته).
3. افتح تبويب **Actions** وتأكد من تفعيل GitHub Actions.
4. شغّل **Build Android APK** عبر **Run workflow**، أو ادفع تعديلًا إلى `main`.
5. عند نجاح البناء، افتح نتيجة التشغيل ثم **Artifacts** ونزّل `maze-adventure-release-apk.zip`.
6. فك الضغط لتحصل على ملف APK، ثم انقله إلى هاتف Android وثبّته. قد تحتاج السماح بالتثبيت من هذا المصدر.

## البناء محليًا
يتطلب Node.js 22 وJava 17 وAndroid SDK:
```bash
npm install
npx expo prebuild --platform android
cd android
./gradlew assembleRelease
```
الملف الناتج سيكون عادةً في `android/app/build/outputs/apk/release/`.

## ملاحظات مهمة
- هذا مشروع مصدر مع إعداد CI؛ ملف APK لا يتضمنه الأرشيف، إذ يجب بناؤه في GitHub Actions.
- APK release الناتج من Gradle قد يكون موقّعًا بمفتاح debug افتراضي حسب إعدادات Expo/Gradle. للنشر العام على Google Play، أنشئ مفتاح توقيع خاصًا وأضف إعدادات التوقيع بأمان.
- يفضّل مراجعة البناء وتشغيله على جهاز حقيقي قبل اعتباره إصدارًا نهائيًا.
