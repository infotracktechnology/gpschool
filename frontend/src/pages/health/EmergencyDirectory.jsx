import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  PhoneCall,
  Search,
  Filter,
  ShieldAlert,
  Ambulance,
  Phone,
  AlertTriangle,
  User,
  Users,
  Building2,
  ExternalLink,
  Bell
} from 'lucide-react';
import { api } from '../../api/client';

export const EmergencyDirectory = () => {
  const navigate = useNavigate();
  const [directory, setDirectory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchDirectory();
  }, []);

  const fetchDirectory = async () => {
    try {
      setLoading(true);
      const res = await api.get('/health/emergency-directory');
      if (res.success) {
        setDirectory(res.directory || []);
      }
    } catch (err) {
      console.error('Error fetching emergency directory:', err);
    } finally {
      setLoading(false);
    }
  };

  const filtered = directory.filter((st) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      st.student_name?.toLowerCase().includes(term) ||
      st.admission_no?.toLowerCase().includes(term) ||
      st.class_name?.toLowerCase().includes(term) ||
      st.father_phone?.includes(term) ||
      st.mother_phone?.includes(term) ||
      st.emergency_contact_phone?.includes(term) ||
      st.blood_group?.toLowerCase().includes(term)
    );
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider bg-rose-50 text-rose-700 border border-rose-200/60">
              Immediate Response Desk
            </span>
            <span className="text-xs text-rose-600 font-bold flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
              24/7 Hotline Reference
            </span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 mt-1">Emergency Contacts & SOS Directory</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Instant parent contact directory, critical allergy alerts, and campus medical emergency hospital lines.
          </p>
        </div>

        <button
          type="button"
          onClick={() => navigate('/health/notifications')}
          className="px-4 py-2 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-xs font-bold rounded-xl flex items-center gap-1.5 self-start md:self-auto"
        >
          <Bell className="w-4 h-4" /> Parent Notification Logs
        </button>
      </div>

      {/* Emergency Hotlines Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-rose-50 border border-rose-200/80 p-4 rounded-2xl flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-sm">
            <Ambulance className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-rose-700">Campus Ambulance</p>
            <a href="tel:108" className="text-lg font-black text-rose-950 font-mono hover:underline">
              108 / 102
            </a>
            <p className="text-[10px] text-rose-600">Immediate Dispatch</p>
          </div>
        </div>

        <div className="bg-indigo-50 border border-indigo-200/80 p-4 rounded-2xl flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-sm">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-700">Tie-up Hospital</p>
            <a href="tel:04423456789" className="text-sm font-black text-indigo-950 font-mono hover:underline">
              044-23456789
            </a>
            <p className="text-[10px] text-indigo-600">Apollo Children's Hospital</p>
          </div>
        </div>

        <div className="bg-emerald-50 border border-emerald-200/80 p-4 rounded-2xl flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm">
            <PhoneCall className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">School Infirmary</p>
            <span className="text-base font-black text-emerald-950 font-mono">
              Ext: 201 / 202
            </span>
            <p className="text-[10px] text-emerald-600">Nurse Station Direct</p>
          </div>
        </div>

        <div className="bg-amber-50 border border-amber-200/80 p-4 rounded-2xl flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-amber-600 text-white flex items-center justify-center shrink-0 shadow-sm">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-amber-700">Police / SOS</p>
            <a href="tel:112" className="text-lg font-black text-amber-950 font-mono hover:underline">
              112 / 100
            </a>
            <p className="text-[10px] text-amber-600">City Emergency Control</p>
          </div>
        </div>
      </div>

      {/* Student Emergency Contacts Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <PhoneCall className="w-4 h-4 text-rose-600" />
              Student Emergency Contact Directory
            </h2>
            <p className="text-xs text-slate-400">Class-wise contact directory for swift parental reach</p>
          </div>

          <div className="relative w-full md:w-72">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by student, class, phone, blood..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full text-xs font-medium border border-slate-200 rounded-xl pl-8 pr-3 py-1.5 bg-slate-50/50 text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500/20"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/70 border-b border-slate-100 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Student & Adm #</th>
                <th className="py-3 px-4">Class</th>
                <th className="py-3 px-4">Blood Group</th>
                <th className="py-3 px-4">Father Contact</th>
                <th className="py-3 px-4">Mother Contact</th>
                <th className="py-3 px-4">Emergency Contact</th>
                <th className="py-3 px-4">Medical Alert Flags</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400">
                    No emergency contact records found.
                  </td>
                </tr>
              ) : (
                filtered.map((st) => (
                  <tr key={st.student_id} className="hover:bg-slate-50/80 transition-colors">
                    {/* Student */}
                    <td className="py-3 px-4">
                      <p className="font-bold text-slate-900">{st.student_name}</p>
                      <span className="font-mono text-[10px] text-slate-400">{st.admission_no}</span>
                    </td>

                    {/* Class */}
                    <td className="py-3 px-4 font-semibold text-slate-700">
                      {st.class_name || 'N/A'} - {st.section_name || ''}
                    </td>

                    {/* Blood Group */}
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-lg text-xs font-black bg-rose-50 text-rose-700 border border-rose-200">
                        {st.blood_group || 'O+'}
                      </span>
                    </td>

                    {/* Father Phone */}
                    <td className="py-3 px-4 font-mono">
                      {st.father_phone ? (
                        <a
                          href={`tel:${st.father_phone}`}
                          className="font-bold text-slate-800 hover:text-rose-600 flex items-center gap-1"
                        >
                          <Phone className="w-3 h-3 text-slate-400" />
                          {st.father_phone}
                        </a>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                      <span className="text-[10px] text-slate-400 block">{st.father_name || 'Father'}</span>
                    </td>

                    {/* Mother Phone */}
                    <td className="py-3 px-4 font-mono">
                      {st.mother_phone ? (
                        <a
                          href={`tel:${st.mother_phone}`}
                          className="font-bold text-slate-800 hover:text-rose-600 flex items-center gap-1"
                        >
                          <Phone className="w-3 h-3 text-slate-400" />
                          {st.mother_phone}
                        </a>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                      <span className="text-[10px] text-slate-400 block">{st.mother_name || 'Mother'}</span>
                    </td>

                    {/* Emergency Alt Contact */}
                    <td className="py-3 px-4 font-mono">
                      {st.emergency_contact_phone ? (
                        <a
                          href={`tel:${st.emergency_contact_phone}`}
                          className="font-bold text-rose-700 hover:underline flex items-center gap-1"
                        >
                          <PhoneCall className="w-3 h-3 text-rose-500" />
                          {st.emergency_contact_phone}
                        </a>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                      <span className="text-[10px] text-slate-500 block">
                        {st.emergency_contact_name || 'Primary Contact'}
                      </span>
                    </td>

                    {/* Medical Alerts */}
                    <td className="py-3 px-4">
                      {st.known_allergies && st.known_allergies !== 'None' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                          <AlertTriangle className="w-2.5 h-2.5 text-amber-600" />
                          {st.known_allergies}
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-400">Normal</span>
                      )}
                    </td>

                    <td className="py-3 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => navigate(`/health/notifications/new?studentId=${st.student_id}`)}
                        className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-[11px] font-bold inline-flex items-center gap-1"
                      >
                        <Bell className="w-3 h-3" /> Notify Parent
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
