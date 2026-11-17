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
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
