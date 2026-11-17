import React, { useState, useEffect, useCallback } from 'react';
import {
  UserCheck,
  Search,
  Filter,
  Plus,
  Building2,
  Calendar,
  GraduationCap,
  Layers,
  Phone,
  Eye,
  CheckCircle2,
  AlertCircle,
  FileCheck,
  UserPlus,
  Shield,
  Home,
} from 'lucide-react';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { Modal } from '../../components/common/Modal';
import { Badge } from '../../components/common/Badge';

export const AdmissionList = () => {
  const {
    branches,
    selectedBranch,
    changeBranch,
    academicYears,
    selectedAcademicYear,
    changeAcademicYear,
    classes,
    selectedClassId,
    setSelectedClassId,
    sections,
    selectedSectionId,
    setSelectedSectionId,
  } = useAuth();

  const effectiveBranchId =
    selectedBranch && selectedBranch.id !== 'all' ? String(selectedBranch.id) : '';
  const effectiveAcademicYearId = selectedAcademicYear
    ? String(selectedAcademicYear.id)
    : '';

  // Filters
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [search, setSearch] = useState('');

  // Roster data
  const [admissions, setAdmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState(null);

  // Direct Walk-in Admission Modal State
  const [isWalkinModalOpen, setIsWalkinModalOpen] = useState(false);
  const [walkinClasses, setWalkinClasses] = useState([]);
  const [walkinSections, setWalkinSections] = useState([]);
  const [loadingWalkinLookups, setLoadingWalkinLookups] = useState(false);
  const [walkinForm, setWalkinForm] = useState({
    branch_id: '',
    academic_year_id: '',
    class_id: '',
    section_id: '',
    student_name: '',
    gender: 'male',
    dob: '',
    parent_name: '',
    primary_phone: '',
    address_street: '',
    city: '',
    admission_date: new Date().toISOString().slice(0, 10),
    admission_category: 'general',
    roll_no: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
  });
  const [submittingWalkin, setSubmittingWalkin] = useState(false);

  // View Student Card Modal State
  const [viewStudent, setViewStudent] = useState(null);

  // Open Direct Walk-in Modal with proper initial cascade
  const handleOpenWalkin = async () => {
    const initialBranchId =
      effectiveBranchId || (branches.length > 0 ? String(branches[0].id) : '1');
    const initialYearId =
      effectiveAcademicYearId ||
      (academicYears.length > 0 ? String(academicYears[0].id) : '1');

    setLoadingWalkinLookups(true);
    let initialClassId = '';
    let initialSectionId = '';
    let cList = [];
    let sList = [];

    try {
      if (initialBranchId) {
        const cRes = await api.get(`/academics/classes?branch_id=${initialBranchId}`);
        cList = cRes.classes || cRes.data || [];
        setWalkinClasses(cList);

        if (cList.length > 0) {
          initialClassId = String(cList[0].id);
          const sRes = await api.get(
            `/academics/sections?branch_id=${initialBranchId}&class_id=${initialClassId}`
          );
          sList = sRes.sections || sRes.data || [];
          setWalkinSections(sList);
          if (sList.length > 0) {
            initialSectionId = String(sList[0].id);
          }
        } else {
          setWalkinSections([]);
        }
      }
    } catch (err) {
      console.error('Error preloading walkin lookups:', err);
    } finally {
      setLoadingWalkinLookups(false);
    }

    setWalkinForm({
      branch_id: initialBranchId,
      academic_year_id: initialYearId,
      class_id: initialClassId,
      section_id: initialSectionId,
      student_name: '',
      gender: 'male',
      dob: '',
      parent_name: '',
      primary_phone: '',
      address_street: '',
      city: '',
      admission_date: new Date().toISOString().slice(0, 10),
      admission_category: 'general',
      roll_no: '',
      emergency_contact_name: '',
      emergency_contact_phone: '',
    });
    setIsWalkinModalOpen(true);
  };

  // When branch changes inside Walk-in modal -> reload its classes & first class's sections
  const handleWalkinBranchChange = async (newBranchId) => {
    setWalkinForm((prev) => ({
      ...prev,
      branch_id: newBranchId,
      class_id: '',
      section_id: '',
    }));
    setWalkinClasses([]);
    setWalkinSections([]);
    if (!newBranchId) return;

    setLoadingWalkinLookups(true);
    try {
      const cRes = await api.get(`/academics/classes?branch_id=${newBranchId}`);
      const cList = cRes.classes || cRes.data || [];
      setWalkinClasses(cList);

      if (cList.length > 0) {
        const firstClassId = String(cList[0].id);
        const sRes = await api.get(
          `/academics/sections?branch_id=${newBranchId}&class_id=${firstClassId}`
        );
        const sList = sRes.sections || sRes.data || [];
        setWalkinSections(sList);
        setWalkinForm((prev) => ({
          ...prev,
          branch_id: newBranchId,
          class_id: firstClassId,
          section_id: sList.length > 0 ? String(sList[0].id) : '',
        }));
      }
    } catch (err) {
      console.error('Failed to update walkin classes on branch change:', err);
    } finally {
      setLoadingWalkinLookups(false);
    }
  };

  // When class changes inside Walk-in modal -> reload its sections
  const handleWalkinClassChange = async (newClassId) => {
    setWalkinForm((prev) => ({
      ...prev,
      class_id: newClassId,
      section_id: '',
    }));
    setWalkinSections([]);
    if (!newClassId || !walkinForm.branch_id) return;

    setLoadingWalkinLookups(true);
    try {
      const sRes = await api.get(
        `/academics/sections?branch_id=${walkinForm.branch_id}&class_id=${newClassId}`
      );
      const sList = sRes.sections || sRes.data || [];
      setWalkinSections(sList);
      if (sList.length > 0) {
        setWalkinForm((prev) => ({
          ...prev,
          class_id: newClassId,
          section_id: String(sList[0].id),
        }));
      }
    } catch (err) {
      console.error('Failed to update walkin sections on class change:', err);
    } finally {
      setLoadingWalkinLookups(false);
    }
  };

  // Fetch confirmed students roster
  const fetchAdmissions = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (effectiveBranchId) params.append('branch_id', effectiveBranchId);
      if (effectiveAcademicYearId) params.append('academic_year_id', effectiveAcademicYearId);
      if (selectedClassId) params.append('class_id', selectedClassId);
      if (selectedSectionId) params.append('section_id', selectedSectionId);
      if (selectedCategory !== 'all') params.append('admission_category', selectedCategory);
      if (search) params.append('search', search);

      const res = await api.get(`/admissions/students?${params.toString()}`);
      setAdmissions(res.admissions || res.students || res.data || []);
    } catch (err) {
      console.error('Failed to fetch admitted students:', err);
      setAdmissions([]);
    } finally {
      setLoading(false);
    }
  }, [
    effectiveBranchId,
    effectiveAcademicYearId,
    selectedClassId,
    selectedSectionId,
    selectedCategory,
    search,
  ]);

  useEffect(() => {
    fetchAdmissions();
  }, [fetchAdmissions]);

  // Handle direct walk-in submission
  const handleSubmitWalkin = async (e) => {
    e.preventDefault();
    setSubmittingWalkin(true);
    setMessage(null);

    try {
      const payload = {
        ...walkinForm,
        branch_id: Number(walkinForm.branch_id),
        academic_year_id: Number(walkinForm.academic_year_id),
        class_id: Number(walkinForm.class_id),
        section_id: Number(walkinForm.section_id),
      };

      const res = await api.post('/admissions/students/direct', payload);
      setMessage({
        type: 'success',
        text: `Student enrolled successfully! Admission No: ${
          res.admission_no || res.admission?.admission_no || 'generated'
        }.`,
      });
      setIsWalkinModalOpen(false);
      fetchAdmissions();
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Direct admission failed.' });
    } finally {
      setSubmittingWalkin(false);
    }
  };

  const getCategoryBadge = (category) => {
    switch (category) {
      case 'rte':
        return <Badge variant="upcoming">RTE</Badge>;
      case 'sibling':
        return <Badge variant="primary">Sibling</Badge>;
      case 'staff_child':
        return <Badge variant="active">Staff Child</Badge>;
      case 'scholarship':
        return <Badge variant="primary">Scholarship</Badge>;
      default:
        return <Badge variant="default">General</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-border">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
              <UserCheck className="w-5 h-5" />
            </span>
            <h1 className="text-2xl font-bold text-heading">Confirmed Admissions</h1>
          </div>
          <p className="text-sm text-muted mt-1">
            Roster of formally enrolled students, section allocations, and direct walk-in enrollments.
          </p>
        </div>

        <button
          onClick={handleOpenWalkin}
          className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold shadow-sm transition-all"
        >
          <UserPlus className="w-4 h-4" />
          <span>Direct Walk-in Admission</span>
        </button>
      </div>

      {message && (
        <div
          className={`flex items-center gap-3 p-4 rounded-xl border text-sm font-medium ${
            message.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-rose-50 text-rose-800 border-rose-200'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {/* Filter Toolbar */}
      <div className="bg-white border border-border rounded-2xl p-4 shadow-card flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 text-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by student, admission no, parent, phone..."
            className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 border border-border rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
          />
        </div>

        {/* Branch */}
        <div className="w-44">
          <select
            value={effectiveBranchId || (selectedBranch?.id === 'all' ? 'all' : '')}
            onChange={(e) => changeBranch(e.target.value)}
            className="w-full px-3 py-2 text-sm bg-slate-50 border border-border rounded-xl outline-none cursor-pointer"
          >
            <option value="all">All Campuses</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>

        {/* Academic Year */}
        <div className="w-40">
          <select
            value={effectiveAcademicYearId}
            onChange={(e) => {
              const yr = academicYears.find((y) => String(y.id) === e.target.value);
              changeAcademicYear(yr || null);
            }}
            className="w-full px-3 py-2 text-sm bg-slate-50 border border-border rounded-xl outline-none cursor-pointer"
          >
            {academicYears.map((y) => (
              <option key={y.id} value={y.id}>
                {y.name || y.code}
              </option>
            ))}
          </select>
        </div>

        {/* Class */}
        <div className="w-36">
          <select
            value={selectedClassId}
            onChange={(e) => setSelectedClassId(e.target.value)}
            className="w-full px-3 py-2 text-sm bg-slate-50 border border-border rounded-xl outline-none cursor-pointer"
          >
            <option value="">All Classes</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* Section (if class chosen) */}
        {selectedClassId && (
          <div className="w-32">
            <select
              value={selectedSectionId}
              onChange={(e) => setSelectedSectionId(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-border rounded-xl outline-none cursor-pointer"
            >
              <option value="">All Secs</option>
              {sections.map((sec) => (
                <option key={sec.id} value={sec.id}>
                  Section {sec.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Category */}
        <div className="w-36">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full px-3 py-2 text-sm bg-slate-50 border border-border rounded-xl outline-none cursor-pointer"
          >
            <option value="all">All Categories</option>
            <option value="general">General</option>
            <option value="rte">RTE</option>
            <option value="sibling">Sibling</option>
            <option value="staff_child">Staff Child</option>
            <option value="scholarship">Scholarship</option>
          </select>
        </div>
      </div>

      {/* Roster Table */}
      <div className="bg-white border border-border rounded-2xl shadow-card overflow-hidden">
        <table className="w-full text-left text-sm border-collapse">
          <thead>
            <tr className="bg-slate-50/75 border-b border-border text-xs uppercase font-semibold text-slate-500">
              <th className="py-3.5 px-5">Admission No & Date</th>
              <th className="py-3.5 px-5">Student / Roll</th>
              <th className="py-3.5 px-5">Class & Section</th>
              <th className="py-3.5 px-5">Parent & Contact</th>
              <th className="py-3.5 px-5 text-center">Category</th>
              <th className="py-3.5 px-5 text-center">Enrollment Status</th>
              <th className="py-3.5 px-5 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading ? (
              <tr>
                <td colSpan="7" className="py-12 text-center text-muted">
                  Loading admitted students roster...
                </td>
              </tr>
            ) : admissions.length === 0 ? (
              <tr>
                <td colSpan="7" className="py-12 text-center text-muted">
                  No confirmed admissions match the selected criteria.
                </td>
              </tr>
            ) : (
              admissions.map((adm) => (
                <tr key={adm.id} className="hover:bg-slate-50/50 transition-colors">
                  {/* Admission No */}
                  <td className="py-4 px-5">
                    <div className="font-mono font-bold text-emerald-700">{adm.admission_no}</div>
                    <div className="text-[11px] text-muted">
                      {new Date(adm.admission_date || adm.created_at).toLocaleDateString('en-GB')}
                    </div>
                  </td>

                  {/* Student */}
                  <td className="py-4 px-5">
                    <div className="font-semibold text-heading">{adm.student_name}</div>
                    <div className="text-xs text-muted flex items-center gap-1.5 mt-0.5">
                      <span className="capitalize">{adm.gender}</span>
                      {adm.roll_no && (
                        <>
                          <span className="text-slate-300">•</span>
                          <span className="font-mono">Roll: {adm.roll_no}</span>
                        </>
                      )}
                    </div>
                  </td>

                  {/* Class & Section */}
                  <td className="py-4 px-5">
                    <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                      <GraduationCap className="w-3.5 h-3.5 text-emerald-600" />
                      <span>{adm.class_name || `Class ID: ${adm.class_id}`}</span>
                    </div>
                    <div className="text-xs text-muted flex items-center gap-1 mt-0.5">
                      <Layers className="w-3 h-3 text-slate-400" />
                      <span>Section {adm.section_name || adm.section_id}</span>
                    </div>
                  </td>

                  {/* Parent */}
                  <td className="py-4 px-5">
                    <div className="font-medium text-slate-800">{adm.parent_name}</div>
                    <div className="text-xs text-muted flex items-center gap-1 mt-0.5">
                      <Phone className="w-3 h-3 text-slate-400" />
                      <span>{adm.primary_phone}</span>
                    </div>
                  </td>

                  {/* Category */}
                  <td className="py-4 px-5 text-center">{getCategoryBadge(adm.admission_category)}</td>

                  {/* Enrollment Status */}
                  <td className="py-4 px-5 text-center">
                    <Badge variant={adm.enrollment_status === 'active' ? 'active' : 'inactive'}>
                      {adm.enrollment_status || 'active'}
                    </Badge>
                  </td>

                  {/* Actions */}
                  <td className="py-4 px-5 text-right">
                    <button
                      onClick={() => setViewStudent(adm)}
                      className="p-1.5 text-muted hover:text-emerald-600 rounded-lg hover:bg-emerald-50 transition-colors"
                      title="View Student Profile"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Direct Walk-in Admission Modal */}
      <Modal
        isOpen={isWalkinModalOpen}
        onClose={() => setIsWalkinModalOpen(false)}
        title="Direct Walk-in Student Admission"
        maxWidth="max-w-2xl"
      >
        <form onSubmit={handleSubmitWalkin} className="space-y-4">
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800">
            Immediate counter enrollment: Allocates sequential admission number and class section directly.
          </div>

          {/* Academic & Class Cascade: Year -> Branch -> Class -> Section */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Academic Year <span className="text-rose-500">*</span>
              </label>
              <select
                required
                value={walkinForm.academic_year_id ? String(walkinForm.academic_year_id) : ''}
                onChange={(e) => setWalkinForm({ ...walkinForm, academic_year_id: e.target.value })}
                className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-border rounded-lg outline-none"
              >
                {academicYears.map((y) => (
                  <option key={y.id} value={String(y.id)}>
                    {y.name || y.code}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Branch / Campus <span className="text-rose-500">*</span>
              </label>
              <select
                required
                value={walkinForm.branch_id ? String(walkinForm.branch_id) : ''}
                onChange={(e) => handleWalkinBranchChange(e.target.value)}
                className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-border rounded-lg outline-none"
              >
                <option value="">Select Branch</option>
                {branches.map((b) => (
                  <option key={b.id} value={String(b.id)}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Class <span className="text-rose-500">*</span>
              </label>
              <select
                required
                value={walkinForm.class_id ? String(walkinForm.class_id) : ''}
                onChange={(e) => handleWalkinClassChange(e.target.value)}
                disabled={!walkinForm.branch_id || loadingWalkinLookups}
                className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-border rounded-lg outline-none disabled:bg-slate-100"
              >
                {loadingWalkinLookups ? (
                  <option value="">Loading classes...</option>
                ) : walkinClasses.length === 0 ? (
                  <option value="">No classes</option>
                ) : (
                  walkinClasses.map((c) => (
                    <option key={c.id} value={String(c.id)}>
                      {c.name}
                    </option>
                  ))
                )}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Section <span className="text-rose-500">*</span>
              </label>
              <select
                required
                value={walkinForm.section_id ? String(walkinForm.section_id) : ''}
                onChange={(e) => setWalkinForm({ ...walkinForm, section_id: e.target.value })}
                disabled={!walkinForm.class_id || loadingWalkinLookups}
                className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-border rounded-lg outline-none disabled:bg-slate-100"
              >
                {loadingWalkinLookups ? (
                  <option value="">Loading sections...</option>
                ) : walkinSections.length === 0 ? (
                  <option value="">No sections</option>
                ) : (
                  walkinSections.map((s) => (
                    <option key={s.id} value={String(s.id)}>
                      Sec {s.name} (Cap {s.capacity || 40})
                    </option>
                  ))
                )}
              </select>
            </div>
          </div>

          {/* Student Info */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Student Full Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={walkinForm.student_name}
                onChange={(e) => setWalkinForm({ ...walkinForm, student_name: e.target.value })}
                placeholder="Student name"
                className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-border rounded-lg outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Gender <span className="text-rose-500">*</span>
              </label>
              <select
                value={walkinForm.gender}
                onChange={(e) => setWalkinForm({ ...walkinForm, gender: e.target.value })}
                className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-border rounded-lg outline-none"
              >
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Date of Birth <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                required
                value={walkinForm.dob}
                onChange={(e) => setWalkinForm({ ...walkinForm, dob: e.target.value })}
                className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-border rounded-lg outline-none"
              />
            </div>
          </div>

          {/* Parent Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Parent / Guardian Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={walkinForm.parent_name}
                onChange={(e) => setWalkinForm({ ...walkinForm, parent_name: e.target.value })}
                placeholder="Parent full name"
                className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-border rounded-lg outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Primary Phone <span className="text-rose-500">*</span>
              </label>
              <input
                type="tel"
                required
                value={walkinForm.primary_phone}
                onChange={(e) => setWalkinForm({ ...walkinForm, primary_phone: e.target.value })}
                placeholder="Mobile number"
                className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-border rounded-lg outline-none"
              />
            </div>
          </div>

          {/* Address & City */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Residential Street Address
              </label>
              <input
                type="text"
                value={walkinForm.address_street}
                onChange={(e) => setWalkinForm({ ...walkinForm, address_street: e.target.value })}
                placeholder="House no, street"
                className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-border rounded-lg outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">City</label>
              <input
                type="text"
                value={walkinForm.city}
                onChange={(e) => setWalkinForm({ ...walkinForm, city: e.target.value })}
                placeholder="e.g. Pune"
                className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-border rounded-lg outline-none"
              />
            </div>
          </div>

          {/* Admission Specifics */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Admission Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                required
                value={walkinForm.admission_date}
                onChange={(e) => setWalkinForm({ ...walkinForm, admission_date: e.target.value })}
                className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-border rounded-lg outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Category</label>
              <select
                value={walkinForm.admission_category}
                onChange={(e) =>
                  setWalkinForm({ ...walkinForm, admission_category: e.target.value })
                }
                className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-border rounded-lg outline-none"
              >
                <option value="general">General</option>
                <option value="rte">RTE</option>
                <option value="sibling">Sibling</option>
                <option value="staff_child">Staff Child</option>
                <option value="scholarship">Scholarship</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Roll No (Opt)</label>
              <input
                type="text"
                value={walkinForm.roll_no}
                onChange={(e) => setWalkinForm({ ...walkinForm, roll_no: e.target.value })}
                placeholder="e.g. 101"
                className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-border rounded-lg outline-none"
              />
            </div>
          </div>

          <div className="pt-4 flex justify-end gap-3 border-t border-border">
            <button
              type="button"
              onClick={() => setIsWalkinModalOpen(false)}
              className="px-4 py-2 border border-border rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submittingWalkin || !walkinForm.section_id}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold shadow-sm disabled:opacity-50"
            >
              {submittingWalkin ? 'Enrolling...' : 'Confirm Admission'}
            </button>
          </div>
        </form>
      </Modal>

      {/* View Student Profile Modal */}
      <Modal
        isOpen={Boolean(viewStudent)}
        onClose={() => setViewStudent(null)}
        title={viewStudent ? `Student Profile: ${viewStudent.student_name}` : 'Student Profile'}
        maxWidth="max-w-md"
      >
        {viewStudent && (
          <div className="space-y-4 text-xs">
            <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200 text-center">
              <span className="text-[11px] text-emerald-800 font-semibold block uppercase">
                Official Admission Number
              </span>
              <span className="font-mono text-xl font-bold text-emerald-950 mt-1 block">
                {viewStudent.admission_no}
              </span>
              <span className="inline-block mt-2 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-600 text-white">
                Active Enrollment
              </span>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="text-muted">Student Name:</span>
                <span className="font-semibold text-heading">{viewStudent.student_name}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="text-muted">Class & Section:</span>
                <span className="font-semibold text-heading">
                  {viewStudent.class_name || viewStudent.class_id} — Sec{' '}
                  {viewStudent.section_name || viewStudent.section_id}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="text-muted">Gender / DOB:</span>
                <span className="font-semibold text-heading capitalize">
                  {viewStudent.gender} (
                  {viewStudent.dob ? String(viewStudent.dob).slice(0, 10) : '—'})
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="text-muted">Parent / Guardian:</span>
                <span className="font-semibold text-heading">{viewStudent.parent_name}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="text-muted">Contact Phone:</span>
                <span className="font-semibold text-heading">{viewStudent.primary_phone}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="text-muted">Category:</span>
                <span className="font-semibold text-heading capitalize">
                  {viewStudent.admission_category || 'general'}
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-muted">Enrollment Date:</span>
                <span className="font-semibold text-heading">
                  {new Date(viewStudent.admission_date || viewStudent.created_at).toLocaleDateString(
                    'en-GB'
                  )}
                </span>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
