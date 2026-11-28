import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCircle, RefreshCw, Search, Save, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { PageHeader, EmptyState, Field, inputCls, btnPrimary, btnSecondary, cardCls } from '../inventory/_shared';

export const transportPaths = [
  ['/transport', 'Overview'],
  ['/transport/settings', 'Settings'],
  ['/transport/vehicle-types', 'Vehicle Types'],
  ['/transport/vehicles', 'Vehicles'],
  ['/transport/personnel', 'Personnel'],
  ['/transport/routes', 'Routes & Stops'],
  ['/transport/allocations', 'Student Allocations'],
  ['/transport/fees', 'Fees & Collections'],
  ['/transport/trips', 'Trips'],
  ['/transport/documents', 'Documents'],
  ['/transport/maintenance', 'Maintenance'],
  ['/transport/notifications', 'Notifications'],
  ['/transport/reports', 'Reports'],
];

export const scopeParams = (selectedBranch, selectedAcademicYear) => ({
  branch_id: selectedBranch?.id !== 'all' ? selectedBranch?.id : '',
  academic_year_id: selectedAcademicYear?.id,
});

const rowsFrom = (response, key) => {
  if (Array.isArray(response)) return response;
  const rows = response?.[key] ?? response?.data?.[key] ?? response?.data ?? response?.items ?? response?.records ?? [];
  return Array.isArray(rows) ? rows : rows && typeof rows === 'object' ? [rows] : [];
};

const labelize = (value) => String(value || '').replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());

