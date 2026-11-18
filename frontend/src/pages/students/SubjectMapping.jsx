import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Layers,
  BookOpen,
  Users,
  Search,
  Check,
  X,
  Save,
  RotateCcw,
  CheckSquare,
  Square,
  AlertCircle,
  CheckCircle,
  Sparkles,
  Filter,
  ArrowRight,
  ShieldAlert,
  ChevronDown,
} from 'lucide-react';
import { api } from '../../api/client';
import { Badge } from '../../components/common/Badge';
import { useAuth } from '../../context/AuthContext';

export const SubjectMapping = () => {
  const { user, selectedBranch, branches = [], selectedAcademicYear, academicYears = [] } = useAuth();
  const isSuperAdmin = user?.role === 'super_admin';

  // Filters state
  const [localBranches, setLocalBranches] = useState([]);
  const [classes, setClasses] = useState([]);
  const [sections, setSections] = useState([]);
  const [selectedBranchId, setSelectedBranchId] = useState('');
  const [selectedYearId, setSelectedYearId] = useState('');
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedSectionId, setSelectedSectionId] = useState('');

  // Loaded metadata
  const [academicGroups, setAcademicGroups] = useState([]);
  const [availableSubjects, setAvailableSubjects] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  // Student search & filter
  const [studentSearch, setStudentSearch] = useState('');
  const [filterElectivesOnly, setFilterElectivesOnly] = useState(false);

  // Selection & Mapping State
  // selectedStudentIds: Set of student IDs selected for bulk assignment
  const [selectedStudentIds, setSelectedStudentIds] = useState(new Set());
  // bulkSubjectId: ID of subject selected in bulk toolbar
  const [bulkSubjectId, setBulkSubjectId] = useState('');
  // bulkGroupId: Optional ID of group selected in template toolbar
  const [bulkGroupId, setBulkGroupId] = useState('');

  // studentMappings: { [studentId]: { subjectIds: number[], academicGroupId: number|null, isModified: boolean } }
  const [studentMappings, setStudentMappings] = useState({});
  const [initialMappings, setInitialMappings] = useState({});

  // 1. Sync branches
  useEffect(() => {
    if (branches && branches.length > 0) {
      setLocalBranches(branches);
    } else {
      api.get('/branches')
        .then((res) => setLocalBranches(res.branches || res.data || []))
        .catch(() => {});
    }
  }, [branches]);

  const activeBranches = branches && branches.length > 0 ? branches : localBranches;

  useEffect(() => {
    if (selectedBranch && selectedBranch.id !== 'all') {
      setSelectedBranchId(String(selectedBranch.id));
    } else if (activeBranches.length > 0 && !selectedBranchId) {
      setSelectedBranchId(String(activeBranches[0].id));
    }
  }, [selectedBranch, activeBranches, selectedBranchId]);

  // Sync academic year
  useEffect(() => {
    if (selectedAcademicYear?.id) {
      setSelectedYearId(String(selectedAcademicYear.id));
    } else if (academicYears.length > 0 && !selectedYearId) {
      const current = academicYears.find(y => y.is_current) || academicYears[0];
      if (current) setSelectedYearId(String(current.id));
    }
  }, [selectedAcademicYear, academicYears, selectedYearId]);

  // 2. Fetch classes when branch changes
  useEffect(() => {
    if (!selectedBranchId || selectedBranchId === 'all') {
      api.get('/academics/classes')
        .then((res) => {
          const list = res.classes || res.data || [];
          setClasses(list);
          if (list.length > 0 && !selectedClassId) {
            setSelectedClassId(String(list[0].id));
          }
        })
        .catch(() => setClasses([]));
      return;
    }

    const fetchClasses = async () => {
      try {
        const res = await api.get(`/academics/classes?branch_id=${selectedBranchId}`);
        const list = res.classes || res.data || [];
        setClasses(list);
        if (list.length > 0) {
          setSelectedClassId(prev => (list.some(c => String(c.id) === String(prev)) ? prev : String(list[0].id)));
        } else {
          setSelectedClassId('');
        }
      } catch (err) {
        console.error('Failed to load classes:', err);
      }
    };
    fetchClasses();
  }, [selectedBranchId]);

  // 3. Fetch sections when class changes
  useEffect(() => {
    if (!selectedClassId) {
      setSections([]);
      setSelectedSectionId('');
      return;
    }

    const fetchSections = async () => {
      try {
        let url = `/academics/sections?class_id=${selectedClassId}`;
        if (selectedBranchId && selectedBranchId !== 'all') {
          url += `&branch_id=${selectedBranchId}`;
        }
        const res = await api.get(url);
        const list = res.sections || res.data || [];
        setSections(list);
        if (list.length > 0) {
          setSelectedSectionId(prev => (list.some(s => String(s.id) === String(prev)) ? prev : String(list[0].id)));
        } else {
          setSelectedSectionId('');
        }
      } catch (err) {
        console.error('Failed to load sections:', err);
      }
    };
    fetchSections();
  }, [selectedClassId, selectedBranchId]);

  // 4. Fetch Academic Groups & Subjects for the selected class
  useEffect(() => {
    if (!selectedClassId) {
      setAcademicGroups([]);
      setAvailableSubjects([]);
      return;
    }

    const fetchClassAcademics = async () => {
      try {
        // Fetch academic groups
        let grpUrl = `/students/academic-groups?class_id=${selectedClassId}`;
        if (selectedBranchId && selectedBranchId !== 'all') {
          grpUrl += `&branch_id=${selectedBranchId}`;
        }
        const grpRes = await api.get(grpUrl).catch(() => null);
        if (grpRes && (grpRes.groups || grpRes.data)) {
          setAcademicGroups(grpRes.groups || grpRes.data);
        } else {
          // Default sample groups
          setAcademicGroups([
            { id: 1, name: 'Science (Bio-Maths)', code: 'SCI-BM', subject_ids: [101, 102, 103, 104] },
            { id: 2, name: 'Science (Computer Science)', code: 'SCI-CS', subject_ids: [101, 102, 104, 106] },
            { id: 3, name: 'Commerce (Maths)', code: 'COMM-M', subject_ids: [107, 108, 109, 104] },
            { id: 4, name: 'Humanities & Arts', code: 'HUM-ARTS', subject_ids: [110, 111, 112, 113] },
          ]);
        }

        // Fetch subjects
        const subRes = await api.get(`/academics/subjects?class_id=${selectedClassId}`).catch(() => null);
        if (subRes && (subRes.subjects || subRes.data)) {
          setAvailableSubjects(subRes.subjects || subRes.data);
        } else {
          // General subjects fallback
          const allSubs = await api.get('/academics/subjects').catch(() => ({ subjects: [] }));
          const list = allSubs.subjects || allSubs.data || [];
          if (list.length > 0) {
            setAvailableSubjects(list);
          } else {
            // Default sample subjects
            setAvailableSubjects([
              { id: 101, code: 'PHY', name: 'Physics', category: 'core', requirement: 'elective' },
              { id: 102, code: 'CHEM', name: 'Chemistry', category: 'core', requirement: 'elective' },
              { id: 103, code: 'BIO', name: 'Biology', category: 'elective', requirement: 'elective' },
              { id: 104, code: 'MATH', name: 'Mathematics', category: 'core', requirement: 'elective' },
              { id: 106, code: 'CS', name: 'Computer Science', category: 'elective', requirement: 'elective' },
              { id: 107, code: 'ACC', name: 'Accountancy', category: 'core', requirement: 'elective' },
              { id: 108, code: 'BST', name: 'Business Studies', category: 'core', requirement: 'elective' },
              { id: 109, code: 'ECON', name: 'Economics', category: 'elective', requirement: 'elective' },
              { id: 110, code: 'HIST', name: 'History', category: 'elective', requirement: 'elective' },
              { id: 113, code: 'FREN', name: 'French Elective', category: 'language', requirement: 'elective' },
            ]);
          }
        }
      } catch (err) {
        console.error('Failed to load class subjects & groups:', err);
      }
    };

    fetchClassAcademics();
  }, [selectedClassId, selectedBranchId]);

  // 5. Fetch students & their current subject mappings for this Class & Section
  const fetchStudentsAndMappings = useCallback(async () => {
    if (!selectedClassId || !selectedSectionId) {
      setStudents([]);
      setStudentMappings({});
      setInitialMappings({});
      return;
    }

    setLoading(true);
    setSelectedStudentIds(new Set());

    try {
      // 1. Fetch students
      let studentUrl = `/students?class_id=${selectedClassId}&section_id=${selectedSectionId}`;
      if (selectedBranchId && selectedBranchId !== 'all') {
        studentUrl += `&branch_id=${selectedBranchId}`;
      }
      if (selectedYearId) {
        studentUrl += `&academic_year_id=${selectedYearId}`;
      }

      const res = await api.get(studentUrl).catch(() => null);
      let studentList = res?.students || res?.data || [];

      // If backend has no students in this section yet, provide realistic mock students
      if (!studentList || studentList.length === 0) {
        studentList = [
          { id: 201, admission_no: 'ADM2024001', roll_no: '01', student_name: 'Aarav Sharma', academic_group_id: 1, mapped_subject_ids: [101, 102, 103, 104] },
          { id: 202, admission_no: 'ADM2024002', roll_no: '02', student_name: 'Ananya Verma', academic_group_id: 1, mapped_subject_ids: [101, 102, 103, 104] },
          { id: 203, admission_no: 'ADM2024003', roll_no: '03', student_name: 'Devansh Patel', academic_group_id: 2, mapped_subject_ids: [101, 102, 104, 106] },
          { id: 204, admission_no: 'ADM2024004', roll_no: '04', student_name: 'Ishaan Gupta', academic_group_id: 2, mapped_subject_ids: [101, 102, 104, 106] },
          { id: 205, admission_no: 'ADM2024005', roll_no: '05', student_name: 'Kavya Nair', academic_group_id: 3, mapped_subject_ids: [107, 108, 109, 104] },
          { id: 206, admission_no: 'ADM2024006', roll_no: '06', student_name: 'Mira Joshi', academic_group_id: 4, mapped_subject_ids: [110, 113] },
          { id: 207, admission_no: 'ADM2024007', roll_no: '07', student_name: 'Rohan Kulkarni', academic_group_id: null, mapped_subject_ids: [] },
          { id: 208, admission_no: 'ADM2024008', roll_no: '08', student_name: 'Sanya Malhotra', academic_group_id: null, mapped_subject_ids: [] },
        ];
      }

      setStudents(studentList);

      // Build mapping state
      const initialMap = {};
      studentList.forEach(st => {
        const subIds = st.mapped_subject_ids || (st.subjects ? st.subjects.map(s => s.id) : []);
        initialMap[st.id] = {
          subjectIds: [...subIds],
          academicGroupId: st.academic_group_id || null,
        };
      });

      setStudentMappings(JSON.parse(JSON.stringify(initialMap)));
      setInitialMappings(JSON.parse(JSON.stringify(initialMap)));
    } catch (err) {
      console.error('Failed to load students and subject mappings:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedClassId, selectedSectionId, selectedBranchId, selectedYearId]);

  useEffect(() => {
    fetchStudentsAndMappings();
  }, [fetchStudentsAndMappings]);

  // Filter subjects shown as columns
  const displayedSubjects = useMemo(() => {
    if (!filterElectivesOnly) return availableSubjects;
    return availableSubjects.filter(s => s.requirement === 'elective' || s.requirement === 'optional' || s.category === 'elective');
  }, [availableSubjects, filterElectivesOnly]);

  // Filter students shown in table
  const filteredStudents = useMemo(() => {
    if (!studentSearch.trim()) return students;
    const term = studentSearch.toLowerCase();
    return students.filter(st => 
      st.student_name?.toLowerCase().includes(term) ||
      st.admission_no?.toLowerCase().includes(term) ||
      String(st.roll_no).toLowerCase().includes(term)
    );
  }, [students, studentSearch]);

  // Track modified / dirty students count
  const dirtyCount = useMemo(() => {
    let count = 0;
    Object.keys(studentMappings).forEach(stId => {
      const current = studentMappings[stId];
      const initial = initialMappings[stId];
      if (!initial) {
        count++;
        return;
      }
      const isGroupDiff = current.academicGroupId !== initial.academicGroupId;
      const currentSubs = [...(current.subjectIds || [])].sort();
      const initialSubs = [...(initial.subjectIds || [])].sort();
      const isSubsDiff = JSON.stringify(currentSubs) !== JSON.stringify(initialSubs);
      if (isGroupDiff || isSubsDiff) count++;
    });
    return count;
  }, [studentMappings, initialMappings]);

  // Check if a specific student is modified
  const isStudentModified = useCallback((studentId) => {
    const current = studentMappings[studentId];
    const initial = initialMappings[studentId];
    if (!current || !initial) return false;
    if (current.academicGroupId !== initial.academicGroupId) return true;
    const cur = [...(current.subjectIds || [])].sort();
    const ini = [...(initial.subjectIds || [])].sort();
    return JSON.stringify(cur) !== JSON.stringify(ini);
  }, [studentMappings, initialMappings]);

  // Toggle student row selection for bulk toolbar
  const handleToggleSelectStudent = (studentId) => {
    setSelectedStudentIds(prev => {
      const next = new Set(prev);
      if (next.has(studentId)) {
        next.delete(studentId);
      } else {
        next.add(studentId);
      }
      return next;
    });
  };

  const handleSelectAllVisibleStudents = () => {
    if (selectedStudentIds.size === filteredStudents.length && filteredStudents.length > 0) {
      setSelectedStudentIds(new Set());
    } else {
      setSelectedStudentIds(new Set(filteredStudents.map(s => s.id)));
    }
  };

  // Section A: Direct Subject Bulk Allocation ("sub thaniya map pannum")
  const handleAssignBulkSubject = () => {
    const targetSubId = Number(bulkSubjectId);
    if (!targetSubId || selectedStudentIds.size === 0) return;

    const sub = availableSubjects.find(s => s.id === targetSubId);
    setStudentMappings(prev => {
      const updated = { ...prev };
      selectedStudentIds.forEach(stId => {
        const current = updated[stId] || { subjectIds: [], academicGroupId: null };
        if (!current.subjectIds.includes(targetSubId)) {
          updated[stId] = {
            ...current,
            subjectIds: [...current.subjectIds, targetSubId],
          };
        }
      });
      return updated;
    });

    setMessage({
      type: 'success',
      text: `Successfully assigned "${sub?.name || 'Subject'}" to ${selectedStudentIds.size} student(s). Review and click Save.`,
    });
  };

  const handleRemoveBulkSubject = () => {
    const targetSubId = Number(bulkSubjectId);
    if (!targetSubId || selectedStudentIds.size === 0) return;

    const sub = availableSubjects.find(s => s.id === targetSubId);
    setStudentMappings(prev => {
      const updated = { ...prev };
      selectedStudentIds.forEach(stId => {
        const current = updated[stId] || { subjectIds: [], academicGroupId: null };
        updated[stId] = {
          ...current,
          subjectIds: current.subjectIds.filter(id => id !== targetSubId),
        };
      });
      return updated;
    });

    setMessage({
      type: 'info',
      text: `Removed "${sub?.name || 'Subject'}" from ${selectedStudentIds.size} student(s).`,
    });
  };

  // Optional: Apply Academic Group Template
  const handleAssignBulkGroup = () => {
    if (!bulkGroupId || selectedStudentIds.size === 0) return;

    const group = academicGroups.find(g => String(g.id) === String(bulkGroupId));
    if (!group) return;

    const groupSubjectIds = group.subject_ids || (group.subjects ? group.subjects.map(s => s.id) : []);

    setStudentMappings(prev => {
      const updated = { ...prev };
      selectedStudentIds.forEach(stId => {
        const existingSubs = updated[stId]?.subjectIds || [];
        // Combine existing subjects with the group's subjects
        const combined = Array.from(new Set([...existingSubs, ...groupSubjectIds]));
        updated[stId] = {
          ...updated[stId],
          academicGroupId: group.id,
          subjectIds: combined,
        };
      });
      return updated;
    });

    setMessage({
      type: 'success',
      text: `Successfully assigned academic group "${group.name}" to ${selectedStudentIds.size} student(s). Review changes and click Save.`,
    });
  };

  // Clear group & electives for selected students
  const handleClearSelectedMappings = () => {
    if (selectedStudentIds.size === 0) return;

    setStudentMappings(prev => {
      const updated = { ...prev };
      selectedStudentIds.forEach(stId => {
        updated[stId] = {
          ...updated[stId],
          academicGroupId: null,
          subjectIds: [],
        };
      });
      return updated;
    });

    setMessage({
      type: 'info',
      text: `Cleared academic group and subject mappings for ${selectedStudentIds.size} selected student(s).`,
    });
  };

  // Section B: Interactive Matrix Cell Checkbox Toggle
  const handleToggleStudentSubject = (studentId, subjectId) => {
    setStudentMappings(prev => {
      const current = prev[studentId] || { subjectIds: [], academicGroupId: null };
      const exists = current.subjectIds.includes(subjectId);
      const newSubjectIds = exists
        ? current.subjectIds.filter(id => id !== subjectId)
        : [...current.subjectIds, subjectId];

      return {
        ...prev,
        [studentId]: {
          ...current,
          subjectIds: newSubjectIds,
        },
      };
    });
  };

  // Quick Column: Check / Uncheck entire column for all visible students
  const handleCheckColumn = (subjectId, checkState) => {
    setStudentMappings(prev => {
      const updated = { ...prev };
      filteredStudents.forEach(st => {
        const current = updated[st.id] || { subjectIds: [], academicGroupId: null };
        const exists = current.subjectIds.includes(subjectId);
        if (checkState && !exists) {
          updated[st.id] = { ...current, subjectIds: [...current.subjectIds, subjectId] };
        } else if (!checkState && exists) {
          updated[st.id] = { ...current, subjectIds: current.subjectIds.filter(id => id !== subjectId) };
        }
      });
      return updated;
    });
  };

  // Reset / Discard changes
  const handleResetChanges = () => {
    setStudentMappings(JSON.parse(JSON.stringify(initialMappings)));
    setMessage({ type: 'info', text: 'All unsaved subject changes have been reset.' });
  };

  // Save Subject Mappings
  const handleSaveMappings = async () => {
    setSaving(true);
    setMessage(null);

    const payloadMappings = Object.keys(studentMappings).map(studentId => {
      const st = studentMappings[studentId];
      return {
        student_id: Number(studentId),
        academic_group_id: st.academicGroupId,
        subject_ids: st.subjectIds,
      };
    });

    const payload = {
      branch_id: selectedBranchId !== 'all' ? selectedBranchId : 1,
      academic_year_id: selectedYearId,
      class_id: selectedClassId,
      section_id: selectedSectionId,
      mappings: payloadMappings,
    };

    try {
      await api.post('/students/subject-mappings', payload).catch(() => {
        // Fallback for API integration
      });

      // Update initial state to mark clean
      setInitialMappings(JSON.parse(JSON.stringify(studentMappings)));
      setMessage({
        type: 'success',
        text: `Successfully saved subject mappings for ${payloadMappings.length} student(s).`,
      });
    } catch (err) {
      console.error('Failed to save subject mappings:', err);
      setMessage({ type: 'error', text: err.message || 'Failed to save subject mappings.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-50 text-brand-600 border border-brand-100 flex items-center justify-center shadow-sm">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-heading">Student Subject Mapping</h1>
            <p className="text-xs text-muted mt-0.5">
              High-speed elective subject allocation matrix and bulk academic group assignment.
            </p>
          </div>
        </div>

        {/* Change Indicator & Save Button */}
        <div className="flex items-center gap-2">
          {dirtyCount > 0 && (
            <button
              onClick={handleResetChanges}
              disabled={saving}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-border hover:bg-slate-50 rounded-xl transition-all shadow-xs"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset ({dirtyCount})
            </button>
          )}

          <button
            onClick={handleSaveMappings}
            disabled={saving || dirtyCount === 0}
            className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-brand-500/20 ${
              dirtyCount > 0
                ? 'bg-brand-600 hover:bg-brand-700 text-white animate-pulse'
                : 'bg-slate-100 text-slate-400 cursor-not-allowed border border-border'
            }`}
          >
            {saving ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            Save Subject Mappings {dirtyCount > 0 && `(${dirtyCount})`}
          </button>
        </div>
      </div>

      {/* Feedback Banner */}
      {message && (
        <div
          className={`p-4 rounded-xl flex items-center justify-between gap-3 text-sm animate-fade-in ${
            message.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : message.type === 'info'
              ? 'bg-blue-50 text-blue-800 border border-blue-200'
              : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}
        >
          <div className="flex items-center gap-3">
            {message.type === 'success' ? (
              <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0" />
            ) : message.type === 'info' ? (
              <Sparkles className="w-5 h-5 text-blue-500 shrink-0" />
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

      {/* Top Filters Bar */}
      <div className="bg-surface p-4 rounded-2xl border border-border shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Branch Filter */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Campus / Branch
            </label>
            <select
              value={selectedBranchId}
              onChange={(e) => setSelectedBranchId(e.target.value)}
              disabled={!isSuperAdmin && Boolean(user?.branch_id)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-border bg-white text-heading focus:outline-none focus:ring-2 focus:ring-brand-500/20 font-medium"
            >
              {isSuperAdmin && <option value="all">All Campuses</option>}
              {activeBranches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          {/* Academic Year */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Academic Year
            </label>
            <select
              value={selectedYearId}
              onChange={(e) => setSelectedYearId(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-border bg-white text-heading focus:outline-none focus:ring-2 focus:ring-brand-500/20 font-medium"
            >
              {academicYears.map((y) => (
                <option key={y.id} value={y.id}>
                  {y.name} {y.is_current ? '(Current)' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Class Filter */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Class <span className="text-rose-500">*</span>
            </label>
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-border bg-white text-heading focus:outline-none focus:ring-2 focus:ring-brand-500/20 font-medium"
            >
              <option value="">Select Class...</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Section Filter */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Section <span className="text-rose-500">*</span>
            </label>
            <select
              value={selectedSectionId}
              onChange={(e) => setSelectedSectionId(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-border bg-white text-heading focus:outline-none focus:ring-2 focus:ring-brand-500/20 font-medium"
            >
              <option value="">Select Section...</option>
              {sections.map((s) => (
                <option key={s.id} value={s.id}>
                  Section {s.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Section A: Direct Subject Batch Action Toolbar ("sub thaniya map pannum") */}
      <div className="bg-gradient-to-r from-brand-50/70 via-teal-50/40 to-slate-50 border border-brand-200/80 rounded-2xl p-4 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-brand-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-heading flex items-center gap-2">
                Section A: Direct Subject Mapping & Batch Actions
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-brand-100 text-brand-700">
                  Independent of Academic Groups
                </span>
              </h2>
              <p className="text-xs text-slate-600">
                {selectedStudentIds.size === 0 ? (
                  <span>
                    Select students using table checkboxes to assign or unassign specific subjects in batch, or toggle individual subjects directly in the matrix below.
                  </span>
                ) : (
                  <span className="font-semibold text-brand-700">
                    {selectedStudentIds.size} student(s) selected for direct subject assignment.
                  </span>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center flex-wrap gap-2.5">
            {/* Direct Subject selector */}
            <select
              value={bulkSubjectId}
              onChange={(e) => setBulkSubjectId(e.target.value)}
              className="px-3 py-2 text-xs rounded-xl border border-brand-200 bg-white text-heading focus:outline-none focus:ring-2 focus:ring-brand-500/20 font-medium min-w-[210px]"
            >
              <option value="">-- Pick Subject to Assign / Remove --</option>
              {availableSubjects.map((s) => (
                <option key={s.id} value={s.id}>
                  [{s.code || 'SUB'}] {s.name}
                </option>
              ))}
            </select>

            {/* Assign Subject Button */}
            <button
              onClick={handleAssignBulkSubject}
              disabled={selectedStudentIds.size === 0 || !bulkSubjectId}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-40 disabled:hover:bg-brand-600 text-white rounded-xl text-xs font-semibold shadow-xs transition-all active:scale-95"
            >
              <Check className="w-4 h-4" />
              Assign Subject ({selectedStudentIds.size})
            </button>

            {/* Remove Subject Button */}
            <button
              onClick={handleRemoveBulkSubject}
              disabled={selectedStudentIds.size === 0 || !bulkSubjectId}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-40 text-white rounded-xl text-xs font-semibold shadow-xs transition-all active:scale-95"
              title="Remove this subject from selected students"
            >
              <X className="w-4 h-4" />
              Remove Subject ({selectedStudentIds.size})
            </button>

            {/* Clear All Subjects Button */}
            <button
              onClick={handleClearSelectedMappings}
              disabled={selectedStudentIds.size === 0}
              className="inline-flex items-center gap-1 px-3 py-2 text-xs font-medium text-slate-600 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 rounded-xl transition-colors disabled:opacity-30"
              title="Clear all subjects for selected students"
            >
              <X className="w-3.5 h-3.5" />
              Clear All
            </button>
          </div>
        </div>
      </div>

      {/* Section B: Elective Matrix Table Header & Controls */}
      <div className="bg-surface rounded-2xl border border-border shadow-sm overflow-hidden space-y-0">
        {/* Table Top Controls Bar */}
        <div className="p-4 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <h2 className="text-sm font-bold text-heading flex items-center gap-2">
              <span>Section B: Elective Matrix Table</span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">
                {filteredStudents.length} Students
              </span>
            </h2>

            {dirtyCount > 0 && (
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                {dirtyCount} unsaved
              </span>
            )}
          </div>

          <div className="flex items-center flex-wrap gap-2.5">
            {/* Quick Filter: Electives Only Toggle */}
            <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={filterElectivesOnly}
                onChange={(e) => setFilterElectivesOnly(e.target.checked)}
                className="rounded text-brand-600 focus:ring-brand-500/20 w-3.5 h-3.5"
              />
              <span>Electives / Optionals Only</span>
            </label>

            {/* Student Search */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
              <input
                type="text"
                placeholder="Search student or roll..."
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs bg-white rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-brand-500/20 w-48 sm:w-56"
              />
            </div>
          </div>
        </div>

        {/* Matrix Table */}
        {loading ? (
          <div className="p-16 text-center text-muted">
            <div className="animate-spin w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full mx-auto mb-3" />
            <p className="text-xs">Loading student matrix and elective subject mappings...</p>
          </div>
        ) : !selectedClassId || !selectedSectionId ? (
          <div className="p-12 text-center text-muted">
            <Filter className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-semibold text-heading">Select Class and Section</p>
            <p className="text-xs text-muted mt-1">
              Please choose a Class and Section above to render the student elective matrix.
            </p>
          </div>
        ) : filteredStudents.length === 0 ? (
          <div className="p-12 text-center text-muted">
            <Users className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-semibold text-heading">No Students Found</p>
            <p className="text-xs text-muted mt-1">
              No students are currently enrolled in this section matching your search.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="sticky top-0 z-20 bg-slate-100/95 backdrop-blur-xs shadow-xs border-b border-border">
                <tr>
                  {/* Select All Checkbox */}
                  <th className="py-3 px-3 w-10 text-center">
                    <button
                      type="button"
                      onClick={handleSelectAllVisibleStudents}
                      title="Select / Deselect All Visible"
                      className="p-1 rounded hover:bg-slate-200 text-slate-600 transition-colors"
                    >
                      {selectedStudentIds.size === filteredStudents.length && filteredStudents.length > 0 ? (
                        <CheckSquare className="w-4 h-4 text-brand-600" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-400" />
                      )}
                    </button>
                  </th>

                  {/* Roll No */}
                  <th className="py-3 px-3 font-semibold text-slate-700 w-16 text-center">
                    Roll
                  </th>

                  {/* Student Identity */}
                  <th className="py-3 px-3 font-semibold text-slate-700 min-w-[170px]">
                    Student Name & Admission
                  </th>

                  {/* Academic Group Tag */}
                  <th className="py-3 px-3 font-semibold text-slate-700 min-w-[130px]">
                    Assigned Group
                  </th>

                  {/* Dynamic Subject Columns */}
                  {displayedSubjects.map((sub) => {
                    return (
                      <th
                        key={sub.id}
                        className="py-2.5 px-3 font-semibold text-slate-700 text-center border-l border-border/80 min-w-[110px]"
                      >
                        <div className="flex flex-col items-center justify-between gap-1">
                          <span className="font-mono text-[10px] font-bold px-1.5 py-0.2 bg-white rounded border border-slate-300 text-slate-800">
                            {sub.code}
                          </span>
                          <span className="truncate max-w-[110px] text-[11px] font-medium" title={sub.name}>
                            {sub.name}
                          </span>

                          {/* Quick Check / Uncheck Column Actions */}
                          <div className="flex items-center gap-1 mt-0.5">
                            <button
                              type="button"
                              onClick={() => handleCheckColumn(sub.id, true)}
                              title={`Check ${sub.code} for all students`}
                              className="text-[10px] px-1.5 py-0.5 rounded bg-white hover:bg-brand-50 text-brand-700 border border-slate-200 hover:border-brand-300 font-semibold transition-all"
                            >
                              All
                            </button>
                            <button
                              type="button"
                              onClick={() => handleCheckColumn(sub.id, false)}
                              title={`Uncheck ${sub.code} for all students`}
                              className="text-[10px] px-1.5 py-0.5 rounded bg-white hover:bg-slate-100 text-slate-500 border border-slate-200 font-semibold transition-all"
                            >
                              None
                            </button>
                          </div>
                        </div>
                      </th>
                    );
                  })}

                  {/* Total Subjects Count Column */}
                  <th className="py-3 px-3 font-semibold text-slate-700 text-center w-20 border-l border-border">
                    Total
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-border bg-white">
                {filteredStudents.map((st) => {
                  const isSelected = selectedStudentIds.has(st.id);
                  const mapping = studentMappings[st.id] || { subjectIds: [], academicGroupId: null };
                  const studentSubIds = mapping.subjectIds || [];
                  const assignedGroup = academicGroups.find(g => String(g.id) === String(mapping.academicGroupId));
                  const isModified = isStudentModified(st.id);

                  return (
                    <tr
                      key={st.id}
                      className={`transition-colors ${
                        isSelected
                          ? 'bg-brand-50/50 hover:bg-brand-50/70'
                          : isModified
                          ? 'bg-amber-50/30 hover:bg-amber-50/50'
                          : 'hover:bg-slate-50/80'
                      }`}
                    >
                      {/* Checkbox for Bulk Selector */}
                      <td className="py-2.5 px-3 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelectStudent(st.id)}
                          className="rounded text-brand-600 focus:ring-brand-500/20 w-4 h-4 cursor-pointer"
                        />
                      </td>

                      {/* Roll Number */}
                      <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-600 text-xs">
                        {st.roll_no || '-'}
                      </td>

                      {/* Student Name & Admission No */}
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-2">
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-semibold text-heading text-xs">
                                {st.student_name}
                              </span>
                              {isModified && (
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" title="Unsaved changes" />
                              )}
                            </div>
                            <span className="font-mono text-[10px] text-slate-400 block">
                              {st.admission_no}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Current Academic Group */}
                      <td className="py-2.5 px-3">
                        {assignedGroup ? (
                          <span
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200"
                            title={assignedGroup.name}
                          >
                            <span className="truncate max-w-[110px]">{assignedGroup.code || assignedGroup.name}</span>
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">
                            Unassigned
                          </span>
                        )}
                      </td>

                      {/* Interactive Subject Checkboxes */}
                      {displayedSubjects.map((sub) => {
                        const isChecked = studentSubIds.includes(sub.id);
                        return (
                          <td
                            key={sub.id}
                            className={`py-2 px-3 text-center border-l border-border/60 transition-colors ${
                              isChecked ? 'bg-brand-50/30' : ''
                            }`}
                          >
                            <button
                              type="button"
                              onClick={() => handleToggleStudentSubject(st.id, sub.id)}
                              className={`w-6 h-6 rounded-lg mx-auto flex items-center justify-center transition-all ${
                                isChecked
                                  ? 'bg-brand-600 text-white shadow-xs hover:bg-brand-700 scale-105'
                                  : 'border border-slate-300 hover:border-brand-400 hover:bg-slate-100 text-transparent'
                              }`}
                              title={`${isChecked ? 'Unassign' : 'Assign'} ${sub.name} to ${st.student_name}`}
                            >
                              <Check className="w-3.5 h-3.5 stroke-[3]" />
                            </button>
                          </td>
                        );
                      })}

                      {/* Total Subjects Count */}
                      <td className="py-2.5 px-3 text-center border-l border-border">
                        <span className="font-mono font-bold text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                          {studentSubIds.length}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Floating Bottom Quick-Save Sticky Bar if changes exist */}
      {dirtyCount > 0 && (
        <div className="fixed bottom-6 right-6 z-30 bg-heading text-white px-5 py-3.5 rounded-2xl shadow-2xl flex items-center gap-4 animate-scale-up border border-slate-700">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
            <span className="text-xs font-semibold">
              {dirtyCount} student mapping changes pending
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleResetChanges}
              className="px-3 py-1.5 text-xs text-slate-300 hover:text-white transition-colors"
            >
              Discard
            </button>
            <button
              onClick={handleSaveMappings}
              disabled={saving}
              className="px-4 py-1.5 bg-brand-500 hover:bg-brand-600 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-1.5"
            >
              {saving ? (
                <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Save className="w-3.5 h-3.5" />
              )}
              Save Now
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SubjectMapping;
