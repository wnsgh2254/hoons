# Build one SQL file: single UPDATE with all (phone, target_id) rows.
import json
from pathlib import Path

MIGRATIONS = Path(__file__).resolve().parent
PAIRS_FILE = MIGRATIONS / "_customer_phone_to_id_sync.json"
OUT = MIGRATIONS / "_customer_id_update_all.sql"


def sql_escape_phone(p: str) -> str:
    return str(p).replace("'", "''")


def main() -> None:
    pairs = json.loads(PAIRS_FILE.read_text(encoding="utf-8"))["pairs"]
    parts = [f"  ('{sql_escape_phone(phone)}'::text, {int(tid)}::bigint)" for phone, tid in pairs]
    body = ",\n".join(parts)
    sql = f"""UPDATE public.customers AS c
SET id = v.target_id
FROM (
VALUES
{body}
) AS v(phone, target_id)
WHERE c.phone = v.phone AND c.id IS DISTINCT FROM v.target_id;
"""
    OUT.write_text(sql, encoding="utf-8")
    print(len(pairs), "rows,", OUT.stat().st_size, "bytes")


if __name__ == "__main__":
    main()
