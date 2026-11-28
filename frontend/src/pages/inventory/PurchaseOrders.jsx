import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Plus, Search, Eye, Send, Trash2, XCircle } from 'lucide-react';
import { inventoryService } from '../../services/inventoryService';
import { useAuth } from '../../context/AuthContext';
import { PageHeader, StatusBadge, EmptyState, btnPrimary, btnDanger, cardCls, inputCls, fmtMoney, fmtDate } from './_shared';

const STATUSES = ['draft', 'sent', 'partial_received', 'received', 'cancelled'];

export const PurchaseOrders = () => {
  const navigate = useNavigate();
  const { selectedBranch } = useAuth();
  const branchId = selectedBranch?.id && selectedBranch.id !== 'all' ? selectedBranch.id : '';
  const [pos, setPos] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [search, setSearch] = useState('');

  const load = async () => {
    try {
      setLoading(true);
      const [poRes, supRes] = await Promise.all([
        inventoryService.getPOs({ status, supplier_id: supplierId, search, ...(branchId ? { branch_id: branchId } : {}) }),
        inventoryService.getSuppliers({ status: 'active' }),
      ]);
      if (poRes.success) setPos(poRes.purchase_orders || []);
      if (supRes.success) setSuppliers(supRes.suppliers || []);
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [status, supplierId, search, branchId]);

  const handleSend = async (po) => {
    if (!window.confirm(`Send PO ${po.po_number} to supplier?`)) return;
    try { await inventoryService.sendPO(po.id); load(); }
    catch (err) { alert(err.message); }
  };

  const handleCancel = async (po) => {
    if (!window.confirm(`Cancel PO ${po.po_number}?`)) return;
    try { await inventoryService.cancelPO(po.id); load(); }
    catch (err) { alert(err.message); }
  };

  const handleDelete = async (po) => {
    if (!window.confirm(`Delete draft PO ${po.po_number}?`)) return;
    try { await inventoryService.deletePO(po.id); load(); }
    catch (err) { alert(err.message); }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <PageHeader
        badge="Procurement"
        title="Purchase Orders"
        subtitle="Create and track purchase orders to suppliers."
        actions={
          <button onClick={() => navigate('/inventory/purchase-orders/new')} className={btnPrimary}>
            <Plus className="w-4 h-4" /> New PO
          </button>
        }
      />

      <div className={`${cardCls} p-4`}>
        <div className="flex flex-col md:flex-row gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input className={`${inputCls} pl-9`} placeholder="Search PO number or supplier..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <select className={`${inputCls} md:w-48`} value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
            <option value="">All Suppliers</option>
            {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <select className={`${inputCls} md:w-44`} value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All Status</option>
            {STATUSES.map((s) => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
          </select>
        </div>

        {loading ? <p className="text-sm text-slate-400 text-center py-8">Loading...</p> : pos.length === 0 ? (
          <EmptyState icon={FileText} message="No purchase orders found" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wide text-slate-400 border-b border-slate-100">
                  <th className="pb-2 font-semibold">PO Number</th>
                  <th className="pb-2 font-semibold">Supplier</th>
                  <th className="pb-2 font-semibold">Branch</th>
                  <th className="pb-2 font-semibold">Order Date</th>
                  <th className="pb-2 font-semibold">Expected</th>
                  <th className="pb-2 font-semibold">Items</th>
                  <th className="pb-2 font-semibold">Total</th>
                  <th className="pb-2 font-semibold">Status</th>
                  <th className="pb-2 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pos.map((po) => (
                  <tr key={po.id} className="border-b border-slate-50 hover:bg-slate-50/60">
                    <td className="py-2.5 font-mono text-xs font-semibold text-brand-700">{po.po_number}</td>
                    <td className="py-2.5 font-medium text-slate-800">{po.supplier_name}</td>
                    <td className="py-2.5 text-slate-500 text-xs">{po.branch_name || `#${po.branch_id}`}</td>
                    <td className="py-2.5 text-slate-500">{fmtDate(po.order_date)}</td>
                    <td className="py-2.5 text-slate-500">{fmtDate(po.expected_date)}</td>
                    <td className="py-2.5 text-slate-500">{po.item_count}</td>
                    <td className="py-2.5 font-bold text-slate-800">{fmtMoney(po.total_amount)}</td>
                    <td className="py-2.5"><StatusBadge status={po.status} /></td>
                    <td className="py-2.5 text-right whitespace-nowrap">
                      <button onClick={() => navigate(`/inventory/purchase-orders/${po.id}/view`)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 mr-1" title="View"><Eye className="w-4 h-4" /></button>
                      {po.status === 'draft' && (
                        <>
                          <button onClick={() => navigate(`/inventory/purchase-orders/${po.id}/edit`)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 mr-1" title="Edit">✎</button>
                          <button onClick={() => handleSend(po)} className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600 mr-1" title="Send"><Send className="w-4 h-4" /></button>
                          <button onClick={() => handleDelete(po)} className="p-1.5 rounded-lg hover:bg-rose-50 text-rose-500 mr-1" title="Delete"><Trash2 className="w-4 h-4" /></button>
                        </>
                      )}
                      {(po.status === 'draft' || po.status === 'sent' || po.status === 'partial_received') && (
                        <button onClick={() => handleCancel(po)} className="p-1.5 rounded-lg hover:bg-rose-50 text-rose-500" title="Cancel"><XCircle className="w-4 h-4" /></button>
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
