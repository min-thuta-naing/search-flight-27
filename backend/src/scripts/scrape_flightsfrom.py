# -*- coding: utf-8 -*-
"""
FlightsFrom.com Scraper + Fast Cross-check
STRICT DATE + AIRCRAFT (FINAL STABLE VERSION)
With detailed logging for load-more and scrape status
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
AIRPORT = "RGN"
START_DATE = date(2026, 12, 1)
END_DATE   = date(2026, 12, 3)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
USER_DATA_DIR = os.path.join(BASE_DIR, "chrome_profile_uc")
OUT_DIR = os.path.join(BASE_DIR, "flightsfrom_outputs")

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
        "crosscheck_found","airline_match",
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
# ================== UI HELPERS ==================
def click_safe(driver, el, retries=3):
    for _ in range(retries):
        try:
            driver.execute_script(
                "arguments[0].scrollIntoView({block:'center'});", el
            )
            # Reduced sleep from 0.3 -> 0.1
            time.sleep(0.1)
            driver.execute_script("arguments[0].click();", el)
            return
        except StaleElementReferenceException:
            time.sleep(0.2)
    raise StaleElementReferenceException("Element stale")

def switch_tab(driver, mode):
    label = "Departures" if mode == "departure" else "Arrivals"
    # More robust xpath for the tab buttons
    xpath = f"//button[contains(normalize-space(),'{label}')] | //a[contains(normalize-space(),'{label}')]"
    
    for attempt in range(1, 4):
        try:
            btns = driver.find_elements(By.XPATH, xpath)
            for b in btns:
                if b.is_displayed():
                    # Check if already active (often has 'active' class on button or parent)
                    is_active = driver.execute_script("return arguments[0].classList.contains('active') || (arguments[0].parentElement && arguments[0].parentElement.classList.contains('active'));", b)
                    if is_active:
                        log.debug(f"Tab {label} is already active")
                        return

                    log.info(f"Switching tab -> {label} (attempt {attempt})")
                    click_safe(driver, b)
                    time.sleep(1.5)
                    
                    # Verify switch
                    if driver.execute_script("return arguments[0].classList.contains('active') || (arguments[0].parentElement && arguments[0].parentElement.classList.contains('active'));", b):
                        return
            
            # If not found or not active, try a small scroll or click via JS directly
            driver.execute_script("window.scrollTo(0, 0);")
            time.sleep(0.5)
        except Exception as e:
            log.warning(f"Tab switch error: {e}")
    
    log.warning(f"Could not confirm tab switch to {label}")


# ================== LOAD MORE ==================
def load_more_flights(driver, direction, d):
    """
    Click 'Show more' button repeatedly until all flights are loaded.
    Logs each click with current flight count.
    """
    click_count = 0
    stale_retries = 0
    MAX_STALE_RETRIES = 3  # Retry if click didn't load new flights but button still there
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
            
            # Wait up to 6s for new flights to appear (longer for parallel execution)
            start_wait = time.time()
            new_count = prev_count
            while time.time() - start_wait < 6:
                time.sleep(0.5)
                new_count = len(driver.find_elements(By.CSS_SELECTOR, "li[class*='deparr']"))
                if new_count > prev_count:
                    stale_retries = 0  # Reset retry counter on success
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
    """Check the flatpickr's selected date directly via JS."""
    target = d.strftime("%Y-%m-%d")
    
    # METHOD 1: Read flatpickr selected date via JS
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

    # METHOD 2: Check page body text (broader but less precise)
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
    """
    Get current month (1-12) and year from flatpickr.
    Supports two layouts: .cur-month text + .numInput.cur-year, or select + .cur-year.
    Returns (cur_month_1based, cur_year) or (None, None) on failure.
    """
    months = [
        "January","February","March","April","May","June",
        "July","August","September","October","November","December"
    ]
    base = ".flatpickr-current-month"

    # Variant A: span.cur-month (text) + input.numInput.cur-year
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

    # Variant B: select (value 0-11) + .cur-year
    try:
        month_sel = driver.find_element(By.CSS_SELECTOR, f"{base} select")
        year_el = driver.find_element(By.CSS_SELECTOR, f"{base} .cur-year")
        cur_month_idx = int(month_sel.get_attribute("value") or "0") + 1  # 0-11 -> 1-12
        cur_year = int(year_el.get_attribute("value") or "0")
        return (cur_month_idx, cur_year)
    except Exception:
        pass

    return (None, None)


