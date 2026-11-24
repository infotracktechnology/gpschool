import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { AppLayout } from './components/layout/AppLayout';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Boards } from './pages/Boards';
import { AcademicYears } from './pages/AcademicYears';
import { BranchList } from './pages/branches/BranchList';
import { BranchForm } from './pages/branches/BranchForm';
import { MappingList } from './pages/mappings/MappingList';
import { MappingForm } from './pages/mappings/MappingForm';
import { UserList } from './pages/users/UserList';
import { UserForm } from './pages/users/UserForm';
import { Classes } from './pages/academics/Classes';
import { Sections } from './pages/academics/Sections';
import { SubjectList } from './pages/academics/SubjectList';
import { SubjectForm } from './pages/academics/SubjectForm';
import { AcademicCalendarView } from './pages/AcademicCalendar';
import { CommunicationWorkspace } from './components/communication/CommunicationWorkspace';

// Admission Management Pages
import { EnquiryList } from './pages/admissions/EnquiryList';
import { EnquiryForm } from './pages/admissions/EnquiryForm';
import { ApplicationList } from './pages/admissions/ApplicationList';
import { ApplicationForm } from './pages/admissions/ApplicationForm';
import { AdmissionList } from './pages/admissions/AdmissionList';
import { AdmissionReports } from './pages/admissions/AdmissionReports';

// Admission Settings Pages
import { WorkflowSettings } from './pages/admissions/settings/WorkflowSettings';
import { NumberSeriesSettings } from './pages/admissions/settings/NumberSeriesSettings';
import { LeadSources } from './pages/admissions/settings/LeadSources';

// Student Management Pages
import { StudentList } from './pages/students/StudentList';
import { StudentProfile } from './pages/students/StudentProfile';
import { StudentBulkEdit } from './pages/students/StudentBulkEdit';
import { SectionChange } from './pages/students/SectionChange';
import { StudentPromotion } from './pages/students/StudentPromotion';
import { AcademicGroups } from './pages/students/AcademicGroups';
import { SubjectMapping } from './pages/students/SubjectMapping';
import { InactiveTC } from './pages/students/InactiveTC';
import { BulkCredentials } from './pages/students/BulkCredentials';

// Attendance Management Pages
import { AttendanceTimings } from './pages/attendance/AttendanceTimings';
import { TakeAttendance } from './pages/attendance/TakeAttendance';
import { AttendanceHistory } from './pages/attendance/AttendanceHistory';
import { MonthlyAttendanceReport } from './pages/attendance/MonthlyAttendanceReport';

// Staff & HRMS Module Pages
import { StaffDirectory } from './pages/staff/StaffDirectory';
import { StaffProfile } from './pages/staff/StaffProfile';
import { StaffAllocations } from './pages/staff/StaffAllocations';
import { StaffAttendance } from './pages/staff/StaffAttendance';
import { StaffLeaveManagement } from './pages/staff/StaffLeaveManagement';
import { StaffPayroll } from './pages/staff/StaffPayroll';

