import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { Package, ArrowLeft, Save, AlertCircle } from 'lucide-react';
import { api } from '../../api/client';

export const MedicineInventoryForm = () => {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();

  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const [form, setForm] = useState({
    medicine_name: '',
    category: 'Analgesic / Antipyretic',
    batch_no: '',
    unit: 'Tablets',
    quantity_available: 50,
    reorder_level: 15,
    expiry_date: '',
    storage_location: 'Cabinet A - Shelf 1',
    supplier_name: '',
    notes: '',
  });

  useEffect(() => {
    if (!isEdit) return;
    const load = async () => {
      try {
        setLoading(true);
        const res = await api.get(`/health/inventory/${id}`);
        if (res.success && res.item) {
          const it = res.item;
          setForm({
            medicine_name: it.medicine_name || '',
            category: it.category || 'General',
            batch_no: it.batch_no || '',
            unit: it.unit || 'Tablets',
            quantity_available: it.quantity_available ?? 0,
            reorder_level: it.reorder_level ?? 10,
            expiry_date: it.expiry_date ? new Date(it.expiry_date).toISOString().slice(0, 10) : '',
            storage_location: it.storage_location || 'Infirmary Cabinet A',
            supplier_name: it.supplier_name || '',
            notes: it.notes || '',
          });
        }
      } catch (err) {
        setErrorMsg(err.message || 'Failed to load stock item');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id, isEdit]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!form.medicine_name.trim()) {
      setErrorMsg('Medicine Name is required.');
      return;
    }

    try {
      setSaving(true);
      if (isEdit) {
        await api.put(`/health/inventory/${id}`, form);
      } else {
        await api.post('/health/inventory', form);
      }
      navigate('/health/inventory');
    } catch (err) {
      setErrorMsg(err.message || 'Failed to save inventory item');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-12 text-center text-xs text-slate-400">Loading stock item...</div>;
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link
          to="/health/inventory"
          className="p-2 rounded-xl bg-white border border-slate-200 text-slate-500 hover:text-slate-900"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Link to="/health/inventory" className="hover:text-rose-600">
              Medicine Inventory
            </Link>
            <span>/</span>
            <span className="font-semibold text-slate-800">{isEdit ? 'Edit Stock Item' : 'Add Stock Item'}</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 mt-0.5 flex items-center gap-2">
            <Package className="w-5 h-5 text-rose-600" />
            {isEdit ? `Edit Stock: ${form.medicine_name}` : 'Add Infirmary Medicine Stock'}
          </h1>
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
              Medicine / Supply Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Paracetamol 500mg Tablets"
              value={form.medicine_name}
              onChange={(e) => setForm({ ...form, medicine_name: e.target.value })}
              className="w-full text-xs font-medium border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800"
            />
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
              Category
            </label>
            <select
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              className="w-full text-xs font-medium border border-slate-200 rounded-xl px-3 py-2.5 bg-white text-slate-800"
            >
              <option value="Analgesic / Antipyretic">Analgesic / Antipyretic</option>
              <option value="Antiseptic">Antiseptic</option>
              <option value="Antihistamine">Antihistamine / Allergy</option>
              <option value="Hydration / ORS">Hydration / ORS</option>
              <option value="First-Aid / Dressing">First-Aid / Dressing</option>
              <option value="Eye / Ear Care">Eye / Ear Care</option>
              <option value="General">General Supply</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
              Batch Number
            </label>
            <input
              type="text"
              placeholder="e.g. PCM-2026-A"
              value={form.batch_no}
              onChange={(e) => setForm({ ...form, batch_no: e.target.value.toUpperCase() })}
              className="w-full text-xs font-mono border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800"
            />
          </div>
          <div>
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
              Unit
            </label>
            <select
              value={form.unit}
              onChange={(e) => setForm({ ...form, unit: e.target.value })}
              className="w-full text-xs font-medium border border-slate-200 rounded-xl px-3 py-2.5 bg-white text-slate-800"
            >
              {['Tablets', 'Bottles', 'Sachets', 'Packs', 'Tubes', 'Strips', 'ml'].map((u) => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
              Available Quantity
            </label>
            <input
              type="number"
              min="0"
              value={form.quantity_available}
              onChange={(e) => setForm({ ...form, quantity_available: e.target.value })}
              className="w-full text-xs font-mono border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800"
            />
          </div>
          <div>
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
              Low-Stock Alert Threshold
            </label>
            <input
              type="number"
              min="0"
              value={form.reorder_level}
              onChange={(e) => setForm({ ...form, reorder_level: e.target.value })}
              className="w-full text-xs font-mono border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
              Expiry Date
            </label>
            <input
              type="date"
              value={form.expiry_date}
              onChange={(e) => setForm({ ...form, expiry_date: e.target.value })}
              className="w-full text-xs font-mono border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800"
            />
          </div>
          <div>
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
              Storage Location
            </label>
            <input
              type="text"
              value={form.storage_location}
              onChange={(e) => setForm({ ...form, storage_location: e.target.value })}
              className="w-full text-xs font-medium border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800"
            />
          </div>
          <div>
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
              Supplier / Pharmacy
            </label>
            <input
              type="text"
              value={form.supplier_name}
              onChange={(e) => setForm({ ...form, supplier_name: e.target.value })}
              className="w-full text-xs font-medium border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800"
            />
          </div>
        </div>

        <div>
          <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
            Usage / Storage Notes
          </label>
          <textarea
            rows={2}
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            className="w-full text-xs font-medium border border-slate-200 rounded-xl p-3 text-slate-800"
          />
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
          <Link
            to="/health/inventory"
            className="px-5 py-2.5 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-50 rounded-xl shadow-xs flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : isEdit ? 'Update Stock' : 'Save Stock Item'}
          </button>
        </div>
      </form>
    </div>
  );
};
