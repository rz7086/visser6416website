#!/usr/bin/env python3
# -*- coding: utf-8 -*-

from __future__ import annotations

import csv
import html
import io
import json
import re
import sys
from datetime import datetime
from pathlib import Path
from string import Template
from urllib.error import HTTPError, URLError
from urllib.parse import quote
from urllib.request import Request, urlopen
from xml.sax.saxutils import escape as xml_escape

GOOGLE_SHEET_CSV_URL = "https://docs.google.com/spreadsheets/d/1w4oTViilqS47zAXDHR6TnDxlP-OSN7CxPO44GIozCUE/export?format=csv&gid=2144620371"
SITE_URL = "https://www.visser6416.com"
SITE_NAME = "惟瑟 Visser"
SITE_LANGUAGE = "zh-Hant"
SORT_BY_DATE = False

PROJECT_ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = PROJECT_ROOT / "data"
WORKS_DIR = PROJECT_ROOT / "works"
TEMPLATE_PATH = PROJECT_ROOT / "templates" / "work.html"
WORKS_JSON_PATH = DATA_DIR / "works.json"
SITEMAP_PATH = PROJECT_ROOT / "sitemap.xml"

REQUIRED_COLUMNS = [
    "作品名稱", "發佈時間", "作品網址", "資訊欄", "縮圖網址",
    "影片 ID", "系列", "精選", "歌詞",
]


def clean_text(value: object) -> str:
    if value is None:
        return ""
    return str(value).replace("\r\n", "\n").replace("\r", "\n").strip()


def download_csv(url: str) -> str:
    if not url.startswith(("http://", "https://")):
        raise ValueError("請先設定 GOOGLE_SHEET_CSV_URL。")
    req = Request(url, headers={"User-Agent": "Mozilla/5.0 (VisserWorksBuilder/1.0)"})
    try:
        with urlopen(req, timeout=30) as response:
            raw = response.read()
    except HTTPError as error:
        raise RuntimeError(f"下載 CSV 失敗：HTTP {error.code} {error.reason}") from error
    except URLError as error:
        raise RuntimeError(f"下載 CSV 失敗：{error.reason}") from error
    return raw.decode("utf-8-sig")


def parse_series(value: str) -> list[str]:
    if not value:
        return []
    result: list[str] = []
    seen: set[str] = set()
    for part in re.split(r"[｜|,，]+", value):
        item = part.strip()
        if item and item not in seen:
            result.append(item)
            seen.add(item)
    return result


def parse_featured(value: str) -> bool:
    return value.strip().lower() in {
        "true", "1", "yes", "y", "是", "有", "精選", "✓", "✔", "v"
    }


def get_intro(text: str, max_lines: int = 2) -> str:
    lines = [line.strip() for line in clean_text(text).split("\n") if line.strip()]
    return "\n".join(lines[:max_lines])


def parse_date_for_sort(value: str) -> datetime:
    formats = [
        "%Y-%m-%d", "%Y/%m/%d", "%Y.%m.%d",
        "%Y-%m-%d %H:%M:%S", "%Y/%m/%d %H:%M:%S",
        "%Y-%m-%dT%H:%M:%S", "%Y-%m-%dT%H:%M:%SZ",
    ]
    for fmt in formats:
        try:
            return datetime.strptime(value.strip(), fmt)
        except ValueError:
            pass
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00")).replace(tzinfo=None)
    except ValueError:
        return datetime.min


def normalize_iso_date(value: str) -> str:
    parsed = parse_date_for_sort(value)
    return value if parsed == datetime.min else parsed.strftime("%Y-%m-%d")


def validate_columns(fieldnames: list[str] | None) -> None:
    if not fieldnames:
        raise ValueError("CSV 沒有標題列。")
    cleaned = [clean_text(name) for name in fieldnames]
    missing = [column for column in REQUIRED_COLUMNS if column not in cleaned]
    if missing:
        raise ValueError("CSV 缺少欄位：" + "、".join(missing) + "\n目前找到的欄位：" + "、".join(cleaned))


def parse_rows(csv_text: str) -> list[dict[str, object]]:
    reader = csv.DictReader(io.StringIO(csv_text))
    validate_columns(reader.fieldnames)
    works: list[dict[str, object]] = []
    used_slugs: set[str] = set()

    for row_number, row in enumerate(reader, start=2):
        title = clean_text(row.get("作品名稱"))
        if not title:
            continue
        video_id = clean_text(row.get("影片 ID"))
        if not video_id:
            raise ValueError(f"第 {row_number} 列「{title}」缺少影片 ID。")
        if video_id in used_slugs:
            raise ValueError(f"第 {row_number} 列發現重複影片 ID：{video_id}")
        used_slugs.add(video_id)

        description = clean_text(row.get("資訊欄"))
        published_at = clean_text(row.get("發佈時間"))
        works.append({
            "slug": video_id,
            "title": title,
            "publishedAt": published_at,
            "publishedDate": normalize_iso_date(published_at),
            "url": clean_text(row.get("作品網址")),
            "description": description,
            "intro": get_intro(description),
            "thumbnailUrl": clean_text(row.get("縮圖網址")),
            "videoId": video_id,
            "series": parse_series(clean_text(row.get("系列"))),
            "featured": parse_featured(clean_text(row.get("精選"))),
            "lyrics": clean_text(row.get("歌詞")),
        })

    if SORT_BY_DATE:
        works.sort(key=lambda item: parse_date_for_sort(str(item["publishedAt"])), reverse=True)
    return works


