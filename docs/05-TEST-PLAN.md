# Test Plan for Compatibility and Regression

เอกสารนี้สรุปแนวทางการทำ unit test, integration test, frontend test, และ smoke test สำหรับโปรเจค Flight Search โดยเน้น 3 เป้าหมายหลัก:

1. ตรวจสอบว่า feature ใหม่ทำงานได้ตามคาด
2. ตรวจสอบว่า feature ใหม่ไม่กระทบ flow เดิม
3. ตรวจสอบว่า backend กับ frontend ยังเข้ากันได้ในระดับ contract และ runtime behavior

## Guiding Principles

- Test สิ่งที่เปลี่ยนจริงก่อน
- แยกชั้นการทดสอบให้ชัด: logic, API contract, UI behavior, end-to-end
- ใช้ข้อมูลจำลองหรือ fixture ให้มากพอเพื่อไม่ผูกกับ DB จริงทุกเคส
- ทุก test ควรตอบได้ว่า "ถ้า fail แล้วกระทบผู้ใช้ส่วนไหน"

## Recommended Test Stack

### Backend

- `Jest` สำหรับ unit และ integration test
- `ts-jest` สำหรับรัน TypeScript โดยตรง
- `supertest` สำหรับทดสอบ HTTP endpoint
- fixture หรือ mocked DB layer สำหรับ logic test ที่ไม่ต้องต่อฐานข้อมูลจริง

### Frontend

- `Vitest` สำหรับ component / hook test
- `React Testing Library` สำหรับ behavior-oriented UI test
- `jsdom` เป็น environment หลัก
- `Playwright` หรือ `Cypress` สำหรับ smoke / end-to-end test ของ flow สำคัญ

> ถ้าต้องการลดเครื่องมือให้เรียบง่ายในรอบแรก สามารถเริ่ม backend ด้วย Jest ก่อน แล้วค่อยเพิ่ม frontend stack ตามลำดับความสำคัญ

## Test Layers

### 1. Unit Tests

เหมาะกับ logic ที่คำนวณหรือแปลงข้อมูลโดยตรง เช่น service, helper, utility, mapper, formatter, cache policy

ตัวอย่างสิ่งที่ควรทดสอบ:

- การคำนวณช่วงวันที่และ comparison window
- การ normalize input เช่น country, airport code, continent key
- การคำนวณ delta, percentage, top-N, sorting
- fallback เมื่อค่าเป็น `null`, ว่าง, หรือรูปแบบผิด
- cache hit / miss / clear

สิ่งที่ unit test ช่วยตอบได้:

- logic ใหม่คำนวณถูกหรือไม่
- logic เก่าถูกเปลี่ยนโดยไม่ตั้งใจหรือไม่
- edge case สำคัญมีผลลัพธ์คงที่หรือไม่

### 2. API Integration Tests

ใช้ทดสอบ controller + service + route wiring ผ่าน endpoint จริง

ตัวอย่างสิ่งที่ควรทดสอบ:

- route ใหม่ตอบ payload ตาม contract หรือไม่
- endpoint เก่ายังตอบ field เดิมครบหรือไม่
- query parameter validation และ error code
- response shape สำหรับ dashboard, country, airport, airline
- cache clear / refresh / preload behavior

สิ่งที่ integration test ช่วยตอบได้:

- frontend ยังเรียก backend ได้ตามเดิมหรือไม่
- contract ที่แชร์กันระหว่างระบบยังไม่พัง
- feature ใหม่กระทบ endpoint อื่นหรือไม่

### 3. Frontend Component Tests

เหมาะกับหน้าจอหรือ component ที่ใช้ข้อมูลจาก backend โดยตรง

ตัวอย่างสิ่งที่ควรทดสอบ:

- loading, empty, error states
- render ตามข้อมูลจริงจาก API response ใหม่
- interaction เช่น drill-down, filter, range preset, back navigation
- persisted state และ fallback เมื่อข้อมูลบาง field ไม่มา
- chart/table/card แสดงผลลัพธ์ที่ถูกต้อง

สิ่งที่ component test ช่วยตอบได้:

