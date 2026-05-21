---
name: feishu-accounting
description: 飞书多维表格记账系统完整技能包。包含两步：1）运行 feishu-accounting-setup 引导用户完成飞书应用创建、多维表格搭建、凭证获取；2）使用 record_bill.py 进行日常记账（支持本地存储 + 飞书多维表格同步）。**同步使用永久有效的 Tenant Token，不再有 7 天过期问题。同步规则：支出写明细表+汇总表，收入只写汇总表（明细表仅用于 App 仪表盘展示消费明细）。**
version: 1.3.0
author: Naeem
homepage: https://github.com/NaeemTC/feishu-accounting-skill
tags: [feishu, bitable, accounting, setup, permissions]
---

# 飞书多维表格记账系统

## 概述

本技能是完整的飞书记账解决方案，分两个阶段：

| 阶段 | 触发条件 | 做什么 |
|------|----------|--------|
| **Setup** | 用户请求配置记账系统 | 引导创建飞书应用 → 一键搭建多维表格 → 输出凭证 |
| **Usage** | 用户记账（说金额/上传图片/查账单） | 解析记账输入 → 写本地 bills/ → 同步飞书两个表 |

---

## 第一阶段：Setup（首次配置）

### 触发词

用户说以下内容时执行 Setup：

- "配置飞书记账"
- "帮我搭建记账系统"
- "飞书记账怎么配置"
- "setup feishu accounting"
- "我想用飞书记账"

### Step 1：引导用户创建飞书自建应用

**把以下内容发给用户：**

> **请在飞书开放平台创建一个自建应用：**
>
> 1. 打开 https://open.feishu.cn/app
> 2. 点击「创建企业自建应用」
> 3. 填写应用名称（如「记账助手」）和描述
> 4. 创建完成后，在「凭证与基础信息」页面复制 **App ID** 和 **App Secret**
>
> 复制好后发给我。

等待用户提供 App ID 和 App Secret。

### Step 2：一键开通权限（Agent 自动生成授权链接，用户只需点击确认）

**AI 执行** `apply_permissions.py`（自动获取 Tenant Token、生成一键授权链接）：

```bash
cd /path/to/feishu-accounting/
python3 scripts/apply_permissions.py \
  --app-id "cli_用户的AppID" \
  --app-secret "用户的AppSecret"
```

脚本输出一个 **一键授权链接**，AI 直接把链接发给用户：

> 点击下方链接，所有记账需要的权限已经预选好了，你只需确认一次：
>
> 🔗 `https://open.feishu.cn/app/{appId}/auth?q=base:app:read,base:app:update,...&op_from=openapi&token_type=tenant`
>
> 点击后 → 页面会列出所有需要的 base 权限 → 点击 **「确认开通权限」** → 完成。

**然后 AI 调用** `scopes/apply` API 提交管理员审批申请。

---

**用户需要做 3 步：**

| # | 操作 | 耗时 |
|---|------|------|
| 1️⃣ | 点链接 → 确认开通所有权限 | 10 秒 |
| 2️⃣ | 在飞书审批中通过申请 | 10 秒 |
| 3️⃣ | 版本管理与发布 → 创建版本 → 填写版本号 → 申请发布 → 确认 | 30 秒 |

**⚠️ 不发布版本权限不会生效！**

> 对比旧版：以前要手动搜索 6 个权限组逐个勾选 + 2 次发布，现在只需点 1 个链接 + 确认 1 次 + 发布 1 次。

### Step 3：一键搭建多维表格

用户提供 App ID + App Secret 后，运行 `setup_bitable.py`（无需安装任何外部工具，直接调飞书 API）：

```bash
cd /path/to/feishu-accounting/
python3 scripts/setup_bitable.py \
  --app-id "cli_用户的AppID" \
  --app-secret "用户的AppSecret"
```

脚本会自动完成：
1. 获取 Tenant Token（永久有效）
2. 创建多维表格「个人记账本」
3. 创建明细表 + 汇总表
4. 创建所有字段（文本/月份/金额/分类）并补充选项（14个分类选项）

输出 5 个凭证：App ID / App Secret / Base Token / 明细表 Table ID / 汇总表 Table ID

### Step 4：输出凭证给用户

**AI 必须将以下 5 个凭证填入实际值后发送给用户（App ID / App Secret 来自 Step 1 用户提供的值，Base Token / Table ID 来自 Step 3 脚本输出的）：**

