import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
import {
  History,
  Search,
  Download,
  FileSpreadsheet,
  Printer,
  Edit,
  Trash2,
  ClipboardCheck,
  ArrowLeft,
  RefreshCw,
} from 'lucide-react';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import {
  CERTIFICATE_TYPES,
  CERTIFICATE_TYPE_MAP,
  STATUS_META,
  formatDisplayDate,
} from '../../utils/certificateRenderer';

export const CertificateHistory = () => {
  const navigate = useNavigate();
  const { selectedBranch, selectedAcademicYear } = useAuth();

  const [certificates, setCertificates] = useState([]);
  const [summary, setSummary] = useState({});
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [recipientFilter, setRecipientFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  useEffect(() => {
    fetchHistory();
  }, [typeFilter, statusFilter, recipientFilter, dateFrom, dateTo, selectedBranch?.id, selectedAcademicYear?.id]);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (typeFilter) params.set('certificate_type', typeFilter);
      if (statusFilter) params.set('status', statusFilter);
      if (recipientFilter) params.set('recipient_type', recipientFilter);
      if (dateFrom) params.set('date_from', dateFrom);
      if (dateTo) params.set('date_to', dateTo);
      if (selectedBranch?.id && selectedBranch.id !== 'all') params.set('branch_id', selectedBranch.id);
      if (selectedAcademicYear?.id) params.set('academic_year_id', selectedAcademicYear.id);
      if (search.trim()) params.set('search', search.trim());

      const res = await api.get(`/certificates?${params.toString()}`);
      if (res.success) {
        setCertificates(res.certificates || []);
        setSummary(res.summary || {});
      }
    } catch (err) {
      console.error('Error fetching certificate history:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (cert) => {
    if (!window.confirm(`Permanently delete certificate ${cert.certificate_no} for ${cert.recipient_name}?`)) return;
    try {
      const res = await api.delete(`/certificates/${cert.id}`);
      if (res.success) fetchHistory();
    } catch (err) {
      alert(err.message || 'Failed to delete certificate');
    }
  };

  const visibleRows = certificates.filter((c) => {
    if (!search.trim()) return true;
    const q = search.trim().toLowerCase();
    return (
      String(c.certificate_no || '').toLowerCase().includes(q) ||
      String(c.recipient_name || '').toLowerCase().includes(q) ||
      String(c.ref_no || '').toLowerCase().includes(q) ||
      String(c.class_or_dept || '').toLowerCase().includes(q) ||
      String(c.purpose || '').toLowerCase().includes(q)
    );
  });

  const buildExportData = () =>
    visibleRows.map((c) => ({
      'Serial No': c.certificate_no,
      'Certificate Type': CERTIFICATE_TYPE_MAP[c.certificate_type]?.label || c.certificate_type,
      'Recipient Scope': c.recipient_type,
      'Recipient Name': c.recipient_name,
      'Ref / Admission / Emp No': c.ref_no || '',
      'Class / Dept': c.class_or_dept || '',
      Purpose: c.purpose || '',
      'Issue Date': formatDisplayDate(c.issue_date),
      Status: STATUS_META[c.status]?.label || c.status,
      'Reprint Count': c.reprint_count || 0,
      'Approved By': c.approved_by_name || '',
    }));

  const exportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(buildExportData());
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Certificate History');
    XLSX.writeFile(wb, `Certificate_Registry_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const exportCsv = () => {
    const ws = XLSX.utils.json_to_sheet(buildExportData());
    const csv = XLSX.utils.sheet_to_csv(ws);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Certificate_Registry_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex items-start gap-3">
          <button
            onClick={() => navigate('/certificates')}
            className="mt-0.5 p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <History className="w-5 h-5 text-indigo-600" />
              Certificate Issue History &amp; Audit Ledger
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Search, filter, audit reprint counts, export to Excel/CSV, or edit and re-print any issued certificate.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={fetchHistory}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={exportCsv}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>
          <button
            onClick={exportExcel}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl bg-emerald-600 text-white hover:bg-emerald-700"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            Export Excel (.xlsx)
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
        <div className="relative lg:col-span-2">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search serial #, recipient, ref no, purpose..."
            className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-slate-200"
          />
        </div>

        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="px-3 py-2 text-sm rounded-xl border border-slate-200 bg-white"
        >
          <option value="">All Certificate Types</option>
          {CERTIFICATE_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 text-sm rounded-xl border border-slate-200 bg-white"
        >
          <option value="">All Statuses ({summary.total || 0})</option>
          <option value="issued">Issued</option>
          <option value="pending_approval">Pending Approval</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="revoked">Revoked</option>
        </select>

        <select
          value={recipientFilter}
          onChange={(e) => setRecipientFilter(e.target.value)}
          className="px-3 py-2 text-sm rounded-xl border border-slate-200 bg-white"
        >
          <option value="">Student &amp; Staff</option>
          <option value="student">Students Only</option>
          <option value="staff">Staff Only</option>
        </select>

        <div className="flex items-center gap-1.5">
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            title="Issue Date From"
            className="w-full px-2 py-2 text-xs rounded-xl border border-slate-200"
          />
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            title="Issue Date To"
            className="w-full px-2 py-2 text-xs rounded-xl border border-slate-200"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 font-semibold">Serial No</th>
                <th className="px-4 py-3 font-semibold">Type</th>
                <th className="px-4 py-3 font-semibold">Recipient</th>
                <th className="px-4 py-3 font-semibold">Class / Dept</th>
                <th className="px-4 py-3 font-semibold">Purpose</th>
                <th className="px-4 py-3 font-semibold">Issue Date</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-slate-500">
                    Loading certificate ledger...
                  </td>
                </tr>
              ) : visibleRows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-slate-500">
                    No certificates match your selected filters.
                  </td>
                </tr>
              ) : (
                visibleRows.map((row) => {
                  const tMeta = CERTIFICATE_TYPE_MAP[row.certificate_type] || {};
                  const st = STATUS_META[row.status] || STATUS_META.issued;
                  return (
                    <tr key={row.id} className="hover:bg-slate-50/70">
                      <td className="px-4 py-3 font-mono text-xs font-bold text-slate-800 whitespace-nowrap">
                        {row.certificate_no}
                        <div className="text-[10px] font-sans font-normal text-slate-400">
                          Reprints: {row.reprint_count || 0}
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="px-2 py-0.5 text-[11px] font-semibold rounded bg-indigo-50 text-indigo-700">
                          {tMeta.shortLabel || row.certificate_type}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-900">{row.recipient_name}</div>
                        <div className="text-xs text-slate-500">
                          {row.ref_no || '—'} • <span className="capitalize">{row.recipient_type}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-700">{row.class_or_dept || '—'}</td>
                      <td className="px-4 py-3 max-w-xs truncate text-slate-600">{row.purpose || row.title_heading}</td>
                      <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{formatDisplayDate(row.issue_date)}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-semibold rounded-full border ${st.badgeClass}`}>
                          {st.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          {row.status === 'pending_approval' && (
                            <button
                              onClick={() => navigate(`/certificates/approvals/${row.id}`)}
                              className="p-1.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 hover:bg-amber-100"
                              title="Review & Approve"
                            >
                              <ClipboardCheck className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            onClick={() => navigate(`/certificates/view/${row.id}/print`)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-slate-900 text-white hover:bg-slate-800"
                            title="Print A4"
                          >
                            <Printer className="w-3.5 h-3.5" />
                            Print
                          </button>
                          <button
                            onClick={() => navigate(`/certificates/edit/${row.id}`)}
                            className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
                            title="Edit"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(row)}
                            className="p-1.5 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
