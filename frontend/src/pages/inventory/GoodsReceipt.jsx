import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PackageCheck, Plus, Search, Eye } from 'lucide-react';
import { inventoryService } from '../../services/inventoryService';
import { PageHeader, StatusBadge, EmptyState, btnPrimary, cardCls, inputCls, fmtDate } from './_shared';

export const GoodsReceipt = () => {
  const navigate = useNavigate();
  const [grns, setGrns] = useState([]);
  const [pos, setPos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');

  const load = async () => {
    try {
      setLoading(true);
      const [grnRes, poRes] = await Promise.all([
        inventoryService.getGRNs({ status, search }),
        inventoryService.getPOs({ status: 'sent' }),
      ]);
      if (grnRes.success) setGrns(grnRes.goods_receipts || []);
      if (poRes.success) setPos(poRes.purchase_orders || []);
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [status, search]);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <PageHeader
        badge="Procurement"
        title="Goods Receipt Notes"
        subtitle="Receive goods against purchase orders with quality inspection."
        actions={
          <button onClick={() => navigate('/inventory/goods-receipt/new')} disabled={pos.length === 0} className={btnPrimary}>
            <Plus className="w-4 h-4" /> New GRN
          </button>
        }
      />

      <div className={`${cardCls} p-4`}>
        <div className="flex flex-col md:flex-row gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input className={`${inputCls} pl-9`} placeholder="Search GRN or supplier..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <select className={`${inputCls} md:w-44`} value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All Status</option>
            <option value="draft">Draft</option>
            <option value="confirmed">Confirmed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        {loading ? <p className="text-sm text-slate-400 text-center py-8">Loading...</p> : grns.length === 0 ? (
          <EmptyState icon={PackageCheck} message="No goods receipts found" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wide text-slate-400 border-b border-slate-100">
                  <th className="pb-2 font-semibold">GRN Number</th>
                  <th className="pb-2 font-semibold">PO Number</th>
                  <th className="pb-2 font-semibold">Supplier</th>
                  <th className="pb-2 font-semibold">Branch</th>
                  <th className="pb-2 font-semibold">Receipt Date</th>
                  <th className="pb-2 font-semibold">Items</th>
                  <th className="pb-2 font-semibold">Status</th>
                  <th className="pb-2 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {grns.map((g) => (
                  <tr key={g.id} className="border-b border-slate-50 hover:bg-slate-50/60">
                    <td className="py-2.5 font-mono text-xs font-semibold text-brand-700">{g.grn_number}</td>
                    <td className="py-2.5 font-mono text-xs text-slate-500">{g.po_number}</td>
                    <td className="py-2.5 font-medium text-slate-800">{g.supplier_name}</td>
                    <td className="py-2.5 text-slate-500 text-xs">{g.branch_name || `#${g.branch_id}`}</td>
                    <td className="py-2.5 text-slate-500">{fmtDate(g.receipt_date)}</td>
                    <td className="py-2.5 text-slate-500">{g.item_count}</td>
                    <td className="py-2.5"><StatusBadge status={g.status} /></td>
                    <td className="py-2.5 text-right">
                      <button onClick={() => navigate(`/inventory/goods-receipt/${g.id}/view`)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500" title="View"><Eye className="w-4 h-4" /></button>
                    </td>
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
