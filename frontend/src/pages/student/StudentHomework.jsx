import React, { useState, useMemo } from 'react';
import {
  BookOpen,
  Calendar,
  Clock,
  AlertCircle,
  Search,
  Paperclip,
  Download,
  FileText,
  CheckCircle2,
  ExternalLink,
} from 'lucide-react';
import { useStudent } from '../../context/StudentContext';
import { BrowseByDateStrip } from '../../components/student/BrowseByDateStrip';

export const StudentHomework = () => {
  const { homework = [], assignedSubjects = [], student } = useStudent();
  const [selectedDate, setSelectedDate] = useState(() => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
});
  const [selectedSubject, setSelectedSubject] = useState('all');
  const [statusTab, setStatusTab] = useState('all'); // 'all', 'pending'
  const [searchQuery, setSearchQuery] = useState('');

  // 1. Metric Calculations
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const thisMonthCount = useMemo(() => {
    return homework.filter((h) => {
      const d = h.assigned_date ? new Date(h.assigned_date) : null;
      return d && d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    }).length;
  }, [homework, currentMonth, currentYear]);

  const dueThisWeekCount = useMemo(() => {
    const oneWeekAhead = new Date();
    oneWeekAhead.setDate(now.getDate() + 7);
    return homework.filter((h) => {
      if (!h.due_date) return false;
      const d = new Date(h.due_date);
      return d >= now && d <= oneWeekAhead;
    }).length;
  }, [homework, now]);

  // 2. Extract unique subjects and curriculum list
  const subjectList = useMemo(() => {
    const list = [];
    const seen = new Set();

    // From assignedSubjects first
    assignedSubjects.forEach((sub) => {
      if (!seen.has(sub.name)) {
        seen.add(sub.name);
        const count = homework.filter(
          (h) => (h.subject_name || h.subject) === sub.name
        ).length;
        list.push({ name: sub.name, code: sub.code, count });
      }
    });

    // Also include any subjects appearing in homework
    homework.forEach((h) => {
      const sName = h.subject_name || h.subject;
      if (sName && !seen.has(sName)) {
        seen.add(sName);
        const count = homework.filter(
          (item) => (item.subject_name || item.subject) === sName
        ).length;
        list.push({ name: sName, code: '', count });
      }
    });

    return list;
  }, [assignedSubjects, homework]);

  // 3. Filtered homework
  const filteredHomework = useMemo(() => {
    return homework.filter((item) => {
      // Date filter (by assigned_date or due_date)
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
  }, [homework, selectedDate, selectedSubject, searchQuery]);

  const homeworkDates = useMemo(() => {
    return homework
      .map((h) => h.assigned_date || h.due_date)
      .filter(Boolean);
  }, [homework]);

  return (
    <div className="space-y-5 font-sans">
      {/* 1. TOP STATS CARDS */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Total Assigned */}
        <div className="bg-white rounded-3xl border border-slate-200/90 p-5 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-500">Total Assigned</div>
            <div className="mt-1 text-3xl font-black text-slate-900">{homework.length}</div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-sky-50 text-[#008db9] flex items-center justify-center">
            <BookOpen className="w-6 h-6" />
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
        itemDates={homeworkDates}
        totalCount={homework.length}
      />

      {/* 3. SEARCH & STATUS TABS ROW */}
      <section className="bg-white rounded-3xl border border-slate-200/90 p-3 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setStatusTab('all')}
            className={`px-4 py-2 rounded-2xl text-xs font-extrabold transition ${
              statusTab === 'all'
                ? 'bg-slate-100 text-slate-900 border border-slate-300'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            All ({homework.length})
          </button>
          <button
            type="button"
            onClick={() => setStatusTab('pending')}
            className={`px-4 py-2 rounded-2xl text-xs font-bold transition ${
              statusTab === 'pending'
                ? 'bg-slate-100 text-slate-900 border border-slate-300'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            Pending
          </button>
        </div>

        <div className="relative w-full sm:w-96">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search homework..."
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
              {homework.length}
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
      {filteredHomework.length === 0 ? (
        <section className="bg-white rounded-3xl border border-slate-200/90 p-16 text-center shadow-xs">
          <div className="w-14 h-14 rounded-2xl bg-slate-50 text-slate-400 flex items-center justify-center mx-auto mb-3">
            <BookOpen className="w-7 h-7 stroke-[1.5]" />
          </div>
          <h3 className="text-base font-extrabold text-slate-800">No Homework Found</h3>
          <p className="mt-1 text-xs text-slate-400">
            {selectedDate !== 'all'
              ? `No homework assigned on ${new Date(selectedDate).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}.`
              : 'No homework tasks matching your current filters.'}
          </p>
        </section>
      ) : (
        <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredHomework.map((item) => {
            const subject = item.subject_name || item.subject || 'General';
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
                className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-xs flex flex-col justify-between hover:border-[#008db9]/50 transition duration-150"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="px-3 py-1 rounded-xl text-xs font-black bg-[#e0f7fa] text-[#007094] border border-[#b2ebf2]">
                      {subject}
                    </span>
                    {item.due_date && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        Due: {new Date(item.due_date).toLocaleDateString('en-IN')}
                      </span>
                    )}
                  </div>

                  <h3 className="text-base font-black text-slate-900 leading-snug">
                    {item.title}
                  </h3>

                  <div className="mt-2 text-xs sm:text-sm text-slate-600 whitespace-pre-line leading-relaxed">
                    {item.description || item.instructions || 'No special instructions provided.'}
                  </div>
                </div>

                {/* Attachments Section */}
                {attachments && attachments.length > 0 && (
                  <div className="mt-4 pt-3 border-t border-slate-100 space-y-1.5">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                      <Paperclip className="w-3 h-3" />
                      <span>Study Materials & Attachments ({attachments.length})</span>
                    </div>
                    <div className="flex flex-wrap gap-2 pt-1">
                      {attachments.map((att, idx) => {
                        const fileUrl = att.url || att;
                        const fileName = att.name || `Attachment #${idx + 1}`;
                        return (
                          <a
                            key={idx}
                            href={fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-sky-200 bg-sky-50 hover:bg-sky-100 text-xs font-bold text-sky-800 transition"
                          >
                            <FileText className="w-3.5 h-3.5 text-sky-600" />
                            <span className="max-w-[180px] truncate">{fileName}</span>
                            <Download className="w-3 h-3 text-sky-600 ml-1" />
                          </a>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400 font-medium">
                  <span>
                    Assigned:{' '}
                    {item.assigned_date
                      ? new Date(item.assigned_date).toLocaleDateString('en-IN')
                      : 'Recent'}
                  </span>
                  <span className="text-[#008db9] font-bold">Class {item.class_name || student?.class_name || '1'}</span>
                </div>
              </div>
            );
          })}
        </section>
      )}
    </div>
  );
};

export default StudentHomework;
