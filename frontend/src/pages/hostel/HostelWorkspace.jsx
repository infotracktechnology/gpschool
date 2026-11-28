import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AlertCircle, Check, Edit3, RefreshCw, X } from 'lucide-react';
import { api } from '../../api/client';
import {
  btnPrimary,
  btnSecondary,
  cardCls,
  EmptyState,
  Field,
  inputCls,
  PageHeader,
  StatusBadge,
} from '../inventory/_shared';
import { HOSTEL_SECTIONS } from './hostelConfig';

const normaliseValue = (value, type) => {
  if (value === null || value === undefined) return '';
  let result = String(value);
  if (type === 'datetime-local') result = result.replace(' ', 'T').slice(0, 16);
  if (type === 'date') result = result.slice(0, 10);
  return result;
};

const makePayload = (fields, values) => Object.fromEntries(fields.map((field) => {
  const raw = values[field.name];
  if (raw === '' || raw === undefined) return [field.name, null];
  if (field.type === 'number') return [field.name, Number(raw)];
  if (field.type === 'datetime-local') return [field.name, raw.replace('T', ' ')];
  return [field.name, raw];
}));

const labelsForOptions = (field, options) => {
  const rows = options[field.source] || [];
  if (field.source === 'beds' && field.name === 'bed_id') {
    return rows.filter((row) => row.status === 'available');
  }
  return rows;
};

