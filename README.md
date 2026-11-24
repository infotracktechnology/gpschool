# Green Park International Senior Secondary School ERP & HRMS Suite

A comprehensive, enterprise-grade School Management & Human Resource Management System (HRMS) built for CBSE-affiliated K-12 institutions.

---

## 🏛️ System Architecture & Highlights

Green Park School ERP enforces a **strict architectural separation** between the **Institution Administration ERP** and the **Dedicated Faculty & Staff Self-Service Portal**:

1. **Administration ERP (`/*`)**: Dedicated to Super Admins, Campus Administrators, and Principals for institutional governance, admissions, fee structures, academic master setups, allocations, biometric sync, and payroll disbursement.
2. **Dedicated Faculty & Staff Portal (`/portal/*`)**: A streamlined, modern workspace designed specifically for teachers and non-teaching staff, completely isolated from administrative settings and menus.

```
                              ┌────────────────────────────────────────┐
                              │            Login Screen                │
                              │           (/login page)                │
                              └──────────────────┬─────────────────────┘
                                                 │
                        ┌────────────────────────┴────────────────────────┐
                        │                                                 │
          Role: super_admin / admin                         Role: teacher / staff
                        │                                                 │
                        ▼                                                 ▼
        ┌───────────────────────────────┐               ┌──────────────────────────────────┐
        │       Admin ERP (/*)          │               │     Dedicated Staff Portal       │
        │ • Admissions Management       │               │          (/portal/*)             │
        │ • Student Lifecycle & Groups  │               │ • Dashboard (Punch & Schedule)   │
        │ • Master Settings & Boards    │               │ • My Profile (Read-Only 360°)    │
        │ • Staff Directory & Bulk Imp  │               │ • Student Attendance (AM / PM)   │
        │ • Staff Allocations & Reports │               │ • My Leaves (CL, SL, EL, OD)     │
        │ • Biometric Attendance (ePush)│               │ • Leave Approvals (Approvers)    │
        │ • Payroll & Payslip Engine    │               │ • My Attendance & Timetable      │
        └───────────────────────────────┘               │ • My Classes & Subject Alloc     │
                                                        │ • My Payslips (Printable PDF)    │
                                                        └──────────────────────────────────┘
```

---

## 🚀 Key Modules & Capabilities

### 1. Student Attendance in Staff Portal (`/portal/student-attendance`)
* **Session-Based Attendance**:
  * **Smart Session Tabs**: Dedicated `☀️ Morning (AM)` (Session 1) and `⛅ Afternoon (PM)` (Session 2) tabs.
  * **Auto-Timings Detection**: Automatically selects the active session based on real-time clock and school timings.
  * **"Copy Morning to Afternoon"**: Replicates the morning attendance roster into the afternoon session with 1 click.
* **Role-Based Scoping**:
  * **Primary & Co-Class Teachers**: Scoped strictly to their assigned class sections (from `branch_class_sections`), auto-selecting their primary class.
  * **Coordinators**: Access to all classes in their assigned Wing/Stage (from `staff_coordinators`).
  * **Principal & Administrators**: Campus-wide access across all classes.
* **Tiered Backdated Edit Lock**:
  * **Today & Past 2 Days**: Fully editable by faculty.
  * **Older than 2 Days**: Locked for regular teachers; unlocked via administrative override for Coordinators and Principals.
* **Silent Auto-Send FCM Absent Alerts (`backend/utils/fcmStudent.js`)**:
  * Background push notification to parent devices whenever a student is marked **Absent**:
    * *Title*: `Green Park School - Attendance Alert`
    * *Body*: `Dear Parent, your ward [Student Name] has been marked ABSENT for [Morning / Afternoon] session on [Date].`
* **Interactive Student Roster**:
  * "Mark All Present" batch shortcut.
  * Radio pills: `Present (P)`, `Absent (A)`, `Late (L)`.
  * Inline remarks input for absentees (Sick, Emergency, Uninformed).
  * Real-time metrics: Total Students, Present, Absent, Late, and Attendance %.

---

### 2. Staff Allocations Suite (`/staff/allocations`)
* **Tab 1: Class Teachers**:
  * **Interactive Assignment Workflow**: Select staff type $\rightarrow$ search faculty $\rightarrow$ click `+` $\rightarrow$ select Affiliation Board (CBSE, ICSE, State), Class, Section, and Role (Primary or Co-Class Teacher) $\rightarrow$ Assign.
  * **Real-time Conflict Checking**: Automated warning if a teacher is already designated as Class Teacher for another section, with 1-click replacement confirmation.
  * **Branch-Wide Class Teachers List Report**: Summary metrics (Total Sections, Assigned Primary, Vacant Sections, Co-Teachers), printable official Academic Docket (`window.print()`), and CSV export.
* **Tab 2: Subject Teachers**:
  * **Simple Subject Mapping**: Pick Target Class & Section $\rightarrow$ search faculty $\rightarrow$ check curriculum subjects $\rightarrow$ click `Assign to Subject`.
