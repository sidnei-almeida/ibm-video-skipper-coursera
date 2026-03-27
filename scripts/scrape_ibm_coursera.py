#!/usr/bin/env python3
"""
Scrape IBM courses from Coursera search results (dynamic infinite scroll).

Usage:
  python scripts/scrape_ibm_coursera.py
  python scripts/scrape_ibm_coursera.py --query ibm --headless
  python scripts/scrape_ibm_coursera.py --update-content-js content.js
"""

from __future__ import annotations

import argparse
import json
import re
import shutil
import time
from dataclasses import dataclass, asdict
from pathlib import Path
from typing import Iterable
from urllib.parse import quote, urljoin, urlparse

from selenium import webdriver
from selenium.common.exceptions import StaleElementReferenceException, TimeoutException
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import WebDriverWait


BASE_URL = "https://www.coursera.org/search?query={query}"
COURSE_CARD_SELECTOR = '[data-testid="product-card-cds"]'
PARTNER_SELECTOR = "p.cds-ProductCard-partnerNames"
TITLE_LINK_SELECTOR = 'a[data-click-key="search.search.click.search_card"]'
TITLE_H3_SELECTOR = "h3"
AUTOGEN_START = "// AUTO-GENERATED-IBM-SLUGS-START"
AUTOGEN_END = "// AUTO-GENERATED-IBM-SLUGS-END"


@dataclass(frozen=True)
class CourseEntry:
    title: str
    href: str
    slug: str
    partner: str
    is_coursera: bool


def normalize_slug(href: str) -> str:
    path = urlparse(href).path
    m = re.match(r"^/(learn|professional-certificates|specializations)/([^/?#]+)", path)
    return m.group(2).strip().lower() if m else ""


def resolve_system_chrome_binary(explicit_binary: str = "") -> str | None:
    if explicit_binary:
        p = Path(explicit_binary).expanduser()
        if p.exists():
            return str(p)
        raise RuntimeError(f"Chrome binary not found: {p}")

    # Common binaries on Arch/AUR/paru setups
    candidates = [
        "google-chrome-stable",
        "google-chrome",
        "chromium",
        "chromium-browser",
    ]
    for name in candidates:
        path = shutil.which(name)
        if path:
            return path
    return None


def build_driver(headless: bool, chrome_binary: str = "") -> webdriver.Chrome:
    opts = Options()
    resolved_binary = resolve_system_chrome_binary(chrome_binary)
    if resolved_binary:
        opts.binary_location = resolved_binary
    if headless:
        opts.add_argument("--headless=new")
    opts.add_argument("--disable-gpu")
    opts.add_argument("--no-sandbox")
    opts.add_argument("--window-size=1440,2200")
    opts.add_argument("--disable-dev-shm-usage")
    opts.add_argument("--lang=en-US")
    driver = webdriver.Chrome(options=opts)
    if resolved_binary:
        print(f"[driver] Using system Chrome binary: {resolved_binary}")
    else:
        print("[driver] Using Selenium default browser binary resolution.")
    return driver


def scroll_until_no_new_ibm_courses(
    driver: webdriver.Chrome,
    pause_sec: float,
    no_new_rounds_stop: int,
    max_scroll_rounds: int,
) -> list[CourseEntry]:
    no_new_rounds = 0
    known: dict[str, CourseEntry] = {}

    for round_idx in range(1, max_scroll_rounds + 1):
        current = parse_cards(driver)
        before = len(known)
        for item in current:
            known[item.slug] = item
        after = len(known)
        delta = after - before

        if delta == 0:
            no_new_rounds += 1
        else:
            no_new_rounds = 0

        print(
            f"[scroll {round_idx:03d}] ibm_total={after} new_this_round={delta} no_new_rounds={no_new_rounds}/{no_new_rounds_stop}"
        )

        if no_new_rounds >= no_new_rounds_stop:
            break

        driver.execute_script("window.scrollTo(0, document.body.scrollHeight);")
        time.sleep(pause_sec)

    return sorted(known.values(), key=lambda x: x.slug)


