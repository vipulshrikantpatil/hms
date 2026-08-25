# Hospital Management System

Minimalist, functionality-first HMS.

- **Backend:** Java 17, Spring Boot 3.3, Spring Data JPA, Spring Security + JWT, Hibernate Validator
- **Frontend:** Angular 17 standalone components, plain HTML tables/forms, native CSS only (no Bootstrap / Tailwind / Material)
- **Database:** PostgreSQL (MySQL 8 supported — see notes)

```
hospital-management-system/
├── db/schema.sql          # DDL, indexes, overlap-exclusion constraints
├── hms-backend/           # Spring Boot API (port 8080)
├── hms-frontend/          # Angular SPA (port 4200)
└── artifacts/             # sprint backlog, burndown, deck, user manual, flowcharts
```

Project artefacts (sprint backlog, burndown charts, presentation, user manual and the 15-chart
flowchart pack) live in `artifacts/` — see `artifacts/README.md` for what each file contains and
which figures are placeholders.

## 1. Database

```bash
createdb hms
psql -d hms -f db/schema.sql        # optional: JPA ddl-auto=update also builds the schema
```

Running `schema.sql` is recommended on PostgreSQL because it adds the `EXCLUDE USING gist`
constraints that block overlapping appointments at the database level. Hibernate will not create these.

**MySQL 8:** drop the `CREATE EXTENSION` / `EXCLUDE` block at the bottom of `schema.sql`, swap
`BIGSERIAL` → `BIGINT AUTO_INCREMENT`, `TIMESTAMP` → `DATETIME`, `NUMERIC` → `DECIMAL`, and switch the
datasource block in `application.yml`. Collision prevention then relies on the service layer only.

## 2. Backend

```bash
cd hms-backend
mvn spring-boot:run
```

Edit `src/main/resources/application.yml` for datasource credentials and `app.jwt.secret`
(**change the secret before any real deployment** — it must be at least 32 bytes).

> **Password storage:** `app.security.plain-text-passwords` is `true`, so passwords are saved to the
> `users` table exactly as typed (requested change). Flip it to `false` for BCrypt. Changing the flag
> changes the stored format, so existing accounts must be re-created either way — including the seeded
> admin, which the seeder skips if the row already exists (`DELETE FROM users WHERE email='admin@hms.local';`
> then restart).

On first run `DataSeeder` creates:

| Account | Password | Role |
|---|---|---|
| admin@hms.local | Admin@123 | ADMIN |

plus 3 departments, 4 doctors and 4 rooms. Set `app.seed.enabled: false` to skip it.

## 3. Frontend

```bash
cd hms-frontend
npm install
npm start                   # http://localhost:4200
```

The API base URL is `API_BASE` in `src/app/services/api.service.ts`.

## API summary

| Method | Endpoint | Access |
|---|---|---|
| POST | `/api/auth/register` | public (creates a PATIENT) |
| POST | `/api/auth/login` | public |
| GET | `/api/public/doctors?departmentId=&q=` | public |
| GET | `/api/public/departments` | public |
| GET | `/api/public/doctors/{id}/slots?date=YYYY-MM-DD` | public |
| GET/PUT | `/api/patient/profile` | PATIENT |
| GET/POST | `/api/patient/appointments` | PATIENT |
| PATCH | `/api/patient/appointments/{id}/cancel-request` | PATIENT (raises a request, remark required) |
| POST | `/api/patient/appointments/{id}/pay` | PATIENT |
| GET | `/api/patient/appointments/{id}/receipt` | PATIENT |
| GET | `/api/patient/rooms/free?start=&end=` | PATIENT |
| GET | `/api/admin/appointments/pending` | ADMIN |
| PATCH | `/api/admin/appointments/{id}/approve?roomId=` | ADMIN |
| PATCH | `/api/admin/appointments/{id}/reject` | ADMIN (remarks mandatory) |
| GET | `/api/admin/appointments/cancellation-requests` | ADMIN |
| PATCH | `/api/admin/appointments/{id}/cancellation/approve` · `/reject` | ADMIN |
| CRUD | `/api/admin/{doctors,departments,rooms,patients}` | ADMIN |
| PATCH | `/api/admin/patients/{id}/status?status=ADMITTED\|DISCHARGED` | ADMIN |
| DELETE | `/api/admin/patients?ids=2,5` · `/api/admin/appointments?ids=3,7` | ADMIN (bulk) |
| GET | `/api/doctor/appointments` | DOCTOR |

## Collision rules

`AppointmentService.checkCollisions()` rejects a booking with **409 Conflict** when:

1. the doctor already has a `PENDING` or `APPROVED` appointment overlapping the requested window, or
2. the requested room is occupied in that window.

The same check runs again on admin approval (with the appointment itself excluded), so a room
reassignment cannot create a clash. Slot end time is derived from the doctor's `slotMinutes`, and
slots outside `availableFrom`–`availableTo` are rejected.

## Payments

`PaymentService` is an interface; `MockPaymentService` creates a `PENDING` payment row at booking and
exposes `markPaid` / `refund`. Swap in a Razorpay or Stripe implementation without touching the
appointment flow.

## Validation rules

Enforced identically on both sides — Hibernate Validator (`dto/ValidationPatterns.java`) and Angular
(`services/validators.ts`) — plus `CHECK` constraints in the DDL for phone numbers.

