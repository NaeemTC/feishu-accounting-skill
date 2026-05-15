#!/bin/bash
set -e
cd /home/naeem/feishu-dashboard-app

echo ">>> npx cap sync android"
npx cap sync android

echo ">>> 修复 capacitor.plugins.json（cap sync 会将其重置为空数组）"
PLUGIN_JSON='[
  {
    "id": "FeishuApi",
    "sdk": "FeishuApi"
  }
]'
echo "$PLUGIN_JSON" > android/app/src/main/assets/capacitor.plugins.json
echo ">>> 已修复"

echo ">>> 构建 APK"
cd android
./gradlew assembleDebug
cp app/build/outputs/apk/debug/app-debug.apk /home/naeem/账单.apk
echo ">>> APK 已输出到 /home/naeem/账单.apk"
