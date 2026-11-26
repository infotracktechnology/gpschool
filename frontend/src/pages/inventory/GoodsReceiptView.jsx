import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { CheckCircle, XCircle, Printer } from 'lucide-react';
import { inventoryService } from '../../services/inventoryService';
import { PageHeader, StatusBadge, EmptyState, cardCls, fmtMoney, fmtDate, btnSecondary } from './_shared';

export const GoodsReceiptView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const res = await inventoryService.getGRN(id);
      if (res.success) setData(res);
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [id]);

  if (loading) return <div className="p-6 text-sm text-slate-400">Loading...</div>;
  if (!data?.goods_receipt) return <div className="p-6"><EmptyState message="GRN not found" /></div>;

  const g = data.goods_receipt;
  const items = data.items || [];

  const handleConfirm = async () => {
    if (!window.confirm(`Confirm ${g.grn_number}? Stock will be updated.`)) return;
    try { await inventoryService.confirmGRN(g.id); load(); }
    catch (err) { alert(err.message); }
  };
  const handleCancel = async () => {
    if (!window.confirm(`Cancel ${g.grn_number}?`)) return;
    try { await inventoryService.cancelGRN(g.id); load(); }
    catch (err) { alert(err.message); }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <PageHeader
        badge={g.grn_number}
        title={`Goods Receipt — ${g.supplier_name}`}
        subtitle={`${g.branch_name || ''} • ${g.po_number} • ${fmtDate(g.receipt_date)}`}
        actions={
          <>
            <StatusBadge status={g.status} />
            {g.status === 'draft' && (
              <button onClick={handleConfirm} className={btnSecondary}><CheckCircle className="w-4 h-4" /> Confirm</button>
            )}
            {g.status === 'draft' && (
              <button onClick={handleCancel} className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 text-sm font-semibold rounded-xl flex items-center gap-2">
                <XCircle className="w-4 h-4" /> Cancel
              </button>
            )}
            <button onClick={() => window.print()} className={btnSecondary}><Printer className="w-4 h-4" /> Print</button>
          </>
        }
        onBack="/inventory/goods-receipt"
      />

      <div className={`${cardCls} p-5`}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div><p className="text-[11px] text-slate-400 uppercase font-semibold">Received By</p><p className="text-sm font-medium text-slate-800">{g.received_by_name || '—'}</p></div>
          <div><p className="text-[11px] text-slate-400 uppercase font-semibold">Invoice</p><p className="text-sm font-medium text-slate-800">{g.invoice_number || '—'}{g.invoice_date ? ` (${fmtDate(g.invoice_date)})` : ''}</p></div>
          <div><p className="text-[11px] text-slate-400 uppercase font-semibold">Challan</p><p className="text-sm font-medium text-slate-800">{g.delivery_challan_number || '—'}</p></div>
          <div><p className="text-[11px] text-slate-400 uppercase font-semibold">Total Value</p><p className="text-sm font-bold text-slate-800">{fmtMoney(g.total_value)}</p></div>
        </div>
        {(g.remarks || g.notes) && (
          <div className="mt-4 pt-3 border-t border-slate-100 text-sm text-slate-600 space-y-1">
            {g.remarks && <p><span className="text-xs text-slate-400">Remarks:</span> {g.remarks}</p>}
            {g.notes && <p><span className="text-xs text-slate-400">Notes:</span> {g.notes}</p>}
          </div>
        )}
      </div>

      <div className={`${cardCls} p-5`}>
        <h3 className="text-sm font-bold text-slate-800 mb-3">Received Items</h3>
        {items.length === 0 ? <EmptyState message="No items" /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wide text-slate-400 border-b border-slate-100">
                  <th className="pb-2 font-semibold">Item</th>
                  <th className="pb-2 font-semibold text-right">Qty Received</th>
                  <th className="pb-2 font-semibold text-right">Unit Price</th>
                  <th className="pb-2 font-semibold">Batch / Expiry</th>
                  <th className="pb-2 font-semibold">Quality</th>
                  <th className="pb-2 font-semibold">Inspection Notes</th>
                  <th className="pb-2 font-semibold text-right">Value</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it) => (
                  <tr key={it.id} className="border-b border-slate-50">
                    <td className="py-2.5">
                      <p className="font-medium text-slate-800">{it.item_name}</p>
                      <p className="text-[11px] text-slate-400 font-mono">{it.item_code}</p>
                    </td>
                    <td className="py-2.5 text-right font-semibold">{Number(it.quantity_received)} {it.unit_symbol || ''}</td>
                    <td className="py-2.5 text-right text-slate-600">{fmtMoney(it.unit_price)}</td>
                    <td className="py-2.5 text-xs text-slate-500">{it.batch_number || '—'}{it.expiry_date ? ` • exp ${fmtDate(it.expiry_date)}` : ''}</td>
                    <td className="py-2.5"><StatusBadge status={it.quality_status} /></td>
                    <td className="py-2.5 text-xs text-slate-500">{it.inspection_notes || '—'}</td>
                    <td className="py-2.5 text-right font-bold">{fmtMoney(it.line_total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
