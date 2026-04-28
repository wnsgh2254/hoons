import argparse
import json
import os
import re
from collections import defaultdict
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional

import requests
from openpyxl import load_workbook


PROJECT_ROOT = Path(__file__).resolve().parents[2]
ENV_PATH = PROJECT_ROOT / ".env.local"
DEFAULT_INPUT_FILE = "판매 내역 (20260423 23_01)_1.xlsx"
BATCH_SIZE = 200


def load_env_file(env_path: Path) -> Dict[str, str]:
    env_map: Dict[str, str] = {}
    if not env_path.exists():
        return env_map
    for raw_line in env_path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        env_map[key.strip()] = value.strip()
    return env_map


def normalize_text(value: object) -> str:
    return str(value or "").strip()


def normalize_key(value: object) -> str:
    text = normalize_text(value).lower()
    text = text.replace("선생님", "").replace("디자이너", "").replace("원장님", "").replace("원장", "")
    text = re.sub(r"\s+", "", text)
    return text


def clean_manager_name(value: object) -> Optional[str]:
    text = normalize_text(value)
    if not text:
        return None
    cleaned = re.sub(r"(선생님|원장님|원장)", "", text)
    cleaned = re.sub(r"\s+", " ", cleaned).strip()
    return cleaned or None


def parse_phone_digits(value: object) -> Optional[str]:
    text = normalize_text(value)
    if not text:
        return None
    if text.startswith('="') and text.endswith('"'):
        text = text[2:-1]
    elif text.startswith("="):
        text = text[1:].strip().strip('"')
    digits = re.sub(r"\D", "", text)
    if len(digits) < 6:
        return None
    return digits


def parse_datetime(value: object) -> Optional[datetime]:
    text = normalize_text(value)
    if not text:
        return None
    for fmt in ("%Y-%m-%d %H:%M:%S", "%Y-%m-%d %H:%M"):
        try:
            return datetime.strptime(text, fmt)
        except ValueError:
            pass
    try:
        return datetime.fromisoformat(text)
    except ValueError:
        return None


def to_amount(value: object) -> float:
    text = normalize_text(value)
    if not text:
        return 0.0
    cleaned = text.replace(",", "")
    try:
        raw = float(cleaned)
    except ValueError:
        return 0.0
    # User requested 5000 -> 50.
    return round(raw / 100.0, 2)


def to_int(value: object, default: int = 0) -> int:
    text = normalize_text(value)
    if not text:
        return default
    try:
        return int(float(text))
    except ValueError:
        return default


def map_item_type(raw: str) -> str:
    key = normalize_key(raw)
    if "서비스" in key or "시술" in key:
        return "service"
    if "상품" in key or "제품" in key:
        return "product"
    if "정액권" in key or "회원권" in key or "멤버십" in key:
        return "prepaid"
    return "service"


def map_payment_methods(raw: str) -> List[str]:
    key = normalize_key(raw)
    if not key:
        return []

    methods: List[str] = []
    mapping = [
        ("cash", ("현금",)),
        ("card", ("카드",)),
        ("prepaid", ("정액권", "선불", "회원권", "멤버십", "prepaid")),
        ("bank_transfer", ("계좌", "이체", "송금", "transfer")),
    ]
    for canonical, needles in mapping:
        if any(needle in key for needle in needles):
            methods.append(canonical)

    return methods


def parse_amount_tokens(value: object) -> List[float]:
    text = normalize_text(value)
    if not text:
        return []
    parts = [p for p in re.split(r"[+/,&\s]+", text) if p]
    if len(parts) <= 1:
        return [to_amount(text)]

    values: List[float] = []
    for part in parts:
        amount = to_amount(part)
        if amount > 0:
            values.append(amount)
    return values


def fetch_all_rows(base_url: str, key: str, table: str, select_clause: str) -> List[dict]:
    endpoint = f"{base_url.rstrip('/')}/rest/v1/{table}?select={select_clause}&order=id.asc"
    headers = {
        "apikey": key,
        "Authorization": f"Bearer {key}",
        "Range-Unit": "items",
    }
    all_rows: List[dict] = []
    start = 0
    page_size = 1000
    while True:
        end = start + page_size - 1
        page_headers = {**headers, "Range": f"{start}-{end}"}
        resp = requests.get(endpoint, headers=page_headers, timeout=60)
        if resp.status_code >= 300:
            raise RuntimeError(f"Failed fetching {table}: {resp.status_code} {resp.text}")
        rows = resp.json()
        if not rows:
            break
        all_rows.extend(rows)
        if len(rows) < page_size:
            break
        start += page_size
    return all_rows


