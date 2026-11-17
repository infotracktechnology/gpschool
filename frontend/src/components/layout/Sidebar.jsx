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
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const Sidebar = ({ isOpen = false, onClose = () => {} }) => {
  const { user } = useAuth();
  const location = useLocation();

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

  const isAdmissionActive = admissionItems.some((item) =>
    location.pathname.startsWith(item.path)
  );
  const isStudentActive = location.pathname.startsWith('/students');
  const isAcademicActive = academicItems.some((item) =>
    location.pathname.startsWith(item.path)
  );
  const isAdmissionSettingsActive = admissionSettingsItems.some((item) =>
    location.pathname.startsWith(item.path)
  );

  const [admissionOpen, setAdmissionOpen] = useState(isAdmissionActive || false);
  const [studentOpen, setStudentOpen] = useState(isStudentActive || false);
  const [academicOpen, setAcademicOpen] = useState(isAcademicActive || false);
  const [admissionSettingsOpen, setAdmissionSettingsOpen] = useState(
    isAdmissionSettingsActive || false
  );

  useEffect(() => {
    if (isStudentActive) setStudentOpen(true);
  }, [isStudentActive]);

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
          <div className="flex items-center gap-3">
            <img
              src="/assets/logo.png"
              alt="Campus Eye Logo"
              className="w-9 h-9 rounded-xl object-contain bg-white shadow-sm border border-slate-100 p-0.5"
            />
            <div>
              <h1 className="font-bold text-slate-900 text-base leading-tight tracking-tight">
                Campus Eye
              </h1>
              <p className="text-xs text-brand-600 font-semibold">School ERP</p>
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
