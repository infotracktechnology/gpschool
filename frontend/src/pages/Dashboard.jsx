import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import ReactECharts from 'echarts-for-react';
import {
  Users,
  UserCheck,
  Briefcase,
  UserPlus,
  ClipboardCheck,
  ShieldAlert,
  HeartPulse,
  Award,
  Package,
  Calendar,
  CalendarRange,
  Building2,
  BookOpen,
  Bell,
  ArrowRight,
  RefreshCw,
  Clock,
  CheckCircle2,
  AlertTriangle,
  PlusCircle,
  Pill,
  LifeBuoy,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { Badge } from '../components/common/Badge';

export const Dashboard = () => {
  const navigate = useNavigate();
  const { user, selectedBranch, selectedAcademicYear } = useAuth();
  const activeBranch = selectedBranch && selectedBranch.id !== 'all' ? selectedBranch : null;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [leftChartTab, setLeftChartTab] = useState('strength'); // 'strength' | 'attendance'
  const [rightChartTab, setRightChartTab] = useState('admissions'); // 'admissions' | 'certificates'

  const [overview, setOverview] = useState({
    kpis: {},
    charts: {
      classStrength: [],
      attendanceTrend: [],
      admissionsFunnel: [],
      certificateMix: [],
    },
    queues: {
      pendingCertificates: [],
      pendingLeaves: [],
      pendingAppointments: [],
      urgentConcerns: [],
      activeVisitors: [],
      activeBays: [],
      medicineAlerts: [],
      upcomingEvents: [],
      recentHomework: [],
      recentAnnouncements: [],
    },
    sessionMappings: [],
  });

  const fetchOverview = useCallback(async (isManual = false) => {
    try {
      if (isManual) setRefreshing(true);
      else setLoading(true);

      const params = new URLSearchParams();
      if (selectedBranch?.id && selectedBranch.id !== 'all') {
        params.set('branch_id', selectedBranch.id);
      }
      if (selectedAcademicYear?.id) {
        params.set('academic_year_id', selectedAcademicYear.id);
      }
      const q = params.toString();
      const res = await api.get(`/dashboard/overview${q ? `?${q}` : ''}`);
      if (res.success) {
        setOverview({
          kpis: res.kpis || {},
          charts: res.charts || { classStrength: [], attendanceTrend: [], admissionsFunnel: [], certificateMix: [] },
          queues: res.queues || {},
          sessionMappings: res.sessionMappings || [],
        });
      }
    } catch (err) {
      console.error('Failed to load executive overview:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedBranch?.id, selectedAcademicYear?.id]);

  useEffect(() => {
    fetchOverview();
  }, [fetchOverview]);

  const { kpis, charts, queues, sessionMappings } = overview;

  // ECharts Options
  const classStrengthOption = useMemo(() => {
    const data = charts.classStrength || [];
    return {
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
      grid: { left: 40, right: 16, top: 20, bottom: 38 },
      xAxis: {
        type: 'category',
        data: data.map((d) => d.class_name),
        axisLine: { lineStyle: { color: '#e2e8f0' } },
        axisLabel: { color: '#475569', fontSize: 11, rotate: data.length > 8 ? 25 : 0 },
      },
      yAxis: {
        type: 'value',
        minInterval: 1,
        splitLine: { lineStyle: { color: '#f1f5f9' } },
        axisLabel: { color: '#64748b', fontSize: 11 },
      },
      series: [
        {
          name: 'Active Students',
          type: 'bar',
          barMaxWidth: 34,
          data: data.map((d) => d.student_count),
          itemStyle: {
            borderRadius: [6, 6, 0, 0],
            color: '#4f46e5',
          },
        },
      ],
    };
  }, [charts.classStrength]);

  const attendanceTrendOption = useMemo(() => {
    const data = charts.attendanceTrend || [];
    return {
      tooltip: { trigger: 'axis' },
      legend: { bottom: 0, textStyle: { fontSize: 11, color: '#475569' } },
      grid: { left: 40, right: 16, top: 20, bottom: 40 },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: data.map((d) => d.label),
        axisLine: { lineStyle: { color: '#e2e8f0' } },
        axisLabel: { color: '#475569', fontSize: 11 },
      },
      yAxis: {
        type: 'value',
        minInterval: 1,
        splitLine: { lineStyle: { color: '#f1f5f9' } },
        axisLabel: { color: '#64748b', fontSize: 11 },
      },
      series: [
        {
          name: 'Present',
          type: 'line',
          smooth: true,
          data: data.map((d) => d.present),
          itemStyle: { color: '#10b981' },
          areaStyle: { color: 'rgba(16, 185, 129, 0.14)' },
        },
        {
          name: 'Absent',
          type: 'line',
          smooth: true,
          data: data.map((d) => d.absent),
          itemStyle: { color: '#f43f5e' },
          areaStyle: { color: 'rgba(244, 63, 94, 0.08)' },
        },
      ],
    };
  }, [charts.attendanceTrend]);

  const admissionsFunnelOption = useMemo(() => {
    const data = charts.admissionsFunnel || [];
    const colors = ['#0ea5e9', '#6366f1', '#10b981'];
    return {
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
      grid: { left: 88, right: 24, top: 18, bottom: 24 },
      xAxis: {
        type: 'value',
        minInterval: 1,
        splitLine: { lineStyle: { color: '#f1f5f9' } },
        axisLabel: { color: '#64748b', fontSize: 11 },
      },
      yAxis: {
        type: 'category',
        inverse: true,
        data: data.map((d) => d.stage),
        axisLine: { lineStyle: { color: '#e2e8f0' } },
        axisLabel: { color: '#334155', fontSize: 12, fontWeight: 600 },
      },
      series: [
        {
          type: 'bar',
          barMaxWidth: 26,
          data: data.map((d, idx) => ({
            value: d.count,
            itemStyle: { color: colors[idx % colors.length], borderRadius: [0, 6, 6, 0] },
          })),
          label: { show: true, position: 'right', fontSize: 11, fontWeight: 700, color: '#1e293b' },
        },
      ],
    };
  }, [charts.admissionsFunnel]);

  const certificateMixOption = useMemo(() => {
    const labelMap = {
      bonafide: 'Bonafide',
      tc: 'Transfer (TC)',
      study: 'Study Cert',
      conduct: 'Conduct',
      character: 'Character',
      custom: 'Custom / Merit',
    };
    const data = (charts.certificateMix || []).map((c) => ({
      name: labelMap[c.type] || c.type,
      value: c.count,
    }));
    return {
      tooltip: { trigger: 'item' },
      legend: { bottom: 0, textStyle: { fontSize: 11, color: '#475569' } },
      series: [
        {
          name: 'Certificates',
          type: 'pie',
          radius: ['42%', '70%'],
          center: ['50%', '44%'],
          avoidLabelOverlap: true,
          label: { show: false },
          data: data.length > 0 ? data : [{ name: 'No Issued Certificates', value: 0 }],
        },
      ],
    };
  }, [charts.certificateMix]);

  const approvalItems = [
    ...(queues.pendingCertificates || []).map((c) => ({
      id: `cert-${c.id}`,
      badge: 'Certificate',
      badgeTone: 'bg-indigo-50 text-indigo-700 border-indigo-200',
      title: `${c.recipient_name} (${c.certificate_no})`,
      sub: `${c.certificate_type?.toUpperCase()} • ${c.class_or_dept || 'Record'}`,
      to: `/certificates/approvals/${c.id}`,
    })),
    ...(queues.pendingLeaves || []).map((l) => ({
      id: `leave-${l.id}`,
      badge: 'Staff Leave',
      badgeTone: 'bg-amber-50 text-amber-700 border-amber-200',
      title: l.staff_name || 'Staff Leave Request',
      sub: `${l.total_days || 1} day(s) • ${l.department || 'Faculty'}`,
      to: '/staff/leaves',
    })),
    ...(queues.pendingAppointments || []).map((a) => ({
      id: `apt-${a.id}`,
      badge: 'Visitor Apt',
      badgeTone: 'bg-sky-50 text-sky-700 border-sky-200',
      title: `${a.visitor_name} -> ${a.person_to_meet_name}`,
      sub: `${a.appointment_date} at ${a.appointment_time}`,
      to: '/visitors/appointments',
    })),
    ...(queues.urgentConcerns || []).map((t) => ({
      id: `conc-${t.id}`,
      badge: t.is_overdue ? 'SLA Overdue' : 'Concern Desk',
      badgeTone: t.is_overdue
        ? 'bg-rose-50 text-rose-700 border-rose-200'
        : 'bg-slate-100 text-slate-700 border-slate-200',
      title: `${t.ticket_no}: ${t.title}`,
      sub: `${t.concern_type} • Priority: ${t.priority}`,
      to: '/concerns',
    })),
  ].slice(0, 7);

  const quickShortcuts = [
    { label: 'Take Attendance', desc: 'Daily student roll-call', to: '/attendance/daily', icon: UserCheck, tone: 'bg-emerald-50 text-emerald-600' },
    { label: 'Student Directory', desc: 'Profiles & enrollments', to: '/students', icon: Users, tone: 'bg-indigo-50 text-indigo-600' },
    { label: 'Admissions Desk', desc: 'Enquiries & applications', to: '/admissions/enquiries', icon: UserPlus, tone: 'bg-sky-50 text-sky-600' },
    { label: 'Log Gate Visitor', desc: 'Entry pass & badge', to: '/visitors/entry', icon: Building2, tone: 'bg-violet-50 text-violet-600' },
    { label: 'Infirmary Desk', desc: 'Patient bay & checkups', to: '/health/infirmary', icon: HeartPulse, tone: 'bg-rose-50 text-rose-600' },
    { label: 'Issue Certificate', desc: 'Bonafide, TC & Study', to: '/certificates/bonafide/new', icon: Award, tone: 'bg-amber-50 text-amber-600' },
    { label: 'Communication', desc: 'Homework & circulars', to: '/communication/homework', icon: BookOpen, tone: 'bg-cyan-50 text-cyan-600' },
    { label: 'Inventory & Stock', desc: 'Assets & purchase orders', to: '/inventory', icon: Package, tone: 'bg-slate-100 text-slate-700' },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* 1. Compact Executive Header (No Hero Banner) */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-xl border border-slate-200 bg-white flex items-center justify-center overflow-hidden p-1 shrink-0">
            <img
              src={activeBranch?.logo || '/assets/logo.png'}
              alt={activeBranch?.name || 'Campus ERP'}
              onError={(e) => {
                if (!e.currentTarget.src.endsWith('/assets/logo.png')) {
                  e.currentTarget.src = '/assets/logo.png';
                }
              }}
              className="w-full h-full object-contain"
            />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
                Campus Operations Dashboard
              </h1>
              <span className="px-2.5 py-0.5 text-[11px] font-semibold rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                {activeBranch ? `${activeBranch.name} (${activeBranch.code})` : 'All Campuses Global View'}
              </span>
              {selectedAcademicYear && (
                <span className="px-2.5 py-0.5 text-[11px] font-mono font-semibold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  AY {selectedAcademicYear.code}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Signed in as <strong className="text-slate-700">{user?.name || 'Administrator'}</strong> • Live telemetry across Academics, Attendance, Admissions, Health, Gate Security, Certificates &amp; Inventory.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => fetchOverview(true)}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            type="button"
            onClick={() => navigate('/attendance/daily')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition"
          >
            <UserCheck className="w-3.5 h-3.5" />
            Take Attendance
          </button>
          <button
            type="button"
            onClick={() => navigate('/certificates/bonafide/new')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 shadow-xs transition"
          >
            <Award className="w-3.5 h-3.5" />
            Issue Certificate
          </button>
        </div>
      </div>

      {/* 2. Row 1: 6 Live Operational KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        <Link to="/students" className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs hover:border-indigo-300 transition">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Students</span>
            <Users className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-extrabold text-slate-900 mt-2">{loading ? '—' : kpis.active_students ?? 0}</div>
          <div className="text-[11px] text-slate-500 mt-1">
            {kpis.total_classes || 0} Classes • {kpis.total_sections || 0} Sections
          </div>
        </Link>

        <Link to="/attendance/daily" className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs hover:border-emerald-300 transition">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Attendance</span>
            <UserCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-extrabold text-emerald-700 mt-2">
            {loading ? '—' : kpis.attendance_pct !== null && kpis.attendance_pct !== undefined ? `${kpis.attendance_pct}%` : 'Not Marked'}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            {kpis.student_present_today || 0} Present • {kpis.student_absent_today || 0} Absent
          </div>
        </Link>

        <Link to="/staff" className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs hover:border-blue-300 transition">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Staff Roster</span>
            <Briefcase className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-extrabold text-slate-900 mt-2">{loading ? '—' : kpis.total_staff ?? 0}</div>
          <div className="text-[11px] text-slate-500 mt-1">
            {kpis.teaching_staff || 0} Teaching • {kpis.staff_present_today || 0} Checked In
          </div>
        </Link>

        <Link to="/admissions/enquiries" className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs hover:border-sky-300 transition">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Admissions</span>
            <UserPlus className="w-4 h-4 text-sky-600" />
          </div>
          <div className="text-2xl font-extrabold text-slate-900 mt-2">
            {loading ? '—' : (kpis.total_enquiries || 0) + (kpis.total_applications || 0)}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            {kpis.open_enquiries || 0} Open Enq • {kpis.total_admissions || 0} Admitted
          </div>
        </Link>

        <Link
          to="/certificates/approvals"
          className={`bg-white p-4 rounded-2xl border shadow-xs transition ${
            (kpis.total_pending_approvals || 0) > 0
              ? 'border-amber-300 hover:border-amber-400'
              : 'border-slate-200/80 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700">Approvals</span>
            <ClipboardCheck className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-extrabold text-amber-700 mt-2">{loading ? '—' : kpis.total_pending_approvals ?? 0}</div>
          <div className="text-[11px] text-slate-500 mt-1 truncate">
            {kpis.pending_certificates || 0} Cert • {kpis.pending_leaves || 0} Leave • {kpis.pending_appointments || 0} Gate
          </div>
        </Link>

        <Link
          to="/health/dashboard"
          className={`bg-white p-4 rounded-2xl border shadow-xs transition ${
            (kpis.visitors_overstayed || 0) + (kpis.overdue_concerns || 0) + (kpis.health_in_bay || 0) > 0
              ? 'border-rose-200 hover:border-rose-300'
              : 'border-slate-200/80 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-rose-700">Campus Pulse</span>
            <HeartPulse className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-2xl font-extrabold text-slate-900 mt-2">
            {loading ? '—' : (kpis.health_in_bay || 0) + (kpis.visitors_active_now || 0) + (kpis.open_concerns || 0)}
          </div>
          <div className="text-[11px] text-slate-500 mt-1 truncate">
            {kpis.health_in_bay || 0} Bay • {kpis.visitors_active_now || 0} Gate • {kpis.open_concerns || 0} Tickets
          </div>
        </Link>
      </div>

      {/* 3. Row 2: Two Interactive ECharts Visual Analytics Panels */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
        {/* Left Chart: Class Strength / Attendance Trend */}
        <div className="xl:col-span-7 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                {leftChartTab === 'strength' ? 'Class-wise Student Strength' : '7-Day Student Attendance Trend'}
              </h2>
              <p className="text-xs text-slate-500">
                {leftChartTab === 'strength'
                  ? 'Active student enrollment across classes in current scope'
                  : 'Daily present vs absent headcount over recent school days'}
              </p>
            </div>
            <div className="inline-flex rounded-xl bg-slate-100 p-1">
              <button
                type="button"
                onClick={() => setLeftChartTab('strength')}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition ${
                  leftChartTab === 'strength' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600'
                }`}
              >
                Class Strength
              </button>
              <button
                type="button"
                onClick={() => setLeftChartTab('attendance')}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition ${
                  leftChartTab === 'attendance' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600'
                }`}
              >
                7-Day Attendance
              </button>
            </div>
          </div>

          {leftChartTab === 'strength' ? (
            (charts.classStrength || []).length === 0 ? (
              <div className="h-64 flex items-center justify-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-xl">
                No classes or active enrollments recorded for this scope yet.
              </div>
            ) : (
              <ReactECharts option={classStrengthOption} style={{ height: 260 }} notMerge />
            )
          ) : (charts.attendanceTrend || []).length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-xl gap-2">
              <span>No student attendance records logged in the last 30 days.</span>
              <Link to="/attendance/daily" className="text-indigo-600 font-semibold hover:underline">
                Mark Today&apos;s Attendance
              </Link>
            </div>
          ) : (
            <ReactECharts option={attendanceTrendOption} style={{ height: 260 }} notMerge />
          )}
        </div>

        {/* Right Chart: Admissions Funnel / Certificates Breakdown */}
        <div className="xl:col-span-5 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                {rightChartTab === 'admissions' ? 'Admissions Conversion Funnel' : 'Certificates & Operations Mix'}
              </h2>
              <p className="text-xs text-slate-500">
                {rightChartTab === 'admissions'
                  ? 'Enquiries -> Applications -> Finalized Admissions'
                  : `${kpis.issued_certificates || 0} Issued • ${kpis.certificate_reprints || 0} Printed Copies`}
              </p>
            </div>
            <div className="inline-flex rounded-xl bg-slate-100 p-1">
              <button
                type="button"
                onClick={() => setRightChartTab('admissions')}
                className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition ${
                  rightChartTab === 'admissions' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600'
                }`}
              >
                Admissions
              </button>
              <button
                type="button"
                onClick={() => setRightChartTab('certificates')}
                className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition ${
                  rightChartTab === 'certificates' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600'
                }`}
              >
                Certificates
              </button>
            </div>
          </div>

          {rightChartTab === 'admissions' ? (
            <ReactECharts option={admissionsFunnelOption} style={{ height: 260 }} notMerge />
          ) : (charts.certificateMix || []).length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-xl gap-2">
              <span>No certificates issued in this session yet.</span>
              <Link to="/certificates/bonafide/new" className="text-indigo-600 font-semibold hover:underline">
                Generate First Certificate
              </Link>
            </div>
          ) : (
            <ReactECharts option={certificateMixOption} style={{ height: 260 }} notMerge />
          )}
        </div>
      </div>

      {/* 4. Row 3: Live Action Queues & Campus Pulse Feeds */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Panel 1: Approvals & Urgent Desk */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <ClipboardCheck className="w-4 h-4 text-amber-600" />
                Approvals &amp; Desk Queue
              </h3>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                {approvalItems.length} active
              </span>
            </div>

            {approvalItems.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-xl space-y-1">
                <Sparkles className="w-5 h-5 mx-auto text-emerald-500" />
                <p>All caught up! Zero pending approvals or open desk tickets.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {approvalItems.map((item) => (
                  <Link
                    key={item.id}
                    to={item.to}
                    className="py-2.5 flex items-center justify-between gap-2 hover:bg-slate-50/80 rounded-lg px-1.5 transition"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className={`px-1.5 py-0.5 text-[10px] font-bold rounded border ${item.badgeTone}`}>
                          {item.badge}
                        </span>
                        <span className="text-xs font-semibold text-slate-900 truncate">{item.title}</span>
                      </div>
                      <div className="text-[11px] text-slate-500 truncate mt-0.5">{item.sub}</div>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  </Link>
                ))}
              </div>
            )}
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
            <Link to="/concerns" className="text-slate-600 hover:text-indigo-600 font-semibold flex items-center gap-1">
              <LifeBuoy className="w-3.5 h-3.5" /> Concern Desk
            </Link>
            <Link to="/certificates/approvals" className="text-indigo-600 hover:text-indigo-700 font-semibold">
              Review All &rarr;
            </Link>
          </div>
        </div>

        {/* Panel 2: Live Infirmary, Gate Security & Stock Alerts */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-rose-600" />
                Live Gate, Infirmary &amp; Stock
              </h3>
              <span className="text-[11px] font-semibold text-slate-500">
                POs Open: {kpis.open_pos || 0}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center">
              <Link to="/visitors/exit" className="p-2.5 rounded-xl bg-violet-50/70 border border-violet-100 hover:border-violet-300">
                <div className="text-base font-extrabold text-violet-800">{kpis.visitors_active_now || 0}</div>
                <div className="text-[10px] font-semibold text-violet-700">Active Visitors</div>
              </Link>
              <Link to="/health/infirmary" className="p-2.5 rounded-xl bg-rose-50/70 border border-rose-100 hover:border-rose-300">
                <div className="text-base font-extrabold text-rose-800">{kpis.health_in_bay || 0}</div>
                <div className="text-[10px] font-semibold text-rose-700">In Sick Bay</div>
              </Link>
              <Link to="/inventory/items?low_stock=true" className="p-2.5 rounded-xl bg-amber-50/70 border border-amber-100 hover:border-amber-300">
                <div className="text-base font-extrabold text-amber-800">
                  {(kpis.inventory_low_stock || 0) + (kpis.med_low_stock || 0)}
                </div>
                <div className="text-[10px] font-semibold text-amber-700">Low Stock</div>
              </Link>
            </div>

            <div className="divide-y divide-slate-100">
              {(queues.activeVisitors || []).slice(0, 2).map((v) => (
                <Link key={`vis-${v.id}`} to="/visitors/exit" className="py-2 flex items-center justify-between text-xs hover:bg-slate-50 px-1 rounded">
                  <div className="min-w-0">
                    <div className="font-semibold text-slate-900 truncate">{v.visitor_name} ({v.pass_number})</div>
                    <div className="text-[11px] text-slate-500 truncate">Meeting {v.person_to_meet_name} • {v.elapsed_minutes}m inside</div>
                  </div>
                  {v.is_overstayed ? (
                    <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-rose-100 text-rose-700">Overstay</span>
                  ) : (
                    <span className="px-1.5 py-0.5 text-[10px] font-semibold rounded bg-emerald-50 text-emerald-700">On Campus</span>
                  )}
                </Link>
              ))}

              {(queues.activeBays || []).slice(0, 2).map((b) => (
                <Link key={`bay-${b.id}`} to="/health/infirmary" className="py-2 flex items-center justify-between text-xs hover:bg-slate-50 px-1 rounded">
                  <div className="min-w-0">
                    <div className="font-semibold text-slate-900 truncate">{b.patient_name} (Bed {b.bed_number || '1'})</div>
                    <div className="text-[11px] text-slate-500 truncate">{b.chief_complaint}</div>
                  </div>
                  <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-rose-50 text-rose-700">Resting</span>
                </Link>
              ))}

              {(queues.medicineAlerts || []).slice(0, 2).map((m) => (
                <Link key={`med-${m.id}`} to="/health/inventory" className="py-2 flex items-center justify-between text-xs hover:bg-slate-50 px-1 rounded">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <Pill className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <span className="font-medium text-slate-800 truncate">{m.medicine_name}</span>
                  </div>
                  <span className="text-[11px] font-bold text-amber-700 shrink-0">{m.quantity_available} {m.unit}</span>
                </Link>
              ))}

              {(queues.activeVisitors || []).length === 0 &&
                (queues.activeBays || []).length === 0 &&
                (queues.medicineAlerts || []).length === 0 && (
                  <div className="py-6 text-center text-xs text-slate-400">
                    Gate is clear, infirmary bays empty &amp; medicine stock healthy.
                  </div>
                )}
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
            <Link to="/visitors" className="text-slate-600 hover:text-indigo-600 font-semibold">Gate Security</Link>
            <Link to="/health/dashboard" className="text-rose-600 hover:text-rose-700 font-semibold">Infirmary Desk &rarr;</Link>
          </div>
        </div>

        {/* Panel 3: Calendar & Communication Updates */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-cyan-600" />
                Calendar &amp; Communication
              </h3>
              <div className="text-[11px] text-slate-500">
                {kpis.total_homework || 0} HW • {kpis.total_announcements || 0} Notices
              </div>
            </div>

            <div className="space-y-2">
              {(queues.upcomingEvents || []).slice(0, 3).map((ev) => (
                <Link
                  key={`ev-${ev.id}`}
                  to="/academics/calendar"
                  className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/70 flex items-center justify-between gap-2 hover:border-indigo-200"
                >
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-slate-900 truncate">{ev.title}</div>
                    <div className="text-[11px] text-slate-500 capitalize">{ev.event_type?.replace(/_/g, ' ')}</div>
                  </div>
                  <span className="font-mono text-[11px] font-bold text-indigo-700 bg-white px-2 py-0.5 rounded border border-slate-200 shrink-0">
                    {ev.start_date}
                  </span>
                </Link>
              ))}

              {(queues.recentAnnouncements || []).slice(0, 2).map((an) => (
                <Link
                  key={`an-${an.id}`}
                  to="/communication/announcement"
                  className="py-1.5 px-1 flex items-center justify-between gap-2 text-xs hover:bg-slate-50 rounded"
                >
                  <div className="flex items-center gap-1.5 min-w-0">
                    <Bell className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    <span className="font-medium text-slate-800 truncate">{an.title}</span>
                  </div>
                  <span className="text-[10px] text-slate-400 shrink-0">{an.created_date}</span>
                </Link>
              ))}

              {(queues.recentHomework || []).slice(0, 2).map((hw) => (
                <Link
                  key={`hw-${hw.id}`}
                  to="/communication/homework"
                  className="py-1.5 px-1 flex items-center justify-between gap-2 text-xs hover:bg-slate-50 rounded"
                >
                  <div className="flex items-center gap-1.5 min-w-0">
                    <BookOpen className="w-3.5 h-3.5 text-cyan-600 shrink-0" />
                    <span className="font-medium text-slate-800 truncate">
                      {hw.subject_name || 'Homework'}: {hw.title}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 shrink-0">{hw.class_name || 'Class'}</span>
                </Link>
              ))}

              {(queues.upcomingEvents || []).length === 0 &&
                (queues.recentAnnouncements || []).length === 0 &&
                (queues.recentHomework || []).length === 0 && (
                  <div className="py-6 text-center text-xs text-slate-400">
                    No upcoming calendar events or communication posts yet.
                  </div>
                )}
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
            <Link to="/academics/calendar" className="text-slate-600 hover:text-indigo-600 font-semibold">Academic Calendar</Link>
            <Link to="/communication/homework" className="text-cyan-700 hover:text-cyan-800 font-semibold">Communication Hub &rarr;</Link>
          </div>
        </div>
      </div>

      {/* 5. Row 4: Operational Quick Launch Hub */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Quick Operational Launchpad</h2>
            <p className="text-xs text-slate-500">Jump straight to everyday campus workflows.</p>
          </div>
          <div className="hidden sm:flex items-center gap-3 text-[11px] text-slate-500">
            <span>Campuses: <strong className="text-slate-800">{kpis.branches_count || 0}</strong></span>
            <span>Boards: <strong className="text-slate-800">{kpis.boards_count || 0}</strong></span>
            <span>Active Users: <strong className="text-slate-800">{kpis.users_count || 0}</strong></span>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-8 gap-3">
          {quickShortcuts.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                className="group p-3.5 rounded-xl border border-slate-200/80 bg-slate-50/50 hover:bg-white hover:border-indigo-300 hover:shadow-xs transition flex flex-col justify-between gap-2"
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${item.tone}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900 group-hover:text-indigo-700 leading-snug">{item.label}</div>
                  <div className="text-[10px] text-slate-500 mt-0.5 leading-tight">{item.desc}</div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* 6. Row 5: Campus Session Schedules (Scoped to active Branch & Academic Year) */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-slate-900">Campus Session Schedules</h2>
              {selectedAcademicYear && (
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                  {selectedAcademicYear.code}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Configured campus branch academic calendar dates
            </p>
          </div>
          <Link
            to="/settings/branch-year-mappings"
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
          >
            Manage Mappings <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {sessionMappings.length === 0 ? (
          <div className="py-6 text-center text-slate-500 border border-dashed border-slate-200 rounded-xl">
            <Clock className="w-6 h-6 mx-auto text-slate-300 mb-1.5" />
            <p className="text-xs font-medium">No session schedule mapped for this campus/year yet.</p>
            <Link
              to="/settings/branch-year-mappings/create"
              className="inline-flex items-center gap-1 text-xs text-indigo-600 font-semibold mt-1.5 hover:underline"
            >
              <PlusCircle className="w-3.5 h-3.5" /> Map Academic Session
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 font-medium">
                  <th className="pb-2.5 font-semibold">Campus Branch</th>
                  <th className="pb-2.5 font-semibold">Board</th>
                  <th className="pb-2.5 font-semibold">Academic Year</th>
                  <th className="pb-2.5 font-semibold">Start Date</th>
                  <th className="pb-2.5 font-semibold">End Date</th>
                  <th className="pb-2.5 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sessionMappings.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-2.5 font-semibold text-slate-900">
                      {m.branch_name}{' '}
                      <span className="text-[10px] text-slate-400 font-mono">({m.branch_code})</span>
                    </td>
                    <td className="py-2.5">
                      <span className="font-semibold text-purple-700 bg-purple-50 border border-purple-200 px-1.5 py-0.5 rounded">
                        {m.board_code}
                      </span>
                    </td>
                    <td className="py-2.5 font-semibold text-slate-800 font-mono">{m.academic_year_code}</td>
                    <td className="py-2.5 text-slate-600">{m.start_date}</td>
                    <td className="py-2.5 text-slate-600">{m.end_date}</td>
                    <td className="py-2.5">
                      <Badge variant={m.status}>{m.status}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
