import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  LifeBuoy,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertTriangle,
  AlertCircle,
  XCircle,
  FileText,
  ChevronRight,
  ShieldAlert,
  Bus,
  GraduationCap,
  CreditCard,
  Building2,
  Utensils,
  HelpCircle,
  RefreshCw,
  X,
  Send,
  Calendar,
  UserCheck,
  Check,
  User,
  Users,
  Briefcase,
  ArrowUpRight,
  ShieldCheck,
  Download,
  Eye,
  UserPlus,
  ArrowRightLeft,
  ChevronDown,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api/client';

// Category icon & meta helper
const getCategoryMeta = (code = '') => {
  const upper = String(code).toUpperCase();
  if (upper.includes('ACADEMIC')) {
    return { icon: GraduationCap, label: 'Academic', color: 'text-indigo-600 bg-indigo-50 border-indigo-200' };
  }
  if (upper.includes('TRANSPORT')) {
    return { icon: Bus, label: 'Transport', color: 'text-amber-600 bg-amber-50 border-amber-200' };
  }
  if (upper.includes('FEE')) {
    return { icon: CreditCard, label: 'Fee & Accounts', color: 'text-emerald-600 bg-emerald-50 border-emerald-200' };
  }
  if (upper.includes('FACILITIES') || upper.includes('INFRA')) {
    return { icon: Building2, label: 'Facilities', color: 'text-cyan-600 bg-cyan-50 border-cyan-200' };
  }
  if (upper.includes('CANTEEN') || upper.includes('FOOD')) {
    return { icon: Utensils, label: 'Canteen & Food', color: 'text-orange-600 bg-orange-50 border-orange-200' };
  }
  if (upper.includes('SAFETY') || upper.includes('SECURITY')) {
    return { icon: ShieldAlert, label: 'Safety & Security', color: 'text-rose-600 bg-rose-50 border-rose-200' };
  }
  if (upper.includes('STAFF') || upper.includes('HR')) {
    return { icon: Briefcase, label: 'Workplace & HR', color: 'text-purple-600 bg-purple-50 border-purple-200' };
  }
  return { icon: HelpCircle, label: 'General Inquiry', color: 'text-slate-600 bg-slate-50 border-slate-200' };
};

