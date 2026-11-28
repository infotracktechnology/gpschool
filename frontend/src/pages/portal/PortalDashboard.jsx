import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calendar,
  Clock,
  GraduationCap,
  CalendarCheck,
  CalendarDays,
  Banknote,
  BookOpen,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  Fingerprint,
  UserCheck,
  Building2,
  Sparkles,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api/client';

export const PortalDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [portalData, setPortalData] = useState(null);

  useEffect(() => {
    let active = true;
    api
      .get('/portal/dashboard')
      .then((res) => {
        if (active && res) setPortalData(res);
      })
      .catch((err) => {
        console.error('Failed to fetch portal dashboard:', err);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const staff = portalData?.staff || null;
  const allocatedSubjects = portalData?.allocated_subjects || [];
  const assignedClasses = portalData?.assigned_classes || [];
  const leaveBalances = portalData?.leave_balances || [];
  const latestPayslip = portalData?.latest_payslip || null;
  const todayAttendance = portalData?.today_attendance || {};

  const totalLeaveAvailable = leaveBalances.reduce((acc, l) => acc + Number(l.available || 0), 0);
  const primaryClassTeacher = assignedClasses[0]
    ? `${assignedClasses[0].class_name} - ${assignedClasses[0].section_name}`
    : 'Not Assigned';

  const stats = {
    todayClasses: allocatedSubjects.length,
    classTeacherOf: primaryClassTeacher,
    studentStrength: assignedClasses[0]?.capacity || 0,
    leaveAvailable: totalLeaveAvailable,
    lastNetPay: Number(latestPayslip?.net_salary || 0),
    punchStatus:
      todayAttendance?.status && todayAttendance.status !== 'not_marked'
        ? `${todayAttendance.status}${todayAttendance.check_in ? ` (${todayAttendance.check_in})` : ''}`
        : 'Not Marked Yet',
  };

  const todaySchedule = allocatedSubjects.map((sub, idx) => ({
    period: idx + 1,
    time: `${sub.weekly_periods || 1} Periods / wk`,
    class: sub.class_name,
    section: sub.section_name,
    subject: sub.subject_name,
    room: sub.subject_code || 'Assigned',
    status: 'Active',
  }));

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 p-6 md:p-8 rounded-3xl text-white shadow-md relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-radial from-emerald-500/10 to-transparent pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-emerald-400 bg-emerald-950/80 px-2.5 py-0.5 rounded-lg border border-emerald-800/80">
                {staff?.emp_no || user?.emp_no || user?.username || 'STAFF'}
              </span>
              <span className="text-xs text-slate-300 font-semibold">• Green Park Faculty Portal</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white">
              Welcome back, {staff?.full_name || user?.name || 'Staff Member'}
            </h1>
            <p className="text-xs md:text-sm text-slate-300 max-w-xl">
              Designated as <span className="text-emerald-400 font-semibold">{staff?.designation || user?.designation || 'Faculty Member'}</span> in {staff?.department || user?.department || 'Academic Department'}.
            </p>
          </div>

          {/* Quick Biometric Punch Card */}
          <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 shrink-0 flex items-center gap-4 shadow-sm">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
              <Fingerprint className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                Today's Attendance
              </span>
              <p className="text-sm font-bold text-emerald-400 flex items-center gap-1.5 mt-0.5">
                <CheckCircle2 className="w-4 h-4" />
                <span>{stats.punchStatus}</span>
              </p>
              <span className="text-[11px] text-slate-400">Shift: 08:00 AM – 04:30 PM</span>
            </div>
          </div>
        </div>
      </div>

      {/* 4 Summary Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Today's Classes */}
        <div
          onClick={() => navigate('/portal/classes')}
          className="bg-white p-5 rounded-2xl border border-border shadow-xs hover:border-emerald-300 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted">
              Today's Classes
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-105 transition-transform">
              <BookOpen className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-heading">{stats.todayClasses} Periods</span>
          </div>
          <span className="text-xs text-brand-600 font-medium flex items-center gap-1 mt-1">
            <span>View Schedule</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </span>
        </div>

        {/* Class Teacher Allocation */}
        <div
          onClick={() => navigate('/portal/classes')}
          className="bg-white p-5 rounded-2xl border border-border shadow-xs hover:border-brand-300 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted">
              Class Teacher
            </span>
            <div className="w-9 h-9 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center group-hover:scale-105 transition-transform">
              <GraduationCap className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-lg font-bold text-heading truncate block">{stats.classTeacherOf}</span>
          </div>
          <span className="text-xs text-muted font-medium mt-1 block">
            {stats.studentStrength} Enrolled Students
          </span>
        </div>

        {/* Leave Balance */}
        <div
          onClick={() => navigate('/portal/leaves')}
          className="bg-white p-5 rounded-2xl border border-border shadow-xs hover:border-purple-300 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted">
              Leave Quota Balance
            </span>
            <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center group-hover:scale-105 transition-transform">
              <CalendarDays className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-heading">{stats.leaveAvailable} Days</span>
          </div>
          <span className="text-xs text-purple-700 font-medium flex items-center gap-1 mt-1">
            <span>Apply for Leave</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </span>
        </div>

        {/* Latest Payslip */}
        <div
          onClick={() => navigate('/portal/payslips')}
          className="bg-white p-5 rounded-2xl border border-border shadow-xs hover:border-emerald-300 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted">
              Latest Disbursal
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Banknote className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-emerald-700">
              ₹ {stats.lastNetPay.toLocaleString('en-IN')}
            </span>
          </div>
          <span className="text-xs text-emerald-800 font-medium flex items-center gap-1 mt-1">
            <span>November 2026 Payslip</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </span>
        </div>
      </div>

      {/* Two Column Layout: Daily Schedule (Left) & Quick Actions / Quotas (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Today's Teaching Schedule */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-border shadow-xs p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-heading">Today's Class Timetable</h2>
              <p className="text-xs text-muted">Instructional periods and classroom locations for today</p>
            </div>
            <button
              onClick={() => navigate('/portal/classes')}
              className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1"
            >
              <span>Weekly Timetable</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="divide-y divide-border/60">
            {todaySchedule.map((item) => (
              <div key={item.period} className="py-3.5 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-800 font-mono font-bold flex items-center justify-center text-xs shrink-0">
                    P{item.period}
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-heading">{item.subject}</h4>
                    <p className="text-xs text-muted">
                      {item.class} ({item.section}) • {item.room}
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="font-mono text-xs font-semibold text-slate-600 block">
                    {item.time}
                  </span>
                  <span
                    className={`inline-block text-[10px] font-bold uppercase px-2 py-0.5 rounded-full mt-0.5 ${
                      item.status === 'Completed'
                        ? 'bg-slate-100 text-slate-600'
                        : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    }`}
                  >
                    {item.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Leave Quota & Quick Links */}
        <div className="space-y-6">
          {/* Quick Leave Quota Meter */}
          <div className="bg-white rounded-2xl border border-border shadow-xs p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-heading">Annual Leave Quota</h3>
              <button
                onClick={() => navigate('/portal/leaves')}
                className="text-xs font-semibold text-emerald-700 hover:text-emerald-800"
              >
                Apply
              </button>
            </div>

            <div className="space-y-3">
              {[
                { name: 'Casual Leave (CL)', available: 10, total: 12, color: 'bg-emerald-500' },
                { name: 'Sick / Medical Leave (SL)', available: 8, total: 10, color: 'bg-teal-500' },
                { name: 'Earned Leave (EL)', available: 13, total: 15, color: 'bg-indigo-500' },
                { name: 'On-Duty (OD)', available: 6, total: 8, color: 'bg-purple-500' },
              ].map((l) => (
                <div key={l.name} className="space-y-1">
                  <div className="flex justify-between text-xs font-medium">
                    <span className="text-slate-700">{l.name}</span>
                    <span className="font-bold text-heading">
                      {l.available} / {l.total} d
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                    <div
                      className={`h-full ${l.color} rounded-full`}
                      style={{ width: `${(l.available / l.total) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={() => navigate('/portal/leaves')}
              className="w-full py-2.5 bg-emerald-600 text-white text-xs font-bold rounded-xl hover:bg-emerald-700 shadow-xs transition-colors"
            >
              Request Leave / Substitution
            </button>
          </div>

          {/* Quick Shortcuts */}
          <div className="bg-white rounded-2xl border border-border shadow-xs p-6 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">Quick Shortcuts</h3>
            <div className="space-y-2">
              <button
                onClick={() => navigate('/portal/profile')}
                className="w-full p-2.5 rounded-xl border border-border hover:bg-slate-50 text-left text-xs font-semibold flex items-center justify-between text-slate-700"
              >
                <span>View Full 360° Profile</span>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </button>
              <button
                onClick={() => navigate('/portal/attendance')}
                className="w-full p-2.5 rounded-xl border border-border hover:bg-slate-50 text-left text-xs font-semibold flex items-center justify-between text-slate-700"
              >
                <span>Monthly Attendance Punch Register</span>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </button>
              <button
                onClick={() => navigate('/portal/payslips')}
                className="w-full p-2.5 rounded-xl border border-border hover:bg-slate-50 text-left text-xs font-semibold flex items-center justify-between text-slate-700"
              >
                <span>Download Salary Payslips</span>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
