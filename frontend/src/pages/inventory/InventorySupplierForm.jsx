import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Save, Loader2 } from 'lucide-react';
import { inventoryService } from '../../services/inventoryService';
import { PageHeader, Field, inputCls, btnPrimary, btnSecondary, cardCls } from './_shared';

const emptyForm = {
  name: '', contact_person: '', phone: '', alt_phone: '', email: '',
  address_line1: '', address_line2: '', city: '', state: '', pincode: '',
  gstin: '', pan: '', bank_name: '', bank_account_no: '', bank_ifsc: '',
  payment_terms_days: 30, credit_limit: '', rating: '', status: 'active', notes: '',
};

export const InventorySupplierForm = () => {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isEdit) return;
    (async () => {
      try {
        const res = await inventoryService.getSupplier(id);
        if (res.success && res.supplier) setForm({ ...emptyForm, ...res.supplier });
      } catch (e) { setError(e.message); }
      finally { setLoading(false); }
    })();
  }, [id, isEdit]);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setSaving(true);
    try {
      const payload = { ...form, payment_terms_days: Number(form.payment_terms_days) || 30 };
      if (isEdit) await inventoryService.updateSupplier(id, payload);
      else await inventoryService.createSupplier(payload);
      navigate('/inventory/suppliers');
    } catch (err) { setError(err.message); }
    finally { setSaving(false); }
  };

  if (loading) return <div className="p-6 text-sm text-slate-400">Loading...</div>;

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <PageHeader
        badge="Master Setup"
        title={isEdit ? 'Edit Supplier' : 'New Supplier'}
        subtitle="Contact, tax, banking and payment terms."
        onBack="/inventory/suppliers"
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm">{error}</div>}

        <div className={`${cardCls} p-5`}>
          <h3 className="text-sm font-bold text-slate-800 mb-4">Basic Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Field label="Supplier Name" required>
              <input className={inputCls} value={form.name} onChange={set('name')} required />
            </Field>
            <Field label="Contact Person"><input className={inputCls} value={form.contact_person} onChange={set('contact_person')} /></Field>
            <Field label="Email"><input type="email" className={inputCls} value={form.email} onChange={set('email')} /></Field>
            <Field label="Phone"><input className={inputCls} value={form.phone} onChange={set('phone')} /></Field>
            <Field label="Alt Phone"><input className={inputCls} value={form.alt_phone} onChange={set('alt_phone')} /></Field>
            <Field label="Status">
              <select className={inputCls} value={form.status} onChange={set('status')}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </Field>
          </div>
        </div>

        <div className={`${cardCls} p-5`}>
          <h3 className="text-sm font-bold text-slate-800 mb-4">Address</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Address Line 1"><input className={inputCls} value={form.address_line1} onChange={set('address_line1')} /></Field>
            <Field label="Address Line 2"><input className={inputCls} value={form.address_line2} onChange={set('address_line2')} /></Field>
            <Field label="City"><input className={inputCls} value={form.city} onChange={set('city')} /></Field>
            <Field label="State"><input className={inputCls} value={form.state} onChange={set('state')} /></Field>
            <Field label="Pincode"><input className={inputCls} value={form.pincode} onChange={set('pincode')} /></Field>
          </div>
        </div>

        <div className={`${cardCls} p-5`}>
          <h3 className="text-sm font-bold text-slate-800 mb-4">Tax & Banking</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Field label="GSTIN"><input className={inputCls} value={form.gstin} onChange={set('gstin')} /></Field>
            <Field label="PAN"><input className={inputCls} value={form.pan} onChange={set('pan')} /></Field>
            <Field label="Bank Name"><input className={inputCls} value={form.bank_name} onChange={set('bank_name')} /></Field>
            <Field label="Account No"><input className={inputCls} value={form.bank_account_no} onChange={set('bank_account_no')} /></Field>
            <Field label="IFSC"><input className={inputCls} value={form.bank_ifsc} onChange={set('bank_ifsc')} /></Field>
          </div>
        </div>

        <div className={`${cardCls} p-5`}>
          <h3 className="text-sm font-bold text-slate-800 mb-4">Commercial Terms</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Field label="Payment Terms (days)"><input type="number" className={inputCls} value={form.payment_terms_days} onChange={set('payment_terms_days')} /></Field>
            <Field label="Credit Limit (₹)"><input type="number" step="0.01" className={inputCls} value={form.credit_limit} onChange={set('credit_limit')} /></Field>
            <Field label="Rating (1-5)"><input type="number" min="1" max="5" className={inputCls} value={form.rating} onChange={set('rating')} /></Field>
            <Field label="Notes"><input className={inputCls} value={form.notes} onChange={set('notes')} /></Field>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <button type="button" onClick={() => navigate('/inventory/suppliers')} className={btnSecondary}>Cancel</button>
          <button type="submit" disabled={saving} className={btnPrimary}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {isEdit ? 'Update Supplier' : 'Create Supplier'}
          </button>
        </div>
      </form>
    </div>
  );
};
