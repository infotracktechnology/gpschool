import React, { useState, useEffect, useCallback } from 'react';
import {
  Plus,
  Edit2,
  Trash2,
  Layers,
  Building2,
  GraduationCap,
  AlertCircle,
  CheckCircle,
  Users,
  DoorOpen,
  Sparkles,
} from 'lucide-react';
import { api } from '../../api/client';
import { Modal } from '../../components/common/Modal';
import { Badge } from '../../components/common/Badge';
import { useAuth } from '../../context/AuthContext';

export const Sections = () => {
  const { selectedBranch } = useAuth();
  const [branches, setBranches] = useState([]);
  const [classes, setClasses] = useState([]);
  const [selectedBranchId, setSelectedBranchId] = useState('');
  const [selectedClassId, setSelectedClassId] = useState('');

  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingLookups, setLoadingLookups] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSection, setEditingSection] = useState(null);
  const [formData, setFormData] = useState({
    name: 'A',
    capacity: 40,
    room_no: '',
    status: 'active',
  });
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState(null);

  // Sync selectedBranch from AuthContext if a specific branch is selected
  useEffect(() => {
    if (selectedBranch && selectedBranch.id !== 'all') {
      setSelectedBranchId(String(selectedBranch.id));
    }
  }, [selectedBranch]);

  // Fetch initial branches lookup
  useEffect(() => {
    const fetchBranches = async () => {
      setLoadingLookups(true);
      try {
        const branchRes = await api.get('/settings/branches');
        const branchList = branchRes.branches || branchRes.data || [];
        setBranches(branchList);

        if (branchList.length > 0) {
          setSelectedBranchId((prev) => {
            if (prev) return prev;
            if (selectedBranch && selectedBranch.id !== 'all') {
              return String(selectedBranch.id);
            }
            return String(branchList[0].id);
          });
        }
      } catch (err) {
        console.error('Failed to load branches:', err);
      } finally {
        setLoadingLookups(false);
      }
    };

    fetchBranches();
  }, [selectedBranch]);

  // Fetch classes filtered by branch_id whenever selectedBranchId changes
  useEffect(() => {
    if (!selectedBranchId) {
      setClasses([]);
      return;
    }

    const fetchClassesForBranch = async () => {
      try {
        const classRes = await api.get(`/academics/classes?branch_id=${selectedBranchId}`);
        const classList = classRes.classes || classRes.data || [];
        setClasses(classList);

        // Keep current selected class if it belongs to this branch's classes, otherwise default to first class
        setSelectedClassId((prev) => {
          if (prev && classList.some((c) => String(c.id) === String(prev))) {
            return prev;
          }
          return classList.length > 0 ? String(classList[0].id) : '';
        });
      } catch (err) {
        console.error('Failed to load classes for branch:', err);
      }
    };

    fetchClassesForBranch();
  }, [selectedBranchId]);

  // Fetch sections based on branch and class
  const fetchSections = useCallback(async () => {
    if (!selectedBranchId) {
      setSections([]);
      return;
    }

    setLoading(true);
    try {
      let queryParams = `branch_id=${selectedBranchId}`;
      if (selectedClassId) {
        queryParams += `&class_id=${selectedClassId}`;
      }
      const data = await api.get(`/academics/sections?${queryParams}`);
      setSections(data.sections || data.data || []);
    } catch (err) {
      console.error('Failed to fetch sections:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedBranchId, selectedClassId]);

  useEffect(() => {
    fetchSections();
  }, [fetchSections]);

  const handleOpenAdd = (defaultName = 'A') => {
    setEditingSection(null);
    setFormData({
      name: defaultName,
      capacity: 40,
      room_no: '',
      status: 'active',
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (sec) => {
    setEditingSection(sec);
    setFormData({
      name: sec.name,
      capacity: sec.capacity ?? 40,
      room_no: sec.room_no || '',
      status: sec.status || 'active',
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedBranchId) {
      setMessage({ type: 'error', text: 'Please select a Branch' });
      return;
    }
    if (!selectedClassId) {
      setMessage({ type: 'error', text: 'Please select a Class' });
      return;
    }

    setSubmitting(true);
    setMessage(null);

    const payload = {
      ...formData,
      branch_id: parseInt(selectedBranchId, 10),
      class_id: parseInt(selectedClassId, 10),
    };

    try {
      if (editingSection) {
        await api.put(`/academics/sections/${editingSection.id}`, payload);
        setMessage({ type: 'success', text: `Section "${formData.name}" updated successfully!` });
      } else {
        await api.post('/academics/sections', payload);
        setMessage({ type: 'success', text: `Section "${formData.name}" created successfully!` });
      }
      setIsModalOpen(false);
      fetchSections();
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Operation failed' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete Section ${name}?`)) return;
    try {
      await api.delete(`/academics/sections/${id}`);
      setMessage({ type: 'success', text: `Section ${name} deleted successfully` });
      fetchSections();
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to delete section' });
    }
  };

  const handleQuickAdd = async (sectionName) => {
    if (!selectedBranchId || !selectedClassId) return;
    try {
      await api.post('/academics/sections', {
        name: sectionName,
        capacity: 40,
        room_no: '',
        status: 'active',
        branch_id: parseInt(selectedBranchId, 10),
        class_id: parseInt(selectedClassId, 10),
      });
      setMessage({ type: 'success', text: `Section "${sectionName}" added quickly!` });
      fetchSections();
    } catch (err) {
      setMessage({ type: 'error', text: err.message || `Failed to add Section ${sectionName}` });
    }
  };

  const currentBranch = branches.find((b) => String(b.id) === String(selectedBranchId));
  const currentClass = classes.find((c) => String(c.id) === String(selectedClassId));

  const existingNames = new Set(sections.map((s) => s.name?.toUpperCase()));
  const quickPresets = ['A', 'B', 'C', 'D'].filter((letter) => !existingNames.has(letter));

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-heading">Sections Setup</h1>
          </div>
          <p className="text-sm text-muted mt-1">
            Configure class sections, student capacity, and classroom rooms per branch and class.
          </p>
        </div>

        <button
          onClick={() => handleOpenAdd(quickPresets[0] || 'A')}
          disabled={!selectedBranchId || !selectedClassId}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white rounded-xl text-sm font-semibold shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-brand-500/20"
        >
          <Plus className="w-4 h-4" />
          Add Section
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

      {/* Branch & Class Selectors */}
      <div className="bg-surface p-5 rounded-2xl border border-border shadow-sm space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-brand-600" />
              Select Branch / Campus <span className="text-rose-500">*</span>
            </label>
            <select
              value={selectedBranchId}
              onChange={(e) => setSelectedBranchId(e.target.value)}
              className="w-full px-3.5 py-2 text-sm rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 bg-white"
            >
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.code})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
              <GraduationCap className="w-3.5 h-3.5 text-brand-600" />
              Select Class <span className="text-rose-500">*</span>
            </label>
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="w-full px-3.5 py-2 text-sm rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 bg-white"
            >
              <option value="">All Classes in Branch</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.code}) - {c.stage?.replace('_', ' ')}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Quick Add Presets if a specific class is selected */}
        {selectedClassId && quickPresets.length > 0 && (
          <div className="pt-3 border-t border-border flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-muted flex items-center gap-1 mr-1">
              <Sparkles className="w-3.5 h-3.5 text-brand-500" />
              1-Click Add Section:
            </span>
            {quickPresets.map((letter) => (
              <button
                key={letter}
                type="button"
                onClick={() => handleQuickAdd(letter)}
                className="px-2.5 py-1 text-xs font-semibold bg-brand-50 hover:bg-brand-100 text-brand-700 border border-brand-200 rounded-lg transition-colors flex items-center gap-1"
              >
                <Plus className="w-3 h-3" />
                Section {letter}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Sections Grid / List */}
      {loading || loadingLookups ? (
        <div className="p-12 text-center text-muted">
          <div className="animate-spin w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full mx-auto mb-3" />
          Loading sections...
        </div>
      ) : sections.length === 0 ? (
        <div className="p-12 text-center bg-surface rounded-2xl border border-border">
          <Layers className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-base font-semibold text-heading">No Sections Configured</p>
          <p className="text-xs text-muted mt-1 max-w-md mx-auto">
            {selectedClassId
              ? `No sections have been set up for ${currentClass?.name || 'this class'} in ${
                  currentBranch?.name || 'this branch'
                }.`
              : 'Select a class or click "Add Section" to create your first class section.'}
          </p>
          <button
            onClick={() => handleOpenAdd('A')}
            disabled={!selectedBranchId || !selectedClassId}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold shadow-sm transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            Create Section A
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {sections.map((sec) => (
            <div
              key={sec.id}
              className="bg-surface rounded-2xl border border-border p-5 shadow-sm hover:border-brand-300 transition-all group flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-brand-50 text-brand-700 border border-brand-200 flex items-center justify-center font-bold text-xl shadow-xs">
                      {sec.name}
                    </div>
                    <div>
                      <h3 className="font-bold text-heading text-base leading-tight">
                        Section {sec.name}
                      </h3>
                      <p className="text-xs text-muted font-medium mt-0.5">
                        {sec.class_name || currentClass?.name || `Class ID: ${sec.class_id}`}
                      </p>
                    </div>
                  </div>
                  <Badge variant={sec.status === 'active' ? 'active' : 'inactive'}>
                    {sec.status}
                  </Badge>
                </div>

                <div className="mt-4 pt-4 border-t border-border grid grid-cols-2 gap-3 text-xs">
                  <div className="flex items-center gap-2 text-slate-600">
                    <Users className="w-4 h-4 text-slate-400 shrink-0" />
                    <span>
                      Cap: <strong className="text-slate-800">{sec.capacity || 40}</strong> students
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-600">
                    <DoorOpen className="w-4 h-4 text-slate-400 shrink-0" />
                    <span className="truncate">
                      {sec.room_no ? (
                        <>
                          Room: <strong className="text-slate-800">{sec.room_no}</strong>
                        </>
                      ) : (
                        <span className="text-slate-400 italic">No room set</span>
                      )}
                    </span>
                  </div>
                </div>

                {sec.branch_name && (
                  <p className="text-[11px] text-slate-400 mt-2 truncate">
                    Campus: {sec.branch_name}
                  </p>
                )}
              </div>

              <div className="mt-4 pt-3 border-t border-border/80 flex items-center justify-end gap-2">
                <button
                  onClick={() => handleOpenEdit(sec)}
                  className="px-2.5 py-1 text-xs font-semibold text-slate-600 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors flex items-center gap-1"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(sec.id, sec.name)}
                  className="px-2.5 py-1 text-xs font-semibold text-slate-600 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors flex items-center gap-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={
          editingSection
            ? `Edit Section ${editingSection.name}`
            : `Add Section for ${currentClass?.name || 'Class'}`
        }
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="bg-slate-50 p-3 rounded-xl border border-border text-xs text-slate-600 space-y-1">
            <div className="flex justify-between">
              <span className="text-muted">Branch / Campus:</span>
              <span className="font-semibold text-heading">{currentBranch?.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Class:</span>
              <span className="font-semibold text-heading">{currentClass?.name || 'Selected Class'}</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Section Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. A, B, C, Rose, Lotus"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3.5 py-2 text-sm rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Student Capacity <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                min="1"
                required
                value={formData.capacity}
                onChange={(e) =>
                  setFormData({ ...formData, capacity: parseInt(e.target.value, 10) || 0 })
                }
                className="w-full px-3.5 py-2 text-sm rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Room Number / Room Label
              </label>
              <input
                type="text"
                placeholder="e.g. Room 102, Lab 1"
                value={formData.room_no}
                onChange={(e) => setFormData({ ...formData, room_no: e.target.value })}
                className="w-full px-3.5 py-2 text-sm rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Status</label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              className="w-full px-3.5 py-2 text-sm rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
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
              {submitting ? 'Saving...' : editingSection ? 'Update Section' : 'Create Section'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
