#!/usr/bin/env python3
"""Merge new active listings from the configured Bunjang seller into the archive."""

from __future__ import annotations

import json
import os
import re
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

SELLER_ID = "4934829"
CUTOFF = datetime(2026, 9, 20, tzinfo=timezone.utc)
EXCLUDED_PRODUCT_IDS = {"433998678"}  # 관리자에서 직접 등록한 빨간 Armani Jeans 모자
DATA_PATH = Path(os.environ.get("BUNJANG_DATA_PATH", "data/bunjang-active.json"))
PERSONAL_PATH = Path(os.environ.get("PERSONAL_DATA_PATH", "data/personal-posts.json"))
RAW_PATH = Path(os.environ.get("BUNJANG_RAW_PATH", "bunjang-actor-items.json"))
MAX_SCRAPE_AGE = timedelta(hours=2)


def load_json(path: Path) -> Any:
    try:
        with path.open("r", encoding="utf-8") as stream:
            return json.load(stream)
    except (OSError, json.JSONDecodeError) as exc:
        raise RuntimeError(f"Cannot read {path}: {exc}") from exc


def product_id(item: dict[str, Any]) -> str:
    value = item.get("id") or item.get("pid") or item.get("productId")
    return str(value).removeprefix("BJ-").strip() if value is not None else ""


def is_active(item: dict[str, Any]) -> bool:
    status = str(item.get("status", "")).strip().lower()
    return status in {"판매중", "판매 중", "for_sale", "active", "on_sale"}


def parse_timestamp(value: Any) -> datetime | None:
    if not value:
        return None
    try:
        return datetime.fromisoformat(str(value).replace("Z", "+00:00")).astimezone(timezone.utc)
    except ValueError:
        return None


def is_after_cutoff(item: dict[str, Any]) -> bool:
    timestamp = parse_timestamp(item.get("updatedAt") or item.get("updated_at"))
    return timestamp is not None and timestamp > CUTOFF


def verify_fresh_scrape(items: list[dict[str, Any]]) -> None:
    """Reject cached or previously downloaded exports before touching the archive."""
    timestamps = [
        parse_timestamp(item.get("scrapedAt") or item.get("scraped_at"))
        for item in items
        if isinstance(item, dict)
    ]
    timestamps = [value for value in timestamps if value is not None]
    if not timestamps:
        raise RuntimeError("Apify results have no scrapedAt timestamp; refusing to use unverifiable data.")
    newest = max(timestamps)
    age = datetime.now(timezone.utc) - newest
    if age < timedelta(minutes=-5) or age > MAX_SCRAPE_AGE:
        raise RuntimeError(
            f"Apify returned stale results (newest scrapedAt={newest.isoformat()}); "
            "the existing archive was left untouched."
        )


def normalized_url(value: Any) -> str:
    return str(value or "").split("?", 1)[0].rstrip("/").lower()


def infer_brand(title: str, supplied: Any = "") -> str:
    if str(supplied or "").strip():
        return str(supplied).strip().upper()
    lowered = title.lower()
    brands = (
        (("나이키", "nike"), "NIKE"),
        (("노스페이스", "north face"), "THE NORTH FACE"),
        (("아르마니", "armani"), "ARMANI"),
        (("디올", "dior"), "DIOR HOMME"),
        (("폴로", "ralph lauren"), "POLO RALPH LAUREN"),
        (("아디다스", "adidas"), "ADIDAS"),
        (("뉴발란스", "new balance"), "NEW BALANCE"),
        (("리복", "reebok"), "REEBOK"),
        (("팀버랜드", "timberland"), "TIMBERLAND"),
        (("몽클레어", "moncler"), "MONCLER"),
        (("슈프림", "supreme"), "SUPREME"),
        (("구찌", "gucci"), "GUCCI"),
        (("생로랑", "saint laurent"), "SAINT LAURENT"),
        (("조던", "jordan"), "JORDAN"),
        (("챔피온", "champion"), "CHAMPION"),
        (("리바이스", "levi"), "LEVI'S"),
    )
    for needles, brand in brands:
        if any(needle in lowered for needle in needles):
            return brand
    return "OTHER"


def infer_category(title: str, supplied: Any = "") -> str:
    value = str(supplied or "").strip().lower()
    if value in {"shoes", "outer", "top", "bottom", "etc"}:
        return value
    lowered = title.lower()
    if any(word in lowered for word in ("신발", "스니커", "에어포스", "조던", "부츠", "로퍼", "슈즈", "하이탑")):
        return "shoes"
    if any(word in lowered for word in ("패딩", "파카", "점퍼", "자켓", "재킷", "코트", "발토로", "히말라야", "눕시", "베스트")):
        return "outer"
    if any(word in lowered for word in ("셔츠", "남방", "티셔츠", "니트", "맨투맨", "후드", "스웨터")):
        return "top"
    if any(word in lowered for word in ("팬츠", "바지", "데님", "슬랙스", "쇼츠")):
        return "bottom"
    return "etc"