- UI ยังไม่ crash เมื่อ backend เปลี่ยนข้อมูลบางส่วน
- user flow ยังเดินต่อได้
- data ที่ได้จาก backend ถูกนำไปแสดงอย่างถูกวิธีหรือไม่

### 4. End-to-End Smoke Tests

ใช้ยืนยันระบบรวมทั้ง backend + frontend + config + browser flow

ตัวอย่างสิ่งที่ควรทดสอบ:

- เปิดหน้า dashboard แล้วโหลดข้อมูลได้
- drill-down จาก world → continent → country → airport
- กลับขึ้นระดับเดิมแล้ว state ไม่เพี้ยน
- ค้นหาเที่ยวบินเดิมยังทำงานหลังเพิ่ม feature ใหม่
- หน้าสำคัญโหลดได้หลัง deploy หรือ rebuild

สิ่งที่ smoke test ช่วยตอบได้:

- ระบบทั้งชุดยังใช้งานได้จริง
- feature ใหม่ไม่ทำให้ flow หลักพัง
- ปัญหาที่เกิดจาก wiring, env, CORS, routing, hydration ถูกจับได้

## Priority Test Matrix

### High Priority

- dashboard summary / drill-down API ที่ feature ใหม่ไปแตะ
- endpoint ที่ frontend ใช้แสดง dashboard หลัก
- component ที่ผูกกับข้อมูลสรุปและกราฟหลัก
- cache clear / refresh / preload
- date range และ comparison logic

### Medium Priority

- top ranks, country overview, airport overview, trends
- search form และผลลัพธ์เดิมที่อาจได้รับผลกระทบจาก state shared
- shared utilities และ API client

### Lower Priority

- static content และ UI ที่ไม่เกี่ยวกับ data flow โดยตรง
- snapshot ที่ไม่ได้สะท้อน behavior สำคัญ

## Minimum Test Cases

### Backend

- input ถูกต้องและได้ response ตามคาด
- input ผิดหรือขาด field แล้วได้ 4xx
- ช่วงวันที่ boundary cases
- response shape ยังมี field ที่ frontend ใช้
- cache clear แล้วค่าถูก reset
- query เดิมยังไม่เสียหายหลังเพิ่ม feature ใหม่

### Frontend

- render สำเร็จเมื่อ API ส่ง data ครบ
- render fallback เมื่อ API ส่งบาง field ไม่ครบ
- loading state และ error state
- navigation ระหว่างระดับ dashboard
- state ที่จำไว้หรือ preset ไม่หายผิดจังหวะ

### Cross-System

- backend response contract ตรงกับ type ที่ frontend ใช้
- feature ใหม่ไม่เปลี่ยนชื่อ field หรือโครงสร้างข้อมูลสำคัญ
- endpoint ใหม่ไม่ทำให้ page เดิม call fail

## Suggested Execution Order

1. เขียน unit tests สำหรับ logic ที่คำนวณผลและ helper สำคัญ
2. เขียน API integration tests สำหรับ endpoint ที่ถูกแตะโดย feature ใหม่
3. เขียน frontend component tests สำหรับหน้าหลักและ drill-down flow
4. เพิ่ม smoke test สำหรับ flow สำคัญที่สุด
5. ค่อยขยาย coverage ไปยัง endpoint และ component รอง

## What to Watch For

- contract drift ระหว่าง backend response กับ frontend type
- cache ทำให้ test ผ่านผิดบริบทหรือ flaky
- timezone / date window ทำให้ผลลัพธ์ต่างกันตาม environment
- sorting / ranking ที่เปลี่ยนเพราะ dataset ใหม่
- state ที่ค้างใน UI แล้วรบกวนการทดสอบ flow ถัดไป

## Done Definition

ถือว่าครอบคลุมพอสำหรับ release เมื่อ:

- feature ใหม่มี unit test ครบ path สำคัญ
- endpoint ที่เกี่ยวข้องมี integration test
- frontend flow หลักมี component test ครอบคลุม
- มี smoke test ยืนยันระบบรวมทำงานได้
- test ที่เพิ่มช่วยจับ regression ของ feature เดิมได้จริง
