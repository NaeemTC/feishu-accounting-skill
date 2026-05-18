---
name: feishu-accounting
description: 飞书多维表格记账系统完整技能包。包含两步：1）运行 feishu-accounting-setup 引导用户完成飞书应用创建、多维表格搭建、凭证获取；2）使用 record_bill.py 进行日常记账（支持本地存储 + 飞书多维表格同步，自动同时写入明细表和汇总表）。
version: 1.0.0
author: Naeem
homepage: https://github.com/NaeemTC/feishu-accounting-skill
tags: [feishu, bitable, accounting, setup]
---

# 飞书多维表格记账系统

## 概述

本技能是完整的飞书记账解决方案，分两个阶段：

| 阶段 | 触发条件 | 做什么 |
|------|----------|--------|
| **Setup** | 用户请求配置记账系统 | 安装 CLI → 创建飞书应用 → 建表 → 输出凭证 |
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

### Step 1：安装 feishu-cli

```bash
curl -L --max-time 60 -o /tmp/feishu-cli.tar.gz \
  "https://gh-proxy.com/https://github.com/riba2534/feishu-cli/releases/download/v1.25.0/feishu-cli_v1.25.0_linux-amd64.tar.gz"
cd /tmp && tar -xzf feishu-cli.tar.gz
sudo cp feishu-cli_v1.25.0_linux-amd64/feishu-cli /usr/local/bin/
feishu-cli --version
```

### Step 2：引导用户创建飞书自建应用

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

### Step 3：引导用户开通权限

**把以下内容发给用户：**

> **请在飞书开放平台开通以下权限：**
>
> 1. 打开 https://open.feishu.cn/app/[你的AppID]/auth
> 2. 点击「权限管理」→「开通权限」，搜索并开通：
>
> | 权限 | 标识 |
> |------|------|
> | 查看、编辑多维表格 | `base:app:read`、`base:app:update` |
> | 创建多维表格 | `base:app:create` |
> | 数据表 CRUD | `base:table:read/create/update/delete` |
> | 字段 CRUD | `base:field:read/create/update/delete` |
> | 记录 CRUD | `base:record:read/create/update/delete` |
> | 视图读写 | `base:view:read`、`base:view:write_only` |
>
> 3. 开通权限后，点击「申请发版」→「线上版本」→「确认发布」
>
> **⚠️ 不发布版本权限不会生效！**

### Step 4：配置 feishu-cli

```bash
feishu-cli config init
# 编辑 ~/.feishu-cli/config.yaml，填入用户的 App ID 和 App Secret
```

```yaml
app_id: "cli_用户的AppID"
app_secret: "用户的AppSecret"
base_url: "https://open.feishu.cn"
debug: false
```

### Step 5：认证

```bash
# 第一步：获取设备码
feishu-cli auth login --domain bitable --recommend --json --no-wait
```

**把输出中的 `verification_url` 发给用户，让他们在浏览器完成授权。**

```bash
# 用户授权完成后第二步
feishu-cli auth login --device-code <device_code> --json
```

### Step 6：创建多维表格

```bash
feishu-cli bitable app create --name "个人记账本"
```

**记录返回的 base_token**（格式如 `Cq5d8wXzuQ3y0kvLFHn12s34pAB`）。

### Step 7：创建两个表

```bash
BASE_TOKEN="上面获取的base_token"

# 创建明细表
feishu-cli bitable table create --base-token $BASE_TOKEN --name "明细表"
# 记录返回的 table_id（明细表ID）

# 创建汇总表
feishu-cli bitable table create --base-token $BASE_TOKEN --name "汇总表"
# 记录返回的 table_id（汇总表ID）
```

### Step 8：创建字段

