# AI Agent Personal Accounting

Personal accounting Android app powered by AI Agent (Hermes), integrated with Feishu/Lark Base API for data storage. Supports income/expense tracking, monthly trends, category breakdown, and transaction detail browsing.

## Features

- Read summary and detail records from Feishu Base tables
- Monthly income/expense overview
- Daily spending trend line chart
- Category breakdown pie chart
- Paginated transaction list

## Tech Stack

- Capacitor 8.x (Android)
- Vanilla TypeScript + Vite
- ECharts 6.x
- Feishu Base API v3

## Setup

```bash
npm install
npx cap sync android
npx cap build android
```

## Build APK

```bash
bash sync.sh
```

APK output: `android/app/build/outputs/apk/debug/app-debug.apk`