@dataclass
class DesignerChoice:
    id: int
    name: str


def pick_designer(candidates: List[dict], target_shop_id: int) -> Optional[DesignerChoice]:
    if not candidates:
        return None
    ranked = sorted(
        candidates,
        key=lambda d: (
            0 if int(d.get("shop_id") or 0) == target_shop_id else 1,
            0 if bool(d.get("is_active")) else 1,
            int(d.get("id") or 0),
        ),
    )
    top = ranked[0]
    return DesignerChoice(id=int(top["id"]), name=str(top.get("name") or ""))


def build_lookup_maps(base_url: str, key: str, target_shop_id: int):
    customer_columns = detect_table_columns(base_url, key, "customers")
    customer_select = ["id", "name", "shop_id"]
    if "phone" in customer_columns:
        customer_select.append("phone")
    if "mobile_phone" in customer_columns:
        customer_select.append("mobile_phone")
    customers = fetch_all_rows(base_url, key, "customers", ",".join(customer_select))
    designers = fetch_all_rows(base_url, key, "designers", "id,name,english_name,shop_id,is_active")

    customers_by_phone: Dict[str, List[int]] = defaultdict(list)
    customers_by_name: Dict[str, List[int]] = defaultdict(list)
    for c in customers:
        cid = int(c["id"])
        for raw_phone in [c.get("mobile_phone"), c.get("phone")]:
            phone_digits = parse_phone_digits(raw_phone)
            if phone_digits:
                customers_by_phone[phone_digits].append(cid)
        name_key = normalize_key(c.get("name"))
        if name_key:
            customers_by_name[name_key].append(cid)

    designers_index: Dict[str, List[dict]] = defaultdict(list)
    for d in designers:
        for alias in [d.get("name"), d.get("english_name")]:
            alias_key = normalize_key(alias)
            if alias_key:
                designers_index[alias_key].append(d)

    chosen_designers: Dict[str, DesignerChoice] = {}
    for alias_key, candidates in designers_index.items():
        picked = pick_designer(candidates, target_shop_id)
        if picked:
            chosen_designers[alias_key] = picked

    return customers_by_phone, customers_by_name, chosen_designers


def detect_table_columns(base_url: str, key: str, table: str) -> List[str]:
    endpoint = f"{base_url.rstrip('/')}/rest/v1/{table}?select=*&limit=1"
    headers = {"apikey": key, "Authorization": f"Bearer {key}"}
    resp = requests.get(endpoint, headers=headers, timeout=30)
    if resp.status_code >= 300:
        return []
    data = resp.json()
    if not data:
        return []
    row = data[0]
    if isinstance(row, dict):
        return list(row.keys())
    return []