| Field | Rule |
|---|---|
| Mobile (patient, doctor) | exactly 10 digits, first digit 6-9, digits only — non-digits are stripped as you type |
| Password / confirm password | 8-50 chars, ≥1 uppercase, ≥1 lowercase, ≥1 digit, ≥1 special char, no spaces; both must match |
| Person names | letters, spaces, dots, apostrophes, hyphens; 2-100 chars |
| Department name | 3-80 chars, letters/digits/spaces/`& / ( ) -`, duplicate names rejected |
| Doctor | department, specialty (3-80), fee 0-10,000 (max 2 decimals), experience 1-70 years, slot 5-240 min, end time after start, working window ≥ one slot |
| Date of birth | not in the future and not more than 100 years ago — enforced on the picker, on typed input, in the DTO and by a DDL `CHECK` |
| Room number | 2-20 chars, letters/digits/hyphens, unique |
| Card | 13-19 digits + Luhn checksum, MM/YY expiry that is not in the past, 3-4 digit CVV |
| Doctor experience | whole number, 0-70 years |
| Terms | the "I agree" checkbox must be ticked before Pay is enabled |

## Popups

`PopupService` + `<app-popup>` render a modal dialog for every success and failure — registration,
profile save, booking, payment, and all admin create/update/delete actions. The same dialog handles
confirmations: destructive actions (delete, deactivate, cancellation requests, rejections) open a
confirm popup, optionally with a mandatory reason box, instead of the browser's `confirm()`/`prompt()`. Backend field errors are
flattened by `readError()` so the exact rule that failed is what the user sees. The registration form
clears itself on success and the user lands on their profile with the booking option.

## Payments and receipts

`/payment/:appointmentId` collects card details, validates them (including Luhn), and posts to
`POST /api/patient/appointments/{id}/pay`. The card number is masked in the input as soon as the field
loses focus, and **only the last four digits, the holder name and a transaction reference are persisted**
— the full PAN and the CVV never leave the request. On success the page switches to a printable receipt
(`Print / save as PDF`); `@media print` hides the header, footer, nav and buttons so only the receipt
prints. The full terms and conditions sit above the Pay button with a required **I agree** checkbox.
The receipt locks its own typography (`.receipt, .receipt *`) and neutralises the phone/date/address
auto-linking that mobile browsers apply, so tapping a field never changes its font. Paid appointments reopen the same page as a receipt view.

## Admin search and bulk actions

Each admin tab has its own search bar, filtering client-side over the loaded rows:

| Tab | Search by |
|---|---|
| Appointments | appointment ID, appointment date |
| Doctors | doctor ID, specialization or department name |
| Patients | patient ID, appointment date (patients with a visit on that day) |

Appointments and Patients also have row checkboxes plus a header select-all, and a **Delete selected**
button that posts one bulk `DELETE ...?ids=` request. Both bulk deletes ask for confirmation first.

## Room rules

- A **first-time visitor** (no earlier appointment) can only be assigned a `CONSULTATION` room. The
  admin queue filters the dropdown and the server re-checks it on approval.
- A room cannot be deactivated while a patient is still booked into it, and a doctor cannot be
  deactivated while live appointments are attached — both refuse with an explanatory popup.
- Floor `0` renders as **Ground floor** in the rooms table.

## Patient ward status

`patients.status` is `REGISTERED`, `ADMITTED` or `DISCHARGED`. The front desk admits a patient from the
Patients tab (only allowed while they have an appointment that has not finished), and can discharge
manually. Anyone still marked `ADMITTED` whose last appointment has already ended is discharged
automatically the next time the patient list is loaded.

## Cancellation workflow

Patients cannot cancel directly. Pressing **Request cancellation** opens a confirmation dialog with a
mandatory reason and moves the appointment to `CANCEL_REQUESTED`; the slot stays blocked while the
request is open. The admin's **Cancellation Requests** tab approves or declines it:

- **Approve** → status `CANCELLED`, `PaymentService.refund()` runs if the payment was `PAID`, and the
  remark records the amount, the card ending and the receipt number ("… reaches your account in 5-7
  working days"). Unpaid appointments record that no payment had been collected.
- **Decline** → the appointment reverts to whatever it was (`prev_status`) and the admin's reason is
  written into the remarks.

Cancelled, rejected and pending-cancellation appointments appear under the patient's **Cancelled** tab.

## Appointment timeline

`AppointmentDto.timeline` is derived server-side: `UPCOMING` while the slot end is in the future,
`VISITED` once it has passed. The patient dashboard has a **Profile / Appointments** switch, and the
appointments view filters by Upcoming, Visited or All.

## Styling

All styling lives in `src/styles.css` — one file, no framework, no web fonts, no build step. Colours
are CSS custom properties on `:root`, so retheming is a matter of editing the palette block:

| Token | Used for |
|---|---|
| `--brand` `#0b5c8a` | logo, headings, primary buttons, table headers |
| `--ok` / `--warn` / `--danger` | approved / pending / rejected status pills and action buttons |
| `--surface` / `--card` / `--line` | page background, content panel, borders |

The markup is still plain `<table>`, `<form>`, `<fieldset>` and `<button>` — elements are styled by
tag, so no component needed restructuring. Four optional classes carry meaning: `button.primary`
(main action), `button.success` / `button.danger` (approve / reject and deletes), and `button.tab`
inside a `.tabbar` (the selected tab is the disabled one). Appointment statuses render as pills via
the existing `status-PENDING` … `status-COMPLETED` classes. Layout collapses to a single column below
760px, focus rings are visible for keyboard users, and `prefers-reduced-motion` is respected. Print
styles are unchanged: only the receipt prints.

## Known gaps (deliberate)

- **Passwords are stored in plain text** by default (see the flag above). Anyone who can read the
  `users` table — a backup, a dump, an injection bug — gets every patient's password, and reused
  passwords carry that exposure to their email and bank. Set the flag to `false` before this goes near
  real patients.
- No refresh tokens — the JWT is stored in `localStorage` and expires in 24h.
- Doctor accounts are created by an admin directly in the `doctors` table; there is no
  doctor self-registration flow, and `DoctorController` only exposes a read-only schedule.
- No email/SMS notification on approve/reject.
