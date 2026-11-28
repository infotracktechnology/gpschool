import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Boxes, Plus, Search, Eye, Trash2 } from 'lucide-react';
import { inventoryService } from '../../services/inventoryService';
import { useAuth } from '../../context/AuthContext';
import { PageHeader, StatusBadge, EmptyState, btnPrimary, btnDanger, cardCls, inputCls, fmtDate } from './_shared';

export const Allocations = () => {
  const navigate = useNavigate();
  const { selectedBranch } = useAuth();
  const branchId = selectedBranch?.id && selectedBranch.id !== 'all' ? selectedBranch.id : '';
  const [allocations, setAllocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('');
  const [type, setType] = useState('');
  const [search, setSearch] = useState('');

  const load = async () => {
    try {
      setLoading(true);
      const res = await inventoryService.getAllocations({ status, allocation_type: type, search, ...(branchId ? { branch_id: branchId } : {}) });
      if (res.success) setAllocations(res.allocations || []);
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [status, type, search, branchId]);

  const handleDelete = async (a) => {
    if (!window.confirm('Delete this allocation? Reserved stock will be released.')) return;
    try { await inventoryService.deleteAllocation(a.id); load(); }
    catch (err) { alert(err.message); }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <PageHeader
        badge="Stock"
        title="Stock Allocations"
        subtitle="Reserve stock for departments, classes or events."
        actions={
          <button onClick={() => navigate('/inventory/allocations/new')} className={btnPrimary}>
            <Plus className="w-4 h-4" /> New Allocation
          </button>
        }
      />

      <div className={`${cardCls} p-4`}>
        <div className="flex flex-col md:flex-row gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input className={`${inputCls} pl-9`} placeholder="Search item or allocation no..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <select className={`${inputCls} md:w-40`} value={type} onChange={(e) => setType(e.target.value)}>
            <option value="">All Types</option>
            <option value="department">Department</option>
            <option value="class">Class</option>
            <option value="event">Event</option>
          </select>
          <select className={`${inputCls} md:w-44`} value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        {loading ? <p className="text-sm text-slate-400 text-center py-8">Loading...</p> : allocations.length === 0 ? (
          <EmptyState icon={Boxes} message="No allocations found" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wide text-slate-400 border-b border-slate-100">
                  <th className="pb-2 font-semibold">Allocation No</th>
                  <th className="pb-2 font-semibold">Item</th>
                  <th className="pb-2 font-semibold">Branch</th>
                  <th className="pb-2 font-semibold">Type</th>
                  <th className="pb-2 font-semibold">Allocated To</th>
                  <th className="pb-2 font-semibold">Date</th>
                  <th className="pb-2 font-semibold text-right">Qty</th>
                  <th className="pb-2 font-semibold">Status</th>
                  <th className="pb-2 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {allocations.map((a) => (
                  <tr key={a.id} className="border-b border-slate-50 hover:bg-slate-50/60">
                    <td className="py-2.5 font-mono text-xs font-semibold text-brand-700">{a.allocation_no}</td>
                    <td className="py-2.5">
                      <p className="font-medium text-slate-800">{a.item_name}</p>
                      <p className="text-[11px] text-slate-400 font-mono">{a.item_code}</p>
                    </td>
                    <td className="py-2.5 text-xs text-slate-500">{a.branch_name || `#${a.branch_id}`}</td>
                    <td className="py-2.5 text-xs text-slate-500 capitalize">{a.allocation_type}</td>
                    <td className="py-2.5 text-xs text-slate-600">{a.allocation_name || '—'}</td>
                    <td className="py-2.5 text-xs text-slate-500">{fmtDate(a.allocation_date)}</td>
                    <td className="py-2.5 text-right font-bold">{Number(a.quantity)}</td>
                    <td className="py-2.5"><StatusBadge status={a.status} /></td>
                    <td className="py-2.5 text-right whitespace-nowrap">
                      <button onClick={() => navigate(`/inventory/allocations/${a.id}/view`)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 mr-1"><Eye className="w-4 h-4" /></button>
                      {a.status === 'active' && (
                        <button onClick={() => handleDelete(a)} className="p-1.5 rounded-lg hover:bg-rose-50 text-rose-500"><Trash2 className="w-4 h-4" /></button>
                      )}
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
