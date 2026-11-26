import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  LifeBuoy,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertTriangle,
  AlertCircle,
  XCircle,
  FileText,
  ChevronRight,
  MessageSquare,
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
  Layers,
  Phone,
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

export const PortalConcerns = () => {
  const { user, selectedBranch } = useAuth();

  // Active Tab: 'assigned' (Assigned to Me) vs 'my_grievances' (My Raised Grievances)
  const [activeTab, setActiveTab] = useState('assigned');

  // Data states
  const [assignedTickets, setAssignedTickets] = useState([]);
  const [myGrievances, setMyGrievances] = useState([]);
  const [categories, setCategories] = useState([]);
  const [studentsList, setStudentsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [escalateModalOpen, setEscalateModalOpen] = useState(false);
  const [resolveModalOpen, setResolveModalOpen] = useState(false);

  // Resolution Form State
  const [resolutionStatus, setResolutionStatus] = useState('resolved');
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [submittingResolution, setSubmittingResolution] = useState(false);

  // Escalation Form State
  const [escalationReason, setEscalationReason] = useState('');
  const [submittingEscalation, setSubmittingEscalation] = useState(false);

  // Create Ticket Mode: 'staff_grievance' vs 'behalf_student'
  const [createMode, setCreateMode] = useState('staff_grievance');
  const [formCategory, setFormCategory] = useState('');
  const [formPriority, setFormPriority] = useState('medium');
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [studentSearch, setStudentSearch] = useState('');
  const [submittingCreate, setSubmittingCreate] = useState(false);
  const [createError, setCreateError] = useState('');
  const [createSuccess, setCreateSuccess] = useState('');

  // Fetch Tickets & Categories
  const fetchTickets = useCallback(async (isSilent = false) => {
    try {
      if (!isSilent) setLoading(true);
      else setRefreshing(true);

      // Categories
      try {
        const catRes = await api.get('/concerns/categories');
        const catList = catRes?.categories || catRes?.data || (Array.isArray(catRes) ? catRes : []);
        if (catList.length > 0) {
          setCategories(catList);
          setFormCategory((prev) => prev || catList[0].id);
        }
      } catch (e) {
        console.warn('Categories fallback error:', e);
      }

      // 1. Fetch tickets assigned to this teacher/staff
      try {
        const assignedRes = await api.get('/concerns?scope=assigned');
        const assignedList = assignedRes?.concerns || assignedRes?.data || (Array.isArray(assignedRes) ? assignedRes : []);
        setAssignedTickets(assignedList);
      } catch (e) {
        console.warn('Assigned tickets error:', e);
      }

      // 2. Fetch tickets raised by this staff member
      try {
        const raisedRes = await api.get('/concerns?scope=my_raised');
        const raisedList = raisedRes?.concerns || raisedRes?.data || (Array.isArray(raisedRes) ? raisedRes : []);
        setMyGrievances(raisedList);
      } catch (e) {
        console.warn('My grievances error:', e);
      }

      // 3. Fetch students list for "log on behalf of student"
      try {
        const studRes = await api.get('/portal/classes');
        if (studRes?.students && Array.isArray(studRes.students)) {
          setStudentsList(studRes.students);
        } else {
          // fallback to student search endpoint or general roster
          const rRes = await api.get('/students?limit=100');
          if (rRes?.data && Array.isArray(rRes.data)) {
            setStudentsList(rRes.data);
          }
        }
      } catch (e) {
        // silent catch
      }
    } catch (err) {
      console.error('Failed to load staff concerns:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [formCategory]);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  // Active tickets set depending on current tab
  const activeTickets = useMemo(() => {
    return activeTab === 'assigned' ? assignedTickets : myGrievances;
  }, [activeTab, assignedTickets, myGrievances]);

  // Metric calculation for current tab
  const stats = useMemo(() => {
    const total = activeTickets.length;
    const open = activeTickets.filter((t) => t.status === 'open').length;
    const inProgress = activeTickets.filter((t) => t.status === 'in_progress').length;
    const resolved = activeTickets.filter((t) => t.status === 'resolved' || t.status === 'closed').length;
    const overdue = activeTickets.filter((t) => t.is_overdue || t.is_escalated).length;
    return { total, open, inProgress, resolved, overdue };
  }, [activeTickets]);

  // Filtered tickets
  const filteredTickets = useMemo(() => {
    return activeTickets.filter((t) => {
      // Status filter
      if (statusFilter !== 'all') {
        if (statusFilter === 'resolved' && t.status !== 'resolved' && t.status !== 'closed') return false;
        if (statusFilter !== 'resolved' && t.status !== statusFilter) return false;
      }
      // Priority filter
      if (priorityFilter !== 'all' && t.priority !== priorityFilter) return false;
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesNo = t.ticket_no?.toLowerCase().includes(q);
        const matchesTitle = t.title?.toLowerCase().includes(q);
        const matchesDesc = t.description?.toLowerCase().includes(q);
        const matchesStudent = t.student_name?.toLowerCase().includes(q);
        const matchesCat = t.category_name?.toLowerCase().includes(q);
        if (!matchesNo && !matchesTitle && !matchesDesc && !matchesStudent && !matchesCat) return false;
      }
      return true;
    });
  }, [activeTickets, statusFilter, priorityFilter, searchQuery]);

  // Submit new ticket (Staff Grievance OR On Behalf of Student)
  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setCreateError('');
    setCreateSuccess('');

    if (!formTitle.trim()) {
      setCreateError('Please enter a clear summary title.');
      return;
    }
    if (!formDescription.trim()) {
      setCreateError('Please provide a detailed description.');
      return;
    }
    if (createMode === 'behalf_student' && !selectedStudentId) {
      setCreateError('Please select a student on whose behalf this concern is logged.');
      return;
    }

    try {
      setSubmittingCreate(true);
      let resolvedCatId = Number(formCategory);
      if (isNaN(resolvedCatId) || resolvedCatId <= 0) {
        const found = categories.find((c) => c.code === formCategory || String(c.id) === String(formCategory));
        resolvedCatId = found ? found.id : (categories[0]?.id || 1);
      }

      const payload = {
        title: formTitle.trim(),
        description: formDescription.trim(),
        category_id: resolvedCatId,
        priority: formPriority,
        concern_type: createMode === 'behalf_student' ? 'student' : 'staff',
        logged_on_behalf: createMode === 'behalf_student',
        student_id: createMode === 'behalf_student' ? selectedStudentId : null,
        staff_id: user?.staff_id || null,
      };

      const res = await api.post('/concerns', payload);
      if (res?.ticket_no || res?.concernId || res?.success) {
        const tktNum = res.ticket_no || res.data?.ticket_no || '';
        setCreateSuccess(`Ticket #${tktNum} logged successfully!`);
        setFormTitle('');
        setFormDescription('');
        setSelectedStudentId('');
        setTimeout(() => {
          setCreateModalOpen(false);
          setCreateSuccess('');
          fetchTickets(true);
        }, 1200);
      } else {
        setCreateError(res?.message || 'Failed to submit concern.');
      }
    } catch (err) {
      setCreateError(err?.message || 'Error connecting to server.');
    } finally {
      setSubmittingCreate(false);
    }
  };

  // Submit Resolution Notes
  const handleResolutionSubmit = async (e) => {
    e.preventDefault();
    if (!selectedTicket) return;
    if (!resolutionNotes.trim()) {
      alert('Please provide resolution notes detailing what steps were taken.');
      return;
    }

    try {
      setSubmittingResolution(true);
      const res = await api.put(`/concerns/${selectedTicket.id}/status`, {
        status: resolutionStatus,
        resolution_notes: resolutionNotes.trim(),
      });
      if (res?.success || res?.status) {
        setResolveModalOpen(false);
        setResolutionNotes('');
        setSelectedTicket(null);
        fetchTickets(true);
      } else {
        alert(res?.message || 'Failed to update resolution.');
      }
    } catch (err) {
      alert(err?.message || 'Error updating status.');
    } finally {
      setSubmittingResolution(false);
    }
  };

  // Submit Escalation
  const handleEscalationSubmit = async (e) => {
    e.preventDefault();
    if (!selectedTicket) return;
    if (!escalationReason.trim()) {
      alert('Please provide a reason for escalating this ticket to the Principal.');
      return;
    }

    try {
      setSubmittingEscalation(true);
      const res = await api.put(`/concerns/${selectedTicket.id}/escalate`, {
        escalation_reason: escalationReason.trim(),
      });
      if (res?.success || res?.message) {
        setEscalateModalOpen(false);
        setEscalationReason('');
        setSelectedTicket(null);
        fetchTickets(true);
      } else {
        alert(res?.message || 'Failed to escalate ticket.');
      }
    } catch (err) {
      alert(err?.message || 'Error escalating ticket.');
    } finally {
      setSubmittingEscalation(false);
    }
  };

  // Quick Action: Update ticket status to In Progress
  const handleMarkInProgress = async (ticket) => {
    try {
      await api.put(`/concerns/${ticket.id}/status`, {
        status: 'in_progress',
        resolution_notes: 'Ticket acknowledged by assigned faculty. Investigation in progress.',
      });
      fetchTickets(true);
    } catch (err) {
      console.error(err);
    }
  };

  // Status badge
  const renderStatusBadge = (status) => {
    switch (status) {
      case 'resolved':
      case 'closed':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5" /> Resolved
          </span>
        );
      case 'in_progress':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
            <Clock className="w-3.5 h-3.5" /> In Progress
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200">
            <XCircle className="w-3.5 h-3.5" /> Rejected
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-sky-100 text-sky-800 border border-sky-200">
            <AlertCircle className="w-3.5 h-3.5" /> Open
          </span>
        );
    }
  };

  // Priority badge
  const renderPriorityBadge = (priority, isOverdue) => {
    if (isOverdue) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-black bg-rose-600 text-white animate-pulse shadow-xs">
          <AlertTriangle className="w-3 h-3" /> SLA OVERDUE
        </span>
      );
    }
    switch (priority) {
      case 'urgent':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-extrabold bg-rose-100 text-rose-700 border border-rose-200">
            <ShieldAlert className="w-3 h-3 text-rose-600" /> Urgent (12h)
          </span>
        );
      case 'high':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-orange-100 text-orange-700 border border-orange-200">
            High (24h)
          </span>
        );
      case 'medium':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
            Medium (48h)
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-medium bg-slate-50 text-slate-500 border border-slate-200">
            Low (72h)
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 font-sans">
      {/* HEADER BANNER */}
      <div className="relative overflow-hidden rounded-3xl bg-linear-to-r from-emerald-800 via-teal-800 to-slate-900 text-white p-6 sm:p-8 shadow-xl shadow-emerald-950/20">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-xs font-bold uppercase tracking-wider text-emerald-200">
              <LifeBuoy className="w-3.5 h-3.5" /> Staff Portal Concerns & Grievance Redressal
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Concerns & Helpdesk Suite
            </h1>
            <p className="text-emerald-100/90 text-sm max-w-2xl leading-relaxed">
              Resolve tickets assigned to you by school administration, submit resolution notes, escalate urgent safety/academic matters, or raise internal workplace requests with full SLA transparency.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => fetchTickets(true)}
              disabled={refreshing}
              className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all backdrop-blur-xs disabled:opacity-50"
              title="Refresh concerns"
            >
              <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
            <button
              type="button"
              onClick={() => {
                setCreateError('');
                setCreateSuccess('');
                setCreateModalOpen(true);
              }}
              className="flex items-center gap-2 px-5 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white font-bold text-sm shadow-lg shadow-emerald-950/30 transition-all hover:scale-102 active:scale-98"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Raise Ticket</span>
            </button>
          </div>
        </div>
      </div>

      {/* DUAL TABS: "Assigned to Me" vs "My Raised Grievances" */}
      <div className="flex border-b border-slate-200 space-x-6">
        <button
          type="button"
          onClick={() => setActiveTab('assigned')}
          className={`flex items-center gap-2.5 pb-3.5 text-sm font-extrabold border-b-2 transition-all ${
            activeTab === 'assigned'
              ? 'border-emerald-600 text-emerald-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <UserCheck className="w-4 h-4" />
          <span>Assigned to Me</span>
          <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
            {assignedTickets.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('my_grievances')}
          className={`flex items-center gap-2.5 pb-3.5 text-sm font-extrabold border-b-2 transition-all ${
            activeTab === 'my_grievances'
              ? 'border-emerald-600 text-emerald-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Briefcase className="w-4 h-4" />
          <span>My Raised Grievances</span>
          <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700">
            {myGrievances.length}
          </span>
        </button>
      </div>

      {/* METRIC STATS ROW */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700 shrink-0">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              {activeTab === 'assigned' ? 'Assigned Total' : 'My Requests'}
            </p>
            <h3 className="text-2xl font-black text-slate-800">{stats.total}</h3>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-sky-50 flex items-center justify-center text-sky-600 shrink-0">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Open / Pending</p>
            <h3 className="text-2xl font-black text-sky-700">{stats.open}</h3>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600 shrink-0">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">In Progress</p>
            <h3 className="text-2xl font-black text-amber-600">{stats.inProgress}</h3>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Resolved</p>
            <h3 className="text-2xl font-black text-emerald-600">{stats.resolved}</h3>
          </div>
        </div>
      </div>

      {/* FILTER & SEARCH STRIP */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="inline-flex p-1 bg-slate-100 rounded-xl overflow-x-auto">
          {[
            { id: 'all', label: 'All Status' },
            { id: 'open', label: 'Open' },
            { id: 'in_progress', label: 'In Progress' },
            { id: 'resolved', label: 'Resolved' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
                statusFilter === tab.id
                  ? 'bg-white text-emerald-800 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative flex-1 sm:w-56">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search ticket # or keyword..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            />
          </div>

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white"
          >
            <option value="all">All Priorities</option>
            <option value="urgent">Urgent (12h)</option>
            <option value="high">High (24h)</option>
            <option value="medium">Medium (48h)</option>
            <option value="low">Low (72h)</option>
          </select>
        </div>
      </div>

      {/* TICKETS TABLE / LIST */}
      {loading ? (
        <div className="bg-white rounded-2xl p-12 border border-slate-200/80 text-center space-y-3">
          <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin mx-auto" />
          <p className="text-sm font-semibold text-slate-600">Loading concern records...</p>
        </div>
      ) : filteredTickets.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 border border-slate-200/80 text-center space-y-3">
          <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
            <LifeBuoy className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-slate-800">No Tickets Found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {activeTab === 'assigned'
              ? 'You currently have no pending tickets assigned to you.'
              : 'You have not raised any internal grievances yet.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredTickets.map((ticket) => {
            const meta = getCategoryMeta(ticket.category_code || ticket.category_name);
            const CategoryIcon = meta.icon;
            const isResolved = ticket.status === 'resolved' || ticket.status === 'closed';

            return (
              <div
                key={ticket.id || ticket.ticket_no}
                className="bg-white rounded-2xl p-5 border border-slate-200/80 hover:border-emerald-400 shadow-xs hover:shadow-md transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="flex items-start gap-3.5 flex-1 min-w-0">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${meta.color}`}>
                    <CategoryIcon className="w-5 h-5" />
                  </div>

                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                        {ticket.ticket_no}
                      </span>
                      <span className="text-xs font-semibold text-slate-600">
                        {ticket.category_name || meta.label}
                      </span>
                      {renderPriorityBadge(ticket.priority, ticket.is_overdue)}
                      {ticket.concern_type === 'student' ? (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-sky-50 text-sky-700 border border-sky-200">
                          Student Concern {ticket.student_name ? `• ${ticket.student_name}` : ''}
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                          Staff Workplace
                        </span>
                      )}
                      {ticket.is_escalated && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-purple-100 text-purple-800 border border-purple-200">
                          Escalated to Principal
                        </span>
                      )}
                    </div>

                    <h4 className="text-sm font-bold text-slate-800 hover:text-emerald-700 transition-colors">
                      {ticket.title}
                    </h4>

                    <p className="text-xs text-slate-500 line-clamp-1">
                      {ticket.description}
                    </p>

                    {/* Raised By / Target info */}
                    <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-400 pt-1">
                      {ticket.student_name && (
                        <span className="flex items-center gap-1 font-medium text-slate-600">
                          <User className="w-3 h-3 text-sky-500" />
                          Student: {ticket.student_name} ({ticket.class_name || 'Class'})
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {ticket.created_at ? new Date(ticket.created_at).toLocaleDateString('en-IN') : 'Recent'}
                      </span>
                      {ticket.sla_due_at && (
                        <span className={`flex items-center gap-1 font-semibold ${ticket.is_overdue ? 'text-rose-600' : 'text-slate-500'}`}>
                          <Clock className="w-3 h-3" />
                          SLA Due: {new Date(ticket.sla_due_at).toLocaleDateString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                    </div>

                    {/* Resolution Note display */}
                    {isResolved && ticket.resolution_notes && (
                      <div className="mt-2 text-xs bg-emerald-50/80 border border-emerald-200 rounded-xl p-2.5 text-emerald-950 flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-bold text-[11px] uppercase tracking-wider text-emerald-800">Resolution Note</p>
                          <p className="font-medium text-emerald-950">{ticket.resolution_notes}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* ACTION BUTTONS (for Assigned to Me) */}
                <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2.5 shrink-0 border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-100">
                  {renderStatusBadge(ticket.status)}

                  {activeTab === 'assigned' && !isResolved && (
                    <div className="flex items-center gap-2">
                      {ticket.status === 'open' && (
                        <button
                          type="button"
                          onClick={() => handleMarkInProgress(ticket)}
                          className="px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200 transition-colors"
                        >
                          Start Investigation
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedTicket(ticket);
                          setResolutionStatus('resolved');
                          setResolutionNotes('');
                          setResolveModalOpen(true);
                        }}
                        className="px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 shadow-xs transition-all flex items-center gap-1.5"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Resolve</span>
                      </button>
                      {!ticket.is_escalated && (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedTicket(ticket);
                            setEscalationReason('');
                            setEscalateModalOpen(true);
                          }}
                          className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200 transition-colors"
                          title="Escalate to Principal"
                        >
                          Escalate
                        </button>
                      )}
                    </div>
                  )}

                  {/* View Details Button for All */}
                  <button
                    type="button"
                    onClick={() => setSelectedTicket(ticket)}
                    className="text-xs font-bold text-slate-500 hover:text-emerald-700 flex items-center gap-1"
                  >
                    <span>View Detail</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL 1: RAISE TICKET (Staff Grievance OR Log on Behalf of Student) */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-xs">
          <div className="bg-white rounded-3xl w-full max-w-xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center">
                  <LifeBuoy className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800">Raise Concern / Grievance</h3>
                  <p className="text-xs text-slate-500">Log workplace request or record student grievance.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCreateModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
              {createError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{createError}</span>
                </div>
              )}
              {createSuccess && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
                  <Check className="w-4 h-4 shrink-0 text-emerald-600" />
                  <span>{createSuccess}</span>
                </div>
              )}

              {/* MODE SELECTION TOGGLE */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Ticket Type *</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setCreateMode('staff_grievance');
                      setFormCategory('STAFF_HR');
                    }}
                    className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-xs font-bold transition-all ${
                      createMode === 'staff_grievance'
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-800 ring-2 ring-emerald-500/10'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Briefcase className="w-4 h-4 text-emerald-600" />
                    <span>Staff Workplace Request</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setCreateMode('behalf_student');
                      setFormCategory('ACADEMIC');
                    }}
                    className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-xs font-bold transition-all ${
                      createMode === 'behalf_student'
                        ? 'bg-sky-50 border-sky-500 text-sky-800 ring-2 ring-sky-500/10'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Users className="w-4 h-4 text-sky-600" />
                    <span>Log on Behalf of Student</span>
                  </button>
                </div>
              </div>

              {/* Student Picker (if mode === behalf_student) */}
              {createMode === 'behalf_student' && (
                <div className="space-y-1.5 bg-sky-50/60 p-3.5 rounded-2xl border border-sky-100">
                  <label className="text-xs font-bold text-sky-900">Select Student *</label>
                  <select
                    value={selectedStudentId}
                    onChange={(e) => setSelectedStudentId(e.target.value)}
                    required
                    className="w-full px-3 py-2 rounded-xl border border-sky-200 text-xs text-slate-800 bg-white focus:outline-hidden focus:ring-2 focus:ring-sky-500/20"
                  >
                    <option value="">-- Choose Student from Your Classes --</option>
                    {studentsList.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.full_name || s.name || `${s.first_name || ''} ${s.last_name || ''}`} ({s.admission_number || s.roll_number || 'ID'}) - {s.class_name || 'Class'}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Category Selector */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Category *</label>
                <select
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20"
                >
                  {createMode === 'staff_grievance' ? (
                    <>
                      <option value="STAFF_HR">Staff Workplace & HR Support</option>
                      <option value="FACILITIES">Facilities, Lighting & Workstations</option>
                      <option value="CANTEEN">Staff Canteen & Dining</option>
                      <option value="SAFETY">Safety & Campus Security</option>
                      <option value="GENERAL">General Suggestion / Inquiry</option>
                    </>
                  ) : (
                    <>
                      <option value="ACADEMIC">Academic / Learning Support</option>
                      <option value="TRANSPORT">Transport & Bus Delay</option>
                      <option value="FACILITIES">Classroom Infrastructure</option>
                      <option value="SAFETY">Safety, Conduct & Anti-Bullying</option>
                      <option value="FEE">Fee / Accounts Query</option>
                    </>
                  )}
                </select>
              </div>

              {/* Priority Selector */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Priority Level *</label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { id: 'low', label: 'Low', time: '72h' },
                    { id: 'medium', label: 'Medium', time: '48h' },
                    { id: 'high', label: 'High', time: '24h' },
                    { id: 'urgent', label: 'Urgent', time: '12h' },
                  ].map((p) => (
                    <button
                      type="button"
                      key={p.id}
                      onClick={() => setFormPriority(p.id)}
                      className={`py-2 px-2 rounded-xl border text-center text-xs font-bold transition-all ${
                        formPriority === p.id
                          ? p.id === 'urgent'
                            ? 'bg-rose-50 border-rose-500 text-rose-700 ring-2 ring-rose-500/10'
                            : 'bg-emerald-50 border-emerald-500 text-emerald-800 ring-2 ring-emerald-500/10'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <p>{p.label}</p>
                      <p className="text-[10px] font-normal text-slate-400">{p.time} SLA</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Summary Subject */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Summary Subject *</label>
                <input
                  type="text"
                  required
                  placeholder="Brief summary of the issue..."
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              {/* Detailed Description */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Detailed Description *</label>
                <textarea
                  rows={4}
                  required
                  placeholder="Provide complete context and details for the administration team..."
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full p-3.5 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 resize-none font-medium"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingCreate}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md transition-all disabled:opacity-50"
                >
                  {submittingCreate ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>Submit Ticket</span>
                    </>
                  )}
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
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800">Submit Resolution</h3>
                  <p className="text-xs text-slate-500">Record action taken for ticket #{selectedTicket.ticket_no}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setResolveModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleResolutionSubmit} className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Resolution Status *</label>
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
                <label className="text-xs font-bold text-slate-700">Official Resolution Notes *</label>
                <textarea
                  rows={4}
                  required
                  placeholder="Detail the actions taken to address this ticket (e.g., student counseled, transport route readjusted, classroom AC serviced)..."
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
                  disabled={submittingResolution}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md transition-all disabled:opacity-50"
                >
                  {submittingResolution ? 'Submitting...' : 'Save Resolution'}
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

            <form onSubmit={handleEscalationSubmit} className="p-6 space-y-4">
              <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl text-xs text-purple-900 font-medium">
                Escalating will notify the Principal & Senior Management immediately, marking this ticket with a high-priority institutional flag.
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Reason for Escalation *</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Explain why executive intervention or higher authority action is needed..."
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
                  disabled={submittingEscalation}
                  className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-md transition-all disabled:opacity-50"
                >
                  {submittingEscalation ? 'Escalating...' : 'Confirm Escalation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: FULL TICKET VIEW */}
      {selectedTicket && !resolveModalOpen && !escalateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-xs">
          <div className="bg-white rounded-3xl w-full max-w-xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2.5">
                <span className="font-mono text-xs font-extrabold text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded-lg">
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
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    {selectedTicket.category_name || 'Category'}
                  </span>
                  <span>•</span>
                  {renderPriorityBadge(selectedTicket.priority, selectedTicket.is_overdue)}
                </div>
                <h3 className="text-lg font-bold text-slate-800">{selectedTicket.title}</h3>
                <p className="text-xs text-slate-400">
                  Raised on {selectedTicket.created_at ? new Date(selectedTicket.created_at).toLocaleString('en-IN') : 'Recent'}
                </p>
              </div>

              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 space-y-1.5">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Description</p>
                <p className="text-xs text-slate-700 whitespace-pre-line leading-relaxed">
                  {selectedTicket.description}
                </p>
              </div>

              {selectedTicket.student_name && (
                <div className="p-3.5 rounded-xl bg-sky-50 border border-sky-100 flex items-center justify-between text-xs">
                  <div>
                    <p className="text-[10px] font-bold text-sky-600 uppercase">Associated Student</p>
                    <p className="font-bold text-sky-950 mt-0.5">{selectedTicket.student_name}</p>
                  </div>
                  <span className="px-2 py-0.5 rounded-md bg-sky-100 text-sky-800 font-semibold">
                    {selectedTicket.class_name || 'Assigned Class'}
                  </span>
                </div>
              )}

              {selectedTicket.resolution_notes && (
                <div className="rounded-2xl p-4 bg-emerald-50 border border-emerald-200 text-emerald-950 space-y-2">
                  <div className="flex items-center gap-2 text-emerald-800">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    <h4 className="text-xs font-bold uppercase tracking-wider">Official Resolution</h4>
                  </div>
                  <p className="text-xs font-medium leading-relaxed whitespace-pre-line text-emerald-900 bg-white/60 p-3 rounded-xl border border-emerald-100">
                    {selectedTicket.resolution_notes}
                  </p>
                </div>
              )}
            </div>

            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
              {activeTab === 'assigned' && selectedTicket.status !== 'resolved' && (
                <button
                  type="button"
                  onClick={() => {
                    setResolutionStatus('resolved');
                    setResolutionNotes('');
                    setResolveModalOpen(true);
                  }}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold"
                >
                  Submit Resolution
                </button>
              )}
              <button
                type="button"
                onClick={() => setSelectedTicket(null)}
                className="ml-auto px-4 py-2 rounded-xl bg-slate-800 text-white text-xs font-bold hover:bg-slate-900"
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
