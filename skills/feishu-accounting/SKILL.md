---
name: feishu-accounting
description: 飞书多维表格记账系统完整技能包。包含两步：1）运行 feishu-accounting-setup 引导用户完成飞书应用创建、多维表格搭建、凭证获取；2）使用 record_bill.py 进行日常记账（支持本地存储 + 飞书多维表格同步）。**同步使用永久有效的 Tenant Token。单表模式：所有记录写入明细表，通过「类型」字段区分支出和收入。**
version: 1.3.4
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
| **Usage** | 用户记账（说金额/上传图片/查账单） | 解析记账输入 → 写本地 bills/ → 同步飞书明细表（单表模式） |

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
3. 创建一张明细表（单表模式，支出和收入共用）
4. 创建所有字段（文本/月份/金额/分类/类型）+ 补充选项（18个分类 + 收支类型选项）

输出 4 个凭证：App ID / App Secret / Base Token / 明细表 Table ID

### Step 4：输出凭证给用户

**AI 必须将以下 4 个凭证填入实际值后发送给用户（App ID / App Secret 来自 Step 1 用户提供的值，Base Token / Table ID 来自 Step 3 脚本输出的）：**

> ✅ 飞书记账配置完成！
>
> 请保存以下 4 个凭证——首次打开手机 App 时需要按顺序输入：
>
> 1. **App ID**：`你的App_ID`
> 2. **App Secret**：`你的App_Secret`
> 3. **Base Token**：`你的Base_Token`
> 4. **明细表 Table ID**：`你的明细表ID`
>
> 输入后 App 就能正常查看你的账单数据了。
>
> 📊 **多维表格链接**：https://bytedance.feishu.cn/base/`你的Base_Token`
> （浏览器打开就能直接看到你建的全量账本数据）

### Step 5：配置凭证（让 record_bill.py 能用）

**AI 执行**，在 skill 目录下创建 `.env` 文件（`record_bill.py` 启动时会自动加载）：

```bash
# 在技能目录创建 .env（record_bill.py 会自动从同目录读取）
cat > /path/to/feishu-accounting/.env << 'EOF'
FEISHU_APP_ID=你的App_ID
FEISHU_APP_SECRET=你的App_Secret
FEISHU_BASE_TOKEN=你的Base_Token
FEISHU_DETAIL_TABLE_ID=你的明细表ID
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
```

**如果未设置**，跳回第一阶段（Setup）流程，重新引导用户获取凭证。

### 记账命令

```bash
# 方式一：直接调用（脚本自动加载同目录 .env）
python3 /path/to/scripts/record_bill.py \
  --amount 23.40 --type expense --category 餐饮 --note "午饭"

# 方式二：环境变量注入（适合临时调用）
FEISHU_BASE_TOKEN=xxx FEISHU_DETAIL_TABLE_ID=xxx \
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

> **⚠️ 单表模式**：支出和收入均写入同一张明细表，通过「类型」字段区分。App 端按类型字段分组聚合计算月度收支。

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

详见 `references/categories.md` 和 `references/feishu-permissions-api.md`（飞书权限 API 模式），核心规则：

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

**飞书分类映射**：13个支出分类 + 5个收入分类（工资/奖金/兼职/投资/其他），在飞书明细表中均有对应选项，无需映射损耗。

---

## 目录结构

```
feishu-accounting/
├── SKILL.md                   # 本文件
├── scripts/
│   ├── record_bill.py         # 记账核心脚本
│   ├── setup_bitable.py       # 一键搭建多维表格脚本
│   ├── cleanup_bitable.py     # 清空多维表格数据（重置/测试用）
│   └── apply_permissions.py   # 一键权限申请——生成授权链接 + 调 scopes/apply
└── references/
    └── categories.md                # 分类关键词参考
    └── feishu-base-api-pitfalls.md   # base/v3 API 踩坑记录（分页/字段/格式）
    └── feishu-permissions-api.md     # 飞书权限一键授权 API 模式
