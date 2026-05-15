#!/usr/bin/env python3
"""
账单记录脚本
将账单信息写入 bills/YYYY-MM-DD.md，同一天的记录累加追加。
支持可选 --feishu 同步到飞书多维表格。

用法：
    python record_bill.py --amount 50.00 --type expense --category 餐饮 --note "午饭"
    python record_bill.py --amount 50.00 --type expense --category 餐饮 --note "午饭" --feishu  # 写本地+飞书
    python record_bill.py --list            # 列出今日账单
    python record_bill.py --list --date 2024-01-15  # 列出指定日期账单
    python record_bill.py --summary --month 2024-01  # 月度汇总

环境变量（可选，有默认值）：
    FEISHU_BASE_TOKEN       多维表格 Base Token
    FEISHU_DETAIL_TABLE_ID  明细表 Table ID
    FEISHU_SUMMARY_TABLE_ID 汇总表 Table ID
"""

import argparse
import json
import os
import re
import subprocess
import sys
from datetime import date, datetime
from pathlib import Path

# ── 配置 ─────────────────────────────────────────────────────────────────────

BILLS_DIR = Path(__file__).parent.parent / "bills"

VALID_TYPES = {"expense": "支出", "income": "收入"}

DEFAULT_CATEGORIES = {
    "expense": ["餐饮", "购物", "交通", "娱乐", "医疗", "住房", "教育", "通讯", "其他"],
    "income": ["工资", "奖金", "兼职", "投资", "其他"],
}

# 飞书多维表格配置（优先读取环境变量，支持用户注入凭证）
FEISHU_BASE_TOKEN = os.environ.get(
    "FEISHU_BASE_TOKEN",
    ""  # ❗ 新安装必须设置环境变量，默认值为空字符串
)
FEISHU_DETAIL_TABLE_ID = os.environ.get(
    "FEISHU_DETAIL_TABLE_ID",
    ""  # ❗ 新安装必须设置环境变量，默认值为空字符串
)
FEISHU_SUMMARY_TABLE_ID = os.environ.get(
    "FEISHU_SUMMARY_TABLE_ID",
    ""  # ❗ 新安装必须设置环境变量，默认值为空字符串
)

# 本地分类名 → 飞书选项名映射（飞书只有「其它」，没有「其他」）
FEISHU_CATEGORY_MAP = {
    "餐饮": "餐饮",
    "购物": "购物",
    "交通": "交通",
    "娱乐": "娱乐",
    "通讯": "通讯",
    "生活": "生活",
    "医疗": "其它",
    "住房": "其它",
    "教育": "其它",
    "其他": "其它",
    "银行": "其它",
    "工资": "其它",
    "奖金": "其它",
    "兼职": "其它",
    "投资": "其它",
}


# ── 工具函数 ──────────────────────────────────────────────────────────────────

def get_today() -> str:
    return date.today().strftime("%Y-%m-%d")


def get_time_str() -> str:
    return datetime.now().strftime("%H:%M")


def validate_date(date_str: str) -> str:
    try:
        datetime.strptime(date_str, "%Y-%m-%d")
        return date_str
    except ValueError:
        raise ValueError(f"日期格式错误，应为 YYYY-MM-DD，实际：{date_str}")


def bill_file_path(date_str: str) -> Path:
    return BILLS_DIR / f"{date_str}.md"


def _check_feishu_config() -> None:
    """启动前检查飞书凭证是否已配置"""
    if not FEISHU_BASE_TOKEN or not FEISHU_DETAIL_TABLE_ID or not FEISHU_SUMMARY_TABLE_ID:
        raise RuntimeError(
            "飞书凭证未配置！请设置以下环境变量：\n"
            "  FEISHU_BASE_TOKEN       （多维表格 Base Token）\n"
            "  FEISHU_DETAIL_TABLE_ID  （明细表 Table ID）\n"
            "  FEISHU_SUMMARY_TABLE_ID （汇总表 Table ID）\n"
            "\n"
            "或在 .env 文件中配置后 source，再运行本脚本。"
        )


def sync_summary_to_feishu(amount: float, bill_type: str, date_str: str) -> dict:
    """
    同步单条记录到飞书汇总表。
    字段：分类（支出/收入）、金额、周期（YYYY-MM）

    返回 {"success": True} 或 {"success": False, "error": "..."}
    """
    month = date_str[:7]  # "2026-05"
    type_label = "支出" if bill_type == "expense" else "收入"

    config = {
        "fields": {
            "分类": type_label,
            "金额": amount,
            "周期": month,
        }
    }

    cmd = [
        "feishu-cli", "bitable", "record", "upsert",
        "--base-token", FEISHU_BASE_TOKEN,
        "--table-id", FEISHU_SUMMARY_TABLE_ID,
        "--config", json.dumps(config),
    ]

    try:
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=15,
        )
        if result.returncode == 0:
            return {"success": True}
        else:
            return {"success": False, "error": result.stderr.strip()}
    except subprocess.TimeoutExpired:
        return {"success": False, "error": "feishu-cli 调用超时"}
    except FileNotFoundError:
        return {"success": False, "error": "feishu-cli 未找到，请确认已安装并在 PATH 中"}


