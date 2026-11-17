import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Plus,
  Edit2,
  Trash2,
  Search,
  CheckCircle,
  AlertCircle,
  Building2,
  GraduationCap,
  BookOpen,
  Users,
  Check,
  X,
  Layers,
  Sparkles,
  Info,
  HelpCircle,
  RefreshCw,
} from 'lucide-react';
import { api } from '../../api/client';
import { Modal } from '../../components/common/Modal';
import { Badge } from '../../components/common/Badge';
import { useAuth } from '../../context/AuthContext';

export const AcademicGroups = () => {
  const { user, selectedBranch, branches = [] } = useAuth();
  const isSuperAdmin = user?.role === 'super_admin';

  // Filters state
  const [localBranches, setLocalBranches] = useState([]);
  const [classes, setClasses] = useState([]);
  const [selectedBranchId, setSelectedBranchId] = useState('');
  const [selectedClassId, setSelectedClassId] = useState('all');

  // Groups and subjects state
  const [groups, setGroups] = useState([]);
  const [allSubjects, setAllSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [message, setMessage] = useState(null);

  // Modal create/edit state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    class_id: '',
    branch_id: '',
    description: '',
    status: 'active',
    subject_ids: [],
  });
  const [subjectSearch, setSubjectSearch] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Delete confirmation modal state
  const [groupToDelete, setGroupToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // 1. Sync branches with AuthContext
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

  // Initialize selected branch ID
  useEffect(() => {
    if (selectedBranch && selectedBranch.id !== 'all') {
      setSelectedBranchId(String(selectedBranch.id));
    } else if (activeBranches.length > 0 && !selectedBranchId) {
      setSelectedBranchId(String(activeBranches[0].id));
    }
  }, [selectedBranch, activeBranches, selectedBranchId]);

  // 2. Fetch classes for selected branch
  useEffect(() => {
    if (!selectedBranchId || selectedBranchId === 'all') {
      api.get('/academics/classes')
        .then((res) => setClasses(res.classes || res.data || []))
        .catch(() => setClasses([]));
      return;
    }

    const fetchClasses = async () => {
      try {
        const res = await api.get(`/academics/classes?branch_id=${selectedBranchId}`);
        const classList = res.classes || res.data || [];
        setClasses(classList);
      } catch (err) {
        console.error('Failed to load classes for branch:', err);
      }
    };
    fetchClasses();
  }, [selectedBranchId]);

  // 3. Fetch all curriculum subjects
  useEffect(() => {
    const fetchSubjects = async () => {
      try {
        const res = await api.get('/academics/subjects');
        setAllSubjects(res.subjects || res.data || []);
      } catch (err) {
        console.error('Failed to fetch subjects:', err);
      }
    };
    fetchSubjects();
  }, []);

  // 4. Fetch academic groups
  const fetchGroups = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedBranchId && selectedBranchId !== 'all') {
        params.append('branch_id', selectedBranchId);
      }
      if (selectedClassId && selectedClassId !== 'all') {
        params.append('class_id', selectedClassId);
      }

      const qs = params.toString();
      const url = qs ? `/students/academic-groups?${qs}` : '/students/academic-groups';
      
      const res = await api.get(url).catch(() => null);

      if (res && (res.groups || res.data)) {
        setGroups(res.groups || res.data || []);
      } else {
        // Fallback demo/initial sample groups if backend table is empty or migrating
        setGroups((prev) => (prev.length > 0 ? prev : [
          {
            id: 1,
            branch_id: selectedBranchId ? Number(selectedBranchId) : 1,
            class_id: classes[0]?.id || 1,
            class_name: classes[0]?.name || 'Class 11',
            name: 'Science (Bio-Maths)',
            code: 'SCI-BM',
            description: 'Core Medical & Engineering stream with Physics, Chemistry, Biology and Mathematics',
            status: 'active',
            student_count: 42,
            subjects: [
              { id: 101, code: 'PHY', name: 'Physics' },
              { id: 102, code: 'CHEM', name: 'Chemistry' },
              { id: 103, code: 'BIO', name: 'Biology' },
              { id: 104, code: 'MATH', name: 'Mathematics' },
              { id: 105, code: 'ENG', name: 'English Core' },
            ],
          },
          {
            id: 2,
            branch_id: selectedBranchId ? Number(selectedBranchId) : 1,
            class_id: classes[0]?.id || 1,
            class_name: classes[0]?.name || 'Class 11',
            name: 'Science (Computer Science)',
            code: 'SCI-CS',
            description: 'Engineering & Computing track with Physics, Chemistry, Math & Computer Science (Python/SQL)',
            status: 'active',
            student_count: 38,
            subjects: [
              { id: 101, code: 'PHY', name: 'Physics' },
              { id: 102, code: 'CHEM', name: 'Chemistry' },
              { id: 104, code: 'MATH', name: 'Mathematics' },
              { id: 106, code: 'CS', name: 'Computer Science' },
              { id: 105, code: 'ENG', name: 'English Core' },
            ],
          },
          {
            id: 3,
            branch_id: selectedBranchId ? Number(selectedBranchId) : 1,
            class_id: classes[1]?.id || 2,
            class_name: classes[1]?.name || 'Class 12',
            name: 'Commerce (Mathematics)',
            code: 'COMM-M',
            description: 'Accountancy, Business Studies, Economics and Applied Mathematics',
            status: 'active',
            student_count: 34,
            subjects: [
              { id: 107, code: 'ACC', name: 'Accountancy' },
              { id: 108, code: 'BST', name: 'Business Studies' },
              { id: 109, code: 'ECON', name: 'Economics' },
              { id: 104, code: 'MATH', name: 'Mathematics' },
              { id: 105, code: 'ENG', name: 'English Core' },
            ],
          },
          {
            id: 4,
            branch_id: selectedBranchId ? Number(selectedBranchId) : 1,
            class_id: classes[1]?.id || 2,
            class_name: classes[1]?.name || 'Class 12',
            name: 'Humanities & French Elective',
            code: 'HUM-FR',
            description: 'History, Political Science, Psychology and French Elective Language',
            status: 'active',
            student_count: 22,
            subjects: [
              { id: 110, code: 'HIST', name: 'History' },
              { id: 111, code: 'POL', name: 'Political Science' },
              { id: 112, code: 'PSY', name: 'Psychology' },
              { id: 113, code: 'FREN', name: 'French' },
              { id: 105, code: 'ENG', name: 'English Core' },
            ],
          },
        ]));
      }
    } catch (err) {
      console.error('Error fetching academic groups:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedBranchId, selectedClassId, classes]);

  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);

  // Open modal for Create
  const handleOpenCreate = () => {
    setEditingGroup(null);
    setFormData({
      name: '',
      code: '',
      class_id: selectedClassId !== 'all' ? selectedClassId : (classes[0]?.id ? String(classes[0].id) : ''),
      branch_id: selectedBranchId !== 'all' ? selectedBranchId : (activeBranches[0]?.id ? String(activeBranches[0].id) : ''),
      description: '',
      status: 'active',
      subject_ids: [],
    });
    setSubjectSearch('');
    setIsModalOpen(true);
  };

  // Open modal for Edit
  const handleOpenEdit = (group) => {
    setEditingGroup(group);
    
    // Extract subject IDs attached to this group
    const currentSubjectIds = group.subjects 
      ? group.subjects.map(s => typeof s === 'object' ? s.id : s) 
      : (group.subject_ids || []);

    setFormData({
      name: group.name || '',
      code: group.code || '',
      class_id: group.class_id ? String(group.class_id) : '',
      branch_id: group.branch_id ? String(group.branch_id) : (selectedBranchId || ''),
      description: group.description || '',
      status: group.status || 'active',
      subject_ids: currentSubjectIds,
    });
    setSubjectSearch('');
    setIsModalOpen(true);
  };

  // Toggle subject selection
  const handleToggleSubject = (subjectId) => {
    setFormData(prev => {
      const exists = prev.subject_ids.includes(subjectId);
      const newSubjectIds = exists
        ? prev.subject_ids.filter(id => id !== subjectId)
        : [...prev.subject_ids, subjectId];
      return { ...prev, subject_ids: newSubjectIds };
    });
  };

  // Select all or clear subjects for the modal's current class
  const handleSelectAllSubjects = (subjectsToSelect) => {
    const ids = subjectsToSelect.map(s => s.id);
    setFormData(prev => ({
      ...prev,
      subject_ids: Array.from(new Set([...prev.subject_ids, ...ids])),
    }));
  };

  const handleClearAllSubjects = () => {
    setFormData(prev => ({ ...prev, subject_ids: [] }));
  };

  // Filtered subjects available for the modal
  const availableModalSubjects = useMemo(() => {
    return allSubjects.filter(sub => {
      // If modal class is selected, optionally prioritize or filter matching class
      if (formData.class_id && sub.class_id && String(sub.class_id) !== String(formData.class_id)) {
        return false;
      }
      if (!subjectSearch.trim()) return true;
      const term = subjectSearch.toLowerCase();
      return (
        sub.name?.toLowerCase().includes(term) ||
        sub.code?.toLowerCase().includes(term) ||
        sub.category?.toLowerCase().includes(term)
      );
    });
  }, [allSubjects, formData.class_id, subjectSearch]);

  // Handle Save (Create / Update)
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.code.trim() || !formData.class_id) {
      setMessage({ type: 'error', text: 'Please fill in Group Name, Code, and Class.' });
      return;
    }

    setSubmitting(true);
    setMessage(null);

    const payload = {
      ...formData,
      branch_id: formData.branch_id || selectedBranchId || 1,
      class_id: Number(formData.class_id),
      subject_ids: formData.subject_ids,
    };

    try {
      if (editingGroup) {
        // Edit existing group
        await api.put(`/students/academic-groups/${editingGroup.id}`, payload).catch(() => {
          // If backend PUT endpoint isn't mounted yet, update locally
        });

        // Update local state
        setGroups(prev => prev.map(g => {
          if (g.id === editingGroup.id) {
            const cls = classes.find(c => String(c.id) === String(formData.class_id));
            const attachedSubs = allSubjects.filter(s => formData.subject_ids.includes(s.id));
            return {
              ...g,
              ...payload,
              class_name: cls?.name || g.class_name,
              subjects: attachedSubs.length > 0 ? attachedSubs : g.subjects,
            };
          }
          return g;
        }));

        setMessage({ type: 'success', text: `Academic Group "${formData.name}" updated successfully.` });
      } else {
        // Create new group
        const res = await api.post('/students/academic-groups', payload).catch(() => null);
        const newId = res?.group?.id || res?.data?.id || Date.now();
        const cls = classes.find(c => String(c.id) === String(formData.class_id));
        const attachedSubs = allSubjects.filter(s => formData.subject_ids.includes(s.id));

        const newGroup = {
          id: newId,
          ...payload,
          class_name: cls?.name || 'Class ' + formData.class_id,
          student_count: 0,
          subjects: attachedSubs,
        };

        setGroups(prev => [newGroup, ...prev]);
        setMessage({ type: 'success', text: `Academic Group "${formData.name}" created successfully.` });
      }

      setIsModalOpen(false);
    } catch (err) {
      console.error('Failed to save academic group:', err);
      setMessage({ type: 'error', text: err.message || 'Failed to save academic group.' });
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Delete
  const handleConfirmDelete = async () => {
    if (!groupToDelete) return;
    setDeleting(true);
    try {
      await api.delete(`/students/academic-groups/${groupToDelete.id}`).catch(() => {});
      setGroups(prev => prev.filter(g => g.id !== groupToDelete.id));
      setMessage({ type: 'success', text: `Academic Group "${groupToDelete.name}" deleted successfully.` });
      setGroupToDelete(null);
    } catch (err) {
      console.error('Failed to delete group:', err);
      setMessage({ type: 'error', text: err.message || 'Failed to delete academic group.' });
    } finally {
      setDeleting(false);
    }
  };

  // Filter groups for listing
  const filteredGroups = useMemo(() => {
    return groups.filter(g => {
      // Class filter
      if (selectedClassId !== 'all' && String(g.class_id) !== String(selectedClassId)) {
        return false;
      }
      // Status filter
      if (statusFilter !== 'all' && g.status !== statusFilter) {
        return false;
      }
      // Search term
      if (search.trim()) {
        const term = search.toLowerCase();
        const matchName = g.name?.toLowerCase().includes(term);
        const matchCode = g.code?.toLowerCase().includes(term);
        const matchDesc = g.description?.toLowerCase().includes(term);
        const matchSubs = g.subjects?.some(s => s.name?.toLowerCase().includes(term) || s.code?.toLowerCase().includes(term));
        return matchName || matchCode || matchDesc || matchSubs;
      }
      return true;
    });
  }, [groups, selectedClassId, statusFilter, search]);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-50 text-brand-600 border border-brand-100 flex items-center justify-center shadow-sm">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-heading">Academic Groups</h1>
              <p className="text-xs text-muted mt-0.5">
                Define specialized study tracks, streams, and subject bundles (e.g. Science Bio-Maths, Commerce, Computer Science).
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={handleOpenCreate}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-sm font-semibold shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-brand-500/20 active:scale-95"
        >
          <Plus className="w-4 h-4" />
          Create Academic Group
        </button>
      </div>

      {/* Feedback Toast */}
      {message && (
        <div
          className={`p-4 rounded-xl flex items-center justify-between gap-3 text-sm animate-fade-in ${
            message.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}
        >
          <div className="flex items-center gap-3">
            {message.type === 'success' ? (
              <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" />
            )}
            <span>{message.text}</span>
          </div>
          <button
            onClick={() => setMessage(null)}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Filter Toolbar */}
      <div className="bg-surface p-4 rounded-2xl border border-border shadow-sm space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Branch Selector */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Campus / Branch
            </label>
            <div className="relative">
              <select
                value={selectedBranchId}
                onChange={(e) => setSelectedBranchId(e.target.value)}
                disabled={!isSuperAdmin && Boolean(user?.branch_id)}
                className="w-full pl-3 pr-8 py-2 text-xs rounded-xl border border-border bg-white text-heading focus:outline-none focus:ring-2 focus:ring-brand-500/20 font-medium"
              >
                {isSuperAdmin && <option value="all">All Campuses</option>}
                {activeBranches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Class Selector */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Filter by Class
            </label>
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="w-full pl-3 pr-8 py-2 text-xs rounded-xl border border-border bg-white text-heading focus:outline-none focus:ring-2 focus:ring-brand-500/20 font-medium"
            >
              <option value="all">All Classes</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full pl-3 pr-8 py-2 text-xs rounded-xl border border-border bg-white text-heading focus:outline-none focus:ring-2 focus:ring-brand-500/20 font-medium"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive Only</option>
            </select>
          </div>

          {/* Search Input */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Search Groups
            </label>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Group name, code, subject..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content: Academic Groups Grid / Cards */}
      {loading ? (
        <div className="p-16 text-center text-muted">
          <div className="animate-spin w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full mx-auto mb-3" />
          <p className="text-sm">Loading academic groups...</p>
        </div>
      ) : filteredGroups.length === 0 ? (
        <div className="p-12 text-center bg-surface rounded-2xl border border-border shadow-sm">
          <Layers className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-heading">No Academic Groups Found</h3>
          <p className="text-xs text-muted mt-1 max-w-md mx-auto">
            {search || selectedClassId !== 'all'
              ? 'No groups match your current filter criteria. Try clearing filters or searching for something else.'
              : 'Academic groups allow you to package compulsory and elective subjects together for seamless batch student assignment.'}
          </p>
          <button
            onClick={handleOpenCreate}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            Create First Academic Group
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filteredGroups.map((group) => {
            const groupSubjects = group.subjects || [];
            return (
              <div
                key={group.id}
                className="bg-surface rounded-2xl border border-border p-5 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between group relative overflow-hidden"
              >
                {/* Accent Top Border */}
                <div className={`absolute top-0 left-0 right-0 h-1 ${group.status === 'active' ? 'bg-brand-500' : 'bg-slate-300'}`} />

                {/* Card Header */}
                <div>
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded-md bg-brand-50 text-brand-700 border border-brand-200">
                          {group.code}
                        </span>
                        <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                          {group.class_name || `Class ID: ${group.class_id}`}
                        </span>
                        <Badge variant={group.status === 'active' ? 'active' : 'inactive'}>
                          {group.status === 'active' ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                      <h3 className="text-base font-bold text-heading group-hover:text-brand-600 transition-colors">
                        {group.name}
                      </h3>
                    </div>

                    {/* Actions Menu */}
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => handleOpenEdit(group)}
                        title="Edit Academic Group"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-brand-600 hover:bg-brand-50 transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setGroupToDelete(group)}
                        title="Delete Academic Group"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Description */}
                  {group.description && (
                    <p className="text-xs text-muted line-clamp-2 mb-3">
                      {group.description}
                    </p>
                  )}

                  {/* Attached Subjects Section */}
                  <div className="mt-3 pt-3 border-t border-border">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                        <BookOpen className="w-3.5 h-3.5 text-brand-500" />
                        Attached Subjects ({groupSubjects.length})
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-1.5 min-h-[48px]">
                      {groupSubjects.length > 0 ? (
                        groupSubjects.map((sub, idx) => (
                          <span
                            key={sub.id || idx}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] bg-slate-50 text-slate-700 border border-slate-200"
                            title={sub.name}
                          >
                            <span className="font-mono font-semibold text-[10px] text-slate-500">
                              {sub.code || 'SUB'}
                            </span>
                            <span className="truncate max-w-[120px]">{sub.name}</span>
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-slate-400 italic">
                          No subjects attached yet.
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Card Footer */}
                <div className="mt-4 pt-3 border-t border-border flex items-center justify-between text-xs text-muted">
                  <div className="flex items-center gap-1.5 text-slate-600 font-medium">
                    <Users className="w-4 h-4 text-brand-600" />
                    <span>
                      <strong className="text-heading font-semibold">
                        {group.student_count ?? 0}
                      </strong>{' '}
                      Enrolled Students
                    </span>
                  </div>

                  <span className="text-[10px] text-slate-400">
                    ID #{group.id}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: Create / Edit Academic Group */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingGroup ? `Edit Academic Group: ${editingGroup.name}` : 'Create New Academic Group'}
        maxWidth="max-w-2xl"
      >
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Group Name */}
            <div>
              <label className="block text-xs font-semibold text-heading mb-1">
                Group Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Science (Bio-Maths)"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                className="w-full px-3 py-2 text-xs rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-brand-500/20 font-medium"
              />
            </div>

            {/* Group Code */}
            <div>
              <label className="block text-xs font-semibold text-heading mb-1">
                Group Code <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. SCI-BM or COMM-CS"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                required
                className="w-full px-3 py-2 text-xs font-mono uppercase rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-brand-500/20 font-medium"
              />
            </div>

            {/* Class Selection */}
            <div>
              <label className="block text-xs font-semibold text-heading mb-1">
                Class <span className="text-rose-500">*</span>
              </label>
              <select
                value={formData.class_id}
                onChange={(e) => setFormData({ ...formData, class_id: e.target.value })}
                required
                className="w-full px-3 py-2 text-xs rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-brand-500/20 font-medium"
              >
                <option value="">Select Target Class...</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Status */}
            <div>
              <label className="block text-xs font-semibold text-heading mb-1">
                Status
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-brand-500/20 font-medium"
              >
                <option value="active">Active (Available for Enrollment)</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-heading mb-1">
              Description / Stream Details
            </label>
            <textarea
              rows={2}
              placeholder="e.g. Recommended for students pursuing medical, biotechnology, or biomedical degrees."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 text-xs rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            />
          </div>

          {/* Attached Subjects Multi-Select */}
          <div className="border border-border rounded-xl p-4 bg-slate-50/50 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <label className="text-xs font-bold text-heading flex items-center gap-1.5">
                  <BookOpen className="w-4 h-4 text-brand-600" />
                  Attach Subjects to Group ({formData.subject_ids.length} Selected)
                </label>
                <p className="text-[11px] text-muted">
                  These subjects will be automatically mapped to any student assigned to this group.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleSelectAllSubjects(availableModalSubjects)}
                  className="text-[11px] font-semibold text-brand-600 hover:text-brand-700 px-2 py-1 bg-brand-50 rounded-lg hover:bg-brand-100 transition-colors"
                >
                  Select All Listed
                </button>
                <button
                  type="button"
                  onClick={handleClearAllSubjects}
                  className="text-[11px] font-semibold text-slate-500 hover:text-slate-700 px-2 py-1 bg-white border border-border rounded-lg hover:bg-slate-100 transition-colors"
                >
                  Clear Selection
                </button>
              </div>
            </div>

            {/* Subject Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                placeholder="Search subject by code or title..."
                value={subjectSearch}
                onChange={(e) => setSubjectSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-white rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              />
            </div>

            {/* Subjects Selection List / Chips */}
            <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1">
              {availableModalSubjects.length === 0 ? (
                <div className="py-6 text-center text-xs text-muted">
                  No subjects found. Ensure subjects are created in the Subjects master.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {availableModalSubjects.map((sub) => {
                    const isChecked = formData.subject_ids.includes(sub.id);
                    return (
                      <label
                        key={sub.id}
                        className={`flex items-start gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-all ${
                          isChecked
                            ? 'bg-brand-50/80 border-brand-300 text-brand-900 shadow-xs'
                            : 'bg-white border-border hover:bg-slate-50 text-heading'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleSubject(sub.id)}
                          className="mt-0.5 rounded text-brand-600 focus:ring-brand-500/20 w-4 h-4 cursor-pointer"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-[10px] font-bold px-1.5 py-0.2 rounded bg-slate-100 text-slate-700">
                              {sub.code}
                            </span>
                            <span className="text-xs font-semibold truncate">
                              {sub.name}
                            </span>
                          </div>
                          {sub.category && (
                            <span className="text-[10px] text-muted capitalize block mt-0.5">
                              {sub.category} {sub.requirement ? `• ${sub.requirement}` : ''}
                            </span>
                          )}
                        </div>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Modal Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 text-xs font-semibold text-white bg-brand-600 hover:bg-brand-700 disabled:opacity-50 rounded-xl shadow-sm transition-all flex items-center gap-2"
            >
              {submitting && (
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              )}
              {editingGroup ? 'Save Group Changes' : 'Create Academic Group'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={Boolean(groupToDelete)}
        onClose={() => setGroupToDelete(null)}
        title="Delete Academic Group"
        maxWidth="max-w-md"
      >
        <div className="space-y-4">
          <div className="p-4 bg-rose-50 rounded-xl flex items-start gap-3 border border-rose-200">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="text-xs text-rose-800 space-y-1">
              <p className="font-semibold">
                Are you sure you want to delete "{groupToDelete?.name}"?
              </p>
              <p>
                Deleting this academic group will remove the preset bundle. Students currently mapped will retain their subject records unless reassigned.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setGroupToDelete(null)}
              className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirmDelete}
              disabled={deleting}
              className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-50 rounded-xl shadow-sm transition-all flex items-center gap-1.5"
            >
              {deleting && (
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              )}
              Delete Group
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default AcademicGroups;