```

## 环境变量

| 变量名 | 说明 | 示例 |
|--------|------|------|
| `FEISHU_APP_ID` | 飞书应用 App ID（必填） | `cli_xxxxxxxxxxxxxxxx` |
| `FEISHU_APP_SECRET` | 飞书应用 App Secret（必填） | `xxxxxxxxxxxxxxxxxx` |
| `FEISHU_BASE_TOKEN` | 多维表格 Base Token | `your_base_token_here` |
| `FEISHU_DETAIL_TABLE_ID` | 明细表 ID（单表，含类型字段区分收支） | `tblxxxxxxxxxxxxxxxx` |

> **无需 User Access Token**：record_bill.py 使用永久有效的 Tenant Token（自动从 App ID + Secret 获取），不再有 7 天过期问题。

---

## ⚠️ 常见问题与注意事项

| 常见问题 | 原因 | 解决办法 |
|------|------|--------|
| 建表时 HTTP 400 Bad Request | 缺 `base:table:create` 权限 | 在开放平台单独开通此权限并重新发版 |
| 飞书字段 index 写反，写入后数据全 null | 金额写成 index=4、分类写成 index=2，字段顺序和实际不匹配 | 写字段前用 Tenant Token 调 `GET .../fields` 确认字段顺序，不要靠记忆 |
| `sync_to_feishu()` 漏传某些字段 | 只同步了月份/金额/分类，`文本` 和 `单选` 字段未传入。飞书 API 返回 200 但这些字段全 null | 新增飞书字段后，`sync_to_feishu()` 的 config 和函数签名必须同步更新 |
| Tenant Token 下 `page_size=100` 实际只返回 ~20 条 | 飞书 API 对 Tenant Token 有分页限制，`page_token` 返回 null | 翻页用 `offset += len(records)` 动态累加（而非固定步长）。详见 `references/feishu-base-api-pitfalls.md` |
| 用 `text.includes('-')` 判断有效记录，漏掉了有效数据 | 明细表有些记录的 `文本` 字段为 null，但金额和分类有效。`text.includes('-')` 会把这些记录全过滤掉 | 判断标准：amount 非 null 且非 0 即可进入聚合，不管 text 是不是 null |
| `record_bill.py` 飞书同步失败 | 凭证未配置或权限不足 | 检查 .env 文件中的 4 个凭证，确认 `base:record:create` 权限已开通 |
| `.env` 中 FEISHU_APP_ID 没生效，仍用了父 shell 的旧值 | `os.environ.setdefault()` 不覆盖已有变量 | `.env` 加载改用直接赋值 `os.environ[k] = v` |
| **APK 端：收入记录混入支出图表/明细列表** | `catSummaryFromDetail()` 和 `getDashRecords()` 没按 FI.type 过滤收入 | 添加 `if(type==='收入')continue;`（参见 `incomeCatSummaryFromDetail` 的写法） |
| **重装 skill 时把旧 .env 带了过去** | 备份恢复操作保留旧属性（如已不用的 SUMMARY_TABLE_ID） | 全新安装时不应备份旧 .env，让用户重新走 Setup 流程获取新凭证 |
| **income 记录写飞书后分类变成「其它」** | `FEISHU_CATEGORY_MAP` 中 `工资/奖金/兼职/投资` 映射为 `"其它"`（双表时代残留，收入只写汇总表不需要细分类） | 单表下收入分类应映射自身：`"工资": "工资"`，同步更新 `setup_bitable.py` 确保分类字段包含这些选项 |
| **APK 端收入分类「其他」匹配不上飞书「其它」** | 飞书分类字段选项名是 `"其它"`（⺮它），但 APK 的 `INCOME_CATS` / `INC_COLORS` / 回退逻辑用了 `"其他"`（⺮他）。姓不同，indexOf 返回 -1 全部归入「其他」 | 全部统一为 `"其它"`：`INCOME_CATS`、`INC_COLORS` 键名、`incomeCatSummaryFromDetail` 回退值，三处一起改 |

## 🔧 APK 开发与维护

### Git 工作流（重要）

本技能涉及 GitHub 仓库 `NaeemTC/feishu-accounting-skill` 的代码维护。**所有 git 操作必须遵守以下规则：**

> ⚠️ **数据源可控，不加防御代码**：`record_bill.py` 是唯一的数据写入入口，`amount` 字段类型固定为 number。APK 端无需加 `parseFloat` 防御，所有字段类型都由你控制的脚本确定，不会变。不要加无意义的防御代码。

**有关数据源确定性的重要原则：** `record_bill.py` 是唯一写入飞书多维表格的脚本，因此 `amount` 字段的类型始终是 number（来自脚本中的 `amount: float` 参数），`文本`、`月份` 字段始终是 string，`分类`、`类型` 是 single-select（返回数组）。APK 端读取时无需对字段类型做冗余防御（如 `parseFloat`），因为数据管道是封闭、可控的。如需改变字段类型，改 `record_bill.py` 并同时更新 APK 端 `FI` 映射即可。

**改动前必须先列清单让用户确认**：动手改任何代码之前，必须先列出要改的文件和具体改动（增/删/改哪里），让用户点头再动手。不能「先改再说」。这条规则在 commit/push/release 前同样适用。

**只改根因文件，不改 collateral**：定位到一个 bug 后，只改导致 bug 的根因文件。不要顺手改其他文件中「看起来也对但跟这个 bug 无关」的代码。比如：`FEISHU_CATEGORY_MAP` 映射错了导致收入分类变「其它」，那就只改 `record_bill.py`。`dist/index.html` 的 `INCOME_CATS` / `INC_COLORS` 虽然跟分类相关，但在这个 bug 里不是根因，不动。

1. **任何 commit / push / tag / release 操作前，必须先问用户确认**
2. 用户说「改了 APK 要先发测试」→ 先 build APK 发给用户测，确认无误再推 git
3. github-repo-management 的审计清单（token 泄漏、硬编码路径等）必须过一遍
4. 版本号三处同步：`dist/index.html` 的 `APP_VERSION` + `android/app/build.gradle` 的 `versionName/versionCode` + `SKILL.md` 的 frontmatter
5. Release 上传 APK 固定命名 `app-release.apk`，使 latest 链接永久有效
6. **keystore 密码不得硬编码在 build.gradle 中** — 移入 `android/keystore.properties`，`.gitignore` 排除。提供 `keystore.properties.example` 模板。这一步在发布前必须检查
7. **ClawHub 同步** — GitHub 发布后，`clawhub publish ~/.hermes/skills/feishu-accounting --slug feishu-accounting --name "个人记账with仪表盘app" --version X.Y.Z --changelog "..."`。ClawHub 和 GitHub 是独立的，不同步

### 常见 APK 端 Bug 模式

| Bug | 根因 | 修复 |
|-----|------|------|
| 收入记录出现在支出饼图/消费明细/日趋势图中 | `catSummaryFromDetail()` 和 `getDashRecords()` 遍历 detailRecords 时没按 `FI.type` 过滤 | 添加 `var type=r[FI.type]||''; if(Array.isArray(type))type=type[0]||''; if(type==='收入')continue;` |
| 新安装 APK 提示「正在连接飞书...」无限转圈 | **① 旧版 localStorage 存了过期凭证** — 新应用 ID/Secret 不对应 | 错误页点「重新配置」按钮清除 localStorage，或手动填写新凭证 |
| | **② JS 声明顺序崩溃（更致命）** — `var DEFAULT_CATS=ALL_CATS.slice()` 写在 `var ALL_CATS=[...]` 之前，`ALL_CATS` 未赋值导致 `undefined.slice()` 抛出 TypeError，脚本在加载期即中断，`init()` 永不执行，线上 spinner 永远转 | 确保 `ALL_CATS` 定义在 `DEFAULT_CATS` 之前。调试方法：用 `browser_console` 看是否有 `Uncaught TypeError`（脚本加载期错误不会被 Promise.catch 捕获） |
| 检查更新按钮点了没反应/一直转 | **① fetch 回调没调 `.json()`** — 返回的是 Response 对象，`d.tag_name` 为 undefined，条件判断永不通过 | 加 `.then(r=>r.json())` 解析 JSON |
| | **② 无超时保护** — 请求挂起时 spinner 无限转 | 加 `AbortController` + 10 秒超时，超时显示「检查更新失败，请稍后重试」 |
| 主题切换后图表瞬间消失 | `applyTheme` 中 dispose/recreate 图表无过渡 | 已修复：render 后对 chart 容器加 `.chart-fade` 动画类 |
| 所有图表/卡片按月查看全空，日趋势/明细永远「暂无数据」 | `var FI` 字段索引映射不对应飞书 API 返回的数组顺序。实际数组为 `[ID,文本,金额,分类,类型,月份]`（按 field_id 字母序），但代码写成了 `{text:0,month:1}`（实际 text 在 index 1，month 在 index 5） | 调 API 验证数组顺序，设 `FI={text:1,month:5,amount:2,category:3,type:4}`。注意自动编号字段占用 index 0，单选字段返回 `[值]` 数组。详见 `references/feishu-base-api-pitfalls.md` 第6节 |

### UI 风格约定

- 按钮反馈：所有可点击元素统一使用 `transform:scale(.88~.97)`，不用 `opacity`
- 弹窗：必须支持点背景关闭（`if(e.target===this)hideXxx()`）
- 禁态：`mbtn:disabled` 设 `opacity:.35;cursor:not-allowed;transform:none!important`
- 过渡：页面切换加 `.fade-in`（`fadeUp` 动画），主题切换图表加 `.chart-fade`
- 颜色：禁止硬编码 `#666`，必须用 `var(--dim)` 或 `CUR_THEME.axisLabel`

---