def sync_to_feishu(amount: float, bill_type: str, category: str,
                    note: str, date_str: str) -> dict:
    """
    同步单条记录到飞书多维表格（明细表）。
    字段：文本(=备注)/月份/分类/金额

    返回 {"success": True} 或 {"success": False, "error": "..."}
    """
    month = date_str[:7]  # "2026-05"

    feishu_category = FEISHU_CATEGORY_MAP.get(category, "其它")

    config = {
        "fields": {
            "文本": f"{date_str} {get_time_str()}{note}",
            "月份": month,
            "分类": feishu_category,
            "金额": amount,
        }
    }

    cmd = [
        "feishu-cli", "bitable", "record", "upsert",
        "--base-token", FEISHU_BASE_TOKEN,
        "--table-id", FEISHU_DETAIL_TABLE_ID,
        "--config", json.dumps(config),
    ]

    try:
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=15,
        )
        if result.returncode == 0:
            return {"success": True}
        else:
            return {"success": False, "error": result.stderr.strip()}
    except subprocess.TimeoutExpired:
        return {"success": False, "error": "feishu-cli 调用超时"}
    except FileNotFoundError:
        return {"success": False, "error": "feishu-cli 未找到，请确认已安装并在 PATH 中"}


# ── 读取现有账单 ───────────────────────────────────────────────────────────────

def parse_bill_file(file_path: Path) -> dict:
    """解析账单文件，返回记录列表和汇总数据"""
    if not file_path.exists():
        return {"records": [], "total_expense": 0.0, "total_income": 0.0}

    content = file_path.read_text(encoding="utf-8")
    records = []

    # 解析表格行（跳过表头和分隔行）
    table_pattern = re.compile(
        r'^\|\s*(\d{2}:\d{2})\s*\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|'
        r'\s*[¥￥]?([\d.]+)\s*\|\s*([^|]*?)\s*\|',
        re.MULTILINE
    )
    for m in table_pattern.finditer(content):
        time_str, type_str, category, amount_str, note = m.groups()
        try:
            records.append({
                "time": time_str.strip(),
                "type": "expense" if "支出" in type_str else "income",
                "type_label": type_str.strip(),
                "category": category.strip(),
                "amount": float(amount_str),
                "note": note.strip(),
            })
        except ValueError:
            continue

    total_expense = sum(r["amount"] for r in records if r["type"] == "expense")
    total_income = sum(r["amount"] for r in records if r["type"] == "income")

    return {
        "records": records,
        "total_expense": total_expense,
        "total_income": total_income,
    }


# ── 生成账单文件内容 ───────────────────────────────────────────────────────────

def build_bill_content(date_str: str, records: list[dict]) -> str:
    """根据记录列表生成完整的 Markdown 账单文件"""
    lines = [
        f"# 账单 {date_str}",
        "",
        "| 时间 | 类型 | 分类 | 金额 | 备注 |",
        "|------|------|------|------|------|",
    ]

    for r in records:
        lines.append(
            f"| {r['time']} | {r['type_label']} | {r['category']} "
            f"| ¥{r['amount']:.2f} | {r['note']} |"
        )

    total_expense = sum(r["amount"] for r in records if r["type"] == "expense")
    total_income = sum(r["amount"] for r in records if r["type"] == "income")
    net = total_income - total_expense
    net_str = f"+¥{net:.2f}" if net >= 0 else f"-¥{abs(net):.2f}"

    lines += [
        "",
        "---",
        f"**今日支出：¥{total_expense:.2f} | 今日收入：¥{total_income:.2f} | 净额：{net_str}**",
        "",
    ]

    return "\n".join(lines)


# ── 添加记录 ──────────────────────────────────────────────────────────────────

def add_record(amount: float, bill_type: str, category: str,
               note: str, date_str: str, sync_feishu: bool = False) -> dict:
    """追加一条账单记录，返回操作结果"""
    BILLS_DIR.mkdir(parents=True, exist_ok=True)

    file_path = bill_file_path(date_str)
    existing = parse_bill_file(file_path)

    type_label = VALID_TYPES[bill_type]
    new_record = {
        "time": get_time_str(),
        "type": bill_type,
        "type_label": type_label,
        "category": category,
        "amount": amount,
        "note": note,
    }

    records = existing["records"] + [new_record]
    content = build_bill_content(date_str, records)
    file_path.write_text(content, encoding="utf-8")

    total_expense = sum(r["amount"] for r in records if r["type"] == "expense")
    total_income = sum(r["amount"] for r in records if r["type"] == "income")

    result = {
        "success": True,
        "record": new_record,
        "date": date_str,
        "file": str(file_path),
        "today_total_expense": round(total_expense, 2),
        "today_total_income": round(total_income, 2),
        "today_net": round(total_income - total_expense, 2),
        "today_count": len(records),
    }

    # 同步飞书
    if sync_feishu:
        _check_feishu_config()  # 飞书同步前检查凭证
        feishu_result = sync_to_feishu(amount, bill_type, category, note, date_str)
        summary_result = sync_summary_to_feishu(amount, bill_type, date_str)
        result["feishu"] = feishu_result
        result["feishu_summary"] = summary_result
        if not feishu_result["success"]:
            result["warning"] = f"飞书明细表同步失败: {feishu_result.get('error')}"
        if not summary_result["success"]:
            result["warning"] = f"飞书汇总表同步失败: {summary_result.get('error')}"

    return result


