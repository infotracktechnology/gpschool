import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  User,
  CalendarCheck,
  CalendarDays,
  GraduationCap,
  Banknote,
  UserCheck,
  LogOut,
  ArrowRightLeft,
  Bell,
  Menu,
  X,
  Building2,
  Clock,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const PortalLayout = () => {
  const { user, logout, selectedBranch, selectedAcademicYear } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Check if current user is an approver (principal, coordinator, admin, or hod)
  const isApprover =
    !user?.role ||
    ['super_admin', 'admin', 'principal', 'coordinator'].includes(user?.role) ||
    user?.is_approver === true;

  const portalNavItems = [
    {
      label: 'Portal Dashboard',
      path: '/portal',
      end: true,
      icon: LayoutDashboard,
    },
    {
      label: 'My Classes & Allocations',
      path: '/portal/classes',
      icon: GraduationCap,
    },
    {
      label: 'My Attendance',
      path: '/portal/attendance',
      icon: CalendarCheck,
    },
    {
      label: 'My Leaves',
      path: '/portal/leaves',
      icon: CalendarDays,
    },
    ...(isApprover
      ? [
          {
            label: 'Leave Approvals',
            path: '/portal/leave-approvals',
            icon: UserCheck,
            badge: 'Approver',
          },
        ]
      : []),
    {
      label: 'My Payslips',
      path: '/portal/payslips',
      icon: Banknote,
    },
    {
      label: 'My 360° Profile',
      path: '/portal/profile',
      icon: User,
    },
  ];

  const handleLogout = () => {
    if (logout) {
      logout();
    } else {
      localStorage.removeItem('school_erp_token');
      localStorage.removeItem('school_erp_user');
      navigate('/login');
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 font-sans">
      {/* Mobile Backdrop */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-slate-950/50 z-40 lg:hidden backdrop-blur-xs"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* DEDICATED FACULTY & STAFF SIDEBAR */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 bg-slate-900 text-slate-200 flex flex-col shrink-0 border-r border-slate-800 transition-transform duration-300 ease-in-out lg:static lg:translate-x-0 ${
          mobileMenuOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full lg:shadow-none'
        }`}
      >
        {/* Brand Header */}
        <div className="h-16 flex items-center justify-between px-6 border-b border-slate-800 bg-slate-950/40 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center font-bold text-sm shadow-md shadow-emerald-900/30">
              GP
            </div>
            <div>
              <h1 className="font-bold text-white text-base leading-tight tracking-tight">
                Staff Portal
              </h1>
              <p className="text-[11px] text-emerald-400 font-semibold tracking-wide">
                Green Park School
              </p>
            </div>
          </div>

          <button
            onClick={() => setMobileMenuOpen(false)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white lg:hidden"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Staff Profile Card Banner in Sidebar */}
        <div className="p-4 mx-3 my-3 bg-slate-800/80 rounded-2xl border border-slate-700/60 shadow-xs space-y-2">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center font-bold text-sm uppercase shadow-sm shrink-0">
              {user?.name
                ?.split(' ')
                .map((n) => n[0])
                .slice(0, 2)
                .join('') || 'DR'}
            </div>
            <div className="overflow-hidden">
              <h2 className="text-sm font-bold text-white truncate">
                {user?.name || 'Dr. Ramesh Sundaram'}
              </h2>
              <span className="font-mono text-[11px] font-bold text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800/60 inline-block mt-0.5">
                {user?.emp_no || 'GPS-T-001'}
              </span>
            </div>
          </div>

          <div className="text-[11px] text-slate-400 pt-1 border-t border-slate-700/60 flex items-center justify-between">
            <span className="truncate">{user?.department || 'Mathematics Dept'}</span>
            <span className="capitalize text-emerald-400 font-semibold">{user?.role || 'Teacher'}</span>
          </div>
        </div>

        {/* Navigation Links */}
        <div className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
          <p className="px-3 text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-2">
            Faculty Workspace
          </p>

          <nav className="space-y-1">
            {portalNavItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.end}
                  onClick={() => setMobileMenuOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                      isActive
                        ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/30 font-bold'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800/70'
                    }`
                  }
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-emerald-800 text-emerald-100">
                      {item.badge}
                    </span>
                  )}
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* Footer Actions */}
        <div className="p-3 border-t border-slate-800 bg-slate-950/40 space-y-2 shrink-0">
          {/* Switch to Admin ERP (Only if Admin or Super Admin) */}
          {(!user?.role || ['super_admin', 'admin', 'principal'].includes(user?.role)) && (
            <button
              onClick={() => navigate('/')}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold bg-slate-800 text-slate-200 hover:text-white hover:bg-slate-700 transition-all border border-slate-700"
            >
              <ArrowRightLeft className="w-3.5 h-3.5 text-brand-400" />
              <span>Switch to Admin ERP</span>
            </button>
          )}

          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-rose-300 hover:text-rose-100 hover:bg-rose-950/40 transition-all border border-rose-900/40"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* MAIN PORTAL CONTENT AREA */}
      <div className="flex flex-col flex-1 overflow-hidden min-w-0">
        {/* Top Navbar */}
        <header className="h-16 bg-white border-b border-border px-6 flex items-center justify-between shrink-0 shadow-xs">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="p-2 rounded-xl text-slate-600 hover:bg-slate-100 lg:hidden"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="hidden sm:flex items-center gap-2 text-xs text-muted">
              <Building2 className="w-4 h-4 text-emerald-600" />
              <span className="font-semibold text-slate-800">
                {selectedBranch?.name || user?.branch_name || 'Main Campus (Salem)'}
              </span>
              <span>•</span>
              <Calendar className="w-4 h-4 text-slate-400 ml-1" />
              <span>{selectedAcademicYear?.name || 'AY 2026-27'}</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full text-xs font-bold border border-emerald-200">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Faculty Mode</span>
            </span>

            <div className="h-5 w-px bg-slate-200 mx-1" />

            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center text-xs font-bold uppercase shadow-xs">
                {user?.name?.charAt(0) || 'D'}
              </div>
              <div className="hidden md:block text-left">
                <p className="text-xs font-bold text-heading leading-tight truncate max-w-[130px]">
                  {user?.name || 'Dr. Ramesh Sundaram'}
                </p>
                <p className="text-[10px] text-muted capitalize truncate font-medium">
                  {user?.emp_no || 'GPS-T-001'}
                </p>
              </div>
            </div>
          </div>
        </header>

        {/* Main Outlet */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 bg-slate-50">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
