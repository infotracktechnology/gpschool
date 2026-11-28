import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  BarChart3,
  BedDouble,
  Building2,
  CalendarCheck,
  ClipboardList,
  DoorOpen,
  RefreshCw,
  ShieldCheck,
  Wrench,
} from 'lucide-react';
import { api } from '../../api/client';
import { PageHeader, cardCls } from '../inventory/_shared';
import { HOSTEL_REPORTS } from './hostelConfig';

const links = [
  { path: '/hostel/setup', title: 'Hostels', icon: Building2 },
  { path: '/hostel/wardens', title: 'Wardens', icon: ShieldCheck },
  { path: '/hostel/blocks', title: 'Blocks', icon: Building2 },
  { path: '/hostel/floors', title: 'Floors', icon: Building2 },
  { path: '/hostel/rooms', title: 'Rooms', icon: Building2 },
  { path: '/hostel/beds', title: 'Beds', icon: BedDouble },
  { path: '/hostel/allocations', title: 'Student allocation', icon: ClipboardList },
  { path: '/hostel/attendance', title: 'In / out attendance', icon: DoorOpen },
  { path: '/hostel/gate-passes', title: 'Gate passes', icon: ShieldCheck },
  { path: '/hostel/fees', title: 'Hostel fees', icon: ClipboardList },
  { path: '/hostel/collections', title: 'Fee collections', icon: ClipboardList },
  { path: '/hostel/mess', title: 'Mess menu', icon: CalendarCheck },
  { path: '/hostel/complaints', title: 'Complaints', icon: AlertCircle },
  { path: '/hostel/maintenance', title: 'Maintenance', icon: Wrench },
];

export default function HostelDashboard() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.get('/hostel/dashboard');
      setData(response.kpis || {});
    } catch (err) {
      setError(err?.data?.message || err?.message || 'Unable to load Hostel overview.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const kpis = [
    ['Active hostels', data?.hostels ?? 0, Building2],
    ['Beds in service', data?.beds ?? 0, BedDouble],
    ['Active allocations', data?.active_allocations ?? 0, ClipboardList],
    ['Pending gate passes', data?.pending_gate_passes ?? 0, ShieldCheck],
    ['Open complaints', data?.open_complaints ?? 0, AlertCircle],
    ['Open maintenance', data?.open_maintenance ?? 0, Wrench],
    ['Check-ins today', data?.check_ins_today ?? 0, DoorOpen],
    ['Check-outs today', data?.check_outs_today ?? 0, DoorOpen],
  ];

  return (
    <div className="p-5 md:p-6 max-w-7xl mx-auto space-y-5">
      <PageHeader
        badge="Hostel Management"
        title="Hostel Overview"
        subtitle="Manage accommodation, resident movements, services, and reports."
        actions={<button type="button" onClick={load} className="px-3 py-2 rounded-xl bg-slate-100 text-slate-700 text-sm font-semibold flex items-center gap-2"><RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />Refresh</button>}
      />
      {error && <div role="alert" className="p-3 rounded-xl border border-rose-200 bg-rose-50 text-sm text-rose-700">{error}</div>}
      <section className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {kpis.map(([label, value, Icon]) => (
          <div key={label} className={`${cardCls} p-4 flex items-center gap-3`}>
            <span className="w-10 h-10 rounded-xl bg-sky-50 text-sky-700 flex items-center justify-center"><Icon className="w-5 h-5" /></span>
            <div><p className="text-xs font-semibold text-slate-500">{label}</p><p className="text-2xl font-extrabold text-slate-900">{loading ? '—' : value}</p></div>
          </div>
        ))}
      </section>
      <section className={`${cardCls} p-4`}>
        <div className="flex items-center justify-between gap-3 mb-3">
          <div><h2 className="font-bold text-slate-900">Hostel operations</h2><p className="text-xs text-slate-500 mt-1">Setup, allocations, daily services and support.</p></div>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-2">
          {links.map(({ path, title, icon: Icon }) => (
            <button key={path} type="button" onClick={() => navigate(path)} className="flex items-center gap-2.5 text-left p-3 rounded-xl border border-slate-200 hover:border-sky-300 hover:bg-sky-50/60 transition-colors">
              <Icon className="w-4 h-4 text-sky-700 shrink-0" /><span className="text-sm font-semibold text-slate-700">{title}</span>
            </button>
          ))}
        </div>
      </section>
      <section className={`${cardCls} p-4`}>
        <h2 className="flex items-center gap-2 font-bold text-slate-900 mb-3"><BarChart3 className="w-4 h-4 text-sky-700" />Reports</h2>
        <div className="flex flex-wrap gap-2">
          {HOSTEL_REPORTS.map((report) => <button key={report.type} type="button" onClick={() => navigate(`/hostel/reports/${report.type}`)} className="px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-sm font-semibold text-slate-700">{report.title}</button>)}
        </div>
      </section>
    </div>
  );
}
