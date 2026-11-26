
import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  BookOpen,
  FileCheck2,
  CalendarCheck,
  CalendarDays,
  UserRound,
  Bell,
  Image as ImageIcon,
  X,
  ShieldCheck,
  LifeBuoy,
  HeartPulse,
} from 'lucide-react';

import { useStudent } from '../../context/StudentContext';

export default function StudentSidebar({ mobileOpen, onClose }) {
  const {
    student,
    homework,
    assignments,
    announcements,
    events,
    albums,
  } = useStudent();

  const navItems = [
    { to: '/student/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/student/announcements', label: 'Announcement', icon: Bell, badge: announcements?.length },
    { to: '/student/homework', label: 'Homework', icon: BookOpen, badge: homework?.length },   
    { to: '/student/assignments', label: 'Assignment', icon: FileCheck2, badge: assignments?.length },
    { to: '/student/attendance', label: 'Attendance', icon: CalendarCheck },
    { to: '/student/health', label: 'Health & Medical', icon: HeartPulse },
    { to: '/student/concerns', label: 'Helpdesk & Concerns', icon: LifeBuoy },
    { to: '/student/gallery', label: 'Gallery', icon: ImageIcon, badge: albums?.length },
    { to: '/student/calendar', label: 'Calendar', icon: CalendarDays, badge: events?.length },
    { to: '/student/profile', label: 'My Profile', icon: UserRound },
  ];

  const menuContent = (
    <nav className="space-y-1">
      {navItems.map((item) => {
        const Icon = item.icon;

        return (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/student/dashboard'}
            onClick={onClose}
            className={({ isActive }) =>
              `group flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                isActive
                  ? 'bg-sky-500 text-white shadow-sm shadow-sky-500/25'
                  : 'text-slate-600 hover:text-sky-700 hover:bg-sky-50'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <div className="flex items-center gap-3">
                  <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-sky-500'}`} />
                  <span>{item.label}</span>
                </div>

                {isActive ? (
                  <span className="w-1.5 h-1.5 rounded-full bg-white" />
                ) : item.badge > 0 ? (
                  <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-sky-100 text-sky-700">
                    {item.badge}
                  </span>
                ) : null}
              </>
            )}
          </NavLink>
        );
      })}
    </nav>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex fixed left-0 top-20 bottom-0 w-64 flex-col bg-white border-r border-slate-200 z-30">
        <div className="p-3.5 flex-1 overflow-y-auto">
          <div className="px-3 pt-2 pb-3 flex items-center justify-between">
            <span className="text-[11px] font-extrabold tracking-wider text-slate-400">
              MAIN MENU
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-100 text-sky-700">
              Active
            </span>
          </div>
          {menuContent}
        </div>

        <div className="p-4 border-t border-slate-100 flex items-center gap-2 text-xs text-slate-400">
            {/* <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" /> */}
            <span className="font-semibold text-slate-600 truncate">
                {student?.branch_name || 'Branch'}
            </span>
        </div>
      </aside>

      {/* Mobile Sidebar */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-slate-900/40"
            onClick={onClose}
          />

          <aside className="absolute inset-y-0 left-0 w-72 max-w-[80vw] bg-white shadow-2xl flex flex-col">
            <div className="p-4 border-b flex justify-between items-center">
              <span className="font-bold text-slate-900">Student Menu</span>
              <button onClick={onClose}>
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-3">
              {menuContent}
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
