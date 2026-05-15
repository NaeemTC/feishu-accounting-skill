#!/bin/bash
set -e
cd "$(dirname "$0")"

echo "=== cap sync ==="
npx cap sync android

echo "=== restore capacitor.plugins.json ==="
cat > android/app/src/main/assets/capacitor.plugins.json << 'JSON'
[
	{
		"id": "FeishuApi",
		"classpath": "com.feishu.dashboard.FeishuApiPlugin"
	}
]
JSON

echo "=== gradle build ==="
cd android
GRADLE_OPTS="-Dhttp.proxyHost=127.0.0.1 -Dhttp.proxyPort=7890 -Dhttps.proxyHost=127.0.0.1 -Dhttps.proxyPort=7890" \
  ./gradlew assembleDebug
