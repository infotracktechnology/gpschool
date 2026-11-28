import React, { useCallback, useEffect, useState } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { PageHeader, EmptyState, cardCls } from '../inventory/_shared';
import { transportService } from '../../services/transportService';
import { scopeParams } from './_shared';

const groups = [
  ['route_utilization', 'Route utilization'],
  ['fee_summary', 'Fee summary'],
  ['vehicle_compliance', 'Vehicle documents & maintenance'],
  ['trip_summary', 'Trip summary'],
];

export function TransportReports() {
  const { selectedBranch, selectedAcademicYear } = useAuth();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    setLoading(true); setError('');
    try { setReport(await transportService.getReports(scopeParams(selectedBranch, selectedAcademicYear))); }
    catch (err) { setError(err?.data?.message || err?.message || 'Unable to load transport reports.'); }
    finally { setLoading(false); }
  }, [selectedBranch?.id, selectedAcademicYear?.id]);
  useEffect(() => { load(); }, [load]);
  return <div className="p-5 md:p-6 max-w-7xl mx-auto space-y-5">
    <PageHeader badge="Transport" title="Transport Reports" subtitle="Branch- and academic-year-scoped operations, fee and compliance summaries."
      actions={<button onClick={load} className="px-3 py-2 rounded-xl bg-slate-100 text-slate-700 text-sm font-semibold flex items-center gap-2"><RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />Refresh</button>} />
    {error && <div role="alert" className="flex gap-2 p-3 rounded-xl border border-rose-200 bg-rose-50 text-sm text-rose-700"><AlertCircle className="w-4 h-4" />{error}</div>}
    {groups.map(([key, title]) => {
      const rows = report?.[key] || report?.data?.[key] || [];
      const list = Array.isArray(rows) ? rows : [];
      const cols = list.length ? Object.keys(list[0]).filter((column) => typeof list[0][column] !== 'object').slice(0, 7) : [];
      return <section key={key} className={`${cardCls} overflow-hidden`}>
        <div className="px-4 py-3 border-b border-slate-100"><h2 className="font-bold text-slate-800">{title}</h2></div>
        {loading ? <p className="p-8 text-center text-sm text-slate-500">Loading report…</p> : list.length === 0 ? <EmptyState message={`No ${title.toLowerCase()} data available`} />
          : <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="text-left text-[11px] uppercase text-slate-400 border-b">{cols.map((column) => <th className="px-4 py-2" key={column}>{column.replace(/_/g, ' ')}</th>)}</tr></thead><tbody>{list.map((row, index) => <tr className="border-b border-slate-50" key={row.id || index}>{cols.map((column) => <td className="px-4 py-2 text-slate-700" key={column}>{row[column] ?? '—'}</td>)}</tr>)}</tbody></table></div>}
      </section>;
    })}
  </div>;
}