> ✅ 飞书记账配置完成！
>
> 请保存以下 5 个凭证——首次打开手机 App 时需要按顺序输入：
>
> 1. **App ID**：`你的App_ID`
> 2. **App Secret**：`你的App_Secret`
> 3. **Base Token**：`你的Base_Token`
> 4. **明细表 Table ID**：`你的明细表ID`
> 5. **汇总表 Table ID**：`你的汇总表ID`
>
> 输入后 App 就能正常查看你的账单数据了。
>
> 📊 **多维表格链接**：https://bytedance.feishu.cn/base/`你的Base_Token`
> （浏览器打开就能直接看到你建的明细表和汇总表）

### Step 5：配置凭证（让 record_bill.py 能用）

**AI 执行**，在 skill 目录下创建 `.env` 文件（`record_bill.py` 启动时会自动加载）：

```bash
# 在技能目录创建 .env（record_bill.py 会自动从同目录读取）
cat > /path/to/feishu-accounting/.env << 'EOF'
FEISHU_APP_ID=你的App_ID
FEISHU_APP_SECRET=你的App_Secret
FEISHU_BASE_TOKEN=你的Base_Token
FEISHU_DETAIL_TABLE_ID=你的明细表ID
FEISHU_SUMMARY_TABLE_ID=你的汇总表ID
EOF
```

### Step 6：询问用户是否安装 App（仪表盘）

配置完成后，**询问用户**要不要装 Android 仪表盘 App 来看图表和数据：

> 飞书记账后台已经配好了！要不要装个手机 App 来看图表？
>
> - **📦 下载发布版**（推荐，即装即用）：https://github.com/NaeemTC/feishu-accounting-skill/releases/latest/download/app-release.apk
> - **🔧 从源码构建**：需要 Node.js + Android SDK，克隆仓库后执行 `bash sync.sh`

用户选发布版就直接发下载链接，选自己打就引导构建。

---

## 第二阶段：Usage（日常记账）

### 触发词

- "记账"、"花了X元"、"支出X"
- "收入X元"
- 上传账单图片（无文字说明）
- "查账单"、"本月花了多少"、"月度统计"

### 凭证检查

每次记账前确认环境变量已设置：

```bash
# 检查凭证
echo "FEISHU_BASE_TOKEN=${FEISHU_BASE_TOKEN:-未设置}"
echo "FEISHU_DETAIL_TABLE_ID=${FEISHU_DETAIL_TABLE_ID:-未设置}"
echo "FEISHU_SUMMARY_TABLE_ID=${FEISHU_SUMMARY_TABLE_ID:-未设置}"
```

**如果未设置**，跳回第一阶段（Setup）流程，重新引导用户获取凭证。

### 记账命令

```bash
# 方式一：直接调用（脚本自动加载同目录 .env）
python3 /path/to/scripts/record_bill.py \
  --amount 23.40 --type expense --category 餐饮 --note "午饭"

# 方式二：环境变量注入（适合临时调用）
FEISHU_BASE_TOKEN=xxx FEISHU_DETAIL_TABLE_ID=xxx FEISHU_SUMMARY_TABLE_ID=xxx \
  python3 /path/to/scripts/record_bill.py \
  --amount 23.40 --type expense --category 餐饮 --note "午饭"
```

**⚠️ Python 版本**：确保本机已安装 `python3`（Python 3.9+ 均可），可通过 `python3 --version` 确认。

### 完整命令参数

| 参数 | 必填 | 说明 |
|------|------|------|
| `--amount` | ✅ | 金额（元） |
| `--type` | ✅ | `expense`（支出）或 `income`（收入） |
| `--category` | | 分类，默认「其他」 |
| `--note` | | 备注 |
| `--date` | | 日期 YYYY-MM-DD，默认今天 |
| `--feishu` | | 同步飞书（默认开启） |
| `--no-feishu` | | 禁用飞书同步，仅写本地 |

> **⚠️ 飞书同步规则**：`--type expense`（支出）同时写入明细表和汇总表；`--type income`（收入）仅写入汇总表，明细表只存支出记录（用于 App 仪表盘分类图表展示）。

### 查询命令

```bash
# 今日账单
python3 scripts/record_bill.py --list

# 指定日期
python3 scripts/record_bill.py --list --date 2026-05-15

# 月度汇总
python3 scripts/record_bill.py --summary --month 2026-05
```

### 图片记账

用户发送账单图片（无文字）时：
1. 用 vision 模型看图识别金额
2. 直接按识别结果执行记账命令，不需要询问用户确认

### 分类关键词（AI 解析参考）

详见 `references/categories.md`，核心规则：

