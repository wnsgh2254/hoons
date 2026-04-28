import argparse
import json
import os
import re
from pathlib import Path
from typing import Dict, List, Optional, Tuple

import requests
from openpyxl import load_workbook


PROJECT_ROOT = Path(__file__).resolve().parents[2]
ENV_PATH = PROJECT_ROOT / ".env.local"
DEFAULT_INPUT_FILE = "고객 정보 (20260423 22_37)_1.xlsx"


def load_env_file(env_path: Path) -> Dict[str, str]:
    env_map: Dict[str, str] = {}
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
    if digits.startswith("61") and len(digits) >= 11:
        digits = "0" + digits[2:]
    return digits


def build_mapping_rows(input_file: Path) -> List[Tuple[str, int]]:
    ws = load_workbook(input_file, data_only=False).active
    mapping: Dict[str, int] = {}
    for row_idx in range(5, ws.max_row + 1):
        number = parse_customer_number(ws.cell(row_idx, 2).value)
        if number is None:
            continue
        phone = normalize_phone(ws.cell(row_idx, 5).value) or normalize_phone(ws.cell(row_idx, 4).value)
        if not phone:
            continue
        # Keep first occurrence for duplicate phones in file.
        mapping.setdefault(phone, number)
    return list(mapping.items())


def chunked(seq: List[dict], size: int):
    for i in range(0, len(seq), size):
        yield seq[i : i + size]


def main():
    parser = argparse.ArgumentParser(description="Load phone->customer_number map to customer_import_map table")
    parser.add_argument("--file", default=DEFAULT_INPUT_FILE, help="Input .xlsx file name in this folder")
    parser.add_argument("--shop-id", type=int, default=3, help="shop_id to store in mapping table")
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
        raise RuntimeError("Missing Supabase credentials")

    input_file = Path(__file__).resolve().parent / args.file
    if not input_file.exists():
        raise FileNotFoundError(f"Input file not found: {input_file}")

    mapping_rows = build_mapping_rows(input_file)
    payload = [{"phone": phone, "new_id": new_id, "shop_id": args.shop_id} for phone, new_id in mapping_rows]

    endpoint = f"{supabase_url.rstrip('/')}/rest/v1/customer_import_map?on_conflict=phone"
    headers = {
        "apikey": supabase_key,
        "Authorization": f"Bearer {supabase_key}",
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates,return=minimal",
    }

    inserted = 0
    for batch in chunked(payload, 500):
        resp = requests.post(endpoint, headers=headers, data=json.dumps(batch, ensure_ascii=False), timeout=60)
        if resp.status_code >= 300:
            raise RuntimeError(f"Failed to upsert customer_import_map ({resp.status_code}): {resp.text}")
        inserted += len(batch)

    print(f"[DONE] customer_import_map rows upserted: {inserted}")


if __name__ == "__main__":
    main()
