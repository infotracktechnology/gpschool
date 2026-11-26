import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Save, Loader2 } from 'lucide-react';
import { inventoryService } from '../../services/inventoryService';
import { useAuth } from '../../context/AuthContext';
import { PageHeader, Field, inputCls, btnPrimary, btnSecondary, cardCls } from './_shared';

// mode: 'in' | 'out' | 'adjust'
export const StockOperationForm = ({ mode }) => {
  const navigate = useNavigate();
  const { branches, selectedBranch } = useAuth();
  const isAdjust = mode === 'adjust';
  const [items, setItems] = useState([]);
  const [form, setForm] = useState({
    branch_id: selectedBranch?.id && selectedBranch.id !== 'all' ? selectedBranch.id : '',
    movement_type: isAdjust ? 'increase' : '',
    reason: '', notes: '', batch_number: '', expiry_date: '', serial_number: '',
    reference_type: '', reference_id: '',
  });
  const [line, setLine] = useState({ item_id: '', quantity: '', unit_cost: '', unit_price: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      const res = await inventoryService.getItems({ status: 'active' });
      if (res.success) setItems(res.items || []);
    })();
  }, []);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const titles = { in: 'Stock In', out: 'Stock Out', adjust: 'Stock Adjustment' };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!line.item_id || !Number(line.quantity)) return setError('Select item and enter quantity.');
    if (mode === 'out' && Number(line.quantity) <= 0) return setError('Quantity must be positive.');
    if (mode === 'adjust' && !form.movement_type) return setError('Select adjustment type.');
    setSaving(true);
    try {
      const payload = {
        branch_id: Number(form.branch_id), item_id: Number(line.item_id),
        quantity: Number(line.quantity),
        unit_cost: Number(line.unit_cost) || 0,
        unit_price: Number(line.unit_price) || 0,
        reason: form.reason || null, notes: form.notes || null,
        batch_number: form.batch_number || null,
        expiry_date: form.expiry_date || null,
        serial_number: form.serial_number || null,
        reference_type: form.reference_type || null,
        reference_id: form.reference_id ? Number(form.reference_id) : null,
      };
      if (mode === 'in') await inventoryService.stockIn(payload);
      else if (mode === 'out') await inventoryService.stockOut(payload);
      else await inventoryService.stockAdjust({ ...payload, movement_type: form.movement_type });
      navigate('/inventory/stock-movements');
    } catch (err) { setError(err.message); }
    finally { setSaving(false); }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <PageHeader badge="Stock" title={titles[mode]} subtitle="Manual stock operation." onBack="/inventory/stock-movements" />

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm">{error}</div>}

        <div className={`${cardCls} p-5 space-y-4`}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Branch" required>
              <select className={inputCls} value={form.branch_id} onChange={set('branch_id')} required>
                <option value="">— Select Branch —</option>
                {(branches || []).filter((b) => b.id !== 'all').map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </Field>
            <Field label="Item" required>
              <select className={inputCls} value={line.item_id} onChange={(e) => setLine({ ...line, item_id: e.target.value })} required>
                <option value="">— Select Item —</option>
                {items.map((it) => <option key={it.id} value={it.id}>{it.item_code} — {it.name}</option>)}
              </select>
            </Field>
            <Field label={isAdjust ? 'New Quantity' : 'Quantity'} required>
              <input type="number" step="0.01" min={mode === 'out' ? '0.01' : '0'} className={inputCls} value={line.quantity} onChange={(e) => setLine({ ...line, quantity: e.target.value })} required />
            </Field>
            {!isAdjust && (
              <>
                <Field label="Unit Cost"><input type="number" step="0.01" className={inputCls} value={line.unit_cost} onChange={(e) => setLine({ ...line, unit_cost: e.target.value })} /></Field>
                <Field label="Unit Price"><input type="number" step="0.01" className={inputCls} value={line.unit_price} onChange={(e) => setLine({ ...line, unit_price: e.target.value })} /></Field>
              </>
            )}
            {isAdjust && (
              <Field label="Adjustment Type" required>
                <select className={inputCls} value={form.movement_type} onChange={set('movement_type')} required>
                  <option value="">— Select —</option>
                  <option value="increase">Increase</option>
                  <option value="decrease">Decrease</option>
                  <option value="correction">Correction</option>
                </select>
              </Field>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Field label="Batch Number"><input className={inputCls} value={form.batch_number} onChange={set('batch_number')} /></Field>
            <Field label="Expiry Date"><input type="date" className={inputCls} value={form.expiry_date} onChange={set('expiry_date')} /></Field>
            <Field label="Serial Number"><input className={inputCls} value={form.serial_number} onChange={set('serial_number')} /></Field>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Reason"><input className={inputCls} value={form.reason} onChange={set('reason')} placeholder={mode === 'out' ? 'e.g. Issued to lab' : mode === 'in' ? 'e.g. Found stock' : 'e.g. Physical count correction'} /></Field>
            <Field label="Notes"><input className={inputCls} value={form.notes} onChange={set('notes')} /></Field>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Reference Type"><input className={inputCls} value={form.reference_type} onChange={set('reference_type')} placeholder="e.g. manual, requisition" /></Field>
            <Field label="Reference ID"><input type="number" className={inputCls} value={form.reference_id} onChange={set('reference_id')} /></Field>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <button type="button" onClick={() => navigate('/inventory/stock-movements')} className={btnSecondary}>Cancel</button>
          <button type="submit" disabled={saving} className={btnPrimary}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {titles[mode]}
          </button>
        </div>
      </form>
    </div>
  );
};
