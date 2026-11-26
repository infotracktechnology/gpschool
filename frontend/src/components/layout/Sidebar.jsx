import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Award,
  Building2,
  Calendar,
  CalendarRange,
  ChevronRight,
  ChevronDown,
  GraduationCap,
  Layers,
  BookOpen,
  UserPlus,
  FileText,
  UserCheck,
  BarChart3,
  GitFork,
  Hash,
  Share2,
  X,
  School,
  Settings,
  FileSpreadsheet,
  ArrowRightLeft,
  TrendingUp,
  FolderKanban,
  BookMarked,
  FileBadge,
  KeyRound,
  Clock,
  CalendarCheck,
  History,
  BarChart2,
  ClipboardCheck,
  Briefcase,
  CalendarDays,
  Banknote,
  FileCheck2,
  Bell,
  MessageSquare,
  Image,
  LifeBuoy,
  LogOut,
  Printer,
  ShieldCheck,
  HeartPulse,
  Heart,
  Stethoscope,
  Pill,
  PhoneCall,
  Package,
  LayoutTemplate,
  Sparkles,
  FolderTree,
  Ruler,
  Truck,
  PackageCheck,
  Boxes,
  AlertTriangle,
  ScrollText
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const Sidebar = ({ isOpen = false, onClose = () => {} }) => {
  const { user, selectedBranch } = useAuth();
  const location = useLocation();
  const activeBranch = selectedBranch && selectedBranch.id !== 'all' ? selectedBranch : null;
  const brandLogo = activeBranch?.logo || '/assets/logo.png';
  const brandTitle = activeBranch?.name || 'Campus Eye';
  const brandSubtitle = activeBranch?.code ? `${activeBranch.code} • School ERP` : 'School ERP';

  // Close mobile sidebar on route change
  useEffect(() => {
    onClose();
  }, [location.pathname]);

  // Admission Core Menu Items
  const admissionItems = [
    {
      label: 'Enquiries',
      path: '/admissions/enquiries',
      icon: UserPlus,
    },
    {
      label: 'Applications',
      path: '/admissions/applications',
      icon: FileText,
    },
    {
      label: 'Confirmed Admissions',
      path: '/admissions/students',
      icon: UserCheck,
    },
    {
      label: 'Admission Reports',
      path: '/admissions/reports',
      icon: BarChart3,
    },
  ];

  // Student Management Menu Items
  const studentItems = [
    {
      label: 'Student Directory',
      path: '/students',
      icon: Users,
    },
    {
      label: 'Bulk Grid Editor',
      path: '/students/bulk-edit',
      icon: FileSpreadsheet,
    },
    {
      label: 'Section Allocation',
      path: '/students/section-change',
      icon: ArrowRightLeft,
    },
    {
      label: 'Student Promotion',
      path: '/students/promotion',
      icon: TrendingUp,
    },
    {
      label: 'Academic Groups',
      path: '/students/academic-groups',
      icon: FolderKanban,
    },
    {
      label: 'Subject Mapping',
      path: '/students/subject-mapping',
      icon: BookMarked,
    },
    {
      label: 'TC & Inactive Records',
      path: '/students/tc',
      icon: FileBadge,
    },
    {
      label: 'Credential Setup',
      path: '/students/credentials',
      icon: KeyRound,
    },
  ];

  // Staff & HRMS Menu Items
  const staffItems = [
    {
      label: 'Staff Directory',
      path: '/staff',
      icon: Users,
    },
    {
      label: 'Allocations',
      path: '/staff/allocations',
      icon: Layers,
    },
    {
      label: 'Staff Attendance',
      path: '/staff/attendance',
      icon: CalendarCheck,
    },
    {
      label: 'Leave Requests',
      path: '/staff/leaves',
      icon: CalendarDays,
    },
    {
      label: 'Payroll',
      path: '/staff/payroll',
      icon: Banknote,
    },
  ];

  // Attendance Module Menu Items
  const attendanceItems = [
    {
      label: 'Take Attendance',
      path: '/attendance/take',
      icon: ClipboardCheck,
    },
    {
      label: 'Attendance History',
      path: '/attendance/history',
      icon: History,
    },
    {
      label: 'Monthly Report',
      path: '/attendance/monthly-report',
      icon: BarChart2,
    },
  ];

  // Academic Settings Items
  const academicItems = [
    {
      label: 'Branches & Campuses',
      path: '/settings/branches',
      icon: Building2,
    },
    {
      label: 'Academic Years',
      path: '/settings/academic-years',
      icon: Calendar,
    },
    {
      label: 'Branch Year Mappings',
      path: '/settings/branch-year-mappings',
      icon: CalendarRange,
    },
    {
      label: 'Attendance Timings',
      path: '/settings/attendance-timings',
      icon: Clock,
    },
    {
      label: 'Classes Master',
      path: '/academics/classes',
      icon: GraduationCap,
    },
    {
      label: 'Sections Setup',
      path: '/academics/sections',
      icon: Layers,
    },
    {
      label: 'Subjects',
      path: '/academics/subjects',
      icon: BookOpen,
    },
  ];

  // Admission Settings Items
  const admissionSettingsItems = [
    {
      label: 'Workflow Pipeline',
      path: '/settings/admission-workflow',
      icon: GitFork,
    },
    {
      label: 'Number Sequences',
      path: '/settings/admission-series',
      icon: Hash,
    },
    {
      label: 'Lead Sources',
      path: '/settings/lead-sources',
      icon: Share2,
    },
  ];

    const communicationSubItems = [
    { id: 'homework', label: '1. Homework', path: '/communication/homework', icon: BookOpen },
    { id: 'assignment', label: '2. Assignment', path: '/communication/assignment', icon: FileCheck2 },
    { id: 'announcement', label: '3. Announcement', path: '/communication/announcement', icon: Bell },
    { id: 'gallery', label: '4. Gallery', path: '/communication/gallery', icon: Image },
    { id: 'audit', label: '5. Audit Trail', path: '/communication/audit', icon: History },
  ];

  // Visitor Management Sub-Menu Items
  const visitorItems = [
    {
      label: 'Visitor Overview',
      path: '/visitors',
      icon: LayoutDashboard,
      exact: true,
    },
    {
      label: 'Registration Entry',
      path: '/visitors/entry',
      icon: UserCheck,
    },
    {
      label: 'Exit / Check-Out',
      path: '/visitors/exit',
      icon: LogOut,
    },
    {
      label: 'Visitor Pass',
      path: '/visitors/passes',
      icon: Printer,
    },
    {
      label: 'Appointments',
      path: '/visitors/appointments',
      icon: Calendar,
    },
    {
      label: 'Person to Meet',
      path: '/visitors/hosts',
      icon: Users,
    },
    {
      label: 'Visitor History',
      path: '/visitors/history',
      icon: History,
    },
  ];

  // Health & Infirmary Sub-Menu Items
  const healthItems = [
    {
      label: 'Health Overview',
      path: '/health/dashboard',
      icon: LayoutDashboard,
    },
    {
      label: 'Infirmary Desk',
      path: '/health/infirmary',
      icon: HeartPulse,
    },
    {
      label: 'Health Profiles & History',
      path: '/health/profiles',
      icon: Heart,
    },
    {
      label: 'Health Check-ups',
      path: '/health/checkups',
      icon: Stethoscope,
    },
    {
      label: 'Medicine Administration',
      path: '/health/medicines',
      icon: Pill,
    },
    {
      label: 'Medicine Stock',
      path: '/health/inventory',
      icon: Package,
    },
    {
      label: 'Doctor Consultation',
      path: '/health/consultations',
      icon: FileText,
    },
    {
      label: 'Parent Alerts',
      path: '/health/notifications',
      icon: Bell,
    },
    {
      label: 'Emergency Contacts',
      path: '/health/emergency',
      icon: PhoneCall,
    },
  ];

  const isHealthActive = location.pathname.startsWith('/health');

  const certificateItems = [
    {
      label: 'Certificate Overview',
      path: '/certificates',
      icon: LayoutDashboard,
      exact: true,
    },
    {
      label: 'Template Designer',
      path: '/certificates/templates',
      icon: LayoutTemplate,
    },
    {
      label: 'Bonafide Certificate',
      path: '/certificates/bonafide',
      icon: FileText,
    },
    {
      label: 'Transfer Certificate (TC)',
      path: '/certificates/tc',
      icon: ArrowRightLeft,
    },
    {
      label: 'Study Certificate',
      path: '/certificates/study',
      icon: BookOpen,
    },
    {
      label: 'Conduct Certificate',
      path: '/certificates/conduct',
      icon: ShieldCheck,
    },
    {
      label: 'Character Certificate',
      path: '/certificates/character',
      icon: FileBadge,
    },
    {
      label: 'Custom Certificates',
      path: '/certificates/custom',
      icon: Sparkles,
    },
    {
      label: 'Approval Queue',
      path: '/certificates/approvals',
      icon: ClipboardCheck,
    },
    {
      label: 'Issue History',
      path: '/certificates/history',
      icon: History,
    },
  ];

  const isCertificateActive = location.pathname.startsWith('/certificates');

  // Inventory Management Sub-Menu Items
  const inventoryItems = [
    { label: 'Inventory Overview', path: '/inventory', icon: LayoutDashboard, exact: true },
    { label: 'Categories', path: '/inventory/categories', icon: FolderTree },
    { label: 'Units', path: '/inventory/units', icon: Ruler },
    { label: 'Suppliers', path: '/inventory/suppliers', icon: Truck },
    { label: 'Items', path: '/inventory/items', icon: Package },
    { label: 'Purchase Orders', path: '/inventory/purchase-orders', icon: FileText },
    { label: 'Goods Receipt', path: '/inventory/goods-receipt', icon: PackageCheck },
    { label: 'Stock Movements', path: '/inventory/stock-movements', icon: ArrowLeftRight },
    { label: 'Allocations', path: '/inventory/allocations', icon: Boxes },
    { label: 'Damaged Items', path: '/inventory/damaged-items', icon: AlertTriangle },
    { label: 'Reports', path: '/inventory/reports/stock', icon: BarChart3 },
    { label: 'Audit Trail', path: '/inventory/audit-trail', icon: ScrollText },
  ];

  const isInventoryActive = location.pathname.startsWith('/inventory');
  const isVisitorActive = location.pathname.startsWith('/visitors');
  const isCommunicationActive = location.pathname.startsWith('/communication');
  const isAdmissionActive = admissionItems.some((item) =>
    location.pathname.startsWith(item.path)
  );
  const isStudentActive = location.pathname.startsWith('/students');
  const isStaffActive = location.pathname.startsWith('/staff');
  const isAttendanceActive = attendanceItems.some((item) =>
    location.pathname.startsWith(item.path)
  );
  const isAcademicActive = academicItems.some((item) =>
    location.pathname.startsWith(item.path)
  );
  const isAdmissionSettingsActive = admissionSettingsItems.some((item) =>
    location.pathname.startsWith(item.path)
  );

  const [admissionOpen, setAdmissionOpen] = useState(isAdmissionActive || false);
  const [studentOpen, setStudentOpen] = useState(isStudentActive || false);
  const [staffOpen, setStaffOpen] = useState(isStaffActive || false);
  const [attendanceOpen, setAttendanceOpen] = useState(isAttendanceActive || false);
  const [visitorOpen, setVisitorOpen] = useState(isVisitorActive || false);
  const [healthOpen, setHealthOpen] = useState(isHealthActive || false);
  const [certificateOpen, setCertificateOpen] = useState(isCertificateActive || false);
  const [inventoryOpen, setInventoryOpen] = useState(isInventoryActive || false);
  const [academicOpen, setAcademicOpen] = useState(isAcademicActive || false);
  const [communicationOpen, setCommunicationOpen] = useState(isCommunicationActive || false);
  const [admissionSettingsOpen, setAdmissionSettingsOpen] = useState(
    isAdmissionSettingsActive || false
  );

  useEffect(() => {
    if (isCertificateActive) setCertificateOpen(true);
  }, [isCertificateActive]);

  useEffect(() => {
    if (isHealthActive) setHealthOpen(true);
  }, [isHealthActive]);

  useEffect(() => {
    if (isVisitorActive) setVisitorOpen(true);
  }, [isVisitorActive]);

  useEffect(() => {
    if (isStudentActive) setStudentOpen(true);
  }, [isStudentActive]);

  useEffect(() => {
    if (isStaffActive) setStaffOpen(true);
  }, [isStaffActive]);

  useEffect(() => {
    if (isAttendanceActive) setAttendanceOpen(true);
  }, [isAttendanceActive]);

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 lg:hidden transition-opacity"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 bg-white text-slate-700 flex flex-col shrink-0 border-r border-border transition-transform duration-300 ease-in-out lg:static lg:translate-x-0 ${
          isOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full lg:shadow-none'
        }`}
      >
        {/* Brand Header */}
        <div className="h-16 flex items-center justify-between px-6 border-b border-border bg-white shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <img
              src={brandLogo}
              alt={brandTitle}
              onError={(e) => {
                if (!e.currentTarget.src.endsWith('/assets/logo.png')) {
                  e.currentTarget.src = '/assets/logo.png';
                }
              }}
              className="w-9 h-9 rounded-xl object-contain bg-white shadow-sm border border-slate-100 p-0.5 shrink-0"
            />
            <div className="min-w-0">
              <h1 className="font-bold text-slate-900 text-sm leading-tight tracking-tight truncate">
                {brandTitle}
              </h1>
              <p className="text-[11px] text-brand-600 font-semibold truncate">{brandSubtitle}</p>
            </div>
          </div>

          {/* Close button on mobile */}
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 lg:hidden transition-colors"
            title="Close Sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Nav List */}
        <div className="flex-1 py-5 px-3.5 space-y-6 overflow-y-auto">
          {/* Main Menu */}
          <div>
            <p className="px-3 text-[11px] font-bold tracking-wider text-slate-400 uppercase mb-2">
              Main Menu
            </p>
            <nav className="space-y-1">
              {/* Dashboard */}
              <NavLink
                to="/"
                end
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-brand-600 text-white shadow-sm shadow-brand-600/20 font-semibold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`
                }
              >
                <LayoutDashboard className="w-4 h-4 shrink-0" />
                <span>Dashboard</span>
              </NavLink>

              {/* Admissions Dropdown / Sub-Menu */}
              <div>
                <button
                  type="button"
                  onClick={() => setAdmissionOpen((prev) => !prev)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all group ${
                    isAdmissionActive
                      ? 'text-brand-900 bg-brand-50/70 font-semibold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <UserPlus className="w-4 h-4 shrink-0 text-green-900" />
                    <span>Admissions</span>
                  </div>
                  {admissionOpen ? (
                    <ChevronDown className="w-4 h-4 text-slate-400 group-hover:text-slate-700 transition-colors" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-700 transition-colors" />
                  )}
                </button>

                {admissionOpen && (
                  <div className="mt-1 ml-3 pl-3 border-l-2 border-slate-100 space-y-1">
                    {admissionItems.map((item) => {
                      const Icon = item.icon;
                      return (
                        <NavLink
                          key={item.path}
                          to={item.path}
                          className={({ isActive }) =>
                            `flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-medium transition-all ${
                              isActive
                                ? 'bg-brand-50 text-brand-700 font-semibold border border-brand-200/80 shadow-xs'
                                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                            }`
                          }
                        >
                          <Icon className="w-3.5 h-3.5 shrink-0" />
                          <span>{item.label}</span>
                        </NavLink>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Student Management Dropdown */}
              <div>
                <button
                  type="button"
                  onClick={() => setStudentOpen((prev) => !prev)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all group ${
                    isStudentActive
                      ? 'text-brand-900 bg-brand-50/70 font-semibold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <GraduationCap className="w-4 h-4 shrink-0 text-brand-600" />
                    <span>Student Management</span>
                  </div>
                  {studentOpen ? (
                    <ChevronDown className="w-4 h-4 text-slate-400 group-hover:text-slate-700 transition-colors" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-700 transition-colors" />
                  )}
                </button>

                {studentOpen && (
                  <div className="mt-1 ml-3 pl-3 border-l-2 border-slate-100 space-y-1">
                    {studentItems.map((item) => {
                      const Icon = item.icon;
                      const isItemActive =
                        item.path === '/students'
                          ? location.pathname === '/students' ||
                            (location.pathname.startsWith('/students/') &&
                              !studentItems.some(
                                (si) =>
                                  si.path !== '/students' &&
                                  location.pathname.startsWith(si.path)
                              ))
                          : location.pathname.startsWith(item.path);

                      return (
                        <NavLink
                          key={item.path}
                          to={item.path}
                          className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-medium transition-all ${
                            isItemActive
                              ? 'bg-brand-50 text-brand-700 font-semibold border border-brand-200/80 shadow-xs'
                              : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                          }`}
                        >
                          <Icon className="w-3.5 h-3.5 shrink-0" />
                          <span>{item.label}</span>
                        </NavLink>
                      );
                    })}
                  </div>
                )}
              </div>
              
            {/* Expandable Communication Module */}
              <div>
                <button
                  type="button"
                  onClick={() => setCommunicationOpen((prev) => !prev)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all group cursor-pointer ${
                      isCommunicationActive
                        ? 'text-brand-900 bg-brand-50/70 font-semibold'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                        className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                          isCommunicationActive ? 'text-brand-600' : 'text-slate-500'
                        }`}
                      >
                        <MessageSquare className="w-4 h-4 text-indigo-600" />
                      </div>
                    <span>Communication</span>
                  </div>
                  {communicationOpen ? (
                    <ChevronDown className={`w-4 h-4 transition-transform ${isCommunicationActive ? 'text-white' : 'text-slate-400'}`} />
                  ) : (
                    <ChevronRight className={`w-4 h-4 transition-transform ${isCommunicationActive ? 'text-white' : 'text-slate-400'}`} />
                  )}
                </button>

                {communicationOpen && (
                  <div className="mt-1 ml-3 pl-3 border-l-2 border-slate-100 space-y-1">
                    {communicationSubItems.map((sub) => {
                      const SubIcon = sub.icon;
                      const isSubActive =
                        location.pathname === sub.path ||
                        location.pathname.startsWith(`${sub.path}/`) ||
                        (location.pathname === '/communication' && sub.id === 'homework');
                      return (
                        <NavLink
                          key={sub.id}
                          to={sub.path}
                          className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                            isSubActive
                              ? 'bg-brand-50 text-brand-700 font-semibold border border-brand-200/80 shadow-xs'
                              : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                          }`}
                        >
                          <SubIcon className="w-3.5 h-3.5 shrink-0" />
                          <span className="truncate">{sub.label}</span>
                        </NavLink>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Staff & HRMS Dropdown */}
              <div>
                <button
                  type="button"
                  onClick={() => setStaffOpen((prev) => !prev)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all group ${
                    isStaffActive
                      ? 'text-brand-900 bg-brand-50/70 font-semibold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Briefcase className="w-4 h-4 shrink-0 text-brand-600" />
                    <span>Staff & HRMS</span>
                  </div>
                  {staffOpen ? (
                    <ChevronDown className="w-4 h-4 text-slate-400 group-hover:text-slate-700 transition-colors" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-700 transition-colors" />
                  )}
                </button>

                {staffOpen && (
                  <div className="mt-1 ml-3 pl-3 border-l-2 border-slate-100 space-y-1">
                    {staffItems.map((item) => {
                      const Icon = item.icon;
                      const isItemActive =
                        item.path === '/staff'
                          ? location.pathname === '/staff' ||
                            (location.pathname.startsWith('/staff/') &&
                              !staffItems.some(
                                (si) =>
                                  si.path !== '/staff' &&
                                  location.pathname.startsWith(si.path)
                              ))
                          : location.pathname.startsWith(item.path);

                      return (
                        <NavLink
                          key={item.path}
                          to={item.path}
                          className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-medium transition-all ${
                            isItemActive
                              ? 'bg-brand-50 text-brand-700 font-semibold border border-brand-200/80 shadow-xs'
                              : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                          }`}
                        >
                          <Icon className="w-3.5 h-3.5 shrink-0" />
                          <span>{item.label}</span>
                        </NavLink>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Attendance Management Dropdown */}
              {(!user?.role || ['super_admin', 'admin', 'principal', 'teacher'].includes(user?.role)) && (
                <div>
                  <button
                    type="button"
                    onClick={() => setAttendanceOpen((prev) => !prev)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all group ${
                      isAttendanceActive
                        ? 'text-brand-900 bg-brand-50/70 font-semibold'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <CalendarCheck className="w-4 h-4 shrink-0 text-emerald-600" />
                      <span>Attendance</span>
                    </div>
                    {attendanceOpen ? (
                      <ChevronDown className="w-4 h-4 text-slate-400 group-hover:text-slate-700 transition-colors" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-700 transition-colors" />
                    )}
                  </button>

                  {attendanceOpen && (
                    <div className="mt-1 ml-3 pl-3 border-l-2 border-slate-100 space-y-1">
                      {attendanceItems.map((item) => {
                        const Icon = item.icon;
                        const isItemActive = location.pathname.startsWith(item.path);
                        return (
                          <NavLink
                            key={item.path}
                            to={item.path}
                            className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-medium transition-all ${
                              isItemActive
                                ? 'bg-brand-50 text-brand-700 font-semibold border border-brand-200/80 shadow-xs'
                                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                            }`}
                          >
                            <Icon className="w-3.5 h-3.5 shrink-0" />
                            <span>{item.label}</span>
                          </NavLink>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Academic Calendar - Standalone Menu */}
                <NavLink
                  to="/academics/calendar"
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                      isActive
                        ? 'bg-brand-600 text-white shadow-sm shadow-brand-600/20 font-semibold'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`
                  }
                >
                  <Calendar className="w-4 h-4 shrink-0 text-orange-600" />
                  <span>Academic Calendar</span>
                </NavLink>

              {/* Visitor Management Dropdown (6 Sub-Menus) */}
              <div>
                <button
                  type="button"
                  onClick={() => setVisitorOpen((prev) => !prev)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all group ${
                    isVisitorActive
                      ? 'text-brand-900 bg-brand-50/70 font-semibold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <ShieldCheck className="w-4 h-4 shrink-0 text-teal-600" />
                    <span>Visitor Management</span>
                  </div>
                  {visitorOpen ? (
                    <ChevronDown className="w-4 h-4 text-slate-400 group-hover:text-slate-700 transition-colors" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-700 transition-colors" />
                  )}
                </button>

                {visitorOpen && (
                  <div className="mt-1 ml-3 pl-3 border-l-2 border-slate-100 space-y-1">
                    {visitorItems.map((item) => {
                      const Icon = item.icon;
                      const isItemActive = item.exact
                        ? location.pathname === item.path
                        : location.pathname.startsWith(item.path);
                      return (
                        <NavLink
                          key={item.path}
                          to={item.path}
                          className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-medium transition-all ${
                            isItemActive
                              ? 'bg-brand-50 text-brand-700 font-semibold border border-brand-200/80 shadow-xs'
                              : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                          }`}
                        >
                          <Icon className="w-3.5 h-3.5 shrink-0" />
                          <span>{item.label}</span>
                        </NavLink>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Health & Infirmary Dropdown (6 Sub-Menus) */}
              <div>
                <button
                  type="button"
                  onClick={() => setHealthOpen((prev) => !prev)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all group ${
                    isHealthActive
                      ? 'text-rose-900 bg-rose-50/70 font-semibold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <HeartPulse className="w-4 h-4 shrink-0 text-rose-600" />
                    <span>Health & Infirmary</span>
                  </div>
                  {healthOpen ? (
                    <ChevronDown className="w-4 h-4 text-slate-400 group-hover:text-slate-700 transition-colors" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-700 transition-colors" />
                  )}
                </button>

                {healthOpen && (
                  <div className="mt-1 ml-3 pl-3 border-l-2 border-slate-100 space-y-1">
                    {healthItems.map((item) => {
                      const Icon = item.icon;
                      const isItemActive = location.pathname.startsWith(item.path);
                      return (
                        <NavLink
                          key={item.path}
                          to={item.path}
                          className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-medium transition-all ${
                            isItemActive
                              ? 'bg-rose-50 text-rose-700 font-semibold border border-rose-200/80 shadow-xs'
                              : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                          }`}
                        >
                          <Icon className="w-3.5 h-3.5 shrink-0" />
                          <span>{item.label}</span>
                        </NavLink>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Certificate Management Dropdown (10 Sub-Menus) */}
              <div>
                <button
                  type="button"
                  onClick={() => setCertificateOpen((prev) => !prev)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all group ${
                    isCertificateActive
                      ? 'text-indigo-900 bg-indigo-50/80 font-semibold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Award className="w-4 h-4 shrink-0 text-indigo-600" />
                    <span>Certificate Mgmt</span>
                  </div>
                  {certificateOpen ? (
                    <ChevronDown className="w-4 h-4 text-slate-400 group-hover:text-slate-700 transition-colors" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-700 transition-colors" />
                  )}
                </button>

                {certificateOpen && (
                  <div className="mt-1 ml-3 pl-3 border-l-2 border-slate-100 space-y-1">
                    {certificateItems.map((item) => {
                      const Icon = item.icon;
                      const isItemActive = item.exact
                        ? location.pathname === item.path
                        : location.pathname.startsWith(item.path);
                      return (
                        <NavLink
                          key={item.path}
                          to={item.path}
                          className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-medium transition-all ${
                            isItemActive
                              ? 'bg-indigo-50 text-indigo-700 font-semibold border border-indigo-200/80 shadow-xs'
                              : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                          }`}
                        >
                          <Icon className="w-3.5 h-3.5 shrink-0" />
                          <span>{item.label}</span>
                        </NavLink>
                      );
                    })}
                  </div>
                )}
              </div>
              
              {/* Inventory Management Dropdown */}
              <div>
                <button
                  type="button"
                  onClick={() => setInventoryOpen((prev) => !prev)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all group ${
                    isInventoryActive
                      ? 'text-teal-900 bg-teal-50/80 font-semibold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Boxes className="w-4 h-4 shrink-0 text-teal-600" />
                    <span>Inventory Mgmt</span>
                  </div>
                  {inventoryOpen ? (
                    <ChevronDown className="w-4 h-4 text-slate-400 group-hover:text-slate-700 transition-colors" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-700 transition-colors" />
                  )}
                </button>

                {inventoryOpen && (
                  <div className="mt-1 ml-3 pl-3 border-l-2 border-slate-100 space-y-1">
                    {inventoryItems.map((item) => {
                      const Icon = item.icon;
                      const isItemActive = item.exact
                        ? location.pathname === item.path
                        : location.pathname.startsWith(item.path);
                      return (
                        <NavLink
                          key={item.path}
                          to={item.path}
                          className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-medium transition-all ${
                            isItemActive
                              ? 'bg-teal-50 text-teal-700 font-semibold border border-teal-200/80 shadow-xs'
                              : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                          }`}
                        >
                          <Icon className="w-3.5 h-3.5 shrink-0" />
                          <span>{item.label}</span>
                        </NavLink>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* User Management */}
              <NavLink
                to="/users"
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-brand-600 text-white shadow-sm shadow-brand-600/20 font-semibold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`
                }
              >
                <Users className="w-4 h-4 shrink-0" />
                <span>User Management</span>
              </NavLink>

              {/* Concern Desk */}
              <NavLink
                to="/concerns"
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-brand-600 text-white shadow-sm shadow-brand-600/20 font-semibold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`
                }
              >
                <LifeBuoy className="w-4 h-4 shrink-0 text-amber-500" />
                <span>Concern Desk</span>
              </NavLink>
            </nav>
          </div>

          {/* Settings & Masters */}
          <div>
            <p className="px-3 text-[11px] font-bold tracking-wider text-slate-400 uppercase mb-2">
              System Settings
            </p>
            <nav className="space-y-1">
              <div>
                <button
                  type="button"
                  onClick={() => setAcademicOpen((prev) => !prev)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all group ${
                    isAcademicActive
                      ? 'text-brand-900 bg-brand-50/70 font-semibold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <GraduationCap className="w-4 h-4 shrink-0 text-brand-600" />
                    <span>Academic Settings</span>
                  </div>
                  {academicOpen ? (
                    <ChevronDown className="w-4 h-4 text-slate-400 group-hover:text-slate-700 transition-colors" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-700 transition-colors" />
                  )}
                </button>

                {academicOpen && (
                  <div className="mt-1 ml-3 pl-3 border-l-2 border-slate-100 space-y-1">
                    {academicItems.map((item) => {
                      const Icon = item.icon;
                      return (
                        <NavLink
                          key={item.path}
                          to={item.path}
                          className={({ isActive }) =>
                            `flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-medium transition-all ${
                              isActive
                                ? 'bg-brand-50 text-brand-700 font-semibold border border-brand-200/80 shadow-xs'
                                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                            }`
                          }
                        >
                          <Icon className="w-3.5 h-3.5 shrink-0" />
                          <span>{item.label}</span>
                        </NavLink>
                      );
                    })}
                  </div>
                )}
              </div>

          
              {/* Admission Settings Dropdown */}
              <div>
                <button
                  type="button"
                  onClick={() => setAdmissionSettingsOpen((prev) => !prev)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all group ${
                    isAdmissionSettingsActive
                      ? 'text-brand-900 bg-brand-50/70 font-semibold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Settings className="w-4 h-4 shrink-0 text-red-600" />
                    <span>Admission Settings</span>
                  </div>
                  {admissionSettingsOpen ? (
                    <ChevronDown className="w-4 h-4 text-slate-400 group-hover:text-slate-700 transition-colors" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-700 transition-colors" />
                  )}
                </button>

                {admissionSettingsOpen && (
                  <div className="mt-1 ml-3 pl-3 border-l-2 border-slate-100 space-y-1">
                    {admissionSettingsItems.map((item) => {
                      const Icon = item.icon;
                      return (
                        <NavLink
                          key={item.path}
                          to={item.path}
                          className={({ isActive }) =>
                            `flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-medium transition-all ${
                              isActive
                                ? 'bg-brand-50 text-brand-700 font-semibold border border-brand-200/80 shadow-xs'
                                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                            }`
                          }
                        >
                          <Icon className="w-3.5 h-3.5 shrink-0" />
                          <span>{item.label}</span>
                        </NavLink>
                      );
                    })}
                  </div>
                )}
              </div>
            </nav>
          </div>
        </div>

        {/* User Card Footer */}
        <div className="p-4 border-t border-border bg-slate-50/70 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-brand-600 text-white flex items-center justify-center text-xs font-bold uppercase shadow-xs">
              {user?.name?.charAt(0) || 'A'}
            </div>
            <div className="overflow-hidden flex-1">
              <p className="text-xs font-semibold text-slate-900 truncate">
                {user?.name || 'Administrator'}
              </p>
              <p className="text-[11px] text-slate-500 capitalize truncate font-medium">
                {user?.role?.replace('_', ' ') || 'Super Admin'}
              </p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};
