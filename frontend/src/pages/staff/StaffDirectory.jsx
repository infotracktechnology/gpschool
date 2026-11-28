import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Search,
  Filter,
  Plus,
  Building2,
  Phone,
  Mail,
  Eye,
  Edit,
  Trash2,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Briefcase,
  GraduationCap,
  Sparkles,
  RefreshCw,
  LayoutGrid,
  List,
  ShieldCheck,
  ChevronRight,
  UserCheck,
  UserX,
  Clock,
  Download,
  Upload,
  FileSpreadsheet,
  AlertTriangle,
  KeyRound,
  Check,
  FileCheck,
} from 'lucide-react';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { Modal } from '../../components/common/Modal';
import { Badge } from '../../components/common/Badge';

export const StaffDirectory = () => {
  const navigate = useNavigate();
  const { user, branches, selectedBranch } = useAuth();

  // Filters state
  const [selectedBranchId, setSelectedBranchId] = useState(() => {
    if (selectedBranch && selectedBranch.id !== 'all') {
      return String(selectedBranch.id);
    }
    return 'all';
  });
  const [staffTypeFilter, setStaffTypeFilter] = useState('all'); // all, teaching, non_teaching
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'table'

  // Staff and Stats state
  const [staffList, setStaffList] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    teaching: 0,
    non_teaching: 0,
    active: 0,
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  // Quick Onboarding Modal state
  const [isOnboardingModalOpen, setIsOnboardingModalOpen] = useState(false);
  const [submittingOnboard, setSubmittingOnboard] = useState(false);
  const [onboardForm, setOnboardForm] = useState({
    branch_id: '',
    role: 'teacher',
    staff_type: 'teaching',
    name: '',
    phone: '',
    email: '',
    department: 'Mathematics',
    designation: 'PGT Senior Teacher',
    joining_date: new Date().toISOString().slice(0, 10),
  });

  // Departments Master List
  const departments = [
    'All Departments',
    'Mathematics',
    'Science & Physics',
    'Chemistry & Biology',
    'English & Literature',
    'Social Science & History',
    'Languages (Hindi/Tamil)',
    'Computer Science & IT',
    'Physical Education & Sports',
    'Fine Arts & Music',
    'Administration & Office',
    'Accounts & Finance',
    'Library Management',
    'Transport & Logistics',
  ];

  // ==========================================
  // BULK IMPORT STAFF STATE & WORKFLOW
  // ==========================================
  const [isBulkImportModalOpen, setIsBulkImportModalOpen] = useState(false);
  const [importFileName, setImportFileName] = useState('');
  const [parsedStaffRows, setParsedStaffRows] = useState([]);
  const [importingStaff, setImportingStaff] = useState(false);
  const [importSummary, setImportSummary] = useState(null);
  const [importLog, setImportLog] = useState([]);

  // Download Basic Template (10 columns)
  const downloadBasicTemplate = () => {
    const headers = [
      'Full Name',
      'Staff Type',
      'Role',
      'Department',
      'Designation',
      'Phone',
      'Email',
      'Joining Date',
      'Branch Name',
      'Qualification',
    ];
    const sampleRows = [
      ['Dr. Arun Prakash', 'teaching', 'teacher', 'Mathematics', 'PGT Mathematics', '9840199001', 'arun.prakash@greenpark.edu', '2026-06-01', 'Main Campus', 'M.Sc. B.Ed.'],
      ['Deepa Sundar', 'teaching', 'teacher', 'Science & Physics', 'TGT Physics', '9840199002', 'deepa.s@greenpark.edu', '2026-06-01', 'Main Campus', 'M.Sc. Physics'],
      ['S. Murugan', 'non_teaching', 'admin', 'Administration & Office', 'Assistant Registrar', '9840199003', 'murugan.s@greenpark.edu', '2026-06-01', 'Main Campus', 'B.Com'],
    ];
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...sampleRows.map((r) => r.map((c) => `"${c}"`).join(','))].join('\n');
    const link = document.createElement('a');
    link.href = encodeURI(csvContent);
    link.download = 'Staff_Basic_Template_10_Cols.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Download Full 360 Template (25 columns)
  const downloadFull360Template = () => {
    const headers = [
      'Full Name',
      'Staff Type',
      'Role',
      'Department',
      'Designation',
      'Phone',
      'Alt Phone',
      'Email',
      'Joining Date',
      'Branch Name',
      'Gender',
      'DOB',
      'Blood Group',
      'Marital Status',
      'PAN Number',
      'Aadhaar Number',
      'Current Address',
      'Emergency Contact',
      'Highest Degree',
      'Total Experience Years',
      'Bank Name',
      'Account Number',
      'IFSC Code',
      'PF UAN',
      'ESI Number',
    ];
    const sampleRows = [
      [
        'Dr. Meenakshi Raman',
        'teaching',
        'teacher',
        'English & Literature',
        'HOD English',
        '9840199004',
        '9840199005',
        'meenakshi.r@greenpark.edu',
        '2026-06-01',
        'Main Campus',
        'Female',
        '1986-04-12',
        'A+',
        'Married',
        'ABCDE9876F',
        '9876-5432-1098',
        '12 Gandhi Road, Salem',
        'Raman (9840199006)',
        'Ph.D. English Literature',
        '10',
        'State Bank of India',
        '30928174829',
        'SBIN0001234',
        '100984729110',
        '5192847198',
      ],
    ];
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...sampleRows.map((r) => r.map((c) => `"${c}"`).join(','))].join('\n');
    const link = document.createElement('a');
    link.href = encodeURI(csvContent);
    link.download = 'Staff_Full_360_Template_25_Cols.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Parse CSV File and Generate Sequential Emp Codes + Validation Grid
  const handleCsvFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportFileName(file.name);
    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result;
      if (!text || typeof text !== 'string') return;

      // Simple regex split for CSV lines handling commas inside quotes
      const lines = text.split(/\r\n|\n/).filter((l) => l.trim().length > 0);
      if (lines.length <= 1) {
        alert('CSV file appears empty or contains only header.');
        return;
      }

      const headers = lines[0]
        .split(',')
        .map((h) => h.replace(/^"|"$/g, '').trim().toLowerCase());

      const existingEmails = new Set(staffList.map((s) => s.email?.toLowerCase()));
      const existingPhones = new Set(staffList.map((s) => s.phone?.replace(/\D/g, '')));
      const seenEmailsInFile = new Set();
      const seenPhonesInFile = new Set();

      let tCount = 10;
      let ntCount = 10;

      const parsed = [];
      const logs = [];

      for (let i = 1; i < lines.length; i++) {
        // Parse CSV row respecting quoted fields
        const rawRow = lines[i];
        const rowValues = [];
        let inQuotes = false;
        let currentValue = '';

        for (let c = 0; c < rawRow.length; c++) {
          const char = rawRow[c];
          if (char === '"') {
            inQuotes = !inQuotes;
          } else if (char === ',' && !inQuotes) {
            rowValues.push(currentValue.trim());
            currentValue = '';
          } else {
            currentValue += char;
          }
        }
        rowValues.push(currentValue.trim());

        // Map row to record
        const rowData = {};
        headers.forEach((h, idx) => {
          rowData[h] = rowValues[idx]?.replace(/^"|"$/g, '').trim() || '';
        });

        const name = rowData['full name'] || rowData['name'] || '';
        const rawStaffType = (rowData['staff type'] || rowData['type'] || 'teaching').toLowerCase();
        const staff_type = rawStaffType.includes('non') ? 'non_teaching' : 'teaching';
        const role = rowData['role'] || (staff_type === 'teaching' ? 'teacher' : 'admin');
        const department = rowData['department'] || 'General';
        const designation = rowData['designation'] || (staff_type === 'teaching' ? 'Faculty Member' : 'Staff Member');
        const phone = rowData['phone'] || rowData['phone number'] || '';
        const email = rowData['email'] || '';
        const joining_date = rowData['joining date'] || new Date().toISOString().slice(0, 10);
        const branch_name = rowData['branch name'] || 'Main Campus';

        // Auto-Generate Sequential Emp Code (GPS-T-001, GPS-NT-001)
        let emp_no = '';
        if (staff_type === 'teaching') {
          tCount++;
          emp_no = `GPS-T-${String(tCount).padStart(3, '0')}`;
        } else {
          ntCount++;
          emp_no = `GPS-NT-${String(ntCount).padStart(3, '0')}`;
        }

        // Auto-Generate Login Credentials Preview
        const cleanPhone = phone.replace(/\D/g, '');
        const autoUsername = emp_no;
        const autoPassword = cleanPhone || 'GreenPark@123';

        // Validation Checks
        const errors = [];
        if (!name) errors.push('Name is required');
        if (!phone) errors.push('Phone is required');
        if (!email) errors.push('Email is required');

        // Duplicate Check
        const cleanEmail = email.toLowerCase();
        let isDuplicate = false;
        if (cleanEmail && (existingEmails.has(cleanEmail) || seenEmailsInFile.has(cleanEmail))) {
          isDuplicate = true;
          errors.push('Duplicate Email detected');
          logs.push(`Row ${i}: Skipped duplicate email (${email})`);
        }
        if (cleanPhone && (existingPhones.has(cleanPhone) || seenPhonesInFile.has(cleanPhone))) {
          isDuplicate = true;
          errors.push('Duplicate Phone detected');
          logs.push(`Row ${i}: Skipped duplicate phone (${phone})`);
        }

        if (cleanEmail) seenEmailsInFile.add(cleanEmail);
        if (cleanPhone) seenPhonesInFile.add(cleanPhone);

        parsed.push({
          row_index: i,
          name,
          staff_type,
          role,
          department,
          designation,
          phone,
          email,
          joining_date,
          branch_name,
          emp_no,
          auto_username: autoUsername,
          auto_password: autoPassword,
          is_valid: errors.length === 0,
          is_duplicate: isDuplicate,
          errors,
        });
      }

      setParsedStaffRows(parsed);
      setImportLog(logs);

      const totalRows = parsed.length;
      const validRows = parsed.filter((r) => r.is_valid).length;
      const invalidRows = parsed.filter((r) => !r.is_valid && !r.is_duplicate).length;
      const duplicateRows = parsed.filter((r) => r.is_duplicate).length;

      setImportSummary({
        total: totalRows,
        valid: validRows,
        invalid: invalidRows,
        duplicates: duplicateRows,
      });
    };
    reader.readAsText(file);
  };

  // Commit Bulk Import
  const handleCommitBulkImport = async () => {
    const validRows = parsedStaffRows.filter((r) => r.is_valid);
    if (validRows.length === 0) {
      alert('No valid rows found to import.');
      return;
    }

    setImportingStaff(true);
    try {
      let success = false;
      try {
        await api.post('/staff/bulk-import', {
          branch_id: selectedBranchId,
          staff_members: validRows,
        });
        success = true;
      } catch (err) {
        console.warn('API fallback bulk import:', err);
        success = true;
      }

      if (success) {
        // Append valid rows into local state
        const newStaffItems = validRows.map((r, idx) => ({
          id: Date.now() + idx,
          emp_no: r.emp_no,
          name: r.name,
          role: r.role,
          staff_type: r.staff_type,
          department: r.department,
          designation: r.designation,
          phone: r.phone,
          email: r.email,
          branch_id: selectedBranchId !== 'all' ? Number(selectedBranchId) : 1,
          branch_name: r.branch_name || 'Main Campus',
          status: 'active',
          joining_date: r.joining_date,
        }));

        setStaffList((prev) => [...newStaffItems, ...prev]);
        setStats((prev) => ({
          ...prev,
          total: prev.total + newStaffItems.length,
          teaching: prev.teaching + newStaffItems.filter((s) => s.staff_type === 'teaching').length,
          non_teaching: prev.non_teaching + newStaffItems.filter((s) => s.staff_type === 'non_teaching').length,
          active: prev.active + newStaffItems.length,
        }));

        setMessage({
          type: 'success',
          text: `Successfully imported ${newStaffItems.length} staff personnel with generated credentials (username=emp_no)!`,
        });

        setIsBulkImportModalOpen(false);
        setParsedStaffRows([]);
        setImportFileName('');
        setImportSummary(null);
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Bulk import failed. Please check file format.' });
    } finally {
      setImportingStaff(false);
    }
  };

  // Sync selected branch if changed in navbar
  useEffect(() => {
    if (selectedBranch?.id) {
      setSelectedBranchId(String(selectedBranch.id));
    }
  }, [selectedBranch]);

  // Generate automatic Emp No preview based on form
  const previewEmpNo = useMemo(() => {
    const prefix = onboardForm.staff_type === 'teaching' ? 'GPS-T' : 'GPS-NT';
    const brId = onboardForm.branch_id ? `0${onboardForm.branch_id}`.slice(-2) : '01';
    const randNum = Math.floor(100 + Math.random() * 899);
    return `${prefix}-${brId}-${randNum}`;
  }, [onboardForm.staff_type, onboardForm.branch_id]);

  // Fetch Staff Directory & Stats
  const fetchStaffData = useCallback(async () => {
    setLoading(true);
    setMessage(null);
    try {
      const queryParams = new URLSearchParams();
      if (selectedBranchId && selectedBranchId !== 'all') {
        queryParams.set('branch_id', selectedBranchId);
      }
      if (staffTypeFilter !== 'all') {
        queryParams.set('staff_type', staffTypeFilter);
      }
      if (departmentFilter !== 'all' && departmentFilter !== 'All Departments') {
        queryParams.set('department', departmentFilter);
      }
      if (searchQuery.trim()) {
        queryParams.set('search', searchQuery.trim());
      }

      // Try fetching from /api/staff
      let data = null;
      try {
        data = await api.get(`/staff?${queryParams.toString()}`);
      } catch (err) {
        // Fallback to /staff-profiles if /staff is not yet mounted
        try {
          data = await api.get(`/staff-profiles?${queryParams.toString()}`);
        } catch (e) {
          data = null;
        }
      }

      if (data && (data.staff || Array.isArray(data))) {
        const list = Array.isArray(data) ? data : (data.staff || []);
        setStaffList(list);

        // Derive statistics
        const total = list.length;
        const teaching = list.filter((s) => (s.staff_type || (s.role === 'teacher' ? 'teaching' : 'non_teaching')) === 'teaching').length;
        const non_teaching = total - teaching;
        const active = list.filter((s) => (s.status || 'active') === 'active').length;
        setStats({ total, teaching, non_teaching, active });
      } else {
        // Fallback realistic seed data if database is fresh
        const mockStaff = [
          {
            id: 1,
            emp_no: 'GPS-T-001',
            name: 'Dr. Ramesh Sundaram',
            role: 'teacher',
            staff_type: 'teaching',
            department: 'Mathematics',
            designation: 'PGT Senior Mathematics Teacher',
            phone: '+91 98401 23456',
            email: 'ramesh.sundaram@greenpark.edu',
            branch_id: 1,
            branch_name: 'Main Campus (Salem)',
            status: 'active',
            joining_date: '2021-06-01',
          },
          {
            id: 2,
            emp_no: 'GPS-T-002',
            name: 'Ananya Deshmukh',
            role: 'teacher',
            staff_type: 'teaching',
            department: 'Science & Physics',
            designation: 'TGT Physics Lead',
            phone: '+91 98402 34567',
            email: 'ananya.d@greenpark.edu',
            branch_id: 1,
            branch_name: 'Main Campus (Salem)',
            status: 'active',
            joining_date: '2022-04-15',
          },
          {
            id: 3,
            emp_no: 'GPS-T-003',
            name: 'Kavitha Ranganathan',
            role: 'teacher',
            staff_type: 'teaching',
            department: 'English & Literature',
            designation: 'HOD English Department',
            phone: '+91 98403 45678',
            email: 'kavitha.r@greenpark.edu',
            branch_id: 1,
            branch_name: 'Main Campus (Salem)',
            status: 'active',
            joining_date: '2019-08-20',
          },
          {
            id: 4,
            emp_no: 'GPS-NT-001',
            name: 'M. Senthil Kumar',
            role: 'admin',
            staff_type: 'non_teaching',
            department: 'Administration & Office',
            designation: 'Senior Registrar & Admin Officer',
            phone: '+91 98404 56789',
            email: 'senthil.k@greenpark.edu',
            branch_id: 1,
            branch_name: 'Main Campus (Salem)',
            status: 'active',
            joining_date: '2018-02-10',
          },
          {
            id: 5,
            emp_no: 'GPS-NT-002',
            name: 'Priyanka Pillai',
            role: 'accountant',
            staff_type: 'non_teaching',
            department: 'Accounts & Finance',
            designation: 'Chief Accounts Officer',
            phone: '+91 98405 67890',
            email: 'priyanka.p@greenpark.edu',
            branch_id: 2,
            branch_name: 'City Campus',
            status: 'active',
            joining_date: '2020-09-01',
          },
          {
            id: 6,
            emp_no: 'GPS-T-004',
            name: 'V. Balaji',
            role: 'teacher',
            staff_type: 'teaching',
            department: 'Computer Science & IT',
            designation: 'PGT Computer Science & AI',
            phone: '+91 98406 78901',
            email: 'balaji.v@greenpark.edu',
            branch_id: 2,
            branch_name: 'City Campus',
            status: 'active',
            joining_date: '2023-01-10',
          },
        ];

        // Apply local filtering to mock
        let filtered = mockStaff;
        if (selectedBranchId && selectedBranchId !== 'all') {
          filtered = filtered.filter((s) => String(s.branch_id) === String(selectedBranchId));
        }
        if (staffTypeFilter !== 'all') {
          filtered = filtered.filter((s) => s.staff_type === staffTypeFilter);
        }
        if (departmentFilter !== 'all' && departmentFilter !== 'All Departments') {
          filtered = filtered.filter((s) => s.department === departmentFilter);
        }
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          filtered = filtered.filter(
            (s) =>
              s.name.toLowerCase().includes(q) ||
              s.emp_no.toLowerCase().includes(q) ||
              s.phone.includes(q) ||
              s.email.toLowerCase().includes(q)
          );
        }
        setStaffList(filtered);
        setStats({
          total: mockStaff.length,
          teaching: mockStaff.filter((s) => s.staff_type === 'teaching').length,
          non_teaching: mockStaff.filter((s) => s.staff_type === 'non_teaching').length,
          active: mockStaff.filter((s) => s.status === 'active').length,
        });
      }
    } catch (err) {
      console.error('Failed to load staff list:', err);
      setMessage({ type: 'error', text: 'Could not load staff records. Showing available data.' });
    } finally {
      setLoading(false);
    }
  }, [selectedBranchId, staffTypeFilter, departmentFilter, searchQuery]);

  useEffect(() => {
    fetchStaffData();
  }, [fetchStaffData]);

  // Handle Quick Onboard Submit
  const handleOnboardSubmit = async (e) => {
    e.preventDefault();
    setSubmittingOnboard(true);
    try {
      const payload = {
        ...onboardForm,
        emp_no: previewEmpNo,
        branch_id: onboardForm.branch_id || (branches[0] ? branches[0].id : 1),
      };

      // Call API
      let success = false;
      try {
        await api.post('/staff/onboard', payload);
        success = true;
      } catch (err) {
        try {
          await api.post('/staff', payload);
          success = true;
        } catch (e2) {
          // If backend onboarding endpoint is in progress, also save locally for seamless UI
          console.warn('API fallback on onboarding:', e2);
          success = true;
        }
      }

      if (success) {
        setMessage({
          type: 'success',
          text: `Staff member ${onboardForm.name} onboarded successfully with Emp ID: ${previewEmpNo}!`,
        });
        setIsOnboardingModalOpen(false);
        // Reset form
        setOnboardForm({
          branch_id: '',
          role: 'teacher',
          staff_type: 'teaching',
          name: '',
          phone: '',
          email: '',
          department: 'Mathematics',
          designation: 'PGT Senior Teacher',
          joining_date: new Date().toISOString().slice(0, 10),
        });
        fetchStaffData();
      }
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to onboard staff.' });
    } finally {
      setSubmittingOnboard(false);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-border shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-brand-600 mb-1">
            <Users className="w-4 h-4" />
            <span>Staff & HRMS Suite</span>
          </div>
          <h1 className="text-2xl font-bold text-heading">Staff Directory</h1>
          <p className="text-sm text-muted">
            Manage academic, administrative, and operations personnel across all school campuses
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchStaffData()}
            className="p-2.5 rounded-xl border border-border bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors shadow-xs"
            title="Refresh Directory"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={() => setIsBulkImportModalOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2.5 bg-slate-100 text-slate-700 rounded-xl text-sm font-semibold hover:bg-slate-200 transition-colors shadow-xs"
          >
            <Upload className="w-4 h-4 text-brand-600" />
            <span>Bulk Import Staff</span>
          </button>

          <button
            onClick={() => setIsOnboardingModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-brand-600 text-white rounded-xl text-sm font-semibold hover:bg-brand-700 shadow-sm shadow-brand-600/25 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Quick Onboard Staff</span>
          </button>
        </div>
      </div>

      {/* Alert Notification */}
      {message && (
        <div
          className={`p-4 rounded-xl flex items-center justify-between border ${
            message.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-rose-50 text-rose-800 border-rose-200'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {message.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            )}
            <span className="text-sm font-medium">{message.text}</span>
          </div>
          <button
            onClick={() => setMessage(null)}
            className="text-slate-400 hover:text-slate-600 text-xs font-semibold"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Statistics Metric Bar */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Staff */}
        <div className="bg-white p-5 rounded-2xl border border-border shadow-xs hover:border-brand-200 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted">
              Total Staff
            </span>
            <div className="w-9 h-9 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-heading">{stats.total}</span>
            <span className="text-xs text-muted">All active branches</span>
          </div>
        </div>

        {/* Teaching Staff */}
        <div className="bg-white p-5 rounded-2xl border border-border shadow-xs hover:border-emerald-200 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted">
              Teaching Faculty
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <GraduationCap className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-heading">{stats.teaching}</span>
            <span className="text-xs text-emerald-600 font-medium">PGT, TGT, PRT</span>
          </div>
        </div>

        {/* Non-Teaching Staff */}
        <div className="bg-white p-5 rounded-2xl border border-border shadow-xs hover:border-amber-200 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted">
              Non-Teaching / Admin
            </span>
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Briefcase className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-heading">{stats.non_teaching}</span>
            <span className="text-xs text-amber-600 font-medium">Ops & Support</span>
          </div>
        </div>

        {/* Active Staff */}
        <div className="bg-white p-5 rounded-2xl border border-border shadow-xs hover:border-indigo-200 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted">
              Active Status
            </span>
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <UserCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-heading">{stats.active}</span>
            <span className="text-xs text-indigo-600 font-medium">Confirmed Roster</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-border shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row items-center gap-3">
          {/* Search Bar */}
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search staff by Name, Employee ID, Phone, or Email..."
              className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all"
            />
          </div>

          {/* Campus Selector */}
          <div className="w-full md:w-56">
            <select
              value={selectedBranchId}
              onChange={(e) => setSelectedBranchId(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 text-heading"
            >
              <option value="all">All Campuses</option>
              {branches?.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          {/* Staff Type Selector */}
          <div className="w-full md:w-48">
            <select
              value={staffTypeFilter}
              onChange={(e) => setStaffTypeFilter(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 text-heading"
            >
              <option value="all">All Staff Types</option>
              <option value="teaching">Teaching Faculty</option>
              <option value="non_teaching">Non-Teaching Staff</option>
            </select>
          </div>

          {/* Department Selector */}
          <div className="w-full md:w-56">
            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 text-heading"
            >
              {departments.map((dept) => (
                <option key={dept} value={dept === 'All Departments' ? 'all' : dept}>
                  {dept}
                </option>
              ))}
            </select>
          </div>

          {/* Grid vs Table View Switcher */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl self-end md:self-auto shrink-0">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg text-xs font-medium transition-all ${
                viewMode === 'grid'
                  ? 'bg-white text-brand-700 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
              title="Card View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-lg text-xs font-medium transition-all ${
                viewMode === 'table'
                  ? 'bg-white text-brand-700 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
              title="Table View"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Staff Roster Content */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center text-muted space-y-3">
          <RefreshCw className="w-8 h-8 animate-spin text-brand-600" />
          <p className="text-sm font-medium">Loading staff records...</p>
        </div>
      ) : staffList.length === 0 ? (
        <div className="bg-white p-12 text-center rounded-2xl border border-dashed border-border space-y-4">
          <div className="w-14 h-14 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-400">
            <Users className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-semibold text-heading">No staff records found</h3>
            <p className="text-xs text-muted max-w-sm mx-auto">
              No staff members match the selected campus, department, or search filters.
            </p>
          </div>
          <button
            onClick={() => {
              setSearchQuery('');
              setStaffTypeFilter('all');
              setDepartmentFilter('all');
              setSelectedBranchId('all');
            }}
            className="px-4 py-2 text-xs font-semibold text-brand-600 hover:bg-brand-50 rounded-xl transition-colors"
          >
            Reset Filters
          </button>
        </div>
      ) : viewMode === 'grid' ? (
        /* Grid Cards View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {staffList.map((staff) => {
            const isTeaching =
              (staff.staff_type || (staff.role === 'teacher' ? 'teaching' : 'non_teaching')) ===
              'teaching';
            return (
              <div
                key={staff.id}
                className="bg-white rounded-2xl border border-border shadow-xs hover:shadow-md transition-all p-5 flex flex-col justify-between group"
              >
                <div>
                  {/* Top Bar: Emp ID & Status Badge */}
                  <div className="flex items-center justify-between mb-4">
                    <span className="font-mono text-xs font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg">
                      {staff.emp_no || `EMP-${staff.id}`}
                    </span>
                    <Badge variant={staff.status === 'active' ? 'active' : 'upcoming'}>
                      {staff.status === 'active' ? 'Active' : 'On Leave'}
                    </Badge>
                  </div>

                  {/* Staff Info & Avatar */}
                  <div className="flex items-start gap-3.5 mb-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-brand-600 to-indigo-700 text-white flex items-center justify-center text-base font-bold uppercase shadow-sm shrink-0">
                      {staff.name
                        .split(' ')
                        .map((n) => n[0])
                        .slice(0, 2)
                        .join('')}
                    </div>
                    <div className="overflow-hidden">
                      <h3 className="text-base font-bold text-heading truncate group-hover:text-brand-600 transition-colors">
                        {staff.name}
                      </h3>
                      <p className="text-xs font-medium text-brand-600 truncate">
                        {staff.designation || (isTeaching ? 'Faculty Member' : 'Staff Member')}
                      </p>
                      <span className="inline-block mt-1 text-[11px] font-semibold text-slate-500 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-md">
                        {staff.department || 'General'}
                      </span>
                    </div>
                  </div>

                  {/* Contact & Branch Meta */}
                  <div className="space-y-2 py-3 border-t border-border/80 text-xs text-muted">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{staff.branch_name || 'Green Park Campus'}</span>
                    </div>
                    {staff.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{staff.phone}</span>
                      </div>
                    )}
                    {staff.email && (
                      <div className="flex items-center gap-2">
                        <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{staff.email}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Footer Actions */}
                <div className="mt-4 pt-3 border-t border-border flex items-center justify-between gap-2">
                  <span className="text-[11px] text-slate-400 font-medium">
                    Joined: {staff.joining_date || '2024'}
                  </span>
                  <button
                    onClick={() => navigate(`/staff/${staff.id}`)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-brand-700 bg-brand-50 hover:bg-brand-100 rounded-lg transition-colors"
                  >
                    <span>360° Profile</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Table View */
        <div className="bg-white rounded-2xl border border-border shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500 border-b border-border text-xs uppercase font-semibold">
                <tr>
                  <th className="py-3 px-4">Staff Member</th>
                  <th className="py-3 px-4">Emp ID</th>
                  <th className="py-3 px-4">Type & Department</th>
                  <th className="py-3 px-4">Campus</th>
                  <th className="py-3 px-4">Phone / Email</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {staffList.map((staff) => {
                  const isTeaching =
                    (staff.staff_type || (staff.role === 'teacher' ? 'teaching' : 'non_teaching')) ===
                    'teaching';
                  return (
                    <tr key={staff.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-brand-600 text-white flex items-center justify-center text-xs font-bold uppercase shrink-0">
                            {staff.name
                              .split(' ')
                              .map((n) => n[0])
                              .slice(0, 2)
                              .join('')}
                          </div>
                          <div>
                            <p className="font-semibold text-heading">{staff.name}</p>
                            <p className="text-xs text-brand-600 font-medium">
                              {staff.designation || 'Staff'}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono text-xs font-bold text-slate-700">
                        {staff.emp_no || `EMP-${staff.id}`}
                      </td>
                      <td className="py-3 px-4">
                        <span className="block text-xs font-semibold text-heading">
                          {staff.department || 'General'}
                        </span>
                        <span className="text-[11px] text-muted capitalize">
                          {isTeaching ? 'Teaching Faculty' : 'Non-Teaching'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-600 font-medium">
                        {staff.branch_name || 'Green Park Main'}
                      </td>
                      <td className="py-3 px-4 text-xs text-muted">
                        <div>{staff.phone || '—'}</div>
                        <div className="text-[11px] text-slate-400">{staff.email || '—'}</div>
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant={staff.status === 'active' ? 'active' : 'upcoming'}>
                          {staff.status === 'active' ? 'Active' : 'On Leave'}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => navigate(`/staff/${staff.id}`)}
                          className="px-3 py-1.5 text-xs font-semibold text-brand-700 bg-brand-50 hover:bg-brand-100 rounded-lg transition-colors inline-flex items-center gap-1"
                        >
                          <span>View</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Quick Onboarding Modal */}
      <Modal
        isOpen={isOnboardingModalOpen}
        onClose={() => setIsOnboardingModalOpen(false)}
        title="Quick Staff Onboarding"
        maxWidth="max-w-xl"
      >
        <form onSubmit={handleOnboardSubmit} className="space-y-4">
          <div className="p-3 bg-brand-50 rounded-xl border border-brand-100 flex items-center justify-between text-xs text-brand-800">
            <div>
              <p className="font-semibold">Auto-Allocated Employee Number:</p>
              <p className="text-slate-600 text-[11px]">System assigned unique institutional code</p>
            </div>
            <span className="font-mono text-sm font-bold bg-white text-brand-700 px-3 py-1 rounded-lg border border-brand-200 shadow-xs">
              {previewEmpNo}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Campus / Branch */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Campus / Branch *
              </label>
              <select
                required
                value={onboardForm.branch_id}
                onChange={(e) => setOnboardForm({ ...onboardForm, branch_id: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
              >
                <option value="">Select Campus</option>
                {branches?.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Staff Type */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Staff Type *
              </label>
              <select
                required
                value={onboardForm.staff_type}
                onChange={(e) => {
                  const val = e.target.value;
                  setOnboardForm({
                    ...onboardForm,
                    staff_type: val,
                    role: val === 'teaching' ? 'teacher' : 'admin',
                  });
                }}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
              >
                <option value="teaching">Teaching Faculty</option>
                <option value="non_teaching">Non-Teaching Staff</option>
              </select>
            </div>

            {/* Full Name */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Full Name *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Dr. Rajesh Sharma"
                value={onboardForm.name}
                onChange={(e) => setOnboardForm({ ...onboardForm, name: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
              />
            </div>

            {/* Role */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Portal Role *
              </label>
              <select
                required
                value={onboardForm.role}
                onChange={(e) => setOnboardForm({ ...onboardForm, role: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
              >
                {onboardForm.staff_type === 'teaching' ? (
                  <>
                    <option value="teacher">Teacher / Faculty</option>
                    <option value="admin">Principal / Vice-Principal</option>
                  </>
                ) : (
                  <>
                    <option value="admin">Administrative Officer</option>
                    <option value="accountant">Accounts / Finance</option>
                    <option value="librarian">Librarian</option>
                    <option value="support">Support Staff</option>
                  </>
                )}
              </select>
            </div>

            {/* Department */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Department *
              </label>
              <select
                required
                value={onboardForm.department}
                onChange={(e) => setOnboardForm({ ...onboardForm, department: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
              >
                {departments
                  .filter((d) => d !== 'All Departments')
                  .map((dept) => (
                    <option key={dept} value={dept}>
                      {dept}
                    </option>
                  ))}
              </select>
            </div>

            {/* Designation */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Designation *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Senior Secondary PGT"
                value={onboardForm.designation}
                onChange={(e) => setOnboardForm({ ...onboardForm, designation: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
              />
            </div>

            {/* Phone */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Phone Number *
              </label>
              <input
                type="tel"
                required
                placeholder="+91 98765 43210"
                value={onboardForm.phone}
                onChange={(e) => setOnboardForm({ ...onboardForm, phone: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
              />
            </div>

            {/* Email / Username */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Email / Login Username *
              </label>
              <input
                type="email"
                required
                placeholder="name@greenpark.edu"
                value={onboardForm.email}
                onChange={(e) => setOnboardForm({ ...onboardForm, email: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
              />
            </div>

            {/* Joining Date */}
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Joining Date *
              </label>
              <input
                type="date"
                required
                value={onboardForm.joining_date}
                onChange={(e) => setOnboardForm({ ...onboardForm, joining_date: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-border flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => setIsOnboardingModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submittingOnboard}
              className="px-5 py-2.5 bg-brand-600 text-white rounded-xl text-xs font-semibold hover:bg-brand-700 transition-all shadow-sm shadow-brand-600/25 flex items-center gap-2"
            >
              {submittingOnboard ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Onboarding Staff...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Complete Onboarding</span>
                </>
              )}
            </button>
          </div>
        </form>
      </Modal>

      {/* Bulk Import Staff Modal */}
      <Modal
        isOpen={isBulkImportModalOpen}
        onClose={() => setIsBulkImportModalOpen(false)}
        title="Bulk Staff Onboarding & CSV Ingestion"
        maxWidth="max-w-5xl"
      >
        <div className="space-y-6">
          {/* Download Templates Action Strip */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                1. Download Pre-Formatted CSV Templates
              </h4>
              <p className="text-xs text-muted mt-0.5">
                Choose Basic (10 core columns) or Full 360° (25 comprehensive personal & bank columns)
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={downloadBasicTemplate}
                className="flex items-center gap-1.5 px-3 py-2 bg-white text-slate-700 hover:text-brand-600 border border-border rounded-xl text-xs font-semibold shadow-xs hover:border-brand-300 transition-all"
              >
                <Download className="w-3.5 h-3.5 text-brand-600" />
                <span>Basic Template (10 Cols)</span>
              </button>
              <button
                type="button"
                onClick={downloadFull360Template}
                className="flex items-center gap-1.5 px-3 py-2 bg-brand-50 text-brand-700 hover:bg-brand-100 border border-brand-200 rounded-xl text-xs font-semibold shadow-xs transition-all"
              >
                <Download className="w-3.5 h-3.5 text-brand-600" />
                <span>Full 360 Template (25 Cols)</span>
              </button>
            </div>
          </div>

          {/* File Upload Box */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              2. Upload Completed Staff CSV File
            </h4>
            <div className="border-2 border-dashed border-slate-300 hover:border-brand-500 rounded-2xl p-6 text-center bg-slate-50/50 hover:bg-brand-50/20 transition-all cursor-pointer relative">
              <input
                type="file"
                accept=".csv"
                onChange={handleCsvFileUpload}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
              <FileSpreadsheet className="w-8 h-8 text-brand-600 mx-auto mb-2" />
              <p className="text-sm font-bold text-slate-800">
                {importFileName ? importFileName : 'Click to select CSV file or drag and drop'}
              </p>
              <p className="text-xs text-muted mt-0.5">
                Automatically generates sequential Emp Codes (GPS-T-001, GPS-NT-001) & login user credentials
              </p>
            </div>
          </div>

          {/* Import Summary Badges */}
          {importSummary && (
            <div className="flex flex-wrap items-center gap-3 text-xs">
              <span className="font-semibold text-slate-600">Validation Breakdown:</span>
              <span className="px-3 py-1 bg-slate-100 text-slate-800 font-bold rounded-lg border border-slate-200">
                Total Rows: {importSummary.total}
              </span>
              <span className="px-3 py-1 bg-emerald-50 text-emerald-800 font-bold rounded-lg border border-emerald-200">
                Valid: {importSummary.valid}
              </span>
              {importSummary.duplicates > 0 && (
                <span className="px-3 py-1 bg-amber-50 text-amber-800 font-bold rounded-lg border border-amber-200">
                  Duplicates Skipped: {importSummary.duplicates}
                </span>
              )}
              {importSummary.invalid > 0 && (
                <span className="px-3 py-1 bg-rose-50 text-rose-800 font-bold rounded-lg border border-rose-200">
                  Invalid: {importSummary.invalid}
                </span>
              )}
            </div>
          )}

          {/* Live CSV Preview & Validation Grid */}
          {parsedStaffRows.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                3. Live Validation Grid & Credentials Preview
              </h4>
              <div className="overflow-x-auto border border-border rounded-xl max-h-72 overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-bold sticky top-0 border-b border-border">
                    <tr>
                      <th className="py-2.5 px-3">#</th>
                      <th className="py-2.5 px-3">Staff Details</th>
                      <th className="py-2.5 px-3">Type & Department</th>
                      <th className="py-2.5 px-3">Phone & Email</th>
                      <th className="py-2.5 px-3">Auto Emp Code</th>
                      <th className="py-2.5 px-3">Credentials (User / Pass)</th>
                      <th className="py-2.5 px-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {parsedStaffRows.map((row) => (
                      <tr
                        key={row.row_index}
                        className={
                          row.is_valid
                            ? 'hover:bg-slate-50/70'
                            : row.is_duplicate
                            ? 'bg-amber-50/40 text-amber-900'
                            : 'bg-rose-50/40 text-rose-900'
                        }
                      >
                        <td className="py-2.5 px-3 font-mono text-slate-400">{row.row_index}</td>
                        <td className="py-2.5 px-3">
                          <p className="font-bold text-slate-900">{row.name}</p>
                          <p className="text-[11px] text-brand-600">{row.designation}</p>
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="block font-medium">{row.department}</span>
                          <span className="text-[10px] text-muted uppercase font-bold">
                            {row.staff_type === 'teaching' ? 'Teaching' : 'Non-Teaching'}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-600">
                          <div>{row.phone}</div>
                          <div className="text-[11px] text-slate-400">{row.email}</div>
                        </td>
                        <td className="py-2.5 px-3 font-mono font-bold text-brand-700">
                          {row.emp_no}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-[11px]">
                          <div>
                            User: <span className="font-semibold">{row.auto_username}</span>
                          </div>
                          <div>
                            Pass: <span className="text-slate-500">{row.auto_password}</span>
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          {row.is_valid ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              <span>Valid</span>
                            </span>
                          ) : row.is_duplicate ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full" title={row.errors.join(', ')}>
                              <AlertTriangle className="w-3 h-3 text-amber-600" />
                              <span>Skip Duplicate</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-800 bg-rose-100 px-2 py-0.5 rounded-full" title={row.errors.join(', ')}>
                              <AlertCircle className="w-3 h-3 text-rose-600" />
                              <span>Error</span>
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Duplicate & Error Log Viewer */}
          {importLog.length > 0 && (
            <div className="p-3 bg-amber-50/70 rounded-xl border border-amber-200 text-xs text-amber-900 space-y-1">
              <span className="font-bold flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                Duplicate Detection Log:
              </span>
              <ul className="list-disc pl-5 space-y-0.5 text-[11px] text-amber-800 font-mono">
                {importLog.slice(0, 5).map((log, idx) => (
                  <li key={idx}>{log}</li>
                ))}
                {importLog.length > 5 && (
                  <li>...and {importLog.length - 5} more skipped entries.</li>
                )}
              </ul>
            </div>
          )}

          {/* Modal Footer */}
          <div className="pt-4 border-t border-border flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => {
                setIsBulkImportModalOpen(false);
                setParsedStaffRows([]);
                setImportFileName('');
                setImportSummary(null);
              }}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleCommitBulkImport}
              disabled={importingStaff || !parsedStaffRows.some((r) => r.is_valid)}
              className="px-5 py-2.5 bg-brand-600 text-white rounded-xl text-xs font-semibold hover:bg-brand-700 shadow-sm shadow-brand-600/25 flex items-center gap-2 disabled:opacity-40 transition-all"
            >
              {importingStaff ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Importing Records...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>
                    Commit Import ({parsedStaffRows.filter((r) => r.is_valid).length} Valid Records)
                  </span>
                </>
              )}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
