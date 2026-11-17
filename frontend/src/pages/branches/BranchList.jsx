import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Plus,
  Edit2,
  Trash2,
  Building2,
  Search,
  CheckCircle,
  AlertCircle,
  Phone,
  Mail,
  MapPin,
} from 'lucide-react';
import { api } from '../../api/client';
import { Badge } from '../../components/common/Badge';

export const BranchList = () => {
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [message, setMessage] = useState(null);

  const fetchBranches = async () => {
    try {
      const data = await api.get('/settings/branches');
      setBranches(data.branches || []);
    } catch (err) {
      console.error('Failed to load branches:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBranches();
  }, []);

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this campus branch?')) return;
    try {
      await api.delete(`/settings/branches/${id}`);
      setMessage({ type: 'success', text: 'Branch deleted successfully!' });
      fetchBranches();
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to delete branch' });
    }
  };

  const filteredBranches = branches.filter(
    (b) =>
      b.code.toLowerCase().includes(search.toLowerCase()) ||
      b.name.toLowerCase().includes(search.toLowerCase()) ||
      b.board_code.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-heading flex items-center gap-2.5">
            <Building2 className="w-6 h-6 text-brand-600" />
            School Branches & Campuses
          </h1>
          <p className="text-xs text-muted mt-1">
            Manage your school campus locations and their affiliated education boards (Single-board
            per branch model)
          </p>
        </div>
        <Link
          to="/settings/branches/create"
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-semibold shadow-md shadow-brand-600/20 transition-all shrink-0"
        >
          <Plus className="w-4 h-4" />
          Add Campus Branch
        </Link>
      </div>

      {message && (
        <div
          className={`p-3.5 rounded-xl border text-xs flex items-center gap-2 ${
            message.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
              : 'bg-rose-50 border-rose-200 text-rose-700'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle className="w-4 h-4 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {/* Table Card */}
      <div className="bg-surface rounded-2xl border border-border shadow-sm overflow-hidden">
        <div className="p-4 border-b border-border flex items-center justify-between gap-4">
          <div className="relative w-full max-w-xs">
            <Search className="w-4 h-4 text-muted absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search branches by code, name, board..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>
          <span className="text-xs text-muted">{filteredBranches.length} Branches</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50/75 border-b border-border text-muted font-semibold">
                <th className="py-3 px-4">Branch Code</th>
                <th className="py-3 px-4">Branch Name</th>
                <th className="py-3 px-4">Associated Board</th>
                <th className="py-3 px-4">Contact Info</th>
                <th className="py-3 px-4">Location</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {loading ? (
                <tr>
                  <td colSpan="7" className="py-8 text-center text-muted">
                    Loading branches...
                  </td>
                </tr>
              ) : filteredBranches.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-8 text-center text-muted">
                    No branches configured yet. Click "Add Campus Branch" to create one.
                  </td>
                </tr>
              ) : (
                filteredBranches.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-heading">
                      <span className="px-2 py-0.5 rounded bg-brand-50 text-brand-800 border border-brand-200">
                        {b.code}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-semibold text-heading">
                      <div className="flex items-center gap-2.5">
                        {b.logo ? (
                          <img
                            src={b.logo}
                            alt={b.name}
                            className="w-8 h-8 rounded-lg object-contain bg-white border border-border shrink-0 p-0.5 shadow-xs"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-lg bg-slate-100 border border-border flex items-center justify-center text-slate-400 shrink-0">
                            <Building2 className="w-4 h-4" />
                          </div>
                        )}
                        <span>{b.name}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 font-medium border border-purple-200">
                        {b.board_code}
                      </span>
                      <span className="block text-[10px] text-muted truncate max-w-[150px]">
                        {b.board_name}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {b.phone && (
                        <div className="flex items-center gap-1 text-[11px]">
                          <Phone className="w-3 h-3 text-muted" /> {b.phone}
                        </div>
                      )}
                      {b.email && (
                        <div className="flex items-center gap-1 text-[11px] text-muted">
                          <Mail className="w-3 h-3 text-muted" /> {b.email}
                        </div>
                      )}
                      {!b.phone && !b.email && '—'}
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {b.city || b.state ? (
                        <div className="flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-muted" />
                          <span>{[b.city, b.state].filter(Boolean).join(', ')}</span>
                        </div>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant={b.status}>{b.status}</Badge>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <Link
                          to={`/settings/branches/${b.id}/edit`}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-brand-600 hover:bg-brand-50 transition-colors inline-block"
                          title="Edit Branch"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </Link>
                        <button
                          onClick={() => handleDelete(b.id)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                          title="Delete Branch"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
