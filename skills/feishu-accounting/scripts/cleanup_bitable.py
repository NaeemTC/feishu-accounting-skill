#!/usr/bin/env python3
"""
清空多维表格所有数据
删除指定 bitable 中所有表的所有记录。
用于重置测试数据或清空账单重新开始。

用法：
    python3 cleanup_bitable.py --app-id cli_xxx --app-secret xxx --base-token xxx
    python3 cleanup_bitable.py --app-id cli_xxx --app-secret xxx --base-token xxx --dry-run  # 仅预览，不删除

输出包含每条记录的部分信息供确认（文本/金额等）。
"""

import argparse
import json
import sys
import time
import urllib.request
import urllib.error

FEISHU_HOST = "https://open.feishu.cn"


def get_tenant_token(app_id: str, app_secret: str) -> str:
    url = f"{FEISHU_HOST}/open-apis/auth/v3/tenant_access_token/internal"
    data = json.dumps({"app_id": app_id, "app_secret": app_secret}).encode("utf-8")
    req = urllib.request.Request(url, data=data, headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=15) as resp:
        result = json.loads(resp.read())
    if result.get("code") != 0:
        raise RuntimeError(f"获取 Tenant Token 失败: {result}")
    return result["tenant_access_token"]


def list_tables(token: str, base_token: str) -> list[dict]:
    """列出多维表格中所有数据表"""
    url = f"{FEISHU_HOST}/open-apis/base/v3/bases/{base_token}/tables"
    req = urllib.request.Request(url, headers={"Authorization": f"Bearer {token}"})
    with urllib.request.urlopen(req, timeout=15) as resp:
        result = json.loads(resp.read())
    if result.get("code") != 0:
        raise RuntimeError(f"获取表列表失败: {result}")
    tables = result["data"]["tables"]
    return [{"id": t["id"], "name": t["name"]} for t in tables]


def list_records(token: str, base_token: str, table_id: str,
                 offset: int = 0) -> dict:
    """获取一页记录，返回记录列表和下一页 offset"""
    url = (f"{FEISHU_HOST}/open-apis/base/v3/bases/{base_token}"
           f"/tables/{table_id}/records?page_size=100&offset={offset}")
    req = urllib.request.Request(url, headers={"Authorization": f"Bearer {token}"})
    with urllib.request.urlopen(req, timeout=15) as resp:
        result = json.loads(resp.read())
    if result.get("code") != 0:
        raise RuntimeError(f"获取记录失败: {result}")
    data = result["data"]
    return data


def delete_records(token: str, base_token: str, table_id: str,
                   record_ids: list[str]) -> int:
    """逐个删除记录（批量删除 API 不稳定，逐个删更可靠）"""
    deleted = 0
    for rid in record_ids:
        url = (f"{FEISHU_HOST}/open-apis/base/v3/bases/{base_token}"
               f"/tables/{table_id}/records/{rid}")
        req = urllib.request.Request(url, method="DELETE",
                                     headers={"Authorization": f"Bearer {token}"})
        try:
            with urllib.request.urlopen(req, timeout=15) as resp:
                result = json.loads(resp.read())
            if result.get("code") == 0:
                deleted += 1
            else:
                print(f"  ⚠️ 删除失败 {rid}: {result.get('msg')}")
        except urllib.error.HTTPError as e:
            print(f"  ⚠️ 删除失败 {rid}: HTTP {e.code}")
        # 加一点延迟避免请求过快
        time.sleep(0.05)
    return deleted


def summarize_record(rec: list, field_ids: list[str]) -> str:
    """提取记录的关键信息用于显示"""
    parts = []
    for i, val in enumerate(rec):
        if val is not None:
            parts.append(f"[{i}]={val}")
    return ", ".join(parts[:3])  # 只显示前3个字段


def main():
    parser = argparse.ArgumentParser(description="清空多维表格所有数据")
    parser.add_argument("--app-id", required=True, help="飞书应用 App ID")
    parser.add_argument("--app-secret", required=True, help="飞书应用 App Secret")
    parser.add_argument("--base-token", required=True, help="多维表格 Base Token")
    parser.add_argument("--dry-run", action="store_true",
                        help="仅预览要删除的记录，不执行删除")
    args = parser.parse_args()

    # 获取 Tenant Token
    print("🔑 获取 Tenant Token...")
    token = get_tenant_token(args.app_id, args.app_secret)
    print("✅ 成功")

    # 列出所有表
    print("\n📋 扫描数据表...")
    tables = list_tables(token, args.base_token)
    if not tables:
        print("该多维表格中没有数据表")
        return

    total_deleted = 0
    for table in tables:
        print(f"\n📄 表「{table['name']}」({table['id']})")
        offset = 0
        table_count = 0
        batch = 1

        while True:
            data = list_records(token, args.base_token, table['id'], offset)
            records = data["data"]
            record_ids = data["record_id_list"]
            field_ids = data.get("field_id_list", [])

            if not records:
                break

            if args.dry_run:
                print(f"  第{batch}页 (offset={offset}): {len(records)} 条")
                for i, rec in enumerate(records):
                    summary = summarize_record(rec, field_ids)
                    print(f"    [{record_ids[i]}] {summary}")
            else:
                deleted = delete_records(token, args.base_token, table['id'], record_ids)
                print(f"  第{batch}页 (offset={offset}): 删了 {deleted}/{len(records)} 条")
                table_count += deleted

            offset += len(records)
            batch += 1

        if not args.dry_run:
            total_deleted += table_count
            status = "空" if table_count == 0 else f"清空 ({table_count} 条)"
        else:
            status = "预览"
        print(f"  → 表「{table['name']}」: {status}")

    if args.dry_run:
        print(f"\n📊 总计预览: 以上记录会被删除，加 --dry-run 去掉就是真删")
    else:
        print(f"\n✅ 完成，共删除 {total_deleted} 条记录")


if __name__ == "__main__":
    main()
