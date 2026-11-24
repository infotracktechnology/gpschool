
import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  School,
  Menu,
  Bell,
  RefreshCw,
  LogOut,
} from 'lucide-react';

import { useAuth } from '../../context/AuthContext';
import { useStudent } from '../../context/StudentContext';

export default function StudentTopbar({ onMenuClick }) {
  const { user, logout } = useAuth();
  const { student, loading, refreshFeed } = useStudent();
  const navigate = useNavigate();

  const studentName = student?.student_name || user?.name || 'Student';
  const admissionNo = student?.admission_no || user?.username || 'ADM001';
  const className = student?.class_name
    ? `${student.class_name}${student.section_name ? ` - ${student.section_name}` : ''}`
    : 'Class 5 (A)';
  const branchName = student?.branch_name || '-';

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="sticky top-0 z-40 h-16 sm:h-20 bg-white border-b border-slate-200 shadow-sm">
      <div className="h-full px-4 sm:px-6 flex items-center justify-between">

        <div className="flex items-center gap-3">
          <button
            onClick={onMenuClick}
            className="lg:hidden p-2 rounded-lg hover:bg-slate-100"
          >
            <Menu size={22} />
          </button>

          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white">
            <School size={23} />
          </div>

          <div>
            <h1 className="text-sm sm:text-lg font-black text-slate-900">
              GREEN PARK SCHOOL
            </h1>
            <p className="text-[10px] sm:text-xs text-slate-500">
              {branchName} · {student?.academic_year_name || 'Academic Year 2026-2027'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-4">
          <button
            onClick={refreshFeed}
            title="Refresh"
            className="p-2 rounded-lg text-slate-500 hover:bg-emerald-50"
          >
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>

          <button
            className="relative p-2 rounded-lg text-slate-500 hover:bg-slate-100"
            title="Notifications"
          >
            <Bell size={19} />
          </button>

          <button
            onClick={() => navigate('/student/profile')}
            className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-slate-50"
          >
            <div className="w-9 h-9 rounded-full bg-sky-100 text-sky-700 flex items-center justify-center font-bold overflow-hidden">
              {student?.avatar_url ? (
                <img src={student.avatar_url} alt={studentName} className="w-full h-full object-cover" />
              ) : studentName.charAt(0).toUpperCase()}
            </div>

            <div className="hidden sm:block text-left">
              <p className="text-xs font-bold text-slate-800">{studentName}</p>
              <p className="text-[10px] text-slate-500">
                {admissionNo} · {className}
              </p>
            </div>
          </button>

          <button
            onClick={handleLogout}
            title="Logout"
            className="p-2 rounded-lg text-rose-600 hover:bg-rose-50"
          >
            <LogOut size={19} />
          </button>
        </div>
      </div>
    </header>
  );
}
