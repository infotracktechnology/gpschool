import React, { useState, useEffect, useCallback } from 'react';
import {
  BarChart3,
  TrendingUp,
  PieChart,
  Calendar,
  Building2,
  Users,
  Filter,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Clock,
  Layers,
  GraduationCap,
  Download,
  Share2,
} from 'lucide-react';
import { api } from '../../api/client';
import { Badge } from '../../components/common/Badge';

export const AdmissionReports = () => {
  const [activeTab, setActiveTab] = useState('funnel'); // 'funnel' | 'capacity' | 'log'

  const [branches, setBranches] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);
  const [selectedBranchId, setSelectedBranchId] = useState('');
  const [selectedAcademicYearId, setSelectedAcademicYearId] = useState('');

  // Date range for Log report
  const [fromDate, setFromDate] = useState(
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  );
  const [toDate, setToDate] = useState(new Date().toISOString().slice(0, 10));

  // Report 1: Conversion Funnel data
  const [funnelData, setFunnelData] = useState({
    enquiries: 0,
    applications: 0,
    approved: 0,
    admissions: 0,
    sources: [],
  });

  // Report 2: Capacity Roster data
  const [capacityData, setCapacityData] = useState({
    total_capacity: 0,
    total_enrolled: 0,
    total_vacancy: 0,
    sections: [],
  });

  // Report 3: Enquiry & Follow-up Log data
  const [logData, setLogData] = useState({
    metrics: {
      new_enquiries: 0,
      followups_logged: 0,
      converted: 0,
      dropped: 0,
    },
    activities: [],
  });

  const [loading, setLoading] = useState(true);

  // Load branches and academic years
  useEffect(() => {
    const fetchLookups = async () => {
      try {
        const [branchRes, yearRes] = await Promise.all([
          api.get('/settings/branches'),
          api.get('/settings/academic-years'),
        ]);

        const bList = branchRes.branches || branchRes.data || [];
        const yList = yearRes.academicYears || yearRes.data || [];

        setBranches(bList);
        setAcademicYears(yList);

        if (bList.length > 0) setSelectedBranchId(String(bList[0].id));
        if (yList.length > 0) {
          const activeYear = yList.find((y) => y.status === 'active') || yList[0];
          setSelectedAcademicYearId(String(activeYear.id));
        }
      } catch (err) {
        console.error('Failed to load lookups:', err);
      }
    };
    fetchLookups();
  }, []);

  // Fetch Report 1: Funnel
  const fetchFunnelReport = useCallback(async () => {
    if (!selectedBranchId) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('branch_id', selectedBranchId);
      if (selectedAcademicYearId) params.append('academic_year_id', selectedAcademicYearId);

      const res = await api.get(`/admissions/reports/conversion-funnel?${params.toString()}`);
      const data = res.data || res;
      setFunnelData({
        enquiries: data.funnel?.total_enquiries ?? data.enquiries ?? 0,
        applications: data.funnel?.total_applications ?? data.applications ?? 0,
        approved: data.funnel?.total_admissions ?? data.approved ?? 0,
        admissions: data.funnel?.total_admissions ?? data.admissions ?? 0,
        sources: (data.lead_sources || data.sources || []).map((s) => ({
          ...s,
          name: s.name || s.lead_source_name || s.source_name || 'Direct',
          enquiries: s.enquiries ?? s.total_enquiries ?? 0,
          applications: s.applications ?? s.converted_applications ?? 0,
          admissions: s.admissions ?? s.confirmed_admissions ?? 0,
        })),
      });
    } catch (err) {
      console.error('Failed to load funnel report:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedBranchId, selectedAcademicYearId]);

  // Fetch Report 2: Capacity Roster
  const fetchCapacityReport = useCallback(async () => {
    if (!selectedBranchId) return;
    setLoading(true);
    try {
      const res = await api.get(`/admissions/reports/capacity-roster?branch_id=${selectedBranchId}`);
      const data = res.data || res;
      setCapacityData({
        total_capacity: data.summary?.total_capacity ?? data.total_capacity ?? 0,
        total_enrolled: data.summary?.total_admitted ?? data.total_enrolled ?? 0,
        total_vacancy: data.summary?.total_vacancies ?? data.total_vacancy ?? 0,
        sections: (data.roster || data.sections || []).map((sec) => ({
          ...sec,
          enrolled: sec.enrolled ?? sec.admitted_count ?? 0,
          class_name: sec.class_name,
          section_name: sec.section_name || sec.name,
        })),
      });
    } catch (err) {
      console.error('Failed to load capacity report:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedBranchId]);

  // Fetch Report 3: Enquiry & Followup Log
  const fetchLogReport = useCallback(async () => {
    if (!selectedBranchId) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('branch_id', selectedBranchId);
      if (fromDate) params.append('start_date', fromDate);
      if (toDate) params.append('end_date', toDate);

      const res = await api.get(`/admissions/reports/enquiry-status-log?${params.toString()}`);
      const data = res.data || res;
      const logs = data.log || data.activities || [];
      const newEnq = logs.length;
      const converted = logs.filter((l) => l.stage === 'admitted' || l.status === 'converted').length;
      const dropped = logs.filter((l) => l.stage === 'dropped' || l.status === 'dropped').length;
      const followups = logs.reduce((acc, curr) => acc + (Number(curr.total_followups) || 0), 0);

      setLogData({
        metrics: data.metrics || {
          new_enquiries: newEnq,
          followups_logged: followups,
          converted,
          dropped,
        },
        activities: logs.map((l) => ({
          ...l,
          timestamp: l.created_at,
          type: l.interaction_type || 'enquiry',
          student_name: l.student_name,
          parent_name: l.parent_name,
          notes: l.remarks || `Class: ${l.class_name || 'N/A'} | Stage: ${l.stage} | Status: ${l.status}`,
          status: l.status || l.stage,
        })),
      });
    } catch (err) {
      console.error('Failed to load log report:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedBranchId, fromDate, toDate]);

  useEffect(() => {
    if (activeTab === 'funnel') {
      fetchFunnelReport();
    } else if (activeTab === 'capacity') {
      fetchCapacityReport();
    } else if (activeTab === 'log') {
      fetchLogReport();
    }
  }, [activeTab, fetchFunnelReport, fetchCapacityReport, fetchLogReport]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-border">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-brand-50 text-brand-600">
              <BarChart3 className="w-5 h-5" />
            </span>
            <h1 className="text-2xl font-bold text-heading">Admission Executive Reports</h1>
          </div>
          <p className="text-sm text-muted mt-1">
            Conversion analytics by lead channel, section seat capacity vacancy, and activity logs.
          </p>
        </div>

        {/* Global Branch & Year Selector */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-white px-3 py-2 border border-border rounded-xl shadow-sm">
            <Building2 className="w-4 h-4 text-brand-600" />
            <select
              value={selectedBranchId}
              onChange={(e) => setSelectedBranchId(e.target.value)}
              className="text-sm font-medium text-heading bg-transparent outline-none cursor-pointer"
            >
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 bg-white px-3 py-2 border border-border rounded-xl shadow-sm">
            <Calendar className="w-4 h-4 text-indigo-600" />
            <select
              value={selectedAcademicYearId}
              onChange={(e) => setSelectedAcademicYearId(e.target.value)}
              className="text-sm font-medium text-heading bg-transparent outline-none cursor-pointer"
            >
              {academicYears.map((y) => (
                <option key={y.id} value={y.id}>
                  {y.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Report Switcher Tabs */}
      <div className="flex items-center gap-3 border-b border-border pb-1">
        <button
          type="button"
          onClick={() => setActiveTab('funnel')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
            activeTab === 'funnel'
              ? 'bg-brand-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          <span>1. Lead Source & Conversion Funnel</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('capacity')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
            activeTab === 'capacity'
              ? 'bg-brand-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>2. Capacity vs Enrollment Roster</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('log')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
            activeTab === 'log'
              ? 'bg-brand-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>3. Enquiry & Follow-up Log</span>
        </button>
      </div>

      {/* REPORT 1: CONVERSION FUNNEL */}
      {activeTab === 'funnel' && (
        <div className="space-y-6">
          {/* Visual Funnel Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Step 1: Enquiries */}
            <div className="bg-white border-2 border-brand-200 rounded-2xl p-5 shadow-card relative">
              <span className="text-xs font-bold uppercase tracking-wider text-brand-600 block mb-1">
                Step 1: Enquiries
              </span>
              <div className="text-3xl font-extrabold text-heading">
                {funnelData.enquiries || 0}
              </div>
              <p className="text-xs text-muted mt-1">Total leads captured</p>
            </div>

            {/* Step 2: Applications */}
            <div className="bg-white border-2 border-indigo-200 rounded-2xl p-5 shadow-card relative">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 block mb-1">
                Step 2: Applications
              </span>
              <div className="text-3xl font-extrabold text-heading">
                {funnelData.applications || 0}
              </div>
              <div className="text-xs text-indigo-700 font-semibold mt-1">
                {funnelData.enquiries > 0
                  ? `${Math.round((funnelData.applications / funnelData.enquiries) * 100)}% lead conversion`
                  : '—'}
              </div>
            </div>

            {/* Step 3: Approved */}
            <div className="bg-white border-2 border-blue-200 rounded-2xl p-5 shadow-card relative">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-600 block mb-1">
                Step 3: Approved
              </span>
              <div className="text-3xl font-extrabold text-heading">
                {funnelData.approved || 0}
              </div>
              <div className="text-xs text-blue-700 font-semibold mt-1">
                {funnelData.applications > 0
                  ? `${Math.round((funnelData.approved / funnelData.applications) * 100)}% approval rate`
                  : '—'}
              </div>
            </div>

            {/* Step 4: Confirmed Admissions */}
            <div className="bg-white border-2 border-emerald-300 bg-emerald-50/20 rounded-2xl p-5 shadow-card relative">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 block mb-1">
                Step 4: Confirmed Admissions
              </span>
              <div className="text-3xl font-extrabold text-emerald-800">
                {funnelData.admissions || 0}
              </div>
              <div className="text-xs text-emerald-700 font-semibold mt-1">
                {funnelData.enquiries > 0
                  ? `${Math.round((funnelData.admissions / funnelData.enquiries) * 100)}% overall funnel conversion`
                  : '—'}
              </div>
            </div>
          </div>

          {/* Lead Source Breakdown Table */}
          <div className="bg-white border border-border rounded-2xl shadow-card overflow-hidden">
            <div className="p-4 border-b border-border bg-slate-50/50 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-heading text-sm">
                  Lead Source Attribution & Conversion Efficiency
                </h3>
                <p className="text-xs text-muted">
                  Performance across walk-in, digital campaigns, referrals, and outreach.
                </p>
              </div>
            </div>

            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-slate-50/75 border-b border-border text-xs uppercase font-semibold text-slate-500">
                  <th className="py-3 px-5">Lead Channel</th>
                  <th className="py-3 px-5 text-right">Enquiries</th>
                  <th className="py-3 px-5 text-right">Applications</th>
                  <th className="py-3 px-5 text-right">Admitted</th>
                  <th className="py-3 px-5 text-center">Conversion %</th>
                  <th className="py-3 px-5">Funnel Velocity</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {loading ? (
                  <tr>
                    <td colSpan="6" className="py-10 text-center text-muted">
                      Calculating source funnel metrics...
                    </td>
                  </tr>
                ) : !funnelData.sources || funnelData.sources.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="py-10 text-center text-muted">
                      No lead attribution data recorded for this branch/session yet.
                    </td>
                  </tr>
                ) : (
                  funnelData.sources.map((src, i) => {
                    const convPct = src.enquiries > 0 ? Math.round((src.admissions / src.enquiries) * 100) : 0;
                    return (
                      <tr key={src.id || i} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-3.5 px-5 font-semibold text-heading flex items-center gap-2">
                          <Share2 className="w-4 h-4 text-brand-600" />
                          <span>{src.name || src.source_name}</span>
                        </td>
                        <td className="py-3.5 px-5 text-right font-mono font-medium text-slate-700">
                          {src.enquiries || 0}
                        </td>
                        <td className="py-3.5 px-5 text-right font-mono font-medium text-slate-700">
                          {src.applications || 0}
                        </td>
                        <td className="py-3.5 px-5 text-right font-mono font-bold text-emerald-700">
                          {src.admissions || 0}
                        </td>
                        <td className="py-3.5 px-5 text-center">
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold ${
                              convPct >= 50
                                ? 'bg-emerald-100 text-emerald-800'
                                : convPct >= 25
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {convPct}%
                          </span>
                        </td>
                        <td className="py-3.5 px-5">
                          <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden max-w-[120px]">
                            <div
                              className="bg-brand-600 h-2 rounded-full"
                              style={{ width: `${Math.min(100, convPct)}%` }}
                            />
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* REPORT 2: CAPACITY VS ENROLLMENT ROSTER */}
      {activeTab === 'capacity' && (
        <div className="space-y-6">
          {/* Summary Badges */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white border border-border rounded-2xl p-5 shadow-card">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Total Campus Seat Capacity
              </span>
              <div className="text-2xl font-bold text-heading mt-1">
                {capacityData.total_capacity || 0} seats
              </div>
              <p className="text-xs text-muted mt-1">Configured across all class sections</p>
            </div>

            <div className="bg-white border border-border rounded-2xl p-5 shadow-card">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Total Admitted & Enrolled
              </span>
              <div className="text-2xl font-bold text-emerald-700 mt-1">
                {capacityData.total_enrolled || 0} students
              </div>
              <p className="text-xs text-emerald-600 font-medium mt-1">
                {capacityData.total_capacity > 0
                  ? `${Math.round((capacityData.total_enrolled / capacityData.total_capacity) * 100)}% overall occupancy`
                  : '0% occupancy'}
              </p>
            </div>

            <div className="bg-white border border-border rounded-2xl p-5 shadow-card">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Available Vacancy
              </span>
              <div className="text-2xl font-bold text-blue-700 mt-1">
                {capacityData.total_vacancy || 0} vacant seats
              </div>
              <p className="text-xs text-muted mt-1">Remaining seats open for admission</p>
            </div>
          </div>

          {/* Section Wise Capacity Table */}
          <div className="bg-white border border-border rounded-2xl shadow-card overflow-hidden">
            <div className="p-4 border-b border-border bg-slate-50/50">
              <h3 className="font-bold text-heading text-sm">
                Class & Section Quota Allocation Matrix
              </h3>
              <p className="text-xs text-muted">
                Live utilization meter preventing over-subscription in any section.
              </p>
            </div>

            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-slate-50/75 border-b border-border text-xs uppercase font-semibold text-slate-500">
                  <th className="py-3 px-5">Class & Section</th>
                  <th className="py-3 px-5 text-center">Max Capacity</th>
                  <th className="py-3 px-5 text-center">Admitted</th>
                  <th className="py-3 px-5 text-center">Vacancy</th>
                  <th className="py-3 px-5">Utilization Progress</th>
                  <th className="py-3 px-5 text-center">Quota Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {loading ? (
                  <tr>
                    <td colSpan="6" className="py-10 text-center text-muted">
                      Checking section capacity quotas...
                    </td>
                  </tr>
                ) : !capacityData.sections || capacityData.sections.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="py-10 text-center text-muted">
                      No classes/sections mapped for this campus branch.
                    </td>
                  </tr>
                ) : (
                  capacityData.sections.map((sec, i) => {
                    const cap = sec.capacity || 40;
                    const enrolled = sec.enrolled || 0;
                    const vacant = Math.max(0, cap - enrolled);
                    const pct = Math.round((enrolled / cap) * 100);

                    return (
                      <tr key={sec.id || i} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-3.5 px-5 font-semibold text-heading flex items-center gap-2">
                          <GraduationCap className="w-4 h-4 text-brand-600" />
                          <span>
                            {sec.class_name || `Class ${sec.class_id}`} — Section {sec.section_name || sec.name}
                          </span>
                        </td>
                        <td className="py-3.5 px-5 text-center font-mono font-medium text-slate-700">
                          {cap}
                        </td>
                        <td className="py-3.5 px-5 text-center font-mono font-bold text-emerald-700">
                          {enrolled}
                        </td>
                        <td className="py-3.5 px-5 text-center font-mono font-bold text-blue-700">
                          {vacant}
                        </td>
                        <td className="py-3.5 px-5">
                          <div className="flex items-center gap-3">
                            <div className="flex-1 bg-slate-100 rounded-full h-2.5 overflow-hidden">
                              <div
                                className={`h-2.5 rounded-full transition-all ${
                                  pct >= 90
                                    ? 'bg-rose-500'
                                    : pct >= 70
                                    ? 'bg-amber-500'
                                    : 'bg-emerald-500'
                                }`}
                                style={{ width: `${Math.min(100, pct)}%` }}
                              />
                            </div>
                            <span className="text-xs font-mono font-semibold text-slate-700 w-10 text-right">
                              {pct}%
                            </span>
                          </div>
                        </td>
                        <td className="py-3.5 px-5 text-center">
                          {pct >= 100 ? (
                            <Badge variant="inactive">Seats Full</Badge>
                          ) : pct >= 80 ? (
                            <Badge variant="upcoming">Fast Filling</Badge>
                          ) : (
                            <Badge variant="active">Seats Open</Badge>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* REPORT 3: ENQUIRY & FOLLOW-UP LOG */}
      {activeTab === 'log' && (
        <div className="space-y-6">
          {/* Date Range Filter Bar */}
          <div className="bg-white border border-border rounded-2xl p-4 shadow-card flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Activity Date Range:
              </span>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-xs font-medium text-slate-600">From:</label>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="px-3 py-1.5 text-xs bg-slate-50 border border-border rounded-lg outline-none"
              />
            </div>

            <div className="flex items-center gap-2">
              <label className="text-xs font-medium text-slate-600">To:</label>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="px-3 py-1.5 text-xs bg-slate-50 border border-border rounded-lg outline-none"
              />
            </div>

            <button
              onClick={fetchLogReport}
              className="px-4 py-1.5 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-xs font-semibold transition-all ml-auto"
            >
              Apply Filter
            </button>
          </div>

          {/* Metric cards for the date range */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white border border-border rounded-2xl p-4 shadow-card">
              <span className="text-xs font-semibold text-slate-500 uppercase">New Inquiries</span>
              <div className="text-2xl font-bold text-heading mt-1">
                {logData.metrics?.new_enquiries || 0}
              </div>
            </div>

            <div className="bg-white border border-border rounded-2xl p-4 shadow-card">
              <span className="text-xs font-semibold text-slate-500 uppercase">Follow-ups Logged</span>
              <div className="text-2xl font-bold text-indigo-600 mt-1">
                {logData.metrics?.followups_logged || 0}
              </div>
            </div>

            <div className="bg-white border border-border rounded-2xl p-4 shadow-card">
              <span className="text-xs font-semibold text-slate-500 uppercase">Converted Leads</span>
              <div className="text-2xl font-bold text-emerald-600 mt-1">
                {logData.metrics?.converted || 0}
              </div>
            </div>

            <div className="bg-white border border-border rounded-2xl p-4 shadow-card">
              <span className="text-xs font-semibold text-slate-500 uppercase">Dropped Leads</span>
              <div className="text-2xl font-bold text-rose-600 mt-1">
                {logData.metrics?.dropped || 0}
              </div>
            </div>
          </div>

          {/* Chronological Activity Log Table */}
          <div className="bg-white border border-border rounded-2xl shadow-card overflow-hidden">
            <div className="p-4 border-b border-border bg-slate-50/50">
              <h3 className="font-bold text-heading text-sm">Chronological Interaction Feed</h3>
              <p className="text-xs text-muted">
                Audit trail of phone calls, visits, counselor notes, and lead transitions.
              </p>
            </div>

            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-slate-50/75 border-b border-border text-xs uppercase font-semibold text-slate-500">
                  <th className="py-3 px-5">Timestamp</th>
                  <th className="py-3 px-5">Event Channel</th>
                  <th className="py-3 px-5">Candidate / Parent</th>
                  <th className="py-3 px-5">Discussion Notes</th>
                  <th className="py-3 px-5 text-right">Outcome / Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {loading ? (
                  <tr>
                    <td colSpan="5" className="py-10 text-center text-muted">
                      Retrieving activity log entries...
                    </td>
                  </tr>
                ) : !logData.activities || logData.activities.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="py-10 text-center text-muted">
                      No interactions recorded in the selected date window.
                    </td>
                  </tr>
                ) : (
                  logData.activities.map((act, i) => (
                    <tr key={act.id || i} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-3.5 px-5 font-mono text-xs text-slate-600 whitespace-nowrap">
                        {new Date(act.timestamp || act.created_at).toLocaleString('en-GB')}
                      </td>
                      <td className="py-3.5 px-5">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-800 capitalize">
                          {act.type ? act.type.replace('_', ' ') : 'Phone Call'}
                        </span>
                      </td>
                      <td className="py-3.5 px-5">
                        <div className="font-semibold text-heading">{act.student_name}</div>
                        <div className="text-xs text-muted">{act.parent_name}</div>
                      </td>
                      <td className="py-3.5 px-5 text-xs text-slate-600 max-w-md">
                        {act.notes || act.remarks || '—'}
                      </td>
                      <td className="py-3.5 px-5 text-right font-medium text-xs capitalize text-brand-700">
                        {act.status ? act.status.replace('_', ' ') : 'Active'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