def escape_text(value: object) -> str:
    return html.escape(str(value), quote=True)


def text_to_html_paragraphs(text: str) -> str:
    text = clean_text(text)
    if not text:
        return ""
    blocks: list[str] = []
    for paragraph in re.split(r"\n\s*\n", text):
        lines = [escape_text(line) for line in paragraph.split("\n")]
        blocks.append("<p>" + "<br>\n".join(lines) + "</p>")
    return "\n".join(blocks)


def build_series_html(series: list[str]) -> str:
    return "\n".join(f'<span class="work_tag">{escape_text(item)}</span>' for item in series)


def render_work_page(work: dict[str, object], template: Template) -> str:
    canonical_url = f"{SITE_URL}/works/{quote(str(work['slug']), safe='')}.html"
    intro = str(work["intro"])
    meta_description = intro or f"{work['title']}｜{SITE_NAME}"
    values = {
        "lang": SITE_LANGUAGE,
        "site_name": escape_text(SITE_NAME),
        "title": escape_text(work["title"]),
        "page_title": escape_text(f"{work['title']}｜{SITE_NAME}"),
        "meta_description": escape_text(meta_description),
        "canonical_url": escape_text(canonical_url),
        "thumbnail_url": escape_text(work["thumbnailUrl"]),
        "published_at": escape_text(work["publishedAt"]),
        "published_date": escape_text(work["publishedDate"]),
        "work_url": escape_text(work["url"]),
        "video_id": escape_text(work["videoId"]),
        "youtube_embed_url": escape_text("https://www.youtube-nocookie.com/embed/" + quote(str(work["videoId"]), safe="")),
        "series_text": escape_text("｜".join(work["series"])),
        "series_html": build_series_html(work["series"]),
        "description_html": text_to_html_paragraphs(str(work["description"])),
        "lyrics_html": text_to_html_paragraphs(str(work["lyrics"])),
        "slug": escape_text(work["slug"]),
    }
    return template.safe_substitute(values)


def save_works_json(works: list[dict[str, object]]) -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    index_data = [{
        "slug": work["slug"],
        "title": work["title"],
        "publishedAt": work["publishedAt"],
        "url": work["url"],
        "thumbnailUrl": work["thumbnailUrl"],
        "videoId": work["videoId"],
        "series": work["series"],
        "featured": work["featured"],
        "description": work["intro"],
    } for work in works]
    with WORKS_JSON_PATH.open("w", encoding="utf-8", newline="\n") as file:
        json.dump(index_data, file, ensure_ascii=False, indent=2)
        file.write("\n")


def load_template() -> Template:
    if not TEMPLATE_PATH.exists():
        raise FileNotFoundError(f"找不到作品頁模板：{TEMPLATE_PATH}")
    return Template(TEMPLATE_PATH.read_text(encoding="utf-8"))


def generate_work_pages(works: list[dict[str, object]], template: Template) -> None:
    WORKS_DIR.mkdir(parents=True, exist_ok=True)
    expected_files = {f"{work['slug']}.html" for work in works}

    for old_file in WORKS_DIR.glob("*.html"):
        if old_file.name in expected_files:
            continue
        try:
            beginning = old_file.read_text(encoding="utf-8")[:200]
        except UnicodeDecodeError:
            continue
        if "AUTO-GENERATED-WORK-PAGE" in beginning:
            old_file.unlink()
            print(f"刪除舊作品頁：{old_file.name}")

    for work in works:
        output_path = WORKS_DIR / f"{work['slug']}.html"
        output_path.write_text(render_work_page(work, template), encoding="utf-8", newline="\n")


def generate_sitemap(works: list[dict[str, object]]) -> None:
    static_urls = [
        f"{SITE_URL}/", f"{SITE_URL}/about.html", f"{SITE_URL}/works.html",
        f"{SITE_URL}/commission.html", f"{SITE_URL}/contact.html",
    ]
    urls: list[tuple[str, str | None]] = [(url, None) for url in static_urls]
    for work in works:
        url = f"{SITE_URL}/works/{quote(str(work['slug']), safe='')}.html"
        urls.append((url, str(work["publishedDate"]) or None))

    lines = ['<?xml version="1.0" encoding="UTF-8"?>', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
    for loc, lastmod in urls:
        lines += ["  <url>", f"    <loc>{xml_escape(loc)}</loc>"]
        if lastmod:
            lines.append(f"    <lastmod>{xml_escape(lastmod)}</lastmod>")
        lines.append("  </url>")
    lines += ["</urlset>", ""]
    SITEMAP_PATH.write_text("\n".join(lines), encoding="utf-8", newline="\n")


def main() -> int:
    try:
        print("正在下載 Google Sheet CSV……")
        works = parse_rows(download_csv(GOOGLE_SHEET_CSV_URL))
        template = load_template()
        print("正在建立 data/works.json……")
        save_works_json(works)
        print("正在建立作品 HTML……")
        generate_work_pages(works, template)
        print("正在建立 sitemap.xml……")
        generate_sitemap(works)
        print(f"\n建置完成，共 {len(works)} 首作品。")
        return 0
    except Exception as error:
        print(f"\n建置失敗：{error}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
