import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Save, Loader2, AlertTriangle, ClipboardCheck, XCircle } from 'lucide-react';
import { inventoryService } from '../../services/inventoryService';
import { useAuth } from '../../context/AuthContext';
import { PageHeader, Field, inputCls, btnPrimary, btnSecondary, cardCls, fmtMoney, fmtDate, EmptyState } from './_shared';

export const DamageReportForm = () => {
  const navigate = useNavigate();
  const { branches, selectedBranch } = useAuth();
  const [items, setItems] = useState([]);
  const [form, setForm] = useState({
    branch_id: selectedBranch?.id && selectedBranch.id !== 'all' ? selectedBranch.id : '',
    item_id: '', damage_date: new Date().toISOString().slice(0, 10),
    quantity: '', reason: '', damage_type: '', condition: '', location: '', remarks: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      const res = await inventoryService.getItems({ status: 'active' });
      if (res.success) setItems(res.items || []);
    })();
  }, []);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.branch_id || !form.item_id || !Number(form.quantity)) return setError('Branch, item and quantity are required.');
    setSaving(true);
    try {
      await inventoryService.reportDamage({
        ...form,
        branch_id: Number(form.branch_id), item_id: Number(form.item_id),
        quantity: Number(form.quantity),
        damage_type: form.damage_type || null, condition: form.condition || null,
        location: form.location || null,
      });
      navigate('/inventory/damaged-items');
    } catch (err) { setError(err.message); }
    finally { setSaving(false); }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <PageHeader badge="Stock" title="Report Damaged Item" subtitle="Record a damaged stock item for inspection." onBack="/inventory/damaged-items" />
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm">{error}</div>}
        <div className={`${cardCls} p-5 space-y-4`}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Branch" required>
              <select className={inputCls} value={form.branch_id} onChange={set('branch_id')} required>
                <option value="">— Select —</option>
                {(branches || []).filter((b) => b.id !== 'all').map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </Field>
            <Field label="Item" required>
              <select className={inputCls} value={form.item_id} onChange={set('item_id')} required>
                <option value="">— Select Item —</option>
                {items.map((it) => <option key={it.id} value={it.id}>{it.item_code} — {it.name}</option>)}
              </select>
            </Field>
            <Field label="Damage Date" required><input type="date" className={inputCls} value={form.damage_date} onChange={set('damage_date')} required /></Field>
            <Field label="Quantity" required><input type="number" step="0.01" min="0.01" className={inputCls} value={form.quantity} onChange={set('quantity')} required /></Field>
            <Field label="Damage Type">
              <select className={inputCls} value={form.damage_type} onChange={set('damage_type')}>
                <option value="">— Select —</option>
                <option value="physical">Physical</option>
                <option value="water">Water</option>
                <option value="expired">Expired</option>
                <option value="broken">Broken</option>
                <option value="contaminated">Contaminated</option>
                <option value="other">Other</option>
              </select>
            </Field>
            <Field label="Condition">
              <select className={inputCls} value={form.condition} onChange={set('condition')}>
                <option value="">— Select —</option>
                <option value="poor">Poor</option>
                <option value="unusable">Unusable</option>
                <option value="partial">Partially usable</option>
              </select>
            </Field>
            <Field label="Location"><input className={inputCls} value={form.location} onChange={set('location')} placeholder="e.g. Store Room A" /></Field>
            <Field label="Reason"><input className={inputCls} value={form.reason} onChange={set('reason')} placeholder="e.g. Shelf collapse" /></Field>
          </div>
          <Field label="Remarks"><textarea className={`${inputCls} min-h-[70px]`} value={form.remarks} onChange={set('remarks')} /></Field>
        </div>
        <div className="flex justify-end gap-3">
          <button type="button" onClick={() => navigate('/inventory/damaged-items')} className={btnSecondary}>Cancel</button>
          <button type="submit" disabled={saving} className={btnPrimary}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <AlertTriangle className="w-4 h-4" />}
            Report Damage
          </button>
        </div>
      </form>
    </div>
  );
};

