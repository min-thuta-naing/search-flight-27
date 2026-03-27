# -*- coding: utf-8 -*-
"""
FlightsFrom.com Scraper + Fast Cross-check
STRICT DATE + AIRCRAFT (FINAL STABLE VERSION)
With detailed logging for load-more and scrape status
Modified for Docker environment compatibility 
"""

import os
import json
import time
import random
import re
import argparse
import logging
from datetime import date, timedelta, datetime

import pandas as pd
import undetected_chromedriver as uc
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException, StaleElementReferenceException
import shutil

# ================== LOGGING SETUP ==================
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
log = logging.getLogger("FlightsFromScraper")


# ================== CONFIG ==================
AIRPORT = "."
START_DATE = date(2026, 12, 27)
END_DATE   = date(2026, 12, 31)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
USER_DATA_DIR = os.path.join(BASE_DIR, "chrome_profile_uc")
# Ensure outputs go to data/intl_flight_data which is where Node expects them, or a dedicated outputs dir
OUT_DIR = os.path.join(BASE_DIR, "../../data/intl_flight_data")

SLEEP_RANGE = (2.0, 4.0)


# ================== BASIC HELPERS ==================
def ensure_dir():
    os.makedirs(OUT_DIR, exist_ok=True)

def daily_paths(d):
    ensure_dir()
    base = os.path.join(OUT_DIR, f"flightsfrom_{AIRPORT}_{d.isoformat()}")
    return base + ".json", base + ".csv"

def atomic_write_json(path, data):
    tmp = path + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    os.replace(tmp, path)

def atomic_write_csv(path, rows):
    if not rows:
        return
    df = pd.DataFrame(rows)
    prefer = [
        "date","airport","direction","time","destination",
        "flight","airline","airline_source","duration","aircraft",
        "distance","seats","meals","arrival_terminal","codeshare","entertainment",
        "crosscheck_status","crosscheck_reason","crosschecked_at","is_changed",
        "status","reason","page_date_verified"
    ]
    cols = [c for c in prefer if c in df.columns] + [c for c in df.columns if c not in prefer]
    df = df[cols]
    tmp = path + ".tmp"
    df.to_csv(tmp, index=False, encoding="utf-8-sig")
    os.replace(tmp, path)

def random_sleep():
    time.sleep(random.uniform(*SLEEP_RANGE))

def clean_text(s):
    return re.sub(r"\s+", " ", s).strip() if s else ""

def normalize_flight(f):
    return f.replace(" ", "").upper() if f else ""

def extract_airport_code(dest):
    return dest.split()[0].strip().upper() if dest else ""


# ================== AIRLINE ==================
def extract_airline_from_item(item):
    selectors = [
        ".airline-name",
        ".deparr_airline",
        ".hidden_airline",
        "td.airline"
    ]
    for sel in selectors:
        try:
            txt = item.find_element(By.CSS_SELECTOR, sel).text.strip()
            if txt:
                return txt, "text"
        except:
            pass

    try:
        for img in item.find_elements(By.TAG_NAME, "img"):
            alt = img.get_attribute("alt")
            if alt and len(alt.strip()) > 2:
                return alt.strip(), "alt"
    except:
        pass

    return "UNKNOWN", "unknown"

def airline_matches(a1, a2):
    if not a1 or not a2:
        return False
    if a1 == "UNKNOWN" or a2 == "UNKNOWN":
        return False
    return a1 == a2


# ================== UI HELPERS ==================
def click_safe(driver, el, retries=3):
    for _ in range(retries):
        try:
            driver.execute_script(
                "arguments[0].scrollIntoView({block:'center'});", el
            )
            time.sleep(0.1)
            driver.execute_script("arguments[0].click();", el)
            return
        except StaleElementReferenceException:
            time.sleep(0.2)
    raise StaleElementReferenceException("Element stale")

