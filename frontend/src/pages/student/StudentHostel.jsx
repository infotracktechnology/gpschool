import React, { useCallback, useEffect, useState } from 'react';
import { AlertCircle, BedDouble, CalendarDays, CircleDollarSign, DoorOpen, RefreshCw, Send } from 'lucide-react';
import { api } from '../../api/client';
import {
  btnPrimary,
  cardCls,
  EmptyState,
  Field,
  fmtMoney,
  inputCls,
  PageHeader,
  StatusBadge,
} from '../inventory/_shared';

const datetimeValue = (value) => value ? String(value).replace(' ', 'T').slice(0, 16) : '—';

export default function StudentHostel() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [pass, setPass] = useState({ reason: '', departure_at: '', expected_return_at: '' });
  const [complaint, setComplaint] = useState({ category: '', subject: '', description: '' });

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setData(await api.get('/hostel/student/me'));
    } catch (err) {
      setError(err?.data?.message || err?.message || 'Your Hostel details are unavailable.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const submit = async (event, endpoint, payload, reset) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const requestPayload = endpoint.includes('gate-passes')
        ? {
          ...payload,
          departure_at: payload.departure_at.replace('T', ' '),
          expected_return_at: payload.expected_return_at.replace('T', ' '),
        }
        : payload;
      await api.post(endpoint, requestPayload);
      reset();
      setNotice(endpoint.includes('gate-passes') ? 'Gate pass request submitted for approval.' : 'Hostel complaint submitted.');
      await load();
    } catch (err) {
      setError(err?.data?.message || err?.message || 'Unable to submit your request.');
    } finally {
      setSaving(false);
    }
  };

  const allocation = data?.allocation;
  const fees = data?.fees || [];
  const totalBalance = fees.reduce((sum, fee) => sum + Math.max(0, Number(fee.balance) || 0), 0);

  return (
    <div className="p-5 md:p-6 max-w-6xl mx-auto space-y-5">
      <PageHeader
        badge="Student Portal"
        title="My Hostel"
        subtitle="View your room, fee balance, mess menu and hostel requests."
        actions={<button type="button" onClick={load} className="px-3 py-2 rounded-xl bg-slate-100 text-slate-700 text-sm font-semibold flex items-center gap-2"><RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />Refresh</button>}
      />
      {error && <div role="alert" className="flex items-start gap-2 p-3 rounded-xl border border-rose-200 bg-rose-50 text-sm text-rose-700"><AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />{error}</div>}
      {notice && <div role="status" className="p-3 rounded-xl border border-emerald-200 bg-emerald-50 text-sm text-emerald-700">{notice}</div>}
      {loading ? <div className={`${cardCls} p-12 text-center text-slate-500`}><RefreshCw className="w-5 h-5 animate-spin inline mr-2" />Loading your Hostel details…</div> : <>
        <section className={`${cardCls} p-5`}>
          <div className="flex items-center gap-2 font-bold text-slate-900 mb-4"><BedDouble className="w-5 h-5 text-sky-600" />Room allocation</div>
          {allocation ? <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
            {[['Hostel', allocation.hostel_name], ['Block', allocation.block_name], ['Floor', allocation.floor_name], ['Room', allocation.room_number], ['Bed', allocation.bed_number], ['Start date', allocation.start_date], ['Status', allocation.allocation_status]].map(([label, value]) => <div key={label}><p className="text-xs text-slate-500">{label}</p><p className="font-semibold text-slate-800 mt-1 capitalize">{value || '—'}</p></div>)}
          </div> : <EmptyState icon={BedDouble} message="No active hostel room allocation is linked to your account." />}
        </section>

        <section className={`${cardCls} p-5`}>
          <div className="flex items-center justify-between gap-3 mb-4">
            <h2 className="flex items-center gap-2 font-bold text-slate-900"><CircleDollarSign className="w-5 h-5 text-emerald-600" />Hostel fees</h2>
            <span className="text-sm font-bold text-rose-700">Outstanding: {fmtMoney(totalBalance)}</span>
          </div>
          {fees.length ? <div className="overflow-x-auto"><table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="px-3 py-2">Fee</th><th className="px-3 py-2">Due date</th><th className="px-3 py-2">Billed</th><th className="px-3 py-2">Paid</th><th className="px-3 py-2">Balance</th></tr></thead>
            <tbody className="divide-y divide-slate-100">{fees.map((fee) => <tr key={fee.id}><td className="px-3 py-2 font-semibold">{fee.fee_name}</td><td className="px-3 py-2">{fee.due_date || '—'}</td><td className="px-3 py-2">{fmtMoney(fee.amount)}</td><td className="px-3 py-2">{fmtMoney(fee.paid)}</td><td className="px-3 py-2 font-semibold">{fmtMoney(fee.balance)}</td></tr>)}</tbody>
          </table></div> : <EmptyState message="No Hostel fees are currently assigned." />}
        </section>

        <section className={`${cardCls} p-5`}>
          <h2 className="flex items-center gap-2 font-bold text-slate-900 mb-3"><CalendarDays className="w-5 h-5 text-indigo-600" />Mess menu</h2>
          {data?.mess?.length ? <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">{data.mess.map((meal, index) => <article key={`${meal.menu_date}-${meal.meal_type}-${index}`} className="rounded-xl border border-slate-200 p-3"><p className="text-xs text-slate-500">{meal.menu_date}</p><p className="text-sm font-bold capitalize mt-1">{meal.meal_type}</p><p className="text-sm text-slate-700 mt-2 whitespace-pre-wrap">{meal.menu}</p></article>)}</div> : <EmptyState message="No upcoming mess menu is available." />}
        </section>

        <section className="grid lg:grid-cols-2 gap-5">
          <div className={`${cardCls} p-5`}>
            <h2 className="flex items-center gap-2 font-bold text-slate-900 mb-3"><DoorOpen className="w-5 h-5 text-amber-600" />Request a gate pass</h2>
            <form onSubmit={(event) => submit(event, '/hostel/student/gate-passes', pass, () => setPass({ reason: '', departure_at: '', expected_return_at: '' }))} className="space-y-3">
              <Field label="Reason" required><input required value={pass.reason} onChange={(event) => setPass((prev) => ({ ...prev, reason: event.target.value }))} className={inputCls} /></Field>
              <div className="grid sm:grid-cols-2 gap-3">
                <Field label="Departure" required><input type="datetime-local" required value={pass.departure_at} onChange={(event) => setPass((prev) => ({ ...prev, departure_at: event.target.value }))} className={inputCls} /></Field>
                <Field label="Expected return" required><input type="datetime-local" required value={pass.expected_return_at} onChange={(event) => setPass((prev) => ({ ...prev, expected_return_at: event.target.value }))} className={inputCls} /></Field>
              </div>
              <button type="submit" disabled={saving || !allocation} className={btnPrimary}><Send className="w-4 h-4" />Submit request</button>
            </form>
            <div className="mt-4 space-y-2">{(data?.gate_passes || []).slice(0, 5).map((item) => <div key={item.id} className="flex justify-between gap-3 border-t border-slate-100 pt-2 text-sm"><div><p className="font-semibold">{item.reason}</p><p className="text-xs text-slate-500">{datetimeValue(item.departure_at)} → {datetimeValue(item.expected_return_at)}</p></div><StatusBadge status={item.status} /></div>)}</div>
          </div>

          <div className={`${cardCls} p-5`}>
            <h2 className="font-bold text-slate-900 mb-3">Submit a complaint</h2>
            <form onSubmit={(event) => submit(event, '/hostel/student/complaints', complaint, () => setComplaint({ category: '', subject: '', description: '' }))} className="space-y-3">
              <Field label="Category" required><input required value={complaint.category} onChange={(event) => setComplaint((prev) => ({ ...prev, category: event.target.value }))} className={inputCls} placeholder="Maintenance, mess, safety…" /></Field>
              <Field label="Subject" required><input required value={complaint.subject} onChange={(event) => setComplaint((prev) => ({ ...prev, subject: event.target.value }))} className={inputCls} /></Field>
              <Field label="Details" required><textarea required rows={3} value={complaint.description} onChange={(event) => setComplaint((prev) => ({ ...prev, description: event.target.value }))} className={inputCls} /></Field>
              <button type="submit" disabled={saving} className={btnPrimary}><Send className="w-4 h-4" />Submit complaint</button>
            </form>
            <div className="mt-4 space-y-2">{(data?.complaints || []).slice(0, 5).map((item) => <div key={item.id} className="flex justify-between gap-3 border-t border-slate-100 pt-2 text-sm"><div><p className="font-semibold">{item.subject}</p><p className="text-xs text-slate-500">{item.category}</p></div><StatusBadge status={item.status} /></div>)}</div>
          </div>
        </section>

        <section className={`${cardCls} p-5`}>
          <h2 className="font-bold text-slate-900 mb-3">Recent hostel in/out activity</h2>
          {data?.attendance?.length ? <div className="space-y-2">{data.attendance.map((item, index) => <div key={`${item.movement_time}-${index}`} className="flex justify-between gap-3 border-b border-slate-100 pb-2 text-sm"><span>{String(item.movement_time || '').replace('T', ' ').slice(0, 19)}</span><StatusBadge status={item.movement === 'in' ? 'active' : 'pending'} label={item.movement === 'in' ? 'In' : 'Out'} /></div>)}</div> : <EmptyState message="No hostel movement records found." />}
        </section>
      </>}
    </div>
  );
}
