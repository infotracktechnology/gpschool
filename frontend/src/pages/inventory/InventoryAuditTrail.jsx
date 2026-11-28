import React, { useState, useEffect } from 'react';
import { ScrollText, Search } from 'lucide-react';
import { inventoryService } from '../../services/inventoryService';
import { useAuth } from '../../context/AuthContext';
import { PageHeader, EmptyState, cardCls, inputCls, fmtDate } from './_shared';

export const InventoryAuditTrail = () => {
  const { selectedBranch } = useAuth();
  const branchId = selectedBranch?.id && selectedBranch.id !== 'all' ? selectedBranch.id : '';
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [entityType, setEntityType] = useState('');
  const [search, setSearch] = useState('');

  const load = async () => {
    try {
      setLoading(true);
      const res = await inventoryService.getAuditTrail({ entity_type: entityType, search, ...(branchId ? { branch_id: branchId } : {}) });
      if (res.success) setEntries(res.audit_trail || []);
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [entityType, search, branchId]);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <PageHeader badge="Inventory" title="Audit Trail" subtitle="Complete change history for all inventory entities." />
      <div className={`${cardCls} p-4`}>
        <div className="flex flex-col md:flex-row gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input className={`${inputCls} pl-9`} placeholder="Search by entity or user..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <select className={`${inputCls} md:w-52`} value={entityType} onChange={(e) => setEntityType(e.target.value)}>
            <option value="">All Entities</option>
            <option value="item">Item</option>
            <option value="supplier">Supplier</option>
            <option value="category">Category</option>
            <option value="unit">Unit</option>
            <option value="purchase_order">Purchase Order</option>
            <option value="goods_receipt">Goods Receipt</option>
            <option value="stock_movement">Stock Movement</option>
            <option value="stock_transfer">Stock Transfer</option>
            <option value="allocation">Allocation</option>
            <option value="damage_report">Damage Report</option>
          </select>
        </div>

        {loading ? <p className="text-sm text-slate-400 text-center py-8">Loading...</p> : entries.length === 0 ? (
          <EmptyState icon={ScrollText} message="No audit entries" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wide text-slate-400 border-b border-slate-100">
                  <th className="pb-2 font-semibold">Timestamp</th>
                  <th className="pb-2 font-semibold">Entity</th>
                  <th className="pb-2 font-semibold">Action</th>
                  <th className="pb-2 font-semibold">Entity ID</th>
                  <th className="pb-2 font-semibold">Changed By</th>
                  <th className="pb-2 font-semibold">IP</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((e) => (
                  <tr key={e.id} className="border-b border-slate-50">
                    <td className="py-2 text-xs text-slate-500 whitespace-nowrap">{fmtDate(e.created_at)}</td>
                    <td className="py-2 text-xs font-medium text-slate-700 capitalize">{(e.entity_type || '').replace(/_/g, ' ')}</td>
                    <td className="py-2"><span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${e.action === 'create' ? 'bg-emerald-50 text-emerald-700' : e.action === 'delete' ? 'bg-rose-50 text-rose-700' : 'bg-blue-50 text-blue-700'}`}>{e.action}</span></td>
                    <td className="py-2 text-xs text-slate-400 font-mono">{e.entity_id}</td>
                    <td className="py-2 text-xs text-slate-500">{e.changed_by_name || `User #${e.changed_by}`}</td>
                    <td className="py-2 text-xs text-slate-400">{e.ip_address || '—'}</td>
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
