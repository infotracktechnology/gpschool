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

// Dedicated Student Web Portal Pages
import { StudentLayout } from './components/layout/StudentLayout';
import StudentDashboard from './pages/student/StudentDashboard';
import StudentHomework from './pages/student/StudentHomework';
import StudentAssignments from './pages/student/StudentAssignments';
import StudentAttendance from './pages/student/StudentAttendance';
import StudentProfileView from './pages/student/StudentProfileView';
import StudentCalendar from './pages/student/StudentCalendar';
import StudentAnnouncements from './pages/student/StudentAnnouncements';
import StudentGallery from './pages/student/StudentGallery';
import { StudentConcerns } from './pages/student/StudentConcerns';

// Institutional Concern Management (Admin ERP)
import { ConcernManagement } from './pages/concerns/ConcernManagement';

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
import { PortalConcerns } from './pages/portal/PortalConcerns';
import { PortalVisitors } from './pages/portal/PortalVisitors';

// Visitor Management Pages (Admin ERP - Modal-Free Architecture)
import { VisitorDashboard } from './pages/visitors/VisitorDashboard';
import { VisitorEntry } from './pages/visitors/VisitorEntry';
import { VisitorExit } from './pages/visitors/VisitorExit';
import { VisitorCheckoutPage } from './pages/visitors/VisitorCheckoutPage';
import { VisitorPass } from './pages/visitors/VisitorPass';
import { Appointments } from './pages/visitors/Appointments';
import { AppointmentForm } from './pages/visitors/AppointmentForm';
import { PersonToMeet } from './pages/visitors/PersonToMeet';
import { HostExtensionForm } from './pages/visitors/HostExtensionForm';
import { VisitorHistory } from './pages/visitors/VisitorHistory';

// Infirmary & Health Management Pages (Modal-Free Architecture)
import { HealthDashboard } from './pages/health/HealthDashboard';
import { InfirmaryDesk } from './pages/health/InfirmaryDesk';
import { InfirmaryVisitForm } from './pages/health/InfirmaryVisitForm';
import { InfirmaryVisitPrint } from './pages/health/InfirmaryVisitPrint';
import { HealthProfiles } from './pages/health/HealthProfiles';
import { HealthProfileDetail } from './pages/health/HealthProfileDetail';
import { HealthProfileForm } from './pages/health/HealthProfileForm';
import { HealthCheckups } from './pages/health/HealthCheckups';
import { HealthCheckupForm } from './pages/health/HealthCheckupForm';
import { HealthCheckupPrint } from './pages/health/HealthCheckupPrint';
import { MedicineAdministration } from './pages/health/MedicineAdministration';
import { MedicineForm } from './pages/health/MedicineForm';
import { MedicineInventory } from './pages/health/MedicineInventory';
import { MedicineInventoryForm } from './pages/health/MedicineInventoryForm';
import { DoctorConsultation } from './pages/health/DoctorConsultation';
import { ConsultationForm } from './pages/health/ConsultationForm';
import { ConsultationPrint } from './pages/health/ConsultationPrint';
import { EmergencyDirectory } from './pages/health/EmergencyDirectory';
import { ParentNotifications } from './pages/health/ParentNotifications';
import { ParentNotificationForm } from './pages/health/ParentNotificationForm';
import { StudentHealth } from './pages/student/StudentHealth';
import { PortalHealth } from './pages/portal/PortalHealth';
import { CertificateDashboard } from './pages/certificates/CertificateDashboard';
import { CertificateTemplates } from './pages/certificates/CertificateTemplates';
import { CertificateTemplateForm } from './pages/certificates/CertificateTemplateForm';
import { CertificateTypeRegister } from './pages/certificates/CertificateTypeRegister';
import { CertificateFormPage } from './pages/certificates/CertificateFormPage';
import { CertificateApprovals } from './pages/certificates/CertificateApprovals';
import { CertificateApprovalReview } from './pages/certificates/CertificateApprovalReview';
import { CertificateHistory } from './pages/certificates/CertificateHistory';
import { CertificatePrintView } from './pages/certificates/CertificatePrintView';

