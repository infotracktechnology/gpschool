import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeftRight, Save, Loader2 } from 'lucide-react';
import { inventoryService } from '../../services/inventoryService';
import { useAuth } from '../../context/AuthContext';
import { PageHeader, Field, inputCls, btnPrimary, btnSecondary, cardCls, fmtDate } from './_shared';

export const StockTransferForm = () => {
  const navigate = useNavigate();
  const params = useParams();
  const transferId = params.id;
  const isView = Boolean(transferId);
  const { branches, selectedBranch } = useAuth();
  const [form, setForm] = useState({
    from_branch_id: selectedBranch?.id && selectedBranch.id !== 'all' ? selectedBranch.id : '',
    to_branch_id: '', reason: '', notes: '',
  });
  const [lines, setLines] = useState([{ item_id: '', quantity: '', unit_cost: '', batch_number: '', expiry_date: '' }]);
  const [items, setItems] = useState([]);
  const [transfer, setTransfer] = useState(null);
  const [loading, setLoading] = useState(isView);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      const res = await inventoryService.getItems({ status: 'active' });
      if (res.success) setItems(res.items || []);
    })();
    if (!isView) return;
    (async () => {
      try {
        const res = await inventoryService.getStockTransfer(transferId);
        if (res.success && res.transfer) {
          setTransfer(res.transfer);
          setForm({
            from_branch_id: res.transfer.from_branch_id,
            to_branch_id: res.transfer.to_branch_id,
            reason: res.transfer.reason || '', notes: res.transfer.notes || '',
          });
          setLines((res.items || []).map((it) => ({
            item_id: it.item_id, quantity: Number(it.quantity), unit_cost: Number(it.unit_cost),
            batch_number: it.batch_number || '', expiry_date: it.expiry_date?.slice(0, 10) || '',
          })));
        }
      } catch (e) { setError(e.message); }
      finally { setLoading(false); }
    })();
  }, [transferId, isView]);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const setLine = (i, k, v) => {
    const next = [...lines];
    next[i] = { ...next[i], [k]: v };
    setLines(next);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const valid = lines.filter((l) => l.item_id && Number(l.quantity) > 0);
    if (valid.length === 0) return setError('Add at least one item.');
    setSaving(true);
    try {
      await inventoryService.createStockTransfer({
        ...form,
        from_branch_id: Number(form.from_branch_id),
        to_branch_id: Number(form.to_branch_id),
        items: valid.map((l) => ({
          item_id: Number(l.item_id), quantity: Number(l.quantity),
          unit_cost: Number(l.unit_cost) || 0,
          batch_number: l.batch_number || null, expiry_date: l.expiry_date || null,
        })),
      });
      navigate('/inventory/stock-movements');
    } catch (err) { setError(err.message); }
    finally { setSaving(false); }
  };

  if (loading) return <div className="p-6 text-sm text-slate-400">Loading...</div>;

  if (isView && transfer) {
    return (
      <div className="p-6 max-w-3xl mx-auto space-y-6">
        <PageHeader
          badge={transfer.transfer_number}
          title="Stock Transfer"
          subtitle={`${transfer.from_branch_name} → ${transfer.to_branch_name} • ${fmtDate(transfer.transfer_date)}`}
          actions={<span className={`px-3 py-1 rounded-full text-xs font-bold ${transfer.status === 'completed' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>{transfer.status}</span>}
          onBack="/inventory/stock-movements"
        />
        <div className={`${cardCls} p-5 space-y-3`}>
          {transfer.reason && <p className="text-sm text-slate-600"><span className="text-xs text-slate-400">Reason:</span> {transfer.reason}</p>}
          {transfer.notes && <p className="text-sm text-slate-600"><span className="text-xs text-slate-400">Notes:</span> {transfer.notes}</p>}
          <div className="overflow-x-auto pt-2">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wide text-slate-400 border-b border-slate-100">
                  <th className="pb-2 font-semibold">Item</th>
                  <th className="pb-2 font-semibold text-right">Qty</th>
                  <th className="pb-2 font-semibold">Batch</th>
                  <th className="pb-2 font-semibold">Expiry</th>
                </tr>
              </thead>
              <tbody>
                {(transfer.items || []).map((it, i) => (
                  <tr key={i} className="border-b border-slate-50">
                    <td className="py-2 font-medium text-slate-800">{it.item_name}</td>
                    <td className="py-2 text-right font-bold">{Number(it.quantity)}</td>
                    <td className="py-2 text-xs text-slate-500">{it.batch_number || '—'}</td>
                    <td className="py-2 text-xs text-slate-500">{it.expiry_date ? fmtDate(it.expiry_date) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <PageHeader badge="Stock" title="Stock Transfer" subtitle="Move stock between branches." onBack="/inventory/stock-movements" />

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm">{error}</div>}

        <div className={`${cardCls} p-5`}>
          <h3 className="text-sm font-bold text-slate-800 mb-4">Transfer Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="From Branch" required>
              <select className={inputCls} value={form.from_branch_id} onChange={set('from_branch_id')} required>
                <option value="">— Select —</option>
                {(branches || []).filter((b) => b.id !== 'all').map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </Field>
            <Field label="To Branch" required>
              <select className={inputCls} value={form.to_branch_id} onChange={set('to_branch_id')} required>
                <option value="">— Select —</option>
                {(branches || []).filter((b) => b.id !== 'all' && String(b.id) !== String(form.from_branch_id)).map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </Field>
            <Field label="Reason"><input className={inputCls} value={form.reason} onChange={set('reason')} placeholder="e.g. Branch requisition" /></Field>
            <Field label="Notes"><input className={inputCls} value={form.notes} onChange={set('notes')} /></Field>
          </div>
        </div>

        <div className={`${cardCls} p-5`}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-800">Items</h3>
            <button type="button" onClick={() => setLines([...lines, { item_id: '', quantity: '', unit_cost: '', batch_number: '', expiry_date: '' }])} className="px-3 py-1.5 bg-brand-50 hover:bg-brand-100 text-brand-700 text-xs font-bold rounded-lg">+ Add Item</button>
          </div>
          <div className="space-y-3">
            {lines.map((l, i) => (
              <div key={i} className="grid grid-cols-2 md:grid-cols-6 gap-2 items-end">
                <div className="col-span-2">
                  <select className={inputCls} value={l.item_id} onChange={(e) => setLine(i, 'item_id', e.target.value)}>
                    <option value="">— Item —</option>
                    {items.map((it) => <option key={it.id} value={it.id}>{it.item_code} — {it.name}</option>)}
                  </select>
                </div>
                <input type="number" step="0.01" min="0" placeholder="Qty" className={inputCls} value={l.quantity} onChange={(e) => setLine(i, 'quantity', e.target.value)} />
                <input type="number" step="0.01" min="0" placeholder="Cost" className={inputCls} value={l.unit_cost} onChange={(e) => setLine(i, 'unit_cost', e.target.value)} />
                <input placeholder="Batch" className={inputCls} value={l.batch_number} onChange={(e) => setLine(i, 'batch_number', e.target.value)} />
                <input type="date" className={inputCls} value={l.expiry_date} onChange={(e) => setLine(i, 'expiry_date', e.target.value)} />
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <button type="button" onClick={() => navigate('/inventory/stock-movements')} className={btnSecondary}>Cancel</button>
          <button type="submit" disabled={saving} className={btnPrimary}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowLeftRight className="w-4 h-4" />}
            Create Transfer
          </button>
        </div>
      </form>
    </div>
  );
};
