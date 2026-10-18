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
- Weekly menu planner: admin sets items per day per meal (a week is seeded); employees see today's menu and the week on My Meals
- Meal-count dashboard (admin): booked / issued / unused per meal and per day as CSS bar charts
- Meal history (employee): past tokens with status `issued`, `unused` (today, not yet issued) or `expired` (past, never issued); a few days are seeded
- Cancel booking: allowed until a per-meal cutoff (default 60 min before window start, admin-configurable on the Menu Planner page); the backend returns 400 after the cutoff, 403 for someone else's token, 400 if already issued. Honors the simulated time `at` (HH:mm). Cancelling removes the token, so it can be re-booked
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
| POST | `/tokens/cancel` | `{employeeId, tokenId, at?}` cancel an unissued token before the cutoff (`at` = simulated HH:mm) |
| GET | `/meals` | (extended) also returns `cutoffMinutes` and `cancelBy` (HH:mm) per meal |
| GET | `/menu?from=&days=` | Menu per date (default: current Mon-Sun week) |
| PUT | `/menu` | `{adminId, date, meal, items[]}` set a meal's items (admin only, else 403) |
| PUT | `/cutoffs` | `{adminId, meal, minutes}` set the cancel cutoff for a meal (admin only) |
| GET | `/history?employeeId=` | Employee's tokens, newest first, with status issued/unused/expired |
| GET | `/dashboard?days=` | `perMeal` and `perDay` booked/issued/unused counts over the last N days (default 7) |