def switch_tab(driver, mode):
    label = "Departures" if mode == "departure" else "Arrivals"
    xpath = f"//button[contains(normalize-space(),'{label}')] | //a[contains(normalize-space(),'{label}')]"
    
    for attempt in range(1, 4):
        try:
            btns = driver.find_elements(By.XPATH, xpath)
            for b in btns:
                if b.is_displayed():
                    is_active = driver.execute_script("return arguments[0].classList.contains('active') || (arguments[0].parentElement && arguments[0].parentElement.classList.contains('active'));", b)
                    if is_active:
                        log.debug(f"Tab {label} is already active")
                        return

                    log.info(f"Switching tab -> {label} (attempt {attempt})")
                    click_safe(driver, b)
                    time.sleep(1.5)
                    
                    if driver.execute_script("return arguments[0].classList.contains('active') || (arguments[0].parentElement && arguments[0].parentElement.classList.contains('active'));", b):
                        return
            
            driver.execute_script("window.scrollTo(0, 0);")
            time.sleep(0.5)
        except Exception as e:
            log.warning(f"Tab switch error: {e}")
    
    log.warning(f"Could not confirm tab switch to {label}")


# ================== LOAD MORE ==================
def load_more_flights(driver, direction, d):
    click_count = 0
    stale_retries = 0
    MAX_STALE_RETRIES = 3 
    show_more_selectors = [
        "//button[contains(text(),'Show more')]",
        "//a[contains(text(),'Show more')]",
        "//button[contains(text(),'SHOW MORE')]",
        "//a[contains(text(),'SHOW MORE')]",
        "//button[contains(@class,'show-more')]",
        "//a[contains(@class,'show-more')]",
    ]

    initial_count = len(driver.find_elements(By.CSS_SELECTOR, "li[class*='deparr']"))
    log.info(f"  [{direction.upper()}] Initial flights loaded: {initial_count}")

    while True:
        btn = None
        for sel in show_more_selectors:
            try:
                elements = driver.find_elements(By.XPATH, sel)
                for el in elements:
                    if el.is_displayed():
                        btn = el
                        break
                if btn:
                    break
            except Exception:
                continue

        if not btn:
            current_count = len(driver.find_elements(By.CSS_SELECTOR, "li[class*='deparr']"))
            break

        try:
            prev_count = len(driver.find_elements(By.CSS_SELECTOR, "li[class*='deparr']"))
            click_safe(driver, btn)
            click_count += 1
            
            start_wait = time.time()
            new_count = prev_count
            while time.time() - start_wait < 6:
                time.sleep(0.5)
                new_count = len(driver.find_elements(By.CSS_SELECTOR, "li[class*='deparr']"))
                if new_count > prev_count:
                    stale_retries = 0 
                    break
            
            loaded = new_count - prev_count
            log.info(
                f"  [{direction.upper()}] Load More #{click_count}: "
                f"+{loaded} flights (total: {new_count})"
            )

            if new_count == prev_count:
                stale_retries += 1
                if stale_retries < MAX_STALE_RETRIES:
                    log.info(f"  [{direction.upper()}] No new flights, retrying click ({stale_retries}/{MAX_STALE_RETRIES})...")
                    time.sleep(1)
                    continue
                log.info(f"  [{direction.upper()}] No new flights loaded after {MAX_STALE_RETRIES} retries, stopping.")
                break

        except Exception as e:
            log.warning(f"  [{direction.upper()}] Load More click #{click_count + 1} failed: {e}")
            break

    return click_count


# ================== STRICT DATE ==================
def page_date_matches(driver, d):
    target = d.strftime("%Y-%m-%d")
    js_check = """
    var allElements = document.querySelectorAll('*');
    for (var i = 0; i < allElements.length; i++) {
        if (allElements[i]._flatpickr) {
            var fp = allElements[i]._flatpickr;
            if (fp.selectedDates && fp.selectedDates.length > 0) {
                var sd = fp.selectedDates[0];
                var y = sd.getFullYear();
                var m = String(sd.getMonth() + 1).padStart(2, '0');
                var day = String(sd.getDate()).padStart(2, '0');
                return y + '-' + m + '-' + day;
            }
        }
    }
    return '';
    """
    try:
        result = driver.execute_script(js_check)
        if result == target:
            return True
    except:
        pass

    expected = d.strftime("%A, %d %B, %Y")
    expected_no_zero = d.strftime("%A, ") + str(d.day) + d.strftime(" %B, %Y")
    try:
        text = driver.find_element(By.TAG_NAME, "body").text
        if expected in text or expected_no_zero in text:
            return True
    except:
        pass
    return False

