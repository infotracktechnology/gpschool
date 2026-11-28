import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  UserPlus,
  Search,
  Filter,
  Phone,
  Calendar,
  Clock,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  MessageSquare,
  FileCheck,
  Zap,
  Building2,
  GraduationCap,
  Plus,
  RefreshCw,
  Send,
  UserCheck,
} from 'lucide-react';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { Modal } from '../../components/common/Modal';
import { Badge } from '../../components/common/Badge';

export const EnquiryList = () => {
  const navigate = useNavigate();
  const { selectedBranch, selectedAcademicYear } = useAuth();

  // Lookups
  const [branches, setBranches] = useState([]);
  const [classes, setClasses] = useState([]);
  const [leadSources, setLeadSources] = useState([]);

  // Filters
  const [selectedBranchId, setSelectedBranchId] = useState('');
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedLeadSourceId, setSelectedLeadSourceId] = useState('');
  const [selectedStatusTab, setSelectedStatusTab] = useState('all');
  const [activeRibbonFilter, setActiveRibbonFilter] = useState('all'); // all, today, overdue, upcoming
  const [search, setSearch] = useState('');

  // Workflow settings state
  const [workflow, setWorkflow] = useState({
    enable_enquiry: true,
    enable_application: true,
    allow_direct_enquiry_to_admission: true,
    allow_direct_walkin_admission: true,
  });
  const [checkedBranchId, setCheckedBranchId] = useState('');

  // Data & State
  const [enquiries, setEnquiries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState(null);

  // Follow-up modal state
  const [activeFollowupEnquiry, setActiveFollowupEnquiry] = useState(null);
  const [followups, setFollowups] = useState([]);
  const [loadingFollowups, setLoadingFollowups] = useState(false);
  const [followupForm, setFollowupForm] = useState({
    interaction_type: 'phone_call',
    followup_date: new Date().toISOString().slice(0, 16),
    next_followup_date: '',
    response_status: 'interested',
    notes: '',
  });
  const [submittingFollowup, setSubmittingFollowup] = useState(false);

  // Fast-track Direct Admission modal state
  const [fastTrackEnquiry, setFastTrackEnquiry] = useState(null);
  const [availableSections, setAvailableSections] = useState([]);
  const [fastTrackForm, setFastTrackForm] = useState({
    section_id: '',
    admission_date: new Date().toISOString().slice(0, 10),
    admission_category: 'general',
    roll_no: '',
  });
  const [submittingFastTrack, setSubmittingFastTrack] = useState(false);

  // Metrics count
  const [ribbonMetrics, setRibbonMetrics] = useState({
    all: 0,
    today: 0,
    overdue: 0,
    upcoming: 0,
  });

  const isWorkflowReady = Boolean(selectedBranchId) && checkedBranchId === selectedBranchId;

  // Load initial lookups
  useEffect(() => {
    const fetchLookups = async () => {
      try {
        const [branchRes, classRes, sourceRes] = await Promise.all([
          api.get('/settings/branches'),
          api.get('/academics/classes'),
          api.get('/admissions/settings/lead-sources'),
        ]);

        const bList = branchRes.branches || branchRes.data || [];
        const cList = classRes.classes || classRes.data || [];
        const sList = sourceRes.leadSources || sourceRes.sources || sourceRes.data || [];

        setBranches(bList);
        setClasses(cList);
        setLeadSources(sList);

        if (selectedBranch?.id && selectedBranch.id !== 'all') {
          setSelectedBranchId(String(selectedBranch.id));
        } else if (bList.length > 0) {
          setSelectedBranchId(String(bList[0].id));
        } else {
          setLoading(false);
        }
      } catch (err) {
        console.error('Failed to load lookups:', err);
        setLoading(false);
      }
    };
    fetchLookups();
  }, []);

  // 1. First check branch workflow when branch changes
  useEffect(() => {
    if (!selectedBranchId) return;
    let isCancelled = false;

    const checkWorkflow = async () => {
      setLoading(true);
      setMessage(null);
      try {
        const res = await api.get(`/admissions/settings/workflow/${selectedBranchId}`);
        const data = res.workflow || res.data || res;

        if (!isCancelled) {
          if (data && typeof data.enable_enquiry !== 'undefined') {
            setWorkflow({
              enable_enquiry: Boolean(data.enable_enquiry),
              enable_application: Boolean(data.enable_application),
              allow_direct_enquiry_to_admission: Boolean(data.allow_direct_enquiry_to_admission),
              allow_direct_walkin_admission: Boolean(data.allow_direct_walkin_admission),
            });
          } else {
            setWorkflow({
              enable_enquiry: true,
              enable_application: true,
              allow_direct_enquiry_to_admission: true,
              allow_direct_walkin_admission: true,
            });
          }
        }
      } catch (err) {
        console.error('Failed to check admission workflow:', err);
      } finally {
        if (!isCancelled) {
          setCheckedBranchId(selectedBranchId);
        }
      }
    };

    checkWorkflow();
    return () => {
      isCancelled = true;
    };
  }, [selectedBranchId]);

  // 2. Fetch enquiries only if workflow is checked and Enquiry stage is enabled
  const fetchEnquiries = useCallback(async () => {
    if (!isWorkflowReady) return;

    if (!workflow.enable_enquiry) {
      setEnquiries([]);
      setRibbonMetrics({ all: 0, today: 0, overdue: 0, upcoming: 0 });
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedBranchId) params.append('branch_id', selectedBranchId);
      if (selectedAcademicYear?.id) params.append('academic_year_id', selectedAcademicYear.id);
      if (selectedClassId) params.append('class_id', selectedClassId);
      if (selectedLeadSourceId) params.append('lead_source_id', selectedLeadSourceId);
      if (selectedStatusTab !== 'all') params.append('status', selectedStatusTab);
      if (activeRibbonFilter !== 'all') params.append('filter', activeRibbonFilter);
      if (search) params.append('search', search);

      const res = await api.get(`/admissions/enquiries?${params.toString()}`);
      const list = res.enquiries || res.data || [];
      setEnquiries(list);

      // Compute or set ribbon counts if returned from API or calculate locally
      if (res.metrics) {
        setRibbonMetrics(res.metrics);
      } else {
        const todayStr = new Date().toISOString().slice(0, 10);
        let todayCount = 0;
        let overdueCount = 0;
        let upcomingCount = 0;

        list.forEach((e) => {
          if (!e.next_followup_date) return;
          const fDate = String(e.next_followup_date).slice(0, 10);
          if (fDate === todayStr) todayCount++;
          else if (fDate < todayStr && e.status !== 'converted' && e.status !== 'dropped') overdueCount++;
          else if (fDate > todayStr) upcomingCount++;
        });

        setRibbonMetrics({
          all: list.length,
          today: todayCount,
          overdue: overdueCount,
          upcoming: upcomingCount,
        });
      }
    } catch (err) {
      console.error('Failed to fetch enquiries:', err);
      setEnquiries([]);
    } finally {
      setLoading(false);
    }
  }, [
    isWorkflowReady,
    workflow.enable_enquiry,
    selectedBranchId,
    selectedAcademicYear?.id,
    selectedClassId,
    selectedLeadSourceId,
    selectedStatusTab,
    activeRibbonFilter,
    search,
  ]);

  useEffect(() => {
    if (selectedBranch?.id && selectedBranch.id !== 'all') {
      setSelectedBranchId(String(selectedBranch.id));
    }
  }, [selectedBranch?.id]);

  useEffect(() => {
    fetchEnquiries();
  }, [fetchEnquiries]);

  // Open follow-up modal
  const handleOpenFollowups = async (enquiry) => {
    setActiveFollowupEnquiry(enquiry);
    setLoadingFollowups(true);
    setFollowupForm({
      interaction_type: 'phone_call',
      followup_date: new Date().toISOString().slice(0, 16),
      next_followup_date: '',
      response_status: 'interested',
      notes: '',
    });

    try {
      const res = await api.get(`/admissions/enquiries/${enquiry.id}`);
      const details = res.enquiry || res.data || {};
      setFollowups(details.followups || details.enquiry_followups || []);
    } catch (err) {
      console.error('Failed to load enquiry details:', err);
      setFollowups([]);
    } finally {
      setLoadingFollowups(false);
    }
  };

  // Submit follow-up log
  const handleSubmitFollowup = async (e) => {
    e.preventDefault();
    if (!activeFollowupEnquiry) return;
    setSubmittingFollowup(true);

    try {
      await api.post(`/admissions/enquiries/${activeFollowupEnquiry.id}/followups`, followupForm);
      setMessage({ type: 'success', text: 'Follow-up interaction logged successfully.' });

      // Refresh follow-up list
      const res = await api.get(`/admissions/enquiries/${activeFollowupEnquiry.id}`);
      const details = res.enquiry || res.data || {};
      setFollowups(details.followups || details.enquiry_followups || []);

      // Reset form
      setFollowupForm((prev) => ({
        ...prev,
        notes: '',
        next_followup_date: '',
      }));

      fetchEnquiries();
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to log follow-up.' });
    } finally {
      setSubmittingFollowup(false);
    }
  };

  // Convert to Application
  const handleConvertToApplication = async (enquiry) => {
    if (!window.confirm(`Convert enquiry #${enquiry.enquiry_no} (${enquiry.student_name}) into an Application?`)) {
      return;
    }
    try {
      const res = await api.post(`/admissions/enquiries/${enquiry.id}/convert-to-application`);
      setMessage({
        type: 'success',
        text: `Enquiry converted! Application #${res.application_no || res.application?.application_no || 'created'}.`,
      });
      fetchEnquiries();
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Conversion to application failed.' });
    }
  };

  // Open Fast-track Direct Admission modal
  const handleOpenFastTrack = async (enquiry) => {
    setFastTrackEnquiry(enquiry);
    setFastTrackForm({
      section_id: '',
      admission_date: new Date().toISOString().slice(0, 10),
      admission_category: 'general',
      roll_no: '',
    });

    // Fetch sections for this class & branch
    try {
      const branchId = enquiry.branch_id || selectedBranchId;
      const classId = enquiry.class_id;
      const res = await api.get(`/academics/sections?branch_id=${branchId}&class_id=${classId}`);
      const secList = res.sections || res.data || [];
      setAvailableSections(secList);
      if (secList.length > 0) {
        setFastTrackForm((prev) => ({ ...prev, section_id: String(secList[0].id) }));
      }
    } catch (err) {
      console.error('Failed to fetch class sections:', err);
      setAvailableSections([]);
    }
  };

  // Submit Fast-Track Direct Admission
  const handleSubmitFastTrack = async (e) => {
    e.preventDefault();
    if (!fastTrackEnquiry) return;
    setSubmittingFastTrack(true);

    try {
      const res = await api.post(`/admissions/enquiries/${fastTrackEnquiry.id}/direct-admission`, {
        ...fastTrackForm,
        section_id: Number(fastTrackForm.section_id),
      });
      setMessage({
        type: 'success',
        text: `Student enrolled directly! Admission #${res.admission_no || res.admission?.admission_no || 'generated'}.`,
      });
      setFastTrackEnquiry(null);
      fetchEnquiries();
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Direct admission failed.' });
    } finally {
      setSubmittingFastTrack(false);
    }
  };

  const getStatusBadge = (status, stage) => {
    if (stage === 'admitted') return <Badge variant="active">Admitted</Badge>;
    if (stage === 'application') return <Badge variant="primary">Application Issued</Badge>;
    if (status === 'interested') return <Badge variant="primary">Interested</Badge>;
    if (status === 'callback_requested') return <Badge variant="upcoming">Callback</Badge>;
    if (status === 'converted') return <Badge variant="active">Converted</Badge>;
    if (status === 'dropped') return <Badge variant="inactive">Dropped</Badge>;
    return <Badge variant="default">Open</Badge>;
  };

  const formatFollowupDate = (dateStr) => {
    if (!dateStr) return <span className="text-slate-400">Not Scheduled</span>;
    const date = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const compare = new Date(dateStr);
    compare.setHours(0, 0, 0, 0);

    const isToday = compare.getTime() === today.getTime();
    const isPast = compare.getTime() < today.getTime();

    return (
      <div className="flex items-center gap-1.5 text-xs font-medium">
        <Clock
          className={`w-3.5 h-3.5 ${
            isPast ? 'text-rose-500' : isToday ? 'text-amber-500' : 'text-emerald-500'
          }`}
        />
        <span
          className={
            isPast ? 'text-rose-600 font-semibold' : isToday ? 'text-amber-600 font-semibold' : 'text-slate-600'
          }
        >
          {date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
          {isToday && ' (Today)'}
          {isPast && ' (Overdue)'}
        </span>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-border">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-brand-50 text-brand-600">
              <UserPlus className="w-5 h-5" />
            </span>
            <h1 className="text-2xl font-bold text-heading">Student Enquiries</h1>
          </div>
          <p className="text-sm text-muted mt-1">
            Capture prospective student leads, log counselor follow-up calls, and convert leads.
          </p>
        </div>

        {isWorkflowReady && workflow.enable_enquiry && (
          <button
            onClick={() => navigate('/admissions/enquiries/new')}
            className="flex items-center gap-2 px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-sm font-semibold shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>New Enquiry</span>
          </button>
        )}
      </div>

      {/* Show error message if Enquiry stage is inactive for selected branch */}
      {isWorkflowReady && !workflow.enable_enquiry ? (
        <div className="space-y-4">
          {branches.length > 1 && (
            <div className="bg-white border border-border rounded-2xl p-4 flex items-center gap-3 shadow-card">
              <Building2 className="w-4 h-4 text-brand-600" />
              <span className="text-sm font-medium text-slate-700">Select Branch:</span>
              <select
                value={selectedBranchId}
                onChange={(e) => setSelectedBranchId(e.target.value)}
                className="px-3 py-2 text-sm bg-slate-50 border border-border rounded-xl outline-none cursor-pointer"
              >
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="flex items-start gap-3 p-5 rounded-2xl border bg-rose-50 text-rose-800 border-rose-200">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-bold">Enquiry Stage is Inactive</p>
              <p className="text-rose-700 mt-1">
                Enquiry workflow is disabled for this branch. Please enable it in{' '}
                <button
                  type="button"
                  onClick={() => navigate('/settings/admission-workflow')}
                  className="underline font-semibold hover:text-rose-900"
                >
                  Admission Workflow Settings
                </button>{' '}
                {branches.length > 1 ? 'or switch to another branch.' : 'to use this module.'}
              </p>
            </div>
          </div>
        </div>
      ) : (
        <>
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

          {/* Top Metric Ribbons (Actionable KPI Cards) */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Today's Follow-ups */}
            <button
              type="button"
              onClick={() => setActiveRibbonFilter(activeRibbonFilter === 'today' ? 'all' : 'today')}
              className={`text-left p-4 rounded-2xl border transition-all ${
                activeRibbonFilter === 'today'
                  ? 'border-amber-500 bg-amber-50/50 shadow-md ring-2 ring-amber-100'
                  : 'border-border bg-white hover:border-amber-200'
              }`}
            >
              <div className="flex items-center justify-between text-xs font-semibold text-slate-500 mb-1">
                <span>Today's Follow-ups</span>
                <Clock className="w-4 h-4 text-amber-500" />
              </div>
              <div className="text-2xl font-bold text-amber-600">{ribbonMetrics.today}</div>
              <p className="text-[11px] text-muted mt-1">Scheduled for follow-up today</p>
            </button>

            {/* Overdue Follow-ups */}
            <button
              type="button"
              onClick={() => setActiveRibbonFilter(activeRibbonFilter === 'overdue' ? 'all' : 'overdue')}
              className={`text-left p-4 rounded-2xl border transition-all ${
                activeRibbonFilter === 'overdue'
                  ? 'border-rose-500 bg-rose-50/50 shadow-md ring-2 ring-rose-100'
                  : 'border-border bg-white hover:border-rose-200'
              }`}
            >
              <div className="flex items-center justify-between text-xs font-semibold text-slate-500 mb-1">
                <span>Overdue Follow-ups</span>
                <AlertTriangle className="w-4 h-4 text-rose-500" />
              </div>
              <div className="text-2xl font-bold text-rose-600">{ribbonMetrics.overdue}</div>
              <p className="text-[11px] text-muted mt-1">Pending past target date</p>
            </button>

            {/* Upcoming Follow-ups */}
            <button
              type="button"
              onClick={() => setActiveRibbonFilter(activeRibbonFilter === 'upcoming' ? 'all' : 'upcoming')}
              className={`text-left p-4 rounded-2xl border transition-all ${
                activeRibbonFilter === 'upcoming'
                  ? 'border-blue-500 bg-blue-50/50 shadow-md ring-2 ring-blue-100'
                  : 'border-border bg-white hover:border-blue-200'
              }`}
            >
              <div className="flex items-center justify-between text-xs font-semibold text-slate-500 mb-1">
                <span>Upcoming Follow-ups</span>
                <Calendar className="w-4 h-4 text-blue-500" />
              </div>
              <div className="text-2xl font-bold text-blue-600">{ribbonMetrics.upcoming}</div>
              <p className="text-[11px] text-muted mt-1">Scheduled in future days</p>
            </button>

            {/* All Enquiries */}
            <button
              type="button"
              onClick={() => setActiveRibbonFilter('all')}
              className={`text-left p-4 rounded-2xl border transition-all ${
                activeRibbonFilter === 'all'
                  ? 'border-brand-500 bg-brand-50/50 shadow-md ring-2 ring-brand-100'
                  : 'border-border bg-white hover:border-brand-200'
              }`}
            >
              <div className="flex items-center justify-between text-xs font-semibold text-slate-500 mb-1">
                <span>Total Enquiries</span>
                <UserPlus className="w-4 h-4 text-brand-500" />
              </div>
              <div className="text-2xl font-bold text-heading">{ribbonMetrics.all}</div>
              <p className="text-[11px] text-muted mt-1">Active prospect pipeline</p>
            </button>
          </div>

          {/* Filter Toolbar */}
          <div className="bg-white border border-border rounded-2xl p-4 shadow-card space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              {/* Search */}
              <div className="relative flex-1 min-w-[220px]">
                <Search className="w-4 h-4 text-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by student, parent, phone, enquiry no..."
                  className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 border border-border rounded-xl focus:bg-white focus:ring-2 focus:ring-brand-500 outline-none"
                />
              </div>

              {/* Branch filter */}
              <div className="w-48">
                <select
                  value={selectedBranchId}
                  onChange={(e) => setSelectedBranchId(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-border rounded-xl outline-none cursor-pointer"
                >
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Class filter */}
              <div className="w-40">
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

              {/* Lead Source filter */}
              <div className="w-44">
                <select
                  value={selectedLeadSourceId}
                  onChange={(e) => setSelectedLeadSourceId(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-border rounded-xl outline-none cursor-pointer"
                >
                  <option value="">All Sources</option>
                  {leadSources.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Status Tabs */}
            <div className="flex items-center gap-2 pt-2 border-t border-slate-100 overflow-x-auto text-xs font-medium">
              {[
                { key: 'all', label: 'All Enquiries' },
                { key: 'open', label: 'Open' },
                { key: 'interested', label: 'Interested' },
                { key: 'callback_requested', label: 'Callback Requested' },
                { key: 'converted', label: 'Converted' },
                { key: 'dropped', label: 'Dropped' },
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setSelectedStatusTab(tab.key)}
                  className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors ${
                    selectedStatusTab === tab.key
                      ? 'bg-brand-600 text-white shadow-xs'
                      : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Enquiries Table */}
          <div className="bg-white border border-border rounded-2xl shadow-card overflow-hidden">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-slate-50/75 border-b border-border text-xs uppercase font-semibold text-slate-500">
                  <th className="py-3.5 px-5">Enquiry No & Date</th>
                  <th className="py-3.5 px-5">Student / Class</th>
                  <th className="py-3.5 px-5">Parent & Contact</th>
                  <th className="py-3.5 px-5">Lead Source</th>
                  <th className="py-3.5 px-5">Next Follow-up</th>
                  <th className="py-3.5 px-5 text-center">Status</th>
                  <th className="py-3.5 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {loading || !isWorkflowReady ? (
                  <tr>
                    <td colSpan="7" className="py-12 text-center text-muted">
                      Loading enquiry records...
                    </td>
                  </tr>
                ) : enquiries.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="py-12 text-center text-muted">
                      No enquiries match current filters.
                    </td>
                  </tr>
                ) : (
                  enquiries.map((enq) => (
                    <tr key={enq.id} className="hover:bg-slate-50/50 transition-colors">
                      {/* Enquiry No */}
                      <td className="py-4 px-5">
                        <div className="font-mono font-bold text-heading">{enq.enquiry_no}</div>
                        <div className="text-[11px] text-muted">
                          {new Date(enq.created_at || Date.now()).toLocaleDateString('en-GB')}
                        </div>
                      </td>

                      {/* Student & Class */}
                      <td className="py-4 px-5">
                        <div className="font-semibold text-heading">{enq.student_name}</div>
                        <div className="text-xs text-muted flex items-center gap-1.5 mt-0.5">
                          <GraduationCap className="w-3.5 h-3.5 text-brand-600" />
                          <span>{enq.class_name || `Class ID: ${enq.class_id}`}</span>
                          <span className="text-slate-300">•</span>
                          <span className="capitalize">{enq.gender}</span>
                        </div>
                      </td>

                      {/* Parent */}
                      <td className="py-4 px-5">
                        <div className="font-medium text-slate-800">{enq.parent_name}</div>
                        <div className="text-xs text-muted flex items-center gap-1 mt-0.5">
                          <Phone className="w-3 h-3 text-slate-400" />
                          <span>{enq.primary_phone}</span>
                        </div>
                      </td>

                      {/* Lead Source */}
                      <td className="py-4 px-5">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700">
                          {enq.source_name || enq.lead_source_name || 'Walk-in'}
                        </span>
                      </td>

                      {/* Next Followup */}
                      <td className="py-4 px-5">{formatFollowupDate(enq.next_followup_date)}</td>

                      {/* Status Badge */}
                      <td className="py-4 px-5 text-center">
                        {getStatusBadge(enq.status, enq.stage)}
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-5 text-right space-x-1.5 whitespace-nowrap">
                        {/* Log / View Follow-ups */}
                        <button
                          onClick={() => handleOpenFollowups(enq)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-brand-50 text-slate-700 hover:text-brand-600 transition-colors"
                          title="Follow-up history & notes"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span>Follow-up</span>
                        </button>

                        {/* Convert to Application (only if Application stage is enabled) */}
                        {workflow.enable_application &&
                          enq.stage !== 'application' &&
                          enq.stage !== 'admitted' && (
                            <button
                              onClick={() => handleConvertToApplication(enq)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 transition-colors"
                              title="Convert to formal application"
                            >
                              <FileCheck className="w-3.5 h-3.5" />
                              <span>To App</span>
                            </button>
                          )}

                        {/* Fast-track Direct Admission (only if Fast-Track is enabled) */}
                        {workflow.allow_direct_enquiry_to_admission && enq.stage !== 'admitted' && (
                          <button
                            onClick={() => handleOpenFastTrack(enq)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 transition-colors"
                            title="Fast-track direct admission"
                          >
                            <Zap className="w-3.5 h-3.5" />
                            <span>Direct Admit</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Follow-up Timeline & New Interaction Modal */}
      <Modal
        isOpen={Boolean(activeFollowupEnquiry)}
        onClose={() => setActiveFollowupEnquiry(null)}
        title={
          activeFollowupEnquiry
            ? `Follow-up History: ${activeFollowupEnquiry.student_name} (${activeFollowupEnquiry.enquiry_no})`
            : 'Follow-ups'
        }
        maxWidth="max-w-2xl"
      >
        <div className="space-y-6">
          {/* Student summary banner */}
          {activeFollowupEnquiry && (
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
              <div>
                <span className="font-semibold text-heading block">
                  Parent: {activeFollowupEnquiry.parent_name} ({activeFollowupEnquiry.primary_phone})
                </span>
                <span className="text-muted">
                  Target Class: {activeFollowupEnquiry.class_name || activeFollowupEnquiry.class_id}
                </span>
              </div>
              <div className="text-right">
                <span className="text-muted block">Current Status:</span>
                <span className="font-semibold text-brand-600 capitalize">
                  {activeFollowupEnquiry.status}
                </span>
              </div>
            </div>
          )}

          {/* New Follow-up Log Form */}
          <form
            onSubmit={handleSubmitFollowup}
            className="p-4 bg-white border border-brand-200 rounded-xl space-y-3 shadow-xs"
          >
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <Send className="w-3.5 h-3.5 text-brand-600" />
              <span>Log New Interaction</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Channel</label>
                <select
                  value={followupForm.interaction_type}
                  onChange={(e) =>
                    setFollowupForm({ ...followupForm, interaction_type: e.target.value })
                  }
                  className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-border rounded-lg outline-none"
                >
                  <option value="phone_call">Phone Call</option>
                  <option value="campus_visit">Campus Visit</option>
                  <option value="whatsapp">WhatsApp</option>
                  <option value="email">Email</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Interaction Date
                </label>
                <input
                  type="datetime-local"
                  required
                  value={followupForm.followup_date}
                  onChange={(e) =>
                    setFollowupForm({ ...followupForm, followup_date: e.target.value })
                  }
                  className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-border rounded-lg outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Prospect Response
                </label>
                <select
                  value={followupForm.response_status}
                  onChange={(e) =>
                    setFollowupForm({ ...followupForm, response_status: e.target.value })
                  }
                  className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-border rounded-lg outline-none"
                >
                  <option value="interested">Interested</option>
                  <option value="callback_requested">Callback Requested</option>
                  <option value="form_issued">Form Issued</option>
                  <option value="not_interested">Not Interested / Dropped</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Next Follow-up Reminder Date
              </label>
              <input
                type="date"
                value={followupForm.next_followup_date}
                onChange={(e) =>
                  setFollowupForm({ ...followupForm, next_followup_date: e.target.value })
                }
                className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-border rounded-lg outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Discussion Notes <span className="text-rose-500">*</span>
              </label>
              <textarea
                required
                rows="2"
                value={followupForm.notes}
                onChange={(e) => setFollowupForm({ ...followupForm, notes: e.target.value })}
                placeholder="Log key discussion points, student academic background, parent preferences..."
                className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-border rounded-lg outline-none"
              />
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="submit"
                disabled={submittingFollowup}
                className="px-4 py-1.5 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-xs font-semibold transition-all disabled:opacity-50"
              >
                {submittingFollowup ? 'Saving...' : 'Add Log Entry'}
              </button>
            </div>
          </form>

          {/* Timeline of past interactions */}
          <div>
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
              Interaction Timeline ({followups.length})
            </h4>

            {loadingFollowups ? (
              <p className="text-xs text-muted py-4 text-center">Loading interactions...</p>
            ) : followups.length === 0 ? (
              <p className="text-xs text-muted py-4 text-center">
                No follow-ups recorded yet. Submit the form above to log the first discussion.
              </p>
            ) : (
              <div className="space-y-3 relative before:absolute before:inset-0 before:left-3.5 before:w-0.5 before:bg-slate-200">
                {followups.map((f, i) => (
                  <div key={f.id || i} className="relative flex items-start gap-4 pl-8">
                    <span className="absolute left-2 top-1.5 w-3.5 h-3.5 rounded-full border-2 border-white bg-brand-600 ring-2 ring-brand-100" />
                    <div className="flex-1 bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-slate-800 capitalize">
                          {f.interaction_type ? f.interaction_type.replace('_', ' ') : 'Phone Call'}
                        </span>
                        <span className="text-[11px] text-muted">
                          {new Date(f.followup_date || f.created_at).toLocaleString('en-GB')}
                        </span>
                      </div>
                      <p className="text-slate-600 mt-1 leading-relaxed">{f.notes}</p>
                      <div className="mt-2 pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px]">
                        <span className="text-muted">
                          Next Date:{' '}
                          <span className="font-semibold text-heading">
                            {f.next_followup_date ? String(f.next_followup_date).slice(0, 10) : 'None'}
                          </span>
                        </span>
                        <span className="font-medium text-brand-700 capitalize">
                          Status: {f.response_status ? f.response_status.replace('_', ' ') : 'Logged'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </Modal>

      {/* Fast-Track Direct Admission Modal */}
      <Modal
        isOpen={Boolean(fastTrackEnquiry)}
        onClose={() => setFastTrackEnquiry(null)}
        title="Fast-Track Direct Admission"
        maxWidth="max-w-lg"
      >
        {fastTrackEnquiry && (
          <form onSubmit={handleSubmitFastTrack} className="space-y-4">
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800">
              ⚡ Fast-track converts enquiry <strong>#{fastTrackEnquiry.enquiry_no}</strong> directly
              into confirmed admission without separate application paperwork.
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Student Name</label>
              <input
                type="text"
                disabled
                value={fastTrackEnquiry.student_name}
                className="w-full px-3 py-2 text-sm bg-slate-100 border border-border rounded-xl text-slate-600"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Target Class
                </label>
                <input
                  type="text"
                  disabled
                  value={fastTrackEnquiry.class_name || `Class ID: ${fastTrackEnquiry.class_id}`}
                  className="w-full px-3 py-2 text-sm bg-slate-100 border border-border rounded-xl text-slate-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Allot Section <span className="text-rose-500">*</span>
                </label>
                <select
                  required
                  value={fastTrackForm.section_id}
                  onChange={(e) =>
                    setFastTrackForm({ ...fastTrackForm, section_id: e.target.value })
                  }
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-border rounded-xl outline-none cursor-pointer"
                >
                  {availableSections.length === 0 ? (
                    <option value="">No sections found</option>
                  ) : (
                    availableSections.map((sec) => (
                      <option key={sec.id} value={sec.id}>
                        Section {sec.name} (Cap: {sec.capacity || 40})
                      </option>
                    ))
                  )}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Admission Date <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={fastTrackForm.admission_date}
                  onChange={(e) =>
                    setFastTrackForm({ ...fastTrackForm, admission_date: e.target.value })
                  }
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-border rounded-xl outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Category</label>
                <select
                  value={fastTrackForm.admission_category}
                  onChange={(e) =>
                    setFastTrackForm({ ...fastTrackForm, admission_category: e.target.value })
                  }
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-border rounded-xl outline-none cursor-pointer"
                >
                  <option value="general">General</option>
                  <option value="rte">RTE (Right to Education)</option>
                  <option value="sibling">Sibling Concession</option>
                  <option value="staff_child">Staff Child</option>
                  <option value="scholarship">Merit Scholarship</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Roll Number (Optional)
              </label>
              <input
                type="text"
                value={fastTrackForm.roll_no}
                onChange={(e) => setFastTrackForm({ ...fastTrackForm, roll_no: e.target.value })}
                placeholder="e.g. 101"
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-border rounded-xl outline-none"
              />
            </div>

            <div className="pt-4 flex justify-end gap-3 border-t border-border">
              <button
                type="button"
                onClick={() => setFastTrackEnquiry(null)}
                className="px-4 py-2 border border-border rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submittingFastTrack || !fastTrackForm.section_id}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold shadow-sm transition-all disabled:opacity-50"
              >
                {submittingFastTrack ? 'Confirming...' : 'Confirm Admission'}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};