import React, { useState, useEffect, useCallback } from 'react';
import {
  Clock,
  Plus,
  Edit2,
  Trash2,
  Check,
  CheckCircle,
  AlertCircle,
  Building2,
  Calendar,
} from 'lucide-react';
import { api } from '../../api/client';
import { Modal } from '../../components/common/Modal';
import { useAuth } from '../../context/AuthContext';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Format "HH:MM:SS" or "HH:MM" → "08:00 AM" */
const formatTime12h = (timeStr) => {
  if (!timeStr) return '—';
  const parts = String(timeStr).split(':');
  if (parts.length < 2) return timeStr;
  const hours = parseInt(parts[0], 10);
  const minutes = parseInt(parts[1], 10);
  if (isNaN(hours) || isNaN(minutes)) return timeStr;
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const hour12 = hours % 12 || 12;
  return `${String(hour12).padStart(2, '0')}:${String(minutes).padStart(2, '0')} ${ampm}`;
};

const EMPTY_FORM = {
  timing_name: '',
  session1_start: '',
  session1_end: '',
  session2_enabled: false,
  session2_name: 'Afternoon Session',
  session2_start: '',
  session2_end: '',
};

// ─── Main Component ───────────────────────────────────────────────────────────

export const AttendanceTimings = () => {
  const {
    branches: authBranches = [],
    selectedBranch: authSelectedBranch,
    academicYears: authAcademicYears = [],
    selectedAcademicYear: authSelectedYear,
  } = useAuth() || {};

  // Filter state
  const [branches, setBranches] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState('');
  const [selectedYear, setSelectedYear] = useState('');

  // Timings list state
  const [timings, setTimings] = useState([]);
  const [loading, setLoading] = useState(false);

  // Modal / Form state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTiming, setEditingTiming] = useState(null);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);

  // User feedback
  const [message, setMessage] = useState(null);

  // Auto-dismiss feedback message after 4s
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => setMessage(null), 4000);
    return () => clearTimeout(timer);
  }, [message]);

  // Load branches
  useEffect(() => {
    if (authBranches && authBranches.length > 0) {
      setBranches(authBranches);
    } else {
      api
        .get('/branches')
        .then((res) => setBranches(res.branches || res.data || []))
        .catch(() => {
          api
            .get('/settings/branches')
            .then((res) => setBranches(res.branches || res.data || []))
            .catch(() => {});
        });
    }
  }, [authBranches]);

  // Load academic years
  useEffect(() => {
    if (authAcademicYears && authAcademicYears.length > 0) {
      setAcademicYears(authAcademicYears);
    } else {
      api
        .get('/academic-years')
        .then((res) =>
          setAcademicYears(
            res.academicYears || res.academic_years || res.data || []
          )
        )
        .catch(() => {
          api
            .get('/settings/academic-years')
            .then((res) =>
              setAcademicYears(
                res.academicYears || res.academic_years || res.data || []
              )
            )
            .catch(() => {});
        });
    }
  }, [authAcademicYears]);

  // Initialize selectedBranch with auth context or first available branch
  useEffect(() => {
    if (selectedBranch) return;
    if (authSelectedBranch && authSelectedBranch.id && authSelectedBranch.id !== 'all') {
      setSelectedBranch(String(authSelectedBranch.id));
    } else if (branches.length > 0) {
      const firstValid = branches.find((b) => b.id !== 'all') || branches[0];
      if (firstValid?.id) setSelectedBranch(String(firstValid.id));
    }
  }, [authSelectedBranch, branches, selectedBranch]);

  // Initialize selectedYear with auth context or active/first available year
  useEffect(() => {
    if (selectedYear) return;
    if (authSelectedYear && authSelectedYear.id) {
      setSelectedYear(String(authSelectedYear.id));
    } else if (academicYears.length > 0) {
      const activeYear = academicYears.find((y) => y.is_current) || academicYears[0];
      if (activeYear?.id) setSelectedYear(String(activeYear.id));
    }
  }, [authSelectedYear, academicYears, selectedYear]);

  // Fetch timings when both branch and academic year are selected
  const fetchTimings = useCallback(async () => {
    if (!selectedBranch || !selectedYear) {
      setTimings([]);
      return;
    }

    setLoading(true);
    try {
      const data = await api.get(
        `/attendance/timings?branch_id=${encodeURIComponent(
          selectedBranch
        )}&academic_year_id=${encodeURIComponent(selectedYear)}`
      );
      setTimings(data.timings || data.data || []);
    } catch (err) {
      console.error('Failed to load timing configurations:', err);
      setTimings([]);
    } finally {
      setLoading(false);
    }
  }, [selectedBranch, selectedYear]);

  useEffect(() => {
    fetchTimings();
  }, [fetchTimings]);

  // Modal open helpers
  const handleOpenAdd = () => {
    setEditingTiming(null);
    setFormData({ ...EMPTY_FORM });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (timing) => {
    setEditingTiming(timing);
    setFormData({
      timing_name: timing.timing_name || '',
      session1_start: timing.session1_start ? String(timing.session1_start).slice(0, 5) : '',
      session1_end: timing.session1_end ? String(timing.session1_end).slice(0, 5) : '',
      session2_enabled: Boolean(timing.session2_enabled),
      session2_name: timing.session2_name || 'Afternoon Session',
      session2_start: timing.session2_start ? String(timing.session2_start).slice(0, 5) : '',
      session2_end: timing.session2_end ? String(timing.session2_end).slice(0, 5) : '',
    });
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingTiming(null);
  };

  const setFormField = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // Submit create or update
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedBranch || !selectedYear) {
      setMessage({ type: 'error', text: 'Please select a branch and academic year first.' });
      return;
    }

    if (formData.session2_enabled) {
      if (!formData.session2_start || !formData.session2_end) {
        setMessage({
          type: 'error',
          text: 'Please provide both start and end time for Session 2.',
        });
        return;
      }
    }

    setSubmitting(true);
    setMessage(null);

    const payload = {
      branch_id: parseInt(selectedBranch, 10),
      academic_year_id: parseInt(selectedYear, 10),
      timing_name: formData.timing_name.trim(),
      session1_start: formData.session1_start,
      session1_end: formData.session1_end,
      session2_enabled: formData.session2_enabled ? 1 : 0,
      session2_name: formData.session2_enabled
        ? (formData.session2_name.trim() || 'Afternoon Session')
        : null,
      session2_start: formData.session2_enabled ? formData.session2_start : null,
      session2_end: formData.session2_enabled ? formData.session2_end : null,
    };

    try {
      if (editingTiming) {
        await api.put(`/attendance/timings/${editingTiming.id}`, payload);
        setMessage({ type: 'success', text: 'Timing configuration updated successfully!' });
      } else {
        await api.post('/attendance/timings', payload);
        setMessage({ type: 'success', text: 'Timing configuration created successfully!' });
      }
      handleCloseModal();
      fetchTimings();
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Operation failed.' });
    } finally {
      setSubmitting(false);
    }
  };

  // Set as active configuration
  const handleSetActive = async (timing) => {
    try {
      await api.patch(`/attendance/timings/${timing.id}/set-active`);
      setMessage({
        type: 'success',
        text: `"${timing.timing_name}" is now the active timing configuration.`,
      });
      fetchTimings();
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to activate timing.' });
    }
  };

  // Delete timing
  const handleDelete = async (timing) => {
    if (timing.is_active) {
      setMessage({ type: 'error', text: 'Cannot delete an active timing configuration.' });
      return;
    }

    if (!window.confirm(`Are you sure you want to delete "${timing.timing_name}"?`)) {
      return;
    }

    try {
      await api.delete(`/attendance/timings/${timing.id}`);
      setMessage({ type: 'success', text: 'Timing configuration deleted successfully.' });
      fetchTimings();
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to delete timing.' });
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ── Top Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold text-heading flex items-center gap-2.5">
              <Clock className="w-6 h-6 text-brand-600" />
              Attendance Timings
            </h1>
            {timings.length > 0 && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-brand-50 text-brand-700 border border-brand-200">
                {timings.length} {timings.length === 1 ? 'Config' : 'Configs'}
              </span>
            )}
          </div>
          <p className="text-xs text-muted mt-1">
            Configure shift timings and sessions per branch and academic year.
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          disabled={!selectedBranch || !selectedYear}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-semibold shadow-md shadow-brand-600/20 transition-all shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Plus className="w-4 h-4" />
          Add Timing
        </button>
      </div>

      {/* ── Feedback Message ── */}
      {message && (
        <div
          className={`p-3.5 rounded-xl border text-xs flex items-center gap-2 animate-fade-in ${
            message.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
              : 'bg-rose-50 border-rose-200 text-rose-700'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle className="w-4 h-4 shrink-0 text-emerald-500" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {/* ── Filter Bar ── */}
      <div className="bg-surface rounded-2xl border border-border shadow-sm p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Branch Selector */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5 text-brand-600" />
            Branch / Campus <span className="text-rose-500">*</span>
          </label>
          <select
            value={selectedBranch}
            onChange={(e) => setSelectedBranch(e.target.value)}
            className="w-full px-3.5 py-2 text-sm rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 bg-white"
          >
            <option value="">Select Branch</option>
            {branches
              .filter((b) => b.id !== 'all')
              .map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} {b.code ? `(${b.code})` : ''}
                </option>
              ))}
          </select>
        </div>

        {/* Academic Year Selector */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-brand-600" />
            Academic Year <span className="text-rose-500">*</span>
          </label>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="w-full px-3.5 py-2 text-sm rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 bg-white"
          >
            <option value="">Select Academic Year</option>
            {academicYears.map((y) => (
              <option key={y.id} value={y.id}>
                {y.name || y.label || y.code} {y.is_current ? '(Current)' : ''}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ── Timing Cards Section ── */}
      {!selectedBranch || !selectedYear ? (
        <div className="p-12 text-center bg-surface rounded-2xl border border-border">
          <Clock className="w-10 h-10 text-slate-300 mx-auto mb-2.5" />
          <p className="text-sm font-semibold text-heading">Select Branch & Academic Year</p>
          <p className="text-xs text-muted mt-1">
            Choose both a branch and an academic year above to manage timing configurations.
          </p>
        </div>
      ) : loading ? (
        <div className="p-12 text-center text-muted">
          <div className="animate-spin w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full mx-auto mb-3" />
          Loading timing configurations...
        </div>
      ) : timings.length === 0 ? (
        <div className="p-12 text-center bg-surface rounded-2xl border border-border">
          <Clock className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-base font-semibold text-heading">
            No timing configurations yet. Add one to get started.
          </p>
          <p className="text-xs text-muted mt-1">
            Create a configuration to define session hours for attendance recording.
          </p>
          <button
            onClick={handleOpenAdd}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" />
            Add Configuration
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {timings.map((t) => (
            <TimingCard
              key={t.id}
              timing={t}
              onEdit={handleOpenEdit}
              onDelete={handleDelete}
              onSetActive={handleSetActive}
            />
          ))}
        </div>
      )}

      {/* ── Add / Edit Modal ── */}
      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={editingTiming ? 'Edit Timing Configuration' : 'Add Timing Configuration'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Timing Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Timing Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Regular School Hours, Morning Shift"
              value={formData.timing_name}
              onChange={(e) => setFormField('timing_name', e.target.value)}
              className="w-full px-3.5 py-2 text-sm rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 bg-white"
            />
          </div>

          {/* Session 1 Section */}
          <div className="bg-slate-50 rounded-xl p-3.5 border border-border space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-brand-600" />
                Session 1 (Morning)
              </span>
              <span className="text-[10px] text-slate-500 font-medium">Required</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Session 1 Start <span className="text-rose-500">*</span>
                </label>
                <input
                  type="time"
                  required
                  value={formData.session1_start}
                  onChange={(e) => setFormField('session1_start', e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Session 1 End <span className="text-rose-500">*</span>
                </label>
                <input
                  type="time"
                  required
                  value={formData.session1_end}
                  onChange={(e) => setFormField('session1_end', e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 bg-white"
                />
              </div>
            </div>
          </div>

          {/* Enable Session 2 Toggle */}
          <div className="flex items-center justify-between p-3 rounded-xl border border-border bg-white">
            <div>
              <p className="text-xs font-semibold text-slate-700">Enable Session 2</p>
              <p className="text-[11px] text-muted">
                Turn on for double-session schedules (e.g. afternoon or evening shifts)
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={formData.session2_enabled}
              onClick={() => setFormField('session2_enabled', !formData.session2_enabled)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-brand-500/20 ${
                formData.session2_enabled ? 'bg-brand-600' : 'bg-slate-200'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out mt-1 ${
                  formData.session2_enabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Session 2 Fields — smooth slide-in container */}
          <div
            className={`transition-all duration-300 ease-in-out overflow-hidden ${
              formData.session2_enabled
                ? 'max-h-96 opacity-100'
                : 'max-h-0 opacity-0 pointer-events-none'
            }`}
          >
            <div className="bg-amber-50/70 rounded-xl p-3.5 border border-amber-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-800 uppercase tracking-wide flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-amber-600" />
                  Session 2 Details
                </span>
                <span className="text-[10px] text-amber-700 font-medium">Optional Shift</span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Session 2 Name
                </label>
                <input
                  type="text"
                  placeholder="Afternoon Session"
                  value={formData.session2_name}
                  onChange={(e) => setFormField('session2_name', e.target.value)}
                  className="w-full px-3.5 py-2 text-sm rounded-xl border border-amber-200 focus:outline-none focus:ring-2 focus:ring-amber-400/20 focus:border-amber-400 bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Session 2 Start {formData.session2_enabled && <span className="text-rose-500">*</span>}
                  </label>
                  <input
                    type="time"
                    required={formData.session2_enabled}
                    value={formData.session2_start}
                    onChange={(e) => setFormField('session2_start', e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-amber-200 focus:outline-none focus:ring-2 focus:ring-amber-400/20 focus:border-amber-400 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Session 2 End {formData.session2_enabled && <span className="text-rose-500">*</span>}
                  </label>
                  <input
                    type="time"
                    required={formData.session2_enabled}
                    value={formData.session2_end}
                    onChange={(e) => setFormField('session2_end', e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-amber-200 focus:outline-none focus:ring-2 focus:ring-amber-400/20 focus:border-amber-400 bg-white"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-border mt-6">
            <button
              type="button"
              onClick={handleCloseModal}
              className="px-4 py-2 rounded-xl text-xs font-medium text-slate-600 hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-brand-600 hover:bg-brand-700 text-white shadow-md shadow-brand-600/20 transition-all disabled:opacity-50"
            >
              {submitting
                ? 'Saving...'
                : editingTiming
                ? 'Update Timing'
                : 'Create Timing'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

// ─── Timing Card Sub-component ────────────────────────────────────────────────

const TimingCard = ({ timing, onEdit, onDelete, onSetActive }) => {
  const isActive = Boolean(timing.is_active);
  const hasSession2 = Boolean(timing.session2_enabled);

  return (
    <div
      className={`bg-surface rounded-2xl border shadow-sm overflow-hidden transition-all flex flex-col justify-between ${
        isActive ? 'border-emerald-300 ring-1 ring-emerald-200' : 'border-border'
      }`}
    >
      <div>
        {/* Card Header */}
        <div className="px-5 py-4 border-b border-border flex items-center justify-between gap-2 bg-slate-50/40">
          <p className="text-sm font-bold text-heading truncate">{timing.timing_name}</p>
          {isActive && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              ACTIVE
            </span>
          )}
        </div>

        {/* Card Body */}
        <div className="px-5 py-4 space-y-3">
          {/* Session 1 */}
          <div className="flex items-center gap-2 text-xs">
            <Clock className="w-3.5 h-3.5 text-brand-600 shrink-0" />
            <span className="text-muted font-medium">Session 1:</span>
            <span className="font-semibold text-heading">
              {formatTime12h(timing.session1_start)} – {formatTime12h(timing.session1_end)}
            </span>
          </div>

          {/* Session 2 Chip */}
          {hasSession2 && (
            <div>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                <Clock className="w-3 h-3 text-amber-600" />
                {timing.session2_name || 'Session 2'}:{' '}
                {formatTime12h(timing.session2_start)} – {formatTime12h(timing.session2_end)}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Card Footer: Action Buttons */}
      <div className="px-5 py-3 bg-slate-50 border-t border-border flex items-center justify-between gap-2 mt-2">
        <div>
          {!isActive ? (
            <button
              onClick={() => onSetActive(timing)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-colors"
            >
              <Check className="w-3.5 h-3.5" />
              Set Active
            </button>
          ) : (
            <span className="text-[11px] text-muted italic">Default active config</span>
          )}
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => onEdit(timing)}
            className="p-1.5 rounded-lg text-slate-500 hover:text-brand-600 hover:bg-brand-50 transition-colors"
            title="Edit Timing"
          >
            <Edit2 className="w-4 h-4" />
          </button>

          {!isActive && (
            <button
              onClick={() => onDelete(timing)}
              className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors"
              title="Delete Timing"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default AttendanceTimings;