def parse_cards(driver: webdriver.Chrome) -> list[CourseEntry]:
    items: dict[str, CourseEntry] = {}
    cards = driver.find_elements(By.CSS_SELECTOR, COURSE_CARD_SELECTOR)
    for card in cards:
        # Coursera re-renderiza os cards durante o scroll; tratamos stale sem abortar.
        parsed = False
        for _ in range(3):
            try:
                partner_el = card.find_elements(By.CSS_SELECTOR, PARTNER_SELECTOR)
                partner = partner_el[0].text.strip() if partner_el else ""
                if "ibm" not in partner.lower():
                    parsed = True
                    break

                links = card.find_elements(By.CSS_SELECTOR, TITLE_LINK_SELECTOR)
                if not links:
                    parsed = True
                    break
                link = links[0]

                href = link.get_attribute("href") or ""
                if not href:
                    parsed = True
                    break
                href = urljoin("https://www.coursera.org", href)

                h3s = link.find_elements(By.CSS_SELECTOR, TITLE_H3_SELECTOR)
                title = h3s[0].text.strip() if h3s else (link.text or "").strip()
                slug = normalize_slug(href)
                if not slug:
                    parsed = True
                    break

                host = (urlparse(href).hostname or "").lower()
                is_coursera = host == "coursera.org" or host.endswith(".coursera.org")

                items[slug] = CourseEntry(
                    title=title or slug,
                    href=href,
                    slug=slug,
                    partner=partner or "IBM",
                    is_coursera=is_coursera,
                )
                parsed = True
                break
            except StaleElementReferenceException:
                time.sleep(0.05)

        if parsed:
            continue

        # Fallback final: parse por HTML bruto do card para não perder o lote.
        try:
            raw = card.get_attribute("outerHTML") or ""
        except StaleElementReferenceException:
            continue
        if "ibm" not in raw.lower():
            continue

        href_match = re.search(r'href="([^"]+)"', raw)
        if not href_match:
            continue
        href = urljoin("https://www.coursera.org", href_match.group(1))
        slug = normalize_slug(href)
        if not slug:
            continue

        title_match = re.search(r"<h3[^>]*>(.*?)</h3>", raw, flags=re.IGNORECASE | re.DOTALL)
        title = re.sub(r"\s+", " ", title_match.group(1)).strip() if title_match else slug

        partner_match = re.search(
            r'<p[^>]*class="[^"]*cds-ProductCard-partnerNames[^"]*"[^>]*>(.*?)</p>',
            raw,
            flags=re.IGNORECASE | re.DOTALL,
        )
        partner = re.sub(r"\s+", " ", partner_match.group(1)).strip() if partner_match else "IBM"

        host = (urlparse(href).hostname or "").lower()
        is_coursera = host == "coursera.org" or host.endswith(".coursera.org")

        items[slug] = CourseEntry(
            title=title or slug,
            href=href,
            slug=slug,
            partner=partner or "IBM",
            is_coursera=is_coursera,
        )

    return sorted(items.values(), key=lambda x: x.slug)


def render_courses_js(entries: Iterable[CourseEntry]) -> str:
    lines = [
        "// Auto-generated by scripts/scrape_ibm_coursera.py",
        "// Do not edit manually.",
        "",
        "export const IBM_COURSES = [",
    ]
    for e in entries:
        title = json.dumps(e.title, ensure_ascii=False)
        href = json.dumps(e.href, ensure_ascii=False)
        slug = json.dumps(e.slug, ensure_ascii=False)
        partner = json.dumps(e.partner, ensure_ascii=False)
        lines.append(
            f"  {{ title: {title}, href: {href}, slug: {slug}, partner: {partner}, isCoursera: {str(e.is_coursera).lower()} }},"
        )
    lines.append("];")
    lines.append("")
    return "\n".join(lines)


