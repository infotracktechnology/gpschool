import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Plus,
  Edit2,
  Trash2,
  CalendarRange,
  Building2,
  Calendar,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import { api } from '../../api/client';
import { Badge } from '../../components/common/Badge';
import { useAuth } from '../../context/AuthContext';

export const MappingList = () => {
  const { selectedAcademicYear } = useAuth();
  const [mappings, setMappings] = useState([]);
  const [branches, setBranches] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterBranch, setFilterBranch] = useState('');
  const [filterYear, setFilterYear] = useState('');
  const [message, setMessage] = useState(null);

  const fetchData = async () => {
    try {
      const [mappingsRes, branchesRes, yearsRes] = await Promise.all([
        api.get('/settings/branch-academic-years'),
        api.get('/settings/branches?status=active'),
        api.get('/settings/academic-years?status=active'),
      ]);
      setMappings(mappingsRes.mappings || []);
      setBranches(branchesRes.branches || []);
      setAcademicYears(yearsRes.academicYears || []);
    } catch (err) {
      console.error('Failed to load mappings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // When selectedAcademicYear in topbar changes, automatically preset the filter if user hasn't set custom
  useEffect(() => {
    if (selectedAcademicYear?.id && !filterYear) {
      setFilterYear(String(selectedAcademicYear.id));
    }
  }, [selectedAcademicYear]);

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this session schedule?')) return;
    try {
      await api.delete(`/settings/branch-academic-years/${id}`);
      setMessage({ type: 'success', text: 'Branch academic year mapping deleted successfully!' });
      fetchData();
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to delete mapping' });
    }
  };

  const filteredMappings = mappings.filter((m) => {
    const matchBranch = !filterBranch || String(m.branch_id) === String(filterBranch);
    const matchYear = !filterYear || String(m.academic_year_id) === String(filterYear);
    return matchBranch && matchYear;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-heading flex items-center gap-2.5">
            <CalendarRange className="w-6 h-6 text-brand-600" />
            Branch & Academic Year Mappings
          </h1>
          <p className="text-xs text-muted mt-1">
            Map each Campus Branch to an Academic Year with specific Start & End session dates
            (Foundation for the Academic Calendar)
          </p>
        </div>
        <Link
          to="/settings/branch-year-mappings/create"
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-semibold shadow-md shadow-brand-600/20 transition-all shrink-0"
        >
          <Plus className="w-4 h-4" />
          Map Branch Session
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

      {/* Filter and Table Card */}
      <div className="bg-surface rounded-2xl border border-border shadow-sm overflow-hidden">
        <div className="p-4 border-b border-border flex flex-wrap items-center justify-between gap-4 bg-slate-50/50">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-muted" />
              <select
                value={filterBranch}
                onChange={(e) => setFilterBranch(e.target.value)}
                className="px-2.5 py-1.5 text-xs bg-surface border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500 font-medium"
              >
                <option value="">All Branches</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.code} - {b.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-muted" />
              <select
                value={filterYear}
                onChange={(e) => setFilterYear(e.target.value)}
                className="px-2.5 py-1.5 text-xs bg-surface border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-500 font-medium"
              >
                <option value="">All Academic Years</option>
                {academicYears.map((y) => (
                  <option key={y.id} value={y.id}>
                    {y.code} {y.is_current ? '(Default Active)' : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <span className="text-xs text-muted font-medium">
            {filteredMappings.length} Session Mappings
          </span>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50/75 border-b border-border text-muted font-semibold">
                <th className="py-3 px-4">Branch / Campus</th>
                <th className="py-3 px-4">Education Board</th>
                <th className="py-3 px-4">Academic Year</th>
                <th className="py-3 px-4">Session Start Date</th>
                <th className="py-3 px-4">Session End Date</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {loading ? (
                <tr>
                  <td colSpan="7" className="py-8 text-center text-muted">
                    Loading branch session mappings...
                  </td>
                </tr>
              ) : filteredMappings.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-8 text-center text-muted">
                    No branch academic year mappings found for the selected filters.
                  </td>
                </tr>
              ) : (
                filteredMappings.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-4 font-semibold text-heading">
                      <div>{m.branch_name}</div>
                      <span className="text-[10px] text-muted font-mono">{m.branch_code}</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded bg-purple-50 text-purple-700 font-medium border border-purple-200">
                        {m.board_code}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-medium text-heading">
                      <span className="inline-flex items-center gap-1.5 font-mono text-slate-800">
                        {m.academic_year_code}
                        {Boolean(m.is_global_current) && (
                          <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded font-sans font-semibold">
                            Default
                          </span>
                        )}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-700 font-medium">
                      {new Date(m.start_date).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </td>
                    <td className="py-3 px-4 text-slate-700 font-medium">
                      {new Date(m.end_date).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant={m.status}>{m.status}</Badge>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <Link
                          to={`/settings/branch-year-mappings/${m.id}/edit`}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-brand-600 hover:bg-brand-50 transition-colors inline-block"
                          title="Edit Session Dates"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </Link>
                        <button
                          onClick={() => handleDelete(m.id)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                          title="Delete Mapping"
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
