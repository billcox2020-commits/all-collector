#!/usr/bin/env python3
"""Add unseen active listings from the configured Bunjang seller export."""

from __future__ import annotations

import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

SELLER_ID = "4934829"
DATA_PATH = Path(os.environ.get("BUNJANG_DATA_PATH", "data/bunjang-active.json"))
RAW_PATH = Path(os.environ.get("BUNJANG_RAW_PATH", "bunjang-actor-items.json"))


def load_json(path: Path) -> Any:
    try:
        with path.open("r", encoding="utf-8") as stream:
            return json.load(stream)
    except (OSError, json.JSONDecodeError) as exc:
        raise RuntimeError(f"Cannot read {path}: {exc}") from exc


def seller_id(item: dict[str, Any]) -> str:
    value = item.get("sellerId") or item.get("seller_id") or item.get("sellerID")
    if value is None and isinstance(item.get("seller"), dict):
        value = item["seller"].get("id") or item["seller"].get("sellerId")
    return str(value).strip() if value is not None else ""


def product_id(item: dict[str, Any]) -> str:
    value = item.get("id") or item.get("pid") or item.get("productId") or item.get("product_id")
    return str(value).removeprefix("BJ-").strip() if value is not None else ""


def is_active(item: dict[str, Any]) -> bool:
    status = str(item.get("status") or item.get("saleStatus") or "").strip().lower()
    return status in {"selling", "판매중", "판매 중", "for_sale", "active", "on_sale"}


def iter_items(raw: Any) -> list[Any]:
    if isinstance(raw, list):
        return raw
    if not isinstance(raw, dict):
        return []
    if isinstance(raw.get("items"), list):
        return raw["items"]
    nested: Any = raw
    for key in ("data", "responses", "mainGrid", "searchResponse", "data"):
        if not isinstance(nested, dict):
            return []
        nested = nested.get(key)
    return nested if isinstance(nested, list) else []


def category_for(title: str, labels: str = "") -> str:
    text = f"{title} {labels}".lower()
    if any(word in text for word in ("캡", "모자", "볼캡", "가방", "백팩", "지샥", "g-shock", "시계", "텀블러")):
        return "etc"
    if any(word in text for word in ("패딩", "자켓", "재킷", "점퍼", "발토로", "눕시", "라이더", "봄버", "코트", "후리스", "플리스", "베스트", "바람막이")):
        return "outer"
    if any(word in text for word in ("셔츠", "남방", "티셔츠", "반팔", "긴팔", "후드", "맨투맨", "니트", "가디건", "스웨터", "폴로셔츠")):
        return "top"
    if any(word in text for word in ("팬츠", "바지", "청바지", "데님", "진스", "오버롤")):
        return "bottom"
    if any(word in text for word in ("에어포스", "에어 포스", "조던", "덩크", "반달", "vandal", "코르테즈", "스니커", "부츠", "슈즈", "신발", "운동화", "하이탑", "로우탑", "리복", "reebok", "반스", "vans")):
        return "shoes"
    return "etc"


def brand_for(title: str, supplied: Any = "") -> str:
    text = f"{title} {supplied}".lower()
    brands = (
        (("조던", "jordan"), "JORDAN"), (("나이키", "nike", "에어포스", "덩크", "반달"), "NIKE"),
        (("노스페이스", "north face", "발토로", "히말라야", "눕시"), "THE NORTH FACE"),
        (("생로랑", "saint laurent", "ysl"), "SAINT LAURENT"), (("디올", "dior"), "DIOR HOMME"),
        (("폴로스포츠", "polo sport"), "POLO SPORT"), (("폴로", "랄프로렌", "ralph lauren"), "POLO RALPH LAUREN"),
        (("아르마니", "armani"), "ARMANI"), (("슈프림", "supreme"), "SUPREME"),
        (("지샥", "g-shock", "gshock", "카시오"), "G-SHOCK"), (("몽클레어", "moncler"), "MONCLER"),
    )
    for needles, brand in brands:
        if any(needle in text for needle in needles):
            return brand
    return str(supplied or "OTHER").strip()


