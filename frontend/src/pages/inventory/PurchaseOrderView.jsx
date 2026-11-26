import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Send, XCircle, Printer } from 'lucide-react';
import { inventoryService } from '../../services/inventoryService';
import { PageHeader, StatusBadge, EmptyState, cardCls, fmtMoney, fmtDate, btnSecondary } from './_shared';

export const PurchaseOrderView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const res = await inventoryService.getPO(id);
      if (res.success) setData(res);
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [id]);

  if (loading) return <div className="p-6 text-sm text-slate-400">Loading...</div>;
  if (!data?.purchase_order) return <div className="p-6"><EmptyState message="PO not found" /></div>;

  const po = data.purchase_order;
  const items = data.items || [];
  const grns = data.grns || [];

  const handleSend = async () => {
    if (!window.confirm(`Send ${po.po_number}?`)) return;
    await inventoryService.sendPO(po.id); load();
  };
  const handleCancel = async () => {
    if (!window.confirm(`Cancel ${po.po_number}?`)) return;
    await inventoryService.cancelPO(po.id); load();
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <PageHeader
        badge={po.po_number}
        title={`Purchase Order — ${po.supplier_name}`}
        subtitle={`${po.branch_name || ''} • Ordered ${fmtDate(po.order_date)} • Expected ${fmtDate(po.expected_date)}`}
        actions={
          <>
            <StatusBadge status={po.status} />
            {po.status === 'draft' && (
              <button onClick={handleSend} className={btnSecondary}><Send className="w-4 h-4" /> Send</button>
            )}
            {(po.status === 'draft' || po.status === 'sent' || po.status === 'partial_received') && (
              <button onClick={handleCancel} className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 text-sm font-semibold rounded-xl flex items-center gap-2">
                <XCircle className="w-4 h-4" /> Cancel
              </button>
            )}
            <button onClick={() => window.print()} className={btnSecondary}><Printer className="w-4 h-4" /> Print</button>
          </>
        }
        onBack="/inventory/purchase-orders"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className={`${cardCls} p-5`}>
          <h3 className="text-sm font-bold text-slate-800 mb-3">Supplier</h3>
          <p className="text-sm font-semibold text-slate-800">{po.supplier_name} <span className="text-xs text-slate-400">({po.supplier_code})</span></p>
          {po.contact_person && <p className="text-xs text-slate-500">{po.contact_person}</p>}
          {po.phone && <p className="text-xs text-slate-500">{po.phone}</p>}
          {po.email && <p className="text-xs text-slate-500">{po.email}</p>}
          {(po.address_line1 || po.city) && (
            <p className="text-xs text-slate-500 mt-1">{[po.address_line1, po.city, po.state, po.pincode].filter(Boolean).join(', ')}</p>
          )}
          {po.gstin && <p className="text-xs text-slate-400 mt-1">GSTIN: {po.gstin}</p>}
        </div>
        <div className={`${cardCls} p-5`}>
          <h3 className="text-sm font-bold text-slate-800 mb-3">Terms</h3>
          {po.payment_terms && <p className="text-sm text-slate-600"><span className="text-xs text-slate-400">Payment:</span> {po.payment_terms}</p>}
          {po.shipping_address && <p className="text-sm text-slate-600 mt-1"><span className="text-xs text-slate-400">Ship to:</span> {po.shipping_address}</p>}
          {po.billing_address && <p className="text-sm text-slate-600 mt-1"><span className="text-xs text-slate-400">Bill to:</span> {po.billing_address}</p>}
          {po.remarks && <p className="text-sm text-slate-600 mt-1"><span className="text-xs text-slate-400">Remarks:</span> {po.remarks}</p>}
        </div>
      </div>

      <div className={`${cardCls} p-5`}>
        <h3 className="text-sm font-bold text-slate-800 mb-3">Items</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wide text-slate-400 border-b border-slate-100">
                <th className="pb-2 font-semibold">Item</th>
                <th className="pb-2 font-semibold text-right">Qty</th>
                <th className="pb-2 font-semibold text-right">Unit Price</th>
                <th className="pb-2 font-semibold text-right">Tax</th>
                <th className="pb-2 font-semibold text-right">Received</th>
                <th className="pb-2 font-semibold text-right">Line Total</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it) => (
                <tr key={it.id} className="border-b border-slate-50">
                  <td className="py-2.5">
                    <p className="font-medium text-slate-800">{it.item_name}</p>
                    <p className="text-[11px] text-slate-400 font-mono">{it.item_code}</p>
                  </td>
                  <td className="py-2.5 text-right text-slate-600">{Number(it.quantity)} {it.unit_symbol || ''}</td>
                  <td className="py-2.5 text-right text-slate-600">{fmtMoney(it.unit_price)}</td>
                  <td className="py-2.5 text-right text-slate-500">{it.tax_rate}% ({fmtMoney(it.tax_amount)})</td>
                  <td className="py-2.5 text-right">
                    <span className={Number(it.received_qty) >= Number(it.quantity) ? 'text-emerald-600 font-semibold' : 'text-slate-600'}>
                      {Number(it.received_qty)}/{Number(it.quantity)}
                    </span>
                  </td>
                  <td className="py-2.5 text-right font-bold text-slate-800">{fmtMoney(it.line_total)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-slate-200">
                <td colSpan={5} className="pt-3 text-right text-sm text-slate-500">Subtotal</td>
                <td className="pt-3 text-right font-semibold">{fmtMoney(po.subtotal)}</td>
              </tr>
              <tr>
                <td colSpan={5} className="text-right text-sm text-slate-500">Tax</td>
                <td className="text-right font-semibold">{fmtMoney(po.tax_amount)}</td>
              </tr>
              <tr>
                <td colSpan={5} className="text-right text-base font-bold text-slate-900">Total</td>
                <td className="text-right text-base font-bold text-slate-900">{fmtMoney(po.total_amount)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {grns.length > 0 && (
        <div className={`${cardCls} p-5`}>
          <h3 className="text-sm font-bold text-slate-800 mb-3">Goods Receipts</h3>
          <div className="space-y-2">
            {grns.map((g) => (
              <button key={g.id} onClick={() => navigate(`/inventory/goods-receipt/${g.id}/view`)} className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100 hover:bg-slate-100 text-left">
                <div>
                  <p className="text-sm font-semibold text-slate-800">{g.grn_number}</p>
                  <p className="text-[11px] text-slate-500">{fmtDate(g.receipt_date)}</p>
                </div>
                <StatusBadge status={g.status} />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