// Dedicated Faculty & Staff Portal Pages
import { PortalLayout } from './components/layout/PortalLayout';
import { PortalDashboard } from './pages/portal/PortalDashboard';
import { PortalProfile } from './pages/portal/PortalProfile';
import { PortalLeaves } from './pages/portal/PortalLeaves';
import { PortalLeaveApprovals } from './pages/portal/PortalLeaveApprovals';
import { PortalAttendance } from './pages/portal/PortalAttendance';
import { PortalClasses } from './pages/portal/PortalClasses';
import { PortalPayslips } from './pages/portal/PortalPayslips';
import { PortalStudentAttendance } from './pages/portal/PortalStudentAttendance';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<AppLayout />}>
            <Route index element={<Dashboard />} />
            
            {/* User Management Pages */}
            <Route path="users" element={<UserList />} />
            <Route path="users/create" element={<UserForm />} />
            <Route path="users/:id/edit" element={<UserForm />} />

            {/* Academic Structure & Subjects Module */}
            <Route path="academics/calendar" element={<AcademicCalendarView />} />
            <Route path="communication" element={<CommunicationWorkspace />} />
            <Route path="communication/:tab" element={<CommunicationWorkspace />} />
            <Route path="communication/:tab/new" element={<CommunicationWorkspace />} />
            <Route path="communication/:tab/:itemId/edit" element={<CommunicationWorkspace />} />
            <Route path="academics/classes" element={<Classes />} />
            <Route path="academics/sections" element={<Sections />} />
            <Route path="academics/subjects" element={<SubjectList />} />
            <Route path="academics/subjects/create" element={<SubjectForm />} />
            <Route path="academics/subjects/:id/edit" element={<SubjectForm />} />

            {/* Simple Masters (Quick modal-based) */}
            <Route path="settings/boards" element={<Boards />} />
            <Route path="settings/academic-years" element={<AcademicYears />} />

            {/* Major Modules (Dedicated Page-based Index / Create / Edit) */}
            <Route path="settings/branches" element={<BranchList />} />
            <Route path="settings/branches/create" element={<BranchForm />} />
            <Route path="settings/branches/:id/edit" element={<BranchForm />} />

            <Route path="settings/branch-year-mappings" element={<MappingList />} />
            <Route path="settings/branch-year-mappings/create" element={<MappingForm />} />
            <Route path="settings/branch-year-mappings/:id/edit" element={<MappingForm />} />

            {/* Admission Management Module Routes */}
            <Route path="admissions/enquiries" element={<EnquiryList />} />
            <Route path="admissions/enquiries/new" element={<EnquiryForm />} />
            <Route path="admissions/enquiries/:id/edit" element={<EnquiryForm />} />

            <Route path="admissions/applications" element={<ApplicationList />} />
            <Route path="admissions/applications/new" element={<ApplicationForm />} />
            <Route path="admissions/applications/:id/edit" element={<ApplicationForm />} />

            <Route path="admissions/students" element={<AdmissionList />} />
            <Route path="admissions/reports" element={<AdmissionReports />} />

            {/* Admission Settings Routes */}
            <Route path="settings/admission-workflow" element={<WorkflowSettings />} />
            <Route path="settings/admission-series" element={<NumberSeriesSettings />} />
            <Route path="settings/lead-sources" element={<LeadSources />} />

            {/* Student Management Module Routes */}
            <Route path="students" element={<StudentList />} />
            <Route path="students/new" element={<StudentProfile />} />
            <Route path="students/:id" element={<StudentProfile />} />
            <Route path="students/:id/edit" element={<StudentProfile />} />
            <Route path="students/bulk-edit" element={<StudentBulkEdit />} />
            <Route path="students/section-change" element={<SectionChange />} />
            <Route path="students/promotion" element={<StudentPromotion />} />
            <Route path="students/academic-groups" element={<AcademicGroups />} />
            <Route path="students/subject-mapping" element={<SubjectMapping />} />
            <Route path="students/tc" element={<InactiveTC />} />
            <Route path="students/credentials" element={<BulkCredentials />} />

            {/* Attendance Module Routes */}
            <Route path="attendance/take" element={<TakeAttendance />} />
            <Route path="attendance/history" element={<AttendanceHistory />} />
            <Route path="attendance/monthly-report" element={<MonthlyAttendanceReport />} />

            {/* Attendance Settings Route */}
            <Route path="settings/attendance-timings" element={<AttendanceTimings />} />

            {/* Staff & HRMS Module Routes */}
            <Route path="staff" element={<StaffDirectory />} />
            <Route path="staff/:id" element={<StaffProfile />} />
            <Route path="staff/allocations" element={<StaffAllocations />} />
            <Route path="staff/attendance" element={<StaffAttendance />} />
            <Route path="staff/leaves" element={<StaffLeaveManagement />} />
            <Route path="staff/payroll" element={<StaffPayroll />} />
          </Route>

          {/* Dedicated Staff Portal Routes (Strictly separated from Admin AppLayout) */}
          <Route path="/portal" element={<PortalLayout />}>
            <Route index element={<PortalDashboard />} />
            <Route path="student-attendance" element={<PortalStudentAttendance />} />
            <Route path="profile" element={<PortalProfile />} />
            <Route path="leaves" element={<PortalLeaves />} />
            <Route path="leave-approvals" element={<PortalLeaveApprovals />} />
            <Route path="attendance" element={<PortalAttendance />} />
            <Route path="classes" element={<PortalClasses />} />
            <Route path="payslips" element={<PortalPayslips />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
