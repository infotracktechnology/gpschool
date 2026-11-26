# Green Park International Senior Secondary School ERP & HRMS Suite

A comprehensive, enterprise-grade School Management & Human Resource Management System (HRMS) built for CBSE-affiliated K-12 institutions.

---

## 🏛️ System Architecture: The 3-Portal Ecosystem

Green Park School ERP enforces a **strict architectural separation** across three distinct, purpose-built workspaces:

1. **Administration ERP (`/*`)**: Dedicated to Super Admins, Campus Administrators, and Principals for institutional governance, admissions, fee structures, academic master setups, allocations, biometric sync, payroll disbursement, and helpdesk triage.
2. **Dedicated Faculty & Staff Portal (`/portal/*`)**: A streamlined workspace designed specifically for teachers and non-teaching staff, isolated from administrative settings and menus.
3. **Dedicated Student & Parent Portal (`/student/*`)**: An intuitive portal for students and parents featuring homework, assignments, timetable, announcements, gallery, attendance, and self-service helpdesk tickets.

```
                              ┌────────────────────────────────────────┐
                              │            Login Screen                │
                              │           (/login page)                │
                              └──────────────────┬─────────────────────┘
                                                 │
            ┌────────────────────────────────────┼────────────────────────────────────┐
            │                                    │                                    │
  Role: super_admin / admin             Role: teacher / staff                    Role: student
            │                                    │                                    │
            ▼                                    ▼                                    ▼
┌───────────────────────────────┐  ┌──────────────────────────────────┐  ┌─────────────────────────────────┐
│       Admin ERP (/*)          │  │     Dedicated Staff Portal       │  │     Dedicated Student Portal    │
│ • Admissions Management       │  │          (/portal/*)             │  │          (/student/*)           │
│ • Student Lifecycle & Groups  │  │ • Dashboard (Punch & Schedule)   │  │ • Student Dashboard            │
│ • Master Settings & Boards    │  │ • My Profile (Read-Only 360°)    │  │ • Homework & Assignments       │
│ • Staff Directory & Bulk Imp  │  │ • Student Attendance (AM / PM)   │  │ • Attendance & Calendar        │
│ • Staff Allocations & Reports │  │ • My Leaves (CL, SL, EL, OD)     │  │ • Announcements & Gallery      │
│ • Biometric Attendance (ePush)│  │ • Leave Approvals (Approvers)    │  │ • My Profile                   │
│ • Payroll & Payslip Engine    │  │ • My Attendance & Timetable      │  │ • Helpdesk & Concerns          │
│ • Concern Desk (/concerns)    │  │ • My Classes & Subject Alloc     │  │   (/student/concerns)          │
└───────────────────────────────┘  │ • My Payslips (Printable PDF)    │  └─────────────────────────────────┘
                                   │ • Concerns (/portal/concerns)    │
                                   └──────────────────────────────────┘
```

---

## 🚀 Key Modules & Capabilities

### 1. 3-Portal Concern Management Suite (Helpdesk & Grievance Redressal)
* **Student Portal Surface (`/student/concerns`)**:
  * **Ticket Tracking**: Live list of student/parent concerns with Ticket No (`TKT-YYYY-XXXX`), category badges, priority indicators with SLA countdowns, and real-time status badges (`Open`, `In Progress`, `Resolved`, `Closed`).
  * **Raise Concern Modal**: Fast entry form supporting 6 major institutional categories: *Academic*, *Transport*, *Fee & Accounts*, *Facilities & Infrastructure*, *Canteen & Food*, *Safety & Security*.
  * **Resolution Review**: View the school's official resolution notes and action timestamp upon ticket resolution.
* **Staff Portal Surface (`/portal/concerns`)**:
  * **Tab 1 ("Assigned to Me")**: Resolve student and departmental tickets routed to this faculty member. Action buttons to start investigation (`In Progress`), submit official resolution notes, or escalate.
  * **Tab 2 ("My Raised Grievances")**: Track internal workplace & HR requests raised by this staff member.
  * **Raise Concern Modal**: Toggle to either **"Raise Staff Grievance"** or **"Log on Behalf of Student"** (picking from their assigned classes).