def write_outputs(entries: Iterable[CourseEntry], output_dir: Path) -> tuple[Path, Path, Path]:
    output_dir.mkdir(parents=True, exist_ok=True)
    entries_list = list(entries)

    json_path = output_dir / "ibm_courses.json"
    json_path.write_text(
        json.dumps([asdict(e) for e in entries_list], indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )

    txt_path = output_dir / "ibm_course_slugs.txt"
    txt_path.write_text(
        "\n".join(e.slug for e in entries_list) + ("\n" if entries_list else ""),
        encoding="utf-8",
    )
    js_path = output_dir / "ibm_courses.js"
    js_path.write_text(render_courses_js(entries_list), encoding="utf-8")
    return json_path, txt_path, js_path


def print_professional_log(entries: list[CourseEntry]) -> None:
    print("=" * 94)
    print("IBM COURSERA DISCOVERY REPORT")
    print("=" * 94)
    print(
        f"Total IBM partner courses discovered: {len(entries)} | Source: {BASE_URL.format(query='ibm')}"
    )
    print("-" * 94)
    for idx, e in enumerate(entries, 1):
        coursera_flag = "YES" if e.is_coursera else "NO"
        print(
            f"[{idx:04d}] COURSE FOUND: {e.title} | partner={e.partner} | slug={e.slug} | is_coursera={coursera_flag}"
        )
    print("-" * 94)
    print("END OF REPORT")
    print("=" * 94)


def update_content_js(content_js: Path, entries: Iterable[CourseEntry]) -> None:
    src = content_js.read_text(encoding="utf-8")
    if AUTOGEN_START not in src or AUTOGEN_END not in src:
        raise RuntimeError("Markers AUTO-GENERATED-IBM-SLUGS not found in content.js")

    slugs = sorted({e.slug for e in entries if e.slug})
    replacement_lines = [f'    "{slug}",' for slug in slugs]
    replacement_block = (
        f"    {AUTOGEN_START}\n"
        + ("\n".join(replacement_lines) + "\n" if replacement_lines else "")
        + f"    {AUTOGEN_END}"
    )

    pattern = re.compile(
        r"\s+// AUTO-GENERATED-IBM-SLUGS-START.*?// AUTO-GENERATED-IBM-SLUGS-END",
        re.DOTALL,
    )
    src = pattern.sub("\n" + replacement_block, src, count=1)
    content_js.write_text(src, encoding="utf-8")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--query", default="ibm", help="Search query for Coursera")
    parser.add_argument("--headless", action="store_true", default=False, help="Run Chrome headless")
    parser.add_argument("--pause-sec", type=float, default=1.25, help="Pause between scrolls")
    parser.add_argument(
        "--no-new-rounds-stop",
        type=int,
        default=4,
        help="Stop after N consecutive rounds with zero new IBM courses",
    )
    parser.add_argument(
        "--max-scroll-rounds",
        type=int,
        default=250,
        help="Hard safety limit for total scroll rounds",
    )
    parser.add_argument(
        "--chrome-binary",
        default="",
        help="Optional explicit Chrome binary path/name (AUR/paru install).",
    )
    parser.add_argument(
        "--output-dir",
        default="data",
        help="Directory to write ibm_courses.json, ibm_course_slugs.txt and ibm_courses.js",
    )
    parser.add_argument(
        "--update-content-js",
        default="",
        help="Optional path to content.js to auto-update slug allowlist markers",
    )
    args = parser.parse_args()

    url = BASE_URL.format(query=quote(args.query))
    driver = build_driver(headless=args.headless, chrome_binary=args.chrome_binary)

    try:
        driver.get(url)
        WebDriverWait(driver, 20).until(
            EC.presence_of_element_located((By.CSS_SELECTOR, COURSE_CARD_SELECTOR))
        )
        entries = scroll_until_no_new_ibm_courses(
            driver,
            pause_sec=args.pause_sec,
            no_new_rounds_stop=args.no_new_rounds_stop,
            max_scroll_rounds=args.max_scroll_rounds,
        )
    except TimeoutException as exc:
        raise SystemExit(f"Timed out waiting for search cards: {exc}") from exc
    finally:
        driver.quit()

    output_dir = Path(args.output_dir)
    print_professional_log(entries)

    json_path, txt_path, js_path = write_outputs(entries, output_dir)
    print(f"Wrote JSON: {json_path}")
    print(f"Wrote TXT : {txt_path}")
    print(f"Wrote JS  : {js_path}")

    if args.update_content_js:
        content_js = Path(args.update_content_js)
        update_content_js(content_js, entries)
        print(f"Updated slug block in: {content_js}")


if __name__ == "__main__":
    main()