def infer_year(title: str) -> int | None:
    full = re.search(r"\b(19\d{2}|20\d{2})\b", title)
    if full:
        return int(full.group(1))
    short = re.search(r"(?:^|\s)(\d{2})년", title)
    if short:
        year = int(short.group(1))
        return 1900 + year if year >= 70 else 2000 + year
    return None


def normalize(item: dict[str, Any], pid: str) -> dict[str, Any]:
    url = item.get("source_url") or item.get("productUrl") or item.get("url") or ""
    image = item.get("image") or item.get("imageUrl") or ""
    price = item.get("price_krw", item.get("price", 0))
    try:
        price = int(str(price).replace(",", "").replace("원", "").strip() or 0)
    except ValueError:
        price = 0
    title = str(item.get("title") or item.get("name") or "제목 미등록").strip()
    result = {
        "id": f"BJ-{pid}",
        "category": infer_category(title, item.get("category")),
        "brand": infer_brand(title, item.get("brand")),
        "source": "bunjang",
        "title": title,
        "source_url": str(url),
        "image": str(image),
        "price_krw": price,
        "status": "for_sale",
        "status_text": "판매 중",
        "checked_at": datetime.now(timezone.utc).date().isoformat(),
        "description": str(item.get("description") or "번개장터 올콜렉터 상점에서 자동 수집."),
        "size": str(item.get("size") or ""),
    }
    year = infer_year(title)
    if year:
        result["year"] = year
    return result


def main() -> int:
    raw = load_json(RAW_PATH)
    if isinstance(raw, dict):
        raw = raw.get("items")
    if not isinstance(raw, list) or not raw:
        raise RuntimeError("Apify returned no listing array; existing archive was left untouched.")
    verify_fresh_scrape(raw)

    eligible: dict[str, dict[str, Any]] = {}
    for item in raw:
        if (
            not isinstance(item, dict)
            or str(item.get("sellerId", "")) != SELLER_ID
            or not is_active(item)
            or not is_after_cutoff(item)
        ):
            continue
        pid = product_id(item)
        if pid and pid not in EXCLUDED_PRODUCT_IDS:
            eligible[pid] = item
    if not eligible:
        raise RuntimeError(
            f"No active listings for seller {SELLER_ID} were returned; refusing to change the archive."
        )

    archive = load_json(DATA_PATH)
    if not isinstance(archive, dict) or not isinstance(archive.get("items"), list):
        raise RuntimeError(f"{DATA_PATH} does not have the expected archive format; refusing to replace it.")

    personal = load_json(PERSONAL_PATH)
    if not isinstance(personal, dict) or not isinstance(personal.get("items"), list):
        raise RuntimeError(f"{PERSONAL_PATH} does not have the expected archive format; refusing to update.")

    known = {product_id(item) for item in archive["items"] if isinstance(item, dict)}
    personal_urls = {
        normalized_url(item.get("source_url")) for item in personal["items"]
        if isinstance(item, dict) and normalized_url(item.get("source_url"))
    }
    additions = []
    skipped_personal = 0
    for pid, item in eligible.items():
        if pid in known:
            continue
        candidate = normalize(item, pid)
        candidate["added_at"] = datetime.now(timezone.utc).isoformat()
        if normalized_url(candidate.get("source_url")) in personal_urls:
            skipped_personal += 1
            continue
        additions.append(candidate)
    if additions:
        archive["items"] = additions + archive["items"]
        archive["count"] = len(archive["items"])
        archive["generated_at"] = datetime.now(timezone.utc).date().isoformat()
        archive["source"] = archive.get("source") or "Bunjang / 올콜렉터 shop 4934829"
        archive["rule"] = archive.get("rule") or "Apify seller export filtered to active listings for seller 4934829; product IDs are deduplicated."
        temporary = DATA_PATH.with_suffix(DATA_PATH.suffix + ".tmp")
        temporary.parent.mkdir(parents=True, exist_ok=True)
        temporary.write_text(json.dumps(archive, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        temporary.replace(DATA_PATH)

    summary = (
        f"Checked {len(eligible)} active Bunjang listings after the cutoff; "
        f"skipped {skipped_personal} personal-record duplicates; added {len(additions)} new products."
    )
    print(summary)
    output_path = os.environ.get("GITHUB_STEP_SUMMARY")
    if output_path:
        with open(output_path, "a", encoding="utf-8") as summary_file:
            summary_file.write(f"### Bunjang sync\n\n{summary}\n")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except RuntimeError as error:
        print(f"::error::{error}", file=sys.stderr)
        raise SystemExit(1)
