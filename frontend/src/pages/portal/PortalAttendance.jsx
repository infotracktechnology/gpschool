import React, { useState, useEffect, useMemo } from 'react';
import {
  CalendarCheck,
  Calendar,
  Clock,
  Fingerprint,
  CheckCircle2,
  AlertCircle,
  Download,
  Filter,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api/client';

export const PortalAttendance = () => {
  const { user } = useAuth();

  const [selectedMonth, setSelectedMonth] = useState('11');
  const [selectedYear, setSelectedYear] = useState('2026');

  const attendanceLogs = [
    { date: '2026-11-20', day: 'Friday', in_time: '08:05 AM', out_time: '04:35 PM', duration: '8h 30m', status: 'Present', device: 'Main Gate ePush BIO-01' },
    { date: '2026-11-19', day: 'Thursday', in_time: '08:10 AM', out_time: '04:30 PM', duration: '8h 20m', status: 'Present', device: 'Main Gate ePush BIO-01' },
    { date: '2026-11-18', day: 'Wednesday', in_time: '08:02 AM', out_time: '04:30 PM', duration: '8h 28m', status: 'Present', device: 'Main Gate ePush BIO-01' },
    { date: '2026-11-17', day: 'Tuesday', in_time: '08:35 AM', out_time: '04:40 PM', duration: '8h 05m', status: 'Late', device: 'Main Gate ePush BIO-01' },
    { date: '2026-11-16', day: 'Monday', in_time: '08:00 AM', out_time: '04:30 PM', duration: '8h 30m', status: 'Present', device: 'Main Gate ePush BIO-01' },
    { date: '2026-11-14', day: 'Saturday', in_time: '08:12 AM', out_time: '01:30 PM', duration: '5h 18m', status: 'Half-Day', device: 'Main Gate ePush BIO-01' },
    { date: '2026-11-13', day: 'Friday', in_time: '08:00 AM', out_time: '04:30 PM', duration: '8h 30m', status: 'On-Duty', device: 'Official Deputation' },
  ];

  const metrics = {
    workingDays: 24,
    presentDays: 23,
    lateDays: 1,
    halfDays: 0,
    odDays: 1,
    absentDays: 0,
    percentage: 97.8,
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-border shadow-xs">
        <div>
          <h1 className="text-2xl font-bold text-heading">My Biometric Attendance Register</h1>
          <p className="text-xs text-muted">
            Track daily clock-in / clock-out timestamps synchronized from school biometric terminals
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="w-32">
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-border rounded-xl font-medium"
            >
              <option value="11">November 2026</option>
              <option value="10">October 2026</option>
              <option value="09">September 2026</option>
            </select>
          </div>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
        <div className="p-4 bg-white rounded-xl border border-border shadow-xs text-center">
          <span className="text-[11px] text-muted block uppercase font-bold">Working Days</span>
          <span className="text-xl font-bold text-slate-900 mt-1 block">{metrics.workingDays}</span>
        </div>
        <div className="p-4 bg-white rounded-xl border border-border shadow-xs text-center">
          <span className="text-[11px] text-muted block uppercase font-bold">Present Days</span>
          <span className="text-xl font-bold text-emerald-600 mt-1 block">{metrics.presentDays}</span>
        </div>
        <div className="p-4 bg-white rounded-xl border border-border shadow-xs text-center">
          <span className="text-[11px] text-muted block uppercase font-bold">Late Arrivals</span>
          <span className="text-xl font-bold text-amber-600 mt-1 block">{metrics.lateDays}</span>
        </div>
        <div className="p-4 bg-white rounded-xl border border-border shadow-xs text-center">
          <span className="text-[11px] text-muted block uppercase font-bold">On-Duty (OD)</span>
          <span className="text-xl font-bold text-purple-600 mt-1 block">{metrics.odDays}</span>
        </div>
        <div className="p-4 bg-white rounded-xl border border-border shadow-xs text-center">
          <span className="text-[11px] text-muted block uppercase font-bold">Loss of Pay</span>
          <span className="text-xl font-bold text-rose-600 mt-1 block">0 Days</span>
        </div>
        <div className="p-4 bg-white rounded-xl border border-border shadow-xs text-center bg-emerald-50/50">
          <span className="text-[11px] text-emerald-800 block uppercase font-bold">Attendance %</span>
          <span className="text-xl font-black text-emerald-700 mt-1 block">{metrics.percentage}%</span>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-2xl border border-border shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-border bg-slate-50/60 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-heading">Daily Biometric Punch Logs</h3>
            <p className="text-xs text-muted">Direct audit logs from ePush cloud synchronization</p>
          </div>
          <span className="font-mono text-xs text-slate-500">ID: {user?.biometric_punch_id || 'BIO-SLM-104'}</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-bold uppercase border-b border-border">
              <tr>
                <th className="py-2.5 px-3">Date</th>
                <th className="py-2.5 px-3">Day</th>
                <th className="py-2.5 px-3 font-mono">Clock In</th>
                <th className="py-2.5 px-3 font-mono">Clock Out</th>
                <th className="py-2.5 px-3">Duration</th>
                <th className="py-2.5 px-3">Biometric Device Terminal</th>
                <th className="py-2.5 px-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {attendanceLogs.map((log) => (
                <tr key={log.date} className="hover:bg-slate-50/70">
                  <td className="py-3 px-3 font-mono font-bold text-slate-900">{log.date}</td>
                  <td className="py-3 px-3 text-slate-600">{log.day}</td>
                  <td className="py-3 px-3 font-mono font-bold text-emerald-700">{log.in_time}</td>
                  <td className="py-3 px-3 font-mono font-bold text-slate-700">{log.out_time}</td>
                  <td className="py-3 px-3 font-mono text-muted">{log.duration}</td>
                  <td className="py-3 px-3 text-slate-500">{log.device}</td>
                  <td className="py-3 px-3 text-center">
                    <span
                      className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        log.status === 'Present'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : log.status === 'Late'
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : 'bg-purple-50 text-purple-700 border border-purple-200'
                      }`}
                    >
                      {log.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
