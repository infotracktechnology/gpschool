import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  UserCheck,
  Camera,
  Car,
  User,
  Phone,
  Mail,
  Clock,
  Search,
  CheckCircle,
  AlertCircle,
  Printer,
  RefreshCw,
  GraduationCap,
  Building2,
  X,
  FileText,
  ShieldCheck,
  ArrowLeft,
  Save,
  Sparkles,
} from 'lucide-react';
import { api } from '../../api/client';

export const VisitorEntry = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const appointmentIdParam = searchParams.get('appointmentId');
  const hostIdParam = searchParams.get('hostId');
  const isEdit = Boolean(id);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    visitor_type: 'Parent',
    id_proof_type: 'Aadhaar Card',
    id_proof_number: '',
    badge_number: '',
    appointment_id: null,
    purpose: 'Parent Meeting / Early Student Pick-up',
    purpose_details: '',
    person_to_meet_id: '',
    person_to_meet_name: '',
    department: '',
    student_id: '',
    student_name: '',
    student_class_section: '',
    vehicle_type: 'None',
    vehicle_number: '',
    accompanying_count: 0,
    expected_duration_minutes: 60,
  });

  // Photo Capture
  const [photoUrl, setPhotoUrl] = useState('');
  const [isWebcamActive, setIsWebcamActive] = useState(false);
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  // Host, Returning Visitor & Student Search Data
  const [hosts, setHosts] = useState([]);
  const [studentSearchTerm, setStudentSearchTerm] = useState('');
  const [studentSearchResults, setStudentSearchResults] = useState([]);
  const [isSearchingStudents, setIsSearchingStudents] = useState(false);

  const [returningSearch, setReturningSearch] = useState('');
  const [returningResults, setReturningResults] = useState([]);
  const [isSearchingReturning, setIsSearchingReturning] = useState(false);

  // Submission & Success
  const [loadingInit, setLoadingInit] = useState(isEdit || Boolean(appointmentIdParam));
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [createdPass, setCreatedPass] = useState(null);

  useEffect(() => {
    const init = async () => {
      try {
        const hostRes = await api.get('/visitors/hosts');
        const hostList = hostRes.hosts || [];
        setHosts(hostList);

        if (isEdit) {
          const passRes = await api.get(`/visitors/passes/${id}`);
          if (passRes.success && passRes.pass) {
            const p = passRes.pass;
            setFormData({
              name: p.visitor_name || '',
              phone: p.visitor_phone || '',
              email: p.email || '',
              address: p.address || '',
              visitor_type: p.visitor_type || 'Guest',
              id_proof_type: p.id_proof_type || 'Aadhaar Card',
              id_proof_number: p.id_proof_number || '',
              badge_number: p.badge_number || '',
              appointment_id: p.appointment_id || null,
              purpose: p.purpose || 'General Enquiry',
              purpose_details: p.purpose_details || '',
              person_to_meet_id: p.person_to_meet_id || '',
              person_to_meet_name: p.person_to_meet_name || '',
              department: p.department || '',
              student_id: p.student_id || '',
              student_name: p.student_name || '',
              student_class_section: p.student_class_section || '',
              vehicle_type: p.vehicle_type || 'None',
              vehicle_number: p.vehicle_number || '',
              accompanying_count: p.accompanying_count || 0,
              expected_duration_minutes: p.expected_duration_minutes || 60,
            });
            setPhotoUrl(p.photo_url || '');
            if (p.student_name) {
              setStudentSearchTerm(`${p.student_name} (${p.student_class_section || ''})`);
            }
          }
        } else if (appointmentIdParam) {
          const aptRes = await api.get(`/visitors/appointments/${appointmentIdParam}`);
          if (aptRes.success && aptRes.appointment) {
            const a = aptRes.appointment;
            setFormData((prev) => ({
              ...prev,
              name: a.visitor_name || '',
              phone: a.visitor_phone || '',
              email: a.visitor_email || '',
              visitor_type: 'Guest',
              appointment_id: a.id,
              purpose: a.purpose || 'Teacher / Faculty Discussion',
              purpose_details: a.notes || `Check-in from appointment ${a.appointment_number}`,
              person_to_meet_id: a.person_to_meet_id || '',
              person_to_meet_name: a.person_to_meet_name || '',
              department: a.department || '',
            }));
          }
        } else if (hostIdParam && hostList.length > 0) {
          const h = hostList.find((item) => String(item.staff_id) === String(hostIdParam));
          if (h) {
            setFormData((prev) => ({
              ...prev,
              person_to_meet_id: h.staff_id,
              person_to_meet_name: h.full_name,
              department: h.department || '',
            }));
          }
        } else if (hostList.length > 0) {
          setFormData((prev) => ({
            ...prev,
            person_to_meet_id: hostList[0].staff_id,
            person_to_meet_name: hostList[0].full_name,
            department: hostList[0].department || '',
          }));
        }
      } catch (err) {
        console.error('Initialization error:', err);
        setErrorMsg(err.message || 'Failed to load visitor entry details.');
      } finally {
        setLoadingInit(false);
      }
    };

    init();
    return () => {
      stopWebcam();
    };
  }, [id, isEdit, appointmentIdParam, hostIdParam]);

  // Returning Visitor Search
  const handleReturningSearch = async (val) => {
    setReturningSearch(val);
    if (!val || val.trim().length < 2) {
      setReturningResults([]);
      return;
    }
    try {
      setIsSearchingReturning(true);
      const res = await api.get(`/visitors/lookup-returning?q=${encodeURIComponent(val)}`);
      if (res.success) {
        setReturningResults(res.visitors || []);
      }
    } catch (err) {
      console.error('Error searching returning visitor:', err);
    } finally {
      setIsSearchingReturning(false);
    }
  };

  const applyReturningVisitor = (v) => {
    setFormData((prev) => ({
      ...prev,
      name: v.name || '',
      phone: v.phone || '',
      email: v.email || '',
      address: v.address || '',
      visitor_type: v.visitor_type || 'Guest',
      id_proof_type: v.id_proof_type || 'Aadhaar Card',
      id_proof_number: v.id_proof_number || '',
      vehicle_type: v.last_vehicle_type || 'None',
      vehicle_number: v.last_vehicle_number || '',
    }));
    if (v.photo_url) setPhotoUrl(v.photo_url);
    setReturningResults([]);
    setReturningSearch('');
  };

  // Student Search
  const handleStudentSearch = async (val) => {
    setStudentSearchTerm(val);
    if (val.trim().length < 2) {
      setStudentSearchResults([]);
      return;
    }
    try {
      setIsSearchingStudents(true);
      const res = await api.get(`/visitors/students-search?q=${encodeURIComponent(val)}`);
      if (res.success && res.students) {
        setStudentSearchResults(res.students);
      }
    } catch (err) {
      console.error('Error searching students:', err);
    } finally {
      setIsSearchingStudents(false);
    }
  };

  const selectStudent = (st) => {
    const clsSec = st.class_section || `${st.class_name || ''} - ${st.section_name || ''}`.trim();
    setFormData((prev) => ({
      ...prev,
      student_id: st.id,
      student_name: st.student_name,
      student_class_section: clsSec,
    }));
    setStudentSearchResults([]);
    setStudentSearchTerm(`${st.student_name} (${clsSec})`);
  };

  // Webcam Handlers
  const startWebcam = async () => {
    try {
      setErrorMsg('');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 320, height: 240, facingMode: 'user' },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setIsWebcamActive(true);
    } catch (err) {
      console.warn('Webcam access error:', err);
      setErrorMsg('Webcam not accessible. Please allow camera permissions or upload a photo.');
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = 320;
    canvas.height = 240;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
    setPhotoUrl(canvas.toDataURL('image/jpeg', 0.85));
    stopWebcam();
  };

  const stopWebcam = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsWebcamActive(false);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setPhotoUrl(reader.result);
      reader.readAsDataURL(file);
    }
  };

  // Submit Handler
  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!formData.name.trim()) {
      setErrorMsg('Please enter visitor full name.');
      return;
    }
    if (!formData.phone.trim() || formData.phone.length < 10) {
      setErrorMsg('Please enter a valid 10-digit mobile number.');
      return;
    }
    if (!formData.person_to_meet_name.trim()) {
      setErrorMsg('Please select the Person to Meet / Host.');
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        ...formData,
        photo_url: photoUrl,
      };

      if (isEdit) {
        const res = await api.put(`/visitors/passes/${id}`, payload);
        if (res.success && res.pass) {
          navigate(`/visitors/passes/${res.pass.id}`);
        }
      } else {
        const res = await api.post('/visitors/entry', payload);
        if (res.success && res.pass) {
          setCreatedPass(res.pass);
        }
      }
    } catch (err) {
      console.error('Submission error:', err);
      setErrorMsg(err.message || 'Failed to save visitor pass.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    setFormData({
      name: '',
      phone: '',
      email: '',
      address: '',
      visitor_type: 'Parent',
      id_proof_type: 'Aadhaar Card',
      id_proof_number: '',
      badge_number: '',
      appointment_id: null,
      purpose: 'Parent Meeting / Early Student Pick-up',
      purpose_details: '',
      person_to_meet_id: hosts[0]?.staff_id || '',
      person_to_meet_name: hosts[0]?.full_name || '',
      department: hosts[0]?.department || '',
      student_id: '',
      student_name: '',
      student_class_section: '',
      vehicle_type: 'None',
      vehicle_number: '',
      accompanying_count: 0,
      expected_duration_minutes: 60,
    });
    setPhotoUrl('');
    setCreatedPass(null);
    setStudentSearchTerm('');
    setErrorMsg('');
  };

  if (loadingInit) {
    return <div className="p-12 text-center text-xs text-slate-400">Loading visitor registration form...</div>;
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex items-start gap-3">
          {isEdit && (
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 mt-0.5"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider bg-brand-50 text-brand-700 border border-brand-200/60">
                Gate Security &amp; Reception
              </span>
              <span className="flex items-center gap-1 text-xs text-emerald-600 font-medium">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                {isEdit ? 'Edit Pass Record' : 'Live Entry Desk'}
              </span>
            </div>
            <h1 className="text-xl font-bold text-slate-900 mt-1">
              {isEdit ? `Edit Visitor Pass: ${formData.name}` : 'Visitor Registration Entry'}
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              {isEdit
                ? 'Update visitor contact details, ID verification, host assignment, or linked ward.'
                : 'Log incoming campus visitors, verify ID credentials, capture photo, and issue official gate passes.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate('/visitors/exit')}
            className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors flex items-center gap-1.5"
          >
            <Clock className="w-3.5 h-3.5 text-slate-600" />
            Active In-Campus
          </button>
          <button
            type="button"
            onClick={() => navigate('/visitors/passes')}
            className="px-3.5 py-2 text-xs font-semibold text-brand-700 bg-brand-50 hover:bg-brand-100 rounded-xl border border-brand-200/60 transition-colors flex items-center gap-1.5"
          >
            <Printer className="w-3.5 h-3.5" />
            Pass Center
          </button>
        </div>
      </div>

      {/* Returning Visitor Fast Lookup (Create mode) */}
      {!isEdit && (
        <div className="bg-indigo-50/60 border border-indigo-200/80 rounded-2xl p-4 relative">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-600 shrink-0" />
              <div>
                <p className="text-xs font-bold text-indigo-950">Returning Visitor Quick Lookup</p>
                <p className="text-[11px] text-indigo-700">
                  Type a previous visitor&apos;s phone number or name to auto-fill contact, ID proof, photo, and vehicle.
                </p>
              </div>
            </div>
            <div className="relative w-full sm:w-80">
              <Search className="w-3.5 h-3.5 text-indigo-500 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search returning mobile or name..."
                value={returningSearch}
                onChange={(e) => handleReturningSearch(e.target.value)}
                className="w-full text-xs font-medium border border-indigo-200 rounded-xl pl-8 pr-3 py-2 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
              {isSearchingReturning && (
                <span className="absolute right-3 top-2.5 text-[10px] text-slate-400">Looking up...</span>
              )}
              {returningResults.length > 0 && (
                <div className="absolute z-30 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl divide-y divide-slate-100 max-h-52 overflow-y-auto">
                  {returningResults.map((v) => (
                    <div
                      key={v.id}
                      onClick={() => applyReturningVisitor(v)}
                      className="p-2.5 hover:bg-indigo-50 cursor-pointer text-xs flex items-center justify-between"
                    >
                      <div>
                        <p className="font-bold text-slate-900">{v.name}</p>
                        <p className="text-[11px] text-slate-500 font-mono">
                          {v.phone} • {v.visitor_type} ({v.total_visits || 0} past visits)
                        </p>
                      </div>
                      <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
                        Auto-Fill
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Success Banner */}
      {createdPass && (
        <div className="bg-emerald-50 border-2 border-emerald-300 rounded-2xl p-6 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                <CheckCircle className="w-7 h-7" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-emerald-950">Gate Pass Issued Successfully!</h3>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-emerald-200 text-emerald-900 tracking-wide font-mono">
                    {createdPass.pass_number}
                  </span>
                </div>
                <p className="text-xs text-emerald-800 mt-1">
                  Visitor <span className="font-semibold">{createdPass.visitor_name}</span> is approved to meet{' '}
                  <span className="font-semibold">{createdPass.person_to_meet_name}</span> ({createdPass.department || 'Campus'}).
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => navigate(`/visitors/passes/${createdPass.id}?print=true`)}
                className="px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-2"
              >
                <Printer className="w-4 h-4" />
                Print Gate Pass Now
              </button>
              <button
                type="button"
                onClick={handleReset}
                className="px-4 py-2.5 bg-white text-emerald-900 hover:bg-emerald-100 border border-emerald-300 text-xs font-bold rounded-xl flex items-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                New Registration
              </button>
            </div>
          </div>
        </div>
      )}

      {errorMsg && (
        <div className="flex items-center gap-3 p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-medium">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Main Form */}
      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Photo, Security ID Proof & Vehicle */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Camera className="w-4 h-4 text-brand-600" />
              Visitor Photo Capture
            </h3>

            <div className="relative w-full aspect-4/3 bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl overflow-hidden flex flex-col items-center justify-center">
              {isWebcamActive ? (
                <div className="w-full h-full relative">
                  <video ref={videoRef} className="w-full h-full object-cover" autoPlay playsInline />
                  <button
                    type="button"
                    onClick={capturePhoto}
                    className="absolute bottom-3 left-1/2 -translate-x-1/2 px-4 py-1.5 bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold rounded-lg shadow-md flex items-center gap-1.5"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    Snap Photo
                  </button>
                </div>
              ) : photoUrl ? (
                <div className="w-full h-full relative group">
                  <img src={photoUrl} alt="Visitor" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setPhotoUrl('')}
                    className="absolute top-2 right-2 p-1.5 bg-slate-900/70 text-white rounded-lg hover:bg-slate-900"
                    title="Remove Photo"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="text-center p-4">
                  <div className="w-12 h-12 mx-auto rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-2">
                    <User className="w-6 h-6" />
                  </div>
                  <p className="text-xs font-semibold text-slate-700">No Photo Captured</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">Use webcam snapshot or file upload</p>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2">
              {!isWebcamActive ? (
                <button
                  type="button"
                  onClick={startWebcam}
                  className="px-3 py-2 text-xs font-semibold text-brand-700 bg-brand-50 hover:bg-brand-100 border border-brand-200/60 rounded-xl flex items-center justify-center gap-1.5"
                >
                  <Camera className="w-3.5 h-3.5" />
                  Use Webcam
                </button>
              ) : (
                <button
                  type="button"
                  onClick={stopWebcam}
                  className="px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl flex items-center justify-center gap-1.5"
                >
                  Cancel Camera
                </button>
              )}

              <label className="px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl cursor-pointer flex items-center justify-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-slate-500" />
                Upload File
                <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
              </label>
            </div>
          </div>

          {/* Security Verification & ID Proof */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-indigo-600" />
              ID Verification &amp; Gate Badge
            </h3>

            <div>
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                ID Proof Document
              </label>
              <select
                value={formData.id_proof_type}
                onChange={(e) => setFormData({ ...formData, id_proof_type: e.target.value })}
                className="w-full text-xs font-medium border border-slate-200 rounded-xl px-3 py-2 bg-white text-slate-800"
              >
                <option value="Aadhaar Card">Aadhaar Card</option>
                <option value="Driving License">Driving License</option>
                <option value="Voter ID">Voter ID</option>
                <option value="PAN Card">PAN Card</option>
                <option value="Passport">Passport</option>
                <option value="Official / Company ID">Official / Company ID</option>
                <option value="None">None / Known Parent</option>
              </select>
            </div>

            {formData.id_proof_type !== 'None' && (
              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  ID Document / Last 4 Digits
                </label>
                <input
                  type="text"
                  placeholder="e.g. XXXX-XXXX-4521"
                  value={formData.id_proof_number}
                  onChange={(e) => setFormData({ ...formData, id_proof_number: e.target.value.toUpperCase() })}
                  className="w-full text-xs font-mono border border-slate-200 rounded-xl px-3 py-2 bg-white text-slate-800"
                />
              </div>
            )}

            <div>
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                Physical Lanyard / Gate Badge #
              </label>
              <input
                type="text"
                placeholder="e.g. B-14"
                value={formData.badge_number}
                onChange={(e) => setFormData({ ...formData, badge_number: e.target.value.toUpperCase() })}
                className="w-full text-xs font-mono border border-slate-200 rounded-xl px-3 py-2 bg-white text-slate-800"
              />
            </div>
          </div>

          {/* Vehicle Details Card */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Car className="w-4 h-4 text-emerald-600" />
              Vehicle &amp; Transit
            </h3>

            <div>
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                Vehicle Type
              </label>
              <select
                value={formData.vehicle_type}
                onChange={(e) => setFormData({ ...formData, vehicle_type: e.target.value })}
                className="w-full text-xs font-medium border border-slate-200 rounded-xl px-3 py-2.5 bg-white text-slate-800"
              >
                <option value="None">None (Pedestrian / Walking)</option>
                <option value="2-Wheeler">2-Wheeler (Motorcycle / Scooter)</option>
                <option value="4-Wheeler">4-Wheeler (Car / SUV)</option>
                <option value="Van / Auto">Van / Auto Rickshaw</option>
                <option value="Truck / Commercial">Delivery Van / Truck</option>
              </select>
            </div>

            {formData.vehicle_type !== 'None' && (
              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  Vehicle Registration No.
                </label>
                <input
                  type="text"
                  placeholder="e.g. TN-09-CB-1234"
                  value={formData.vehicle_number}
                  onChange={(e) => setFormData({ ...formData, vehicle_number: e.target.value.toUpperCase() })}
                  className="w-full text-xs font-mono uppercase border border-slate-200 rounded-xl px-3 py-2 bg-white text-slate-800"
                />
              </div>
            )}

            <div>
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                Accompanying Guests Count
              </label>
              <input
                type="number"
                min="0"
                max="10"
                value={formData.accompanying_count}
                onChange={(e) => setFormData({ ...formData, accompanying_count: e.target.value })}
                className="w-full text-xs font-medium border border-slate-200 rounded-xl px-3 py-2 bg-white text-slate-800"
              />
            </div>
          </div>
        </div>

        {/* Center & Right Columns */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <User className="w-4 h-4 text-brand-600" />
              Visitor Contact Details
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  Visitor Full Name <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    required
                    placeholder="Enter visitor's name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full text-xs font-medium border border-slate-200 rounded-xl pl-9 pr-3 py-2.5 bg-white text-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  Mobile Number <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="tel"
                    required
                    maxLength={10}
                    placeholder="10-digit mobile number"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value.replace(/\D/g, '') })}
                    className="w-full text-xs font-mono font-medium border border-slate-200 rounded-xl pl-9 pr-3 py-2.5 bg-white text-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  Visitor Category
                </label>
                <select
                  value={formData.visitor_type}
                  onChange={(e) => setFormData({ ...formData, visitor_type: e.target.value })}
                  className="w-full text-xs font-medium border border-slate-200 rounded-xl px-3 py-2.5 bg-white text-slate-800"
                >
                  <option value="Parent">Parent / Guardian</option>
                  <option value="Vendor">Vendor / Contractor</option>
                  <option value="Official">Government / CBSE Official</option>
                  <option value="Job Seeker">Job Applicant / Candidate</option>
                  <option value="Guest">Guest / VIP Dignitary</option>
                  <option value="Delivery">Delivery / Courier</option>
                  <option value="Alumni">School Alumni</option>
                  <option value="Other">Other Walk-in</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  Email Address (Optional)
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="email"
                    placeholder="e.g. visitor@example.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full text-xs font-medium border border-slate-200 rounded-xl pl-9 pr-3 py-2.5 bg-white text-slate-800"
                  />
                </div>
              </div>

              <div className="md:col-span-2">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  Address / Organization (Optional)
                </label>
                <input
                  type="text"
                  placeholder="City / locality or company name"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full text-xs font-medium border border-slate-200 rounded-xl px-3 py-2 bg-white text-slate-800"
                />
              </div>
            </div>
          </div>

          {/* Visit Purpose & Host Selection */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-brand-600" />
              Purpose &amp; Host Details
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  Purpose of Visit <span className="text-rose-500">*</span>
                </label>
                <select
                  value={formData.purpose}
                  onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                  className="w-full text-xs font-medium border border-slate-200 rounded-xl px-3 py-2.5 bg-white text-slate-800"
                >
                  <option value="Parent Meeting / Early Student Pick-up">Parent Meeting / Early Student Pick-up</option>
                  <option value="Admission Enquiry">Admission Enquiry &amp; Campus Tour</option>
                  <option value="Fee & Accounts Query">Fee Payment &amp; Accounts Desk</option>
                  <option value="Meeting with Principal / Management">Meeting with Principal / Management</option>
                  <option value="Teacher / Faculty Discussion">Academic Discussion with Teacher</option>
                  <option value="Vendor / Supplier Meeting">Vendor / Supplier Meeting</option>
                  <option value="Official Inspection / CBSE Visit">Official Inspection / CBSE Visit</option>
                  <option value="Job Interview">Job Interview &amp; Demonstration</option>
                  <option value="General Enquiry">General Information</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  Person to Meet (Host) <span className="text-rose-500">*</span>
                </label>
                <select
                  value={formData.person_to_meet_id}
                  onChange={(e) => {
                    const selected = hosts.find((h) => String(h.staff_id) === e.target.value);
                    setFormData({
                      ...formData,
                      person_to_meet_id: e.target.value,
                      person_to_meet_name: selected?.full_name || '',
                      department: selected?.department || '',
                    });
                  }}
                  className="w-full text-xs font-medium border border-slate-200 rounded-xl px-3 py-2.5 bg-white text-slate-800"
                >
                  <option value="">-- Select Faculty / Staff Host --</option>
                  {hosts.map((h) => (
                    <option key={h.staff_id} value={h.staff_id}>
                      {h.full_name} ({h.designation} - {h.department}) [Room: {h.cabin_room}]
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  Host Department
                  <span className="ml-1 text-[10px] text-emerald-600 font-bold bg-emerald-50 px-1.5 py-0.5 rounded">
                    Auto-Filled
                  </span>
                </label>
                <input
                  type="text"
                  readOnly
                  placeholder="Auto-filled upon host selection"
                  value={formData.department}
                  className="w-full text-xs font-bold border border-slate-200 bg-slate-50/80 rounded-xl px-3 py-2.5 text-slate-800 focus:outline-none"
                />
              </div>
            </div>

            {/* Student Search (if Parent category or Parent meeting) */}
            {(formData.visitor_type === 'Parent' || formData.purpose.includes('Parent')) && (
              <div className="p-4 bg-brand-50/50 border border-brand-200/60 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-brand-900 uppercase tracking-wider flex items-center gap-1.5">
                    <GraduationCap className="w-4 h-4 text-brand-600" />
                    Link Student / Ward
                  </label>
                  {formData.student_name && (
                    <span className="text-[10px] text-emerald-700 font-bold bg-emerald-100/80 px-2 py-0.5 rounded-full">
                      Linked
                    </span>
                  )}
                </div>

                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Search by student name, admission no, or phone..."
                    value={studentSearchTerm}
                    onChange={(e) => handleStudentSearch(e.target.value)}
                    className="w-full text-xs font-medium border border-brand-200 rounded-xl pl-9 pr-3 py-2 bg-white text-slate-800"
                  />
                  {isSearchingStudents && (
                    <span className="absolute right-3 top-2.5 text-[10px] text-slate-400">Searching...</span>
                  )}
                </div>

                {studentSearchResults.length > 0 && (
                  <div className="bg-white border border-slate-200 rounded-xl shadow-lg divide-y divide-slate-100 max-h-48 overflow-y-auto mt-1">
                    {studentSearchResults.map((st) => (
                      <div
                        key={st.id}
                        onClick={() => selectStudent(st)}
                        className="p-2.5 hover:bg-brand-50 cursor-pointer text-xs flex items-center justify-between transition-colors"
                      >
                        <div>
                          <p className="font-bold text-slate-800">{st.student_name}</p>
                          <p className="text-[11px] text-slate-500">
                            Adm No: <span className="font-mono">{st.admission_no}</span> | Class:{' '}
                            <span className="font-semibold text-brand-700">
                              {st.class_section || `${st.class_name || ''} - ${st.section_name || ''}`}
                            </span>
                          </p>
                        </div>
                        <span className="text-[10px] font-bold text-brand-600 bg-brand-50 px-2 py-0.5 rounded">
                          Select
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                      Student Name
                    </label>
                    <input
                      type="text"
                      readOnly
                      placeholder="Select student above"
                      value={formData.student_name}
                      className="w-full text-xs font-bold border border-slate-200 bg-white rounded-xl px-3 py-2 text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                      Student Class &amp; Section
                      <span className="ml-1 text-[10px] text-emerald-600 font-bold bg-emerald-50 px-1.5 py-0.5 rounded">
                        Auto-Filled
                      </span>
                    </label>
                    <input
                      type="text"
                      readOnly
                      placeholder="Auto-filled upon student selection"
                      value={formData.student_class_section}
                      className="w-full text-xs font-bold border border-slate-200 bg-white rounded-xl px-3 py-2 text-slate-800"
                    />
                  </div>
                </div>

                {formData.student_name && (
                  <div className="flex items-center justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        setFormData((prev) => ({
                          ...prev,
                          student_id: '',
                          student_name: '',
                          student_class_section: '',
                        }));
                        setStudentSearchTerm('');
                      }}
                      className="text-rose-600 hover:text-rose-800 text-xs font-bold"
                    >
                      ✕ Remove Linked Student
                    </button>
                  </div>
                )}
              </div>
            )}

            <div>
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                Additional Remarks / Agenda Notes
              </label>
              <textarea
                rows={2}
                placeholder="Specific discussion agenda, equipment carried, or visitor notes..."
                value={formData.purpose_details}
                onChange={(e) => setFormData({ ...formData, purpose_details: e.target.value })}
                className="w-full text-xs font-medium border border-slate-200 rounded-xl p-3 bg-white text-slate-800"
              />
            </div>

            <div className="flex items-center gap-3">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                Expected Visiting Duration:
              </label>
              <select
                value={formData.expected_duration_minutes}
                onChange={(e) => setFormData({ ...formData, expected_duration_minutes: e.target.value })}
                className="text-xs font-semibold border border-slate-200 rounded-xl px-3 py-1.5 bg-white text-slate-800"
              >
                <option value="30">30 Minutes</option>
                <option value="45">45 Minutes</option>
                <option value="60">60 Minutes (1 Hour)</option>
                <option value="90">90 Minutes (1.5 Hours)</option>
                <option value="120">120 Minutes (2 Hours)</option>
                <option value="240">Half Day (4 Hours)</option>
              </select>
            </div>
          </div>

          {/* Submit Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            {isEdit ? (
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="px-5 py-2.5 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl"
              >
                Cancel
              </button>
            ) : (
              <button
                type="button"
                onClick={handleReset}
                className="px-5 py-2.5 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl"
              >
                Clear Form
              </button>
            )}
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2.5 text-xs font-bold text-white bg-brand-600 hover:bg-brand-700 disabled:opacity-50 rounded-xl shadow-xs flex items-center gap-2"
            >
              {isEdit ? <Save className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
              {submitting
                ? 'Saving...'
                : isEdit
                ? 'Update Visitor Pass'
                : 'Issue Gate Pass & Register'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