export function TransportResourcePage({
  title, subtitle, resourceKey, fields, columns, load, create, update, remove,
  addLabel = 'Add record', emptyMessage,
}) {
  const { selectedBranch, selectedAcademicYear } = useAuth();
  const scope = scopeParams(selectedBranch, selectedAcademicYear);
  const [rows, setRows] = useState([]);
  const [values, setValues] = useState({});
  const [editing, setEditing] = useState(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const refresh = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setRows(rowsFrom(await load(scope), resourceKey));
    } catch (err) {
      setRows([]);
      setError(err?.data?.message || err?.message || 'Unable to load transport records.');
    } finally {
      setLoading(false);
    }
  }, [load, resourceKey, scope.branch_id, scope.academic_year_id]);

  useEffect(() => { refresh(); }, [refresh]);

  const visibleRows = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter((row) => Object.values(row || {}).some((value) => String(value ?? '').toLowerCase().includes(term)));
  }, [rows, search]);

  const reset = () => {
    setValues({});
    setEditing(null);
    setNotice('');
  };

  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const payload = { ...values, ...scope };
      fields.forEach((field) => {
        if (field.requiredWhen?.(values) && !values[field.name]) {
          throw new Error(`${field.label} is required for this allocation mode.`);
        }
        if (field.toPayload) payload[field.name] = field.toPayload(values[field.name], values);
      });
      if (editing && update) await update(editing.id, payload);
      else await create(payload);
      setNotice(editing ? 'Record updated.' : 'Record saved.');
      reset();
      await refresh();
    } catch (err) {
      setError(err?.data?.message || err?.message || 'Unable to save this record.');
    } finally {
      setSaving(false);
    }
  };

  const editRow = (row) => {
    setEditing(row);
    setValues(Object.fromEntries(fields.map((field) => [field.name, field.fromRecord ? field.fromRecord(row[field.name], row) : (row[field.name] ?? '')])));
    setNotice('');
  };

  const deleteRow = async (row) => {
    if (!remove || !window.confirm(`Delete ${row.name || row.student_name || row.id}?`)) return;
    setError('');
    setNotice('');
    try {
      await remove(row.id);
      setNotice('Record deleted.');
      await refresh();
    } catch (err) {
      setError(err?.data?.message || err?.message || 'Unable to delete this record.');
    }
  };

  return (
    <div className="p-5 md:p-6 max-w-7xl mx-auto space-y-5">
      <PageHeader badge="Transport" title={title} subtitle={subtitle}
        actions={<button type="button" onClick={refresh} className={btnSecondary}><RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />Refresh</button>} />
      {error && <div role="alert" className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700"><AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />{error}</div>}
      {notice && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{notice}</p>}

      <form onSubmit={submit} className={`${cardCls} p-4 md:p-5 space-y-4`}>
        <div className="flex items-center justify-between gap-3">
          <div><h2 className="font-bold text-slate-800">{editing ? 'Edit record' : addLabel}</h2><p className="text-xs text-slate-500 mt-1">Branch: {selectedBranch?.name || 'Not selected'}{selectedAcademicYear?.name ? ` · ${selectedAcademicYear.name}` : ''}</p></div>
          {editing && <button type="button" onClick={reset} className={btnSecondary}><X className="w-4 h-4" />Cancel</button>}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {fields.filter((field) => !field.showWhen || field.showWhen(values)).map((field) => (
            <Field key={field.name} label={field.label} required={field.required || field.requiredWhen?.(values)} hint={field.hint}>
              {field.options ? (
                <select required={field.required || field.requiredWhen?.(values)} className={inputCls} value={values[field.name] ?? ''} onChange={(e) => setValues((prev) => ({ ...prev, [field.name]: e.target.value }))}>
                  <option value="">Select {field.label.toLowerCase()}</option>
                  {field.options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              ) : field.multiline ? (
                <textarea required={field.required || field.requiredWhen?.(values)} rows={3} className={inputCls} value={values[field.name] ?? ''} onChange={(e) => setValues((prev) => ({ ...prev, [field.name]: e.target.value }))} />
              ) : (
                <input required={field.required || field.requiredWhen?.(values)} type={field.type || 'text'} min={field.min} step={field.step} placeholder={field.placeholder} className={inputCls} value={values[field.name] ?? ''} onChange={(e) => setValues((prev) => ({ ...prev, [field.name]: e.target.value }))} />
              )}
            </Field>
          ))}
        </div>
        <div className="flex justify-end"><button type="submit" disabled={saving || (!editing && !create)} className={btnPrimary}>{saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}{saving ? 'Saving…' : editing ? 'Save changes' : 'Save record'}</button></div>
      </form>

      <section className={`${cardCls} overflow-hidden`}>
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div><h2 className="font-bold text-slate-800">Records</h2><p className="text-xs text-slate-500 mt-1">{visibleRows.length} shown · scoped to selected campus and academic year</p></div>
          <label className="relative block sm:w-72"><Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" /><input value={search} onChange={(e) => setSearch(e.target.value)} className={`${inputCls} pl-9`} placeholder="Search records" /></label>
        </div>
        {loading ? <div className="p-12 text-center text-sm text-slate-500"><RefreshCw className="w-5 h-5 animate-spin inline mr-2" />Loading records…</div>
          : visibleRows.length === 0 ? <EmptyState message={emptyMessage || 'No transport records found'} />
            : <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="text-left text-[11px] uppercase tracking-wide text-slate-400 border-b border-slate-100">{columns.map((col) => <th key={col.key} className="px-4 py-3 font-semibold">{col.label}</th>)}{(update || remove) && <th className="px-4 py-3 text-right font-semibold">Actions</th>}</tr></thead><tbody>
              {visibleRows.map((row, index) => <tr key={row.id || index} className="border-b border-slate-50 hover:bg-slate-50/70">{columns.map((col) => <td key={col.key} className="px-4 py-3 text-slate-700 whitespace-nowrap">{col.render ? col.render(row) : (row[col.key] === null || row[col.key] === undefined || row[col.key] === '' ? '—' : String(row[col.key]))}</td>)}{(update || remove) && <td className="px-4 py-3 text-right whitespace-nowrap">{update && <button type="button" onClick={() => editRow(row)} className="text-xs font-semibold text-brand-700 hover:underline mr-3">Edit</button>}{remove && <button type="button" onClick={() => deleteRow(row)} className="text-xs font-semibold text-rose-600 hover:underline">Delete</button>}</td>}</tr>)}
            </tbody></table></div>}
      </section>
    </div>
  );
}

export const asOptions = (values) => values.map((value) => ({ value, label: labelize(value) }));
