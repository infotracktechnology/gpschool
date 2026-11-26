import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AlertTriangle, Plus, Search, Eye, ClipboardCheck, XCircle } from 'lucide-react';
import { inventoryService } from '../../services/inventoryService';
import { PageHeader, StatusBadge, EmptyState, btnPrimary, cardCls, inputCls, fmtMoney, fmtDate } from './_shared';

export const DamagedItems = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');

  const load = async () => {
    try {
      setLoading(true);
      const res = await inventoryService.getDamagedItems({ status, search });
      if (res.success) setItems(res.damaged_items || []);
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [status, search]);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <PageHeader
        badge="Stock"
        title="Damaged Items"
        subtitle="Track damaged stock, inspection and write-off."
        actions={
          <button onClick={() => navigate('/inventory/damaged-items/new')} className={btnPrimary}>
            <Plus className="w-4 h-4" /> Report Damage
          </button>
        }
      />

      <div className={`${cardCls} p-4`}>
        <div className="flex flex-col md:flex-row gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input className={`${inputCls} pl-9`} placeholder="Search item or damage no..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <select className={`${inputCls} md:w-44`} value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All Status</option>
            <option value="reported">Reported</option>
            <option value="inspected">Inspected</option>
            <option value="written_off">Written Off</option>
            <option value="returned_to_stock">Returned to Stock</option>
          </select>
        </div>

        {loading ? <p className="text-sm text-slate-400 text-center py-8">Loading...</p> : items.length === 0 ? (
          <EmptyState icon={AlertTriangle} message="No damaged items found" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wide text-slate-400 border-b border-slate-100">
                  <th className="pb-2 font-semibold">Damage No</th>
                  <th className="pb-2 font-semibold">Item</th>
                  <th className="pb-2 font-semibold">Branch</th>
                  <th className="pb-2 font-semibold">Date</th>
                  <th className="pb-2 font-semibold text-right">Qty</th>
                  <th className="pb-2 font-semibold">Reason</th>
                  <th className="pb-2 font-semibold">Status</th>
                  <th className="pb-2 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((d) => (
                  <tr key={d.id} className="border-b border-slate-50 hover:bg-slate-50/60">
                    <td className="py-2.5 font-mono text-xs font-semibold text-rose-700">{d.damage_number}</td>
                    <td className="py-2.5">
                      <p className="font-medium text-slate-800">{d.item_name}</p>
                      <p className="text-[11px] text-slate-400 font-mono">{d.item_code}</p>
                    </td>
                    <td className="py-2.5 text-xs text-slate-500">{d.branch_name || `#${d.branch_id}`}</td>
                    <td className="py-2.5 text-xs text-slate-500">{fmtDate(d.damage_date)}</td>
                    <td className="py-2.5 text-right font-bold">{Number(d.quantity)}</td>
                    <td className="py-2.5 text-xs text-slate-500">{d.reason || '—'}</td>
                    <td className="py-2.5"><StatusBadge status={d.status} /></td>
                    <td className="py-2.5 text-right whitespace-nowrap">
                      {d.status === 'reported' && (
                        <button onClick={() => navigate(`/inventory/damaged-items/${d.id}/inspect`)} className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600 mr-1" title="Inspect"><ClipboardCheck className="w-4 h-4" /></button>
                      )}
                      <button onClick={() => navigate(`/inventory/damaged-items/${d.id}/view`)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500"><Eye className="w-4 h-4" /></button>
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