def _get_calendar_month_year(driver):
    months = [
        "January","February","March","April","May","June",
        "July","August","September","October","November","December"
    ]
    base = ".flatpickr-current-month"

    try:
        cur_month_el = driver.find_element(By.CSS_SELECTOR, f"{base} .cur-month")
        cur_year_el = driver.find_element(By.CSS_SELECTOR, f"{base} .numInput.cur-year")
        cur_month_name = (cur_month_el.text or "").strip()
        cur_year = int(cur_year_el.get_attribute("value") or "0")
        idx = months.index(cur_month_name) + 1 if cur_month_name in months else None
        if idx is not None:
            return (idx, cur_year)
    except Exception:
        pass

    try:
        month_sel = driver.find_element(By.CSS_SELECTOR, f"{base} select")
        year_el = driver.find_element(By.CSS_SELECTOR, f"{base} .cur-year")
        cur_month_idx = int(month_sel.get_attribute("value") or "0") + 1 
        cur_year = int(year_el.get_attribute("value") or "0")
        return (cur_month_idx, cur_year)
    except Exception:
        pass

    return (None, None)


def navigate_calendar_to_month(driver, target_year, target_month):
    months = [
        "January","February","March","April","May","June",
        "July","August","September","October","November","December"
    ]
    max_clicks = 24 

    for _ in range(max_clicks):
        cur_month_idx, cur_year = _get_calendar_month_year(driver)
        if cur_month_idx is None or cur_year is None:
            return False

        if cur_year == target_year and cur_month_idx == target_month:
            return True

        target_val = target_year * 12 + target_month
        cur_val = cur_year * 12 + cur_month_idx

        try:
            if target_val > cur_val:
                arrow = driver.find_element(By.CSS_SELECTOR, ".flatpickr-next-month")
            else:
                arrow = driver.find_element(By.CSS_SELECTOR, ".flatpickr-prev-month")
            click_safe(driver, arrow)
            time.sleep(0.5)
        except Exception as e:
            return False

    return False


def set_date_via_js(driver, d):
    date_str = d.strftime("%Y-%m-%d")
    js_code = f"""
    try {{
        var allElements = document.querySelectorAll('*');
        for (var i = 0; i < allElements.length; i++) {{
            if (allElements[i]._flatpickr) {{
                allElements[i]._flatpickr.setDate('{date_str}', true);
                return 'found_on_element';
            }}
        }}
        if (typeof flatpickr !== 'undefined' && flatpickr.instances) {{
            for (var j = 0; j < flatpickr.instances.length; j++) {{
                flatpickr.instances[j].setDate('{date_str}', true);
                return 'found_global';
            }}
        }}
        var inputs = document.querySelectorAll('input[type="hidden"], input.flatpickr-input');
        for (var k = 0; k < inputs.length; k++) {{
            if (inputs[k]._flatpickr) {{
                inputs[k]._flatpickr.setDate('{date_str}', true);
                return 'found_hidden_input';
            }}
        }}
        return 'not_found';
    }} catch (e) {{
        return 'error: ' + e.message;
    }}
    """
    try:
        result = driver.execute_script(js_code)
        return result and result.startswith('found')
    except Exception as e:
        return False


def wait_for_page_ready(driver, timeout=30):
    try:
        WebDriverWait(driver, timeout).until(
            EC.presence_of_element_located(
                (By.CSS_SELECTOR, "li[class*='deparr']")
            )
        )
        return True
    except TimeoutException:
        return False


def wait_for_flatpickr(driver, timeout=15):
    js_check = """
    var allElements = document.querySelectorAll('*');
    for (var i = 0; i < allElements.length; i++) {
        if (allElements[i]._flatpickr) return true;
    }
    if (typeof flatpickr !== 'undefined' && flatpickr.instances && flatpickr.instances.length > 0) return true;
    return false;
    """
    try:
        WebDriverWait(driver, timeout).until(
            lambda d: d.execute_script(js_check)
        )
        return True
    except TimeoutException:
        return False