def import_sales(
    input_path: Path,
    supabase_url: str,
    supabase_key: str,
    shop_id: int,
    execute: bool,
    enable_mapping: bool,
):
    ws = load_workbook(input_path, data_only=False).active
    report_dir = input_path.parent
    customers_by_phone: Dict[str, List[int]] = defaultdict(list)
    customers_by_name: Dict[str, List[int]] = defaultdict(list)
    designers_by_alias: Dict[str, DesignerChoice] = {}
    if enable_mapping:
        customers_by_phone, customers_by_name, designers_by_alias = build_lookup_maps(
            supabase_url, supabase_key, shop_id
        )

    sales_columns = detect_table_columns(supabase_url, supabase_key, "sales")
    sales_items_columns = detect_table_columns(supabase_url, supabase_key, "sales_items")

    missing_recommended = []
    if "designer_id" not in sales_items_columns:
        missing_recommended.append("sales_items.designer_id (디자이너 ID 저장용)")
    if "source_file" not in sales_columns:
        missing_recommended.append("sales.source_file (중복 업로드 추적용)")
    if "source_row_key" not in sales_columns:
        missing_recommended.append("sales.source_row_key (idempotent 업서트 키)")
    if "prepaid_amount" not in sales_columns:
        missing_recommended.append("sales.prepaid_amount (정액권 결제금액 저장용)")

    headers = {
        "apikey": supabase_key,
        "Authorization": f"Bearer {supabase_key}",
        "Content-Type": "application/json",
        "Prefer": "return=representation",
    }
    sales_endpoint = f"{supabase_url.rstrip('/')}/rest/v1/sales"
    items_endpoint = f"{supabase_url.rstrip('/')}/rest/v1/sales_items"

    grouped: Dict[str, dict] = {}
    stats = {
        "rows_total": 0,
        "rows_skipped_no_datetime": 0,
        "rows_skipped_no_customer": 0,
        "rows_skipped_no_item": 0,
        "rows_customer_ambiguous": 0,
        "rows_payment_ambiguous": 0,
        "rows_customer_phone_name_conflict": 0,
        "rows_designer_unmatched": 0,
        "rows_total_amount_missing": 0,
        "sales_created": 0,
        "sales_items_created": 0,
        "dryrun_payment_mismatch": 0,
        "dryrun_manager_sales_mismatch": 0,
    }
    skipped_rows: List[dict] = []

    last_sale_dt_raw = None
    last_customer_no_raw = None
    last_customer_name_raw = None
    last_mobile_phone_raw = None
    last_phone_raw = None
    last_payment_method_raw = None
    last_payment_amount_raw = None
    last_memo_raw = None

    for row_idx in range(5, ws.max_row + 1):
        stats["rows_total"] += 1

        sale_dt_raw = ws.cell(row_idx, 1).value
        customer_no_raw = ws.cell(row_idx, 3).value
        customer_name_raw = ws.cell(row_idx, 4).value
        mobile_phone_raw = ws.cell(row_idx, 5).value
        phone_raw = ws.cell(row_idx, 6).value
        payment_method_raw = ws.cell(row_idx, 20).value
        payment_amount_raw = ws.cell(row_idx, 21).value
        memo_raw = ws.cell(row_idx, 24).value

        if normalize_text(sale_dt_raw):
            last_sale_dt_raw = sale_dt_raw
        else:
            sale_dt_raw = last_sale_dt_raw

        if normalize_text(customer_no_raw):
            last_customer_no_raw = customer_no_raw
        else:
            customer_no_raw = last_customer_no_raw

        if normalize_text(customer_name_raw):
            last_customer_name_raw = customer_name_raw
        else:
            customer_name_raw = last_customer_name_raw

        if normalize_text(mobile_phone_raw):
            last_mobile_phone_raw = mobile_phone_raw
        else:
            mobile_phone_raw = last_mobile_phone_raw

        if normalize_text(phone_raw):
            last_phone_raw = phone_raw
        else:
            phone_raw = last_phone_raw

        if normalize_text(payment_method_raw):
            last_payment_method_raw = payment_method_raw
        else:
            payment_method_raw = last_payment_method_raw

        if normalize_text(payment_amount_raw):
            last_payment_amount_raw = payment_amount_raw
        else:
            payment_amount_raw = last_payment_amount_raw

        if normalize_text(memo_raw):
            last_memo_raw = memo_raw
        else:
            memo_raw = last_memo_raw

        sale_dt = parse_datetime(sale_dt_raw)
        if not sale_dt:
            stats["rows_skipped_no_datetime"] += 1
            skipped_rows.append({"row": row_idx, "reason": "no_datetime"})
            continue

        phone_candidates = [
            parse_phone_digits(mobile_phone_raw),
            parse_phone_digits(phone_raw),
            parse_phone_digits(customer_no_raw),
        ]
        customer_phone = next((value for value in phone_candidates if value), None)
        customer_id: Optional[int] = None
        if enable_mapping:
            customer_name = normalize_text(customer_name_raw)
            if not customer_name:
                stats["rows_skipped_no_customer"] += 1
                skipped_rows.append({"row": row_idx, "reason": "no_customer_name"})
                continue
            phone_matches = customers_by_phone.get(customer_phone, []) if customer_phone else []
            name_matches = customers_by_name.get(normalize_key(customer_name), [])
            if len(phone_matches) == 1:
                customer_id = phone_matches[0]
                if len(name_matches) == 1 and name_matches[0] != customer_id:
                    stats["rows_customer_phone_name_conflict"] += 1
                    stats["rows_skipped_no_customer"] += 1
                    skipped_rows.append({"row": row_idx, "reason": "customer_phone_name_conflict"})
                    continue
            elif len(phone_matches) > 1:
                stats["rows_customer_ambiguous"] += 1
                stats["rows_skipped_no_customer"] += 1
                skipped_rows.append({"row": row_idx, "reason": "customer_phone_ambiguous"})
                continue
            elif len(name_matches) == 1:
                customer_id = name_matches[0]
            elif len(name_matches) > 1:
                stats["rows_customer_ambiguous"] += 1
                stats["rows_skipped_no_customer"] += 1
                skipped_rows.append({"row": row_idx, "reason": "customer_name_ambiguous"})
                continue

            if not customer_id:
                stats["rows_skipped_no_customer"] += 1
                skipped_rows.append({"row": row_idx, "reason": "customer_not_found"})
                continue

        item_name = normalize_text(ws.cell(row_idx, 9).value)
        if not item_name:
            stats["rows_skipped_no_item"] += 1
            skipped_rows.append({"row": row_idx, "reason": "no_item_name"})
            continue

        sales_dt_text = sale_dt.strftime("%Y-%m-%d %H:%M:%S")
        key = f"{sales_dt_text}|{customer_id or 0}|{normalize_text(memo_raw)}"
        group = grouped.get(key)
        if not group:
            group = {
                "created_at": sale_dt.strftime("%Y-%m-%dT%H:%M:%S+10:00"),
                "sales_date": sale_dt.strftime("%Y-%m-%d"),
                "sales_time": sale_dt.strftime("%H:%M"),
                "customer_id": customer_id,
                "shop_id": shop_id,
                "memo": normalize_text(memo_raw) or None,
                "payment_method": "",
                "payment_methods": [],
                "cash_amount": 0.0,
                "card_amount": 0.0,
                "prepaid_amount": 0.0,
                "bank_transfer_amount": 0.0,
                "sales_amount": 0.0,
                "discount_amount": 0.0,
                "total_amount": 0.0,
                "prepaid_deduction_total": 0.0,
                "manager_sales_amount": 0.0,
                "point_accumulation": to_amount(ws.cell(row_idx, 23).value),
                "items": [],
            }
            grouped[key] = group

        amount = to_amount(ws.cell(row_idx, 13).value)
        manager_sales_amount = to_amount(ws.cell(row_idx, 15).value)
        discount = to_amount(ws.cell(row_idx, 12).value)
        manager_raw = normalize_text(ws.cell(row_idx, 14).value)
        manager_clean = clean_manager_name(manager_raw)
        manager_key = normalize_key(manager_raw)
        designer = designers_by_alias.get(manager_key) if enable_mapping else None
        if not designer and manager_key:
            stats["rows_designer_unmatched"] += 1
        manager_name = designer.name if designer else manager_clean

        item_payload = {
            "item_type": map_item_type(normalize_text(ws.cell(row_idx, 7).value)),
            "item_name": item_name,
            "unit_price": to_amount(ws.cell(row_idx, 10).value),
            "quantity": max(1, to_int(ws.cell(row_idx, 11).value, default=1)),
            "discount": discount,
            "amount": amount,
            "manager": manager_name,
            "sales_classification": normalize_text(ws.cell(row_idx, 16).value) or None,
            "point_deduction": to_amount(ws.cell(row_idx, 17).value),
            "prepaid_deduction": to_amount(ws.cell(row_idx, 18).value),
        }

        # If DB has designer_id in sales_items, fill it as well.
        if enable_mapping and "designer_id" in sales_items_columns:
            item_payload["designer_id"] = designer.id if designer else None

        group["items"].append(item_payload)
        group["sales_amount"] += amount
        group["manager_sales_amount"] += manager_sales_amount
        group["discount_amount"] += discount
        group["prepaid_deduction_total"] += to_amount(ws.cell(row_idx, 18).value)

        total_raw = to_amount(ws.cell(row_idx, 19).value)
        if total_raw > 0:
            group["total_amount"] = total_raw
        else:
            stats["rows_total_amount_missing"] += 1

        pay_method_raw = normalize_text(payment_method_raw)
        pay_methods = map_payment_methods(pay_method_raw)
        pay_amounts = parse_amount_tokens(payment_amount_raw)
        if pay_method_raw:
            if pay_methods:
                for method in pay_methods:
                    if method not in group["payment_methods"]:
                        group["payment_methods"].append(method)

                # If multiple methods and one amount only, user requested card-first fallback.
                if len(pay_methods) > 1 and len(pay_amounts) == 1:
                    group["card_amount"] += pay_amounts[0]
                    stats["rows_payment_ambiguous"] += 1
                elif len(pay_amounts) >= len(pay_methods):
                    for idx, method in enumerate(pay_methods):
                        pay_amount = pay_amounts[idx]
                        if method == "cash":
                            group["cash_amount"] += pay_amount
                        elif method == "card":
                            group["card_amount"] += pay_amount
                        elif method == "prepaid":
                            group["prepaid_amount"] += pay_amount
                        elif method == "bank_transfer":
                            group["bank_transfer_amount"] += pay_amount
                elif len(pay_methods) == 1 and pay_amounts:
                    pay_amount = sum(pay_amounts)
                    method = pay_methods[0]
                    if method == "cash":
                        group["cash_amount"] += pay_amount
                    elif method == "card":
                        group["card_amount"] += pay_amount
                    elif method == "prepaid":
                        group["prepaid_amount"] += pay_amount
                    elif method == "bank_transfer":
                        group["bank_transfer_amount"] += pay_amount
            else:
                group["payment_method"] = pay_method_raw

    transactions = list(grouped.values())
    for tx in transactions:
        # If any line used prepaid deduction, include prepaid in header payment method.
        if tx["prepaid_deduction_total"] > 0 and "prepaid" not in tx["payment_methods"]:
            tx["payment_methods"].append("prepaid")
        # Keep prepaid_amount aligned with line-level prepaid deduction at minimum.
        if tx["prepaid_deduction_total"] > tx["prepaid_amount"]:
            tx["prepaid_amount"] = tx["prepaid_deduction_total"]
        if tx["payment_methods"]:
            tx["payment_method"] = "+".join(tx["payment_methods"])
        payment_sum = tx["cash_amount"] + tx["card_amount"] + tx["prepaid_amount"] + tx["bank_transfer_amount"]
        resolved_total = tx["total_amount"] if tx["total_amount"] > 0 else tx["sales_amount"]
        if payment_sum > 0 and abs(payment_sum - resolved_total) > 0.01:
            stats["dryrun_payment_mismatch"] += 1
        if tx["manager_sales_amount"] > 0 and abs(tx["manager_sales_amount"] - tx["sales_amount"]) > 0.01:
            stats["dryrun_manager_sales_mismatch"] += 1

    print(f"[INFO] Source rows: {stats['rows_total']}", flush=True)
    print(f"[INFO] Transactions grouped: {len(transactions)}", flush=True)
    print(f"[INFO] Skipped rows (no datetime): {stats['rows_skipped_no_datetime']}", flush=True)
    print(f"[INFO] Skipped rows (no customer): {stats['rows_skipped_no_customer']}", flush=True)
    print(f"[INFO] Skipped rows (no item): {stats['rows_skipped_no_item']}", flush=True)
    print(f"[INFO] Ambiguous customer-name matches: {stats['rows_customer_ambiguous']}", flush=True)
    print(f"[INFO] Customer phone/name conflicts (skipped): {stats['rows_customer_phone_name_conflict']}", flush=True)
    print(f"[INFO] Missing total_amount rows: {stats['rows_total_amount_missing']}", flush=True)
    print(f"[INFO] Ambiguous multi-payment rows (fallback to card): {stats['rows_payment_ambiguous']}", flush=True)
    print(f"[INFO] Unmatched designer names: {stats['rows_designer_unmatched']}", flush=True)
    print(f"[INFO] Dry-run payment mismatch transactions: {stats['dryrun_payment_mismatch']}", flush=True)
    print(f"[INFO] Dry-run manager-sales mismatch transactions: {stats['dryrun_manager_sales_mismatch']}", flush=True)
    if missing_recommended:
        print("[INFO] Missing recommended columns:", flush=True)
        for column in missing_recommended:
            print(f"  - {column}", flush=True)
    else:
        print("[INFO] No missing recommended columns.", flush=True)

    report_payload = {
        "input_file": str(input_path.name),
        "shop_id": shop_id,
        "source_rows": stats["rows_total"],
        "transactions_grouped": len(transactions),
        "stats": stats,
        "skipped_rows": skipped_rows,
    }
    report_name = f"sales_import_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    report_path = report_dir / report_name
    report_path.write_text(json.dumps(report_payload, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"[INFO] Report saved: {report_path}", flush=True)

    if not execute:
        print("[INFO] Dry run complete. No data written.", flush=True)
        return

    session = requests.Session()
    for start_idx in range(0, len(transactions), BATCH_SIZE):
        batch = transactions[start_idx : start_idx + BATCH_SIZE]
        sales_payload_batch = []
        for tx in batch:
            payload = {
                "shop_id": tx["shop_id"],
                "customer_id": tx["customer_id"],
                "sales_date": tx["sales_date"],
                "sales_time": tx["sales_time"],
                "sales_amount": round(tx["sales_amount"], 2),
                "discount_amount": round(tx["discount_amount"], 2),
                "total_amount": round(tx["total_amount"] if tx["total_amount"] > 0 else tx["sales_amount"], 2),
                "payment_method": tx["payment_method"] or None,
                "cash_amount": round(tx["cash_amount"], 2),
                "card_amount": round(tx["card_amount"], 2),
                "bank_transfer_amount": round(tx["bank_transfer_amount"], 2),
                "point_accumulation": round(tx["point_accumulation"], 2),
                "memo": tx["memo"],
                "created_at": tx["created_at"],
            }
            if "prepaid_amount" in sales_columns:
                payload["prepaid_amount"] = round(tx["prepaid_amount"], 2)
            sales_payload_batch.append(payload)

        sales_resp = session.post(
            sales_endpoint,
            headers=headers,
            data=json.dumps(sales_payload_batch),
            timeout=120,
        )
        if sales_resp.status_code >= 300:
            raise RuntimeError(
                f"Failed inserting sale headers batch {start_idx + 1}-{start_idx + len(batch)}: "
                f"{sales_resp.status_code} {sales_resp.text}"
            )
        inserted_sales = sales_resp.json()
        if len(inserted_sales) != len(batch):
            raise RuntimeError(
                f"Inserted sales count mismatch in batch {start_idx + 1}-{start_idx + len(batch)} "
                f"(expected {len(batch)}, got {len(inserted_sales)})"
            )
        stats["sales_created"] += len(inserted_sales)

        item_rows = []
        for tx, inserted_sale in zip(batch, inserted_sales):
            sale_id = inserted_sale["id"]
            for item in tx["items"]:
                item_rows.append({"sale_id": sale_id, **item})

        if item_rows:
            items_resp = session.post(
                items_endpoint,
                headers={**headers, "Prefer": "return=minimal"},
                data=json.dumps(item_rows),
                timeout=120,
            )
            if items_resp.status_code >= 300:
                raise RuntimeError(
                    f"Failed inserting sale items batch {start_idx + 1}-{start_idx + len(batch)}: "
                    f"{items_resp.status_code} {items_resp.text}"
                )
            stats["sales_items_created"] += len(item_rows)

        print(f"[PROGRESS] {min(start_idx + len(batch), len(transactions))}/{len(transactions)} transactions inserted", flush=True)

    print(f"[DONE] Sales inserted: {stats['sales_created']}", flush=True)
    print(f"[DONE] Sales items inserted: {stats['sales_items_created']}", flush=True)


def main():
    parser = argparse.ArgumentParser(description="Import sales history Excel into sales/sales_items tables.")
    parser.add_argument("--file", default=DEFAULT_INPUT_FILE, help="Input .xlsx file in this folder")
    parser.add_argument("--shop-id", type=int, default=3, help="Shop ID to assign to imported sales")
    parser.add_argument("--execute", action="store_true", help="Actually write to DB (default: dry-run)")
    parser.add_argument(
        "--enable-mapping",
        action="store_true",
        help="Enable customer/designer mapping (default: disabled for raw import step)",
    )
    args = parser.parse_args()

    env_map = load_env_file(ENV_PATH)
    supabase_url = os.getenv("SUPABASE_URL") or env_map.get("SUPABASE_URL")
    supabase_key = (
        os.getenv("SUPABASE_SERVICE_ROLE_KEY")
        or env_map.get("SUPABASE_SERVICE_ROLE_KEY")
        or os.getenv("SUPABASE_ANON_KEY")
        or env_map.get("SUPABASE_ANON_KEY")
    )
    if not supabase_url or not supabase_key:
        raise RuntimeError("Missing SUPABASE_URL or SUPABASE key")

    input_path = Path(__file__).resolve().parent / args.file
    if not input_path.exists():
        raise FileNotFoundError(f"Input file not found: {input_path}")

    import_sales(
        input_path=input_path,
        supabase_url=supabase_url,
        supabase_key=supabase_key,
        shop_id=args.shop_id,
        execute=args.execute,
        enable_mapping=args.enable_mapping,
    )


if __name__ == "__main__":
    main()