* **Admin ERP Surface (`/concerns`)**:
  * **Executive Metric Cards**: Real-time counters for Total Tickets, Open/Triage, In Progress, Resolved, and Overdue SLA / Escalated.
  * **Multi-Filter Controls**: Toggle between Combined All Tickets, Student Concerns, and Staff Workplace Grievances; filter by Department, Priority, Status, and Search.
  * **Management Actions**: 1-click Department/Staff Reassignment, Manual Escalation to Principal with justification note, and Final Resolution submission.
* **SLA & Escalation Rules**:
  * **Tiered Priority SLAs**: Urgent (12h), High (24h), Medium (48h), Low (72h) with red overdue badges.
  * **Hybrid Escalation**: Automatic escalation flag if overdue past SLA + Manual "Escalate to Principal" button.

---

### 2. Student Attendance in Staff Portal (`/portal/student-attendance`)
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

### 3. Staff Allocations Suite (`/staff/allocations`)
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

### 4. Staff Bulk-Import Engine (`/staff`)
* **Dual Template Downloads**:
  * **Basic Template (10 columns)**: Core fields for rapid onboarding (`first_name`, `last_name`, `gender`, `staff_type`, `department`, `designation`, `phone`, `email`, `date_of_joining`, `branch_code`).
  * **Full 360° Template (25 columns)**: Extended employee attributes including PAN, Aadhaar, DOB, blood group, qualifications, bank account, IFSC, PF UAN, ESI IP, and basic pay.
* **Intelligent Processing**:
  * Client-side CSV parser with live validation preview grid.
  * Duplicate collision detection checking against existing staff in the database and duplicate entries within the file.
  * **Automated Institutional Emp Code**: Sequential generation (`{BranchCode}-T-001` for teaching, `{BranchCode}-NT-001` for non-teaching).
  * **Automated Login Credentials**: Synchronizes into `users` table (`username = emp_no`, unhashed plain-text password `phone` or `DOB DDMMYYYY`, `role = teacher` or `staff`).

---

### 5. Dedicated Faculty & Staff Portal (`/portal/*`)
* **Custom Portal Layout (`PortalLayout`)**: Distinct emerald/slate aesthetic tailored for mobile and desktop screens, strictly separate from administrative navigation.
* **Pages**:
  1. **Dashboard (`/portal`)**: Personalized welcome, today's biometric punch status, teaching timetable, and leave quota gauges.
  2. **Student Attendance (`/portal/student-attendance`)**: Session-based morning/afternoon attendance entry, edit lock, and FCM absent alerts.
  3. **Concerns & Helpdesk (`/portal/concerns`)**: Resolve assigned student concerns and track personal staff grievances.
  4. **My Profile (`/portal/profile`)**: Read-only 360° dossier across 5 tabs (Personal, Employment, Qualification, Bank & Statutory, Documents).
  5. **My Leaves (`/portal/leaves`)**: Live quota cards (CL, SL, EL, OD), "Apply for Leave" modal with duration calculation, and history timeline.
  6. **Leave Approvals (`/portal/leave-approvals`)**: Visible exclusively to authorized approvers (Principals, Admins, Coordinators/HODs).
  7. **My Attendance (`/portal/attendance`)**: Monthly calendar register of daily punch times, attendance statuses, working days, and attendance percentage.
  8. **My Classes & Allocations (`/portal/classes`)**: Primary Class Teacher leadership card, subject allocations, and weekly teaching timetable matrix.
  9. **My Payslips (`/portal/payslips`)**: Historical salary register, earnings and deductions breakdown, and official printable branded salary slip modal.

---

### 6. Staff Payroll & Statutory Disbursal Engine (`/staff/payroll`)
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
| **Student Portal** | `GPS/2026/001` | `9845012345` | Dedicated Student Portal (`/student`) |

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
