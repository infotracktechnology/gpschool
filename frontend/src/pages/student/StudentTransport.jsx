import React, { useCallback, useEffect, useState } from 'react';
import { AlertCircle, Bell, Bus, CalendarClock, CircleDollarSign, MapPin, RefreshCw } from 'lucide-react';
import { PageHeader, EmptyState, cardCls } from '../inventory/_shared';
import { transportService } from '../../services/transportService';

const asArray = (value) => Array.isArray(value) ? value : [];

export default function StudentTransport() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    setLoading(true); setError('');
    try { setData(await transportService.getStudentTransport()); }
    catch (err) { setError(err?.data?.message || err?.message || 'Transport details are temporarily unavailable.'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);
  const allocation = data?.allocation || data?.transport?.allocation || null;
  const route = data?.route || allocation?.route || data?.transport?.route || null;
  const trips = asArray(data?.trips || data?.recent_trips);
  const fees = data?.fees || data?.fee_status || null;
  const notifications = asArray(data?.notifications);
  return <div className="p-5 md:p-6 max-w-5xl mx-auto space-y-5">
    <PageHeader badge="Student Portal" title="My Transport" subtitle="Your assigned transport service, trip updates, fee status and notices."
      actions={<button onClick={load} className="px-3 py-2 rounded-xl bg-slate-100 text-slate-700 text-sm font-semibold flex items-center gap-2"><RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />Refresh</button>} />
    {error && <div role="alert" className="flex gap-2 p-3 rounded-xl border border-rose-200 bg-rose-50 text-sm text-rose-700"><AlertCircle className="w-4 h-4 shrink-0" />{error}</div>}
    {loading ? <div className={`${cardCls} p-12 text-center text-slate-500`}><RefreshCw className="w-5 h-5 animate-spin inline mr-2" />Loading your transport details…</div> : !allocation ? <section className={cardCls}><EmptyState icon={Bus} message="No active transport allocation is linked to your student account." /></section> : <>
      <section className={`${cardCls} p-5`}>
        <h2 className="flex items-center gap-2 font-bold text-slate-900 mb-4"><Bus className="w-5 h-5 text-sky-600" />Assigned service</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
          <div><p className="text-xs text-slate-500">Route</p><p className="font-semibold">{route?.name || allocation.route_name || '—'}{route?.route_code ? ` (${route.route_code})` : ''}</p></div>
          <div><p className="text-xs text-slate-500">Service mode</p><p className="font-semibold capitalize">{allocation.mode || '—'}</p></div>
          <div><p className="text-xs text-slate-500">Vehicle</p><p className="font-semibold">{allocation.vehicle_registration || data?.vehicle?.registration_number || '—'}</p></div>
          <div><p className="text-xs text-slate-500">Driver</p><p className="font-semibold">{allocation.driver_name || data?.driver?.full_name || '—'}{(allocation.driver_phone || data?.driver?.phone) ? ` · ${allocation.driver_phone || data.driver.phone}` : ''}</p></div>
          <div><p className="text-xs text-slate-500">Attendant</p><p className="font-semibold">{allocation.attendant_name || data?.attendant?.full_name || '—'}</p></div>
          <div><p className="text-xs text-slate-500">Status</p><p className="font-semibold capitalize">{allocation.status || 'Active'}</p></div>
        </div>
        <div className="mt-4 grid sm:grid-cols-2 gap-3">
          {allocation.mode !== 'drop' && <div className="rounded-xl bg-sky-50 border border-sky-100 p-3"><p className="text-xs font-semibold text-sky-700 flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />Pickup</p><p className="font-semibold text-sm mt-1">{allocation.pickup_stop_name || allocation.pickup_point || 'Not specified'}</p><p className="text-xs text-slate-500">{allocation.pickup_time || 'Time not listed'}</p></div>}
          {allocation.mode !== 'pickup' && <div className="rounded-xl bg-indigo-50 border border-indigo-100 p-3"><p className="text-xs font-semibold text-indigo-700 flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />Drop</p><p className="font-semibold text-sm mt-1">{allocation.drop_stop_name || allocation.drop_point || 'Not specified'}</p><p className="text-xs text-slate-500">{allocation.drop_time || 'Time not listed'}</p></div>}
        </div>
      </section>
      <div className="grid lg:grid-cols-2 gap-5">
        <section className={`${cardCls} p-4`}><h2 className="flex items-center gap-2 font-bold text-slate-800 mb-3"><CalendarClock className="w-4 h-4 text-sky-600" />Recent trips</h2>
          {trips.length ? <div className="space-y-2">{trips.slice(0, 8).map((trip) => <div key={trip.id} className="flex justify-between gap-3 border-b border-slate-100 py-2 text-sm"><span>{trip.trip_date || '—'} · <span className="capitalize">{trip.direction || 'trip'}</span></span><span className="font-semibold capitalize">{trip.status || '—'}</span></div>)}</div> : <EmptyState message="No recent trip updates" />}</section>
        <section className={`${cardCls} p-4`}><h2 className="flex items-center gap-2 font-bold text-slate-800 mb-3"><CircleDollarSign className="w-4 h-4 text-emerald-600" />Transport fee status</h2>
          {fees ? <div className="grid grid-cols-2 gap-3 text-sm">{[['Total due', fees.total_due ?? fees.fee_amount], ['Paid', fees.paid ?? fees.amount_paid], ['Balance', fees.balance ?? fees.outstanding], ['Status', fees.status]].map(([label, value]) => <div key={label} className="rounded-xl bg-slate-50 p-3"><p className="text-xs text-slate-500">{label}</p><p className="font-bold mt-1">{value ?? '—'}</p></div>)}</div> : <EmptyState message="No fee status provided" />}</section>
      </div>
      <section className={`${cardCls} p-4`}><h2 className="flex items-center gap-2 font-bold text-slate-800 mb-3"><Bell className="w-4 h-4 text-amber-600" />Transport notifications</h2>
        {notifications.length ? <div className="space-y-2">{notifications.map((notice) => <article key={notice.id} className="rounded-xl border border-slate-100 p-3"><div className="flex justify-between gap-3"><h3 className="font-semibold text-sm">{notice.title || 'Transport update'}</h3><time className="text-xs text-slate-400">{notice.created_at || ''}</time></div><p className="text-sm text-slate-600 mt-1">{notice.message || notice.body || ''}</p></article>)}</div> : <EmptyState message="No transport notifications" />}</section>
    </>}
  </div>;
}
