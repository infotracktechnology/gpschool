import React, { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { api } from '../../api/client';
import { EmptyState, PageHeader, cardCls } from '../inventory/_shared';
import { HOSTEL_REPORTS } from './hostelConfig';

const displayValue = (value) => {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'object') return String(value);
  return String(value).replace(/_/g, ' ');
};

export default function HostelReport() {
  const { reportType } = useParams();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const report = HOSTEL_REPORTS.find((item) => item.type === reportType);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.get(`/hostel/reports/${reportType}`);
      setRows(response.rows || []);
    } catch (err) {
      setError(err?.data?.message || err?.message || 'Unable to load Hostel report.');
    } finally {
      setLoading(false);
    }
  }, [reportType]);

  useEffect(() => { load(); }, [load]);

  const columns = rows.length ? Object.keys(rows[0]) : [];
  return (
    <div className="p-5 md:p-6 max-w-7xl mx-auto space-y-5">
      <PageHeader
        badge="Hostel Reports"
        title={report?.title || 'Hostel report'}
        subtitle="Report data follows the selected branch and academic year."
        onBack="/hostel"
        actions={<button type="button" onClick={load} className="px-3 py-2 rounded-xl bg-slate-100 text-slate-700 text-sm font-semibold flex items-center gap-2"><RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />Refresh</button>}
      />
      {error && <div role="alert" className="flex items-center gap-2 p-3 rounded-xl border border-rose-200 bg-rose-50 text-sm text-rose-700"><AlertCircle className="w-4 h-4" />{error}</div>}
      <section className={`${cardCls} overflow-hidden`}>
        {loading ? <div className="p-12 text-center text-slate-500"><RefreshCw className="w-5 h-5 animate-spin inline mr-2" />Loading report…</div>
          : rows.length === 0 ? <EmptyState message="No report data found for this scope." />
            : <div className="overflow-x-auto"><table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr>{columns.map((column) => <th key={column} className="px-4 py-3 font-bold">{column.replace(/_/g, ' ')}</th>)}</tr></thead>
              <tbody className="divide-y divide-slate-100">{rows.map((row, index) => <tr key={row.id || `${index}`} className="hover:bg-slate-50">{columns.map((column) => <td key={column} className="px-4 py-3 text-slate-700">{displayValue(row[column])}</td>)}</tr>)}</tbody>
            </table></div>}
      </section>
    </div>
  );
}
