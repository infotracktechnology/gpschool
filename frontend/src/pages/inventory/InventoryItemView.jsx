import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Package, ArrowUpDown, Edit } from 'lucide-react';
import { inventoryService } from '../../services/inventoryService';
import { PageHeader, StatusBadge, EmptyState, cardCls, fmtMoney, fmtDate } from './_shared';

export const InventoryItemView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await inventoryService.getItem(id);
        if (res.success) setData(res);
      } finally { setLoading(false); }
    })();
  }, [id]);

  if (loading) return <div className="p-6 text-sm text-slate-400">Loading...</div>;
  if (!data?.item) return <div className="p-6"><EmptyState icon={Package} message="Item not found" /></div>;

  const it = data.item;
  const stock = data.stock || [];
  const movements = data.movements || [];

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <PageHeader
        badge={it.item_code}
        title={it.name}
        subtitle={`${it.category_name || 'Uncategorized'} • ${it.brand || ''}`}
        actions={
          <button onClick={() => navigate(`/inventory/items/${id}/edit`)} className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-sm font-semibold rounded-xl flex items-center gap-2">
            <Edit className="w-4 h-4" /> Edit
          </button>
        }
        onBack="/inventory/items"
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className={`${cardCls} p-5 md:col-span-2 space-y-4`}>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div><p className="text-[11px] text-slate-400 uppercase font-semibold">Supplier</p><p className="text-sm font-medium text-slate-800">{it.supplier_name || '—'}</p></div>
            <div><p className="text-[11px] text-slate-400 uppercase font-semibold">Unit</p><p className="text-sm font-medium text-slate-800">{it.unit_name || '—'} {it.unit_symbol ? `(${it.unit_symbol})` : ''}</p></div>
            <div><p className="text-[11px] text-slate-400 uppercase font-semibold">Unit Cost</p><p className="text-sm font-medium text-slate-800">{fmtMoney(it.unit_cost)}</p></div>
            <div><p className="text-[11px] text-slate-400 uppercase font-semibold">Selling Price</p><p className="text-sm font-medium text-slate-800">{it.selling_price ? fmtMoney(it.selling_price) : '—'}</p></div>
            <div><p className="text-[11px] text-slate-400 uppercase font-semibold">Tax Rate</p><p className="text-sm font-medium text-slate-800">{it.tax_rate}%</p></div>
            <div><p className="text-[11px] text-slate-400 uppercase font-semibold">Reorder Level</p><p className="text-sm font-medium text-slate-800">{it.reorder_level}</p></div>
            <div><p className="text-[11px] text-slate-400 uppercase font-semibold">Safety Stock</p><p className="text-sm font-medium text-slate-800">{it.safety_stock}</p></div>
            <div><p className="text-[11px] text-slate-400 uppercase font-semibold">Status</p><StatusBadge status={it.status} /></div>
          </div>
          {it.description && <p className="text-sm text-slate-600 pt-2 border-t border-slate-100">{it.description}</p>}
          {it.barcode && <p className="text-xs text-slate-400">Barcode: {it.barcode}</p>}
        </div>

        <div className={`${cardCls} p-5`}>
          <h3 className="text-sm font-bold text-slate-800 mb-3">Branch Stock</h3>
          {stock.length === 0 ? <EmptyState icon={Package} message="No stock records" /> : (
            <div className="space-y-2">
              {stock.map((s) => (
                <div key={s.id} className="flex justify-between text-sm">
                  <span className="text-slate-600">Branch {s.branch_id}</span>
                  <span className="font-bold text-slate-800">{Number(s.quantity)} <span className="text-[10px] text-slate-400 font-normal">avail {Number(s.available_qty)}</span></span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className={`${cardCls} p-5`}>
        <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2"><ArrowUpDown className="w-4 h-4" /> Recent Movements</h3>
        {movements.length === 0 ? <EmptyState icon={ArrowUpDown} message="No movements" /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wide text-slate-400 border-b border-slate-100">
                  <th className="pb-2 font-semibold">Date</th>
                  <th className="pb-2 font-semibold">Branch</th>
                  <th className="pb-2 font-semibold">Type</th>
                  <th className="pb-2 font-semibold">Reason</th>
                  <th className="pb-2 font-semibold text-right">Qty</th>
                </tr>
              </thead>
              <tbody>
                {movements.map((m) => (
                  <tr key={m.id} className="border-b border-slate-50">
                    <td className="py-2 text-xs text-slate-500">{fmtDate(m.created_at)}</td>
                    <td className="py-2 text-slate-500 text-xs">{m.branch_name || `#${m.branch_id}`}</td>
                    <td className="py-2"><StatusBadge status={m.movement_type} /></td>
                    <td className="py-2 text-slate-500 text-xs">{m.reason || m.reference_type || '—'}</td>
                    <td className="py-2 text-right font-bold">{Number(m.quantity)}</td>
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
