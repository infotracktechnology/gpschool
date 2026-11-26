import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Save, Loader2 } from 'lucide-react';
import { inventoryService } from '../../services/inventoryService';
import { PageHeader, Field, inputCls, btnPrimary, btnSecondary, cardCls } from './_shared';

const emptyForm = {
  name: '', category_id: '', unit_id: '', supplier_id: '', description: '', brand: '',
  model_no: '', barcode: '', hscode: '', reorder_level: 0, reorder_qty: 0, safety_stock: 0,
  unit_cost: 0, selling_price: '', min_selling_price: '', tax_rate: 0, tax_code: '', hsn_code: '',
  image_url: '', is_perishable: false, shelf_life_days: '', storage_conditions: '',
  weight_kg: '', dimensions_length: '', dimensions_width: '', dimensions_height: '', status: 'active',
};

export const InventoryItemForm = () => {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const [form, setForm] = useState(emptyForm);
  const [lookups, setLookups] = useState({ categories: [], units: [], suppliers: [] });
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      const [cat, unit, sup] = await Promise.all([
        inventoryService.getCategories(), inventoryService.getUnits(), inventoryService.getSuppliers({ status: 'active' }),
      ]);
      setLookups({
        categories: cat.categories || [], units: unit.units || [], suppliers: sup.suppliers || [],
      });
    })();
    if (!isEdit) return;
    (async () => {
      try {
        const res = await inventoryService.getItem(id);
        if (res.success && res.item) {
          const it = res.item;
          setForm({
            ...emptyForm, ...it,
            is_perishable: !!Number(it.is_perishable),
            category_id: it.category_id || '', unit_id: it.unit_id || '', supplier_id: it.supplier_id || '',
          });
        }
      } catch (e) { setError(e.message); }
      finally { setLoading(false); }
    })();
  }, [id, isEdit]);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setSaving(true);
    try {
      const payload = { ...form };
      for (const k of ['category_id','unit_id','supplier_id','shelf_life_days','weight_kg','dimensions_length','dimensions_width','dimensions_height']) {
        if (payload[k] === '') payload[k] = null;
      }
      if (isEdit) await inventoryService.updateItem(id, payload);
      else await inventoryService.createItem(payload);
      navigate('/inventory/items');
    } catch (err) { setError(err.message); }
    finally { setSaving(false); }
  };

  if (loading) return <div className="p-6 text-sm text-slate-400">Loading...</div>;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <PageHeader
        badge="Inventory"
        title={isEdit ? `Edit Item — ${form.item_code || ''}` : 'New Item'}
        subtitle="Item master with category, unit, supplier, pricing and stock policy."
        onBack="/inventory/items"
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm">{error}</div>}

        <div className={`${cardCls} p-5`}>
          <h3 className="text-sm font-bold text-slate-800 mb-4">Basic Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Field label="Item Name" required><input className={inputCls} value={form.name} onChange={set('name')} required /></Field>
            <Field label="Brand"><input className={inputCls} value={form.brand} onChange={set('brand')} /></Field>
            <Field label="Model No"><input className={inputCls} value={form.model_no} onChange={set('model_no')} /></Field>
            <Field label="Category">
              <select className={inputCls} value={form.category_id} onChange={set('category_id')}>
                <option value="">— Select —</option>
                {lookups.categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </Field>
            <Field label="Unit">
              <select className={inputCls} value={form.unit_id} onChange={set('unit_id')}>
                <option value="">— Select —</option>
                {lookups.units.map((u) => <option key={u.id} value={u.id}>{u.name} ({u.symbol || u.unit_type})</option>)}
              </select>
            </Field>
            <Field label="Supplier">
              <select className={inputCls} value={form.supplier_id} onChange={set('supplier_id')}>
                <option value="">— Select —</option>
                {lookups.suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </Field>
            <Field label="Barcode"><input className={inputCls} value={form.barcode} onChange={set('barcode')} /></Field>
            <Field label="HS Code"><input className={inputCls} value={form.hscode} onChange={set('hscode')} /></Field>
            <Field label="Image URL"><input className={inputCls} value={form.image_url} onChange={set('image_url')} placeholder="https://..." /></Field>
          </div>
          <div className="mt-4">
            <Field label="Description"><textarea className={`${inputCls} min-h-[70px]`} value={form.description} onChange={set('description')} /></Field>
          </div>
        </div>

        <div className={`${cardCls} p-5`}>
          <h3 className="text-sm font-bold text-slate-800 mb-4">Pricing & Tax</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Field label="Unit Cost (₹)"><input type="number" step="0.01" className={inputCls} value={form.unit_cost} onChange={set('unit_cost')} /></Field>
            <Field label="Selling Price (₹)"><input type="number" step="0.01" className={inputCls} value={form.selling_price} onChange={set('selling_price')} /></Field>
            <Field label="Min Selling Price (₹)"><input type="number" step="0.01" className={inputCls} value={form.min_selling_price} onChange={set('min_selling_price')} /></Field>
            <Field label="Tax Rate (%)"><input type="number" step="0.01" className={inputCls} value={form.tax_rate} onChange={set('tax_rate')} /></Field>
            <Field label="Tax Code"><input className={inputCls} value={form.tax_code} onChange={set('tax_code')} /></Field>
            <Field label="HSN/SAC Code"><input className={inputCls} value={form.hsn_code} onChange={set('hsn_code')} /></Field>
            <Field label="Status">
              <select className={inputCls} value={form.status} onChange={set('status')}>
                <option value="active">Active</option>
                <option value="discontinued">Discontinued</option>
              </select>
            </Field>
          </div>
        </div>

        <div className={`${cardCls} p-5`}>
          <h3 className="text-sm font-bold text-slate-800 mb-4">Stock Policy</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Field label="Reorder Level"><input type="number" step="0.01" className={inputCls} value={form.reorder_level} onChange={set('reorder_level')} /></Field>
            <Field label="Reorder Qty"><input type="number" step="0.01" className={inputCls} value={form.reorder_qty} onChange={set('reorder_qty')} /></Field>
            <Field label="Safety Stock"><input type="number" step="0.01" className={inputCls} value={form.safety_stock} onChange={set('safety_stock')} /></Field>
          </div>
        </div>

        <div className={`${cardCls} p-5`}>
          <h3 className="text-sm font-bold text-slate-800 mb-4">Storage & Physical</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 items-end">
            <Field label="Perishable">
              <label className="flex items-center gap-2 px-3 py-2 border border-slate-200 rounded-xl bg-white">
                <input type="checkbox" checked={form.is_perishable} onChange={set('is_perishable')} className="rounded" />
                <span className="text-sm">Yes</span>
              </label>
            </Field>
            <Field label="Shelf Life (days)"><input type="number" className={inputCls} value={form.shelf_life_days} onChange={set('shelf_life_days')} /></Field>
            <Field label="Weight (kg)"><input type="number" step="0.001" className={inputCls} value={form.weight_kg} onChange={set('weight_kg')} /></Field>
            <Field label="Storage Conditions"><input className={inputCls} value={form.storage_conditions} onChange={set('storage_conditions')} placeholder="e.g. Cool & dry" /></Field>
            <Field label="Length"><input type="number" step="0.01" className={inputCls} value={form.dimensions_length} onChange={set('dimensions_length')} /></Field>
            <Field label="Width"><input type="number" step="0.01" className={inputCls} value={form.dimensions_width} onChange={set('dimensions_width')} /></Field>
            <Field label="Height"><input type="number" step="0.01" className={inputCls} value={form.dimensions_height} onChange={set('dimensions_height')} /></Field>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <button type="button" onClick={() => navigate('/inventory/items')} className={btnSecondary}>Cancel</button>
          <button type="submit" disabled={saving} className={btnPrimary}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {isEdit ? 'Update Item' : 'Create Item'}
          </button>
        </div>
      </form>
    </div>
  );
};
