# Generates SQL batch files for MCP execute_sql (no DB credentials needed).
import json
from pathlib import Path

MIGRATIONS = Path(__file__).resolve().parent
PAIRS_FILE = MIGRATIONS / "_customer_phone_to_id_sync.json"
OUT_DIR = MIGRATIONS / "_id_update_batches"
BATCH_SIZE = 350


def sql_escape_phone(p: str) -> str:
    return str(p).replace("'", "''")


def main() -> None:
    pairs = json.loads(PAIRS_FILE.read_text(encoding="utf-8"))["pairs"]
    OUT_DIR.mkdir(exist_ok=True)
    for old in OUT_DIR.glob("batch_*.sql"):
        old.unlink()

    batch_idx = 0
    for i in range(0, len(pairs), BATCH_SIZE):
        chunk = pairs[i : i + BATCH_SIZE]
        lines = []
        for phone, tid in chunk:
            lines.append(f"  ('{sql_escape_phone(phone)}'::text, {int(tid)}::bigint)")
        values_sql = ",\n".join(lines)

        sql = f"""UPDATE public.customers AS c
SET id = v.target_id
FROM (
VALUES
{values_sql}
) AS v(phone, target_id)
WHERE c.phone = v.phone AND c.id IS DISTINCT FROM v.target_id;
"""
        path = OUT_DIR / f"batch_{batch_idx:03d}.sql"
        path.write_text(sql, encoding="utf-8")
        batch_idx += 1

    print(f"wrote {batch_idx} files into {OUT_DIR}")


if __name__ == "__main__":
    main()
