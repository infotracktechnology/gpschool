import React, { useState, useEffect, useCallback } from 'react';
import {
  Plus,
  Edit2,
  Trash2,
  GraduationCap,
  Search,
  CheckCircle,
  AlertCircle,
  Building2,
} from 'lucide-react';
import { api } from '../../api/client';
import { Modal } from '../../components/common/Modal';
import { Badge } from '../../components/common/Badge';
import { useAuth } from '../../context/AuthContext';

export const STAGES = [
  { value: 'pre_primary', label: 'Pre-Primary', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  { value: 'primary', label: 'Primary', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  { value: 'middle', label: 'Middle', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  { value: 'secondary', label: 'Secondary', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  { value: 'higher_secondary', label: 'Higher Secondary', color: 'bg-purple-50 text-purple-700 border-purple-200' },
];

export const Classes = () => {
  const { user, selectedBranch, branches = [] } = useAuth();
  const isSuperAdmin = user?.role === 'super_admin';
  const userBranchId = user?.branch_id;

  const [localBranches, setLocalBranches] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedStage, setSelectedStage] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClass, setEditingClass] = useState(null);
  const [formData, setFormData] = useState({
    branch_id: '',
    code: '',
    name: '',
    stage: 'primary',
    display_order: 1,
    status: 'active',
  });
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState(null);

  // Sync branches with fallback if AuthContext branches is initially empty
  useEffect(() => {
    if (branches && branches.length > 0) {
      setLocalBranches(branches);
    } else {
      api.get('/branches')
        .then((res) => setLocalBranches(res.branches || res.data || []))
        .catch(() => {
          api.get('/settings/branches')
            .then((res) => setLocalBranches(res.branches || res.data || []))
            .catch(() => {});
        });
    }
  }, [branches]);

  const activeBranches = branches && branches.length > 0 ? branches : localBranches;

  const getDefaultBranchId = useCallback(() => {
    if (selectedBranch && selectedBranch.id !== 'all') {
      return String(selectedBranch.id);
    }
    if (userBranchId) {
      return String(userBranchId);
    }
    if (activeBranches.length > 0) {
      return String(activeBranches[0].id);
    }
    return '';
  }, [selectedBranch, userBranchId, activeBranches]);

  // Fetch classes: pass branch_id when selectedBranch is specific (not 'all')
  const fetchClasses = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedBranch && selectedBranch.id !== 'all') {
        params.append('branch_id', selectedBranch.id);
      }
      const qs = params.toString();
      const url = qs ? `/academics/classes?${qs}` : '/academics/classes';
      const data = await api.get(url);
      setClasses(data.classes || data.data || []);
    } catch (err) {
      console.error('Failed to fetch classes:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedBranch]);

  // Re-fetch classes whenever selectedBranch changes
  useEffect(() => {
    fetchClasses();
  }, [fetchClasses]);

  const handleOpenAdd = () => {
    setEditingClass(null);
    setFormData({
      branch_id: getDefaultBranchId(),
      code: '',
      name: '',
      stage: selectedStage !== 'all' ? selectedStage : 'primary',
      display_order: classes.length + 1,
      status: 'active',
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (c) => {
    setEditingClass(c);
    setFormData({
      branch_id: c.branch_id ? String(c.branch_id) : getDefaultBranchId(),
      code: c.code,
      name: c.name,
      stage: c.stage,
      display_order: c.display_order ?? 1,
      status: c.status || 'active',
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.branch_id) {
      setMessage({ type: 'error', text: 'Please select a branch' });
      return;
    }

    setSubmitting(true);
    setMessage(null);

    const payload = {
      ...formData,
      branch_id: parseInt(formData.branch_id, 10),
      display_order: parseInt(formData.display_order, 10) || 1,
      code: formData.code.trim().toUpperCase(),
      name: formData.name.trim(),
    };

    try {
      if (editingClass) {
        await api.put(`/academics/classes/${editingClass.id}`, payload);
        setMessage({ type: 'success', text: 'Class updated successfully!' });
      } else {
        await api.post('/academics/classes', payload);
        setMessage({ type: 'success', text: 'Class created successfully!' });
      }
      setIsModalOpen(false);
      fetchClasses();
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Operation failed' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete class "${name}"?`)) return;
    try {
      await api.delete(`/academics/classes/${id}`);
      setMessage({ type: 'success', text: 'Class deleted successfully' });
      fetchClasses();
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to delete class' });
    }
  };

  const showBranchColumn = !selectedBranch || selectedBranch.id === 'all';

  const filteredClasses = classes.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.code.toLowerCase().includes(search.toLowerCase());
    const matchesStage = selectedStage === 'all' || c.stage === selectedStage;
    return matchesSearch && matchesStage;
  });

  // Group classes by stage if "all" is selected, else show flat list
  const stageMap = STAGES.reduce((acc, stage) => {
    acc[stage.value] = {
      label: stage.label,
      classes: filteredClasses
        .filter((c) => c.stage === stage.value)
        .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0)),
    };
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {/* Top Banner & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-heading">Classes Master</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-brand-50 text-brand-700 border border-brand-200">
              {classes.length} Total
            </span>
            {selectedBranch && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
                <Building2 className="w-3.5 h-3.5 text-slate-500" />
                {selectedBranch.id === 'all' ? 'All Campuses' : selectedBranch.name}
              </span>
            )}
          </div>
          <p className="text-sm text-muted mt-1">
            Standard grade levels and academic stages across the institution.
          </p>
        </div>
        <button
          onClick={handleOpenAdd}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-sm font-semibold shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-brand-500/20"
        >
          <Plus className="w-4 h-4" />
          Add Class
        </button>
      </div>

      {/* Feedback Message */}
      {message && (
        <div
          className={`p-4 rounded-xl flex items-center gap-3 text-sm animate-fade-in ${
            message.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {/* Stage Filter Tabs & Search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-surface p-4 rounded-2xl border border-border shadow-sm">
        {/* Stage Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          <button
            type="button"
            onClick={() => setSelectedStage('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors shrink-0 ${
              selectedStage === 'all'
                ? 'bg-brand-600 text-white'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            All Stages ({classes.length})
          </button>
          {STAGES.map((s) => {
            const count = classes.filter((c) => c.stage === s.value).length;
            return (
              <button
                key={s.value}
                type="button"
                onClick={() => setSelectedStage(s.value)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors shrink-0 ${
                  selectedStage === s.value
                    ? 'bg-brand-600 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {s.label} ({count})
              </button>
            );
          })}
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-64">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search class or code..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 text-xs rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
          />
        </div>
      </div>

      {/* Main Content: Grouped Classes by Stage */}
      {loading ? (
        <div className="p-12 text-center text-muted">
          <div className="animate-spin w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full mx-auto mb-3" />
          Loading classes...
        </div>
      ) : filteredClasses.length === 0 ? (
        <div className="p-12 text-center bg-surface rounded-2xl border border-border">
          <GraduationCap className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-base font-semibold text-heading">No classes found</p>
          <p className="text-xs text-muted mt-1">
            Try adjusting your search or stage filter, or create a new class.
          </p>
        </div>
      ) : selectedStage === 'all' && !search ? (
        // Grouped by stages view
        <div className="space-y-6">
          {STAGES.map((stage) => {
            const stageClasses = stageMap[stage.value]?.classes || [];
            if (stageClasses.length === 0) return null;

            return (
              <div
                key={stage.value}
                className="bg-surface rounded-2xl border border-border shadow-sm overflow-hidden"
              >
                <div className="px-5 py-3.5 bg-slate-50 border-b border-border flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-brand-500" />
                    <h3 className="text-sm font-bold text-heading uppercase tracking-wide">
                      {stage.label}
                    </h3>
                    <span className="text-xs text-muted font-medium">
                      ({stageClasses.length} {stageClasses.length === 1 ? 'class' : 'classes'})
                    </span>
                  </div>
                  <span className={`text-[11px] px-2.5 py-0.5 rounded-full border font-medium ${stage.color}`}>
                    Stage {stage.label}
                  </span>
                </div>

                <div className="divide-y divide-border">
                  {stageClasses.map((c) => (
                    <div
                      key={c.id}
                      className="px-5 py-3 flex items-center justify-between hover:bg-slate-50/70 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center font-bold text-xs text-slate-700 border border-slate-200">
                          {c.display_order ?? '#'}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold text-heading">{c.name}</p>
                            {showBranchColumn && (c.branch_name || c.branch_id) && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                                <Building2 className="w-3 h-3 text-indigo-500" />
                                {c.branch_name || activeBranches.find((b) => String(b.id) === String(c.branch_id))?.name || `Branch #${c.branch_id}`}
                              </span>
                            )}
                          </div>
                          <p className="text-xs font-mono text-muted">Code: {c.code}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <Badge variant={c.status === 'active' ? 'active' : 'inactive'}>
                          {c.status}
                        </Badge>
                        <div className="flex items-center gap-1 border-l border-border pl-3">
                          <button
                            onClick={() => handleOpenEdit(c)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-brand-600 hover:bg-brand-50 transition-colors"
                            title="Edit Class"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(c.id, c.name)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                            title="Delete Class"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        // Flat filtered table view
        <div className="bg-surface rounded-2xl border border-border shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-border bg-slate-50/60 font-semibold text-slate-600">
                  <th className="py-3 px-4 w-16">Order</th>
                  {showBranchColumn && <th className="py-3 px-4">Branch</th>}
                  <th className="py-3 px-4">Code</th>
                  <th className="py-3 px-4">Class Name</th>
                  <th className="py-3 px-4">Stage</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredClasses
                  .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0))
                  .map((c) => {
                    const stageObj = STAGES.find((s) => s.value === c.stage);
                    return (
                      <tr key={c.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-4 font-mono font-medium text-slate-500">
                          {c.display_order ?? '-'}
                        </td>
                        {showBranchColumn && (
                          <td className="py-3 px-4">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-indigo-50 text-indigo-700 border border-indigo-200">
                              <Building2 className="w-3 h-3 text-indigo-500" />
                              {c.branch_name || activeBranches.find((b) => String(b.id) === String(c.branch_id))?.name || `Branch #${c.branch_id}`}
                            </span>
                          </td>
                        )}
                        <td className="py-3 px-4 font-mono font-bold text-heading">
                          {c.code}
                        </td>
                        <td className="py-3 px-4 font-medium text-heading text-sm">
                          {c.name}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-block px-2 py-0.5 rounded-md text-[11px] font-medium border ${
                              stageObj?.color || 'bg-slate-100 text-slate-700 border-slate-200'
                            }`}
                          >
                            {stageObj?.label || c.stage}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <Badge variant={c.status === 'active' ? 'active' : 'inactive'}>
                            {c.status}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => handleOpenEdit(c)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-brand-600 hover:bg-brand-50 transition-colors"
                              title="Edit Class"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(c.id, c.name)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                              title="Delete Class"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add / Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingClass ? 'Edit Class' : 'Add New Class'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Branch Field */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-brand-600" />
                Branch / Campus <span className="text-rose-500">*</span>
              </span>
              {!isSuperAdmin && (
                <span className="text-[10px] font-normal text-muted">
                  (Locked to your branch)
                </span>
              )}
            </label>
            <select
              required
              disabled={!isSuperAdmin}
              value={formData.branch_id}
              onChange={(e) => setFormData({ ...formData, branch_id: e.target.value })}
              className="w-full px-3.5 py-2 text-sm rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 bg-white disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed"
            >
              <option value="">Select Branch</option>
              {activeBranches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.code})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Class Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Class 10, Pre-KG, UKG"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3.5 py-2 text-sm rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Class Code <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. CLS-10, PRE-KG"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                className="w-full px-3.5 py-2 text-sm font-mono rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Display Order
              </label>
              <input
                type="number"
                min="1"
                value={formData.display_order}
                onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value, 10) || 1 })}
                className="w-full px-3.5 py-2 text-sm rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Stage <span className="text-rose-500">*</span>
              </label>
              <select
                value={formData.stage}
                onChange={(e) => setFormData({ ...formData, stage: e.target.value })}
                className="w-full px-3.5 py-2 text-sm rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
              >
                {STAGES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Status
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-3.5 py-2 text-sm rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border mt-6">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 text-xs font-semibold text-white bg-brand-600 hover:bg-brand-700 rounded-xl shadow-sm transition-all disabled:opacity-50"
            >
              {submitting ? 'Saving...' : editingClass ? 'Update Class' : 'Create Class'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};