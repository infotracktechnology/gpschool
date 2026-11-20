import React, { useRef, useMemo, useEffect } from 'react';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';

export const BrowseByDateStrip = ({
  selectedDate,
  onSelectDate,
  itemDates = [], // array of ISO date strings e.g. ['2026-11-19', '2026-11-18']
  totalCount = 0,
}) => {
  const scrollContainerRef = useRef(null);
  const selectedDateRef = useRef(null);

  useEffect(() => {
  const container = scrollContainerRef.current;
  const target = selectedDateRef.current;

  if (!container || !target) return;

  const containerRect = container.getBoundingClientRect();
  const targetRect = target.getBoundingClientRect();

  const scrollPosition =
    container.scrollLeft +
    targetRect.left -
    containerRect.left -
    (container.clientWidth - target.clientWidth) / 2;

  container.scrollTo({
    left: Math.max(0, scrollPosition),
    behavior: 'smooth',
  });
}, [selectedDate]);

  // Use the current or selected month
  const today = useMemo(() => new Date(), []);
  const year = today.getFullYear();
  const month = today.getMonth(); // 0-indexed

  const monthName = today.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

  // Generate days for current month
  const daysInMonth = useMemo(() => {
    const days = [];
    const numDays = new Date(year, month + 1, 0).getDate();

    // Map counts per date string YYYY-MM-DD
    const countsMap = {};
    itemDates.forEach((d) => {
      if (!d) return;
      const key = String(d).slice(0, 10);
      countsMap[key] = (countsMap[key] || 0) + 1;
    });

    for (let day = 1; day <= numDays; day++) {
      const dateObj = new Date(year, month, day);
      const dayName = dateObj.toLocaleDateString('en-IN', { weekday: 'short' });
      const isoDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      days.push({
        day,
        dayName,
        isoDate,
        count: countsMap[isoDate] || 0,
      });
    }
    return days;
  }, [year, month, itemDates]);

  const scroll = (direction) => {
    if (scrollContainerRef.current) {
      const offset = direction === 'left' ? -240 : 240;
      scrollContainerRef.current.scrollBy({ left: offset, behavior: 'smooth' });
    }
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200/90 p-5 shadow-xs">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
            <Calendar className="w-4 h-4" />
          </div>
          <span className="text-base font-extrabold text-slate-900">Browse by Date</span>
        </div>

        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-700">
          <span>{monthName}</span>
          <Calendar className="w-3.5 h-3.5 text-slate-400" />
        </div>
      </div>

      {/* Date Strip with arrows */}
      <div className="relative flex items-center gap-2">
        <button
          type="button"
          onClick={() => scroll('left')}
          className="shrink-0 p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
          title="Scroll Left"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <div
          ref={scrollContainerRef}
          className="flex items-center gap-2 overflow-x-auto pb-2 pt-1 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent scroll-smooth w-full"
        >
          {/* "All Days" Pill */}
          <button
            type="button"
            ref={selectedDate === 'all' ? selectedDateRef : null}
            onClick={() => onSelectDate('all')}
            className={`shrink-0 px-4 py-2.5 rounded-2xl text-xs font-extrabold transition flex items-center gap-1.5 ${
              selectedDate === 'all'
                ? 'bg-[#008db9] text-white shadow-xs'
                : 'bg-slate-50 border border-slate-200 text-slate-700 hover:bg-slate-100'
            }`}
          >
            <span>All Days</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                selectedDate === 'all' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
              }`}
            >
              {totalCount}
            </span>
          </button>

          {/* Daily Date Pills */}
          {daysInMonth.map((d) => {
            const isSelected = selectedDate === d.isoDate;
            const isToday =
              d.day === today.getDate() &&
              month === today.getMonth() &&
              year === today.getFullYear();

            return (
             <button
                key={d.isoDate}
                type="button"
                ref={isSelected ? selectedDateRef : null}
                onClick={() => onSelectDate(d.isoDate)}
                className={`shrink-0 w-12 h-16 rounded-2xl flex flex-col items-center justify-center transition border ${
                  isSelected
                    ? 'bg-[#008db9] text-white border-[#008db9] shadow-sm ring-2 ring-[#008db9]/20'
                    : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700'
                }`}
              >
                <span className={`text-[11px] font-semibold ${isSelected ? 'text-white/80' : 'text-slate-400'}`}>
                  {d.dayName}
                </span>
                <span className={`text-base font-extrabold ${isSelected ? 'text-white' : 'text-slate-900'}`}>
                  {d.day}
                </span>
                <span
                  className={`w-1.5 h-1.5 rounded-full mt-0.5 ${
                    isSelected
                      ? 'bg-white'
                      : d.count > 0
                      ? 'bg-[#008db9]'
                      : 'bg-slate-200'
                  }`}
                />
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => scroll('right')}
          className="shrink-0 p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
          title="Scroll Right"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default BrowseByDateStrip;
