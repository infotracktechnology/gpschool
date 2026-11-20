import React, { useState, useMemo, useEffect } from 'react';
import {
  Bell,
  Calendar,
  Clock,
  AlertCircle,
  Search,
  Paperclip,
  Download,
  FileText,
  AlertTriangle,
  Megaphone,
} from 'lucide-react';
import { useStudent } from '../../context/StudentContext';
import { BrowseByDateStrip } from '../../components/student/BrowseByDateStrip';

export const StudentAnnouncements = () => {
  const { announcements = [], student } = useStudent();
  const [selectedDate, setSelectedDate] = useState(() => {
  const today = new Date();

  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
});
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [statusTab, setStatusTab] = useState('all'); // 'all', 'urgent'
  const [searchQuery, setSearchQuery] = useState('');

  // 1. Metric Calculations
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const thisMonthCount = useMemo(() => {
    return announcements.filter((a) => {
      const d = a.created_at ? new Date(a.created_at) : null;
      return d && d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    }).length;
  }, [announcements, currentMonth, currentYear]);

  const urgentCount = useMemo(() => {
    return announcements.filter(
      (a) => a.priority === 'High' || a.priority === 'Urgent'
    ).length;
  }, [announcements]);

  // 2. Extract unique categories with counts
  const categoryList = useMemo(() => {
    const list = [];
    const countsMap = {};
    announcements.forEach((a) => {
      const cat = a.category || 'General';
      countsMap[cat] = (countsMap[cat] || 0) + 1;
    });

    Object.keys(countsMap).forEach((name) => {
      list.push({ name, count: countsMap[name] });
    });

    return list;
  }, [announcements]);

  // 3. Filtered announcements
  const filteredAnnouncements = useMemo(() => {
    return announcements.filter((item) => {
      // Date filter
      if (selectedDate !== 'all') {
        const itemDate = item.created_at ? String(item.created_at).slice(0, 10) : '';
        if (itemDate !== selectedDate) {
          return false;
        }
      }

      // Category filter
      if (selectedCategory !== 'all') {
        if ((item.category || 'General') !== selectedCategory) return false;
      }

      // Status tab filter
      if (statusTab === 'urgent') {
        if (item.priority !== 'High' && item.priority !== 'Urgent') return false;
      }

      // Search filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchTitle = item.title?.toLowerCase().includes(query);
        const matchContent = item.content?.toLowerCase().includes(query);
        const matchCat = (item.category || '')?.toLowerCase().includes(query);
        if (!matchTitle && !matchContent && !matchCat) return false;
      }

      return true;
    });
  }, [announcements, selectedDate, selectedCategory, statusTab, searchQuery]);

  const announcementDates = useMemo(() => {
    return announcements.map((a) => a.created_at).filter(Boolean);
  }, [announcements]);

  return (
    <div className="space-y-5 font-sans">
      {/* 1. TOP STATS CARDS */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Total Notices */}
        <div className="bg-white rounded-3xl border border-slate-200/90 p-5 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-500">Total Notices</div>
            <div className="mt-1 text-3xl font-black text-slate-900">{announcements.length}</div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-sky-50 text-[#008db9] flex items-center justify-center">
            <Bell className="w-6 h-6" />
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

        {/* Urgent & High Priority */}
        <div className="bg-white rounded-3xl border border-slate-200/90 p-5 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-rose-600">Urgent & High Priority</div>
            <div className="mt-1 text-3xl font-black text-rose-600">{urgentCount}</div>
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
        itemDates={announcementDates}
        totalCount={announcements.length}
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
            All Notices ({announcements.length})
          </button>
          <button
            type="button"
            onClick={() => setStatusTab('urgent')}
            className={`px-4 py-2 rounded-2xl text-xs font-bold transition ${
              statusTab === 'urgent'
                ? 'bg-slate-100 text-slate-900 border border-slate-300'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            Urgent ({urgentCount})
          </button>
        </div>

        <div className="relative w-full sm:w-96">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search announcements..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-xs rounded-2xl border border-slate-200 bg-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#008db9]/30 focus:border-[#008db9] transition"
          />
        </div>
      </section>

      {/* 4. FILTER BY CATEGORY ROW */}
      <section className="bg-white rounded-3xl border border-slate-200/90 p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-800">Filter By Category:</span>
          <span className="text-xs text-slate-500">
            {categoryList.length} Categories
          </span>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          <button
            type="button"
            onClick={() => setSelectedCategory('all')}
            className={`shrink-0 px-4 py-1.5 rounded-full text-xs font-extrabold transition flex items-center gap-1.5 ${
              selectedCategory === 'all'
                ? 'bg-[#008db9] text-white shadow-xs'
                : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            <span>All Categories</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                selectedCategory === 'all'
                  ? 'bg-white/20 text-white'
                  : 'bg-slate-100 text-slate-600'
              }`}
            >
              {announcements.length}
            </span>
          </button>

          {categoryList.map((cat) => {
            const isSelected = selectedCategory === cat.name;
            return (
              <button
                key={cat.name}
                type="button"
                onClick={() => setSelectedCategory(cat.name)}
                className={`shrink-0 px-4 py-1.5 rounded-full text-xs font-bold transition flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-[#008db9] text-white shadow-xs'
                    : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <span>{cat.name}</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                    isSelected
                      ? 'bg-white/20 text-white'
                      : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {cat.count}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* 5. CONTENT RESULTS OR EMPTY STATE */}
      {filteredAnnouncements.length === 0 ? (
        <section className="bg-white rounded-3xl border border-slate-200/90 p-16 text-center shadow-xs">
          <div className="w-14 h-14 rounded-2xl bg-slate-50 text-slate-400 flex items-center justify-center mx-auto mb-3">
            <Bell className="w-7 h-7 stroke-[1.5]" />
          </div>
          <h3 className="text-base font-extrabold text-slate-800">No Announcements Found</h3>
          <p className="mt-1 text-xs text-slate-400">
            {selectedDate !== 'all'
              ? `No circulars posted on ${new Date(selectedDate).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}.`
              : 'No school notices matching your current filters.'}
          </p>
        </section>
      ) : (
        <section className="space-y-4">
          {filteredAnnouncements.map((item) => {
            const isHighPriority = item.priority === 'High' || item.priority === 'Urgent';

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
                className={`rounded-3xl border bg-white p-6 shadow-xs transition hover:border-[#008db9]/50 ${
                  isHighPriority ? 'border-amber-300 bg-amber-50/20' : 'border-slate-200/90'
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 rounded-xl text-xs font-black bg-[#e0f7fa] text-[#007094] border border-[#b2ebf2]">
                      {item.category || 'General'}
                    </span>
                    {isHighPriority && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-100 text-rose-700 border border-rose-200">
                        <AlertTriangle className="w-3 h-3" />
                        {item.priority}
                      </span>
                    )}
                    <span className="text-[11px] font-semibold text-slate-500">
                      Target: {item.target_class_id ? `Class ${student?.class_name || '1'}` : 'School-Wide'}
                    </span>
                  </div>

                  {item.created_at && (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-400">
                      <Calendar className="w-3.5 h-3.5" />
                      {new Date(item.created_at).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </span>
                  )}
                </div>

                <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight leading-snug">
                  {item.title}
                </h3>

                <div className="mt-2 text-xs sm:text-sm text-slate-600 leading-relaxed whitespace-pre-line">
                  {item.content}
                </div>

                {attachments && attachments.length > 0 && (
                  <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap gap-2">
                    {attachments.map((att, idx) => {
                      const fileUrl = att.url || att;
                      return (
                        <a
                          key={idx}
                          href={fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-sky-200 bg-sky-50 hover:bg-sky-100 text-xs font-bold text-sky-800 transition"
                        >
                          <FileText className="w-3.5 h-3.5 text-sky-600" />
                          <span>{att.name || `Notice Document #${idx + 1}`}</span>
                          <Download className="w-3 h-3 ml-1 text-sky-600" />
                        </a>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </section>
      )}
    </div>
  );
};

export default StudentAnnouncements;
