# متاهات المغامرة | Maze Adventure

لعبة متاهات مبنية باستخدام React Native وExpo Router، مع مراحل متعددة، خصوم، تلميحات، سمات بصرية، وحفظ التقدم محليًا.

## المتطلبات
- Node.js 20 أو أحدث
- npm
- Android Studio وAndroid SDK عند البناء محليًا (اختياري إذا استخدمت GitHub Actions)

## التشغيل محليًا
```bash
npm install
npx expo install --check
npm run typecheck
npx expo start
```

## بناء APK عبر GitHub Actions
1. ادفع التغييرات إلى فرع `main` أو افتح Pull Request إليه.
2. افتح تبويب **Actions** في GitHub واختر **Android APK**.
3. انتظر نجاح خطوات التحقق والبناء.
4. نزّل ملف `maze-adventure-android-apk` من قسم **Artifacts** في تشغيل workflow الناجح.

يمكن تشغيل البناء يدويًا من **Actions → Android APK → Run workflow**.

## ملاحظات
- يتم حفظ التقدم والإعدادات على الجهاز باستخدام AsyncStorage.
- الأصوات موجودة ضمن `assets/audio/` ويجب الحفاظ على ملفات `move.wav` و`win.wav` و`lose.wav`.
- يجب مراجعة سجل Actions بعد البناء للتأكد من نجاح الفحص النوعي وتجميع APK على Android.
