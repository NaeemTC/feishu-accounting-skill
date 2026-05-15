# 账单 - AI 助手记账软件

基于 Capacitor 的 Android 原生记账应用，对接飞书多维表格 API，支持收入/支出统计、月度趋势图表、明细记录浏览。

## 功能

- 读取飞书多维表格汇总数据和明细记录
- 月度收入/支出汇总
- 日趋势折线图
- 分类支出饼图
- 明细记录列表浏览

## 技术栈

- Capacitor 8.x (Android)
- TypeScript + Vite
- ECharts 6.x
- 飞书 Base API v3

## 构建

```bash
npm install
npx cap sync android
npx cap build android
```

APK 输出位置：`android/app/build/outputs/apk/debug/app-debug.apk`