export const ConcernManagement = () => {
  const { user, selectedBranch, selectedAcademicYear } = useAuth();

  // Data States
  const [concerns, setConcerns] = useState([]);
  const [categories, setCategories] = useState([]);
  const [staffMembers, setStaffMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters
  const [typeFilter, setTypeFilter] = useState('all'); // 'all', 'student', 'staff'
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [onlyOverdue, setOnlyOverdue] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Modals & Active Ticket
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [reassignModalOpen, setReassignModalOpen] = useState(false);
  const [resolveModalOpen, setResolveModalOpen] = useState(false);
  const [escalateModalOpen, setEscalateModalOpen] = useState(false);

  // Reassign Form State
  const [selectedStaffId, setSelectedStaffId] = useState('');
  const [reassignNotes, setReassignNotes] = useState('');
  const [submittingReassign, setSubmittingReassign] = useState(false);

  // Resolve Form State
  const [resolutionStatus, setResolutionStatus] = useState('resolved');
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [submittingResolve, setSubmittingResolve] = useState(false);

  // Escalate Form State
  const [escalationReason, setEscalationReason] = useState('');
  const [submittingEscalate, setSubmittingEscalate] = useState(false);

  // Fetch all tickets, categories, and staff members
  const fetchAllData = useCallback(async (isSilent = false) => {
    try {
      if (!isSilent) setLoading(true);
      else setRefreshing(true);

      // 1. Categories
      try {
        const catRes = await api.get('/concerns/categories');
        const catList = catRes?.categories || catRes?.data || (Array.isArray(catRes) ? catRes : []);
        setCategories(catList);
      } catch (e) {
        console.warn('Categories error:', e);
      }

      // 2. Staff directory for reassignment
      try {
        const staffRes = await api.get('/staff?limit=150');
        if (staffRes?.data && Array.isArray(staffRes.data)) {
          setStaffMembers(staffRes.data);
        } else if (Array.isArray(staffRes)) {
          setStaffMembers(staffRes);
        }
      } catch (e) {
        console.warn('Staff fetch error:', e);
      }

      // 3. Concerns list (scoped by active Topbar Branch & Academic Year)
      const params = new URLSearchParams();
      if (selectedBranch?.id && selectedBranch.id !== 'all') {
        params.set('branch_id', selectedBranch.id);
      }
      if (selectedAcademicYear?.id) {
        params.set('academic_year_id', selectedAcademicYear.id);
      }
      const q = params.toString();
      const res = await api.get(`/concerns${q ? `?${q}` : ''}`);
      const tktList = res?.concerns || res?.data || (Array.isArray(res) ? res : []);
      setConcerns(tktList);
    } catch (err) {
      console.error('Failed to load concerns desk:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedBranch?.id, selectedAcademicYear?.id]);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  // Executive Metric Calculations
  const stats = useMemo(() => {
    const total = concerns.length;
    const open = concerns.filter((c) => c.status === 'open').length;
    const inProgress = concerns.filter((c) => c.status === 'in_progress').length;
    const resolved = concerns.filter((c) => c.status === 'resolved' || c.status === 'closed').length;
    const overdueOrEscalated = concerns.filter(
      (c) => (c.is_overdue || c.is_escalated) && c.status !== 'resolved' && c.status !== 'closed'
    ).length;
    const studentCount = concerns.filter((c) => c.concern_type === 'student').length;
    const staffCount = concerns.filter((c) => c.concern_type === 'staff').length;

    return { total, open, inProgress, resolved, overdueOrEscalated, studentCount, staffCount };
  }, [concerns]);

  // Filtered Concerns List
  const filteredConcerns = useMemo(() => {
    return concerns.filter((c) => {
      // Type filter
      if (typeFilter !== 'all' && c.concern_type !== typeFilter) return false;

      // Status filter
      if (statusFilter !== 'all') {
        if (statusFilter === 'resolved' && c.status !== 'resolved' && c.status !== 'closed') return false;
        if (statusFilter !== 'resolved' && c.status !== statusFilter) return false;
      }

      // Priority filter
      if (priorityFilter !== 'all' && c.priority !== priorityFilter) return false;

      // Category filter
      if (categoryFilter !== 'all') {
        if (String(c.category_id) !== String(categoryFilter) && String(c.category_code) !== String(categoryFilter)) {
          return false;
        }
      }

      // Overdue or Escalated toggle
      if (onlyOverdue && !c.is_overdue && !c.is_escalated) return false;

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesNo = c.ticket_no?.toLowerCase().includes(q);
        const matchesTitle = c.title?.toLowerCase().includes(q);
        const matchesDesc = c.description?.toLowerCase().includes(q);
        const matchesStudent = c.student_name?.toLowerCase().includes(q);
        const matchesStaff = c.staff_name?.toLowerCase().includes(q) || c.assigned_staff_name?.toLowerCase().includes(q);
        const matchesCat = c.category_name?.toLowerCase().includes(q);
        if (!matchesNo && !matchesTitle && !matchesDesc && !matchesStudent && !matchesStaff && !matchesCat) {
          return false;
        }
      }

      return true;
    });
  }, [concerns, typeFilter, statusFilter, priorityFilter, categoryFilter, onlyOverdue, searchQuery]);

  // Handle Reassignment
  const handleReassignSubmit = async (e) => {
    e.preventDefault();
    if (!selectedTicket || !selectedStaffId) {
      alert('Please select a staff member to assign.');
      return;
    }

    try {
      setSubmittingReassign(true);
      const res = await api.put(`/concerns/${selectedTicket.id}/assign`, {
        assigned_to_staff_id: selectedStaffId,
        notes: reassignNotes.trim(),
      });
      if (res?.success || res?.message) {
        setReassignModalOpen(false);
        setSelectedStaffId('');
        setReassignNotes('');
        setSelectedTicket(null);
        fetchAllData(true);
      } else {
        alert(res?.message || 'Failed to reassign ticket.');
      }
    } catch (err) {
      alert(err?.message || 'Error reassigning ticket.');
    } finally {
      setSubmittingReassign(false);
    }
  };

  // Handle Resolution
  const handleResolveSubmit = async (e) => {
    e.preventDefault();
    if (!selectedTicket) return;
    if (!resolutionNotes.trim()) {
      alert('Please input official resolution notes.');
      return;
    }

    try {
      setSubmittingResolve(true);
      const res = await api.put(`/concerns/${selectedTicket.id}/status`, {
        status: resolutionStatus,
        resolution_notes: resolutionNotes.trim(),
      });
      if (res?.success || res?.message || res?.status) {
        setResolveModalOpen(false);
        setResolutionNotes('');
        setSelectedTicket(null);
        fetchAllData(true);
      } else {
        alert(res?.message || 'Failed to update resolution.');
      }
    } catch (err) {
      alert(err?.message || 'Error updating status.');
    } finally {
      setSubmittingResolve(false);
    }
  };

  // Handle Escalation to Principal
  const handleEscalateSubmit = async (e) => {
    e.preventDefault();
    if (!selectedTicket) return;
    if (!escalationReason.trim()) {
      alert('Please state a reason for escalating to the Principal.');
      return;
    }

    try {
      setSubmittingEscalate(true);
      const res = await api.put(`/concerns/${selectedTicket.id}/escalate`, {
        escalation_reason: escalationReason.trim(),
      });
      if (res?.success || res?.message) {
        setEscalateModalOpen(false);
        setEscalationReason('');
        setSelectedTicket(null);
        fetchAllData(true);
      } else {
        alert(res?.message || 'Failed to escalate ticket.');
      }
    } catch (err) {
      alert(err?.message || 'Error escalating ticket.');
    } finally {
      setSubmittingEscalate(false);
    }
  };

  // Render Status Badge
  const renderStatusBadge = (status) => {
    switch (status) {
      case 'resolved':
      case 'closed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5" /> Resolved
          </span>
        );
      case 'in_progress':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
            <Clock className="w-3.5 h-3.5 animate-spin" /> In Progress
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200">
            <XCircle className="w-3.5 h-3.5" /> Closed
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-sky-100 text-sky-800 border border-sky-200">
            <AlertCircle className="w-3.5 h-3.5" /> Open
          </span>
        );
    }
  };

  // Render Priority Badge
  const renderPriorityBadge = (priority, isOverdue) => {
    if (isOverdue) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-black bg-rose-600 text-white animate-pulse shadow-xs">
          <AlertTriangle className="w-3 h-3" /> SLA OVERDUE
        </span>
      );
    }
    switch (priority) {
      case 'urgent':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-extrabold bg-rose-100 text-rose-700 border border-rose-200">
            <ShieldAlert className="w-3 h-3 text-rose-600" /> Urgent (12h)
          </span>
        );
      case 'high':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-orange-100 text-orange-700 border border-orange-200">
            High (24h)
          </span>
        );
      case 'medium':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
            Medium (48h)
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-50 text-slate-500 border border-slate-200">
            Low (72h)
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 font-sans">


      {/* EXECUTIVE METRIC SUMMARY CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700 shrink-0">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Tickets</p>
            <h3 className="text-2xl font-black text-slate-800">{stats.total}</h3>
            <p className="text-[10px] text-slate-400 font-medium mt-0.5">
              {stats.studentCount} Students • {stats.staffCount} Staff
            </p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-sky-50 flex items-center justify-center text-sky-600 shrink-0">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Open / Triage</p>
            <h3 className="text-2xl font-black text-sky-700">{stats.open}</h3>
            <p className="text-[10px] text-sky-600 font-semibold mt-0.5">Awaiting Action</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600 shrink-0">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">In Progress</p>
            <h3 className="text-2xl font-black text-amber-600">{stats.inProgress}</h3>
            <p className="text-[10px] text-amber-600 font-medium mt-0.5">Under Investigation</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Resolved</p>
            <h3 className="text-2xl font-black text-emerald-600">{stats.resolved}</h3>
            <p className="text-[10px] text-emerald-600 font-medium mt-0.5">Closed Successfully</p>
          </div>
        </div>

        <div className="col-span-2 lg:col-span-1 bg-white rounded-2xl p-4 sm:p-5 border border-rose-200/80 shadow-xs flex items-center gap-4 bg-rose-50/20">
          <div className="w-12 h-12 rounded-xl bg-rose-100 flex items-center justify-center text-rose-700 shrink-0">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-rose-500 uppercase tracking-wider">Overdue / Escalated</p>
            <h3 className="text-2xl font-black text-rose-700">{stats.overdueOrEscalated}</h3>
            <p className="text-[10px] text-rose-600 font-bold mt-0.5">High Attention</p>
          </div>
        </div>
      </div>

      {/* FILTER CONTROLS BAR */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-4">
        {/* Top Filter Row: Type Toggle & Overdue Toggle */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          {/* Type Toggle */}
          <div className="inline-flex p-1 bg-slate-100 rounded-xl overflow-x-auto">
            {[
              { id: 'all', label: `All Tickets (${concerns.length})` },
              { id: 'student', label: `Student Concerns (${stats.studentCount})` },
              { id: 'staff', label: `Staff Requests (${stats.staffCount})` },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setTypeFilter(tab.id)}
                className={`px-4 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
                  typeFilter === tab.id
                    ? 'bg-white text-indigo-700 shadow-xs font-extrabold'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Quick Overdue / Escalated Only Switch */}
          <label className="inline-flex items-center gap-2.5 cursor-pointer text-xs font-bold text-slate-700 select-none">
            <input
              type="checkbox"
              checked={onlyOverdue}
              onChange={(e) => setOnlyOverdue(e.target.checked)}
              className="w-4 h-4 text-rose-600 rounded-md border-slate-300 focus:ring-rose-500"
            />
            <span className={onlyOverdue ? 'text-rose-700 font-extrabold' : ''}>
              Show Only Overdue SLA & Escalated Tickets
            </span>
          </label>
        </div>

        {/* Bottom Filter Row: Search, Category, Priority, Status */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2 border-t border-slate-100">
          {/* Search */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by ticket #, name, title..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>

          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 bg-white"
          >
            <option value="all">All Departments & Categories</option>
            {categories.map((cat) => (
              <option key={cat.id || cat.code} value={cat.id || cat.code}>
                {cat.name} ({cat.sla_hours}h SLA)
              </option>
            ))}
          </select>

          {/* Priority Filter */}
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 bg-white"
          >
            <option value="all">All Priority Levels</option>
            <option value="urgent">Urgent (12h SLA)</option>
            <option value="high">High (24h SLA)</option>
            <option value="medium">Medium (48h SLA)</option>
            <option value="low">Low (72h SLA)</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 bg-white"
          >
            <option value="all">All Statuses</option>
            <option value="open">Open / Triage</option>
            <option value="in_progress">In Progress</option>
            <option value="resolved">Resolved & Closed</option>
            <option value="rejected">Rejected / Dropped</option>
          </select>
        </div>
      </div>

      {/* TICKETS TABLE VIEW */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-16 text-center space-y-3">
            <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin mx-auto" />
            <p className="text-sm font-semibold text-slate-600">Loading concern desk records...</p>
          </div>
        ) : filteredConcerns.length === 0 ? (
          <div className="p-16 text-center space-y-3">
            <div className="w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
              <LifeBuoy className="w-8 h-8" />
            </div>
            <h3 className="text-base font-bold text-slate-800">No Concerns Found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              No tickets match your active filter settings. Try clearing search keywords or filters.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/75 text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                  <th className="py-3.5 px-4">Ticket & Type</th>
                  <th className="py-3.5 px-4">Concern Summary</th>
                  <th className="py-3.5 px-4">Raised By</th>
                  <th className="py-3.5 px-4">Assigned Handler</th>
                  <th className="py-3.5 px-4">Priority & SLA</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredConcerns.map((ticket) => {
                  const meta = getCategoryMeta(ticket.category_code || ticket.category_name);
                  const CategoryIcon = meta.icon;
                  const isResolved = ticket.status === 'resolved' || ticket.status === 'closed';

                  return (
                    <tr
                      key={ticket.id || ticket.ticket_no}
                      className="hover:bg-slate-50/80 transition-colors group"
                    >
                      {/* Ticket No & Type */}
                      <td className="py-4 px-4 align-top">
                        <div className="space-y-1">
                          <span className="font-mono font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200/60 inline-block">
                            {ticket.ticket_no}
                          </span>
                          <div>
                            {ticket.concern_type === 'student' ? (
                              <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-sky-100 text-sky-800">
                                Student
                              </span>
                            ) : (
                              <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800">
                                Staff
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Concern Summary */}
                      <td className="py-4 px-4 align-top max-w-xs">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-slate-500 text-[11px]">
                              {ticket.category_name || meta.label}
                            </span>
                            {ticket.is_escalated && (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase bg-purple-100 text-purple-700 border border-purple-200">
                                Escalated to Principal
                              </span>
                            )}
                          </div>
                          <p className="font-bold text-slate-800 group-hover:text-indigo-600 transition-colors line-clamp-1">
                            {ticket.title}
                          </p>
                          <p className="text-[11px] text-slate-500 line-clamp-1">
                            {ticket.description}
                          </p>
                        </div>
                      </td>

                      {/* Raised By */}
                      <td className="py-4 px-4 align-top">
                        <div className="space-y-0.5">
                          {ticket.concern_type === 'student' ? (
                            <>
                              <p className="font-bold text-slate-800">
                                {ticket.student_name || 'Enrolled Student'}
                              </p>
                              <p className="text-[11px] text-slate-400">
                                {ticket.class_name || 'Class Section'}
                              </p>
                              {ticket.logged_on_behalf && (
                                <span className="inline-block text-[10px] text-indigo-600 font-medium">
                                  Logged by Faculty
                                </span>
                              )}
                            </>
                          ) : (
                            <>
                              <p className="font-bold text-slate-800">
                                {ticket.staff_name || 'Faculty Member'}
                              </p>
                              <p className="text-[11px] text-slate-400">
                                {ticket.staff_designation || 'Staff'}
                              </p>
                            </>
                          )}
                        </div>
                      </td>

                      {/* Assigned Handler */}
                      <td className="py-4 px-4 align-top">
                        {ticket.assigned_staff_name ? (
                          <div className="space-y-0.5">
                            <p className="font-semibold text-slate-800 flex items-center gap-1">
                              <UserCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                              <span>{ticket.assigned_staff_name}</span>
                            </p>
                            <p className="text-[11px] text-slate-400">
                              {ticket.department || 'Assigned Staff'}
                            </p>
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                            <AlertCircle className="w-3 h-3 text-amber-600" />
                            Unassigned
                          </span>
                        )}
                      </td>

                      {/* Priority & SLA */}
                      <td className="py-4 px-4 align-top">
                        <div className="space-y-1">
                          {renderPriorityBadge(ticket.priority, ticket.is_overdue)}
                          <div className="text-[11px] text-slate-400 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            <span>
                              {ticket.sla_due_at
                                ? new Date(ticket.sla_due_at).toLocaleDateString('en-IN', {
                                    day: 'numeric',
                                    month: 'short',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })
                                : `${ticket.sla_hours || 48}h SLA`}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-4 px-4 align-top">
                        {renderStatusBadge(ticket.status)}
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-4 align-top text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Reassign Button */}
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedTicket(ticket);
                              setSelectedStaffId(ticket.assigned_to_staff_id || '');
                              setReassignNotes('');
                              setReassignModalOpen(true);
                            }}
                            className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:text-indigo-600 hover:border-indigo-300 hover:bg-indigo-50/50 transition-all"
                            title="Reassign Staff"
                          >
                            <ArrowRightLeft className="w-3.5 h-3.5" />
                          </button>

                          {/* Escalate Button (if not already escalated and not resolved) */}
                          {!ticket.is_escalated && !isResolved && (
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedTicket(ticket);
                                setEscalationReason('');
                                setEscalateModalOpen(true);
                              }}
                              className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:text-purple-600 hover:border-purple-300 hover:bg-purple-50/50 transition-all"
                              title="Escalate to Principal"
                            >
                              <ArrowUpRight className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Resolve Button */}
                          {!isResolved && (
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedTicket(ticket);
                                setResolutionStatus('resolved');
                                setResolutionNotes('');
                                setResolveModalOpen(true);
                              }}
                              className="px-2.5 py-1.5 rounded-lg bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-700 transition-all shadow-xs flex items-center gap-1"
                              title="Resolve Ticket"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>Resolve</span>
                            </button>
                          )}

                          {/* View Detail Button */}
                          <button
                            type="button"
                            onClick={() => setSelectedTicket(ticket)}
                            className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-all"
                            title="View Docket"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL 1: REASSIGN TICKET */}
      {reassignModalOpen && selectedTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-xs">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl border border-slate-100 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-indigo-50/40">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center">
                  <ArrowRightLeft className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800">Reassign Concern Ticket</h3>
                  <p className="text-xs text-slate-500">Ticket #{selectedTicket.ticket_no}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setReassignModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleReassignSubmit} className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Assign To Staff Member *</label>
                <select
                  value={selectedStaffId}
                  onChange={(e) => setSelectedStaffId(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20"
                >
                  <option value="">-- Select Faculty / Staff Member --</option>
                  {staffMembers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name || `${s.first_name || ''} ${s.last_name || ''}`} ({s.emp_no || s.department || 'Staff'})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Assignment Note / Routing Instructions</label>
                <textarea
                  rows={3}
                  placeholder="Reason for routing or special instructions for the handler..."
                  value={reassignNotes}
                  onChange={(e) => setReassignNotes(e.target.value)}
                  className="w-full p-3.5 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 resize-none font-medium"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setReassignModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingReassign}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md transition-all disabled:opacity-50"
                >
                  {submittingReassign ? 'Assigning...' : 'Confirm Assignment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: RESOLUTION SUBMISSION */}
      {resolveModalOpen && selectedTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-xs">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl border border-slate-100 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-emerald-50/50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800">Submit Official Resolution</h3>
                  <p className="text-xs text-slate-500">Ticket #{selectedTicket.ticket_no}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setResolveModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleResolveSubmit} className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Set Final Status *</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setResolutionStatus('resolved')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all ${
                      resolutionStatus === 'resolved'
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-800 ring-2 ring-emerald-500/10'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    Resolved & Closed
                  </button>
                  <button
                    type="button"
                    onClick={() => setResolutionStatus('in_progress')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all ${
                      resolutionStatus === 'in_progress'
                        ? 'bg-amber-50 border-amber-500 text-amber-800 ring-2 ring-amber-500/10'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    Keep In Progress
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Executive Resolution Notes *</label>
                <textarea
                  rows={4}
                  required
                  placeholder="Record full actions taken by the administration to resolve this matter..."
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  className="w-full p-3.5 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 resize-none font-medium"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setResolveModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingResolve}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md transition-all disabled:opacity-50"
                >
                  {submittingResolve ? 'Saving...' : 'Finalize Resolution'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: MANUAL ESCALATION */}
      {escalateModalOpen && selectedTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-xs">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl border border-slate-100 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-purple-50/50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-purple-600 text-white flex items-center justify-center">
                  <ArrowUpRight className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800">Escalate to Principal</h3>
                  <p className="text-xs text-slate-500">Ticket #{selectedTicket.ticket_no}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEscalateModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEscalateSubmit} className="p-6 space-y-4">
              <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl text-xs text-purple-900 font-medium">
                This ticket will be flagged directly on the Principal's executive dashboard as requiring urgent attention.
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Reason for Escalation *</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Explain why executive intervention is required..."
                  value={escalationReason}
                  onChange={(e) => setEscalationReason(e.target.value)}
                  className="w-full p-3.5 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-purple-500/20 resize-none font-medium"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEscalateModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingEscalate}
                  className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-md transition-all disabled:opacity-50"
                >
                  {submittingEscalate ? 'Escalating...' : 'Confirm Escalation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: FULL TICKET DOSSIER VIEW */}
      {selectedTicket && !reassignModalOpen && !resolveModalOpen && !escalateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-xs">
          <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2.5">
                <span className="font-mono text-xs font-black text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-200">
                  {selectedTicket.ticket_no}
                </span>
                {renderStatusBadge(selectedTicket.status)}
              </div>
              <button
                type="button"
                onClick={() => setSelectedTicket(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5 overflow-y-auto flex-1">
              {/* Header Info */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    {selectedTicket.category_name || 'Category'}
                  </span>
                  <span>•</span>
                  {renderPriorityBadge(selectedTicket.priority, selectedTicket.is_overdue)}
                  {selectedTicket.concern_type === 'student' ? (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-sky-100 text-sky-800">
                      Student Grievance
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800">
                      Staff Workplace Request
                    </span>
                  )}
                </div>
                <h3 className="text-lg font-bold text-slate-800">{selectedTicket.title}</h3>
                <p className="text-xs text-slate-400">
                  Raised on {selectedTicket.created_at ? new Date(selectedTicket.created_at).toLocaleString('en-IN') : 'Recent'}
                </p>
              </div>

              {/* Description */}
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 space-y-1.5">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Issue Description</p>
                <p className="text-xs text-slate-700 whitespace-pre-line leading-relaxed">
                  {selectedTicket.description}
                </p>
              </div>

              {/* Metadata Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Raised By</p>
                  <p className="font-bold text-slate-800 mt-0.5">
                    {selectedTicket.concern_type === 'student'
                      ? selectedTicket.student_name || 'Student'
                      : selectedTicket.staff_name || 'Staff Member'}
                  </p>
                  <p className="text-[11px] text-slate-400">
                    {selectedTicket.class_name || selectedTicket.staff_designation || 'Active Member'}
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Assigned Staff</p>
                  <p className="font-bold text-slate-800 mt-0.5">
                    {selectedTicket.assigned_staff_name || 'Unassigned'}
                  </p>
                  <p className="text-[11px] text-slate-400">
                    {selectedTicket.department || 'School Administration'}
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 col-span-2 sm:col-span-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">SLA Target Due</p>
                  <p className={`font-bold mt-0.5 ${selectedTicket.is_overdue ? 'text-rose-600' : 'text-slate-800'}`}>
                    {selectedTicket.sla_due_at
                      ? new Date(selectedTicket.sla_due_at).toLocaleDateString('en-IN', { hour: '2-digit', minute: '2-digit' })
                      : `${selectedTicket.sla_hours || 48}h SLA`}
                  </p>
                </div>
              </div>

              {/* Resolution Notes Section */}
              {selectedTicket.resolution_notes && (
                <div className="rounded-2xl p-4 bg-emerald-50 border border-emerald-200 text-emerald-950 space-y-2">
                  <div className="flex items-center gap-2 text-emerald-800">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    <h4 className="text-xs font-bold uppercase tracking-wider">Official School Resolution</h4>
                  </div>
                  <p className="text-xs font-medium leading-relaxed whitespace-pre-line text-emerald-900 bg-white/60 p-3 rounded-xl border border-emerald-100">
                    {selectedTicket.resolution_notes}
                  </p>
                  {selectedTicket.resolved_at && (
                    <p className="text-[10px] text-emerald-700 font-medium">
                      Resolved on{' '}
                      {new Date(selectedTicket.resolved_at).toLocaleString('en-IN')}
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedStaffId(selectedTicket.assigned_to_staff_id || '');
                    setReassignNotes('');
                    setReassignModalOpen(true);
                  }}
                  className="px-3.5 py-2 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-100"
                >
                  Reassign
                </button>
                {selectedTicket.status !== 'resolved' && (
                  <button
                    type="button"
                    onClick={() => {
                      setResolutionStatus('resolved');
                      setResolutionNotes('');
                      setResolveModalOpen(true);
                    }}
                    className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs"
                  >
                    Submit Resolution
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={() => setSelectedTicket(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-white text-xs font-bold hover:bg-slate-900"
              >
                Close View
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
