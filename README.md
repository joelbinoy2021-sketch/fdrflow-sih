# FDRFLOW — Security Deposit / FDR Management Portal
### Smart India Hackathon (SIH) Problem Statement 26265: "Streamline of Security Deposit / FDR Portal"

A fully integrated, production-grade security deposit and Fixed Deposit Receipt (FDR) management portal built with **Django REST Framework** (Python 3.14 / Django 6.1.2) and **React + Vite**.

---

## 🌟 Implemented Features

### 1. Dashboard (Overview)
- **Live backend synchronization**: Fetches dynamic FDR metrics directly from Django SQLite database.
- **Computed metrics**: Total instruments, total portfolio value in ₹ (INR), active valid instruments, pending verification count, active discrepancies, and instruments maturing in 30 days.
- **Instrument lifecycle progress**: Real-time proportional distribution across Active, Pending, Discrepancies, and Matured statuses.
- **Needs Attention list**: Automatically flags overdue instruments, items nearing maturity (within 7 days), and unresolved discrepancies.

### 2. FDR Repository
- Search across institution name, FDR reference number, and issuing bank.
- Multi-dimensional filters: Status, verification status, bank name, and maturity timeframe.
- Dynamic sorting by creation date, maturity date, amount (high/low), and institution.
- Modal dossier with complete lifecycle actions, document downloads, and verification logs.
- Administrative inline record corrections for authorized users.

### 3. Add New FDR Registration
- Positive amount validation ($> 0$), non-negative interest rate validation ($\ge 0\%$).
- Strict chronological date verification (maturity date must strictly follow issue date).
- Database-level duplicate prevention for the same FDR number within an issuing bank.
- Supporting document uploads (PDF, PNG, JPG $\le 5$ MB) handled via multipart forms and private media storage.
- Auto-locks institution name to authenticated user profile when submitted by institution accounts.

### 4. Verification Queue
- Dedicated queue for Regulation Bureau Reviewers and Administrators.
- Reviewer actions: **Verify Instrument**, **Flag Discrepancy**, and **Reject Instrument**.
- Mandatory remarks and verification method capture for auditability.
- Clear disclosure: Discloses that verification is based on official branch records, without claiming unverified live bank API connections.

### 5. Automated Maturity & Alerts
- Real-time days-to-maturity countdown and overdue indicators.
- Tiered automated alerts: 30 days, 15 days, 7 days, and matured/overdue notifications.
- Idempotent alert generation (avoids duplicate alerts for the same instrument state).
- Dismissible alerts and one-click database re-synchronization.

### 6. Renewal & Replacement Lifecycle
- Replaces matured or expiring FDRs with new certificates while linking to parent instruments.
- Preserves historical records by setting old status to `Renewed` without destructive overwrites.
- Full provenance tracking between renewals.

### 7. Security Deposit Release Requests
- Formal request workflow for institutions claiming refund after regulatory term completion.
- Reviewer approval/rejection determination with mandatory rejection remarks.
- Discharges instrument status to `Released` upon competent authority approval.

### 8. Authentication & Role-Based Access Control (RBAC)
- Token-based DRF authentication with protected endpoints.
- Role isolation:
  1. **Administrator (`admin`)**: Complete management, user configuration, record editing, and full audit logs.
  2. **Reviewer (`reviewer`)**: Verification queue processing, discrepancy flagging, release reviews, and reports.
  3. **Institution User (`institute`)**: Multi-tenant data isolation; can only view and create records for their assigned institution.
- Built-in quick role-switcher in top navigation bar for seamless judge/evaluator testing.

### 9. Regulatory Compliance Audit Trail
- Forensic immutable event log of all FDR creations, edits, reviews, renewals, and release approvals.
- Records timestamp, user representation, action type, IP address, and operation details.
- Read-only API preventing unauthorized tampering.

### 10. Reports & Export
- Aggregated financial breakdown by bank and deposit status.
- Live CSV download via backend API (`/api/fdrs/export_csv/`).
- Print-optimized executive report format (`window.print()`).

---

## 🔑 Demo Credentials

| Role | Username | Password | Organization | Scoped Access |
|---|---|---|---|---|
| **Administrator** | `admin` | `Admin@12345` | AICTE Headquarters | All institutions & audit trail |
| **Bureau Reviewer** | `reviewer` | `Reviewer@12345` | Verification Cell | All institutions & review actions |
| **Institution User** | `institute` | `Institute@12345` | North Valley Institute of Tech | Scoped only to own institution |
| **Institution User 2** | `crescent` | `Crescent@12345` | Crescent College of Engineering | Scoped only to own institution |

*Tip: You can also switch roles with 1 click using the role selector pill in the top navigation bar.*

---

## 🚀 Running the Project Locally

### Prerequisites
- Node.js 18+
- Python 3.12+ (tested with Python 3.14.6)
- Activated virtual environment in `venv/`

### 1. Backend Setup & Startup
```powershell
# Navigate to backend directory
cd backend

# Run database migrations
..\venv\Scripts\python.exe manage.py migrate

# Seed initial portal data & demo accounts
..\venv\Scripts\python.exe manage.py seed_portal_data

# Start the Django development server
..\venv\Scripts\python.exe manage.py runserver 127.0.0.1:8000
```
Backend API available at: `http://127.0.0.1:8000/api/fdrs/`

### 2. Frontend Startup
```powershell
# From project root
npm install
npm run dev
```
Frontend accessible at: `http://localhost:5173/`

### 3. Running Automated Tests
```powershell
..\venv\Scripts\python.exe backend\manage.py test instruments
```
15 comprehensive test cases covering authentication, validations, RBAC scoping, renewal workflows, and audit logs.

### 4. Running Production Build
```powershell
npm run build
```

---

## 🔒 Security & Prototype Limitations
- **Simulated Bank Integration**: In accordance with the SIH Problem Statement boundary, this prototype does not connect directly to live commercial banking core switches (e.g., SFMS/NEFT). Verification reflects internal bureau checks.
- **Local Media Storage**: Uploaded deposit scans are kept in local media directory with authenticated access. Production deployment should configure private cloud object storage (e.g., AWS S3 or Google Cloud Storage with presigned URLs).
- **Environment Isolation**: Prototype secrets and tokens are configured for local development. For production staging, supply dedicated environment variables.
