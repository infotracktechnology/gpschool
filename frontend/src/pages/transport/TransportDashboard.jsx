import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Activity, AlertTriangle, Bus, CircleDollarSign, RefreshCw, Users } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { PageHeader, EmptyState, cardCls } from '../inventory/_shared';
import { transportService } from '../../services/transportService';
import { scopeParams, transportPaths } from './_shared';

const cards = [
  ['vehicles', 'Vehicles', Bus], ['active_allocations', 'Active allocations', Users],
  ['trips_today', 'Trips today', Activity], ['outstanding_fees', 'Outstanding fees', CircleDollarSign],
  ['expiring_documents', 'Expiring documents', AlertTriangle],
];

export function TransportDashboard() {
  const { selectedBranch, selectedAcademicYear } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try { setData(await transportService.getDashboard(scopeParams(selectedBranch, selectedAcademicYear))); }
    catch (err) { setError(err?.data?.message || err?.message || 'Unable to load the transport overview.'); }
    finally { setLoading(false); }
  }, [selectedBranch?.id, selectedAcademicYear?.id]);
  useEffect(() => { load(); }, [load]);
  const kpis = data?.kpis || data?.summary || {};
  const trips = data?.recent_trips || data?.trips || [];
  return <div className="p-5 md:p-6 max-w-7xl mx-auto space-y-5">
    <PageHeader badge="Transport" title="Transport Overview" subtitle={`Fleet, routes, student service and compliance${selectedBranch?.name ? ` · ${selectedBranch.name}` : ''}`}
      actions={<button onClick={load} className="px-3 py-2 rounded-xl bg-slate-100 text-slate-700 text-sm font-semibold flex items-center gap-2"><RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />Refresh</button>} />
    {error && <div role="alert" className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-sm text-rose-700">{error}</div>}
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
      {cards.map(([key, label, Icon]) => <div key={key} className={`${cardCls} p-4 flex gap-3 items-center`}>
        <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-700 flex items-center justify-center"><Icon className="w-5 h-5" /></div>
        <div><p className="text-[11px] uppercase tracking-wide text-slate-500 font-semibold">{label}</p><p className="text-xl font-bold text-slate-900">{loading ? '—' : (kpis[key] ?? 0)}</p></div>
      </div>)}
    </div>
    <section className={`${cardCls} p-4`}>
      <h2 className="font-bold text-slate-800 mb-3">Transport workspace</h2>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">{transportPaths.slice(1).map(([path, label]) => <Link key={path} to={path} className="rounded-xl border border-slate-200 px-3 py-3 text-sm font-semibold text-slate-700 hover:border-sky-300 hover:bg-sky-50">{label}<span className="float-right text-sky-600">→</span></Link>)}</div>
    </section>
    <section className={`${cardCls} p-4`}>
      <h2 className="font-bold text-slate-800 mb-2">Recent trips</h2>
      {loading ? <p className="py-8 text-center text-sm text-slate-500"><RefreshCw className="w-4 h-4 animate-spin inline mr-2" />Loading trip activity…</p>
        : trips.length === 0 ? <EmptyState icon={Bus} message="No recent trip activity" />
          : <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="text-left text-xs text-slate-500 border-b"><th className="py-2">Date</th><th>Route</th><th>Vehicle</th><th>Direction</th><th>Status</th></tr></thead><tbody>{trips.slice(0, 10).map((trip) => <tr key={trip.id} className="border-b border-slate-50"><td className="py-2">{trip.trip_date || '—'}</td><td>{trip.route_name || '—'}</td><td>{trip.vehicle_registration || '—'}</td><td>{trip.direction || '—'}</td><td>{trip.status || '—'}</td></tr>)}</tbody></table></div>}
    </section>
  </div>;
}