export const DamageInspectForm = ({ damageId }) => {
  const navigate = useNavigate();
  const { id } = useParams();
  const targetId = damageId || id;
  const [damage, setDamage] = useState(null);
  const [form, setForm] = useState({ inspection_result: '', estimated_loss: '', remarks: '', resolution_action: 'write_off' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const res = await inventoryService.getDamageReport(targetId);
        if (res.success && res.damage_report) setDamage(res.damage_report);
      } finally { setLoading(false); }
    })();
  }, [targetId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      await inventoryService.inspectDamage(targetId, {
        inspection_result: form.inspection_result,
        estimated_loss: Number(form.estimated_loss) || 0,
        remarks: form.remarks,
        resolution_action: form.resolution_action,
      });
      navigate('/inventory/damaged-items');
    } catch (err) { setError(err.message); }
    finally { setSaving(false); }
  };

  if (loading) return <div className="p-6 text-sm text-slate-400">Loading...</div>;
  if (!damage) return <div className="p-6"><EmptyState message="Damage report not found" /></div>;

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <PageHeader badge={damage.damage_number} title={`Inspect — ${damage.item_name}`} subtitle={`${damage.branch_name || ''} • Qty ${Number(damage.quantity)}`} onBack="/inventory/damaged-items" />
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm">{error}</div>}
        <div className={`${cardCls} p-5 space-y-4`}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Damage Date"><p className="text-sm text-slate-700 py-2">{fmtDate(damage.damage_date)}</p></Field>
            <Field label="Reason"><p className="text-sm text-slate-700 py-2">{damage.reason || '—'}</p></Field>
            <Field label="Damage Type"><p className="text-sm text-slate-700 py-2 capitalize">{damage.damage_type || '—'}</p></Field>
            <Field label="Reported Value"><p className="text-sm font-semibold text-slate-800 py-2">{fmtMoney(damage.reported_value)}</p></Field>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Inspection Result" required>
              <select className={inputCls} value={form.inspection_result} onChange={(e) => setForm({ ...form, inspection_result: e.target.value })} required>
                <option value="">— Select —</option>
                <option value="confirmed_damaged">Confirmed Damaged</option>
                <option value="partially_damaged">Partially Damaged</option>
                <option value="false_alarm">False Alarm</option>
              </select>
            </Field>
            <Field label="Estimated Loss (₹)"><input type="number" step="0.01" className={inputCls} value={form.estimated_loss} onChange={(e) => setForm({ ...form, estimated_loss: e.target.value })} /></Field>
            <Field label="Resolution">
              <select className={inputCls} value={form.resolution_action} onChange={(e) => setForm({ ...form, resolution_action: e.target.value })}>
                <option value="write_off">Write Off</option>
                <option value="return_to_stock">Return to Stock</option>
                <option value="repair">Repair</option>
              </select>
            </Field>
          </div>
          <Field label="Remarks"><textarea className={`${inputCls} min-h-[70px]`} value={form.remarks} onChange={(e) => setForm({ ...form, remarks: e.target.value })} /></Field>
        </div>
        <div className="flex justify-end gap-3">
          <button type="button" onClick={() => navigate('/inventory/damaged-items')} className={btnSecondary}>Cancel</button>
          <button type="submit" disabled={saving} className={btnPrimary}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <ClipboardCheck className="w-4 h-4" />}
            Submit Inspection
          </button>
        </div>
      </form>
    </div>
  );
};

export const DamageView = ({ damageId }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const targetId = damageId || id;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await inventoryService.getDamageReport(targetId);
        if (res.success) setData(res);
      } finally { setLoading(false); }
    })();
  }, [targetId]);

  if (loading) return <div className="p-6 text-sm text-slate-400">Loading...</div>;
  if (!data?.damage_report) return <div className="p-6"><EmptyState message="Not found" /></div>;
  const d = data.damage_report;

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <PageHeader
        badge={d.damage_number}
        title={`Damage — ${d.item_name}`}
        subtitle={`${d.branch_name || ''} • ${fmtDate(d.damage_date)}`}
        actions={
          <>
            <StatusBadge status={d.status} />
            {d.status === 'reported' && (
              <button onClick={() => navigate(`/inventory/damaged-items/${d.id}/inspect`)} className={btnPrimary}><ClipboardCheck className="w-4 h-4" /> Inspect</button>
            )}
          </>
        }
        onBack="/inventory/damaged-items"
      />
      <div className={`${cardCls} p-5`}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div><p className="text-[11px] text-slate-400 uppercase font-semibold">Quantity</p><p className="text-sm font-bold text-slate-800">{Number(d.quantity)}</p></div>
          <div><p className="text-[11px] text-slate-400 uppercase font-semibold">Reported Value</p><p className="text-sm font-bold text-rose-700">{fmtMoney(d.reported_value)}</p></div>
          <div><p className="text-[11px] text-slate-400 uppercase font-semibold">Reason</p><p className="text-sm font-medium text-slate-800">{d.reason || '—'}</p></div>
          <div><p className="text-[11px] text-slate-400 uppercase font-semibold">Type</p><p className="text-sm font-medium text-slate-800 capitalize">{d.damage_type || '—'}</p></div>
          {d.inspection_result && <div><p className="text-[11px] text-slate-400 uppercase font-semibold">Inspection</p><p className="text-sm font-medium text-slate-800 capitalize">{d.inspection_result.replace(/_/g, ' ')}</p></div>}
          {d.estimated_loss > 0 && <div><p className="text-[11px] text-slate-400 uppercase font-semibold">Est. Loss</p><p className="text-sm font-bold text-rose-700">{fmtMoney(d.estimated_loss)}</p></div>}
          {d.resolution_action && <div><p className="text-[11px] text-slate-400 uppercase font-semibold">Resolution</p><p className="text-sm font-medium text-slate-800 capitalize">{d.resolution_action.replace(/_/g, ' ')}</p></div>}
        </div>
        {d.remarks && <p className="text-sm text-slate-600 mt-4 pt-3 border-t border-slate-100">{d.remarks}</p>}
      </div>
    </div>
  );
};