def ensure_date_selected(driver, d, max_attempts=3):
    months = [
        "January","February","March","April","May","June",
        "July","August","September","October","November","December"
    ]

    for attempt in range(1, max_attempts + 1):
        if page_date_matches(driver, d):
            return True

        has_fp = wait_for_flatpickr(driver, timeout=10)
        if has_fp and set_date_via_js(driver, d):
            time.sleep(1) 
            if page_date_matches(driver, d):
                return True
            
            driver.execute_script("""
                var allElements = document.querySelectorAll('*');
                for (var i = 0; i < allElements.length; i++) {
                    if (allElements[i]._flatpickr) {
                        var fp = allElements[i]._flatpickr;
                        if (fp.config && fp.config.onChange) {
                            fp.config.onChange.forEach(function(fn) { fn(fp.selectedDates, fp.input.value, fp); });
                        }
                        fp.element.dispatchEvent(new Event('change', {bubbles: true}));
                        break;
                    }
                }
            """)
            time.sleep(1)
            if page_date_matches(driver, d):
                return True

        try:
            driver.execute_script("""
                var allElements = document.querySelectorAll('*');
                for (var i = 0; i < allElements.length; i++) {
                    if (allElements[i]._flatpickr) {
                        allElements[i]._flatpickr.open();
                        break;
                    }
                }
            """)
            time.sleep(1)

            navigate_calendar_to_month(driver, d.year, d.month)
            aria = f"{months[d.month-1]} {d.day}, {d.year}"
            sel = f"span.flatpickr-day[aria-label='{aria}']"
            
            day_el = WebDriverWait(driver, 8).until(
                EC.element_to_be_clickable((By.CSS_SELECTOR, sel))
            )
            driver.execute_script("arguments[0].click();", day_el)
            time.sleep(1)

            if page_date_matches(driver, d):
                return True

        except Exception as e:
            pass

        if attempt < max_attempts:
            driver.get(f"https://www.flightsfrom.com/{AIRPORT}")
            time.sleep(3)

    return False


# ================== SCRAPE ==================
def perform_hard_recovery(driver, direction, d):
    target_url = f"https://www.flightsfrom.com/{AIRPORT}?from={AIRPORT}&entityType=departures&take=1000&selectedDate={d}"
    driver.get(target_url)
    time.sleep(8)
    
    switch_tab(driver, direction)
    ensure_date_selected(driver, d)
    
    load_more_flights(driver, direction, d)
    return driver.find_elements(By.CSS_SELECTOR, "li[class*='deparr']")


def scrape_current_view(driver, direction, d):
    out = []

    try:
        WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.CSS_SELECTOR, "li[class*='deparr']"))
        )
    except TimeoutException:
        time.sleep(2)
        items = driver.find_elements(By.CSS_SELECTOR, "li[class*='deparr']")
        if not items:
            return out

    load_more_flights(driver, direction, d)

    items = driver.find_elements(By.CSS_SELECTOR, "li[class*='deparr']")
    total_items = len(items)

    skipped = 0
    idx = 1
    recovery_count = 0
    while idx <= total_items:
        try:
            current_items = driver.find_elements(By.CSS_SELECTOR, "li[class*='deparr']")
            
            if len(current_items) < idx:
                driver.execute_script("window.scrollTo(0, document.body.scrollHeight);")
                time.sleep(1.5)
                current_items = driver.find_elements(By.CSS_SELECTOR, "li[class*='deparr']")

                if len(current_items) < idx:
                    if recovery_count < 2:
                        current_items = perform_hard_recovery(driver, direction, d)
                        recovery_count += 1
                        if len(current_items) < idx:
                            idx += 1
                            skipped += 1
                            continue
                    else:
                        idx += 1
                        skipped += 1
                        continue
            
            item = current_items[idx-1]

            def safe(el, sel):
                try:
                    return el.find_element(By.CSS_SELECTOR, sel).text.strip()
                except:
                    return ""

            flight = safe(item, ".deparr_flight")
            if not flight:
                skipped += 1
                continue

            raw_time = safe(item, ".deparr_time")
            raw_dest = safe(item, ".deparr_country")
            raw_dur  = safe(item, ".deparr_duration")

            airline, airline_source = extract_airline_from_item(item)

            out.append({
                "date": d.isoformat(),
                "airport": AIRPORT,
                "direction": direction,
                "time": clean_text(raw_time),
                "flight": clean_text(flight),
                "airline": airline,
                "airline_source": airline_source,
                "destination": clean_text(raw_dest),
                "duration": clean_text(raw_dur),
                "aircraft": "",
                "distance": "",
                "seats": "",
                "meals": "",
                "arrival_terminal": "",
                "codeshare": "",
                "entertainment": "",
                "scraped_at": datetime.now().isoformat(),
                "page_date_verified": True
            })
            
            if idx % 25 == 0:
                time.sleep(1.0)

        except Exception as e:
            skipped += 1
        
        idx += 1

    return out



