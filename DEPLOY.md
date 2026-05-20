# Deployment Guide — search-flight-27

> Branch: `dev11` | Last updated: 2026-05-20

---

## CI Steps (ลำดับสำคัญ — ห้ามข้าม)

```powershell
# 1. Pull latest code
git pull origin dev11

# 2. Rebuild Docker images (ต้อง --no-cache เพื่อให้ code ใหม่เข้า image)
docker-compose build --no-cache

# 3. Run database migrations (รันจาก host ไม่ใช่ใน container)
cd backend
npm run migrate
cd ..

# 4. Bring up all services
docker-compose up -d

# 5. Verify containers are healthy
docker ps
```

> **หมายเหตุ:** Step 3 (migrate) ต้องรันก่อน `up` เสมอ เพื่อให้ schema ตรงกับ code ใหม่

---

## Port Map

| Service    | Host Port | Container Port |
|------------|-----------|----------------|
| Frontend   | 3000      | 3000           |
| Backend    | 3001      | 3001           |
| PostgreSQL | 5433      | 5432           |

Backend เชื่อม DB ผ่าน `host.docker.internal:5432` → ต้องมี PostgreSQL รันบน host ที่ port **5432** ก่อนเสมอ

---

## การแก้ไขใน Deploy นี้ (dev11)

### 1. Dockerfile Fix — `backend/Dockerfile`

**ปัญหา:** `apk add` fail ด้วย exit code 1 / 18 เมื่อ build ด้วย Alpine เวอร์ชันใหม่

**สาเหตุ:**
- `postgresql-common` post-install trigger รัน `find /usr/share/man` ซึ่งไม่มีอยู่ใน Alpine → exit code 1
- `py3-pip` ถูกรวมเข้าใน `python3` ตั้งแต่ Alpine 3.21+ → exit code 18 (package not found)

**แก้ไข:**
```dockerfile
# เพิ่ม mkdir สร้าง /usr/share/man ก่อน apk add
# เพิ่ม apk update เพื่อ refresh index
# ลบ py3-pip ออก (bundled กับ python3 แล้ว)
RUN mkdir -p /usr/share/man && \
    apk update && \
    apk add --no-cache \
    postgresql-client \
    python3 \
    chromium \
    ...
```

---

### 2. OOM Fix — `backend/src/controllers/statisticsController.ts`

**ปัญหา:** Backend crash ด้วย `FATAL ERROR: Reached heap limit` ระหว่าง dashboard preload

```
preset 365 chunk 2/4 done; rss=2302MB
preset 365 chunk 3/4 ...
→ Reached heap limit Allocation failed - JavaScript heap out of memory
→ exited with code 139
```

**สาเหตุ:** `summaryChunks[]`, `topRanksChunks[]`, `topDestChunks[]` สะสม response ของ **ทุก chunk ไว้ใน RAM พร้อมกัน** (4–6 ชุดสำหรับ preset 365/all) ก่อนจะ merge ทีเดียวหลัง loop จบ

**แก้ไข — Incremental merge:**
```
ก่อน: สะสม chunk 1,2,3,4 ใน array → merge หลัง loop → RSS พุ่ง (N × chunk_size)
หลัง: merge ทันทีหลังแต่ละ chunk → chunk เก่าถูก GC → RSS คงที่ (≈ 1 merged + 1 current chunk)
```
ลด memory ≈ 4× สำหรับ preset `365` และ ≈ 6× สำหรับ preset `all`

---

### 3. Concurrent Preload Fix — `backend/src/controllers/statisticsController.ts`

**ปัญหา:** Dashboard preload ทำงานซ้อนกัน 2 รอบพร้อมกันทุกครั้งที่ restart

**สาเหตุ:** มี 2 trigger บน startup พร้อมกัน:
- `DASHBOARD_PRELOAD_ON_STARTUP=true` → `warmDashboardCachesOnStartup()`
- `DASHBOARD_CACHE_REFRESH_RUN_ON_START=true` → `schedulerService` → `refreshDashboardQueryCacheSnapshot()` → `warmDashboardCachesOnStartup()`

Guard ที่มีอยู่ (`dashboardRefreshRunning`) ป้องกันแค่ scheduler ชนกันเอง ไม่ครอบคลุม startup preload

