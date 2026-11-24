import React, { useState, useMemo } from 'react';
import {
  FileCheck2,
  Calendar,
  Clock,
  AlertCircle,
  Search,
  Paperclip,
  Download,
  FileText,
  UploadCloud,
  Award,
  Check,
  X,
  ExternalLink,
} from 'lucide-react';
import { useStudent } from '../../context/StudentContext';
import { BrowseByDateStrip } from '../../components/student/BrowseByDateStrip';

const extractSubmissionUrl = (value) => {
    if (!value) return '';

    let parsed = value;

    if (typeof parsed === 'string') {
        try {
            parsed = JSON.parse(parsed);
        } catch {
            return parsed;
        }
    }

    if (Array.isArray(parsed)) {
        const attachment = parsed.find(
            item => item && typeof item === 'object' && item.url
        );

        if (attachment) return attachment.url;

        const firstString = parsed.find(
            item => typeof item === 'string'
        );

        return firstString || '';
    }

    if (typeof parsed === 'object') {
        return parsed.url || '';
    }

    return '';
};

export const StudentAssignments = () => {
  const { assignments = [], assignedSubjects = [], submitAssignment, student } = useStudent();
  const [selectedDate, setSelectedDate] = useState(() => {
  const today = new Date();

  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
});
  const [selectedSubject, setSelectedSubject] = useState('all');
  const [statusTab, setStatusTab] = useState('all'); // 'all', 'pending', 'submitted', 'graded'
  const [searchQuery, setSearchQuery] = useState('');

  // Online Submission modal states
  const [submittingModalItem, setSubmittingModalItem] = useState(null);
  const [submissionFileUrl, setSubmissionFileUrl] = useState('');
  const [submissionText, setSubmissionText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionSuccess, setActionSuccess] = useState('');
  const [actionError, setActionError] = useState('');

  // 1. Metric Calculations
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const thisMonthCount = useMemo(() => {
    return assignments.filter((a) => {
      const d = a.assigned_date ? new Date(a.assigned_date) : null;
      return d && d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    }).length;
  }, [assignments, currentMonth, currentYear]);

  const dueThisWeekCount = useMemo(() => {
    const oneWeekAhead = new Date();
    oneWeekAhead.setDate(now.getDate() + 7);
    return assignments.filter((a) => {
      if (!a.due_date) return false;
      const d = new Date(a.due_date);
      return d >= now && d <= oneWeekAhead;
    }).length;
  }, [assignments, now]);

  const pendingCount = useMemo(() => {
    return assignments.filter(
      (a) => !a.my_submission_status || a.my_submission_status === 'Pending'
    ).length;
  }, [assignments]);

  const submittedCount = useMemo(() => {
    return assignments.filter(
      (a) => a.my_submission_status === 'Submitted'
    ).length;
  }, [assignments]);

  const gradedCount = useMemo(() => {
    return assignments.filter(
      (a) =>
        a.my_submission_status === 'Reviewed' ||
        a.my_submission_status === 'Graded' ||
        a.my_obtained_marks !== null
    ).length;
  }, [assignments]);

  // 2. Extract unique subjects and curriculum list
  const subjectList = useMemo(() => {
    const list = [];
    const seen = new Set();

    assignedSubjects.forEach((sub) => {
      if (!seen.has(sub.name)) {
        seen.add(sub.name);
        const count = assignments.filter(
          (a) => (a.subject_name || a.subject) === sub.name
        ).length;
        list.push({ name: sub.name, code: sub.code, count });
      }
    });

    assignments.forEach((a) => {
      const sName = a.subject_name || a.subject;
      if (sName && !seen.has(sName)) {
        seen.add(sName);
        const count = assignments.filter(
          (item) => (item.subject_name || item.subject) === sName
        ).length;
        list.push({ name: sName, code: '', count });
      }
    });

    return list;
  }, [assignedSubjects, assignments]);

  // 3. Filtered assignments
  const filteredAssignments = useMemo(() => {
    return assignments.filter((item) => {
      // Date filter
      if (selectedDate !== 'all') {
        const itemAssigned = item.assigned_date ? String(item.assigned_date).slice(0, 10) : '';
        const itemDue = item.due_date ? String(item.due_date).slice(0, 10) : '';
        if (itemAssigned !== selectedDate && itemDue !== selectedDate) {
          return false;
        }
      }

      // Subject filter
      if (selectedSubject !== 'all') {
        const sName = item.subject_name || item.subject;
        if (sName !== selectedSubject) return false;
      }

      // Status tab filter
      const submissionStatus = item.my_submission_status || 'Pending';
      if (statusTab === 'pending' && submissionStatus !== 'Pending') return false;
      if (statusTab === 'submitted' && submissionStatus !== 'Submitted') return false;
      if (
        statusTab === 'graded' &&
        submissionStatus !== 'Reviewed' &&
        submissionStatus !== 'Graded' &&
        item.my_obtained_marks === null
      ) {
        return false;
      }

      // Search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchTitle = item.title?.toLowerCase().includes(query);
        const matchDesc = item.description?.toLowerCase().includes(query);
        const matchSub = (item.subject_name || item.subject)?.toLowerCase().includes(query);
        if (!matchTitle && !matchDesc && !matchSub) return false;
      }

      return true;
    });
  }, [assignments, selectedDate, selectedSubject, statusTab, searchQuery]);

  const assignmentDates = useMemo(() => {
    return assignments
      .map((a) => a.assigned_date || a.due_date)
      .filter(Boolean);
  }, [assignments]);

  const handleOpenSubmit = (item) => {
      setSubmittingModalItem(item);
      setSubmissionFileUrl(extractSubmissionUrl(item.my_submission_files));
      setSubmissionText(item.my_submission_text || '');
      setActionError('');
      setActionSuccess('');
  };

  const handleCloseSubmit = () => {
    setSubmittingModalItem(null);
    setSubmissionFileUrl('');
    setSubmissionText('');
    setActionError('');
    setActionSuccess('');
  };

  const handleSubmitWork = async (e) => {
    e.preventDefault();
    if (!submissionFileUrl.trim() && !submissionText.trim()) {
      setActionError('Please provide a submission file link or answer notes.');
      return;
    }

    try {
      setIsSubmitting(true);
      setActionError('');
      await submitAssignment(submittingModalItem.id, {
        submission_file_url: submissionFileUrl.trim(),
        submission_text: submissionText.trim(),
      });
      setActionSuccess('Your assignment has been submitted successfully to your teacher!');
      setTimeout(() => {
        handleCloseSubmit();
      }, 1500);
    } catch (err) {
      setActionError(err.message || 'Failed to submit assignment. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-5 font-sans">
      {/* 1. TOP STATS CARDS */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Total Assigned */}
        <div className="bg-white rounded-3xl border border-slate-200/90 p-5 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-500">Total Assigned</div>
            <div className="mt-1 text-3xl font-black text-slate-900">{assignments.length}</div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-sky-50 text-[#008db9] flex items-center justify-center">
            <FileCheck2 className="w-6 h-6" />
          </div>
        </div>

        {/* This Month */}
        <div className="bg-white rounded-3xl border border-slate-200/90 p-5 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-amber-600">This Month</div>
            <div className="mt-1 text-3xl font-black text-amber-600">{thisMonthCount}</div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        {/* Due This Week */}
        <div className="bg-white rounded-3xl border border-slate-200/90 p-5 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-rose-600">Due This Week</div>
            <div className="mt-1 text-3xl font-black text-rose-600">{dueThisWeekCount}</div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center">
            <AlertCircle className="w-6 h-6" />
          </div>
        </div>
      </section>

      {/* 2. BROWSE BY DATE STRIP */}
      <BrowseByDateStrip
        selectedDate={selectedDate}
        onSelectDate={setSelectedDate}
        itemDates={assignmentDates}
        totalCount={assignments.length}
      />

      {/* 3. SEARCH & STATUS TABS ROW */}
      <section className="bg-white rounded-3xl border border-slate-200/90 p-3 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 scrollbar-none">
          <button
            type="button"
            onClick={() => setStatusTab('all')}
            className={`px-4 py-2 rounded-2xl text-xs font-extrabold transition whitespace-nowrap ${
              statusTab === 'all'
                ? 'bg-slate-100 text-slate-900 border border-slate-300'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            All ({assignments.length})
          </button>
          <button
            type="button"
            onClick={() => setStatusTab('pending')}
            className={`px-4 py-2 rounded-2xl text-xs font-bold transition whitespace-nowrap ${
              statusTab === 'pending'
                ? 'bg-slate-100 text-slate-900 border border-slate-300'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            Pending ({pendingCount})
          </button>
          <button
            type="button"
            onClick={() => setStatusTab('submitted')}
            className={`px-4 py-2 rounded-2xl text-xs font-bold transition whitespace-nowrap ${
              statusTab === 'submitted'
                ? 'bg-slate-100 text-slate-900 border border-slate-300'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            Submitted ({submittedCount})
          </button>
          <button
            type="button"
            onClick={() => setStatusTab('graded')}
            className={`px-4 py-2 rounded-2xl text-xs font-bold transition whitespace-nowrap ${
              statusTab === 'graded'
                ? 'bg-slate-100 text-slate-900 border border-slate-300'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            Graded ({gradedCount})
          </button>
        </div>

        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search assignments..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-xs rounded-2xl border border-slate-200 bg-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#008db9]/30 focus:border-[#008db9] transition"
          />
        </div>
      </section>

      {/* 4. FILTER BY SUBJECT ROW */}
      <section className="bg-white rounded-3xl border border-slate-200/90 p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-800">Filter By Subject:</span>
          <span className="text-xs text-slate-500">
            {subjectList.length} Subjects in Curriculum
          </span>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          <button
            type="button"
            onClick={() => setSelectedSubject('all')}
            className={`shrink-0 px-4 py-1.5 rounded-full text-xs font-extrabold transition flex items-center gap-1.5 ${
              selectedSubject === 'all'
                ? 'bg-[#008db9] text-white shadow-xs'
                : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            <span>All Subjects</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                selectedSubject === 'all'
                  ? 'bg-white/20 text-white'
                  : 'bg-slate-100 text-slate-600'
              }`}
            >
              {assignments.length}
            </span>
          </button>

          {subjectList.map((sub) => {
            const isSelected = selectedSubject === sub.name;
            return (
              <button
                key={sub.name}
                type="button"
                onClick={() => setSelectedSubject(sub.name)}
                className={`shrink-0 px-4 py-1.5 rounded-full text-xs font-bold transition flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-[#008db9] text-white shadow-xs'
                    : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <span>{sub.name}</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                    isSelected
                      ? 'bg-white/20 text-white'
                      : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {sub.count}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* 5. CONTENT RESULTS OR EMPTY STATE */}
      {filteredAssignments.length === 0 ? (
        <section className="bg-white rounded-3xl border border-slate-200/90 p-16 text-center shadow-xs">
          <div className="w-14 h-14 rounded-2xl bg-slate-50 text-slate-400 flex items-center justify-center mx-auto mb-3">
            <FileCheck2 className="w-7 h-7 stroke-[1.5]" />
          </div>
          <h3 className="text-base font-extrabold text-slate-800">No Assignments Found</h3>
          <p className="mt-1 text-xs text-slate-400">
            {selectedDate !== 'all'
              ? `No assignments assigned on ${new Date(selectedDate).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}.`
              : 'No assignments matching your current filters.'}
          </p>
        </section>
      ) : (
        <section className="space-y-4">
          {filteredAssignments.map((item) => {
            const subject = item.subject_name || item.subject || 'General';
            const submissionStatus = item.my_submission_status || 'Pending';
            const isGraded =
              submissionStatus === 'Reviewed' ||
              submissionStatus === 'Graded' ||
              item.my_obtained_marks !== null;

            let attachments = [];
            if (item.attachments) {
              try {
                attachments =
                  typeof item.attachments === 'string'
                    ? JSON.parse(item.attachments)
                    : item.attachments;
              } catch (e) {
                attachments = [];
              }
            }

            return (
              <div
                key={item.id}
                className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-xs hover:border-[#008db9]/50 transition duration-150"
              >
                <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-5">
                  <div className="space-y-2 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-3 py-1 rounded-xl text-xs font-black bg-[#e0f7fa] text-[#007094] border border-[#b2ebf2]">
                        {subject}
                      </span>
                      <span className="text-xs font-bold text-slate-400">
                        Max Marks: <strong className="text-slate-800">{item.max_marks || 100}</strong>
                      </span>
                      {item.due_date && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-600 bg-rose-50 border border-rose-100 px-2.5 py-0.5 rounded-full">
                          <Calendar className="w-3 h-3" />
                          Due: {new Date(item.due_date).toLocaleDateString('en-IN')}
                        </span>
                      )}
                    </div>

                    <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                      {item.title}
                    </h3>

                    <p className="text-xs sm:text-sm text-slate-600 leading-relaxed whitespace-pre-line">
                      {item.description || 'No detailed instructions.'}
                    </p>

                    {attachments && attachments.length > 0 && (
                      <div className="pt-2 flex flex-wrap gap-2">
                        {attachments.map((att, idx) => {
                          const fileUrl = att.url || att;
                          return (
                            <a
                              key={idx}
                              href={fileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-xs font-bold text-[#008db9] bg-sky-50 hover:bg-sky-100 border border-sky-200 px-3 py-1 rounded-xl transition"
                            >
                              <Paperclip className="w-3.5 h-3.5" />
                              <span>{att.name || `Reference Doc #${idx + 1}`}</span>
                              <ExternalLink className="w-3 h-3 ml-0.5" />
                            </a>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <div className="lg:w-80 shrink-0 rounded-2xl bg-slate-50 border border-slate-200/80 p-4 flex flex-col justify-between gap-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-500">Submission Status</span>
                      <span
                        className={`px-3 py-0.5 rounded-full text-xs font-black ${
                          isGraded
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            : submissionStatus === 'Submitted'
                            ? 'bg-sky-100 text-sky-800 border border-sky-200'
                            : 'bg-amber-100 text-amber-800 border border-amber-200'
                        }`}
                      >
                        {submissionStatus}
                      </span>
                    </div>

                    {isGraded && (
                      <div className="rounded-xl bg-white border border-emerald-100 p-3 space-y-1">
                        <div className="flex items-center justify-between text-xs font-extrabold text-slate-900">
                          <span className="flex items-center gap-1 text-emerald-700">
                            <Award className="w-4 h-4" /> Score Obtained
                          </span>
                          <span className="text-base text-emerald-800">
                            {item.my_obtained_marks} / {item.max_marks || 100}
                          </span>
                        </div>
                        {item.my_teacher_feedback && (
                          <div className="text-xs text-slate-600 bg-slate-50 p-2 rounded-lg mt-1 border border-slate-100">
                            <span className="font-bold text-slate-700">Teacher Remarks: </span>
                            {item.my_teacher_feedback}
                          </div>
                        )}
                      </div>
                    )}

                    <div>
                      <button
                        type="button"
                        onClick={() => handleOpenSubmit(item)}
                        className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold shadow-xs transition flex items-center justify-center gap-1.5 ${
                          submissionStatus === 'Pending'
                            ? 'bg-[#008db9] text-white hover:bg-[#007ba2]'
                            : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <UploadCloud className="w-4 h-4" />
                        <span>
                          {submissionStatus === 'Pending' ? 'Submit Assignment Work' : 'Resubmit / Edit Work'}
                        </span>
                      </button>
                      {item.my_submitted_at && (
                        <p className="text-[10px] text-center text-slate-400 mt-1">
                          Submitted on {new Date(item.my_submitted_at).toLocaleDateString('en-IN')}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </section>
      )}

      {/* Online Submission Modal */}
      {submittingModalItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-sky-100 text-[#008db9] flex items-center justify-center">
                  <UploadCloud className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">
                    Submit Assignment Work
                  </h3>
                  <p className="text-xs text-slate-500">{submittingModalItem.title}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleCloseSubmit}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {actionSuccess ? (
              <div className="py-8 text-center space-y-2">
                <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                  <Check className="w-6 h-6" />
                </div>
                <p className="text-sm font-bold text-emerald-900">{actionSuccess}</p>
              </div>
            ) : (
              <form onSubmit={handleSubmitWork} className="space-y-4">
                {actionError && (
                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs font-bold text-rose-700 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{actionError}</span>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    File Attachment URL (Google Drive / Cloud Link / PDF)
                  </label>
                  <input
                    type="url"
                    placeholder="https://drive.google.com/... or document URL"
                    value={submissionFileUrl}
                    onChange={(e) => setSubmissionFileUrl(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#008db9]/30 focus:border-[#008db9] transition"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    Paste a link to your shared project file, presentation or Google Doc.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Submission Notes / Text Answer
                  </label>
                  <textarea
                    rows={4}
                    placeholder="Type any answers, project summary or notes for your teacher..."
                    value={submissionText}
                    onChange={(e) => setSubmissionText(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#008db9]/30 focus:border-[#008db9] transition"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={handleCloseSubmit}
                    disabled={isSubmitting}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-5 py-2 rounded-xl text-xs font-bold bg-[#008db9] hover:bg-[#007ba2] text-white shadow-xs transition flex items-center gap-1.5"
                  >
                    {isSubmitting ? (
                      <span>Submitting...</span>
                    ) : (
                      <>
                        <UploadCloud className="w-4 h-4" />
                        <span>Confirm & Submit</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentAssignments;