def navigate_calendar_to_month(driver, target_year, target_month):
    """
    Navigate flatpickr calendar to the correct month/year using arrow buttons.
    Works with both .cur-month text and select-based month pickers.
    """
    months = [
        "January","February","March","April","May","June",
        "July","August","September","October","November","December"
    ]
    max_clicks = 24  # safety limit

    for _ in range(max_clicks):
        cur_month_idx, cur_year = _get_calendar_month_year(driver)
        if cur_month_idx is None or cur_year is None:
            log.warning("    Calendar navigation: could not read current month/year")
            return False

        if cur_year == target_year and cur_month_idx == target_month:
            log.debug(f"    Calendar already on {months[cur_month_idx-1]} {cur_year}")
            return True

        target_val = target_year * 12 + target_month
        cur_val = cur_year * 12 + cur_month_idx

        try:
            if target_val > cur_val:
                arrow = driver.find_element(By.CSS_SELECTOR, ".flatpickr-next-month")
                log.debug(f"    Calendar: next -> {months[target_month-1]} {target_year}")
            else:
                arrow = driver.find_element(By.CSS_SELECTOR, ".flatpickr-prev-month")
                log.debug(f"    Calendar: prev -> {months[target_month-1]} {target_year}")
            click_safe(driver, arrow)
            time.sleep(0.5)
        except Exception as e:
            log.warning(f"    Calendar navigation error (arrow): {e}")
            return False

    log.warning("    Calendar navigation: max clicks reached")
    return False


