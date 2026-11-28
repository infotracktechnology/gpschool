import React, { useState, useEffect } from 'react';
import { useSearchParams, useParams, useNavigate } from 'react-router-dom';
import {
  Printer,
  Search,
  QrCode,
  Calendar,
  Clock,
  User,
  Phone,
  Building2,
  Car,
  CheckCircle,
  FileText,
  BadgeCheck,
  RefreshCw,
  Sparkles,
  Layers,
  Edit,
  Trash2,
  LogOut
} from 'lucide-react';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';

export const VisitorPass = () => {
  const navigate = useNavigate();
  const { selectedBranch, selectedAcademicYear } = useAuth();
  const { id: routePassId } = useParams();
  const [searchParams] = useSearchParams();
  const queryPassId = routePassId || searchParams.get('id');
  const autoPrint = searchParams.get('print') === 'true';

  const [passes, setPasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPass, setSelectedPass] = useState(null);
  const [printFormat, setPrintFormat] = useState('thermal'); // 'thermal' or 'badge'
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    fetchPasses();
  }, [statusFilter, selectedBranch?.id, selectedAcademicYear?.id]);

  const fetchPasses = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/visitors/passes?status=${statusFilter}`);
      if (res.success && res.passes) {
        setPasses(res.passes);
        if (queryPassId) {
          const match = res.passes.find((p) => String(p.id) === queryPassId || p.pass_number === queryPassId);
          if (match) {
            setSelectedPass(match);
          } else {
            // fetch single pass
            fetchSinglePass(queryPassId);
          }
        } else if (res.passes.length > 0 && !selectedPass) {
          setSelectedPass(res.passes[0]);
        }
      }
    } catch (err) {
      console.error('Error fetching passes:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSinglePass = async (id) => {
    try {
      const res = await api.get(`/visitors/passes/${id}`);
      if (res.success && res.pass) {
        setSelectedPass(res.pass);
      }
    } catch (err) {
      console.error('Error fetching single pass:', err);
    }
  };

  useEffect(() => {
    if (autoPrint && selectedPass) {
      setTimeout(() => {
        window.print();
      }, 500);
    }
  }, [autoPrint, selectedPass]);

  const handlePrint = () => {
    window.print();
  };

  const handleDeletePass = async () => {
    if (!selectedPass) return;
    if (!window.confirm(`Delete pass ${selectedPass.pass_number} for ${selectedPass.visitor_name}?`)) return;
    try {
      await api.delete(`/visitors/passes/${selectedPass.id}`);
      setSelectedPass(null);
      fetchPasses();
    } catch (err) {
      alert(err.message || 'Failed to delete visitor pass');
    }
  };

  const filteredPasses = passes.filter((p) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      p.pass_number?.toLowerCase().includes(term) ||
      p.visitor_name?.toLowerCase().includes(term) ||
      p.visitor_phone?.includes(term) ||
      p.person_to_meet_name?.toLowerCase().includes(term)
    );
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Banner (hidden during print) */}
      <div className="print:hidden flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider bg-brand-50 text-brand-700 border border-brand-200/60">
              Pass Generator & Reprint
            </span>
            <span className="text-xs text-slate-500 font-medium">CBSE Standard Gate Passes</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 mt-1">Visitor Pass Center</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Preview, format, and print official gate passes in dual formats: 80mm POS Thermal Slip or ID Badge Card.
          </p>
        </div>

        {/* Print & Format Toggle Controls */}
          <div className="flex flex-wrap items-center gap-2">
          <div className="bg-slate-100 p-1 rounded-xl flex items-center gap-1 border border-slate-200">
            <button
              type="button"
              onClick={() => setPrintFormat('thermal')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                printFormat === 'thermal'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              80mm Thermal Slip
            </button>
            <button
              type="button"
              onClick={() => setPrintFormat('badge')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                printFormat === 'badge'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Standard ID Badge Card
            </button>
          </div>

          {selectedPass && (
            <>
              <button
                type="button"
                onClick={() => navigate(`/visitors/entry/${selectedPass.id}/edit`)}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors flex items-center gap-1"
              >
                <Edit className="w-3.5 h-3.5" />
                Edit
              </button>
              {selectedPass.status === 'active' && (
                <button
                  type="button"
                  onClick={() => navigate(`/visitors/exit/${selectedPass.id}`)}
                  className="px-3 py-2 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-xs font-bold rounded-xl transition-colors flex items-center gap-1"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Check Out
                </button>
              )}
              <button
                type="button"
                onClick={handleDeletePass}
                className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold rounded-xl transition-colors flex items-center gap-1"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete
              </button>
            </>
          )}

          <button
            type="button"
            onClick={handlePrint}
            disabled={!selectedPass}
            className="px-4 py-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-2"
          >
            <Printer className="w-4 h-4" />
            Print Pass Now
          </button>
        </div>
      </div>

      {/* Main Grid: Left List + Right Pass Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Pass List (hidden on print) */}
        <div className="print:hidden lg:col-span-5 bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden space-y-3 p-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <FileText className="w-4 h-4 text-brand-600" />
              Issued Passes ({filteredPasses.length})
            </h3>
            <div className="flex items-center gap-1">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="text-xs font-medium border border-slate-200 rounded-lg px-2 py-1 bg-white text-slate-700"
              >
                <option value="all">All Passes</option>
                <option value="active">Active Only</option>
                <option value="checked_out">Checked Out</option>
              </select>
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by Pass No, Visitor, Host..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full text-xs font-medium border border-slate-200 rounded-xl pl-8 pr-3 py-1.5 bg-slate-50/50 text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            />
          </div>

          {/* Pass Items List */}
          <div className="space-y-2 max-h-[580px] overflow-y-auto pr-1">
            {filteredPasses.map((p) => {
              const isSelected = selectedPass?.id === p.id;
              return (
                <div
                  key={p.id}
                  onClick={() => setSelectedPass(p)}
                  className={`p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-brand-50/80 border-brand-300 shadow-xs'
                      : 'bg-white border-slate-200/80 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-slate-900">{p.pass_number}</span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        p.status === 'active'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {p.status === 'active' ? 'Active' : 'Checked Out'}
                    </span>
                  </div>

                  <p className="font-bold text-slate-800 mt-1">{p.visitor_name}</p>
                  <div className="text-[11px] text-slate-500 flex items-center justify-between mt-1">
                    <span>Host: {p.person_to_meet_name}</span>
                    <span>
                      {new Date(p.check_in_time).toLocaleDateString([], { month: 'short', day: 'numeric' })}{' '}
                      {new Date(p.check_in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Pass Preview & Print Surface */}
        <div className="lg:col-span-7 flex flex-col items-center justify-center">
          {selectedPass ? (
            <div className="w-full flex flex-col items-center">
              {/* FORMAT 1: 80mm POS Thermal Gate Pass */}
              {printFormat === 'thermal' && (
                <div
                  id="printable-thermal-pass"
                  className="w-[340px] bg-white p-6 border border-slate-300 rounded-2xl shadow-md text-slate-900 font-mono text-xs space-y-4 print:border-none print:shadow-none print:w-full print:p-0"
                >
                  {/* Header */}
                  <div className="text-center border-b border-dashed border-slate-400 pb-3">
                    <p className="font-extrabold text-sm uppercase tracking-tight">
                      GREEN PARK SENIOR SECONDARY SCHOOL
                    </p>
                    <p className="text-[10px] text-slate-600 uppercase">Affiliated to CBSE, New Delhi</p>
                    <p className="text-[10px] text-slate-500">Security Gate & Front Desk</p>
                    <div className="mt-2 inline-block px-3 py-1 bg-slate-900 text-white text-[11px] font-bold uppercase tracking-widest rounded">
                      VISITOR GATE PASS
                    </div>
                  </div>

                  {/* Pass Details */}
                  <div className="space-y-1.5 border-b border-dashed border-slate-400 pb-3 text-[11px]">
                    <div className="flex justify-between">
                      <span className="text-slate-500">PASS NO:</span>
                      <span className="font-extrabold">{selectedPass.pass_number}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">DATE:</span>
                      <span>{new Date(selectedPass.check_in_time).toLocaleDateString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">IN TIME:</span>
                      <span className="font-bold">
                        {new Date(selectedPass.check_in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>

                  {/* Visitor & Host Info */}
                  <div className="flex gap-3 border-b border-dashed border-slate-400 pb-3">
                    {selectedPass.photo_url ? (
                      <img
                        src={selectedPass.photo_url}
                        alt="Visitor"
                        className="w-16 h-16 rounded object-cover border border-slate-400 shrink-0"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded bg-slate-100 border border-slate-300 flex items-center justify-center text-slate-400 text-xs font-bold shrink-0">
                        PHOTO
                      </div>
                    )}
                    <div className="space-y-1 text-[11px] leading-tight flex-1">
                      <p>
                        <strong className="text-xs uppercase">{selectedPass.visitor_name}</strong>
                      </p>
                      <p className="text-slate-600">Mob: {selectedPass.visitor_phone}</p>
                      {selectedPass.vehicle_number && (
                        <p className="text-slate-600">Vehicle: {selectedPass.vehicle_number}</p>
                      )}
                      <p className="text-slate-600">Guests: {selectedPass.accompanying_count}</p>
                    </div>
                  </div>

                  {/* Meeting Details */}
                  <div className="space-y-1 border-b border-dashed border-slate-400 pb-3 text-[11px]">
                    <p>
                      <span className="text-slate-500">HOST:</span>{' '}
                      <strong>{selectedPass.person_to_meet_name}</strong>
                    </p>
                    <p>
                      <span className="text-slate-500">DEPT:</span> {selectedPass.department || 'General'}
                    </p>
                    {selectedPass.student_name && (
                      <p className="text-brand-800 font-bold">
                        WARD: {selectedPass.student_name} ({selectedPass.student_class_section || ''})
                      </p>
                    )}
                    <p>
                      <span className="text-slate-500">PURPOSE:</span> {selectedPass.purpose}
                    </p>
                  </div>

                  {/* QR Code Graphic Mock */}
                  <div className="text-center py-1">
                    <div className="w-24 h-24 mx-auto border border-slate-900 p-1 flex items-center justify-center bg-white">
                      <QrCode className="w-full h-full text-slate-900" />
                    </div>
                    <p className="text-[9px] text-slate-500 mt-1 uppercase tracking-widest font-mono">
                      SCAN FOR GATE EXIT
                    </p>
                  </div>

                  {/* Footer Rules */}
                  <div className="text-center text-[9px] text-slate-500 leading-tight border-t border-dashed border-slate-400 pt-2 space-y-0.5">
                    <p>• Valid for single entry today only.</p>
                    <p>• Keep badge visible while in campus premises.</p>
                    <p>• Return pass at Main Gate during checkout.</p>
                  </div>
                </div>
              )}

              {/* FORMAT 2: Standard ID Badge Card */}
              {printFormat === 'badge' && (
                <div
                  id="printable-badge-card"
                  className="w-[420px] bg-white border-2 border-slate-300 rounded-3xl shadow-xl overflow-hidden print:border-slate-800 print:shadow-none"
                >
                  {/* Top Color Banner */}
                  <div className="bg-brand-700 text-white p-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <img
                        src="/assets/logo.png"
                        alt="Logo"
                        className="w-7 h-7 rounded-lg bg-white p-0.5 object-contain"
                      />
                      <div className="text-left">
                        <h4 className="font-extrabold text-sm leading-tight tracking-tight uppercase">
                          Green Park Int. School
                        </h4>
                        <p className="text-[10px] text-brand-100 uppercase tracking-widest font-bold">
                          Official Visitor Pass
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Badge Body */}
                  <div className="p-6 space-y-4">
                    <div className="flex gap-4 items-center">
                      {selectedPass.photo_url ? (
                        <img
                          src={selectedPass.photo_url}
                          alt="Visitor"
                          className="w-24 h-28 rounded-2xl object-cover border-2 border-slate-200 shadow-xs shrink-0"
                        />
                      ) : (
                        <div className="w-24 h-28 rounded-2xl bg-slate-100 border-2 border-slate-200 flex flex-col items-center justify-center text-slate-400 shrink-0">
                          <User className="w-8 h-8 mb-1" />
                          <span className="text-[10px] font-bold">PHOTO</span>
                        </div>
                      )}

                      <div className="space-y-1.5 flex-1">
                        <span className="font-mono text-xs font-extrabold px-2 py-0.5 bg-brand-50 text-brand-700 rounded-md border border-brand-200">
                          {selectedPass.pass_number}
                        </span>
                        <h3 className="text-base font-extrabold text-slate-900 leading-tight">
                          {selectedPass.visitor_name}
                        </h3>
                        <p className="text-xs text-slate-500 font-mono">Ph: {selectedPass.visitor_phone}</p>
                        <p className="text-xs text-slate-600 font-medium">
                          Category: <span className="font-bold">{selectedPass.visitor_type || 'Guest'}</span>
                        </p>
                      </div>
                    </div>

                    {/* Details Box */}
                    <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 text-xs space-y-1">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Meeting With:</span>
                        <span className="font-bold text-slate-800">{selectedPass.person_to_meet_name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Department:</span>
                        <span className="font-medium text-slate-700">{selectedPass.department || 'Campus'}</span>
                      </div>
                      {selectedPass.student_name && (
                        <div className="flex justify-between text-brand-700 font-semibold">
                          <span>Ward Name:</span>
                          <span>{selectedPass.student_name}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-slate-400">Time In:</span>
                        <span className="font-medium text-slate-700">
                          {new Date(selectedPass.check_in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>

                    {/* QR Code and Signatures */}
                    <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                      <div className="w-16 h-16 border border-slate-300 rounded-lg p-1 bg-white">
                        <QrCode className="w-full h-full text-slate-800" />
                      </div>
                      <div className="text-right space-y-1">
                        <div className="w-28 border-b border-slate-400 pb-4"></div>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                          Security Signature
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center p-12 text-slate-400">
              <Printer className="w-10 h-10 mx-auto mb-2 opacity-50" />
              <p className="text-sm font-semibold">No pass selected</p>
              <p className="text-xs">Select a pass from the list on the left to preview and print.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