```bash
BASE_TOKEN="你的base_token"
DETAIL_TABLE_ID="明细表table_id"
SUMMARY_TABLE_ID="汇总表table_id"

# ── 明细表字段 ──
feishu-cli bitable field create --base-token $BASE_TOKEN --table-id $DETAIL_TABLE_ID \
  --config '{"field_name":"文本","type":"text"}'
feishu-cli bitable field create --base-token $BASE_TOKEN --table-id $DETAIL_TABLE_ID \
  --config '{"field_name":"月份","type":"text"}'
feishu-cli bitable field create --base-token $BASE_TOKEN --table-id $DETAIL_TABLE_ID \
  --config '{"field_name":"金额","type":"number"}'
feishu-cli bitable field create --base-token $BASE_TOKEN --table-id $DETAIL_TABLE_ID \
  --config '{"field_name":"分类","type":"single_select"}'

# 为明细表分类字段加选项
feishu-cli bitable field list --base-token $BASE_TOKEN --table-id $DETAIL_TABLE_ID
# 找到分类字段ID后
feishu-cli bitable field update --base-token $BASE_TOKEN --table-id $DETAIL_TABLE_ID \
  --field-id <分类字段ID> \
  --config '{"field_name":"分类","type":"select","options":[{"name":"其它"},{"name":"生活"},{"name":"娱乐"},{"name":"通讯"},{"name":"交通"},{"name":"购物"},{"name":"餐饮"}]}'

# ── 汇总表字段 ──
feishu-cli bitable field create --base-token $BASE_TOKEN --table-id $SUMMARY_TABLE_ID \
  --config '{"field_name":"编号","type":"text"}'
feishu-cli bitable field create --base-token $BASE_TOKEN --table-id $SUMMARY_TABLE_ID \
  --config '{"field_name":"描述","type":"text"}'
feishu-cli bitable field create --base-token $BASE_TOKEN --table-id $SUMMARY_TABLE_ID \
  --config '{"field_name":"周期","type":"text"}'
feishu-cli bitable field create --base-token $BASE_TOKEN --table-id $SUMMARY_TABLE_ID \
  --config '{"field_name":"分类","type":"single_select"}'

# 为汇总表分类字段加选项
feishu-cli bitable field list --base-token $BASE_TOKEN --table-id $SUMMARY_TABLE_ID
feishu-cli bitable field update --base-token $BASE_TOKEN --table-id $SUMMARY_TABLE_ID \
  --field-id <分类字段ID> \
  --config '{"field_name":"分类","type":"select","options":[{"name":"支出"},{"name":"收入"}]}'

feishu-cli bitable field create --base-token $BASE_TOKEN --table-id $SUMMARY_TABLE_ID \
  --config '{"field_name":"金额","type":"number"}'
```

### Step 9：输出凭证

> ⚠️ **App ID 和 App Secret 来自用户在第 2 步提供的信息**，AI 应在此处引用用户之前给出的值，确保证书完整。

**把以下信息发送给用户：**

```
|✅ 飞书记账配置完成！

请保存以下 5 个凭证——首次打开手机 App 时需要按顺序输入：

1. App ID：<用户在第2步提供的 app_id>
2. App Secret：<用户在第2步提供的 app_secret>
3. Base Token：<base_token>
4. 明细表 Table ID：<detail_table_id>
5. 汇总表 Table ID：<summary_table_id>

输入这 5 项后，App 就能正常查看你的账单数据了。
```

### Step 10：配置凭证（让 record_bill.py 能用）

**AI 执行**，在 skill 目录下创建 `.env` 文件（`record_bill.py` 启动时会自动加载）：

```bash
# 在技能目录创建 .env（record_bill.py 会自动从同目录读取）
cat > /path/to/feishu-accounting/.env << 'EOF'
FEISHU_BASE_TOKEN=$BASE_TOKEN
FEISHU_DETAIL_TABLE_ID=$DETAIL_TABLE_ID
FEISHU_SUMMARY_TABLE_ID=$SUMMARY_TABLE_ID
EOF
```

或通过环境变量注入（适合临时调用）：

```bash
export FEISHU_BASE_TOKEN="你的base_token"
export FEISHU_DETAIL_TABLE_ID="你的明细表ID"
export FEISHU_SUMMARY_TABLE_ID="你的汇总表ID"
```

### Step 11：询问用户是否安装 App（仪表盘）

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
| 收入 | 工资 | 工资/薪资/月薪 |
| 收入 | 兼职 | 兼职/副业/接单 |
| 收入 | 投资 | 理财/股票/基金/利息 |

**飞书分类映射**：本地「医疗/住房/教育/其他/银行/工资/奖金/兼职/投资」→ 飞书统一为「其它」。

---

## 目录结构

```
feishu-accounting/
├── SKILL.md              # 本文件
├── scripts/
│   └── record_bill.py     # 记账核心脚本
└── references/
    └── categories.md      # 分类关键词参考
```

## 环境变量

| 变量名 | 说明 | 示例 |
|--------|------|------|
| `FEISHU_BASE_TOKEN` | 多维表格 Base Token | `Cq5d8wXzuQ3y0kvLFHn12s34pAB` |
| `FEISHU_DETAIL_TABLE_ID` | 明细表 ID | `tblxxxxxxxxxxxxxxxx` |
| `FEISHU_SUMMARY_TABLE_ID` | 汇总表 ID | `tblyyyyyyyyyyyyyyyy` |

---

## ⚠️ 常见问题与注意事项

| 常见问题 | 原因 | 解决办法 |
|------|------|--------|
| 飞书字段 index 写反，写入后数据全 null | 金额写成 index=4、分类写成 index=2，字段顺序和实际不匹配 | 写字段前用 `feishu-cli bitable field list` 确认字段顺序，不要靠记忆 |
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
