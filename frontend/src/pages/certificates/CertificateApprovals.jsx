import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ClipboardCheck,
  Search,
  CheckCircle2,
  XCircle,
  Edit,
  Trash2,
  Printer,
  RotateCcw,
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

const QUEUE_TABS = [
  { key: 'pending_approval', label: 'Pending Approval' },
  { key: 'approved', label: 'Approved Ready' },
  { key: 'rejected', label: 'Rejected' },
  { key: 'revoked', label: 'Revoked' },
];

export const CertificateApprovals = () => {
  const navigate = useNavigate();
  const { selectedBranch, selectedAcademicYear } = useAuth();
  const [activeTab, setActiveTab] = useState('pending_approval');
  const [rows, setRows] = useState([]);
  const [counts, setCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchApprovals();
  }, [activeTab, selectedBranch?.id, selectedAcademicYear?.id]);

  const fetchApprovals = async () => {
    try {
      setLoading(true);
      const dashParams = new URLSearchParams();
      if (selectedBranch?.id && selectedBranch.id !== 'all') dashParams.set('branch_id', selectedBranch.id);
      if (selectedAcademicYear?.id) dashParams.set('academic_year_id', selectedAcademicYear.id);
      const dashQ = dashParams.toString();

      const listParams = new URLSearchParams({ status: activeTab });
      if (selectedBranch?.id && selectedBranch.id !== 'all') listParams.set('branch_id', selectedBranch.id);
      if (selectedAcademicYear?.id) listParams.set('academic_year_id', selectedAcademicYear.id);

      const [dashRes, listRes] = await Promise.all([
        api.get(`/certificates/dashboard${dashQ ? `?${dashQ}` : ''}`),
        api.get(`/certificates?${listParams.toString()}`),
      ]);

      if (dashRes.success && dashRes.summary) {
        setCounts(dashRes.summary);
      }
      if (listRes.success) {
        setRows(listRes.certificates || []);
      }
    } catch (err) {
      console.error('Error fetching approvals queue:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleReopen = async (cert) => {
    try {
      const res = await api.patch(`/certificates/${cert.id}/status`, {
        action: 'reopen',
        approval_remarks: 'Re-opened for review',
      });
      if (res.success) fetchApprovals();
    } catch (err) {
      alert(err.message || 'Unable to re-open request');
    }
  };

  const handleDelete = async (cert) => {
    if (!window.confirm(`Delete certificate request ${cert.certificate_no} for ${cert.recipient_name}?`)) return;
    try {
      const res = await api.delete(`/certificates/${cert.id}`);
      if (res.success) fetchApprovals();
    } catch (err) {
      alert(err.message || 'Unable to delete record');
    }
  };

  const filtered = rows.filter((r) => {
    if (!search.trim()) return true;
    const q = search.trim().toLowerCase();
    return (
      String(r.certificate_no || '').toLowerCase().includes(q) ||
      String(r.recipient_name || '').toLowerCase().includes(q) ||
      String(r.ref_no || '').toLowerCase().includes(q) ||
      String(r.class_or_dept || '').toLowerCase().includes(q)
    );
  });

  const getTabCount = (k) => {
    if (k === 'pending_approval') return counts.pending_approvals || 0;
    if (k === 'approved') return counts.total_approved || 0;
    if (k === 'rejected') return counts.rejected_count || 0;
    if (k === 'revoked') return counts.revoked_count || 0;
    return 0;
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex items-start gap-3">
          <button
            onClick={() => navigate('/certificates')}
            className="mt-0.5 p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <ClipboardCheck className="w-5 h-5 text-amber-600" />
              Certificate Approval Queue &amp; Sign-Off Workflow
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Inspect submitted certificates in full A4 preview before Principal approval, issuance, rejection, or revocation.
            </p>
          </div>
        </div>
        <button
          onClick={fetchApprovals}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-semibold rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh Queue
        </button>
      </div>

      {/* Tabs + Search */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {QUEUE_TABS.map((tab) => {
            const cnt = getTabCount(tab.key);
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-xl border transition ${
                  activeTab === tab.key
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                {tab.label}
                <span
                  className={`px-1.5 py-0.5 text-[10px] rounded-full font-bold ${
                    activeTab === tab.key ? 'bg-white/20 text-white' : 'bg-white text-slate-700'
                  }`}
                >
                  {cnt}
                </span>
              </button>
            );
          })}
        </div>

        <div className="relative max-w-sm w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search queue by serial #, name, class..."
            className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-slate-200"
          />
        </div>
      </div>

      {/* Queue List */}
      <div className="space-y-3">
        {loading ? (
          <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center text-sm text-slate-500">
            Loading approval queue...
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center text-sm text-slate-500">
            No certificate records in <strong>{QUEUE_TABS.find((t) => t.key === activeTab)?.label}</strong>.
          </div>
        ) : (
          filtered.map((item) => {
            const tMeta = CERTIFICATE_TYPE_MAP[item.certificate_type] || {};
            const stMeta = STATUS_META[item.status] || STATUS_META.pending_approval;
            return (
              <div
                key={item.id}
                className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4"
              >
                <div className="space-y-1.5 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs font-bold text-slate-900 bg-slate-100 px-2.5 py-0.5 rounded">
                      {item.certificate_no}
                    </span>
                    <span className="px-2 py-0.5 text-[11px] font-bold uppercase rounded bg-indigo-50 text-indigo-700">
                      {tMeta.label || item.certificate_type}
                    </span>
                    <span className={`px-2.5 py-0.5 text-[11px] font-semibold rounded-full border ${stMeta.badgeClass}`}>
                      {stMeta.label}
                    </span>
                  </div>

                  <div className="text-base font-bold text-slate-900">
                    {item.recipient_name}{' '}
                    <span className="text-sm font-normal text-slate-500">
                      ({item.ref_no || '—'} • {item.class_or_dept || item.recipient_type})
                    </span>
                  </div>

                  <div className="text-xs text-slate-500 flex flex-wrap items-center gap-x-4 gap-y-1">
                    <span>Purpose: <strong className="text-slate-700">{item.purpose || 'Standard Request'}</strong></span>
                    <span>Requested: {formatDisplayDate(item.created_at)} {item.requested_by_name ? `by ${item.requested_by_name}` : ''}</span>
                    <span>Issue Date: {formatDisplayDate(item.issue_date)}</span>
                  </div>

                  {(item.approval_remarks || item.revoke_reason) && (
                    <div className="mt-1 inline-flex items-center gap-1.5 text-xs px-3 py-1 rounded-lg bg-rose-50 text-rose-700 border border-rose-200">
                      <XCircle className="w-3.5 h-3.5 shrink-0" />
                      Remarks: {item.revoke_reason || item.approval_remarks}
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <button
                    onClick={() => navigate(`/certificates/approvals/${item.id}`)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl bg-indigo-600 text-white hover:bg-indigo-700"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Inspect &amp; Decide
                  </button>
                  {item.status === 'rejected' && (
                    <button
                      onClick={() => handleReopen(item)}
                      className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Reopen
                    </button>
                  )}
                  {(item.status === 'approved' || item.status === 'issued') && (
                    <button
                      onClick={() => navigate(`/certificates/view/${item.id}/print`)}
                      className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-slate-900 text-white hover:bg-slate-800"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      Print A4
                    </button>
                  )}
                  <button
                    onClick={() => navigate(`/certificates/edit/${item.id}`)}
                    className="inline-flex items-center gap-1 px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50"
                  >
                    <Edit className="w-3.5 h-3.5" />
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(item)}
                    className="p-2 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50"
                    title="Delete Record"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