# ================= LIVE SCRAPE ONLY =================
def scrape_day_flights(driver, d, airport=AIRPORT):
    """
    Output: Only the freshly scraped flights.
    """
    ensure_dir()
    out_json = os.path.join(OUT_DIR, f"flightsfrom_{airport}_{d.isoformat()}_live.json")

    print(f"[SCRAPE] Live scraping {airport} {d}")
    target_url = f"https://www.flightsfrom.com/{airport}?from={airport}&entityType=departures&take=1000&selectedDate={d}"
    driver.get(target_url)
    time.sleep(5)

    # --- DEPARTURE ---
    switch_tab(driver, "departure")
    if not ensure_date_selected(driver, d):
        print("[SCRAPE] Date select failed (departure)")
        return

    dep = scrape_current_view(driver, "departure", d)

    # --- ARRIVAL ---
    switch_tab(driver, "arrival")
    arr = scrape_current_view(driver, "arrival", d)

    results = dep + arr

    # ================= SORT =================
    def parse_time(t):
        try:
            return datetime.strptime(t, "%H:%M").time()
        except:
            return datetime.strptime("23:59", "%H:%M").time()

    def direction_order(direction_val):
        return 0 if direction_val == "departure" else 1

    results.sort(
        key=lambda r: (
            direction_order(r.get("direction")),
            parse_time(r.get("time"))
        )
    )

    # ================= SAVE =================
    atomic_write_json(out_json, results)
    print(f"[SCRAPE DONE] Saved {len(results)} flights to {out_json}")


def wait_for_new_flight_data(driver, old_first_flight, timeout=10):
    if not old_first_flight:
        time.sleep(2)  
        return

    start_time = time.time()
    seen_empty = False
    
    while time.time() - start_time < timeout:
        try:
            items = driver.find_elements(By.CSS_SELECTOR, "li[class*='deparr']")
            
            if not items:
                seen_empty = True
                time.sleep(0.5)
                continue

            try:
                body_text = driver.find_element(By.TAG_NAME, "body").text
                is_correct_tab = "Arrivals" in body_text if "arrival" in str(driver.current_url).lower() or seen_empty else True

                txt = items[0].find_element(By.CSS_SELECTOR, ".deparr_flight").text.strip()
                new_flight = clean_text(txt)
                
                if (seen_empty or new_flight != old_first_flight) and is_correct_tab:
                    time.sleep(1)
                    return
            except Exception:
                pass
                
        except Exception:
            pass
            
        time.sleep(0.5)


