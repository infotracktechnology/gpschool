import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Edit, Trash2, ArrowRightLeft } from 'lucide-react';
import { inventoryService } from '../../services/inventoryService';
import { PageHeader, StatusBadge, EmptyState, cardCls, fmtMoney, fmtDate } from './_shared';

export const AllocationView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const res = await inventoryService.getAllocation(id);
      if (res.success) setData(res);
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [id]);

  if (loading) return <div className="p-6 text-sm text-slate-400">Loading...</div>;
  if (!data?.allocation) return <div className="p-6"><EmptyState message="Allocation not found" /></div>;

  const a = data.allocation;

  const handleStatus = async (status) => {
    if (!window.confirm(`Mark as ${status}?`)) return;
    try { await inventoryService.updateAllocationStatus(a.id, status); load(); }
    catch (err) { alert(err.message); }
  };
  const handleDelete = async () => {
    if (!window.confirm('Delete this allocation? Reserved stock will be released.')) return;
    try { await inventoryService.deleteAllocation(a.id); navigate('/inventory/allocations'); }
    catch (err) { alert(err.message); }
  };

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <PageHeader
        badge={a.allocation_no}
        title={`Allocation — ${a.item_name}`}
        subtitle={`${a.allocation_type} • ${a.branch_name || ''} • ${fmtDate(a.allocation_date)}`}
        actions={
          <>
            <StatusBadge status={a.status} />
            {a.status === 'active' && (
              <>
                <button onClick={() => navigate(`/inventory/allocations/${a.id}/edit`)} className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-sm font-semibold rounded-xl flex items-center gap-2">
                  <Edit className="w-4 h-4" /> Edit
                </button>
                <button onClick={() => handleStatus('completed')} className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl flex items-center gap-2">
                  <ArrowRightLeft className="w-4 h-4" /> Mark Used
                </button>
                <button onClick={handleDelete} className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 text-sm font-semibold rounded-xl flex items-center gap-2">
                  <Trash2 className="w-4 h-4" /> Delete
                </button>
              </>
            )}
          </>
        }
        onBack="/inventory/allocations"
      />

      <div className={`${cardCls} p-5`}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div><p className="text-[11px] text-slate-400 uppercase font-semibold">Type</p><p className="text-sm font-medium text-slate-800 capitalize">{a.allocation_type}</p></div>
          <div><p className="text-[11px] text-slate-400 uppercase font-semibold">Allocated To</p><p className="text-sm font-medium text-slate-800">{a.allocation_name || '—'}</p></div>
          <div><p className="text-[11px] text-slate-400 uppercase font-semibold">Quantity</p><p className="text-sm font-bold text-slate-800">{Number(a.quantity)}</p></div>
          <div><p className="text-[11px] text-slate-400 uppercase font-semibold">Unit Cost</p><p className="text-sm font-medium text-slate-800">{a.unit_cost ? fmtMoney(a.unit_cost) : '—'}</p></div>
          <div><p className="text-[11px] text-slate-400 uppercase font-semibold">Batch</p><p className="text-sm font-medium text-slate-800">{a.batch_number || '—'}</p></div>
          <div><p className="text-[11px] text-slate-400 uppercase font-semibold">Expiry</p><p className="text-sm font-medium text-slate-800">{a.expiry_date ? fmtDate(a.expiry_date) : '—'}</p></div>
          <div><p className="text-[11px] text-slate-400 uppercase font-semibold">Purpose</p><p className="text-sm font-medium text-slate-800">{a.purpose || '—'}</p></div>
          <div><p className="text-[11px] text-slate-400 uppercase font-semibold">Total Value</p><p className="text-sm font-bold text-slate-800">{fmtMoney(a.total_value)}</p></div>
        </div>
      </div>
    </div>
  );
};
