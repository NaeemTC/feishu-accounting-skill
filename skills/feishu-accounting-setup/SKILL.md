---
name: feishu-accounting-setup
description: 飞书多维表格记账系统一键配置技能。帮助 AI 特工引导用户完成飞书应用创建、权限开通、CLI 安装、多维表格及两个记账表（明细表+汇总表）的创建，最终获取 base_token 和 table_id 并写入配置文件。全程无需用户手动操作飞书网页。
version: 1.0.0
author: Naeem
homepage: https://github.com/TANGJUNHUIc/ai-assistant-accounting
tags: [feishu, bitable, accounting, setup]
---

# 飞书多维表格记账系统配置技能

## 简介

本技能用于在飞书多维表格上搭建个人记账系统。AI 特工运行本技能后，会引导用户完成飞书应用创建、权限开通、CLI 安装、多维表格创建，最后输出 base_token 和两个 table_id，供 `personal-accounting` 记账技能使用。

**目标表结构**：

| 表名 | 字段 |
|------|------|
| 明细表 | 文本（text）、月份（text）、金额（number）、分类（single_select） |
| 汇总表 | 编号（text）、描述（text）、周期（text）、分类（select）、金额（number） |

---

## 触发条件

用户说以下内容时触发本技能：
- "配置飞书记账"
- "帮我搭建记账系统"
- "飞书记账怎么配置"
- "setup feishu accounting"
- "我想用飞书记账"

---

## 前置依赖

### 需要安装的工具

- `feishu-cli` v1.25.0（飞书 CLI 工具）
- `curl`、`tar`（系统自带）

### 用户的飞书应用

用户需要有一个飞书自建应用（App ID + App Secret）。**如果用户已有应用，跳过 Step 2，直接用已有凭证跳到 Step 3。**

---

## 完整配置流程

### Step 1：安装 feishu-cli

```bash
# 下载（国内网络用 gh-proxy.com 加速）
curl -L --max-time 60 -o /tmp/feishu-cli.tar.gz \
  "https://gh-proxy.com/https://github.com/riba2534/feishu-cli/releases/download/v1.25.0/feishu-cli_v1.25.0_linux-amd64.tar.gz"

# 解压安装
cd /tmp && tar -xzf feishu-cli.tar.gz
sudo cp feishu-cli_v1.25.0_linux-amd64/feishu-cli /usr/local/bin/

# 验证
feishu-cli --version
```

---

### Step 2：引导用户创建飞书自建应用

**告诉用户执行以下操作**（可复制给用户）：

> **请在飞书开放平台创建一个自建应用：**
>
> 1. 打开 https://open.feishu.cn/app
> 2. 点击「创建企业自建应用」
> 3. 填写应用名称（如「记账助手」）和描述
> 4. 创建完成后，在「凭证与基础信息」页面复制 **App ID** 和 **App Secret**
>
> 复制好这两个值后告诉我。

**等待用户提供 App ID 和 App Secret。**

---

### Step 3：引导用户开通权限

**告诉用户执行以下操作**：

> **请在飞书开放平台开通以下权限：**
>
> 1. 打开 https://open.feishu.cn/app/[你的AppID]/auth
> 2. 点击「权限管理」→「开通权限」
> 3. 搜索并开通以下权限：
>
> | 权限名称 | 权限标识 |
> |----------|----------|
> | 查看、评论、编辑和管理多维表格 | `base:app:read`、`base:app:update` |
> | 创建多维表格 | `base:app:create` |
> | 查看、创建、编辑和删除数据表 | `base:table:read`、`base:table:create`、`base:table:update`、`base:table:delete` |
> | 查看、创建、编辑和删除字段 | `base:field:read`、`base:field:create`、`base:field:update`、`base:field:delete` |
> | 查看、创建、编辑和删除记录 | `base:record:read`、`base:record:create`、`base:record:update`、`base:record:delete` |
> | 查看和编辑视图 | `base:view:read`、`base:view:write_only` |
>
> 4. 权限开通后，点击「申请发版」→ 选择「线上版本」→ 确认发布
>
> **重要：不发布版本的话权限不会生效！**

