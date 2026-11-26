import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
import {
  Stethoscope,
  Plus,
  Search,
  Eye,
  Printer,
  Edit,
  Trash2,
  FileSpreadsheet,
} from 'lucide-react';
import { api } from '../../api/client';

export const HealthCheckups = () => {
  const navigate = useNavigate();
  const [checkups, setCheckups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchCheckups();
  }, []);

  const fetchCheckups = async () => {
    try {
      setLoading(true);
      const res = await api.get('/health/checkups');
      if (res.success) {
        setCheckups(res.checkups || []);
      }
    } catch (err) {
      console.error('Error fetching checkups:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (c) => {
    if (!window.confirm(`Delete health check-up record for ${c.student_name}?`)) return;
    try {
      await api.delete(`/health/checkups/${c.id}`);
      fetchCheckups();
    } catch (err) {
      alert(err.message || 'Failed to delete check-up record.');
    }
  };

  const filteredCheckups = checkups.filter((c) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      c.student_name?.toLowerCase().includes(term) ||
      c.class_section?.toLowerCase().includes(term) ||
      c.examiner_name?.toLowerCase().includes(term) ||
      c.general_fitness?.toLowerCase().includes(term) ||
      c.admission_no?.toLowerCase().includes(term)
    );
  });

  const exportExcel = () => {
    if (filteredCheckups.length === 0) return;
    const rows = filteredCheckups.map((c) => ({
      'Student Name': c.student_name,
      'Admission No': c.admission_no || '—',
      'Class & Section': c.class_section || '—',
      'Blood Group': c.blood_group || '—',
      Date: new Date(c.checkup_date).toLocaleDateString(),
      'Height (cm)': c.height_cm || '',
      'Weight (kg)': c.weight_kg || '',
      'Vision Left': c.vision_left || '',
      'Vision Right': c.vision_right || '',
      'Dental Status': c.dental_status || '',
      'ENT Status': c.ent_status || '',
      'General Fitness': c.general_fitness || '',
      Examiner: c.examiner_name || '',
      Remarks: c.doctor_remarks || '',
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Health Checkups');
    XLSX.writeFile(wb, `Health_Checkups_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider bg-rose-50 text-rose-700 border border-rose-200/60">
              Campus Health Camps &amp; Screenings
            </span>
            <span className="text-xs text-slate-500 font-medium">Vision, Dental &amp; Physical Fitness</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 mt-1">Periodic Health Check-ups</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Record individual student health screenings, edit assessments, export Excel rosters, and print A4 CBSE Health Cards.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={exportExcel}
            className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            Export Excel
          </button>
          <button
            type="button"
            onClick={() => navigate('/health/checkups/new')}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            Log Health Check-up
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between gap-4">
        <div className="relative w-full max-w-md">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search student, adm no, class, doctor..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full text-xs font-medium border border-slate-200 rounded-xl pl-8 pr-3 py-1.5 bg-slate-50/50 text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500/20"
          />
        </div>
        <span className="text-xs text-slate-400 font-medium">
          Total Screenings: {filteredCheckups.length}
        </span>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/70 border-b border-slate-100 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Student &amp; Class</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Height &amp; Weight</th>
                <th className="py-3 px-4">Vision (L / R)</th>
                <th className="py-3 px-4">Dental &amp; ENT</th>
                <th className="py-3 px-4">Fitness &amp; Remarks</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400">Loading check-ups...</td>
                </tr>
              ) : filteredCheckups.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400">
                    No health check-up records found.
                  </td>
                </tr>
              ) : (
                filteredCheckups.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4">
                      <p className="font-bold text-slate-900">{c.student_name}</p>
                      <p className="text-[11px] text-slate-500">
                        {c.class_section || 'Grade N/A'} {c.admission_no ? `• ${c.admission_no}` : ''}
                      </p>
                    </td>

                    <td className="py-3 px-4 font-medium text-slate-700">
                      {new Date(c.checkup_date).toLocaleDateString([], {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </td>

                    <td className="py-3 px-4 font-mono">
                      <span className="font-semibold text-slate-800">{c.height_cm || '—'} cm</span>
                      <span className="text-slate-400 mx-1">/</span>
                      <span className="font-semibold text-slate-800">{c.weight_kg || '—'} kg</span>
                    </td>

                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1 font-mono text-[11px]">
                        <Eye className="w-3 h-3 text-slate-400" />
                        <span>L: {c.vision_left || '6/6'}</span>
                        <span className="text-slate-300">|</span>
                        <span>R: {c.vision_right || '6/6'}</span>
                      </div>
                    </td>

                    <td className="py-3 px-4 text-[11px]">
                      <p className="text-slate-800">
                        Dental: <span className="font-semibold">{c.dental_status}</span>
                      </p>
                      <p className="text-slate-500">ENT: {c.ent_status}</p>
                    </td>

                    <td className="py-3 px-4 max-w-xs">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {c.general_fitness}
                      </span>
                      {c.doctor_remarks && (
                        <p className="text-[11px] text-slate-600 truncate mt-0.5" title={c.doctor_remarks}>
                          {c.doctor_remarks}
                        </p>
                      )}
                    </td>

                    <td className="py-3 px-4 text-right">
                      <div className="inline-flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => navigate(`/health/checkups/${c.id}/print`)}
                          className="px-3 py-1 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg transition-colors inline-flex items-center gap-1"
                          title="Open A4 Health Card Print Page"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          A4 Card
                        </button>
                        <button
                          type="button"
                          onClick={() => navigate(`/health/checkups/${c.id}/edit`)}
                          className="p-1.5 bg-brand-50 hover:bg-brand-100 text-brand-700 rounded-lg"
                          title="Edit Check-up"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(c)}
                          className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg"
                          title="Delete Check-up"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
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
