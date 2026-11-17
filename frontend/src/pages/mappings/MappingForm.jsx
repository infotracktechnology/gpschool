import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { CalendarRange, ArrowLeft, Save, AlertCircle, Clock, Info } from 'lucide-react';
import { api } from '../../api/client';

export const MappingForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [branches, setBranches] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);
  const [formData, setFormData] = useState({
    branch_id: '',
    academic_year_id: '',
    start_date: '2025-06-01',
    end_date: '2026-04-30',
    status: 'active',
  });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const init = async () => {
      try {
        const [branchesRes, yearsRes] = await Promise.all([
          api.get('/settings/branches?status=active'),
          api.get('/settings/academic-years?status=active'),
        ]);

        const activeBranches = branchesRes.branches || [];
        const activeYears = yearsRes.academicYears || [];
        setBranches(activeBranches);
        setAcademicYears(activeYears);

        if (isEdit) {
          const mapRes = await api.get('/settings/branch-academic-years');
          const mapping = mapRes.mappings?.find((m) => String(m.id) === String(id));
          if (!mapping) {
            setError('Session mapping not found');
            return;
          }
          const formatDt = (d) => (d ? new Date(d).toISOString().split('T')[0] : '');
          setFormData({
            branch_id: mapping.branch_id,
            academic_year_id: mapping.academic_year_id,
            start_date: formatDt(mapping.start_date),
            end_date: formatDt(mapping.end_date),
            status: mapping.status,
          });
        } else {
          setFormData((prev) => ({
            ...prev,
            branch_id: activeBranches[0]?.id || '',
            academic_year_id: activeYears.find((y) => y.is_current)?.id || activeYears[0]?.id || '',
          }));
        }
      } catch (err) {
        setError(err.message || 'Failed to initialize session form');
      } finally {
        setLoading(false);
      }
    };

    init();
  }, [id, isEdit]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      if (isEdit) {
        await api.put(`/settings/branch-academic-years/${id}`, {
          start_date: formData.start_date,
          end_date: formData.end_date,
          status: formData.status,
        });
      } else {
        await api.post('/settings/branch-academic-years', formData);
      }
      navigate('/settings/branch-year-mappings');
    } catch (err) {
      setError(err.message || 'Failed to save session mapping');
    } finally {
      setSubmitting(false);
    }
  };

  const selectedBranch = branches.find((b) => String(b.id) === String(formData.branch_id));
  const selectedYear = academicYears.find((y) => String(y.id) === String(formData.academic_year_id));

  if (loading) {
    return (
      <div className="py-12 text-center text-muted text-sm">
        <div className="w-8 h-8 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin mx-auto mb-3" />
        Loading mapping details...
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
      {/* Header & Breadcrumb */}
      <div className="flex items-center gap-3">
        <Link
          to="/settings/branch-year-mappings"
          className="p-2 rounded-xl bg-surface border border-border text-muted hover:text-heading hover:bg-slate-50 transition-colors"
          title="Back to Mappings"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <div className="flex items-center gap-2 text-xs text-muted">
            <Link to="/settings/branch-year-mappings" className="hover:text-brand-600">
              Branch Year Mappings
            </Link>
            <span>/</span>
            <span className="text-heading font-medium">{isEdit ? 'Edit Dates' : 'New Mapping'}</span>
          </div>
          <h1 className="text-xl font-bold text-heading mt-0.5">
            {isEdit ? 'Edit Branch Session Schedule' : 'Map Branch to Academic Year'}
          </h1>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Form Card */}
      <form onSubmit={handleSubmit} className="bg-surface rounded-2xl border border-border shadow-sm p-6 sm:p-8 space-y-6">
        <div>
          <h2 className="text-sm font-bold text-heading mb-1 flex items-center gap-2">
            <CalendarRange className="w-4 h-4 text-brand-600" />
            Session Period & Association
          </h2>
          <p className="text-xs text-muted">
            Define specific academic start and end dates for this campus location
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <label className="block text-xs font-semibold text-heading mb-1.5">
              Select Campus Branch *
            </label>
            <select
              disabled={isEdit}
              required
              value={formData.branch_id}
              onChange={(e) => setFormData({ ...formData, branch_id: e.target.value })}
              className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 disabled:opacity-60 font-medium"
            >
              <option value="">Select Branch</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.code} — {b.name} ({b.board_code})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-heading mb-1.5">
              Academic Year *
            </label>
            <select
              disabled={isEdit}
              required
              value={formData.academic_year_id}
              onChange={(e) => setFormData({ ...formData, academic_year_id: e.target.value })}
              className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 disabled:opacity-60 font-medium font-mono"
            >
              <option value="">Select Year</option>
              {academicYears.map((y) => (
                <option key={y.id} value={y.id}>
                  {y.code} {y.is_current ? '(Default Active)' : ''}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Selected Summary Card */}
        {selectedBranch && selectedYear && (
          <div className="p-4 rounded-xl bg-slate-50 border border-border/80 flex items-center justify-between text-xs">
            <div>
              <span className="text-muted block text-[11px]">Selected Campus & Board:</span>
              <strong className="text-heading font-semibold">
                {selectedBranch.name} ({selectedBranch.board_code})
              </strong>
            </div>
            <div className="text-right">
              <span className="text-muted block text-[11px]">Academic Period:</span>
              <strong className="text-heading font-semibold font-mono">
                {selectedYear.code}
              </strong>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-2">
          <div>
            <label className="block text-xs font-semibold text-heading mb-1.5">
              Session Start Date *
            </label>
            <input
              type="date"
              required
              value={formData.start_date}
              onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
              className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 font-medium"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-heading mb-1.5">
              Session End Date *
            </label>
            <input
              type="date"
              required
              value={formData.end_date}
              onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
              className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 font-medium"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-heading mb-1.5">Session Status</label>
          <select
            value={formData.status}
            onChange={(e) => setFormData({ ...formData, status: e.target.value })}
            className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 font-medium"
          >
            <option value="active">Active Session</option>
            <option value="upcoming">Upcoming Session</option>
            <option value="completed">Completed Session</option>
          </select>
        </div>

        <div className="p-3.5 bg-brand-50/60 rounded-xl border border-brand-200/50 flex items-start gap-2.5 text-xs text-brand-900">
          <Clock className="w-4 h-4 text-brand-600 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            These start and end dates establish the working calendar bounds for this specific branch.
            The future Academic Calendar module will build upon these boundaries.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-6 border-t border-border">
          <Link
            to="/settings/branch-year-mappings"
            className="px-5 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-semibold bg-brand-600 hover:bg-brand-700 text-white shadow-md shadow-brand-600/20 transition-all disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{submitting ? 'Saving...' : isEdit ? 'Update Session' : 'Save Session Mapping'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
