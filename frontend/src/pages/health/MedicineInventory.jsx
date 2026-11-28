import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, Plus, Search, AlertTriangle, Edit, Trash2, Pill } from 'lucide-react';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';

export const MedicineInventory = () => {
  const navigate = useNavigate();
  const { selectedBranch } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    fetchInventory();
  }, [statusFilter, selectedBranch?.id]);

  const fetchInventory = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/health/inventory?status=${statusFilter}`);
      if (res.success) {
        setItems(res.items || []);
      }
    } catch (err) {
      console.error('Error loading medicine inventory:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (item) => {
    if (!window.confirm(`Delete stock item "${item.medicine_name}" (Batch: ${item.batch_no || 'N/A'})?`)) return;
    try {
      await api.delete(`/health/inventory/${item.id}`);
      fetchInventory();
    } catch (err) {
      alert(err.message || 'Failed to delete inventory item.');
    }
  };

  const filtered = items.filter((i) => {
    if (!searchTerm) return true;
    const t = searchTerm.toLowerCase();
    return (
      i.medicine_name?.toLowerCase().includes(t) ||
      i.category?.toLowerCase().includes(t) ||
      i.batch_no?.toLowerCase().includes(t) ||
      i.supplier_name?.toLowerCase().includes(t)
    );
  });

  const lowCount = items.filter((i) => i.status === 'low_stock' || i.status === 'out_of_stock').length;
  const expiredCount = items.filter((i) => i.status === 'expired').length;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider bg-rose-50 text-rose-700 border border-rose-200/60">
              First-Aid Stock &amp; Pharmacy
            </span>
            {(lowCount > 0 || expiredCount > 0) && (
              <span className="text-xs text-rose-700 font-bold flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" />
                {lowCount} Low/Out • {expiredCount} Expired
              </span>
            )}
          </div>
          <h1 className="text-xl font-bold text-slate-900 mt-1">Infirmary Medicine &amp; First-Aid Inventory</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Track stock quantities, batch numbers, cabinet storage locations, and expiry alerts.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate('/health/medicines/new')}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl flex items-center gap-1.5"
          >
            <Pill className="w-3.5 h-3.5" /> Dispense Medicine
          </button>
          <button
            type="button"
            onClick={() => navigate('/health/inventory/new')}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" /> Add Medicine Stock
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl overflow-x-auto w-full md:w-auto">
          {[
            { id: 'all', label: 'All Stock' },
            { id: 'in_stock', label: 'In Stock' },
            { id: 'low_stock', label: 'Low Stock' },
            { id: 'out_of_stock', label: 'Out of Stock' },
            { id: 'expired', label: 'Expired' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1 text-xs font-bold rounded-lg whitespace-nowrap ${
                statusFilter === tab.id ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative w-full md:w-72">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search medicine, batch, supplier..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full text-xs font-medium border border-slate-200 rounded-xl pl-8 pr-3 py-1.5 bg-slate-50/50 text-slate-800"
          />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/70 border-b border-slate-100 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Medicine &amp; Category</th>
                <th className="py-3 px-4">Batch &amp; Supplier</th>
                <th className="py-3 px-4">Available Qty</th>
                <th className="py-3 px-4">Expiry Date</th>
                <th className="py-3 px-4">Storage Location</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400">Loading stock inventory...</td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400">No inventory items found.</td>
                </tr>
              ) : (
                filtered.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/80">
                    <td className="py-3 px-4">
                      <p className="font-bold text-slate-900">{item.medicine_name}</p>
                      <span className="text-[11px] text-slate-500">{item.category}</span>
                    </td>
                    <td className="py-3 px-4">
                      <p className="font-mono font-semibold text-slate-800">{item.batch_no || '—'}</p>
                      <span className="text-[11px] text-slate-500">{item.supplier_name || '—'}</span>
                    </td>
                    <td className="py-3 px-4 font-mono">
                      <span className="font-extrabold text-slate-900">
                        {item.quantity_available} {item.unit}
                      </span>
                      <span className="block text-[10px] text-slate-400">Reorder at {item.reorder_level}</span>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-700">
                      {item.expiry_date ? new Date(item.expiry_date).toLocaleDateString() : '—'}
                    </td>
                    <td className="py-3 px-4 text-slate-700">{item.storage_location}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                          item.status === 'in_stock'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : item.status === 'low_stock'
                            ? 'bg-amber-50 text-amber-800 border-amber-200'
                            : 'bg-rose-50 text-rose-800 border-rose-200'
                        }`}
                      >
                        {item.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="inline-flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => navigate(`/health/inventory/${item.id}/edit`)}
                          className="p-1.5 bg-brand-50 hover:bg-brand-100 text-brand-700 rounded-lg"
                          title="Edit Stock"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(item)}
                          className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg"
                          title="Delete Stock Item"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
