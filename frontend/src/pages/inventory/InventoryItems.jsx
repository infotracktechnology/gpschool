import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Package, Plus, Search, Edit, Trash2, AlertTriangle, Eye } from 'lucide-react';
import { inventoryService } from '../../services/inventoryService';
import { useAuth } from '../../context/AuthContext';
import { PageHeader, StatusBadge, EmptyState, btnPrimary, cardCls, inputCls, fmtMoney } from './_shared';

export const InventoryItems = () => {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const { branches, selectedBranch } = useAuth();
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(params.get('search') || '');
  const [categoryId, setCategoryId] = useState(params.get('category_id') || '');
  const [lowStock, setLowStock] = useState(params.get('low_stock') === 'true');
  const [branchId, setBranchId] = useState(params.get('branch_id') || (selectedBranch?.id && selectedBranch.id !== 'all' ? selectedBranch.id : ''));

  const load = async () => {
    try {
      setLoading(true);
      const q = {};
      if (search) q.search = search;
      if (categoryId) q.category_id = categoryId;
      if (lowStock) q.low_stock = 'true';
      if (branchId) q.branch_id = branchId;
      const [itemsRes, catRes] = await Promise.all([
        inventoryService.getItems(q),
        inventoryService.getCategories(),
      ]);
      if (itemsRes.success) setItems(itemsRes.items || []);
      if (catRes.success) setCategories(catRes.categories || []);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [search, categoryId, lowStock, branchId]);

  const handleDelete = async (it) => {
    if (!window.confirm(`Delete item "${it.name}"?`)) return;
    try { await inventoryService.deleteItem(it.id); load(); }
    catch (err) { alert(err.message); }
  };

  const isLow = (it) => Number(it.stock_qty) <= Number(it.reorder_level);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <PageHeader
        badge="Inventory"
        title="Items Master"
        subtitle="Item catalogue with pricing, tax and stock levels."
        actions={
          <button onClick={() => navigate('/inventory/items/new')} className={btnPrimary}>
            <Plus className="w-4 h-4" /> New Item
          </button>
        }
      />

      <div className={`${cardCls} p-4`}>
        <div className="flex flex-col md:flex-row gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input className={`${inputCls} pl-9`} placeholder="Search name, code, barcode, brand..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <select className={`${inputCls} md:w-48`} value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            <option value="">All Categories</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select className={`${inputCls} md:w-44`} value={branchId} onChange={(e) => setBranchId(e.target.value)}>
            <option value="">All Branches</option>
            {(branches || []).filter((b) => b.id !== 'all').map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
          <label className="flex items-center gap-2 px-3 py-2 text-sm text-slate-600 bg-amber-50 border border-amber-200 rounded-xl cursor-pointer">
            <input type="checkbox" checked={lowStock} onChange={(e) => setLowStock(e.target.checked)} className="rounded" />
            <AlertTriangle className="w-4 h-4 text-amber-600" /> Low Stock
          </label>
        </div>

        {loading ? <p className="text-sm text-slate-400 text-center py-8">Loading...</p> : items.length === 0 ? (
          <EmptyState icon={Package} message="No items found" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wide text-slate-400 border-b border-slate-100">
                  <th className="pb-2 font-semibold">Code</th>
                  <th className="pb-2 font-semibold">Item</th>
                  <th className="pb-2 font-semibold">Category</th>
                  <th className="pb-2 font-semibold">Unit</th>
                  <th className="pb-2 font-semibold">Stock</th>
                  <th className="pb-2 font-semibold">Unit Cost</th>
                  <th className="pb-2 font-semibold">Status</th>
                  <th className="pb-2 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it) => (
                  <tr key={it.id} className="border-b border-slate-50 hover:bg-slate-50/60">
                    <td className="py-2.5 font-mono text-xs text-slate-500">{it.item_code || '—'}</td>
                    <td className="py-2.5">
                      <p className="font-medium text-slate-800">{it.name}</p>
                      <p className="text-[11px] text-slate-400">{it.brand || it.supplier_name || ''}</p>
                    </td>
                    <td className="py-2.5 text-slate-500 text-xs">{it.category_name || '—'}</td>
                    <td className="py-2.5 text-slate-500">{it.unit_symbol || it.unit_name || '—'}</td>
                    <td className="py-2.5">
                      <span className={`font-bold ${isLow(it) ? 'text-amber-600' : 'text-slate-800'}`}>
                        {Number(it.stock_qty)}
                      </span>
                      <span className="text-[11px] text-slate-400"> / {Number(it.available_qty)}</span>
                      {isLow(it) && <AlertTriangle className="w-3.5 h-3.5 inline ml-1 text-amber-500" />}
                    </td>
                    <td className="py-2.5 text-slate-600">{fmtMoney(it.unit_cost)}</td>
                    <td className="py-2.5"><StatusBadge status={it.status} /></td>
                    <td className="py-2.5 text-right">
                      <button onClick={() => navigate(`/inventory/items/${it.id}`)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 mr-1" title="View"><Eye className="w-4 h-4" /></button>
                      <button onClick={() => navigate(`/inventory/items/${it.id}/edit`)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 mr-1" title="Edit"><Edit className="w-4 h-4" /></button>
                      <button onClick={() => handleDelete(it)} className="p-1.5 rounded-lg hover:bg-rose-50 text-rose-500" title="Delete"><Trash2 className="w-4 h-4" /></button>
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
