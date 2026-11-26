import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Plus, Trash2, Save, Loader2 } from 'lucide-react';
import { inventoryService } from '../../services/inventoryService';
import { useAuth } from '../../context/AuthContext';
import { PageHeader, Field, inputCls, btnPrimary, btnSecondary, cardCls, fmtMoney } from './_shared';

const emptyLine = { item_id: '', quantity: 1, unit_price: 0, tax_rate: 0 };

export const PurchaseOrderForm = () => {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const { branches, selectedBranch } = useAuth();
  const [lookups, setLookups] = useState({ suppliers: [], items: [] });
  const [form, setForm] = useState({
    supplier_id: '', branch_id: selectedBranch?.id && selectedBranch.id !== 'all' ? selectedBranch.id : '',
    order_date: new Date().toISOString().slice(0, 10), expected_date: '',
    payment_terms: '', shipping_address: '', billing_address: '', remarks: '',
  });
  const [lines, setLines] = useState([{ ...emptyLine }]);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      const [sup, items] = await Promise.all([
        inventoryService.getSuppliers({ status: 'active' }),
        inventoryService.getItems({}),
      ]);
      setLookups({ suppliers: sup.suppliers || [], items: items.items || [] });
    })();
    if (!isEdit) return;
    (async () => {
      try {
        const res = await inventoryService.getPO(id);
        if (res.success && res.purchase_order) {
          const po = res.purchase_order;
          setForm({
            supplier_id: po.supplier_id, branch_id: po.branch_id,
            order_date: po.order_date?.slice(0, 10) || '', expected_date: po.expected_date?.slice(0, 10) || '',
            payment_terms: po.payment_terms || '', shipping_address: po.shipping_address || '',
            billing_address: po.billing_address || '', remarks: po.remarks || '',
          });
          setLines((res.items || []).map((it) => ({
            item_id: it.item_id, quantity: Number(it.quantity), unit_price: Number(it.unit_price), tax_rate: Number(it.tax_rate),
          })));
        }
      } catch (e) { setError(e.message); }
      finally { setLoading(false); }
    })();
  }, [id, isEdit]);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const setLine = (i, k, v) => {
    const next = [...lines];
    next[i] = { ...next[i], [k]: v };
    if (k === 'item_id') {
      const item = lookups.items.find((x) => String(x.id) === String(v));
      if (item && !next[i].unit_price) next[i].unit_price = Number(item.unit_cost) || 0;
      if (item?.tax_rate !== undefined) next[i].tax_rate = Number(item.tax_rate) || 0;
    }
    setLines(next);
  };

  const totals = lines.reduce((acc, l) => {
    const lt = (Number(l.quantity) || 0) * (Number(l.unit_price) || 0);
    const ltax = lt * (Number(l.tax_rate) || 0) / 100;
    return { sub: acc.sub + lt, tax: acc.tax + ltax };
  }, { sub: 0, tax: 0 });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const validLines = lines.filter((l) => l.item_id && Number(l.quantity) > 0);
    if (validLines.length === 0) return setError('Add at least one item line.');
    setSaving(true);
    try {
      const payload = {
        ...form,
        branch_id: Number(form.branch_id), supplier_id: Number(form.supplier_id),
        items: validLines.map((l) => ({
          item_id: Number(l.item_id), quantity: Number(l.quantity),
          unit_price: Number(l.unit_price) || 0, tax_rate: Number(l.tax_rate) || 0,
        })),
      };
      if (isEdit) await inventoryService.updatePO(id, payload);
      else await inventoryService.createPO(payload);
      navigate('/inventory/purchase-orders');
    } catch (err) { setError(err.message); }
    finally { setSaving(false); }
  };

  if (loading) return <div className="p-6 text-sm text-slate-400">Loading...</div>;

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <PageHeader
        badge="Procurement"
        title={isEdit ? 'Edit Purchase Order' : 'New Purchase Order'}
        subtitle="Direct PO creation — no approval workflow."
        onBack="/inventory/purchase-orders"
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm">{error}</div>}

        <div className={`${cardCls} p-5`}>
          <h3 className="text-sm font-bold text-slate-800 mb-4">PO Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Field label="Supplier" required>
              <select className={inputCls} value={form.supplier_id} onChange={set('supplier_id')} required>
                <option value="">— Select Supplier —</option>
                {lookups.suppliers.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.supplier_code})</option>)}
              </select>
            </Field>
            <Field label="Branch" required>
              <select className={inputCls} value={form.branch_id} onChange={set('branch_id')} required>
                <option value="">— Select Branch —</option>
                {(branches || []).filter((b) => b.id !== 'all').map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </Field>
            <Field label="Order Date" required><input type="date" className={inputCls} value={form.order_date} onChange={set('order_date')} required /></Field>
            <Field label="Expected Date"><input type="date" className={inputCls} value={form.expected_date} onChange={set('expected_date')} /></Field>
            <Field label="Payment Terms"><input className={inputCls} value={form.payment_terms} onChange={set('payment_terms')} placeholder="e.g. Net 30" /></Field>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <Field label="Shipping Address"><textarea className={`${inputCls} min-h-[60px]`} value={form.shipping_address} onChange={set('shipping_address')} /></Field>
            <Field label="Billing Address"><textarea className={`${inputCls} min-h-[60px]`} value={form.billing_address} onChange={set('billing_address')} /></Field>
          </div>
          <div className="mt-4">
            <Field label="Remarks"><input className={inputCls} value={form.remarks} onChange={set('remarks')} /></Field>
          </div>
        </div>

        <div className={`${cardCls} p-5`}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-800">Line Items</h3>
            <button type="button" onClick={() => setLines([...lines, { ...emptyLine }])} className="px-3 py-1.5 bg-brand-50 hover:bg-brand-100 text-brand-700 text-xs font-bold rounded-lg flex items-center gap-1">
              <Plus className="w-3.5 h-3.5" /> Add Item
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wide text-slate-400 border-b border-slate-100">
                  <th className="pb-2 font-semibold">Item</th>
                  <th className="pb-2 font-semibold w-28">Qty</th>
                  <th className="pb-2 font-semibold w-32">Unit Price</th>
                  <th className="pb-2 font-semibold w-24">Tax %</th>
                  <th className="pb-2 font-semibold w-32 text-right">Line Total</th>
                  <th className="pb-2 w-10"></th>
                </tr>
              </thead>
              <tbody>
                {lines.map((l, i) => {
                  const lt = (Number(l.quantity) || 0) * (Number(l.unit_price) || 0);
                  const ltax = lt * (Number(l.tax_rate) || 0) / 100;
                  return (
                    <tr key={i} className="border-b border-slate-50">
                      <td className="py-2 pr-2">
                        <select className={inputCls} value={l.item_id} onChange={(e) => setLine(i, 'item_id', e.target.value)}>
                          <option value="">— Select Item —</option>
                          {lookups.items.map((it) => <option key={it.id} value={it.id}>{it.item_code} — {it.name}</option>)}
                        </select>
                      </td>
                      <td className="py-2 px-1"><input type="number" min="0" step="0.01" className={inputCls} value={l.quantity} onChange={(e) => setLine(i, 'quantity', e.target.value)} /></td>
                      <td className="py-2 px-1"><input type="number" min="0" step="0.01" className={inputCls} value={l.unit_price} onChange={(e) => setLine(i, 'unit_price', e.target.value)} /></td>
                      <td className="py-2 px-1"><input type="number" min="0" step="0.01" className={inputCls} value={l.tax_rate} onChange={(e) => setLine(i, 'tax_rate', e.target.value)} /></td>
                      <td className="py-2 px-1 text-right font-semibold text-slate-700">{fmtMoney(lt + ltax)}</td>
                      <td className="py-2">
                        <button type="button" onClick={() => setLines(lines.filter((_, x) => x !== i))} className="p-1.5 rounded-lg hover:bg-rose-50 text-rose-500" disabled={lines.length === 1}>
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="flex justify-end mt-4 space-y-1 text-sm">
            <div className="text-right space-y-1">
              <p className="text-slate-500">Subtotal: <span className="font-semibold text-slate-800">{fmtMoney(totals.sub)}</span></p>
              <p className="text-slate-500">Tax: <span className="font-semibold text-slate-800">{fmtMoney(totals.tax)}</span></p>
              <p className="text-base font-bold text-slate-900">Total: {fmtMoney(totals.sub + totals.tax)}</p>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <button type="button" onClick={() => navigate('/inventory/purchase-orders')} className={btnSecondary}>Cancel</button>
          <button type="submit" disabled={saving} className={btnPrimary}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {isEdit ? 'Update PO' : 'Create PO'}
          </button>
        </div>
      </form>
    </div>
  );
};
