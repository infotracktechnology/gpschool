import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Save, Loader2 } from 'lucide-react';
import { inventoryService } from '../../services/inventoryService';
import { useAuth } from '../../context/AuthContext';
import { PageHeader, Field, inputCls, btnPrimary, btnSecondary, cardCls } from './_shared';

export const AllocationForm = () => {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const { branches, selectedBranch } = useAuth();
  const [lookups, setLookups] = useState({ items: [], departments: [], classes: [] });
  const [form, setForm] = useState({
    branch_id: selectedBranch?.id && selectedBranch.id !== 'all' ? selectedBranch.id : '',
    item_id: '', allocation_type: 'department', allocation_id: '',
    allocation_date: new Date().toISOString().slice(0, 10),
    quantity: '', unit_cost: '', batch_number: '', expiry_date: '', purpose: '',
  });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(isEdit);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      const [items, depts, classes] = await Promise.all([
        inventoryService.getItems({ status: 'active' }),
        fetch('/api/academics/departments').then((r) => r.json()).catch(() => ({ departments: [] })),
        fetch('/api/classes').then((r) => r.json()).catch(() => ({ classes: [] })),
      ]);
      setLookups({
        items: items.items || [],
        departments: depts.departments || depts.data || [],
        classes: classes.classes || classes.data || [],
      });
    })();
    if (!isEdit) return;
    (async () => {
      try {
        const res = await inventoryService.getAllocation(id);
        if (res.success && res.allocation) {
          const a = res.allocation;
          setForm({
            branch_id: a.branch_id, item_id: a.item_id, allocation_type: a.allocation_type,
            allocation_id: a.allocation_id || '', allocation_date: a.allocation_date?.slice(0, 10) || '',
            quantity: Number(a.quantity), unit_cost: Number(a.unit_cost),
            batch_number: a.batch_number || '', expiry_date: a.expiry_date?.slice(0, 10) || '',
            purpose: a.purpose || '',
          });
        }
      } catch (e) { setError(e.message); }
      finally { setLoading(false); }
    })();
  }, [id, isEdit]);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const targets = form.allocation_type === 'department' ? lookups.departments
    : form.allocation_type === 'class' ? lookups.classes : [];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.branch_id || !form.item_id) return setError('Branch and item are required.');
    if (form.allocation_type !== 'event' && !form.allocation_id) return setError('Select allocation target.');
    setSaving(true);
    try {
      const payload = {
        ...form,
        branch_id: Number(form.branch_id), item_id: Number(form.item_id),
        allocation_id: form.allocation_type === 'event' ? null : Number(form.allocation_id),
        quantity: Number(form.quantity), unit_cost: Number(form.unit_cost) || 0,
        batch_number: form.batch_number || null, expiry_date: form.expiry_date || null,
      };
      if (isEdit) await inventoryService.updateAllocation(id, payload);
      else await inventoryService.createAllocation(payload);
      navigate('/inventory/allocations');
    } catch (err) { setError(err.message); }
    finally { setSaving(false); }
  };

  if (loading) return <div className="p-6 text-sm text-slate-400">Loading...</div>;

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <PageHeader
        badge="Stock"
        title={isEdit ? 'Edit Allocation' : 'New Stock Allocation'}
        subtitle="Reserve stock for a department, class or event."
        onBack="/inventory/allocations"
      />

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
              <select className={inputCls} value={form.item_id} onChange={set('item_id')} required>
                <option value="">— Select Item —</option>
                {lookups.items.map((it) => <option key={it.id} value={it.id}>{it.item_code} — {it.name}</option>)}
              </select>
            </Field>
            <Field label="Allocation Type" required>
              <select className={inputCls} value={form.allocation_type} onChange={(e) => setForm({ ...form, allocation_type: e.target.value, allocation_id: '' })} required>
                <option value="department">Department</option>
                <option value="class">Class</option>
                <option value="event">Event (manual name)</option>
              </select>
            </Field>
            {form.allocation_type === 'event' ? (
              <Field label="Event Name"><input className={inputCls} value={form.purpose} onChange={set('purpose')} placeholder="e.g. Sports Day" /></Field>
            ) : (
              <Field label={form.allocation_type === 'department' ? 'Department' : 'Class'} required>
                <select className={inputCls} value={form.allocation_id} onChange={set('allocation_id')} required>
                  <option value="">— Select —</option>
                  {targets.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </Field>
            )}
            <Field label="Date" required><input type="date" className={inputCls} value={form.allocation_date} onChange={set('allocation_date')} required /></Field>
            <Field label="Quantity" required><input type="number" step="0.01" min="0.01" className={inputCls} value={form.quantity} onChange={set('quantity')} required /></Field>
            <Field label="Unit Cost"><input type="number" step="0.01" className={inputCls} value={form.unit_cost} onChange={set('unit_cost')} /></Field>
            <Field label="Batch Number"><input className={inputCls} value={form.batch_number} onChange={set('batch_number')} /></Field>
            <Field label="Expiry Date"><input type="date" className={inputCls} value={form.expiry_date} onChange={set('expiry_date')} /></Field>
            {form.allocation_type === 'event' && (
              <Field label="Purpose"><input className={inputCls} value={form.purpose} onChange={set('purpose')} /></Field>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <button type="button" onClick={() => navigate('/inventory/allocations')} className={btnSecondary}>Cancel</button>
          <button type="submit" disabled={saving} className={btnPrimary}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {isEdit ? 'Update Allocation' : 'Create Allocation'}
          </button>
        </div>
      </form>
    </div>
  );
};
