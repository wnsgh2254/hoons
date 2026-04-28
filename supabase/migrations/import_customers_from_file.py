import argparse
import csv
import json
import os
import re
from pathlib import Path
from typing import Dict, List, Optional, Tuple

import requests

try:
    from openpyxl import load_workbook
except ImportError:
    load_workbook = None


PROJECT_ROOT = Path(__file__).resolve().parents[2]
ENV_PATH = PROJECT_ROOT / ".env.local"
DEFAULT_INPUT_FILE = "고객 정보 (20260423 22_37)_1.xlsx"


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


def parse_customer_number(value: object) -> Optional[int]:
    if value is None:
        return None

    text = str(value).strip()
    if not text:
        return None

    # Handles Excel formula-like value such as ="14431"
    if text.startswith('="') and text.endswith('"'):
        text = text[2:-1]
    elif text.startswith("="):
        text = text[1:].strip().strip('"')

    digits = re.sub(r"\D", "", text)
    if not digits:
        return None
    return int(digits)


def normalize_phone(raw_phone: object) -> Optional[str]:
    if raw_phone is None:
        return None
    phone = str(raw_phone).strip()
    if not phone:
        return None

    digits = re.sub(r"\D", "", phone)
    if not digits:
        return None

    # Australia mobile numbers should start with 04
    if digits.startswith("61") and len(digits) >= 11:
        digits = "0" + digits[2:]
    return digits


def read_excel_rows(file_path: Path) -> List[Tuple[Optional[int], str, Optional[str], Optional[str]]]:
    if load_workbook is None:
        raise RuntimeError("openpyxl is required for .xlsx files. Run: pip install openpyxl")

    wb = load_workbook(file_path, data_only=False)
    ws = wb.active

    rows: List[Tuple[Optional[int], str, Optional[str], Optional[str]]] = []
    for row_idx in range(5, ws.max_row + 1):
        customer_number_raw = ws.cell(row_idx, 2).value
        name_raw = ws.cell(row_idx, 3).value
        phone_raw = ws.cell(row_idx, 5).value
        tel_raw = ws.cell(row_idx, 4).value

        name = str(name_raw).strip() if name_raw is not None else ""
        if not name:
            continue

        rows.append((parse_customer_number(customer_number_raw), name, phone_raw, tel_raw))
    return rows


def read_csv_rows(file_path: Path) -> List[Tuple[Optional[int], str, Optional[str], Optional[str]]]:
    with file_path.open("r", encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f)
        rows: List[Tuple[Optional[int], str, Optional[str], Optional[str]]] = []
        for row in reader:
            customer_number_raw = row.get("고객번호") or row.get("고객 번호")
            name_raw = row.get("고객명") or row.get("고객명 ")
            phone_raw = row.get("휴대폰 번호") or row.get("휴대폰번호")
            tel_raw = row.get("전화번호") or row.get("전화 번호")

            name = str(name_raw).strip() if name_raw is not None else ""
            if not name:
                continue

            # CSV column order same as Excel: mobile/landline fields; prefer landline (D) then mobile (E) in build_payload.
            rows.append((parse_customer_number(customer_number_raw), name, phone_raw, tel_raw))
        return rows


def list_customer_shop_excel_files(folder: Path) -> List[Path]:
    """
    Match workbooks like '고객 정보 ..._shop_3.xlsx' in this folder.
    Excludes sales (판매) and prepaid (선불) workbooks; stricter than '고객' alone.
    """
    out: List[Path] = []
    for p in sorted(folder.iterdir()):
        if not p.is_file() or p.suffix.lower() != ".xlsx":
            continue
        name = p.name
        if "shop_" not in name.lower():
            continue
        if "판매" in name or "선불" in name:
            continue
        if "고객 정보" not in name:
            continue
        out.append(p)
    return out


def merge_rows_from_excel_files(
    paths: List[Path],
) -> Tuple[List[Tuple[Optional[int], str, Optional[str], Optional[str]]], Dict[str, int]]:
    """
    Read all rows; merge by normalized phone. If the same phone maps to different
    customer numbers, the first occurrence wins and a conflict is counted.
    """
    by_phone: Dict[str, Tuple[Optional[int], str, Optional[str], Optional[str]]] = {}
    stats = {"phone_conflicts": 0, "files": len(paths)}

    for path in paths:
        for row in read_excel_rows(path):
            customer_number, name, mobile_raw, tel_raw = row
            phone = normalize_phone(tel_raw) or normalize_phone(mobile_raw)
            if not phone:
                continue
            if phone in by_phone:
                existing_cn = by_phone[phone][0]
                if customer_number is not None and existing_cn is not None and customer_number != existing_cn:
                    stats["phone_conflicts"] += 1
                continue
            by_phone[phone] = row

    merged = list(by_phone.values())
    return merged, stats


def build_payload(
    rows: List[Tuple[Optional[int], str, Optional[str], Optional[str]]],
    shop_id: Optional[int] = None,
    set_id_from_customer_number: bool = False,
) -> Tuple[List[Dict[str, object]], Dict[str, int]]:
    payload: List[Dict[str, object]] = []
    stats = {
        "total_rows": len(rows),
        "missing_phone": 0,
        "deduped_in_file": 0,
    }

    seen_phone = set()
    # Column D = landline, column E = mobile — use whichever exists (D first, then E).
    for customer_number, name, mobile_phone, tel_phone in rows:
        phone = normalize_phone(tel_phone) or normalize_phone(mobile_phone)
        if not phone:
            stats["missing_phone"] += 1
            continue

        if phone in seen_phone:
            stats["deduped_in_file"] += 1
            continue
        seen_phone.add(phone)

        item: Dict[str, object] = {
            "name": name,
            "phone": phone,
        }
        if shop_id is not None:
            item["shop_id"] = shop_id
        # Legacy shop customer id from column B (e.g. ="4304"); upsert updates existing row by phone.
        if customer_number is not None:
            item["customer_number"] = customer_number
        if set_id_from_customer_number and customer_number is not None:
            item["id"] = customer_number
        payload.append(item)

    return payload, stats