**等待用户确认权限已开通并发布。**

---

### Step 4：配置 feishu-cli

拿到用户的 App ID 和 App Secret 后，配置 CLI：

```bash
# 初始化配置（生成 ~/.feishu-cli/config.yaml）
feishu-cli config init

# 查看配置文件路径
cat ~/.feishu-cli/config.yaml
```

编辑 `~/.feishu-cli/config.yaml`，将用户的 App ID 和 App Secret 填入：

```yaml
app_id: "cli_你的AppID"       # 例如：***REMOVED***
app_secret: "你的AppSecret"    # 例如：***REMOVED***
base_url: "https://open.feishu.cn"
debug: false
```

---

### Step 5：认证（获取 User Access Token）

**bitable/多维表格操作必须使用 User Access Token**，Tenant Token 权限不足：

```bash
# 第一步：请求设备码（立即返回 JSON）
feishu-cli auth login --domain bitable --recommend --json --no-wait
```

输出示例：
```json
{
  "device_code": "XXXXX",
  "user_code": "ABCD-EFGH",
  "verification_url": "https://www.feishu.cn/api/auth/device?code=ABCD-EFGH",
  "interval": 5
}
```

**告诉用户**：

> **请在浏览器中打开以下网址完成授权：**
> https://www.feishu.cn/api/auth/device?code=ABCD-EFGH
>
> （把上面的 device_code 换成实际值）
>
> 用飞书扫码或确认授权后告诉我。

**等待用户确认授权完成后**，继续：

```bash
# 第二步：用 device_code 换取 Token（等待用户授权后执行）
feishu-cli auth login --device-code <上一步的device_code> --json
```

成功后会显示 Token 信息，Token 自动保存到 `~/.feishu-cli/token.json`。

---

### Step 6：创建多维表格（Base）

```bash
# 创建多维表格，返回 base_token
feishu-cli bitable app create --name "个人记账本"
```

**记录返回的 base_token**（格式如 `***REMOVED***`）。

---

### Step 7：在多维表格内创建两个表

#### 7.1 创建明细表

```bash
BASE_TOKEN="你的base_token"

# 创建明细表
feishu-cli bitable table create --base-token $BASE_TOKEN --name "明细表"
```

**记录返回的 table_id**（格式如 `tbl6Nr0zDhNEjjC7`），这是明细表ID。

#### 7.2 创建汇总表

```bash
# 创建汇总表
feishu-cli bitable table create --base-token $BASE_TOKEN --name "汇总表"
```

**记录返回的 table_id**，这是汇总表ID。

---

### Step 8：创建明细表字段

拿到明细表 table_id 后，执行以下命令创建字段：

```bash
BASE_TOKEN="你的base_token"
DETAIL_TABLE_ID="明细表的table_id"

# 创建「文本」字段（text）
feishu-cli bitable field create --base-token $BASE_TOKEN --table-id $DETAIL_TABLE_ID \
  --config '{"field_name":"文本","type":"text"}'

# 创建「月份」字段（text）
feishu-cli bitable field create --base-token $BASE_TOKEN --table-id $DETAIL_TABLE_ID \
  --config '{"field_name":"月份","type":"text"}'

# 创建「金额」字段（number）
feishu-cli bitable field create --base-token $BASE_TOKEN --table-id $DETAIL_TABLE_ID \
  --config '{"field_name":"金额","type":"number"}'

# 创建「分类」字段（single_select）
feishu-cli bitable field create --base-token $BASE_TOKEN --table-id $DETAIL_TABLE_ID \
  --config '{"field_name":"分类","type":"single_select"}'

# 为分类字段添加选项
# 先查字段ID
feishu-cli bitable field list --base-token $BASE_TOKEN --table-id $DETAIL_TABLE_ID
# 假设分类字段ID是 xxx，更新选项
feishu-cli bitable field update --base-token $BASE_TOKEN --table-id $DETAIL_TABLE_ID --field-id <分类字段ID> \
  --config '{"field_name":"分类","type":"select","options":[{"name":"其它"},{"name":"生活"},{"name":"娱乐"},{"name":"通讯"},{"name":"交通"},{"name":"购物"},{"name":"餐饮"}]}'
```

