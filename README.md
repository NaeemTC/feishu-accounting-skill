# 🤖 Agent记账App

<img src="assets/images/icon.png" width="120" height="120" align="center" />

现在记账软件——手动点分类、看开屏广告、基础功能还要付费订阅。安装包一个个几百 MB。

这个 3.9 MB。**agent通过skill调用飞书cli在多维表格上记账，app通过api接收数据**。每次刷新走 55KB 流量。没广告、没订阅、不用注册。

怎么用？跟 AI 说就行。「午饭花了 23 块 4」自动归到餐饮，「工资到账 8000」归到工资。Agent 帮你分好类、写好表、同步完，App 那边自动渲染成图表。数据在你自己的飞书里，不经过第三方服务器。

别家是你给软件打工——选分类、关广告、记密码。这个是软件给你打工——动嘴就行。

---

## 🌟 项目优势

| 优势 | 说明 |
|------|------|
| 🖥️ **零服务器** | 数据直接放飞书多维表格里，不用买云服务器 |
| 📱 **只装一个 APK** | Android 装个 APK 就能用，不用配环境 |
| 🤖 **AI 全自动** | 跟 AI 说「记账」，它会自己分类、同步、统计 |
| 🔧 **AI 帮你配置** | 建飞书应用、开权限、搭表格——AI 从头到尾引导你搞定 |
| 📊 **飞书即后台** | 多维表格就是你的数据库，App 和网页都能查 |
| 🔒 **数据自主可控** | 数据在你自己的飞书账号里，不经过任何第三方 |

**使用门槛：只有一个**——有一个能跑 Skill 的 AI 助手（如 OpenClaw、Hermes Agent）。手机装 APK，AI 装 Skill，就能用了。

---

## ✨ 功能

| 功能 | 说明 |
|------|------|
| 📝 **自然语言记账** | 「早饭花了 12 元」「工资到账 8000」——直接说人话就行 |
| 📷 **图片记账** | 截图或拍照扔过来，AI 自己认金额直接记 |
| 🥧 **支出分类占比** | 环形图看钱都花哪儿了 |
| 📊 **分类金额排行** | 横向柱状图按金额排，哪些类花得最多一目了然 |
| 📈 **月度收支对比** | 柱状图对比前后月收支 |
| 📉 **日支出趋势** | 折线图看每天花了多少 |
| 📋 **消费明细** | 每笔记账按时间倒序排，随时能翻 |
| 🌗 **浅色/深色主题** | 默认浅色，一键切深色 |
| 🔄 **飞书同步** | 本地记录实时同步到飞书多维表格 |

---

## 📱 界面预览

<p align="center">
  <img src="assets/images/screenshot-overview.jpg" width="280" alt="浅色主题 - 月度概览" />
  <img src="assets/images/screenshot-dark.jpg" width="280" alt="深色主题 - 图表视图" />
  <img src="assets/images/screenshot-details.jpg" width="280" alt="消费明细列表" />
</p>

<p align="center">
  <em>左：浅色主题全览 · 中：深色主题图表 · 右：消费明细</em>
</p>

---

## ⬇️ 下载 APK

> **Android 用户直接安装，再复制下方的Skill提示给任意Agent完成首次配置**

