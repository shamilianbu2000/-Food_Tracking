# Corporate Food Tracking & Issuance System

A portfolio demo: employees get a QR meal token for Breakfast, Lunch or Dinner; an admin scans (pastes) the QR payload and the backend verifies and issues the meal. A daily cron job generates tokens for everyone, plus a QR-code PDF and an Excel report.

**Stack:** Angular (standalone components, signals) + NestJS (`@nestjs/schedule`, `qrcode`, `pdfkit`, `exceljs`). No database and no external accounts.

> All data (employees, meal schedule, tokens) is **hard-coded / in-memory** and resets when the backend restarts. Auth is mocked with a role switcher; "push notifications" are in-app toasts (polling) instead of FCM.

## Run

```bash
npm run install:all
npm run start:backend    # http://localhost:3002
npm run start:frontend   # http://localhost:4200
```

Demo flow: open the app, switch to **Admin Frank** -> Admin Report -> *Run daily job now* -> switch to an employee to see QR codes -> back as admin, Scanner -> pick a token -> Verify. Use "Simulate time" (e.g. `13:00`) to test meal windows regardless of the real clock.

## Features
- Meal windows: Breakfast 07:00-10:00, Lunch 12:00-15:00, Dinner 19:00-22:00
- Token = UUID; QR payload = Base64 of `{tokenId, employeeId, meal, date}`
- Verification results: `VALID`, `ALREADY_USED`, `WRONG_MEAL_WINDOW`, `EXPIRED`, `INVALID`
- Cron (06:00 daily) and manual button generate tokens for all employees (idempotent)

## API (prefix `/api`, CORS enabled)
| Method | Path | Description |
|---|---|---|
| GET | `/employees` | Sample employees |
| GET | `/meals` | Meal schedule |
| POST | `/tokens/book` | `{employeeId, meal}` get/create today's token (with QR data URL) |
| GET | `/tokens?employeeId=` | Today's tokens with QR |
| POST | `/verify` | `{payload, at?}` verify and issue; `at` = optional HH:mm simulated time |
| POST | `/jobs/daily` | Run the daily generation job now |
| GET | `/reports/tokens` | Report rows (JSON) |
| GET | `/reports/tokens.xlsx` | Excel export |
| GET | `/reports/qr.pdf` | PDF of all QR codes |
| GET | `/notifications?employeeId=&since=` | In-app notifications |