| 类型 | 分类 | 关键词 |
|------|------|--------|
| 支出 | 餐饮 | 早饭/午饭/晚饭/外卖/咖啡/奶茶/餐厅 |
| 支出 | 购物 | 超市/衣服/鞋子/电商/淘宝/京东/日用品 |
| 支出 | 交通 | 打车/地铁/公交/停车/加油/滴滴 |
| 支出 | 娱乐 | 电影/KTV/旅游/游戏氪金/彩票 |
| 支出 | 通讯 | 话费/流量/套餐 |
| 支出 | 医疗 | 医院/药店/挂号/体检 |
| 支出 | 住房 | 房租/水电/物业/宽带 |
| 支出 | 教育 | 学费/课程/书/培训 |
| 支出 | 服饰 | 衣服/鞋子/包包/穿搭/配饰 |
| 支出 | 生活 | 日用/日用品/理发/洗衣/五金 |
| 支出 | 数码 | 手机/数码/充电器/耳机/硬盘 |
| 支出 | 运动 | 健身/运动/游泳/羽毛球/球鞋 |
| 支出 | 宠物 | 宠物/猫粮/狗粮/猫砂/疫苗 |
| 收入 | 工资 | 工资/薪资/月薪 |
| 收入 | 兼职 | 兼职/副业/接单 |
| 收入 | 投资 | 理财/股票/基金/利息 |

**飞书分类映射**：13个分类在飞书明细表中均有对应选项，无需映射损耗。本地「其他/银行/工资/奖金/兼职/投资」→ 飞书「其它」。

---

## 目录结构

```
feishu-accounting/
├── SKILL.md                   # 本文件
├── scripts/
│   ├── record_bill.py         # 记账核心脚本
│   ├── setup_bitable.py       # 一键搭建多维表格脚本
│   └── cleanup_bitable.py     # 清空多维表格数据（重置/测试用）
└── references/
    └── categories.md          # 分类关键词参考
```

## 环境变量

| 变量名 | 说明 | 示例 |
|--------|------|------|
| `FEISHU_APP_ID` | 飞书应用 App ID（必填） | `cli_xxxxxxxxxxxxxxxx` |
| `FEISHU_APP_SECRET` | 飞书应用 App Secret（必填） | `xxxxxxxxxxxxxxxxxx` |
| `FEISHU_BASE_TOKEN` | 多维表格 Base Token | `your_base_token_here` |
| `FEISHU_DETAIL_TABLE_ID` | 明细表 ID | `tblxxxxxxxxxxxxxxxx` |
| `FEISHU_SUMMARY_TABLE_ID` | 汇总表 ID | `tblyyyyyyyyyyyyyyyy` |

> **无需 User Access Token**：record_bill.py 使用永久有效的 Tenant Token（自动从 App ID + Secret 获取），不再有 7 天过期问题。

---

## ⚠️ 常见问题与注意事项

| 常见问题 | 原因 | 解决办法 |
|------|------|--------|
| 建表时 HTTP 400 Bad Request | 缺 `base:table:create` 权限 | 在开放平台单独开通此权限并重新发版 |
| 飞书字段 index 写反，写入后数据全 null | 金额写成 index=4、分类写成 index=2，字段顺序和实际不匹配 | 写字段前用 Tenant Token 调 `GET .../fields` 确认字段顺序，不要靠记忆 |
| `sync_to_feishu()` 漏传某些字段 | 只同步了月份/金额/分类，`文本` 和 `单选` 字段未传入。飞书 API 返回 200 但这些字段全 null | 新增飞书字段后，`sync_to_feishu()` 的 config 和函数签名必须同步更新 |
| Tenant Token 下 `page_size=100` 实际只返回 20 条 | 飞书 API 对 Tenant Token 有分页限制，`page_token` 返回 null | 翻页用 `offset` 参数：第 1 页不带 offset，第 2 页 `offset=20`，第 3 页 `offset=40` |
| 用 `text.includes('-')` 判断有效记录，漏掉了有效数据 | 明细表有些记录的 `文本` 字段为 null，但金额和分类有效。`text.includes('-')` 会把这些记录全过滤掉 | 判断标准：amount 非 null 且非 0 即可进入聚合，不管 text 是不是 null |
| `record_bill.py` 只写明细表，汇总表数据缺失 | 汇总表是仪表盘收支数据来源之一，漏写会导致统计数据不完整 | 每次 `add_record()` 必须同时调用 `sync_to_feishu()` 写明细表 + `sync_summary_to_feishu()` 写汇总表 |

---

## 飞书文本字段格式（与仪表盘 app 关联）

`record_bill.py` 写入飞书的文本格式为：

```
{YYYY-MM-DD} {HH:mm}{备注}
例如：2026-05-15 13:11停车费
```

仪表盘 app 解析规则：
- 有时间戳的记录：`(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2})` → 提取日期 + 时间
- 无时间戳的旧记录：`(\d{4}-\d{2}-\d{2})` → 仅提取日期（兜底）

> ⚠️ 如需修改 `record_bill.py` 的文本写入格式，请同步确认仪表盘 app 的正则解析逻辑能否兼容新旧两种格式。
