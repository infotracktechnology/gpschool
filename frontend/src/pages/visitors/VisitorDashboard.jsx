import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  UserCheck,
  LogOut,
  AlertTriangle,
  Calendar,
  Clock,
  Users,
  Printer,
  History,
  ArrowRight,
  RefreshCw,
  Edit,
  Plus,
  Building2,
} from 'lucide-react';
import { api } from '../../api/client';

export const VisitorDashboard = () => {
  const navigate = useNavigate();
  const [data, setData] = useState({
    kpis: {
      total_today: 0,
      active_now: 0,
      checked_out_today: 0,
      overstayed_now: 0,
      pending_appointments: 0,
      today_appointments: 0,
    },
    activeVisitors: [],
    todayAppointments: [],
    purposeBreakdown: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const res = await api.get('/visitors/dashboard');
      if (res.success) {
        setData({
          kpis: res.kpis || {},
          activeVisitors: res.activeVisitors || [],
          todayAppointments: res.todayAppointments || [],
          purposeBreakdown: res.purposeBreakdown || [],
        });
      }
    } catch (err) {
      console.error('Error fetching visitor dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  const maxPurpose = Math.max(
    1,
    ...data.purposeBreakdown.map((p) => Number(p.count) || 0)
  );

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider bg-brand-50 text-brand-700 border border-brand-200/60">
              Gate Command Center
            </span>
            <span className="text-xs text-emerald-600 font-medium flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Real-Time Gate Security
            </span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 mt-1">Visitor &amp; Gate Security Overview</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Monitor active campus visitors, overstay alerts, scheduled appointments, and gate throughput in real time.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={fetchDashboard}
            className="px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            type="button"
            onClick={() => navigate('/visitors/appointments/new')}
            className="px-3.5 py-2 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-xl transition-colors flex items-center gap-1.5"
          >
            <Calendar className="w-3.5 h-3.5" />
            New Appointment
          </button>
          <button
            type="button"
            onClick={() => navigate('/visitors/entry')}
            className="px-4 py-2 text-xs font-bold text-white bg-brand-600 hover:bg-brand-700 rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            New Gate Pass Entry
          </button>
        </div>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Entries Today</p>
          <p className="text-2xl font-extrabold text-slate-900 mt-1">{data.kpis.total_today}</p>
          <span className="text-[10px] text-slate-500">Passes logged today</span>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Inside Campus Now</p>
          <p className="text-2xl font-extrabold text-brand-600 mt-1">{data.kpis.active_now}</p>
          <span className="text-[10px] text-brand-600/80">Active passes</span>
        </div>
        <div
          className={`p-4 rounded-2xl border shadow-xs ${
            data.kpis.overstayed_now > 0
              ? 'bg-rose-50 border-rose-200'
              : 'bg-white border-slate-200/80'
          }`}
        >
          <p className="text-[11px] font-bold text-rose-500 uppercase tracking-wider">Overstay Alerts</p>
          <p className="text-2xl font-extrabold text-rose-700 mt-1">{data.kpis.overstayed_now}</p>
          <span className="text-[10px] text-rose-600">Exceeded allowed duration</span>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Checked Out Today</p>
          <p className="text-2xl font-extrabold text-emerald-600 mt-1">{data.kpis.checked_out_today}</p>
          <span className="text-[10px] text-slate-500">Completed visits</span>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs col-span-2 sm:col-span-1">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Upcoming Apts</p>
          <p className="text-2xl font-extrabold text-purple-700 mt-1">{data.kpis.today_appointments}</p>
          <span className="text-[10px] text-purple-600">{data.kpis.pending_appointments} pending approval</span>
        </div>
      </div>

      {/* Quick Navigation Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: 'Register Visitor', path: '/visitors/entry', icon: UserCheck, color: 'text-brand-700 bg-brand-50 border-brand-200' },
          { label: 'Exit & Checkout', path: '/visitors/exit', icon: LogOut, color: 'text-rose-700 bg-rose-50 border-rose-200' },
          { label: 'Pass Center', path: '/visitors/passes', icon: Printer, color: 'text-indigo-700 bg-indigo-50 border-indigo-200' },
          { label: 'Appointments', path: '/visitors/appointments', icon: Calendar, color: 'text-purple-700 bg-purple-50 border-purple-200' },
          { label: 'Person to Meet', path: '/visitors/hosts', icon: Users, color: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
          { label: 'Audit History', path: '/visitors/history', icon: History, color: 'text-slate-700 bg-slate-50 border-slate-200' },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.path}
              type="button"
              onClick={() => navigate(item.path)}
              className={`p-3 rounded-xl border text-xs font-bold flex items-center gap-2 transition-all hover:shadow-xs ${item.color}`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span className="truncate">{item.label}</span>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Columns: Active Campus Visitors */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Clock className="w-4 h-4 text-brand-600" />
                Live Campus Occupancy ({data.activeVisitors.length})
              </h2>
              <p className="text-[11px] text-slate-500">Overstayed visitors are highlighted first for security action</p>
            </div>
            <button
              type="button"
              onClick={() => navigate('/visitors/exit')}
              className="text-xs font-bold text-brand-700 hover:underline flex items-center gap-1"
            >
              Full Exit Desk <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/70 border-b border-slate-100 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="py-2.5 px-4">Pass &amp; Visitor</th>
                  <th className="py-2.5 px-4">Host / Dept</th>
                  <th className="py-2.5 px-4">Duration</th>
                  <th className="py-2.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.activeVisitors.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-slate-400">
                      No active visitors inside campus right now.
                    </td>
                  </tr>
                ) : (
                  data.activeVisitors.map((v) => (
                    <tr
                      key={v.id}
                      className={v.is_overstayed ? 'bg-rose-50/60' : 'hover:bg-slate-50/80'}
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-slate-800">{v.pass_number}</span>
                          {v.is_overstayed === 1 && (
                            <span className="px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 text-[10px] font-bold flex items-center gap-0.5">
                              <AlertTriangle className="w-2.5 h-2.5" /> Overstayed
                            </span>
                          )}
                        </div>
                        <p className="font-bold text-slate-900 mt-0.5">{v.visitor_name}</p>
                        <p className="text-[11px] text-slate-500 font-mono">{v.visitor_phone}</p>
                      </td>
                      <td className="py-3 px-4">
                        <p className="font-semibold text-slate-800">{v.person_to_meet_name}</p>
                        <p className="text-[11px] text-slate-500">{v.department || 'General'}</p>
                      </td>
                      <td className="py-3 px-4 font-mono">
                        <span className={`font-bold ${v.is_overstayed ? 'text-rose-700' : 'text-slate-700'}`}>
                          {v.elapsed_minutes || 0} mins
                        </span>
                        <span className="block text-[10px] text-slate-400">
                          Est: {v.expected_duration_minutes}m
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => navigate(`/visitors/entry/${v.id}/edit`)}
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700"
                            title="Edit Pass"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => navigate(`/visitors/exit/${v.id}`)}
                            className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-bold rounded-lg transition-colors"
                          >
                            Check Out
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Column: Purpose Distribution & Upcoming Appointments */}
        <div className="space-y-6">
          {/* Upcoming Appointments */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-purple-600" />
                Upcoming Appointments
              </h3>
              <button
                type="button"
                onClick={() => navigate('/visitors/appointments')}
                className="text-xs font-bold text-purple-700 hover:underline"
              >
                View All
              </button>
            </div>

            {data.todayAppointments.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">No upcoming appointments queued.</p>
            ) : (
              <div className="space-y-2.5">
                {data.todayAppointments.slice(0, 5).map((apt) => (
                  <div key={apt.id} className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-brand-700">{apt.appointment_number}</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-white border border-slate-200 text-slate-700">
                        {apt.status}
                      </span>
                    </div>
                    <p className="font-bold text-slate-900">{apt.visitor_name}</p>
                    <p className="text-[11px] text-slate-500">
                      Host: {apt.person_to_meet_name} • {apt.appointment_time}
                    </p>
                    <div className="pt-1 flex justify-end">
                      <button
                        type="button"
                        onClick={() => navigate(`/visitors/entry?appointmentId=${apt.id}`)}
                        className="text-[11px] font-bold text-emerald-700 hover:underline flex items-center gap-1"
                      >
                        Issue Gate Pass <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Purpose Breakdown */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-4 space-y-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-2.5">
              <Building2 className="w-4 h-4 text-brand-600" />
              30-Day Purpose Distribution
            </h3>
            {data.purposeBreakdown.length === 0 ? (
              <p className="text-xs text-slate-400 py-3 text-center">No recent pass data yet.</p>
            ) : (
              <div className="space-y-2.5">
                {data.purposeBreakdown.map((item) => {
                  const pct = Math.round(((Number(item.count) || 0) / maxPurpose) * 100);
                  return (
                    <div key={item.purpose} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="font-medium text-slate-700 truncate pr-2">{item.purpose}</span>
                        <span className="font-mono font-bold text-slate-900">{item.count}</span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-brand-600 rounded-full"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
