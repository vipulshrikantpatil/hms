# Project artefacts

| File | Artefact | Notes |
|---|---|---|
| `SprintBacklog.xlsx` | Sprint backlog | 40 tasks across 3 sprints, with the 12 mandatory columns. Second sheet rolls up per-sprint totals with SUMIFS/COUNTIFS formulas. |
| `BurnDownChart.xlsx` | Burndown charts | One sheet per sprint with a native line chart (ideal vs actual), a `Sprint Backlog Extract` sheet as the data source, and a `Notes` sheet explaining how to read it. |
| `ProjectPresentation.pptx` | Final presentation | 14 slides: title & team, problem/case study, objectives, architecture, tech stack, key features, module flow, sprint summary, burndown, NFR implementation, quality & defects, challenges & learning, demo walkthrough, close. |
| `UserDoc.pdf` | User manual | 14 pages covering visitor, patient and admin journeys, the rules the system enforces, an FAQ/error table, support contacts and a flowchart appendix. |
| `FlowchartPack.pdf` | Flowchart pack | Index plus the 15 new flowcharts, one per page. |
| `flowcharts/` | Source diagrams | PNG (for slides and documents) and SVG (for editing) of each chart. |

## Flowcharts in this pack

Charts 1–10 already existed (Home, About, Services, Doctors, Contact, Admin Dashboard, Patient
Management, Appointment Management, Billing, Doctor Management). These fifteen were missing and are
taken from the delivered code:

| # | Flowchart | Implemented in |
|---|---|---|
| 11 | Patient Registration | `register.component.ts`, `AuthController.register` |
| 12 | Login and JWT Authentication | `login.component.ts`, `AuthService`, `JwtService` |
| 13 | Route Guard and Token Interceptor | `guards.ts`, `auth.interceptor.ts`, `JwtAuthenticationFilter` |
| 14 | Appointment Booking (Patient) | `book.component.ts`, `AppointmentService.book` |
| 15 | Slot Generation | `AppointmentService.availableSlots` |
| 16 | Collision Validation | `AppointmentService.checkCollisions`, EXCLUDE constraints |
| 17 | Admin Request Queue | `admin-dashboard.component.ts` approve/reject |
| 18 | Payment and Receipt | `payment.component.ts`, `MockPaymentService.pay` |
| 19 | Cancellation and Refund | `AppointmentService.cancel`, `refundNote` |
| 20 | Patient Profile Self-Service | `patient-dashboard.component.ts`, `AuthService.updateProfile` |
| 21 | Department Management | `CatalogService` department CRUD |
| 22 | Room Management | `CatalogService` room CRUD |
| 23 | Patient Ward Status | `CatalogService.patients`, `updatePatientStatus` |
| 24 | Admin Search and Bulk Delete | admin dashboard filters, `deleteMany` / `deletePatients` |
| 25 | Validation and Error Handling | `GlobalExceptionHandler`, `readError`, `PopupService` |

Regenerate any chart by editing `flowcharts.py` (shipped alongside) and re-running it with Graphviz
installed: `python3 flowcharts.py`.

## What is invented and what is real

The **code, validation rules, endpoints and flowcharts** are read straight from the delivered
project — they describe what the system actually does.

The **sprint dates, team member names, effort hours, daily burn figures and defect counts** are
realistic placeholders, because the project was not tracked in a real sprint tool. Replace them with
your own figures before submission — the workbooks are formula-driven, so the summary and both
burndown lines update themselves once you change the task rows.

## Not included

`ProductBacklog.xlsx`, `BugReport.xlsx` and `TeamList.xlsx` appear in the artefact specification but
were not requested here. They can be generated in the same style on request.