---

### Step 9：创建汇总表字段

```bash
BASE_TOKEN="你的base_token"
SUMMARY_TABLE_ID="汇总表的table_id"

# 创建「编号」字段
feishu-cli bitable field create --base-token $BASE_TOKEN --table-id $SUMMARY_TABLE_ID \
  --config '{"field_name":"编号","type":"text"}'

# 创建「描述」字段
feishu-cli bitable field create --base-token $BASE_TOKEN --table-id $SUMMARY_TABLE_ID \
  --config '{"field_name":"描述","type":"text"}'

# 创建「周期」字段
feishu-cli bitable field create --base-token $BASE_TOKEN --table-id $SUMMARY_TABLE_ID \
  --config '{"field_name":"周期","type":"text"}'

# 创建「分类」字段
feishu-cli bitable field create --base-token $BASE_TOKEN --table-id $SUMMARY_TABLE_ID \
  --config '{"field_name":"分类","type":"single_select"}'

# 为分类字段添加选项（支出/收入）
feishu-cli bitable field list --base-token $BASE_TOKEN --table-id $SUMMARY_TABLE_ID
feishu-cli bitable field update --base-token $BASE_TOKEN --table-id $SUMMARY_TABLE_ID --field-id <分类字段ID> \
  --config '{"field_name":"分类","type":"select","options":[{"name":"支出"},{"name":"收入"}]}'

# 创建「金额」字段
feishu-cli bitable field create --base-token $BASE_TOKEN --table-id $SUMMARY_TABLE_ID \
  --config '{"field_name":"金额","type":"number"}'
```

---

### Step 10：验证配置成功

```bash
# 查看多维表格信息
feishu-cli bitable get --base-token $BASE_TOKEN

# 列出所有表
feishu-cli bitable table list --base-token $BASE_TOKEN

# 查看明细表字段
feishu-cli bitable field list --base-token $BASE_TOKEN --table-id $DETAIL_TABLE_ID

# 查看汇总表字段
feishu-cli bitable field list --base-token $BASE_TOKEN --table-id $SUMMARY_TABLE_ID
```

---

## 配置输出

配置完成后，向用户报告以下信息（**让用户保存好**）：

```
✅ 飞书记账配置完成！

请保存以下凭证：
- Base Token：<base_token>
- 明细表 Table ID：<detail_table_id>
- 汇总表 Table ID：<summary_table_id>

这些凭证需要配置到 personal-accounting 技能的 record_bill.py 中。
```

---

## 配置 personal-accounting 技能

拿到 base_token 和 table_id 后，更新 `personal-accounting/scripts/record_bill.py` 中的配置：

```python
# 飞书多维表格配置
FEISHU_BASE_TOKEN = "<base_token>"           # 例如：***REMOVED***
FEISHU_DETAIL_TABLE_ID = "<detail_table_id>" # 例如：tbl6Nr0zDhNEjjC7
FEISHU_SUMMARY_TABLE_ID = "<summary_table_id>" # 例如：tblioEEIdjVLosqS
```

---

## 常见问题

### Q: `feishu-cli auth login` 一直等待怎么办？

A: 确保用户已在浏览器完成授权。如果超时，重新执行第一步重新获取 device_code。

### Q: 权限都开了但还是报 `missing User Access Token`？

A: 多维表格操作强制需要 User Access Token，Tenant Token 不够。重新执行 `feishu-cli auth login --domain bitable`。

### Q: `bitable app create` 报错？

A: 确认已开通 `base:app:create` 权限并发布应用版本。

### Q: 字段选项无法创建，报 `invalid_request`？

A: 更新字段选项时，请求体必须同时包含 `field_name` + `type` + `options`，三缺一必报错。

### Q: 用户没有飞书自建应用怎么办？

A: 引导用户去 https://open.feishu.cn/app 创建。创建后还需要「申请发版」让权限生效。

---

## 相关技能

- `personal-accounting`：记账核心技能，读写本技能创建的表
- `feishu-cli`：飞书 CLI 工具，本技能依赖它操作多维表格