def chunked(seq: List[Dict[str, object]], size: int):
    for i in range(0, len(seq), size):
        yield seq[i : i + size]


def detect_customer_columns(supabase_url: str, supabase_key: str) -> List[str]:
    endpoint = f"{supabase_url.rstrip('/')}/rest/v1/customers?select=*&limit=1"
    headers = {
        "apikey": supabase_key,
        "Authorization": f"Bearer {supabase_key}",
    }
    resp = requests.get(endpoint, headers=headers, timeout=30)
    if resp.status_code >= 300:
        return []
    data = resp.json()
    if not data:
        return []
    first = data[0]
    if isinstance(first, dict):
        return list(first.keys())
    return []


def upsert_customers(
    supabase_url: str,
    supabase_key: str,
    payload: List[Dict[str, object]],
    available_columns: List[str],
    batch_size: int = 500,
) -> int:
    endpoint = f"{supabase_url.rstrip('/')}/rest/v1/customers?on_conflict=phone"
    headers = {
        "apikey": supabase_key,
        "Authorization": f"Bearer {supabase_key}",
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates,return=minimal",
    }

    inserted = 0
    for batch in chunked(payload, batch_size):
        sanitized_batch: List[Dict[str, object]] = []
        for item in batch:
            filtered = {k: v for k, v in item.items() if k in available_columns}
            sanitized_batch.append(filtered)

        resp = requests.post(endpoint, headers=headers, data=json.dumps(sanitized_batch, ensure_ascii=False), timeout=60)
        if resp.status_code >= 300:
            raise RuntimeError(f"Supabase upsert failed ({resp.status_code}): {resp.text}")
        inserted += len(sanitized_batch)
    return inserted


def main():
    parser = argparse.ArgumentParser(description="Import customers from Excel/CSV to Supabase customers table.")
    parser.add_argument("--file", default=DEFAULT_INPUT_FILE, help="Input file name in this folder (.xlsx or .csv)")
    parser.add_argument(
        "--all-customer-shop-excels",
        action="store_true",
        help="Use every '고객*...*shop_*.xlsx' in this folder (excludes 판매/선불), merge by phone, and set id from column B",
    )
    parser.add_argument("--dry-run", action="store_true", help="Parse and validate only, do not write to Supabase")
    parser.add_argument("--shop-id", type=int, default=None, help="Set shop_id for imported rows")
    parser.add_argument(
        "--set-id-from-customer-number",
        action="store_true",
        help="Set customers.id from the parsed customer number in the file",
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

    if not supabase_url:
        raise RuntimeError("SUPABASE_URL is missing. Set it in environment or .env.local.")
    if not supabase_key:
        raise RuntimeError("SUPABASE key is missing. Prefer SUPABASE_SERVICE_ROLE_KEY.")

    migrations_dir = Path(__file__).resolve().parent
    set_id = args.set_id_from_customer_number
    merge_stats: Dict[str, int] = {}

    if args.all_customer_shop_excels:
        set_id = True
        paths = list_customer_shop_excel_files(migrations_dir)
        if not paths:
            raise FileNotFoundError(
                "No matching customer Excel files in this folder. Expected names containing '고객' and 'shop_' (not 판매/선불)."
            )
        print(f"[INFO] Customer shop workbooks: {len(paths)}")
        for p in paths:
            print(f"       - {p.name}")
        rows, merge_stats = merge_rows_from_excel_files(paths)
        if merge_stats.get("phone_conflicts", 0):
            print(
                f"[WARN] Same phone appeared with different 고객 번호 across files: "
                f"{merge_stats['phone_conflicts']} (first occurrence kept)"
            )
    else:
        input_path = migrations_dir / args.file
        if not input_path.exists():
            raise FileNotFoundError(f"Input file not found: {input_path}")

        suffix = input_path.suffix.lower()
        if suffix == ".xlsx":
            rows = read_excel_rows(input_path)
        elif suffix == ".csv":
            rows = read_csv_rows(input_path)
        else:
            raise RuntimeError(f"Unsupported file type: {suffix}. Use .xlsx or .csv")

    payload, stats = build_payload(
        rows,
        shop_id=args.shop_id,
        set_id_from_customer_number=set_id,
    )
    print(f"[INFO] Source rows: {stats['total_rows']}")
    print(f"[INFO] Skipped (missing phone and no tel fallback): {stats['missing_phone']}")
    print(f"[INFO] Deduped inside file by phone: {stats['deduped_in_file']}")
    print(f"[INFO] Ready to upsert: {len(payload)}")

    if args.dry_run:
        print("[INFO] Dry run complete. No data written.")
        return

    available_columns = detect_customer_columns(supabase_url=supabase_url, supabase_key=supabase_key)
    if available_columns:
        print(f"[INFO] Detected customers columns: {', '.join(available_columns)}")
    else:
        # Fallback for empty table or schema probe issues.
        available_columns = [
            "id",
            "name",
            "phone",
            "shop_id",
            "memo",
            "assigned_designer_id",
            "email",
            "customer_number",
        ]

    if "name" not in available_columns or "phone" not in available_columns:
        raise RuntimeError("customers table must include at least 'name' and 'phone' columns.")

    written = upsert_customers(
        supabase_url=supabase_url,
        supabase_key=supabase_key,
        payload=payload,
        available_columns=available_columns,
    )
    print(f"[DONE] Upserted rows: {written}")


if __name__ == "__main__":
    main()
