# One-off: build _customer_id_updates.json for phone->id sync (not for long-term use in app)
import json
import os
import sys
from pathlib import Path

import requests

MIGRATIONS = Path(__file__).resolve().parent
PROJECT_ROOT = MIGRATIONS.parents[1]
ENV_PATH = PROJECT_ROOT / ".env.local"


def load_env(env_path: Path) -> dict:
    m: dict = {}
    if not env_path.exists():
        return m
    for line in env_path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        m[k.strip()] = v.strip()
    return m


def main() -> int:
    env = load_env(ENV_PATH)
    url = os.environ.get("SUPABASE_URL") or env.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or env.get("SUPABASE_SERVICE_ROLE_KEY")
    if not url or not key:
        print("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY missing", file=sys.stderr)
        return 1

    pairs_path = MIGRATIONS / "_customer_phone_to_id_sync.json"
    pairs = json.loads(pairs_path.read_text(encoding="utf-8"))["pairs"]
    phone_to_target = {}
    for phone, tid in pairs:
        phone_to_target[str(phone)] = int(tid)

    headers = {"apikey": key, "Authorization": f"Bearer {key}"}
    base = url.rstrip("/")

    allc = []
    start = 0
    page_size = 1000
    while True:
        endpoint = (
            f"{base}/rest/v1/customers?select=id,phone"
            f"&offset={start}&limit={page_size}"
        )
        resp = requests.get(endpoint, headers=headers, timeout=120)
        resp.raise_for_status()
        rows = resp.json()
        if not rows:
            break
        allc.extend(rows)
        if len(rows) < page_size:
            break
        start += page_size

    print(f"[INFO] rows in DB customers table: {len(allc)}")
    needs = []
    for row in allc:
        ph = row.get("phone")
        if ph not in phone_to_target:
            continue
        tgt = phone_to_target[ph]
        cid = row["id"]
        if cid != tgt:
            needs.append({"old_id": cid, "new_id": tgt, "phone": ph})

    targets_wanted = {x["new_id"] for x in needs}
    blocking = []
    for row in allc:
        cid = row["id"]
        ph = row.get("phone") or ""
        owntgt = phone_to_target.get(ph)
        if cid in targets_wanted and owntgt != cid:
            blocking.append({"blocking_id": cid, "holder_phone": ph})

    out_path = MIGRATIONS / "_customer_id_updates.json"
    out_path.write_text(
        json.dumps({"updates": needs, "blocking_candidates": blocking}, ensure_ascii=False),
        encoding="utf-8",
    )
    print(f"[INFO] rows needing id update: {len(needs)}")
    print(f"[INFO] blocking candidate rows (same id targeted): {len(blocking)}")
    print(f"[DONE] wrote {out_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
