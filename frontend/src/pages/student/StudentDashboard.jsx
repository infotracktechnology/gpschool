import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  UserRound,
  CalendarDays,
  CalendarCheck,
  Clock3,
  BookOpen,
  FileCheck2,
  Bell,
  Image as ImageIcon,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  Award,
  Layers,
  GraduationCap,
  Sparkles,
  ArrowRight,
  FileText,
} from 'lucide-react';
import { useStudent } from '../../context/StudentContext';

function getGreeting(date = new Date()) {
  const hour = date.getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function formatToday(date = new Date()) {
  return new Intl.DateTimeFormat('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
}

function AttendanceRing({ percentage = 100 }) {
  const safePercentage = Math.min(100, Math.max(0, Number(percentage) || 0));
  const radius = 49;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - safePercentage / 100);

  return (
    <div className="relative mx-auto flex h-38 w-38 items-center justify-center">
      <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
        <circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          stroke="#f1f5f9"
          strokeWidth="10"
        />
        <circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          stroke={safePercentage >= 75 ? '#059669' : '#d97706'}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          className="transition-all duration-700"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-black tracking-tight text-slate-900">
          {safePercentage}%
        </span>
        <span className="mt-0.5 text-[10px] font-extrabold tracking-wider text-slate-500 uppercase">
          Attendance
        </span>
      </div>
    </div>
  );
}

export const StudentDashboard = () => {
  const navigate = useNavigate();
  const {
    student,
    assignedSubjects,
    attendanceSummary,
    homework,
    assignments,
    announcements,
    events,
    albums,
    loading,
  } = useStudent();

  const today = new Date();
  const studentName = student?.student_name || 'Student';
  const admissionNo = student?.admission_no || 'ADM001';
  const className = student?.class_name ? `${student.class_name}${student.section_name ? ` (${student.section_name})` : ''}` : 'Class 1 (A)';
  const branchName = student?.branch_name || 'Green Park Campus';

  const pendingAssignments = assignments?.filter(
    (a) => !a.my_submission_status || a.my_submission_status === 'Pending'
  )?.length || 0;

  const quickModules = [
    {
      id: 'homework',
      title: 'Homework',
      desc: 'Daily assigned tasks & materials',
      count: `${homework?.length || 0} Tasks`,
      badge: homework?.length > 0 ? 'Active' : 'Up to date',
      icon: BookOpen,
      to: '/student/homework',
      tone: 'emerald',
    },
    {
      id: 'assignments',
      title: 'Assignments',  
      desc: 'Projects & online submissions',
      count: `${assignments?.length || 0} Total`,
      badge: pendingAssignments > 0 ? `${pendingAssignments} Due` : 'Submitted',
      icon: FileCheck2,
      to: '/student/assignments',
      tone: 'violet',
    },
    {
      id: 'attendance',
      title: 'Attendance',
      desc: 'Session status & calendar logs',
      count: `${attendanceSummary?.percentage || 100}% Rate`,
      badge: `${attendanceSummary?.present_days || 0} Present`,
      icon: CalendarCheck,
      to: '/student/attendance',
      tone: 'sky',
    },
    {
      id: 'calendar',
      title: 'Academic Calendar',
      desc: 'Exams, holidays & PTM meetings',
      count: `${events?.length || 0} Events`,
      badge: 'Schedule',
      icon: Sparkles,
      to: '/student/calendar',
      tone: 'rose',
    },
    {
      id: 'announcements',
      title: 'Announcements',
      desc: 'Official notices & circulars',
      count: `${announcements?.length || 0} Notices`,
      badge: 'Circulars',
      icon: Bell,
      to: '/student/announcements',
      tone: 'amber',
    },
    {
      id: 'gallery',
      title: 'Event Gallery',
      desc: 'School albums & photos',
      count: `${albums?.length || 0} Albums`,
      badge: 'Moments',
      icon: ImageIcon,
      to: '/student/gallery',
      tone: 'indigo',
    },
  ];

  const toneMap = {
    emerald: {
      bg: 'bg-emerald-50 hover:bg-emerald-100/80 border-emerald-200/70',
      iconBg: 'bg-emerald-600 text-white',
      badge: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      action: 'text-emerald-700',
    },
    violet: {
      bg: 'bg-violet-50 hover:bg-violet-100/80 border-violet-200/70',
      iconBg: 'bg-violet-600 text-white',
      badge: 'bg-violet-100 text-violet-800 border-violet-200',
      action: 'text-violet-700',
    },
    sky: {
      bg: 'bg-sky-50 hover:bg-sky-100/80 border-sky-200/70',
      iconBg: 'bg-sky-600 text-white',
      badge: 'bg-sky-100 text-sky-800 border-sky-200',
      action: 'text-sky-700',
    },
    amber: {
      bg: 'bg-amber-50 hover:bg-amber-100/80 border-amber-200/70',
      iconBg: 'bg-amber-600 text-white',
      badge: 'bg-amber-100 text-amber-800 border-amber-200',
      action: 'text-amber-700',
    },
    indigo: {
      bg: 'bg-indigo-50 hover:bg-indigo-100/80 border-indigo-200/70',
      iconBg: 'bg-indigo-600 text-white',
      badge: 'bg-indigo-100 text-indigo-800 border-indigo-200',
      action: 'text-indigo-700',
    },
    rose: {
      bg: 'bg-rose-50 hover:bg-rose-100/80 border-rose-200/70',
      iconBg: 'bg-rose-600 text-white',
      badge: 'bg-rose-100 text-rose-800 border-rose-200',
      action: 'text-rose-700',
    },
  };

  return (
    <div className="space-y-6">
      {/* 1. HERO BANNER: Greeting, Session Status & Profile Jump */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Welcome Card */}
        <div className="lg:col-span-2 rounded-3xl border border-slate-200/80 bg-gradient-to-br from-white via-white to-emerald-50/50 p-6 sm:p-8 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                {formatToday(today)}
              </span>
              <button
                type="button"
                onClick={() => navigate('/student/profile')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 hover:bg-slate-50 shadow-2xs transition"
              >
                <UserRound className="w-3.5 h-3.5 text-emerald-600" />
                <span>Student Dossier</span>
              </button>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              {getGreeting(today)}, {studentName}! 👋
            </h1>
            <p className="mt-2 text-sm text-slate-600 leading-relaxed max-w-xl">
              Welcome to <span className="font-semibold text-emerald-800">{branchName}</span> . You are enrolled in{' '}
              <strong className="text-slate-900 font-bold">{className}</strong> at{' '}.
            </p>
          </div>

          {/* Today's Live Attendance Sessions */}
          <div className="mt-6 pt-5 border-t border-slate-100">
            <div className="text-xs font-extrabold uppercase tracking-wider text-slate-500 mb-3">
              Today's Session Attendance Status
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Morning Session */}
              <div className="rounded-2xl border border-sky-100 bg-sky-50/70 p-3.5 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-bold text-sky-800">
                    <Clock3 className="w-3.5 h-3.5 text-sky-600" />
                    <span>Morning Session</span>
                  </div>
                  <div className="mt-1 text-sm font-extrabold text-slate-900">
                    {attendanceSummary?.morning_session || 'Present'}
                  </div>
                </div>
                <span className={`w-2.5 h-2.5 rounded-full ${attendanceSummary?.morning_session === 'Present' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
              </div>

              {/* Afternoon Session */}
              <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-3.5 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-800">
                    <Clock3 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Afternoon Session</span>
                  </div>
                  <div className="mt-1 text-sm font-extrabold text-slate-900">
                    {attendanceSummary?.afternoon_session || 'Not Marked'}
                  </div>
                </div>
                <span className={`w-2.5 h-2.5 rounded-full ${attendanceSummary?.afternoon_session === 'Present' ? 'bg-emerald-500' : 'bg-slate-300'}`} />
              </div>

              {/* Quick Tasks Pill */}
              <div
                onClick={() => navigate('/student/homework')}
                className="cursor-pointer rounded-2xl border border-emerald-200 bg-emerald-600 text-white p-3.5 flex items-center justify-between shadow-xs hover:bg-emerald-700 transition"
              >
                <div>
                  <div className="text-xs font-semibold text-emerald-100">Tasks Due</div>
                  <div className="mt-0.5 text-sm font-extrabold">
                    {homework?.length || 0} Homework
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-emerald-200" />
              </div>
            </div>
          </div>
        </div>

        {/* Right Col: Attendance Ring Widget */}
        <div className="rounded-3xl border border-slate-200/80 bg-white p-6 sm:p-7 shadow-xs flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-base font-extrabold text-slate-900">Attendance Overview</h2>
              <p className="text-xs text-slate-500 mt-0.5">Academic Year 2026-2027</p>
            </div>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <CheckCircle2 className="w-3.5 h-3.5" />
              {attendanceSummary?.standing || 'Good Standing'}
            </span>
          </div>

          <div className="my-3">
            <AttendanceRing percentage={attendanceSummary?.percentage ?? 100} />
          </div>

          <div className="space-y-2 border-t border-slate-100 pt-3 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-500 flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                Present Days
              </span>
              <strong className="text-slate-800 font-bold">{attendanceSummary?.present_days ?? 0} days</strong>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500 flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                Absent / Leave
              </span>
              <strong className="text-slate-800 font-bold">{attendanceSummary?.absent_days ?? 0} days</strong>
            </div>
          </div>

          <button
            type="button"
            onClick={() => navigate('/student/attendance')}
            className="mt-4 w-full py-2 px-3 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 hover:text-emerald-700 transition flex items-center justify-center gap-1"
          >
            <span>Detailed Attendance Log</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </section>

      {/* 2. CORE MODULES GRID */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-black text-slate-900 tracking-tight">
           Quick Actions
          </h2>
          <span className="text-xs font-semibold text-slate-500">
            Student Quick Access
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {quickModules.map((item) => {
            const Icon = item.icon;
            const tone = toneMap[item.tone] || toneMap.emerald;

            return (
              <div
                key={item.id}
                onClick={() => item.to && navigate(item.to)}
                className={`rounded-2xl border p-5 transition-all shadow-2xs flex flex-col justify-between ${
                  item.to
                    ? 'cursor-pointer hover:-translate-y-0.5 hover:shadow-md'
                    : 'opacity-85'
                } ${tone.bg}`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shadow-xs ${tone.iconBg}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-extrabold border ${tone.badge}`}>
                      {item.badge}
                    </span>
                  </div>

                  <h3 className="mt-3.5 text-base font-extrabold text-slate-900 leading-tight">
                    {item.title}
                  </h3>
                  <p className="text-[11px] font-semibold text-emerald-800/80">{item.tamilTitle}</p>
                  <p className="mt-1 text-xs text-slate-600 line-clamp-2">{item.desc}</p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-200/60 flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-700">{item.count}</span>
                  {item.to ? (
                    <span className={`inline-flex items-center gap-1 font-bold ${tone.action}`}>
                      Open <ChevronRight className="w-3.5 h-3.5" />
                    </span>
                  ) : (
                    <span className="text-slate-400 font-semibold">Planned</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 3. ASSIGNED SUBJECTS */}
      {assignedSubjects && assignedSubjects.length > 0 && (
        <section className="rounded-3xl border border-slate-200/80 bg-white p-6 sm:p-7 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-extrabold text-slate-900">
                Assigned Subjects ({assignedSubjects.length})
              </h2>
              <p className="text-xs text-slate-500">Subjects currently enrolled for your academic grade</p>
            </div>
            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700">
              {className}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {assignedSubjects.map((sub) => (
              <div
                key={sub.id}
                className="p-3.5 rounded-2xl border border-slate-100 bg-slate-50/70 hover:bg-slate-100/70 transition"
              >
                <div className="flex items-center justify-between gap-1 mb-1">
                  <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-md bg-white border border-slate-200 text-slate-700">
                    {sub.code || 'SUB'}
                  </span>
                  <span className="text-[10px] font-semibold uppercase text-slate-400">
                    {sub.requirement || 'Core'}
                  </span>
                </div>
                <div className="text-sm font-bold text-slate-900 truncate" title={sub.name}>
                  {sub.name}
                </div>
                {sub.category && (
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    {sub.category}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 4. RECENT NOTICES / ANNOUNCEMENTS QUICK GLANCE */}
      {announcements && announcements.length > 0 && (
        <section className="rounded-3xl border border-amber-200/70 bg-amber-50/40 p-6 shadow-xs">
          <div className="flex items-center gap-2 mb-3 text-amber-900 font-extrabold text-sm">
            <Bell className="w-4 h-4 text-amber-600" />
            <span>Latest Official Circulars & Notices</span>
          </div>
          <div className="space-y-2">
            {announcements.slice(0, 3).map((item) => (
              <div
                key={item.id}
                className="bg-white rounded-2xl p-4 border border-amber-100 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2"
              >
                <div>
                  <h4 className="text-sm font-bold text-slate-900">{item.title}</h4>
                  <p className="text-xs text-slate-600 line-clamp-1 mt-0.5">{item.content}</p>
                </div>
                <span className="text-[11px] font-mono text-slate-400 shrink-0">
                  {item.created_at ? new Date(item.created_at).toLocaleDateString('en-IN') : 'Recent'}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

export default StudentDashboard;