* **Tab 3: Coordinators**:
  * **Multi-Tier Scope**: Wing/Stage-level (Pre-Primary, Primary Wing Grades 1–5, Middle Wing Grades 6–8, Secondary Wing Grades 9–10, Senior Secondary Grades 11–12, Whole Campus) OR Class-level (e.g., Grade 10).
  * **Role Titles**: Academic Coordinator, Exam & Assessment Coordinator, Activity & Cultural Coordinator, Discipline & Sports Coordinator, Wing Head Coordinator.

---

### 3. Staff Bulk-Import Engine (`/staff`)
* **Dual Template Downloads**:
  * **Basic Template (10 columns)**: Core fields for rapid onboarding (`first_name`, `last_name`, `gender`, `staff_type`, `department`, `designation`, `phone`, `email`, `date_of_joining`, `branch_code`).
  * **Full 360° Template (25 columns)**: Extended employee attributes including PAN, Aadhaar, DOB, blood group, qualifications, bank account, IFSC, PF UAN, ESI IP, and basic pay.
* **Intelligent Processing**:
  * Client-side CSV parser with live validation preview grid.
  * Duplicate collision detection checking against existing staff in the database and duplicate entries within the file.
  * **Automated Institutional Emp Code**: Sequential generation (`{BranchCode}-T-001` for teaching, `{BranchCode}-NT-001` for non-teaching).
  * **Automated Login Credentials**: Synchronizes into `users` table (`username = emp_no`, unhashed plain-text password `phone` or `DOB DDMMYYYY`, `role = teacher` or `staff`).

---

### 4. Dedicated Faculty & Staff Portal (`/portal/*`)
* **Custom Portal Layout (`PortalLayout`)**: Distinct emerald/slate aesthetic tailored for mobile and desktop screens, strictly separate from administrative navigation.
* **8 Portal Pages**:
  1. **Dashboard (`/portal`)**: Personalized welcome, today's biometric punch status (Check-in / Check-out timestamps), teaching timetable schedule for the day, and leave quota gauges.
  2. **Student Attendance (`/portal/student-attendance`)**: Session-based morning/afternoon attendance entry, edit lock, and FCM absent alerts.
  3. **My Profile (`/portal/profile`)**: Read-only 360° dossier across 5 tabs (Personal & Identity, Employment, Qualification, Bank & Statutory, Documents) with a printable employee dossier action.
  4. **My Leaves (`/portal/leaves`)**: Live quota cards (CL, SL, EL, OD), "Apply for Leave" modal with duration calculation, substitute teacher handover note, and request history timeline.
  5. **Leave Approvals (`/portal/leave-approvals`)**: Visible exclusively to authorized approvers (Principals, Campus Administrators, Wing/Grade Coordinators). Campus- and wing-scoped review queue to **Approve** or **Reject** pending applications with reviewer remarks.
  6. **My Attendance (`/portal/attendance`)**: Monthly calendar register of daily punch times, attendance statuses, working days, and attendance percentage.
  7. **My Classes & Allocations (`/portal/classes`)**: Primary Class Teacher leadership card, subject allocations, and weekly teaching timetable matrix (Monday to Friday).
  8. **My Payslips (`/portal/payslips`)**: Historical salary register, earnings and deductions breakdown, and official printable branded salary slip modal with figures and words in Indian currency.

---

### 5. Staff Payroll & Statutory Disbursal Engine (`/staff/payroll`)
* Monthly institutional payroll generation for teaching and non-teaching staff.
* **Statutory Loss of Pay (LOP) Formula**:
  $$\text{LOP Deduction} = \left(\frac{\text{Gross Salary}}{\text{Total Days in Calendar Month}}\right) \times \text{LOP Absent Days}$$
* Statutory deductions: Provident Fund (PF: 12%), Employee State Insurance (ESI: 0.75%), Professional Tax (PT: ₹200).
* Branded Printable Salary Payslip Docket with CBSE school header, earnings/deductions breakdown, and Net Pay in words.

---

## 🛠️ Technology Stack

| Layer | Technology | Details |
|---|---|---|
| **Frontend** | React 18, Vite 5, Tailwind CSS | Lucide React icons, React Router DOM, modular components |
| **Backend** | Node.js, Express.js (ES Modules) | RESTful API, Multer document uploads, JWT authentication |
| **Database** | MySQL (`schoolcampuseye`) | Relational schema with foreign keys and cascaded indexes |
| **Push Notifications** | Firebase Cloud Messaging (FCM) | Silent background absent alerts via `fcmStudent.js` |
| **Biometrics** | ePush Biometric Adapter | Synchronizes with push-server biometric attendance logs |

---

## 🔑 Demo Access & Credentials

The login screen (`http://localhost:3000/login`) features **1-Click Instant Demo Profiles**:

| Profile | Username / Email | Password | Target Destination |
|---|---|---|---|
| **Super Admin** | `admin@schoolerp.com` | `Admin@123` | Admin ERP Dashboard (`/`) |
| **Teacher Portal** | `GPS-T-001` | `9840123456` | Dedicated Staff Portal (`/portal`) |

---

## 🏃 Running the Application Locally

```bash
# Backend server (port 5000)
node backend/server.js

# Frontend dev server (port 3000)
npm --prefix frontend run dev

# Frontend production build
npm --prefix frontend run build
```