**[📦 点击下载 APK](https://github.com/NaeemTC/feishu-accounting-skill/releases/download/v1.1.0/feishu-accounting-skill-v1.1.0.apk)**（3.9 MB）

> 如果链接失效，请访问 [Releases 页面](https://github.com/NaeemTC/feishu-accounting-skill/releases) 下载最新版本。

---

## 🔧 安装 Skill（给 AI 助手用）

想让你的 Agent 帮你记账？把下面这句话丢给它就行，剩下的它自己来：

```
帮我安装这个记账技能，项目地址：https://github.com/NaeemTC/feishu-accounting-skill

这是一个飞书多维表格记账系统，支持自然语言记账、图片记账、月度统计、分类分析。数据存在你自己的飞书里，不需要服务器。
```

> AI 收到后会读取仓库里的 `skills/feishu-accounting/SKILL.md`，然后装技能、引导你建飞书应用、配好凭证、开始记账。全程对话搞定，不用自己动手配。

如果你用的Agent支持技能安装链接，也可以直接丢这个链接给它：

```
https://github.com/NaeemTC/feishu-accounting-skill/tree/main/skills/feishu-accounting
```

---

## ⚙️ 配置飞书

本 App 的数据存在飞书多维表格里，需要配置飞书应用才能使用。

### 方式一：让 AI 帮你一键配置（推荐）

已经装好 Skill 后，直接对 AI 说：

```
我想用飞书记账
```

AI 会自动引导你完成以下步骤，全程不需要手动操作飞书网页：

1. 安装飞书 CLI 工具
2. 创建飞书自建应用（获取 App ID + App Secret）
3. 开通多维表格权限
4. 在飞书里创建「明细表」和「汇总表」，自动配置好所有字段
5. 把 base_token 和 table_id 配置到 App

### 方式二：手动配置

如果你想自己配，请参考 [飞书多维表格记账系统配置指南](skills/feishu-accounting/SKILL.md) 的 Setup 部分。

---

## 🛠️ 技术栈

| 层级 | 技术 |
|------|------|
| App 框架 | Capacitor 8.x（Android） |
| 前端 | Vanilla TypeScript + Vite |
| 图表 | ECharts 6.x（SVG 渲染） |
| 数据 | 飞书多维表格 Base API v3 |
| AI 记账 | Hermes Agent + record_bill.py |
| 主题 | CSS 变量 + data-theme 属性，localStorage 持久化 |

---

## 📂 项目结构

```
feishu-accounting-skill/
├── android/                 # Capacitor Android 项目
├── dist/                    # Web 构建产物（单文件 index.html）
├── skills/
│   └── feishu-accounting/   # AI 记账 skill
│       ├── SKILL.md         # 完整配置 + 使用说明
│       ├── scripts/
│       │   └── record_bill.py  # 记账核心脚本
│       └── references/
│           └── categories.md   # 分类关键词参考
├── assets/
│   └── images/              # App 截图 + 图标
├── build.sh                 # debug 构建脚本
├── sync.sh                  # release 构建脚本
├── capacitor.config.json
└── README.md
```

---

## 🔧 开发者

### Build APK

```bash
git clone https://github.com/NaeemTC/feishu-accounting-skill.git
cd feishu-accounting-skill
npm install
npx cap sync android
# Release 版
bash sync.sh
# 或 Debug 版
bash build.sh
# APK 输出到 android/app/build/outputs/apk/
```

---

## 🔒 隐私声明

本 App 不会收集、上传或共享你的任何个人信息。

### 网络请求

| 目标 | 目的 | 传输数据 |
|------|------|----------|
| `cdn.jsdelivr.net` | 加载 ECharts 图表库 | 无（仅加载 JS 文件） |
| `open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal` | 获取飞书 API Token | App ID + App Secret（换取 2 小时有效令牌） |
| `open.feishu.cn/open-apis/base/v3/bases/{base}/tables/{table}/records` | 拉取账单数据 | Bearer Token（飞书 API 鉴权用） |

### 权限

仅需 `INTERNET` 权限（联网获取飞书数据）。无相机、定位、通讯录、存储、短信等敏感权限。

### 数据存储

所有配置（App ID / Secret / Base Token / Table ID）仅存于本机 WebView 的 `localStorage`，**不发送给任何第三方服务器**。数据实时从你的飞书多维表格读取，不经由第三方中转。

### 第三方依赖

- ECharts（`cdn.jsdelivr.net` 加载）— 仅用于图表渲染，不收集任何用户数据

### 透明度

本 App 无广告、无统计埋点、无推送通知、无后台服务。关闭即停止所有网络活动。

---

## 📄 License

MIT

---

## 🙏 感谢

- [**larksuite/cli**](https://github.com/larksuite/cli) — 飞书官方 CLI 工具，提供多维表格 API 的便捷操作能力