**แก้ไข — Global guard ด้วย `dashboardPreloadStatus.phase`:**
- `warmDashboardCachesOnStartup` → ถ้า `phase === 'running'` → return ทันที
- `refreshDashboardQueryCacheSnapshot` → ถ้า `phase === 'running'` → throw error

ทั้งสองฟังก์ชันใช้ `phase` flag เดียวกัน ทำให้ทำงานได้แค่ 1 รอบต่อเวลา

---

## Environment Variables ที่สำคัญ

### Memory & Preload

| Variable | Default | คำอธิบาย |
|---|---|---|
| `NODE_OPTIONS` | `--max-old-space-size=3072` | V8 heap limit (MB) — ต้องน้อยกว่า `mem_limit` ใน docker-compose |
| `DASHBOARD_CACHE_REFRESH_MAX_RSS_MB` | `3500` | หยุด country preload ถ้า RSS เกิน (MB) |
| `DASHBOARD_CACHE_REFRESH_MAX_PRESET_DAYS` | `Infinity` | จำกัด preset ขนาดใหญ่ เช่น ตั้ง `180` เพื่อข้าม preset `365` และ `all` |

### Startup Behavior

| Variable | ค่าปัจจุบัน | คำอธิบาย |
|---|---|---|
| `DASHBOARD_PRELOAD_ON_STARTUP` | `true` | warm cache ตอน server start |
| `DASHBOARD_CACHE_REFRESH_RUN_ON_START` | `true` | scheduler trigger ทันทีตอน start |
| `ENABLE_SCHEDULED_JOBS` | `true` | เปิด cron jobs ทั้งหมด |

> **สำคัญ:** ตั้งทั้งสองค่าเป็น `true` พร้อมกันได้ แต่จะทำงานแค่รอบเดียวเพราะมี guard แล้ว (หลังจาก fix นี้)

### Chunk & Cache Tuning

| Variable | ค่าปัจจุบัน | คำอธิบาย |
|---|---|---|
| `DASHBOARD_CACHE_REFRESH_COUNTRY_BATCH_SIZE` | `15` | จำนวน country ต่อ batch ใน country preload |
| `DASHBOARD_CACHE_REFRESH_MODE` | `override` | `override` = clear แล้ว write ใหม่, `append` = เพิ่มต่อของเดิม |
| `DASHBOARD_CACHE_REFRESH_CLEAR_FIRST` | `true` | clear cache ก่อน refresh |
| `DASHBOARD_CACHE_REFRESH_PRESET` | `focus` | preset ที่ scheduler ใช้ตอน daily refresh |

### Auto Import

| Variable | ค่าปัจจุบัน | คำอธิบาย |
|---|---|---|
| `AUTO_IMPORT_FLIGHTS` | `true` | import domestic flights อัตโนมัติ |
| `AUTO_IMPORT_INTL_FLIGHTS` | `false` | import international flights (ปิดไว้ — ใช้ memory มาก) |
| `FORCE_IMPORT` | `false` | บังคับ import แม้จะ import ไปแล้ว |
| `AUTO_SYNC_AIRPORTS` | `true` | sync airport data อัตโนมัติ |

---

## Troubleshooting

### OOM / Container restart loop
```powershell
# ดู log ก่อน restart
docker logs flight_search_backend --tail 100

# ถ้า RSS พุ่งสูง ให้ลด preset ที่รัน
# แก้ใน docker-compose.yml หรือ .env:
DASHBOARD_CACHE_REFRESH_MAX_PRESET_DAYS=180  # ข้าม preset 365 และ all
```

### Preload ทำงานซ้ำ / ช้า
```powershell
# เช็ค status
curl http://localhost:3001/api/statistics/dashboard-cache/status

# Force clear cache แล้วให้ preload ใหม่
curl -X POST http://localhost:3001/api/statistics/dashboard-cache/refresh
```

### Build fail (apk error)
```
exit code 1  → postgresql-common trigger ต้องการ /usr/share/man (แก้แล้วใน Dockerfile)
exit code 18 → package not found, ชื่อ package เปลี่ยนในรุ่น Alpine ใหม่
```

### Database connection ใน container
Backend ใช้ `host.docker.internal:5432` → PostgreSQL ต้องรันบน **host machine** ที่ port 5432  
ไม่ใช่ Docker postgres ที่ port 5433 (นั่น expose ไว้สำหรับ external tools เท่านั้น)
