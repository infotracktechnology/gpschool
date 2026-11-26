import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  HeartPulse,
  Bed,
  AlertTriangle,
  Pill,
  Stethoscope,
  Bell,
  Plus,
  RefreshCw,
  ArrowRight,
  PhoneCall,
  Calendar,
  Package,
  Heart,
  Printer,
  Edit,
} from 'lucide-react';
import { api } from '../../api/client';

export const HealthDashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    kpis: {
      today_visits: 0,
      in_bay_now: 0,
      sent_home_today: 0,
      back_to_class_today: 0,
      allergy_flags: 0,
      chronic_flags: 0,
      total_dossiers: 0,
      inventory_alerts_count: 0,
      upcoming_followups_count: 0,
    },
    activeBays: [],
    recentVisits: [],
    visitTypeBreakdown: [],
    inventoryAlerts: [],
    upcomingFollowUps: [],
    recentNotifications: [],
  });

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const res = await api.get('/health/dashboard');
      if (res.success) {
        setData({
          kpis: res.kpis || {},
          activeBays: res.activeBays || [],
          recentVisits: res.recentVisits || [],
          visitTypeBreakdown: res.visitTypeBreakdown || [],
          inventoryAlerts: res.inventoryAlerts || [],
          upcomingFollowUps: res.upcomingFollowUps || [],
          recentNotifications: res.recentNotifications || [],
        });
      }
    } catch (err) {
      console.error('Error loading health dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider bg-rose-50 text-rose-700 border border-rose-200/60">
              Campus Health Command Center
            </span>
            <span className="text-xs text-emerald-600 font-medium flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Infirmary Live Status
            </span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 mt-1">Health &amp; Infirmary Overview</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Live bed bay monitoring, triage metrics, medicine stock expiry alerts, consultation follow-ups, and parent notifications.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={fetchDashboard}
            className="px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            type="button"
            onClick={() => navigate('/health/notifications/new')}
            className="px-3.5 py-2 text-xs font-semibold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-xl flex items-center gap-1.5"
          >
            <Bell className="w-3.5 h-3.5" />
            Notify Parent
          </button>
          <button
            type="button"
            onClick={() => navigate('/health/infirmary/new')}
            className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            Log Infirmary Visit
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Visits Today</p>
          <p className="text-2xl font-extrabold text-slate-900 mt-1">{data.kpis.today_visits}</p>
          <span className="text-[10px] text-slate-500">Triage intakes</span>
        </div>
        <div className="bg-amber-50/70 p-4 rounded-2xl border border-amber-200 shadow-xs">
          <p className="text-[11px] font-bold text-amber-700 uppercase tracking-wider">In Resting Bay</p>
          <p className="text-2xl font-extrabold text-amber-900 mt-1">{data.kpis.in_bay_now}</p>
          <span className="text-[10px] text-amber-700">Currently occupied</span>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Sent Home Today</p>
          <p className="text-2xl font-extrabold text-rose-600 mt-1">{data.kpis.sent_home_today}</p>
          <span className="text-[10px] text-slate-500">Parent pick-up</span>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Allergy / Chronic</p>
          <p className="text-2xl font-extrabold text-indigo-700 mt-1">
            {data.kpis.allergy_flags} / {data.kpis.chronic_flags}
          </p>
          <span className="text-[10px] text-slate-500">Active medical flags</span>
        </div>
        <div
          className={`p-4 rounded-2xl border shadow-xs ${
            data.kpis.inventory_alerts_count > 0
              ? 'bg-rose-50 border-rose-200'
              : 'bg-white border-slate-200/80'
          }`}
        >
          <p className="text-[11px] font-bold text-rose-600 uppercase tracking-wider">Stock Alerts</p>
          <p className="text-2xl font-extrabold text-rose-800 mt-1">{data.kpis.inventory_alerts_count}</p>
          <span className="text-[10px] text-rose-600">Low stock / Expiring</span>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Follow-Ups</p>
          <p className="text-2xl font-extrabold text-emerald-700 mt-1">{data.kpis.upcoming_followups_count}</p>
          <span className="text-[10px] text-slate-500">Doctor review due</span>
        </div>
      </div>

      {/* Quick Module Shortcuts */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5">
        {[
          { label: 'Infirmary Desk', path: '/health/infirmary', icon: HeartPulse },
          { label: 'Health Profiles', path: '/health/profiles', icon: Heart },
          { label: 'Check-ups', path: '/health/checkups', icon: Stethoscope },
          { label: 'Medicines', path: '/health/medicines', icon: Pill },
          { label: 'Medicine Stock', path: '/health/inventory', icon: Package },
          { label: 'Consultations', path: '/health/consultations', icon: Printer },
          { label: 'Parent Alerts', path: '/health/notifications', icon: Bell },
          { label: 'Emergency SOS', path: '/health/emergency', icon: PhoneCall },
        ].map((btn) => {
          const Icon = btn.icon;
          return (
            <button
              key={btn.path}
              type="button"
              onClick={() => navigate(btn.path)}
              className="p-2.5 bg-white hover:bg-rose-50/70 border border-slate-200 hover:border-rose-200 rounded-xl text-[11px] font-bold text-slate-700 flex items-center gap-1.5 transition-colors"
            >
              <Icon className="w-3.5 h-3.5 text-rose-600 shrink-0" />
              <span className="truncate">{btn.label}</span>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Columns: Live Resting Bay Monitor & Recent Visits */}
        <div className="lg:col-span-2 space-y-6">
          {/* Live Bed Bay Monitor */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Bed className="w-4 h-4 text-amber-600" />
                Live Resting Bay Monitor ({data.activeBays.length} Occupied)
              </h2>
              <button
                type="button"
                onClick={() => navigate('/health/infirmary')}
                className="text-xs font-bold text-rose-700 hover:underline flex items-center gap-1"
              >
                Open Triage Desk <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {data.activeBays.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">
                All infirmary resting bays are currently vacant.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {data.activeBays.map((b) => (
                  <div key={b.id} className="p-3.5 rounded-xl bg-amber-50/60 border border-amber-200 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-amber-900 bg-white px-2 py-0.5 rounded border border-amber-200">
                        {b.bed_number || 'Bay Unassigned'}
                      </span>
                      <span className="font-mono text-[10px] text-slate-500">{b.visit_time}</span>
                    </div>
                    <div>
                      <p className="font-bold text-slate-900">{b.patient_name}</p>
                      <p className="text-[11px] text-slate-600">
                        {b.patient_type === 'student' ? b.class_section : `Staff (${b.department || 'General'})`}
                      </p>
                    </div>
                    <p className="text-[11px] text-slate-700 line-clamp-1">
                      <strong>Complaint:</strong> {b.chief_complaint}
                    </p>
                    <div className="flex items-center justify-end gap-1.5 pt-1 border-t border-amber-200/60">
                      {b.student_id && (
                        <button
                          type="button"
                          onClick={() =>
                            navigate(`/health/notifications/new?studentId=${b.student_id}&visitId=${b.id}`)
                          }
                          className="px-2 py-1 bg-white hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-lg text-[10px] font-bold"
                        >
                          Notify Parent
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => navigate(`/health/infirmary/${b.id}/edit`)}
                        className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-[10px] font-bold flex items-center gap-1"
                      >
                        <Edit className="w-3 h-3" /> Update Status
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Upcoming Doctor Consultation Follow-Ups */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-emerald-600" />
                Upcoming Doctor Follow-Ups
              </h2>
              <button
                type="button"
                onClick={() => navigate('/health/consultations')}
                className="text-xs font-bold text-rose-700 hover:underline flex items-center gap-1"
              >
                All Consultations <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {data.upcomingFollowUps.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">No pending doctor follow-up dates scheduled.</p>
            ) : (
              <div className="divide-y divide-slate-100 text-xs">
                {data.upcomingFollowUps.map((f) => (
                  <div key={f.id} className="py-2.5 flex items-center justify-between gap-3">
                    <div>
                      <p className="font-bold text-slate-900">
                        {f.patient_name} <span className="font-normal text-slate-500">({f.class_or_dept})</span>
                      </p>
                      <p className="text-[11px] text-slate-500">
                        {f.diagnosis} • Attending: {f.doctor_name}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="px-2 py-0.5 rounded bg-emerald-50 border border-emerald-200 text-emerald-800 font-mono text-[11px] font-bold">
                        {new Date(f.follow_up_date).toLocaleDateString()}
                      </span>
                      <button
                        type="button"
                        onClick={() => navigate(`/health/consultations/${f.id}/print`)}
                        className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700"
                        title="View Prescription Slip"
                      >
                        <Printer className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Inventory Alerts & Parent Notification Log */}
        <div className="space-y-6">
          {/* Medicine Inventory Alerts */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                Stock &amp; Expiry Alerts
              </h3>
              <button
                type="button"
                onClick={() => navigate('/health/inventory')}
                className="text-xs font-bold text-rose-700 hover:underline"
              >
                Manage Stock
              </button>
            </div>

            {data.inventoryAlerts.length === 0 ? (
              <p className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-center">
                All infirmary medicines are adequately stocked &amp; valid.
              </p>
            ) : (
              <div className="space-y-2">
                {data.inventoryAlerts.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => navigate(`/health/inventory/${item.id}/edit`)}
                    className="p-3 rounded-xl bg-rose-50/70 border border-rose-200 text-xs cursor-pointer hover:bg-rose-100/70 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900">{item.medicine_name}</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-rose-100 text-rose-800">
                        {item.status.replace('_', ' ')}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 mt-0.5">
                      Available: <strong>{item.quantity_available} {item.unit}</strong> (Min: {item.reorder_level})
                      {item.expiry_date && ` • Exp: ${new Date(item.expiry_date).toLocaleDateString()}`}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Parent Notifications */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Bell className="w-4 h-4 text-amber-600" />
                Recent Parent Alerts
              </h3>
              <button
                type="button"
                onClick={() => navigate('/health/notifications')}
                className="text-xs font-bold text-rose-700 hover:underline"
              >
                View Logs
              </button>
            </div>

            {data.recentNotifications.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">No parent notifications logged yet.</p>
            ) : (
              <div className="space-y-2.5">
                {data.recentNotifications.map((n) => (
                  <div key={n.id} className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs space-y-0.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900">{n.student_name}</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-700">
                        {n.response_status}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 line-clamp-2">{n.message_summary}</p>
                    <p className="text-[10px] text-slate-400">
                      {n.channel} • {new Date(n.notified_at).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
