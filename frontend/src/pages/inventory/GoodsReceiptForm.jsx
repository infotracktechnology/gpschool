import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Save, Loader2 } from 'lucide-react';
import { inventoryService } from '../../services/inventoryService';
import { useAuth } from '../../context/AuthContext';
import { PageHeader, Field, inputCls, btnPrimary, btnSecondary, cardCls } from './_shared';

export const GoodsReceiptForm = () => {
  const { poId } = useParams();
  const navigate = useNavigate();
  const { branches } = useAuth();
  const [po, setPo] = useState(null);
  const [items, setItems] = useState([]);
  const [form, setForm] = useState({
    receipt_date: new Date().toISOString().slice(0, 10),
    received_by_name: '', invoice_number: '', invoice_date: '', delivery_challan_number: '',
    delivery_challan_date: '', remarks: '', notes: '',
  });
  const [lines, setLines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const res = await inventoryService.getPO(poId);
        if (!res.success || !res.purchase_order) throw new Error('PO not found');
        setPo(res.purchase_order);
        setLines((res.items || []).map((it) => ({
          po_item_id: it.id, item_id: it.item_id,
          item_code: it.item_code, item_name: it.item_name, unit_symbol: it.unit_symbol,
          ordered_qty: Number(it.quantity), received_qty: 0, unit_price: Number(it.unit_price),
          tax_rate: Number(it.tax_rate), batch_number: '', expiry_date: '', serial_number: '',
          quality_status: 'accepted', inspection_notes: '',
        })));
      } catch (e) { setError(e.message); }
      finally { setLoading(false); }
    })();
  }, [poId]);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const setLine = (i, k, v) => {
    const next = [...lines];
    next[i] = { ...next[i], [k]: v };
    setLines(next);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const validLines = lines.filter((l) => Number(l.received_qty) > 0);
    if (validLines.length === 0) return setError('Enter received quantity for at least one item.');
    if (validLines.some((l) => Number(l.received_qty) > Number(l.ordered_qty))) {
      return setError('Received quantity cannot exceed ordered quantity.');
    }
    setSaving(true);
    try {
      await inventoryService.createGRN({
        purchase_order_id: Number(poId),
        ...form,
        receipt_date: form.receipt_date || new Date().toISOString().slice(0, 10),
        items: validLines.map((l) => ({
          po_item_id: l.po_item_id, item_id: l.item_id,
          quantity_received: Number(l.received_qty), unit_price: Number(l.unit_price),
          tax_rate: Number(l.tax_rate) || 0,
          batch_number: l.batch_number || null, expiry_date: l.expiry_date || null,
          serial_number: l.serial_number || null,
          quality_status: l.quality_status, inspection_notes: l.inspection_notes || null,
        })),
      });
      navigate('/inventory/goods-receipt');
    } catch (err) { setError(err.message); }
    finally { setSaving(false); }
  };

  if (loading) return <div className="p-6 text-sm text-slate-400">Loading PO...</div>;
  if (!po) return <div className="p-6 text-sm text-rose-600">{error || 'PO not found'}</div>;

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <PageHeader
        badge={po.po_number}
        title={`Goods Receipt — ${po.supplier_name}`}
        subtitle={`${po.branch_name || ''} • ${po.item_count} items ordered`}
        onBack="/inventory/goods-receipt"
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm">{error}</div>}

        <div className={`${cardCls} p-5`}>
          <h3 className="text-sm font-bold text-slate-800 mb-4">Receipt Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Field label="Receipt Date" required><input type="date" className={inputCls} value={form.receipt_date} onChange={set('receipt_date')} required /></Field>
            <Field label="Received By"><input className={inputCls} value={form.received_by_name} onChange={set('received_by_name')} placeholder="Receiver name" /></Field>
            <Field label="Invoice Number"><input className={inputCls} value={form.invoice_number} onChange={set('invoice_number')} /></Field>
            <Field label="Invoice Date"><input type="date" className={inputCls} value={form.invoice_date} onChange={set('invoice_date')} /></Field>
            <Field label="Delivery Challan No"><input className={inputCls} value={form.delivery_challan_number} onChange={set('delivery_challan_number')} /></Field>
            <Field label="Delivery Challan Date"><input type="date" className={inputCls} value={form.delivery_challan_date} onChange={set('delivery_challan_date')} /></Field>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <Field label="Remarks"><input className={inputCls} value={form.remarks} onChange={set('remarks')} /></Field>
            <Field label="Notes"><input className={inputCls} value={form.notes} onChange={set('notes')} /></Field>
          </div>
        </div>

        <div className={`${cardCls} p-5`}>
          <h3 className="text-sm font-bold text-slate-800 mb-4">Received Items (with quality inspection)</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wide text-slate-400 border-b border-slate-100">
                  <th className="pb-2 font-semibold">Item</th>
                  <th className="pb-2 font-semibold text-right">Ordered</th>
                  <th className="pb-2 font-semibold w-28">Received</th>
                  <th className="pb-2 font-semibold w-32">Batch</th>
                  <th className="pb-2 font-semibold w-36">Expiry</th>
                  <th className="pb-2 font-semibold w-28">Quality</th>
                  <th className="pb-2 font-semibold">Inspection Notes</th>
                </tr>
              </thead>
              <tbody>
                {lines.map((l, i) => (
                  <tr key={i} className="border-b border-slate-50 align-top">
                    <td className="py-2 pr-2">
                      <p className="font-medium text-slate-800">{l.item_name}</p>
                      <p className="text-[11px] text-slate-400 font-mono">{l.item_code} • {l.unit_symbol}</p>
                    </td>
                    <td className="py-2 text-right text-slate-500">{l.ordered_qty}</td>
                    <td className="py-2 px-1">
                      <input type="number" min="0" max={l.ordered_qty} step="0.01" className={inputCls} value={l.received_qty} onChange={(e) => setLine(i, 'received_qty', e.target.value)} />
                    </td>
                    <td className="py-2 px-1"><input className={inputCls} value={l.batch_number} onChange={(e) => setLine(i, 'batch_number', e.target.value)} /></td>
                    <td className="py-2 px-1"><input type="date" className={inputCls} value={l.expiry_date} onChange={(e) => setLine(i, 'expiry_date', e.target.value)} /></td>
                    <td className="py-2 px-1">
                      <select className={inputCls} value={l.quality_status} onChange={(e) => setLine(i, 'quality_status', e.target.value)}>
                        <option value="pending">Pending</option>
                        <option value="accepted">Accepted</option>
                        <option value="rejected">Rejected</option>
                        <option value="damaged">Damaged</option>
                      </select>
                    </td>
                    <td className="py-2 px-1"><input className={inputCls} value={l.inspection_notes} onChange={(e) => setLine(i, 'inspection_notes', e.target.value)} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-[11px] text-slate-400 mt-2">Leave received qty at 0 to skip an item. Rejected/damaged quantities are recorded but not added to stock.</p>
        </div>

        <div className="flex justify-end gap-3">
          <button type="button" onClick={() => navigate('/inventory/goods-receipt')} className={btnSecondary}>Cancel</button>
          <button type="submit" disabled={saving} className={btnPrimary}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Confirm Receipt
          </button>
        </div>
      </form>
    </div>
  );
};
