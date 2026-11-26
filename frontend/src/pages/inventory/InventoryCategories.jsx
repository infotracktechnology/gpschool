import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layers, Plus, Search, Edit, Trash2 } from 'lucide-react';
import { inventoryService } from '../../services/inventoryService';
import { PageHeader, EmptyState, btnPrimary, btnDanger, cardCls, inputCls } from './_shared';

export const InventoryCategories = () => {
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({ name: '', parent_category_id: '', description: '' });
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);

  const load = async () => {
    try {
      const res = await inventoryService.getCategories();
      if (res.success) setCategories(res.categories || []);
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      if (editing) {
        await inventoryService.updateCategory(editing.id, form);
      } else {
        await inventoryService.createCategory(form);
      }
      setShowForm(false); setEditing(null); setForm({ name: '', parent_category_id: '', description: '' });
      load();
    } catch (err) { alert(err.message); }
  };

  const handleEdit = (c) => {
    setEditing(c);
    setForm({ name: c.name, parent_category_id: c.parent_category_id || '', description: c.description || '' });
    setShowForm(true);
  };

  const handleDelete = async (c) => {
    if (!window.confirm(`Delete category "${c.name}"?`)) return;
    try { await inventoryService.deleteCategory(c.id); load(); }
    catch (err) { alert(err.message); }
  };

  const filtered = categories.filter((c) => !search || c.name.toLowerCase().includes(search.toLowerCase()));
  const parentName = (id) => categories.find((c) => c.id === id)?.name;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <PageHeader
        badge="Master Setup"
        title="Item Categories"
        subtitle="Organize inventory items into categories and sub-categories."
        actions={
          <button onClick={() => { setShowForm(!showForm); setEditing(null); setForm({ name: '', parent_category_id: '', description: '' }); }} className={btnPrimary}>
            <Plus className="w-4 h-4" /> {showForm ? 'Cancel' : 'New Category'}
          </button>
        }
      />

      {showForm && (
        <form onSubmit={handleSave} className={`${cardCls} p-5 grid grid-cols-1 md:grid-cols-3 gap-4`}>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Category Name *</label>
            <input className={inputCls} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Parent Category</label>
            <select className={inputCls} value={form.parent_category_id} onChange={(e) => setForm({ ...form, parent_category_id: e.target.value })}>
              <option value="">— None —</option>
              {categories.filter((c) => c.id !== editing?.id).map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Description</label>
            <input className={inputCls} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div className="md:col-span-3 flex justify-end">
            <button type="submit" className={btnPrimary}>Save Category</button>
          </div>
        </form>
      )}

      <div className={`${cardCls} p-4`}>
        <div className="relative mb-4">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input className={`${inputCls} pl-9`} placeholder="Search categories..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        {loading ? <p className="text-sm text-slate-400 text-center py-8">Loading...</p> : filtered.length === 0 ? (
          <EmptyState icon={Layers} message="No categories found" />
        ) : (
          <div className="divide-y divide-slate-100">
            {filtered.map((c) => (
              <div key={c.id} className="flex items-center justify-between py-3 px-2 hover:bg-slate-50 rounded-lg">
                <div>
                  <p className="text-sm font-semibold text-slate-800">{c.name}</p>
                  <p className="text-[11px] text-slate-400">
                    {c.parent_category_id ? `Sub-category of ${parentName(c.parent_category_id) || '—'}` : 'Top-level category'}
                    {c.description ? ` • ${c.description}` : ''}
                  </p>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => handleEdit(c)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500"><Edit className="w-4 h-4" /></button>
                  <button onClick={() => handleDelete(c)} className="p-1.5 rounded-lg hover:bg-rose-50 text-rose-500"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
