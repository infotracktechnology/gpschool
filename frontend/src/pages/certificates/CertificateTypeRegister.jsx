import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Search,
  Printer,
  Edit,
  Trash2,
  ClipboardCheck,
  LayoutTemplate,
  ArrowLeft,
  RefreshCw,
} from 'lucide-react';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import {
  CERTIFICATE_TYPE_MAP,
  STATUS_META,
  formatDisplayDate,
} from '../../utils/certificateRenderer';

export const CertificateTypeRegister = ({ certType }) => {
  const navigate = useNavigate();
  const { selectedBranch } = useAuth();
  const typeMeta = CERTIFICATE_TYPE_MAP[certType] || CERTIFICATE_TYPE_MAP.bonafide;

  const [certificates, setCertificates] = useState([]);
  const [summary, setSummary] = useState({ total: 0, pending_approval: 0, issued: 0, rejected: 0, revoked: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    fetchList();
  }, [certType, statusFilter, selectedBranch?.id]);

  const fetchList = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ certificate_type: certType });
      if (statusFilter) params.set('status', statusFilter);
      if (selectedBranch?.id) params.set('branch_id', selectedBranch.id);
      if (search.trim()) params.set('search', search.trim());
      const res = await api.get(`/certificates?${params.toString()}`);
      if (res.success) {
        setCertificates(res.certificates || []);
        setSummary(res.summary || {});
      }
    } catch (err) {
      console.error('Error fetching certificate list:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (cert) => {
    if (!window.confirm(`Permanently delete certificate ${cert.certificate_no} for ${cert.recipient_name}?`)) {
      return;
    }
    try {
      const res = await api.delete(`/certificates/${cert.id}`);
      if (res.success) fetchList();
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

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Hero Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex items-start gap-3">
          <button
            onClick={() => navigate('/certificates')}
            className="mt-0.5 p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold text-slate-900">{typeMeta.label} Register</h1>
              {typeMeta.supportsStaff && (
                <span className="px-2 py-0.5 text-[11px] font-semibold rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                  Supports Student &amp; Staff
                </span>
              )}
            </div>
            <p className="text-sm text-slate-500 mt-0.5">{typeMeta.description}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={fetchList}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={() => navigate('/certificates/templates')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-semibold rounded-xl border border-slate-200 bg-slate-50 text-slate-800 hover:bg-slate-100"
          >
            <LayoutTemplate className="w-4 h-4 text-indigo-600" />
            Templates
          </button>
          <button
            onClick={() => navigate(`${typeMeta.routePath}/new`)}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 shadow-xs"
          >
            <Plus className="w-4 h-4" />
            Issue New {typeMeta.shortLabel}
          </button>
        </div>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: 'Total Records', value: summary.total || 0, status: '' },
          { label: 'Pending Approval', value: summary.pending_approval || 0, status: 'pending_approval', tone: 'text-amber-700' },
          { label: 'Approved', value: summary.approved || 0, status: 'approved', tone: 'text-blue-700' },
          { label: 'Issued', value: summary.issued || 0, status: 'issued', tone: 'text-emerald-700' },
          { label: 'Revoked / Rejected', value: (summary.rejected || 0) + (summary.revoked || 0), status: 'revoked', tone: 'text-rose-600' },
        ].map((card) => (
          <button
            key={card.label}
            onClick={() => setStatusFilter(card.status)}
            className={`text-left p-4 rounded-2xl border bg-white shadow-xs transition ${
              statusFilter === card.status ? 'border-indigo-400 ring-2 ring-indigo-500/10' : 'border-slate-200/80 hover:border-slate-300'
            }`}
          >
            <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{card.label}</div>
            <div className={`text-2xl font-extrabold mt-1 ${card.tone || 'text-slate-900'}`}>{card.value}</div>
          </button>
        ))}
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={`Search ${typeMeta.shortLabel} by serial #, name, admission #, class or purpose...`}
            className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 text-sm rounded-xl border border-slate-200 bg-white"
        >
          <option value="">All Workflow Statuses</option>
          <option value="pending_approval">Pending Approval</option>
          <option value="approved">Approved</option>
          <option value="issued">Issued</option>
          <option value="rejected">Rejected</option>
          <option value="revoked">Revoked</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 font-semibold">Serial / Cert No</th>
                <th className="px-4 py-3 font-semibold">Recipient</th>
                <th className="px-4 py-3 font-semibold">Class / Dept</th>
                <th className="px-4 py-3 font-semibold">Purpose / Title</th>
                <th className="px-4 py-3 font-semibold">Issue Date</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-slate-500">
                    Loading {typeMeta.label} records...
                  </td>
                </tr>
              ) : visibleRows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-slate-500 space-y-2">
                    <p>No {typeMeta.label} records found.</p>
                    <button
                      onClick={() => navigate(`${typeMeta.routePath}/new`)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Generate {typeMeta.shortLabel}
                    </button>
                  </td>
                </tr>
              ) : (
                visibleRows.map((row) => {
                  const st = STATUS_META[row.status] || STATUS_META.issued;
                  return (
                    <tr key={row.id} className="hover:bg-slate-50/70">
                      <td className="px-4 py-3 font-mono text-xs font-bold text-slate-800 whitespace-nowrap">
                        {row.certificate_no}
                        {Number(row.reprint_count || 0) > 0 && (
                          <div className="text-[10px] font-sans font-normal text-slate-400">
                            Printed {row.reprint_count}x
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-900">{row.recipient_name}</div>
                        <div className="text-xs text-slate-500">
                          {row.ref_no || '—'} • <span className="capitalize">{row.recipient_type}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-700">{row.class_or_dept || '—'}</td>
                      <td className="px-4 py-3 max-w-xs">
                        <div className="text-slate-800 font-medium truncate">{row.purpose || row.title_heading}</div>
                        {row.template_name && (
                          <div className="text-[11px] text-slate-400 truncate">{row.template_name}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                        {formatDisplayDate(row.issue_date)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-semibold rounded-full border ${st.badgeClass}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${st.dotClass}`} />
                          {st.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          {row.status === 'pending_approval' && (
                            <button
                              onClick={() => navigate(`/certificates/approvals/${row.id}`)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100"
                              title="Review & Approve"
                            >
                              <ClipboardCheck className="w-3.5 h-3.5" />
                              Review
                            </button>
                          )}
                          <button
                            onClick={() => navigate(`/certificates/view/${row.id}/print`)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-slate-900 text-white hover:bg-slate-800"
                            title="Open A4 Print Preview"
                          >
                            <Printer className="w-3.5 h-3.5" />
                            Print
                          </button>
                          <button
                            onClick={() => navigate(`/certificates/edit/${row.id}`)}
                            className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
                            title="Edit Certificate"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(row)}
                            className="p-1.5 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50"
                            title="Delete Certificate"
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