def set_date_via_js(driver, d):
    """
    Scan ALL DOM elements for _flatpickr instance and call setDate().
    """
    date_str = d.strftime("%Y-%m-%d")
    js_code = f"""
    try {{
        // METHOD 1: Scan ALL elements for _flatpickr
        var allElements = document.querySelectorAll('*');
        for (var i = 0; i < allElements.length; i++) {{
            if (allElements[i]._flatpickr) {{
                allElements[i]._flatpickr.setDate('{date_str}', true);
                return 'found_on_element';
            }}
        }}
        
        // METHOD 2: Check global flatpickr instances
        if (typeof flatpickr !== 'undefined' && flatpickr.instances) {{
            for (var j = 0; j < flatpickr.instances.length; j++) {{
                flatpickr.instances[j].setDate('{date_str}', true);
                return 'found_global';
            }}
        }}
        
        // METHOD 3: Try triggering date via hidden input
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
        log.info(f"    JS setDate result: {result}")
        return result and result.startswith('found')
    except Exception as e:
        log.warning(f"    JS setDate exception: {e}")
        return False


def wait_for_page_ready(driver, timeout=30):
    """
    Wait for the FlightsFrom page to fully load.
    Returns True if page is ready, False if timeout.
    """
    try:
        # Wait for flight list items to appear — this means data has loaded
        WebDriverWait(driver, timeout).until(
            EC.presence_of_element_located(
                (By.CSS_SELECTOR, "li[class*='deparr']")
            )
        )
        log.debug("  Page ready: flight items found")
        return True
    except TimeoutException:
        log.warning(f"  Page not ready after {timeout}s")
        return False


def wait_for_flatpickr(driver, timeout=15):
    """
    Wait for flatpickr JS to be initialized on the page.
    Returns True once flatpickr is found.
    """
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
        log.debug("  Flatpickr found on page")
        return True
    except TimeoutException:
        log.warning(f"  Flatpickr not found after {timeout}s")
        return False


def ensure_date_selected(driver, d, max_attempts=3):
    """
    Robust date selection with retry loop.
    JS method is primary. UI calendar is fallback.
    """
    months = [
        "January","February","March","April","May","June",
        "July","August","September","October","November","December"
    ]

    for attempt in range(1, max_attempts + 1):
        log.info(f"  Selecting date: {d} (attempt {attempt}/{max_attempts})")

        # --- Already correct? ---
        if page_date_matches(driver, d):
            log.info(f"  ✓ Date already matches: {d}")
            return True

        # --- METHOD 1: JS Injection ---
        has_fp = wait_for_flatpickr(driver, timeout=10)
        if has_fp and set_date_via_js(driver, d):
            time.sleep(3)  # Wait for page data to reload after date change
            if page_date_matches(driver, d):
                log.info(f"  ✓ Date selected (via JS): {d}")
                return True
            log.warning(f"    JS setDate OK but page_date_matches failed — trying to trigger page update...")
            
            # Sometimes JS sets the date but page doesn't reload data
            # Try triggering the change event manually
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
            time.sleep(3)
            if page_date_matches(driver, d):
                log.info(f"  ✓ Date selected (via JS + manual trigger): {d}")
                return True

        # --- METHOD 2: UI Calendar (open via JS, then click day) ---
        try:
            # Open the calendar via JS (find any flatpickr and call open())
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

            # Navigate to the correct month
            navigate_calendar_to_month(driver, d.year, d.month)

            # Click the day
            aria = f"{months[d.month-1]} {d.day}, {d.year}"
            sel = f"span.flatpickr-day[aria-label='{aria}']"
            
            day_el = WebDriverWait(driver, 8).until(
                EC.element_to_be_clickable((By.CSS_SELECTOR, sel))
            )
            driver.execute_script("arguments[0].click();", day_el)
            time.sleep(3)

            if page_date_matches(driver, d):
                log.info(f"  ✓ Date selected (via UI): {d}")
                return True
            log.warning(f"    UI click done but page didn't update")

        except Exception as e:
            log.warning(f"    UI method failed: {type(e).__name__}")

        # --- Retry: reload page ---
        if attempt < max_attempts:
            log.info(f"    Reloading page for retry...")
            driver.get(f"https://www.flightsfrom.com/{AIRPORT}")
            time.sleep(8)

    log.error(f"  ✗ FAILED to select date {d} after {max_attempts} attempts")
    return False


# ================== SCRAPE ==================
def perform_hard_recovery(driver, direction, d):
    """Re-navigates and re-initializes page state if everything breaks."""
    log.warning(f"  [{direction.upper()}] Performing Hard Refresh Recovery...")
    target_url = f"https://www.flightsfrom.com/{AIRPORT}?from={AIRPORT}&entityType=departures&take=250&selectedDate={d}"
    driver.get(target_url)
    time.sleep(8)
    
    # Re-select tab and date
    switch_tab(driver, direction)
    ensure_date_selected(driver, d)
    
    # Reload flight list
    load_more_flights(driver, direction, d)
    return driver.find_elements(By.CSS_SELECTOR, "li[class*='deparr']")


def extract_detail_from_popup(driver, item, flight_text, idx, total, direction):
    """Click a flight item to open popup, extract aircraft + extra detail, then close."""
    details = {
        "aircraft": "",
        "distance": "",
        "seats": "",
        "meals": "",
        "arrival_terminal": "",
        "codeshare": "",
        "entertainment": ""
    }
    
    # Known labels to avoid picking them up as values when a field is empty
    all_labels = [
        "Distance", "Flight time", "Arrival terminal", "Departure terminal",
        "Aircraft", "Seats", "Codeshare", "Entertainment", "Meals"
    ]

    try:
        # Fast click
        click_safe(driver, item)
        time.sleep(0.5)

        # Helper to extract by label
        def get_value_by_label(label_text):
            try:
                # Find the label element
                label = driver.find_element(
                    By.XPATH, f"//*[normalize-space()='{label_text}']"
                )
                # Get the immediate sibling
                sibling = label.find_element(By.XPATH, "following-sibling::*[1]")
                txt = sibling.text.strip()
                
                # If the sibling's text starts with one of our known labels, 
                # it means the value for the current label is likely empty 
                # and we've jumped to the next row's label.
                first_line = txt.split('\n')[0].strip()
                if first_line in all_labels:
                    return ""
                
                return txt
            except:
                return ""

        details["aircraft"] = get_value_by_label("Aircraft")
        details["distance"] = get_value_by_label("Distance")
        details["seats"] = get_value_by_label("Seats")
        details["meals"] = get_value_by_label("Meals")
        
        # Try Arrival terminal, then fallback to Departure terminal
        term = get_value_by_label("Arrival terminal")
        if not term:
            term = get_value_by_label("Departure terminal")
        details["arrival_terminal"] = term
        
        details["codeshare"] = get_value_by_label("Codeshare")
        details["entertainment"] = get_value_by_label("Entertainment")

    except Exception:
        pass

    finally:
        # Close popup FAST
        try:
            # Try JS close first (instant)
            driver.execute_script("""
                var btns = document.querySelectorAll('button.close, .modal-close, .popup-close, .btn-close');
                for(var i=0; i<btns.length; i++) { 
                    if(btns[i].offsetParent !== null) btns[i].click(); 
                }
            """)
            # Extra safety: hit ESC key
            from selenium.webdriver.common.keys import Keys
            driver.switch_to.active_element.send_keys(Keys.ESCAPE)
            time.sleep(0.3)
        except:
            pass

    return details


def fetch_via_api(driver, airport, direction, d):
    """
    Uses the internal API to fetch flights for a specific airport, direction, and date.
    Returns a list of ScrapedFlight-like dictionaries.
    """
    entity_type = "departures" if direction == "departure" else "arrivals"
    date_str = d.isoformat()
    
    # Construct the internal API URL
    api_url = (
        f"https://www.flightsfrom.com/api/airport/{airport}?"
        f"from={airport}&entityType={entity_type}&take=1000&"
        f"sorting=departure-time&sortingDirection=asc&selectedDate={date_str}&"
        f"dateMethod=day&dateFrom={date_str}&dateTo={date_str}"
    )
    
    # Ensure we are on a valid domain page to have the right context/cookies
    target_domain_url = f"https://www.flightsfrom.com/{airport}"
    # current_url might have query params, so check if domain part is in it
    if f"flightsfrom.com/{airport}" not in driver.current_url:
        log.info(f"  [{direction.upper()}] Navigating to domain page for context: {target_domain_url}")
        driver.get(target_domain_url)
        time.sleep(5)
    
    log.info(f"  [{direction.upper()}] Fetching API via JS: {api_url}")
    
    try:
        # Fetch the JSON using the browser's own fetch mechanism to bypass bot detection
        js_script = f"""
        var callback = arguments[arguments.length - 1];
        fetch("{api_url}")
            .then(response => response.text())
            .then(data => callback(data))
            .catch(err => callback("ERROR: " + err));
        """
        driver.set_script_timeout(30)
        raw_response = driver.execute_async_script(js_script)
        
        if raw_response.startswith("ERROR:"):
            log.error(f"  [{direction.upper()}] JS Fetch failed: {raw_response}")
            return []
            
        data = json.loads(raw_response)
        resp = data.get("response") or {}
        sched = resp.get("schedule") or {}
        results = sched.get("result") or []

        if not results:
            log.warning(f"  [{direction.upper()}] No flights found in API response for {date_str}")
            return []
            
        out = []
        for r in results:
            carrier = r.get("carrier", "")
            fnum = r.get("flightnumber", "")
            flight = f"{carrier}{fnum}".strip()
            
            # Destination/Origin airport code
            other_airport = r.get("iata_to") if direction == "departure" else r.get("iata_from")
            
            # Format duration to "Xh Ym" for consistency with Node parser
            elapsed = r.get("elapsed_time", 0)
            h = elapsed // 60
            m = elapsed % 60
            duration_str = f"{h}h {m}m"
            
            # Use arrival_time for arrivals at our airport, departure_time for departures
            raw_time = r.get("arrival_time") if direction == "arrival" else r.get("departure_time")
            # API returns HH:mm:ss for arrival_time, but system expects HH:mm
            formatted_time = raw_time[:5] if raw_time and len(raw_time) >= 5 else (raw_time or "")
            
            # Safe nested access for nested objects
            airline_data = r.get("airline") or {}
            # For departures, 'airport' is the destination. For arrivals, 'departure_airport' is the origin.
            target_airport_obj = r.get("airport") if direction == "departure" else r.get("departure_airport")
            airport_data = target_airport_obj or {}
            aircraft_data = r.get("aircraft") or {}

            out.append({
                "date": date_str,
                "airport": airport,
                "direction": direction,
                "time": formatted_time,
                "flight": flight,
                "airline": airline_data.get("shortname") or airline_data.get("name", ""),
                "airline_source": "text",
                "destination": f"{other_airport} {airport_data.get('city_name', '')}".strip(),
                "duration": duration_str,
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
            
        log.info(f"  [{direction.upper()}] API successfully fetched {len(out)} flights")
        return out
        
    except Exception as e:
        log.error(f"  [{direction.upper()}] API fetch failed: {e}")
        return []


def scrape_day_flights(driver, d, airport=AIRPORT):
    """
    Attempts to fetch data via API first (fast), falls back to UI scraping if needed.
    """
    ensure_dir()
    out_json, out_csv = daily_paths(d)

    log.info(f"[SCRAPE] Starting fetch for {airport} on {d}")
    
    # Try API first
    dep = fetch_via_api(driver, airport, "departure", d)
    arr = fetch_via_api(driver, airport, "arrival", d)
    
    if not dep and not arr:
        log.warning("[SCRAPE] API returned no data. Falling back to UI scraping (SLOW)...")
        # Ensure we are on the right page for UI scraping
        target_url = f"https://www.flightsfrom.com/{airport}?from={airport}&entityType=departures&take=1000&selectedDate={d}"
        if target_url not in driver.current_url:
            driver.get(target_url)
            time.sleep(5)

        switch_tab(driver, "departure")
        if not ensure_date_selected(driver, d):
            log.error(f"  [UI FALLBACK] Date select failed for {d}")
            return [], []

        dep = scrape_current_view(driver, "departure", d)

        switch_tab(driver, "arrival")
        # Capture first flight of Departure to compare against Arrival to prevent stale data
        last_dep_flight = dep[0].get("flight", "") if dep else ""
        wait_for_new_flight_data(driver, last_dep_flight)
        
        arr = scrape_current_view(driver, "arrival", d)

    results = dep + arr

    # ================= SORT =================
    def parse_time_local(t):
        try:
            return datetime.strptime(t, "%H:%M").time()
        except:
            return datetime.strptime("23:59", "%H:%M").time()

    def direction_order(direction_val):
        return 0 if direction_val == "departure" else 1

    results.sort(
        key=lambda r: (
            direction_order(r.get("direction")),
            parse_time_local(r.get("time"))
        )
    )

    # ================= SAVE =================
    atomic_write_json(out_json, results)
    atomic_write_csv(out_csv, results)
    log.info(f"[SCRAPE DONE] Saved {len(results)} flights to {out_json}")
    
    return dep, arr


def scrape_current_view(driver, direction, d):
    out = []

    try:
        WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.CSS_SELECTOR, "li[class*='deparr']"))
        )
    except TimeoutException:
        # Check if we should wait a bit longer for arrivals/departures if page is still "blank"
        # but the loader might be active.
        log.warning(f"  [{direction.upper()}] No flight items found on page for {d} (initial check)")
        time.sleep(2)
        items = driver.find_elements(By.CSS_SELECTOR, "li[class*='deparr']")
        if not items:
            return out

    # Load all flights first
    load_more_flights(driver, direction, d)

    items = driver.find_elements(By.CSS_SELECTOR, "li[class*='deparr']")
    total_items = len(items)
    log.info(f"  [{direction.upper()}] Scraping {total_items} flight items...")

    skipped = 0
    aircraft_found = 0

    # Use index-based loop and re-fetch elements to avoid StaleElementReferenceException
    idx = 1
    recovery_count = 0
    while idx <= total_items:
        try:
            # Re-fetch items every time because popup closing/scrolling can make them stale
            current_items = driver.find_elements(By.CSS_SELECTOR, "li[class*='deparr']")
            
            # RECOVERY: If list shrunk, try simple scroll first
            if len(current_items) < idx:
                log.warning(f"  [{direction.upper()}] List shrunk ({len(current_items)} < {idx}). Scrolling...")
                driver.execute_script("window.scrollTo(0, document.body.scrollHeight);")
                time.sleep(1.5)
                current_items = driver.find_elements(By.CSS_SELECTOR, "li[class*='deparr']")

                # If STILL shrunk or empty, perform HARD recovery
                if len(current_items) < idx:
                    if recovery_count < 2:
                        log.error(f"  [{direction.upper()}] Item {idx} missing. Triggering Hard Recovery #{recovery_count+1}")
                        current_items = perform_hard_recovery(driver, direction, d)
                        recovery_count += 1
                        # If still nothing, skip this one
                        if len(current_items) < idx:
                            idx += 1
                            skipped += 1
                            continue
                    else:
                        log.error(f"  [{direction.upper()}] Hard recovery failed twice at item {idx}. Skipping.")
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

            # --- EXTRACT LIST DATA FIRST (before popup interaction) ---
            # Extracting these now prevents them from failing if the element becomes stale
            # after the popup opens/closes.
            raw_time = safe(item, ".deparr_time")
            raw_dest = safe(item, ".deparr_country")
            raw_dur  = safe(item, ".deparr_duration")

            airline, airline_source = extract_airline_from_item(item)

            # Skip detail extraction via popup as requested to improve stability
            # details = extract_detail_from_popup(
            #     driver, item, clean_text(flight), idx, total_items, direction
            # )
            # if details.get("aircraft"):
            #     aircraft_found += 1

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
            
            # Stabilization pause every 25 items
            if idx % 25 == 0:
                log.info(f"  [{direction.upper()}] Stabilization pause (processed {idx} items)...")
                time.sleep(3.5)

        except Exception as e:
            log.debug(f"  [{direction.upper()}] Error scraping item {idx}: {e}")
            skipped += 1
        
        idx += 1

    if skipped:
        log.info(f"  [{direction.upper()}] Skipped {skipped} items (no flight number or error)")
    log.info(
        f"  [{direction.upper()}] Extracted {len(out)} flights successfully"
    )

    return out


# ================== AIRCRAFT DETAIL ==================
def get_aircraft_from_detail(driver, flight_no):
    flight_no = normalize_flight(flight_no)
    details = {
        "aircraft": "",
        "distance": "",
        "seats": "",
        "meals": "",
        "arrival_terminal": "",
        "codeshare": "",
        "entertainment": ""
    }
    
    all_labels = [
        "Distance", "Flight time", "Arrival terminal", "Departure terminal",
        "Aircraft", "Seats", "Codeshare", "Entertainment", "Meals"
    ]

    rows = driver.find_elements(By.CSS_SELECTOR, "li[class*='deparr']")
    target = None

    for r in rows:
        try:
            if normalize_flight(
                r.find_element(By.CSS_SELECTOR, ".deparr_flight").text
            ) == flight_no:
                target = r
                break
        except:
            continue

    if not target:
        return details

    try:
        click_safe(driver, target)
        time.sleep(2)

        def get_value_by_label(label_text):
            try:
                label = driver.find_element(
                    By.XPATH, f"//*[normalize-space()='{label_text}']"
                )
                sibling = label.find_element(By.XPATH, "following-sibling::*[1]")
                txt = sibling.text.strip()
                
                first_line = txt.split('\n')[0].strip()
                if first_line in all_labels:
                    return ""
                
                return txt
            except:
                return ""

        details["aircraft"] = get_value_by_label("Aircraft")
        details["distance"] = get_value_by_label("Distance")
        details["seats"] = get_value_by_label("Seats")
        details["meals"] = get_value_by_label("Meals")
        
        term = get_value_by_label("Arrival terminal")
        if not term:
            term = get_value_by_label("Departure terminal")
        details["arrival_terminal"] = term
        
        details["codeshare"] = get_value_by_label("Codeshare")
        details["entertainment"] = get_value_by_label("Entertainment")

    except:
        pass

    finally:
        try:
            close_btn = driver.find_element(
                By.XPATH, "//button[contains(text(),'Close')]"
            )
            click_safe(driver, close_btn)
            time.sleep(1)
        except:
            driver.back()
            time.sleep(1)

    return details


# ================== CROSS-CHECK ==================
def crosscheck_day(driver, d, airport=AIRPORT):
    """
    Output:
    - NEW
    - MISSING
    - UPDATED
    - UNCHANGED
    """

    j, c = daily_paths(d)

    # ================= OLD (SNAPSHOT) =================
    if os.path.exists(j):
        with open(j, "r", encoding="utf-8") as f:
            old_rows = json.load(f)
    elif os.path.exists(c):
        old_rows = pd.read_csv(c, keep_default_na=False).to_dict("records")
    else:
        print("[CROSSCHECK] No snapshot file")
        return

    def make_key(r):
        return (
            normalize_flight(r.get("flight")),
            r.get("direction"),
        )

    old_map = {make_key(r): r for r in old_rows}

    # ================= NEW (LIVE SCRAPE) =================
    print(f"[CROSSCHECK] Live scraping {airport} {d}")

    dep, arr = scrape_day_flights(driver, d, airport)
    if not dep and not arr:
        print(f"[CROSSCHECK] Failed to fetch data for {airport} on {d}")
        return

    new_rows = dep + arr
    new_map = {make_key(r): r for r in new_rows}

    # ================= COMPARE =================
    results = []

    all_keys = set(old_map.keys()) | set(new_map.keys())

    for k in all_keys:
        old = old_map.get(k)
        new = new_map.get(k)

        if old and not new:
            status = "MISSING"
            reason = "flight_removed"

        elif not old and new:
            status = "NEW"
            reason = "new_flight_added"

        else:
            changed_fields = []

            for field in ["time", "destination", "airline", "duration"]:
                old_val = clean_text(old.get(field))
                new_val = clean_text(new.get(field))

                if old_val != new_val:
                    changed_fields.append(field)

            if changed_fields:
                status = "UPDATED"
                reason = ",".join(changed_fields)
            else:
                status = "UNCHANGED"
                reason = "same"

        row = new.copy() if new else old.copy()

        row["crosscheck_status"] = status
        row["crosscheck_reason"] = reason
        row["crosschecked_at"] = datetime.now().isoformat()

        # optional (เผื่อ dashboard)
        row["is_changed"] = status in ["NEW", "MISSING", "UPDATED"]

        results.append(row)

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
    out_json = j.replace(".json", "_crosscheck.json")
    out_csv  = c.replace(".csv", "_crosscheck.csv")

    atomic_write_json(out_json, results)
    atomic_write_csv(out_csv, results)

    print(f"[CROSSCHECK DONE] {len(results)} rows")

    # กลับหน้า airport หลัก
    driver.get(f"https://www.flightsfrom.com/{airport}")
    time.sleep(5)


# ================== STALE DATA CHECK ==================
def wait_for_new_flight_data(driver, old_first_flight, timeout=10):
    """
    Wait until the first flight number in the list differs from old_first_flight.
    This prevents scraping stale data immediately after tab switch.
    """
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
                    # Small buffer to let the rest of the list populate
                    time.sleep(1)
                    return
            except Exception:
                pass
                
        except Exception:
            pass
            
        time.sleep(0.5)

    log.warning("  Timed out waiting for flight list update (stale data risk!)")

# ================== BATCH DIR CROSSCHECK ==================
def run_crosscheck_for_dir(driver, parent_dir, start_date, end_date):
    import glob
    d = start_date
    print(f"[BATCH] Scanning '{parent_dir}' from {start_date} to {end_date}")
    
    while d <= end_date:
        date_str = d.isoformat()
        pattern = os.path.join(parent_dir, "**", f"*_{date_str}.csv")
        files = glob.glob(pattern, recursive=True)
        
        for file_path in files:
            if "_crosscheck" in file_path:
                continue
                
            basename = os.path.basename(file_path)
            parts = basename.split("_")
            if len(parts) >= 3:
                airport_code = parts[1].upper()
                out_dir = os.path.abspath(os.path.dirname(file_path))
                
                global OUT_DIR, AIRPORT
                old_out_dir = OUT_DIR
                old_airport = AIRPORT
                
                OUT_DIR = out_dir
                AIRPORT = airport_code
                
                print("="*60)
                print(f"[BATCH CROSSCHECK] Airport: {airport_code} | Date: {d} | Dir: {out_dir}")
                print("="*60)
                
                try:
                    crosscheck_day(driver, d, airport_code)
                except Exception as e:
                    print(f"[ERR] Failed batch crosscheck for {airport_code} on {d}: {e}")
                
                OUT_DIR = old_out_dir
                AIRPORT = old_airport
                
        d += timedelta(days=1)
    print(f"[BATCH CROSSCHECK] Finished scanning all folders for the requested date range.")


# ================== MAIN ==================
def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--crosscheck", help="YYYY-MM-DD")
    parser.add_argument("--crosscheck-dir", help="Crosscheck all airports inside a parent directory over a date range")
    parser.add_argument("--airport", help="Airport exact abbreviation (e.g. SYD, CHC)")
    parser.add_argument("--out-dir", help="Override the output directory path")
    parser.add_argument("--range", help="Start:End date (e.g. 2026-02-10:2026-03-01)")
    parser.add_argument("--worker-id", help="Unique ID for parallel workers to avoid profile conflicts")
    parser.add_argument("--force", action="store_true", help="Overwrite existing files even if they already exist")
    args = parser.parse_args()

    # Allow overriding globals via CLI
    global START_DATE, END_DATE, AIRPORT, OUT_DIR
    if args.airport:
        AIRPORT = args.airport.upper()
        log.info(f"Overridden Airport: {AIRPORT}")

    if args.out_dir:
        OUT_DIR = os.path.abspath(args.out_dir)
        log.info(f"Overridden Output Directory: {OUT_DIR}")

    if args.range:
        parts = args.range.split(":")
        if len(parts) == 2:
            START_DATE = date.fromisoformat(parts[0])
            END_DATE = date.fromisoformat(parts[1])
            log.info(f"Overridden date range: {START_DATE} -> {END_DATE}")

    # Unique profile for parallel workers
    global USER_DATA_DIR
    driver_exe_path = None
    if args.worker_id:
        USER_DATA_DIR = f"{USER_DATA_DIR}_{args.worker_id}"
        log.info(f"Using unique profile: {USER_DATA_DIR}")

        # Create a UNIQUE copy of chromedriver for this worker
        # This prevents PermissionError when multiple workers patch simultaneously
        uc_data = os.path.join(os.environ.get('APPDATA', ''), 'undetected_chromedriver')
        original_exe = os.path.join(uc_data, 'undetected_chromedriver.exe')
        worker_exe = os.path.join(uc_data, f'chromedriver_worker_{args.worker_id}.exe')
        if os.path.exists(original_exe):
            try:
                shutil.copy2(original_exe, worker_exe)
                driver_exe_path = worker_exe
                log.info(f"Using unique driver: {worker_exe}")
            except Exception as e:
                log.warning(f"Could not copy driver: {e}")
    
    options = uc.ChromeOptions()
    options.add_argument(f"--user-data-dir={USER_DATA_DIR}")
    options.add_argument("--window-size=1920,1080")

    if driver_exe_path:
        driver = uc.Chrome(options=options, version_main=146, driver_executable_path=driver_exe_path)
    else:
        driver = uc.Chrome(options=options, version_main=146)

    try:
        if args.crosscheck_dir:
            run_crosscheck_for_dir(driver, args.crosscheck_dir, START_DATE, END_DATE)
            return

        if args.crosscheck:
            crosscheck_day(driver, datetime.fromisoformat(args.crosscheck).date(), AIRPORT)
            return

        # ---- Calculate total days ----
        total_days = (END_DATE - START_DATE).days + 1
        log.info("=" * 60)
        log.info(f"FlightsFrom Scraper started")
        log.info(f"  Airport  : {AIRPORT}")
        log.info(f"  Range    : {START_DATE} -> {END_DATE} ({total_days} days)")
        log.info(f"  Output   : {OUT_DIR}")
        log.info("=" * 60)

        # Build initial URL with take=250 to pre-load all flights if possible
        # This is much more stable than clicking "Show more" many times
        target_url = f"https://www.flightsfrom.com/{AIRPORT}?from={AIRPORT}&entityType=departures&take=250&selectedDate={START_DATE}"
        log.info(f"Navigating to: {target_url}")
        driver.get(target_url)
        time.sleep(10)  # Initial page load — generous wait

        completed = 0
        skipped = 0
        already_done = 0
        total_dep = 0
        total_arr = 0
        start_time = time.time()

        d = START_DATE
        while d <= END_DATE:
            j, c = daily_paths(d)
            day_num = (d - START_DATE).days + 1

            if os.path.exists(j) and not args.force:
                already_done += 1
                log.debug(f"[{day_num}/{total_days}] {d} -> Already exists, skipping")
                d += timedelta(days=1)
                continue
            
            if os.path.exists(j) and args.force:
                log.info(f"[{day_num}/{total_days}] {d} -> Overwriting existing data due to --force")

            log.info("─" * 50)
            log.info(f"[{day_num}/{total_days}] Scraping date: {d}")

            dep, arr = scrape_day_flights(driver, d, AIRPORT)
            
            if not dep and not arr:
                skipped += 1
                log.error(f"  SKIPPED {d} — no data fetched (API and UI fallback failed)")
                d += timedelta(days=1)
                continue

            completed += 1
            total_dep += len(dep)
            total_arr += len(arr)
            elapsed = time.time() - start_time
            remaining = total_days - day_num
            avg_per_day = elapsed / max(completed, 1)
            eta_min = (remaining * avg_per_day) / 60

            log.info(
                f"  Progress: {completed} done / {skipped} skipped / "
                f"{already_done} existed / {remaining} remaining  "
                f"(ETA ~{eta_min:.0f} min)"
            )

            random_sleep()
            d += timedelta(days=1)

        # ---- Final summary ----
        elapsed_total = time.time() - start_time
        log.info("=" * 60)
        log.info(f"SCRAPING COMPLETE")
        log.info(f"  Completed    : {completed} days")
        log.info(f"  Skipped      : {skipped} days")
        log.info(f"  Already done : {already_done} days")
        log.info(f"  Total flights: {total_dep} departures + {total_arr} arrivals = {total_dep + total_arr}")
        log.info(f"  Elapsed time : {elapsed_total/60:.1f} minutes")
        log.info("=" * 60)

    finally:
        driver.quit()


if __name__ == "__main__":
    main()


