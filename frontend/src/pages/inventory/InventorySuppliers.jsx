import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Truck, Plus, Search, Edit, Trash2, Eye } from 'lucide-react';
import { inventoryService } from '../../services/inventoryService';
import { PageHeader, StatusBadge, EmptyState, btnPrimary, cardCls, inputCls, fmtDate } from './_shared';

export const InventorySuppliers = () => {
  const navigate = useNavigate();
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');

  const load = async () => {
    try {
      setLoading(true);
      const res = await inventoryService.getSuppliers({ search, status });
      if (res.success) setSuppliers(res.suppliers || []);
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [search, status]);

  const handleDelete = async (s) => {
    if (!window.confirm(`Delete supplier "${s.name}"?`)) return;
    try { await inventoryService.deleteSupplier(s.id); load(); }
    catch (err) { alert(err.message); }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <PageHeader
        badge="Master Setup"
        title="Suppliers"
        subtitle="Vendor master with contact, tax and banking details."
        actions={
          <button onClick={() => navigate('/inventory/suppliers/new')} className={btnPrimary}>
            <Plus className="w-4 h-4" /> New Supplier
          </button>
        }
      />

      <div className={`${cardCls} p-4`}>
        <div className="flex flex-col md:flex-row gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input className={`${inputCls} pl-9`} placeholder="Search name, code, contact, phone..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <select className={`${inputCls} md:w-44`} value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>

        {loading ? <p className="text-sm text-slate-400 text-center py-8">Loading...</p> : suppliers.length === 0 ? (
          <EmptyState icon={Truck} message="No suppliers found" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wide text-slate-400 border-b border-slate-100">
                  <th className="pb-2 font-semibold">Code</th>
                  <th className="pb-2 font-semibold">Name</th>
                  <th className="pb-2 font-semibold">Contact</th>
                  <th className="pb-2 font-semibold">Phone</th>
                  <th className="pb-2 font-semibold">City</th>
                  <th className="pb-2 font-semibold">GSTIN</th>
                  <th className="pb-2 font-semibold">Terms</th>
                  <th className="pb-2 font-semibold">Status</th>
                  <th className="pb-2 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {suppliers.map((s) => (
                  <tr key={s.id} className="border-b border-slate-50 hover:bg-slate-50/60">
                    <td className="py-2.5 font-mono text-xs text-slate-500">{s.supplier_code || '—'}</td>
                    <td className="py-2.5 font-medium text-slate-800">{s.name}</td>
                    <td className="py-2.5 text-slate-500">{s.contact_person || '—'}</td>
                    <td className="py-2.5 text-slate-500">{s.phone || '—'}</td>
                    <td className="py-2.5 text-slate-500">{s.city || '—'}</td>
                    <td className="py-2.5 text-slate-500 font-mono text-xs">{s.gstin || '—'}</td>
                    <td className="py-2.5 text-slate-500">{s.payment_terms_days ? `${s.payment_terms_days}d` : '—'}</td>
                    <td className="py-2.5"><StatusBadge status={s.status} /></td>
                    <td className="py-2.5 text-right">
                      <button onClick={() => navigate(`/inventory/suppliers/${s.id}/edit`)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 mr-1" title="Edit"><Edit className="w-4 h-4" /></button>
                      <button onClick={() => handleDelete(s)} className="p-1.5 rounded-lg hover:bg-rose-50 text-rose-500" title="Delete"><Trash2 className="w-4 h-4" /></button>
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