# ================== MAIN ==================
def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--crosscheck", help="YYYY-MM-DD")
    parser.add_argument("--airport", help="Airport exact abbreviation (e.g. SYD, CHC)")
    parser.add_argument("--range", help="Start:End date (e.g. 2026-02-10:2026-03-01)")
    parser.add_argument("--worker-id", help="Unique ID for parallel workers to avoid profile conflicts")
    parser.add_argument("--force", action="store_true", help="Overwrite existing files even if they already exist")
    args = parser.parse_args()

    global START_DATE, END_DATE, AIRPORT
    if args.airport:
        AIRPORT = args.airport.upper()
        log.info(f"Overridden Airport: {AIRPORT}")

    if args.range:
        parts = args.range.split(":")
        if len(parts) == 2:
            START_DATE = date.fromisoformat(parts[0])
            END_DATE = date.fromisoformat(parts[1])
            log.info(f"Overridden date range: {START_DATE} -> {END_DATE}")

    global USER_DATA_DIR
    driver_exe_path = None
    if args.worker_id:
        USER_DATA_DIR = f"{USER_DATA_DIR}_{args.worker_id}"
        log.info(f"Using unique profile: {USER_DATA_DIR}")
        uc_data = os.path.join(os.environ.get('APPDATA', '/tmp'), 'undetected_chromedriver')
        original_exe = os.path.join(uc_data, 'undetected_chromedriver.exe' if os.name == 'nt' else 'undetected_chromedriver')
        worker_exe = os.path.join(uc_data, f'chromedriver_worker_{args.worker_id}')
        if os.path.exists(original_exe):
            try:
                shutil.copy2(original_exe, worker_exe)
                driver_exe_path = worker_exe
            except Exception as e:
                pass
    
    options = uc.ChromeOptions()
    options.add_argument(f"--user-data-dir={USER_DATA_DIR}")
    options.add_argument("--window-size=1920,1080")
    
    # Resource Blocking for Speed (Images Only for stability)
    prefs = {
        "profile.managed_default_content_settings.images": 2,
    }
    options.add_experimental_option("prefs", prefs)
    
    # Crucial for Docker headless environment
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")
    options.add_argument("--disable-gpu")
    
    # Point to Chromium binary since Google Chrome is not natively available on arm64 linux
    if os.path.exists("/usr/bin/chromium"):
        options.binary_location = "/usr/bin/chromium"
    elif os.path.exists("/usr/bin/chromium-browser"):
        options.binary_location = "/usr/bin/chromium-browser"

    # Force using the arm64 chromedriver we installed via apt-get
    if not driver_exe_path and os.path.exists("/usr/bin/chromedriver"):
        try:
            writeable_path = "/tmp/chromedriver_patched"
            if not os.path.exists(writeable_path):
                shutil.copy2("/usr/bin/chromedriver", writeable_path)
            driver_exe_path = writeable_path
        except Exception as e:
            log.warning(f"Failed to copy chromedriver to /tmp: {e}")
            driver_exe_path = "/usr/bin/chromedriver"

    try:
        if driver_exe_path:
            driver = uc.Chrome(options=options, driver_executable_path=driver_exe_path)
        else:
            driver = uc.Chrome(options=options)
    except Exception as e:
        log.error(f"Failed starting chrome driver: {e}")
        return

    try:
        if args.crosscheck:
            scrape_day_flights(driver, datetime.fromisoformat(args.crosscheck).date(), AIRPORT)
            return

        total_days = (END_DATE - START_DATE).days + 1
        
        target_url = f"https://www.flightsfrom.com/{AIRPORT}?from={AIRPORT}&entityType=departures&take=1000&selectedDate={START_DATE}"
        driver.get(target_url)
        time.sleep(10) 

        completed = 0
        skipped = 0
        already_done = 0
        total_dep = 0
        total_arr = 0
        start_time = time.time()

        d = START_DATE
        while d <= END_DATE:
            j, c = daily_paths(d)
            if os.path.exists(j) and not args.force:
                already_done += 1
                d += timedelta(days=1)
                continue
            
            switch_tab(driver, "departure")
            ok = ensure_date_selected(driver, d)
            if not ok:
                skipped += 1
                d += timedelta(days=1)
                continue

            dep = scrape_current_view(driver, "departure", d)
            last_dep_flight = dep[0].get("flight", "") if dep else ""

            switch_tab(driver, "arrival")
            wait_for_new_flight_data(driver, last_dep_flight)
            arr = scrape_current_view(driver, "arrival", d)

            atomic_write_json(j, dep + arr)
            atomic_write_csv(c, dep + arr)

            completed += 1
            random_sleep()
            d += timedelta(days=1)

    finally:
        driver.quit()

if __name__ == "__main__":
    main()
