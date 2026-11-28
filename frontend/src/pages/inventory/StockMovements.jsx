import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeftRight, ArrowDownToLine, ArrowUpFromLine, SlidersHorizontal, Search } from 'lucide-react';
import { inventoryService } from '../../services/inventoryService';
import { useAuth } from '../../context/AuthContext';
import { PageHeader, StatusBadge, EmptyState, btnPrimary, cardCls, inputCls, fmtDate } from './_shared';

export const StockMovements = () => {
  const navigate = useNavigate();
  const { selectedBranch } = useAuth();
  const branchId = selectedBranch?.id && selectedBranch.id !== 'all' ? selectedBranch.id : '';
  const [movements, setMovements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [type, setType] = useState('');
  const [search, setSearch] = useState('');

  const load = async () => {
    try {
      setLoading(true);
      const res = await inventoryService.getStockMovements({ movement_type: type, search, ...(branchId ? { branch_id: branchId } : {}) });
      if (res.success) setMovements(res.movements || []);
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [type, search, branchId]);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <PageHeader
        badge="Stock"
        title="Stock Movements"
        subtitle="All stock in/out/adjust/transfer activity across branches."
        actions={
          <div className="flex flex-wrap gap-2">
            <button onClick={() => navigate('/inventory/stock/in')} className={btnPrimary}><ArrowDownToLine className="w-4 h-4" /> Stock In</button>
            <button onClick={() => navigate('/inventory/stock/out')} className="px-3 py-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold rounded-xl flex items-center gap-2"><ArrowUpFromLine className="w-4 h-4" /> Stock Out</button>
            <button onClick={() => navigate('/inventory/stock/adjust')} className="px-3 py-2 bg-slate-700 hover:bg-slate-800 text-white text-sm font-semibold rounded-xl flex items-center gap-2"><SlidersHorizontal className="w-4 h-4" /> Adjust</button>
            <button onClick={() => navigate('/inventory/stock/transfer/new')} className="px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold rounded-xl flex items-center gap-2"><ArrowLeftRight className="w-4 h-4" /> Transfer</button>
          </div>
        }
      />

      <div className={`${cardCls} p-4`}>
        <div className="flex flex-col md:flex-row gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input className={`${inputCls} pl-9`} placeholder="Search item, ref or reason..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <select className={`${inputCls} md:w-48`} value={type} onChange={(e) => setType(e.target.value)}>
            <option value="">All Types</option>
            <option value="stock_in">Stock In</option>
            <option value="stock_out">Stock Out</option>
            <option value="adjustment">Adjustment</option>
            <option value="transfer_out">Transfer Out</option>
            <option value="transfer_in">Transfer In</option>
            <option value="grn">GRN</option>
            <option value="damage">Damage</option>
            <option value="return">Return</option>
          </select>
        </div>

        {loading ? <p className="text-sm text-slate-400 text-center py-8">Loading...</p> : movements.length === 0 ? (
          <EmptyState icon={ArrowLeftRight} message="No stock movements found" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wide text-slate-400 border-b border-slate-100">
                  <th className="pb-2 font-semibold">Date</th>
                  <th className="pb-2 font-semibold">Item</th>
                  <th className="pb-2 font-semibold">From → To Branch</th>
                  <th className="pb-2 font-semibold">Type</th>
                  <th className="pb-2 font-semibold text-right">Qty</th>
                  <th className="pb-2 font-semibold">Reason</th>
                  <th className="pb-2 font-semibold">By</th>
                </tr>
              </thead>
              <tbody>
                {movements.map((m) => (
                  <tr key={m.id} className="border-b border-slate-50">
                    <td className="py-2.5 text-xs text-slate-500">{fmtDate(m.created_at)}</td>
                    <td className="py-2.5">
                      <p className="font-medium text-slate-800">{m.item_name}</p>
                      <p className="text-[11px] text-slate-400 font-mono">{m.item_code}</p>
                    </td>
                    <td className="py-2.5 text-xs text-slate-500">{m.from_branch_name || '—'} → {m.to_branch_name || '—'}</td>
                    <td className="py-2.5"><StatusBadge status={m.movement_type} /></td>
                    <td className="py-2.5 text-right font-bold">{Number(m.quantity)}</td>
                    <td className="py-2.5 text-xs text-slate-500">{m.reason || m.reference_type || '—'}</td>
                    <td className="py-2.5 text-xs text-slate-500">{m.created_by_name || '—'}</td>
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
