import React, { useState, useMemo } from 'react';
import {
  CalendarCheck,
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Award,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Filter,
} from 'lucide-react';
import { useStudent } from '../../context/StudentContext';

export const StudentAttendance = () => {
  const { attendanceSummary, attendanceLogs, student } = useStudent();
  const [filterSession, setFilterSession] = useState('all'); // 'all', 'session1', 'session2'

  const percentage = attendanceSummary?.percentage ?? 100;
  const presentDays = attendanceSummary?.present_days ?? 0;
  const absentDays = attendanceSummary?.absent_days ?? 0;
  const totalDays = (presentDays + absentDays) || 1;

  // Filter attendance logs
  const filteredLogs = useMemo(() => {
    if (!attendanceLogs) return [];
    if (filterSession === 'all') return attendanceLogs;
    return attendanceLogs.filter((log) => log.session === filterSession);
  }, [attendanceLogs, filterSession]);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="rounded-3xl border border-slate-200/80 bg-white p-6 sm:p-7 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-sky-700">
            <CalendarCheck className="w-4 h-4 text-sky-600" />
            <span>Attendance Log · வருகைப் பதிவு</span>
          </div>
          <h1 className="mt-1 text-2xl font-black text-slate-900 tracking-tight">
            Academic Attendance & Session Records
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-500">
            Track daily Morning and Afternoon session check-ins and cumulative attendance percentages.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-sky-50 border border-sky-200 px-4 py-2 rounded-2xl text-xs font-extrabold text-sky-800">
          <Award className="w-4 h-4 text-sky-600" />
          <span>{attendanceSummary?.standing || 'Good Standing'} ({percentage}%)</span>
        </div>
      </div>

      {/* 4 Performance Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Attendance Rate */}
        <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4">
          <div className="text-xs font-bold uppercase tracking-wider text-emerald-800">
            Attendance Rate
          </div>
          <div className="mt-2 text-2xl font-black text-slate-900">
            {percentage}%
          </div>
          <div className="text-[11px] text-emerald-700 font-medium mt-0.5">
            Institutional minimum: 75%
          </div>
        </div>

        {/* Present Days */}
        <div className="rounded-2xl border border-sky-100 bg-sky-50/70 p-4">
          <div className="text-xs font-bold uppercase tracking-wider text-sky-800">
            Present Days
          </div>
          <div className="mt-2 text-2xl font-black text-slate-900">
            {presentDays} <span className="text-xs font-normal text-slate-500">days</span>
          </div>
          <div className="text-[11px] text-sky-700 font-medium mt-0.5">
            Regular attendance logged
          </div>
        </div>

        {/* Absent Days */}
        <div className="rounded-2xl border border-rose-100 bg-rose-50/70 p-4">
          <div className="text-xs font-bold uppercase tracking-wider text-rose-800">
            Absent / Leave
          </div>
          <div className="mt-2 text-2xl font-black text-slate-900">
            {absentDays} <span className="text-xs font-normal text-slate-500">days</span>
          </div>
          <div className="text-[11px] text-rose-700 font-medium mt-0.5">
            Excused and unexcused leaves
          </div>
        </div>

        {/* Today's Status */}
        <div className="rounded-2xl border border-indigo-100 bg-indigo-50/70 p-4">
          <div className="text-xs font-bold uppercase tracking-wider text-indigo-800">
            Today's Check-in
          </div>
          <div className="mt-2 text-base font-black text-slate-900 flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span>M: {attendanceSummary?.morning_session || 'Present'}</span>
          </div>
          <div className="text-[11px] text-slate-500 font-medium mt-0.5">
            Afternoon: {attendanceSummary?.afternoon_session || 'Pending'}
          </div>
        </div>
      </div>

      {/* Attendance History Log Table */}
      <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <h2 className="text-base font-extrabold text-slate-900">
              Session Attendance Logs
            </h2>
            <p className="text-xs text-slate-500">Recent check-in and session history verified by teachers</p>
          </div>

          {/* Session Filter */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-bold">
            <button
              type="button"
              onClick={() => setFilterSession('all')}
              className={`px-3 py-1 rounded-lg transition ${
                filterSession === 'all'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Sessions
            </button>
            <button
              type="button"
              onClick={() => setFilterSession('session1')}
              className={`px-3 py-1 rounded-lg transition ${
                filterSession === 'session1'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Morning (S1)
            </button>
            <button
              type="button"
              onClick={() => setFilterSession('session2')}
              className={`px-3 py-1 rounded-lg transition ${
                filterSession === 'session2'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Afternoon (S2)
            </button>
          </div>
        </div>

        {filteredLogs.length === 0 ? (
          <div className="py-12 text-center">
            <div className="w-12 h-12 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center mx-auto mb-2">
              <CalendarCheck className="w-6 h-6" />
            </div>
            <p className="text-sm font-bold text-slate-800">No Attendance Records Yet</p>
            <p className="text-xs text-slate-400">Attendance marks will appear as your teacher logs them daily.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-extrabold uppercase tracking-wider">
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Day</th>
                  <th className="py-2.5 px-3">Session</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Remarks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredLogs.map((log) => {
                  const logDate = log.attendance_date ? new Date(log.attendance_date) : new Date();
                  const isPresent = log.status === 'present';
                  const isAbsent = log.status === 'absent';
                  const isLate = log.status === 'late';

                  return (
                    <tr key={log.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3 px-3 font-bold text-slate-900">
                        {logDate.toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>
                      <td className="py-3 px-3 text-slate-600">
                        {logDate.toLocaleDateString('en-IN', { weekday: 'long' })}
                      </td>
                      <td className="py-3 px-3">
                        <span className="font-semibold text-slate-700">
                          {log.session === 'session1' ? 'Morning (S1)' : 'Afternoon (S2)'}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold ${
                            isPresent
                              ? 'bg-emerald-100 text-emerald-800'
                              : isAbsent
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {isPresent && <CheckCircle2 className="w-3 h-3 text-emerald-600" />}
                          {isAbsent && <XCircle className="w-3 h-3 text-rose-600" />}
                          {isLate && <AlertTriangle className="w-3 h-3 text-amber-600" />}
                          <span className="capitalize">{log.status}</span>
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right text-slate-400 text-[11px]">
                        Marked by Class Teacher
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentAttendance;