// Inventory Management Pages (Modal-Free Architecture)
import { InventoryDashboard } from './pages/inventory/InventoryDashboard';
import { InventoryCategories } from './pages/inventory/InventoryCategories';
import { InventoryUnits } from './pages/inventory/InventoryUnits';
import { InventorySuppliers } from './pages/inventory/InventorySuppliers';
import { InventorySupplierForm } from './pages/inventory/InventorySupplierForm';
import { InventoryItems } from './pages/inventory/InventoryItems';
import { InventoryItemForm } from './pages/inventory/InventoryItemForm';
import { InventoryItemView } from './pages/inventory/InventoryItemView';
import { PurchaseOrders } from './pages/inventory/PurchaseOrders';
import { PurchaseOrderForm } from './pages/inventory/PurchaseOrderForm';
import { PurchaseOrderView } from './pages/inventory/PurchaseOrderView';
import { GoodsReceipt } from './pages/inventory/GoodsReceipt';
import { GoodsReceiptForm } from './pages/inventory/GoodsReceiptForm';
import { GoodsReceiptView } from './pages/inventory/GoodsReceiptView';
import { StockMovements } from './pages/inventory/StockMovements';
import { StockOperationForm } from './pages/inventory/StockOperationForm';
import { StockTransferForm } from './pages/inventory/StockTransferForm';
import { Allocations } from './pages/inventory/Allocations';
import { AllocationForm } from './pages/inventory/AllocationForm';
import { AllocationView } from './pages/inventory/AllocationView';
import { DamagedItems } from './pages/inventory/DamagedItems';
import { DamageReportForm, DamageInspectForm, DamageView } from './pages/inventory/DamagedItemsForms';
import { InventoryStockReport, InventoryMovementReport, InventorySupplierReport, InventoryAllocationReport, InventoryDamageReport } from './pages/inventory/InventoryReports';
import { InventoryAuditTrail } from './pages/inventory/InventoryAuditTrail';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />

          {/* Dedicated Student Web Portal Routes */}
          <Route path="/student" element={<StudentLayout />}>
            <Route index element={<Navigate to="/student/dashboard" replace />} />
            <Route path="dashboard" element={<StudentDashboard />} />
            <Route path="homework" element={<StudentHomework />} />
            <Route path="assignments" element={<StudentAssignments />} />
            <Route path="attendance" element={<StudentAttendance />} />
            <Route path="calendar" element={<StudentCalendar />} />
            <Route path="announcements" element={<StudentAnnouncements />} />
            <Route path="gallery" element={<StudentGallery />} />
            <Route path="profile" element={<StudentProfileView />} />
            <Route path="concerns" element={<StudentConcerns />} />
            <Route path="health" element={<StudentHealth />} />
          </Route>
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

            {/* Concern Desk Route */}
            <Route path="concerns" element={<ConcernManagement />} />

            {/* Visitor Management Module (Dedicated Page Architecture - Zero Modals) */}
            <Route path="visitors" element={<VisitorDashboard />} />
            <Route path="visitors/entry" element={<VisitorEntry />} />
            <Route path="visitors/entry/:id/edit" element={<VisitorEntry />} />
            <Route path="visitors/exit" element={<VisitorExit />} />
            <Route path="visitors/exit/:id" element={<VisitorCheckoutPage />} />
            <Route path="visitors/passes" element={<VisitorPass />} />
            <Route path="visitors/passes/:id" element={<VisitorPass />} />
            <Route path="visitors/appointments" element={<Appointments />} />
            <Route path="visitors/appointments/new" element={<AppointmentForm />} />
            <Route path="visitors/appointments/:id/edit" element={<AppointmentForm />} />
            <Route path="visitors/hosts" element={<PersonToMeet />} />
            <Route path="visitors/hosts/:staffId/edit" element={<HostExtensionForm />} />
            <Route path="visitors/history" element={<VisitorHistory />} />

            {/* Health & Infirmary Module (Dedicated Page Architecture - Zero Modals) */}
            <Route path="health" element={<Navigate to="/health/dashboard" replace />} />
            <Route path="health/dashboard" element={<HealthDashboard />} />
            <Route path="health/infirmary" element={<InfirmaryDesk />} />
            <Route path="health/infirmary/new" element={<InfirmaryVisitForm />} />
            <Route path="health/infirmary/:id/edit" element={<InfirmaryVisitForm />} />
            <Route path="health/infirmary/:id/print" element={<InfirmaryVisitPrint />} />
            <Route path="health/profiles" element={<HealthProfiles />} />
            <Route path="health/profiles/:type/:id" element={<HealthProfileDetail />} />
            <Route path="health/profiles/:type/:id/edit" element={<HealthProfileForm />} />
            <Route path="health/checkups" element={<HealthCheckups />} />
            <Route path="health/checkups/new" element={<HealthCheckupForm />} />
            <Route path="health/checkups/:id/edit" element={<HealthCheckupForm />} />
            <Route path="health/checkups/:id/print" element={<HealthCheckupPrint />} />
            <Route path="health/medicines" element={<MedicineAdministration />} />
            <Route path="health/medicines/new" element={<MedicineForm />} />
            <Route path="health/medicines/:id/edit" element={<MedicineForm />} />
            <Route path="health/inventory" element={<MedicineInventory />} />
            <Route path="health/inventory/new" element={<MedicineInventoryForm />} />
            <Route path="health/inventory/:id/edit" element={<MedicineInventoryForm />} />
            <Route path="health/consultations" element={<DoctorConsultation />} />
            <Route path="health/consultations/new" element={<ConsultationForm />} />
            <Route path="health/consultations/:id/edit" element={<ConsultationForm />} />
            <Route path="health/consultations/:id/print" element={<ConsultationPrint />} />
            <Route path="health/emergency" element={<EmergencyDirectory />} />
            <Route path="health/notifications" element={<ParentNotifications />} />
            <Route path="health/notifications/new" element={<ParentNotificationForm />} />
            <Route path="health/notifications/:id/edit" element={<ParentNotificationForm />} />

            {/* Certificate Management */}
            <Route path="certificates" element={<CertificateDashboard />} />
            <Route path="certificates/templates" element={<CertificateTemplates />} />
            <Route path="certificates/templates/new" element={<CertificateTemplateForm />} />
            <Route path="certificates/templates/:id/edit" element={<CertificateTemplateForm />} />

            <Route path="certificates/bonafide" element={<CertificateTypeRegister certType="bonafide" />} />
            <Route path="certificates/bonafide/new" element={<CertificateFormPage mode="create" defaultType="bonafide" />} />
            <Route path="certificates/tc" element={<CertificateTypeRegister certType="tc" />} />
            <Route path="certificates/tc/new" element={<CertificateFormPage mode="create" defaultType="tc" />} />
            <Route path="certificates/study" element={<CertificateTypeRegister certType="study" />} />
            <Route path="certificates/study/new" element={<CertificateFormPage mode="create" defaultType="study" />} />
            <Route path="certificates/conduct" element={<CertificateTypeRegister certType="conduct" />} />
            <Route path="certificates/conduct/new" element={<CertificateFormPage mode="create" defaultType="conduct" />} />
            <Route path="certificates/character" element={<CertificateTypeRegister certType="character" />} />
            <Route path="certificates/character/new" element={<CertificateFormPage mode="create" defaultType="character" />} />
            <Route path="certificates/custom" element={<CertificateTypeRegister certType="custom" />} />
            <Route path="certificates/custom/new" element={<CertificateFormPage mode="create" defaultType="custom" />} />

            <Route path="certificates/edit/:id" element={<CertificateFormPage mode="edit" />} />
            <Route path="certificates/approvals" element={<CertificateApprovals />} />
            <Route path="certificates/approvals/:id" element={<CertificateApprovalReview />} />
            <Route path="certificates/history" element={<CertificateHistory />} />
            <Route path="certificates/view/:id/print" element={<CertificatePrintView />} />

            {/* Inventory Management */}
            <Route path="inventory" element={<InventoryDashboard />} />
            <Route path="inventory/categories" element={<InventoryCategories />} />
            <Route path="inventory/units" element={<InventoryUnits />} />
            <Route path="inventory/suppliers" element={<InventorySuppliers />} />
            <Route path="inventory/suppliers/new" element={<InventorySupplierForm />} />
            <Route path="inventory/suppliers/:id/edit" element={<InventorySupplierForm />} />
            <Route path="inventory/items" element={<InventoryItems />} />
            <Route path="inventory/items/new" element={<InventoryItemForm />} />
            <Route path="inventory/items/:id" element={<InventoryItemView />} />
            <Route path="inventory/items/:id/edit" element={<InventoryItemForm />} />
            <Route path="inventory/purchase-orders" element={<PurchaseOrders />} />
            <Route path="inventory/purchase-orders/new" element={<PurchaseOrderForm />} />
            <Route path="inventory/purchase-orders/:id/edit" element={<PurchaseOrderForm />} />
            <Route path="inventory/purchase-orders/:id/view" element={<PurchaseOrderView />} />
            <Route path="inventory/goods-receipt" element={<GoodsReceipt />} />
            <Route path="inventory/goods-receipt/new/:poId" element={<GoodsReceiptForm />} />
            <Route path="inventory/goods-receipt/:id/view" element={<GoodsReceiptView />} />
            <Route path="inventory/stock-movements" element={<StockMovements />} />
            <Route path="inventory/stock/in" element={<StockOperationForm mode="in" />} />
            <Route path="inventory/stock/out" element={<StockOperationForm mode="out" />} />
            <Route path="inventory/stock/adjust" element={<StockOperationForm mode="adjust" />} />
            <Route path="inventory/stock/transfer/new" element={<StockTransferForm />} />
            <Route path="inventory/stock/transfer/:id" element={<StockTransferForm />} />
            <Route path="inventory/allocations" element={<Allocations />} />
            <Route path="inventory/allocations/new" element={<AllocationForm />} />
            <Route path="inventory/allocations/:id/edit" element={<AllocationForm />} />
            <Route path="inventory/allocations/:id/view" element={<AllocationView />} />
            <Route path="inventory/damaged-items" element={<DamagedItems />} />
            <Route path="inventory/damaged-items/new" element={<DamageReportForm />} />
            <Route path="inventory/damaged-items/:id/inspect" element={<DamageInspectForm />} />
            <Route path="inventory/damaged-items/:id/view" element={<DamageView />} />
            <Route path="inventory/reports/stock" element={<InventoryStockReport />} />
            <Route path="inventory/reports/movement" element={<InventoryMovementReport />} />
            <Route path="inventory/reports/supplier" element={<InventorySupplierReport />} />
            <Route path="inventory/reports/allocation" element={<InventoryAllocationReport />} />
            <Route path="inventory/reports/damage" element={<InventoryDamageReport />} />
            <Route path="inventory/audit-trail" element={<InventoryAuditTrail />} />
          </Route>

          {/* Dedicated Staff Portal Routes (Strictly separated from Admin AppLayout) */}
          <Route path="/portal" element={<PortalLayout />}>
            <Route index element={<PortalDashboard />} />
            <Route path="student-attendance" element={<PortalStudentAttendance />} />
            <Route path="visitors" element={<PortalVisitors />} />
            <Route path="health" element={<PortalHealth />} />
            <Route path="profile" element={<PortalProfile />} />
            <Route path="leaves" element={<PortalLeaves />} />
            <Route path="leave-approvals" element={<PortalLeaveApprovals />} />
            <Route path="attendance" element={<PortalAttendance />} />
            <Route path="classes" element={<PortalClasses />} />
            <Route path="payslips" element={<PortalPayslips />} />
            <Route path="concerns" element={<PortalConcerns />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
