import React, { useState, useEffect } from 'react';
import { Ruler, Plus, Search, Edit, Trash2 } from 'lucide-react';
import { inventoryService } from '../../services/inventoryService';
import { PageHeader, EmptyState, btnPrimary, cardCls, inputCls } from './_shared';

const UNIT_TYPES = ['quantity', 'weight', 'volume', 'length'];

export const InventoryUnits = () => {
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({ name: '', symbol: '', unit_type: 'quantity', conversion_factor: 1 });
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);

  const load = async () => {
    try {
      const res = await inventoryService.getUnits();
      if (res.success) setUnits(res.units || []);
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      if (editing) await inventoryService.updateUnit(editing.id, form);
      else await inventoryService.createUnit(form);
      setShowForm(false); setEditing(null); setForm({ name: '', symbol: '', unit_type: 'quantity', conversion_factor: 1 });
      load();
    } catch (err) { alert(err.message); }
  };

  const handleEdit = (u) => {
    setEditing(u);
    setForm({ name: u.name, symbol: u.symbol || '', unit_type: u.unit_type || 'quantity', conversion_factor: u.conversion_factor ?? 1 });
    setShowForm(true);
  };

  const handleDelete = async (u) => {
    if (!window.confirm(`Delete unit "${u.name}"?`)) return;
    try { await inventoryService.deleteUnit(u.id); load(); }
    catch (err) { alert(err.message); }
  };

  const filtered = units.filter((u) => !search || u.name.toLowerCase().includes(search.toLowerCase()) || (u.symbol || '').toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <PageHeader
        badge="Master Setup"
        title="Item Units"
        subtitle="Measurement units with conversion factors to base units."
        actions={
          <button onClick={() => { setShowForm(!showForm); setEditing(null); setForm({ name: '', symbol: '', unit_type: 'quantity', conversion_factor: 1 }); }} className={btnPrimary}>
            <Plus className="w-4 h-4" /> {showForm ? 'Cancel' : 'New Unit'}
          </button>
        }
      />

      {showForm && (
        <form onSubmit={handleSave} className={`${cardCls} p-5 grid grid-cols-1 md:grid-cols-4 gap-4`}>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Name *</label>
            <input className={inputCls} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Symbol</label>
            <input className={inputCls} value={form.symbol} onChange={(e) => setForm({ ...form, symbol: e.target.value })} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Type</label>
            <select className={inputCls} value={form.unit_type} onChange={(e) => setForm({ ...form, unit_type: e.target.value })}>
              {UNIT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Conversion Factor</label>
            <input type="number" step="0.001" className={inputCls} value={form.conversion_factor} onChange={(e) => setForm({ ...form, conversion_factor: e.target.value })} />
          </div>
          <div className="md:col-span-4 flex justify-end">
            <button type="submit" className={btnPrimary}>Save Unit</button>
          </div>
        </form>
      )}

      <div className={`${cardCls} p-4`}>
        <div className="relative mb-4">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input className={`${inputCls} pl-9`} placeholder="Search units..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        {loading ? <p className="text-sm text-slate-400 text-center py-8">Loading...</p> : filtered.length === 0 ? (
          <EmptyState icon={Ruler} message="No units found" />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wide text-slate-400 border-b border-slate-100">
                <th className="pb-2 font-semibold">Name</th>
                <th className="pb-2 font-semibold">Symbol</th>
                <th className="pb-2 font-semibold">Type</th>
                <th className="pb-2 font-semibold">Conversion</th>
                <th className="pb-2 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => (
                <tr key={u.id} className="border-b border-slate-50">
                  <td className="py-2.5 font-medium text-slate-800">{u.name}</td>
                  <td className="py-2.5 text-slate-500">{u.symbol || '—'}</td>
                  <td className="py-2.5 text-slate-500 capitalize">{u.unit_type}</td>
                  <td className="py-2.5 text-slate-500">×{u.conversion_factor}</td>
                  <td className="py-2.5 text-right">
                    <button onClick={() => handleEdit(u)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 mr-1"><Edit className="w-4 h-4" /></button>
                    <button onClick={() => handleDelete(u)} className="p-1.5 rounded-lg hover:bg-rose-50 text-rose-500"><Trash2 className="w-4 h-4" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