# ── 查询功能 ──────────────────────────────────────────────────────────────────

def list_records(date_str: str) -> dict:
    """列出指定日期的所有账单"""
    file_path = bill_file_path(date_str)
    data = parse_bill_file(file_path)

    return {
        "success": True,
        "date": date_str,
        "records": data["records"],
        "total_expense": round(data["total_expense"], 2),
        "total_income": round(data["total_income"], 2),
        "net": round(data["total_income"] - data["total_expense"], 2),
        "file": str(file_path),
        "exists": file_path.exists(),
    }


def monthly_summary(month: str) -> dict:
    """
    统计指定月份（YYYY-MM）的收支情况
    """
    try:
        datetime.strptime(month, "%Y-%m")
    except ValueError:
        return {"success": False, "error": f"月份格式错误，应为 YYYY-MM，实际：{month}"}

    BILLS_DIR.mkdir(parents=True, exist_ok=True)
    files = sorted(BILLS_DIR.glob(f"{month}-*.md"))

    total_expense = 0.0
    total_income = 0.0
    daily = []
    category_expense: dict[str, float] = {}
    category_income: dict[str, float] = {}

    for f in files:
        date_str = f.stem
        data = parse_bill_file(f)
        total_expense += data["total_expense"]
        total_income += data["total_income"]
        daily.append({
            "date": date_str,
            "expense": round(data["total_expense"], 2),
            "income": round(data["total_income"], 2),
        })
        for r in data["records"]:
            if r["type"] == "expense":
                category_expense[r["category"]] = (
                    category_expense.get(r["category"], 0) + r["amount"]
                )
            else:
                category_income[r["category"]] = (
                    category_income.get(r["category"], 0) + r["amount"]
                )

    return {
        "success": True,
        "month": month,
        "total_expense": round(total_expense, 2),
        "total_income": round(total_income, 2),
        "net": round(total_income - total_expense, 2),
        "days_recorded": len(files),
        "daily": daily,
        "category_expense": {k: round(v, 2) for k, v in
                             sorted(category_expense.items(), key=lambda x: -x[1])},
        "category_income": {k: round(v, 2) for k, v in
                            sorted(category_income.items(), key=lambda x: -x[1])},
    }


# ── 主入口 ────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="个人记账工具")
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument("--list", action="store_true", help="列出账单")
    mode.add_argument("--summary", action="store_true", help="月度汇总")

    # 添加记录参数
    parser.add_argument("--amount", type=float, help="金额（元）")
    parser.add_argument("--type", choices=["expense", "income"],
                        dest="bill_type", help="类型：expense 支出 / income 收入")
    parser.add_argument("--category", default="其他", help="分类")
    parser.add_argument("--note", default="", help="备注")
    parser.add_argument("--date", default=None,
                        help="日期 YYYY-MM-DD（默认今天）")
    parser.add_argument("--feishu", action="store_true", default=True,
                        help="同步到飞书多维表格（默认开启，加 --no-feishu 禁用）")
    parser.add_argument("--no-feishu", action="store_true",
                        help="禁用飞书同步")

    # 查询参数
    parser.add_argument("--month", help="月份 YYYY-MM（用于 --summary）")

    args = parser.parse_args()

    # ── 模式：列出账单 ────────────────────────────────────────────────────────
    if args.list:
        date_str = validate_date(args.date) if args.date else get_today()
        result = list_records(date_str)
        print(json.dumps(result, ensure_ascii=False, indent=2))
        return

    # ── 模式：月度汇总 ────────────────────────────────────────────────────────
    if args.summary:
        month = args.month or date.today().strftime("%Y-%m")
        result = monthly_summary(month)
        print(json.dumps(result, ensure_ascii=False, indent=2))
        return

    # ── 模式：添加记录 ────────────────────────────────────────────────────────
    if args.amount is None or args.bill_type is None:
        parser.error("添加记录时 --amount 和 --type 为必填项")

    if args.amount <= 0:
        print(json.dumps({"success": False, "error": "金额必须大于 0"},
                         ensure_ascii=False))
        sys.exit(1)

    date_str = validate_date(args.date) if args.date else get_today()
    sync_feishu = args.feishu and not args.no_feishu

    result = add_record(
        amount=args.amount,
        bill_type=args.bill_type,
        category=args.category,
        note=args.note,
        date_str=date_str,
        sync_feishu=sync_feishu,
    )
    print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
