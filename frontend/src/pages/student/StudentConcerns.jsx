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
} from 'lucide-react';
import { useStudent } from '../../context/StudentContext';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../api/client';

// Category icon & styling helper
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
  return { icon: HelpCircle, label: 'General Inquiry', color: 'text-slate-600 bg-slate-50 border-slate-200' };
};

export const StudentConcerns = () => {
  const { student } = useStudent();
  const { user } = useAuth();

  // Data states
  const [concerns, setConcerns] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [raiseModalOpen, setRaiseModalOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);

  // New Concern Form
  const [formCategory, setFormCategory] = useState('');
  const [formPriority, setFormPriority] = useState('medium');
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  // Fetch categories & concerns
  const fetchData = useCallback(async (isSilent = false) => {
    try {
      if (!isSilent) setLoading(true);
      else setRefreshing(true);

      // Load categories
      try {
        const catRes = await api.get('/concerns/categories?target_type=student');
        const catList = catRes?.categories || catRes?.data || (Array.isArray(catRes) ? catRes : []);
        if (catList.length > 0) {
          setCategories(catList);
          setFormCategory((prev) => prev || catList[0].id);
        }
      } catch (e) {
        console.warn('Using default categories fallback:', e);
      }

      // Load tickets
      const res = await api.get('/concerns');
      const ticketList = res?.concerns || res?.data || (Array.isArray(res) ? res : []);
      setConcerns(ticketList);
    } catch (err) {
      console.error('Failed to load student concerns:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [formCategory]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Statistics calculation
  const stats = useMemo(() => {
    const total = concerns.length;
    const open = concerns.filter((c) => c.status === 'open').length;
    const inProgress = concerns.filter((c) => c.status === 'in_progress').length;
    const resolved = concerns.filter((c) => c.status === 'resolved' || c.status === 'closed').length;
    const urgent = concerns.filter((c) => c.priority === 'urgent' && c.status !== 'resolved' && c.status !== 'closed').length;
    return { total, open, inProgress, resolved, urgent };
  }, [concerns]);

  // Filtered tickets
  const filteredConcerns = useMemo(() => {
    return concerns.filter((c) => {
      // Status filter
      if (statusFilter !== 'all') {
        if (statusFilter === 'resolved' && c.status !== 'resolved' && c.status !== 'closed') return false;
        if (statusFilter !== 'resolved' && c.status !== statusFilter) return false;
      }
      // Category filter
      if (categoryFilter !== 'all') {
        if (String(c.category_id) !== String(categoryFilter) && String(c.category_code) !== String(categoryFilter)) {
          return false;
        }
      }
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesNo = c.ticket_no?.toLowerCase().includes(q);
        const matchesTitle = c.title?.toLowerCase().includes(q);
        const matchesDesc = c.description?.toLowerCase().includes(q);
        const matchesCat = c.category_name?.toLowerCase().includes(q);
        if (!matchesNo && !matchesTitle && !matchesDesc && !matchesCat) return false;
      }
      return true;
    });
  }, [concerns, statusFilter, categoryFilter, searchQuery]);

  // Handle raise ticket submission
  const handleRaiseSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');

    if (!formTitle.trim()) {
      setFormError('Please enter a summary title for your concern.');
      return;
    }
    if (!formDescription.trim()) {
      setFormError('Please provide a detailed description so our team can help.');
      return;
    }

    try {
      setSubmitting(true);
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
        concern_type: 'student',
        student_id: student?.id || user?.student_id || null,
      };

      const res = await api.post('/concerns', payload);
      if (res?.ticket_no || res?.concernId || res?.success) {
        const tktNum = res.ticket_no || res.data?.ticket_no || '';
        setFormSuccess(`Your concern has been submitted successfully! Ticket #${tktNum}`);
        setFormTitle('');
        setFormDescription('');
        setFormPriority('medium');
        setTimeout(() => {
          setRaiseModalOpen(false);
          setFormSuccess('');
          fetchData(true);
        }, 1200);
      } else {
        setFormError(res?.message || 'Failed to submit concern. Please try again.');
      }
    } catch (err) {
      setFormError(err?.message || 'Error communicating with server.');
    } finally {
      setSubmitting(false);
    }
  };

  // Status badge renderer
  const renderStatusBadge = (status) => {
    switch (status) {
      case 'resolved':
      case 'closed':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5" /> Resolved
          </span>
        );
      case 'in_progress':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
            <Clock className="w-3.5 h-3.5 animate-spin" /> In Progress
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 border border-rose-200">
            <XCircle className="w-3.5 h-3.5" /> Closed
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-sky-100 text-sky-800 border border-sky-200">
            <AlertCircle className="w-3.5 h-3.5" /> Open
          </span>
        );
    }
  };

  // Priority badge renderer
  const renderPriorityBadge = (priority, isOverdue) => {
    if (isOverdue) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-rose-600 text-white animate-pulse">
          <AlertTriangle className="w-3 h-3" /> SLA Overdue
        </span>
      );
    }
    switch (priority) {
      case 'urgent':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-rose-100 text-rose-700 border border-rose-200">
            <ShieldAlert className="w-3 h-3 text-rose-600" /> Urgent (12h SLA)
          </span>
        );
      case 'high':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-orange-100 text-orange-700 border border-orange-200">
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
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* HEADER BANNER */}
      <div className="relative overflow-hidden rounded-2xl bg-linear-to-r from-sky-600 via-sky-700 to-indigo-800 text-white p-6 sm:p-8 shadow-xl shadow-sky-900/10">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-xs font-semibold uppercase tracking-wider text-sky-100">
              <LifeBuoy className="w-3.5 h-3.5" /> Student Helpdesk & Grievance Redressal
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Have a Concern or Question?
            </h1>
            <p className="text-sky-100 text-sm max-w-2xl leading-relaxed">
              We're here to support your learning experience. Report academic issues, bus transport delays, facility needs, or safety concerns directly to school administration with transparent SLA tracking.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => fetchData(true)}
              disabled={refreshing}
              className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all backdrop-blur-xs disabled:opacity-50"
              title="Refresh tickets"
            >
              <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
            <button
              type="button"
              onClick={() => {
                setFormError('');
                setFormSuccess('');
                setRaiseModalOpen(true);
              }}
              className="flex items-center gap-2 px-5 py-3 rounded-xl bg-white text-sky-700 font-bold text-sm shadow-lg shadow-sky-950/20 hover:bg-sky-50 transition-all hover:scale-102 active:scale-98"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Raise Concern</span>
            </button>
          </div>
        </div>
      </div>

      {/* METRIC STATS CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-sky-50 flex items-center justify-center text-sky-600 shrink-0">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Tickets</p>
            <h3 className="text-2xl font-black text-slate-800">{stats.total}</h3>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Open / Reviewing</p>
            <h3 className="text-2xl font-black text-blue-700">{stats.open}</h3>
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

      {/* FILTER & SEARCH BAR */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Status Segmented Buttons */}
          <div className="inline-flex p-1 bg-slate-100 rounded-xl overflow-x-auto">
            {[
              { id: 'all', label: 'All Concerns' },
              { id: 'open', label: 'Open' },
              { id: 'in_progress', label: 'In Progress' },
              { id: 'resolved', label: 'Resolved' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusFilter(tab.id)}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
                  statusFilter === tab.id
                    ? 'bg-white text-sky-700 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search & Category Filter */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="relative flex-1 sm:w-56">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search ticket # or title..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
              />
            </div>

            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 bg-white"
            >
              <option value="all">All Categories</option>
              {categories.map((cat) => (
                <option key={cat.id || cat.code} value={cat.id || cat.code}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* TICKETS LIST */}
      {loading ? (
        <div className="bg-white rounded-2xl p-12 border border-slate-200/80 text-center space-y-3">
          <RefreshCw className="w-8 h-8 text-sky-500 animate-spin mx-auto" />
          <p className="text-sm font-semibold text-slate-600">Loading your helpdesk tickets...</p>
        </div>
      ) : filteredConcerns.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 border border-slate-200/80 text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center mx-auto shadow-inner">
            <LifeBuoy className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-slate-800">No Concerns Found</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              {statusFilter !== 'all' || categoryFilter !== 'all' || searchQuery
                ? 'No tickets match the selected filters. Try clearing your search or filters.'
                : 'You have not raised any concerns yet. If you face any issues, click "Raise Concern" above.'}
            </p>
          </div>
          {statusFilter !== 'all' || categoryFilter !== 'all' || searchQuery ? (
            <button
              type="button"
              onClick={() => {
                setStatusFilter('all');
                setCategoryFilter('all');
                setSearchQuery('');
              }}
              className="text-xs font-bold text-sky-600 hover:text-sky-800"
            >
              Reset Filters
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setRaiseModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-sky-600 text-white font-bold text-xs hover:bg-sky-700 transition-all"
            >
              <Plus className="w-3.5 h-3.5" /> Raise Your First Concern
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredConcerns.map((ticket) => {
            const meta = getCategoryMeta(ticket.category_code || ticket.category_name);
            const CategoryIcon = meta.icon;
            const isResolved = ticket.status === 'resolved' || ticket.status === 'closed';

            return (
              <div
                key={ticket.id || ticket.ticket_no}
                onClick={() => setSelectedTicket(ticket)}
                className="group bg-white rounded-2xl p-5 border border-slate-200/80 hover:border-sky-300 shadow-xs hover:shadow-md transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4"
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
                      {ticket.is_escalated && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase bg-purple-100 text-purple-700 border border-purple-200">
                          Escalated to Principal
                        </span>
                      )}
                    </div>

                    <h4 className="text-sm font-bold text-slate-800 group-hover:text-sky-700 transition-colors truncate">
                      {ticket.title}
                    </h4>

                    <p className="text-xs text-slate-500 line-clamp-1">
                      {ticket.description}
                    </p>

                    {/* Resolution preview if resolved */}
                    {isResolved && ticket.resolution_notes && (
                      <div className="mt-2 text-xs bg-emerald-50/70 border border-emerald-200/60 rounded-xl p-2.5 text-emerald-900 flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-bold text-[11px] uppercase tracking-wider text-emerald-800">
                            Resolution Note from School
                          </p>
                          <p className="line-clamp-2 text-emerald-950 font-medium">
                            {ticket.resolution_notes}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 shrink-0 border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-100">
                  {renderStatusBadge(ticket.status)}
                  <div className="text-[11px] text-slate-400 font-medium flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {ticket.created_at
                      ? new Date(ticket.created_at).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                        })
                      : 'Recently'}
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-sky-500 group-hover:translate-x-0.5 transition-all hidden sm:block" />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL 1: RAISE CONCERN */}
      {raiseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-xs">
          <div className="bg-white rounded-3xl w-full max-w-xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-sky-500 text-white flex items-center justify-center">
                  <LifeBuoy className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800">Raise Student Concern</h3>
                  <p className="text-xs text-slate-500">School administration is committed to resolving this promptly.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setRaiseModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleRaiseSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
              {formError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}
              {formSuccess && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
                  <Check className="w-4 h-4 shrink-0 text-emerald-600" />
                  <span>{formSuccess}</span>
                </div>
              )}

              {/* Category Selector */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Concern Category *</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {[
                    { id: 'ACADEMIC', label: 'Academic', icon: GraduationCap },
                    { id: 'TRANSPORT', label: 'Transport', icon: Bus },
                    { id: 'FEE', label: 'Fee & Accounts', icon: CreditCard },
                    { id: 'FACILITIES', label: 'Facilities', icon: Building2 },
                    { id: 'CANTEEN', label: 'Canteen & Food', icon: Utensils },
                    { id: 'SAFETY', label: 'Safety & Security', icon: ShieldAlert },
                  ].map((cat) => {
                    const isSelected = String(formCategory).toUpperCase().includes(cat.id);
                    const Icon = cat.icon;
                    return (
                      <button
                        type="button"
                        key={cat.id}
                        onClick={() => {
                          const match = categories.find((c) => c.code === cat.id);
                          setFormCategory(match ? match.id : cat.id);
                          if (cat.id === 'SAFETY') setFormPriority('urgent');
                          else if (cat.id === 'TRANSPORT') setFormPriority('high');
                          else setFormPriority('medium');
                        }}
                        className={`flex items-center gap-2 p-2.5 rounded-xl border text-left text-xs font-semibold transition-all ${
                          isSelected
                            ? 'bg-sky-50 border-sky-500 text-sky-800 ring-2 ring-sky-500/10'
                            : 'border-slate-200 hover:border-slate-300 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <Icon className={`w-4 h-4 ${isSelected ? 'text-sky-600' : 'text-slate-400'}`} />
                        <span className="truncate">{cat.label}</span>
                      </button>
                    );
                  })}
                </div>
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
                            : p.id === 'high'
                            ? 'bg-orange-50 border-orange-500 text-orange-700 ring-2 ring-orange-500/10'
                            : 'bg-sky-50 border-sky-500 text-sky-800 ring-2 ring-sky-500/10'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <p>{p.label}</p>
                      <p className="text-[10px] font-normal text-slate-400">{p.time} SLA</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Title Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Summary Subject *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Bus Route 14 morning pickup 25 mins late"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 font-medium"
                />
              </div>

              {/* Description Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Detailed Description *</label>
                <textarea
                  rows={4}
                  required
                  placeholder="Explain the situation in detail (location, time, teacher/driver name, what happened)..."
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full p-3.5 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 resize-none font-medium"
                />
              </div>

              {/* Notice */}
              <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl text-[11px] text-slate-500 flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
                <span>
                  This ticket will be assigned automatically to the relevant department head. You will receive real-time status updates here.
                </span>
              </div>

              {/* Modal Footer */}
              <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setRaiseModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold shadow-md shadow-sky-600/20 transition-all disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Submitting...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>Submit Concern</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: TICKET DETAILS VIEW */}
      {selectedTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-xs">
          <div className="bg-white rounded-3xl w-full max-w-xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2.5">
                <span className="font-mono text-xs font-extrabold text-sky-700 bg-sky-100 px-2.5 py-1 rounded-lg">
                  {selectedTicket.ticket_no}
                </span>
                {renderStatusBadge(selectedTicket.status)}
              </div>
              <button
                type="button"
                onClick={() => setSelectedTicket(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-5 overflow-y-auto flex-1">
              {/* Title & Category Info */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    {selectedTicket.category_name || 'Concern Category'}
                  </span>
                  <span>•</span>
                  {renderPriorityBadge(selectedTicket.priority, selectedTicket.is_overdue)}
                </div>
                <h3 className="text-lg font-bold text-slate-800">{selectedTicket.title}</h3>
                <p className="text-xs text-slate-400">
                  Raised on{' '}
                  {selectedTicket.created_at
                    ? new Date(selectedTicket.created_at).toLocaleString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : 'Recently'}
                </p>
              </div>

              {/* Description */}
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 space-y-1.5">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Description</p>
                <p className="text-xs text-slate-700 whitespace-pre-line leading-relaxed">
                  {selectedTicket.description}
                </p>
              </div>

              {/* Assignment & Department Info */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Assigned To</p>
                  <p className="font-semibold text-slate-800 mt-0.5">
                    {selectedTicket.assigned_staff_name || selectedTicket.department || 'School Helpdesk Team'}
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Target SLA</p>
                  <p className="font-semibold text-slate-800 mt-0.5">
                    {selectedTicket.sla_hours ? `${selectedTicket.sla_hours} Hours Response` : 'Standard 48h'}
                  </p>
                </div>
              </div>

              {/* Official School Resolution Note (If resolved) */}
              {selectedTicket.resolution_notes ? (
                <div className="rounded-2xl p-4 bg-emerald-50 border border-emerald-200 text-emerald-950 space-y-2">
                  <div className="flex items-center gap-2 text-emerald-800">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    <h4 className="text-xs font-bold uppercase tracking-wider">
                      Official School Resolution
                    </h4>
                  </div>
                  <p className="text-xs font-medium leading-relaxed whitespace-pre-line text-emerald-900 bg-white/60 p-3 rounded-xl border border-emerald-100">
                    {selectedTicket.resolution_notes}
                  </p>
                  {selectedTicket.resolved_at && (
                    <p className="text-[10px] text-emerald-700 font-medium">
                      Resolved on{' '}
                      {new Date(selectedTicket.resolved_at).toLocaleString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  )}
                </div>
              ) : (
                <div className="p-3.5 rounded-2xl bg-sky-50 border border-sky-100 text-sky-900 flex items-center gap-3">
                  <Clock className="w-5 h-5 text-sky-600 shrink-0" />
                  <p className="text-xs font-medium">
                    Our team is currently reviewing your ticket. You will see official resolution notes posted here once completed.
                  </p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end">
              <button
                type="button"
                onClick={() => setSelectedTicket(null)}
                className="px-5 py-2 rounded-xl bg-slate-800 text-white text-xs font-bold hover:bg-slate-900 transition-colors"
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