export default function HostelWorkspace() {
  const navigate = useNavigate();
  const { section } = useParams();
  const config = HOSTEL_SECTIONS[section];
  const [records, setRecords] = useState([]);
  const [options, setOptions] = useState({});
  const [values, setValues] = useState({});
  const [editing, setEditing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const resourcePath = config?.resource;
  const optionSources = useMemo(() => [...new Set((config?.fields || []).map((field) => field.source).filter(Boolean))], [config]);

  const load = useCallback(async () => {
    if (!config) return;
    setLoading(true);
    setError('');
    try {
      const results = await Promise.all([
        api.get(`/hostel/resources/${resourcePath}`),
        ...optionSources.map((source) => source === 'students'
          ? api.get('/hostel/students')
          : api.get(`/hostel/resources/${source}`)),
      ]);
      setRecords(results[0].records || []);
      const nextOptions = {};
      optionSources.forEach((source, index) => {
        const response = results[index + 1];
        const rows = source === 'students' ? (response.students || []) : (response.records || []);
        nextOptions[source] = source === 'students'
          ? rows.map((row) => ({ ...row, full_name: `${row.first_name || ''} ${row.last_name || ''}`.trim() || row.admission_no || `Student ${row.id}` }))
          : rows;
      });
      setOptions(nextOptions);
    } catch (err) {
      setError(err?.data?.message || err?.message || 'Unable to load Hostel records.');
    } finally {
      setLoading(false);
    }
  }, [config, optionSources, resourcePath]);

  useEffect(() => {
    setValues({});
    setEditing(null);
    load();
  }, [load]);

  if (!config) {
    return <div className="p-6"><PageHeader title="Hostel section not found" onBack="/hostel" /><button type="button" onClick={() => navigate('/hostel')} className={`${btnSecondary} mt-4`}>Return to Hostel overview</button></div>;
  }

  const resetForm = () => {
    setValues({});
    setEditing(null);
    setError('');
  };

  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const payload = makePayload(formFields, values);
      if (section === 'attendance') {
        await api.post('/hostel/attendance/movement', payload);
      } else if (section === 'collections') {
        await api.post('/hostel/collections', payload);
      } else if (editing) {
        await api.put(`/hostel/resources/${resourcePath}/${editing.id}`, payload);
      } else {
        await api.post(`/hostel/resources/${resourcePath}`, payload);
      }
      setNotice(editing ? 'Record updated.' : 'Record saved.');
      resetForm();
      await load();
    } catch (err) {
      setError(err?.data?.message || err?.message || 'Unable to save Hostel record.');
    } finally {
      setSaving(false);
    }
  };

  const beginEdit = (record) => {
    setEditing(record);
    setValues(Object.fromEntries(config.fields.map((field) => [field.name, normaliseValue(record[field.name], field.type)])));
    setError('');
    setNotice('');
  };

  const changePass = async (id, status) => {
    setError('');
    setNotice('');
    try {
      await api.post(`/hostel/gate-passes/${id}/review`, { status });
      setNotice(`Gate pass ${status}.`);
      await load();
    } catch (err) {
      setError(err?.data?.message || err?.message || 'Unable to update gate pass.');
    }
  };

  const completePass = async (id) => {
    setError('');
    setNotice('');
    try {
      await api.post(`/hostel/gate-passes/${id}/return`, {});
      setNotice('Gate pass return recorded.');
      await load();
    } catch (err) {
      setError(err?.data?.message || err?.message || 'Unable to complete gate pass.');
    }
  };

  const endAllocation = async (id) => {
    setError('');
    setNotice('');
    try {
      await api.put(`/hostel/allocations/${id}/end`, { status: 'completed' });
      setNotice('Student allocation ended and bed released.');
      await load();
    } catch (err) {
      setError(err?.data?.message || err?.message || 'Unable to end allocation.');
    }
  };

  const canEdit = !['attendance', 'collections', 'allocations', 'gate-passes'].includes(section);
  const tableFields = config.tableFields || config.fields;
  const formFields = section === 'complaints' && !editing
    ? config.fields.filter((field) => field.name !== 'status')
    : config.fields;

  return (
    <div className="p-5 md:p-6 max-w-7xl mx-auto space-y-5">
      <PageHeader
        badge="Hostel Management"
        title={config.title}
        subtitle="Records are filtered by the selected branch and academic year."
        onBack="/hostel"
        actions={<button type="button" onClick={load} className={btnSecondary}><RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />Refresh</button>}
      />
      {error && <div role="alert" className="flex items-start gap-2 p-3 rounded-xl border border-rose-200 bg-rose-50 text-sm text-rose-700"><AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />{error}</div>}
      {notice && <div role="status" className="p-3 rounded-xl border border-emerald-200 bg-emerald-50 text-sm text-emerald-700">{notice}</div>}

      <section className={`${cardCls} p-4`}>
        <h2 className="font-bold text-slate-900 mb-3">{editing ? `Edit ${config.title.toLowerCase()}` : `Add ${config.title.toLowerCase()}`}</h2>
        <form onSubmit={submit} className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {formFields.map((field) => (
            <Field key={field.name} label={field.label} required={field.required}>
              {field.type === 'select' ? (
                <select
                  required={field.required}
                  value={values[field.name] ?? ''}
                  onChange={(event) => setValues((prev) => ({ ...prev, [field.name]: event.target.value }))}
                  className={inputCls}
                >
                  <option value="">Select {field.label.toLowerCase()}</option>
                  {(field.options || labelsForOptions(field, options)).map((option) => {
                    if (typeof option === 'string') return <option key={option} value={option}>{option.replace(/_/g, ' ')}</option>;
                    const value = option[field.valueKey || 'id'];
                    const label = option[field.labelKey || 'name'] || `${field.label} ${value}`;
                    return <option key={value} value={value}>{label}{option.admission_no ? ` · ${option.admission_no}` : ''}{option.student_id ? ` · Student ${option.student_id}` : ''}</option>;
                  })}
                </select>
              ) : (
                <input
                  type={field.type}
                  required={field.required}
                  min={field.type === 'number' ? (field.name === 'capacity' ? '1' : '0') : undefined}
                  value={values[field.name] ?? ''}
                  onChange={(event) => setValues((prev) => ({ ...prev, [field.name]: event.target.value }))}
                  className={inputCls}
                />
              )}
            </Field>
          ))}
          <div className="sm:col-span-2 lg:col-span-3 flex flex-wrap gap-2 pt-1">
            <button type="submit" disabled={saving} className={btnPrimary}><Check className="w-4 h-4" />{saving ? 'Saving…' : editing ? 'Save changes' : 'Save record'}</button>
            {editing && <button type="button" onClick={resetForm} className={btnSecondary}><X className="w-4 h-4" />Cancel edit</button>}
          </div>
        </form>
      </section>

      <section className={`${cardCls} overflow-hidden`}>
        <div className="px-4 py-3 border-b border-slate-100 flex justify-between items-center">
          <h2 className="font-bold text-slate-900">Records</h2>
          <span className="text-xs text-slate-500">{records.length} shown</span>
        </div>
        {loading ? <div className="p-12 text-center text-slate-500"><RefreshCw className="w-5 h-5 animate-spin inline mr-2" />Loading records…</div>
          : records.length === 0 ? <EmptyState message="No Hostel records found for this scope." />
            : <div className="overflow-x-auto"><table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr>
                <th className="px-4 py-3">ID</th>
                {tableFields.map((field) => <th key={field.name} className="px-4 py-3">{field.label}</th>)}
                <th className="px-4 py-3 text-right">Actions</th>
              </tr></thead>
              <tbody className="divide-y divide-slate-100">{records.map((record) => (
                <tr key={record.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-mono text-xs text-slate-500">{record.id}</td>
                  {tableFields.map((field) => (
                    <td key={field.name} className="px-4 py-3 text-slate-700">
                      {field.name === 'status' ? <StatusBadge status={record[field.name]} />
                        : record[field.name] === null || record[field.name] === undefined || record[field.name] === '' ? '—'
                          : typeof record[field.name] === 'object' ? String(record[field.name]).slice(0, 16)
                            : String(record[field.name])}
                    </td>
                  ))}
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <div className="inline-flex gap-1">
                      {canEdit && <button type="button" onClick={() => beginEdit(record)} className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700" title="Edit"><Edit3 className="w-4 h-4" /></button>}
                      {section === 'allocations' && record.status === 'active' && <button type="button" onClick={() => endAllocation(record.id)} className="px-2.5 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-bold">End allocation</button>}
                      {section === 'gate-passes' && record.status === 'pending' && <>
                        <button type="button" onClick={() => changePass(record.id, 'approved')} className="px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold">Approve</button>
                        <button type="button" onClick={() => changePass(record.id, 'rejected')} className="px-2.5 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-800 text-xs font-bold">Reject</button>
                      </>}
                      {section === 'gate-passes' && record.status === 'departed' && <button type="button" onClick={() => completePass(record.id)} className="px-2.5 py-1.5 rounded-lg bg-sky-50 hover:bg-sky-100 text-sky-800 text-xs font-bold">Record return</button>}
                    </div>
                  </td>
                </tr>
              ))}</tbody>
            </table></div>}
      </section>
    </div>
  );
}