def year_for(title: str) -> int | None:
    import re

    full = re.search(r"\b(19\d{2}|20[0-2]\d)\b", title)
    if full:
        return int(full.group(1))
    short = re.search(r"(?:^|\D)(\d{2})(?:년|년도|s\b|fw\b|ss\b|f/w|s/s)", title, re.IGNORECASE)
    if short:
        value = int(short.group(1))
        return 1900 + value if value >= 80 else 2000 + value
    return None


def normalize(item: dict[str, Any], pid: str) -> dict[str, Any]:
    url = item.get("source_url") or item.get("productUrl") or item.get("url") or f"https://m.bunjang.co.kr/products/{pid}"
    image = item.get("image") or item.get("imageUrl") or item.get("productImage") or ""
    if "{res}" in str(image):
        image = str(image).replace("{res}", "400")
    if "{cnt}" in str(image):
        image = str(image).replace("{cnt}", "1")
    price = item.get("price_krw", item.get("price", 0))
    try:
        price = int(str(price).replace(",", "").replace("원", "").strip() or 0)
    except ValueError:
        price = 0
    title = str(item.get("title") or item.get("name") or "제목 미등록").strip()
    category_labels = " ".join(
        str(entry.get("name", "")) for entry in item.get("categories", []) if isinstance(entry, dict)
    ) if isinstance(item.get("categories"), list) else ""
    brand_value = item.get("brand")
    if isinstance(brand_value, dict):
        brand_value = brand_value.get("name")
    if not brand_value and isinstance(item.get("brandInfo"), dict):
        brand_value = item["brandInfo"].get("name", "")
    normalized = {
        "id": f"BJ-{pid}",
        "category": item.get("category") or category_for(title, category_labels),
        "brand": brand_for(title, brand_value),
        "source": "bunjang",
        "title": title,
        "source_url": str(url),
        "image": str(image),
        "price_krw": price,
        "status": "for_sale",
        "status_text": "판매 중",
        "checked_at": datetime.now(timezone.utc).date().isoformat(),
        "description": str(item.get("description") or "번개장터 올콜렉터 상점에서 확인."),
        "size": str(item.get("size") or ""),
    }
    year = item.get("year") or year_for(title)
    if year:
        normalized["year"] = year
    return normalized


def main() -> int:
    raw = load_json(RAW_PATH)
    rows = iter_items(raw)
    if not rows:
        raise RuntimeError("Apify returned no listing array; existing archive was left untouched.")

    eligible: dict[str, dict[str, Any]] = {}
    for item in rows:
        if not isinstance(item, dict) or seller_id(item) != SELLER_ID or not is_active(item):
            continue
        pid = product_id(item)
        if pid:
            eligible[pid] = item
    if not eligible:
        raise RuntimeError(
            f"No active listings for seller {SELLER_ID} were returned; refusing to change the archive."
        )

    archive = load_json(DATA_PATH)
    if not isinstance(archive, dict) or not isinstance(archive.get("items"), list):
        raise RuntimeError(f"{DATA_PATH} does not have the expected archive format; refusing to replace it.")

    known = {product_id(item) for item in archive["items"] if isinstance(item, dict)}
    additions = [normalize(item, pid) for pid, item in eligible.items() if pid not in known]
    if additions:
        archive["items"] = additions + archive["items"]
        archive["count"] = len(archive["items"])
        archive["generated_at"] = datetime.now(timezone.utc).date().isoformat()
        archive["source"] = archive.get("source") or "Bunjang / 올콜렉터 shop 4934829"
        archive["rule"] = "Apify seller export filtered to active listings for seller 4934829; product IDs are deduplicated."
        temporary = DATA_PATH.with_suffix(DATA_PATH.suffix + ".tmp")
        temporary.parent.mkdir(parents=True, exist_ok=True)
        temporary.write_text(json.dumps(archive, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        temporary.replace(DATA_PATH)

    summary = f"Checked {len(eligible)} active Bunjang listings; added {len(additions)} new products."
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
