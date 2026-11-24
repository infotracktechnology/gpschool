
import React, { useState, useMemo } from 'react';
import {
  CalendarDays,
  Calendar as CalendarIcon,
  Sparkles,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useStudent } from '../../context/StudentContext';

export const StudentCalendar = () => {
  const { events, loading } = useStudent();

  const [filterType, setFilterType] = useState('all');
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const eventTypeLabels = {
    public_holiday: {
      label: 'Public Holiday',
      bg: 'bg-rose-50 text-rose-700 border-rose-200',
      calendar: 'bg-rose-50 border-l-2 border-rose-400 text-rose-800',
    },
    school_holiday: {
      label: 'School Vacation',
      bg: 'bg-amber-50 text-amber-700 border-amber-200',
      calendar: 'bg-amber-50 border-l-2 border-amber-400 text-amber-800',
    },
    exam: {
      label: 'Exam / Assessment',
      bg: 'bg-purple-50 text-purple-700 border-purple-200',
      calendar: 'bg-purple-50 border-l-2 border-purple-400 text-purple-800',
    },
    school_event: {
      label: 'School Event',
      bg: 'bg-blue-50 text-blue-700 border-blue-200',
      calendar: 'bg-blue-50 border-l-2 border-blue-400 text-blue-800',
    },
    academic_milestone: {
      label: 'Milestone',
      bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      calendar: 'bg-emerald-50 border-l-2 border-emerald-400 text-emerald-800',
    },
  };

  // Parse date in local timezone
  const parseDate = (value) => {
    if (!value) return null;

    const dateString = String(value).slice(0, 10);
    const parts = dateString.split('-');

    if (parts.length !== 3) return null;

    const date = new Date(
      Number(parts[0]),
      Number(parts[1]) - 1,
      Number(parts[2])
    );

    return Number.isNaN(date.getTime()) ? null : date;
  };

  const getDateKey = (date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  // Filters
  const filteredEvents = useMemo(() => {
    if (!events) return [];

    return events.filter((ev) => {
      const type = String(ev.event_type || '').toLowerCase();

      if (filterType === 'all') return true;

      if (filterType === 'holiday') {
        return ev.is_holiday ||
          type.includes('holiday') ||
          type.includes('vacation');
      }

      if (filterType === 'exam') return type === 'exam';
      if (filterType === 'event') return type === 'school_event';

      return type === filterType;
    });
  }, [events, filterType]);

  // Month calculations
  const firstDay = new Date(
    currentMonth.getFullYear(),
    currentMonth.getMonth(),
    1
  );

  const lastDay = new Date(
    currentMonth.getFullYear(),
    currentMonth.getMonth() + 1,
    0
  );

  const calendarStart = new Date(
    firstDay.getFullYear(),
    firstDay.getMonth(),
    1 - firstDay.getDay()
  );

  const totalCells = Math.ceil(
    (firstDay.getDay() + lastDay.getDate()) / 7
  ) * 7;

  const calendarDays = Array.from(
    { length: totalCells },
    (_, index) => {
      const date = new Date(calendarStart);
      date.setDate(calendarStart.getDate() + index);
      return date;
    }
  );

  const monthName = currentMonth.toLocaleDateString('en-IN', {
    month: 'long',
    year: 'numeric',
  });

  const todayKey = getDateKey(new Date());

  const changeMonth = (direction) => {
    setCurrentMonth((prev) =>
      new Date(
        prev.getFullYear(),
        prev.getMonth() + direction,
        1
      )
    );
  };

  // Events sorted by date
  const sortedEvents = useMemo(() => {
    return [...filteredEvents].sort((a, b) => {
      const dateA = parseDate(a.start_date);
      const dateB = parseDate(b.start_date);

      return (dateA?.getTime() || 0) - (dateB?.getTime() || 0);
    });
  }, [filteredEvents]);

  // Upcoming event cards
  const upcomingEvents = useMemo(() => {
    const today = getDateKey(new Date());

    return sortedEvents
      .filter((ev) => {
        const end = parseDate(ev.end_date || ev.start_date);
        return end && getDateKey(end) >= today;
      })
      .slice(0, 4);
  }, [sortedEvents]);

  // Map events to calendar dates
  const eventsByDate = useMemo(() => {
    const grouped = {};

    filteredEvents.forEach((ev) => {
      const start = parseDate(ev.start_date);
      const end = parseDate(ev.end_date || ev.start_date);

      if (!start || !end) return;

      const current = new Date(start);

      while (current <= end) {
        const key = getDateKey(current);

        if (!grouped[key]) grouped[key] = [];

        grouped[key].push(ev);

        current.setDate(current.getDate() + 1);
      }
    });

    return grouped;
  }, [filteredEvents]);

  const getMeta = (type) => {
    return eventTypeLabels[type] || {
      label: type || 'Event',
      bg: 'bg-slate-50 text-slate-700 border-slate-200',
      calendar: 'bg-slate-50 border-l-2 border-slate-400 text-slate-700',
    };
  };

  const formatDate = (value) => {
    const date = parseDate(value);

    if (!date) return '—';

    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
    });
  };

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
            <CalendarDays className="w-4 h-4 text-indigo-500" />
            Academic Calendar
          </div>

          <h1 className="mt-1 text-2xl font-bold text-slate-900 tracking-tight">
            School Calendar
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Explore school events, holidays and examination schedules.
          </p>
        </div>

        <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-50 border border-indigo-100">
          <Sparkles className="w-4 h-4 text-indigo-600" />
          <span className="text-xs font-bold text-indigo-700">
            {filteredEvents.length} Calendar Events
          </span>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto bg-white p-2 rounded-2xl border border-slate-200 shadow-sm">
        {[
          { id: 'all', label: 'All Schedules' },
          { id: 'holiday', label: 'Holidays & Vacations' },
          { id: 'exam', label: 'Exams & Tests' },
          { id: 'event', label: 'Functions & Events' },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setFilterType(tab.id)}
            className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition ${
              filterType === tab.id
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Upcoming Events */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-500" />
          <h2 className="text-sm font-bold text-slate-600 uppercase tracking-wider">
            Upcoming Events & Holidays
          </h2>
        </div>

        {loading ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-sm text-slate-400">
            Loading calendar events...
          </div>
        ) : upcomingEvents.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center">
            <p className="text-sm font-semibold text-slate-700">
              No Upcoming Events
            </p>
            <p className="text-xs text-slate-400 mt-1">
              No upcoming schedules found.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {upcomingEvents.map((ev) => {
              const meta = getMeta(ev.event_type);

              return (
                <div
                  key={ev.id}
                  className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm hover:shadow-md hover:border-indigo-200 transition flex flex-col justify-between min-h-[180px]"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-4">
                      <span className={`inline-flex px-2.5 py-1 rounded-lg border text-[10px] font-bold ${meta.bg}`}>
                        {meta.label}
                      </span>

                      {Number(ev.school_closed) === 1 && (
                        <span className="px-2 py-1 rounded-md bg-rose-50 border border-rose-200 text-rose-600 text-[9px] font-bold">
                          CLOSED
                        </span>
                      )}
                    </div>

                    <h3 className="text-sm font-bold text-slate-900 leading-snug">
                      {ev.title}
                    </h3>

                    <p className="mt-2 text-xs text-slate-500 leading-relaxed line-clamp-2">
                      {ev.description || 'No additional event details provided.'}
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100">
                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                      <CalendarIcon className="w-3.5 h-3.5 text-indigo-500" />
                      {formatDate(ev.start_date)}
                      {ev.end_date &&
                        getDateKey(parseDate(ev.start_date) || new Date()) !==
                        getDateKey(parseDate(ev.end_date) || new Date()) &&
                        ` - ${formatDate(ev.end_date)}`}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Calendar */}
      <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">

        {/* Calendar Header */}
        <div className="p-5 sm:p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">

          <div>
            <div className="flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-indigo-600" />
              <h2 className="text-base font-bold text-slate-900">
                Monthly Calendar
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              View all scheduled events by date
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => changeMonth(-1)}
              className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50"
              aria-label="Previous month"
            >
              <ChevronLeft className="w-4 h-4 text-slate-600" />
            </button>

            <span className="min-w-36 text-center text-sm font-bold text-slate-800">
              {monthName}
            </span>

            <button
              type="button"
              onClick={() => changeMonth(1)}
              className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50"
              aria-label="Next month"
            >
              <ChevronRight className="w-4 h-4 text-slate-600" />
            </button>

            <button
              type="button"
              onClick={() => setCurrentMonth(new Date())}
              className="ml-1 px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
            >
              Today
            </button>
          </div>
        </div>

        {/* Legend */}
        <div className="px-5 sm:px-6 py-3 flex flex-wrap gap-4 border-b border-slate-100">
          {Object.entries(eventTypeLabels).map(([key, meta]) => (
            <div key={key} className="flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full ${meta.dot || 'bg-slate-400'}`} />
              <span className="text-[11px] font-medium text-slate-500">
                {meta.label}
              </span>
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div className="overflow-x-auto">
          <div className="min-w-[750px]">

            <div className="grid grid-cols-7 bg-slate-50 border-b border-slate-200">
              {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map((day, index) => (
                <div
                  key={day}
                  className={`py-4 text-center text-xs font-bold ${
                    index === 0 ? 'text-rose-500' : 'text-slate-500'
                  }`}
                >
                  {day}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7">
              {calendarDays.map((date) => {
                const key = getDateKey(date);
                const isCurrentMonth =
                  date.getMonth() === currentMonth.getMonth();

                const isToday = key === todayKey;
                const dayEvents = eventsByDate[key] || [];

                return (
                  <div
                    key={key}
                    className={`min-h-[125px] sm:min-h-[145px] p-2 sm:p-3 border-r border-b border-slate-100 ${
                      !isCurrentMonth ? 'bg-slate-50/60' : 'bg-white'
                    } ${isToday ? 'bg-indigo-50/40' : ''}`}
                  >
                    <div className="mb-3">
                      <span className={`w-7 h-7 flex items-center justify-center rounded-full text-xs font-bold ${
                        isToday
                          ? 'bg-indigo-600 text-white'
                          : isCurrentMonth
                          ? 'text-slate-800'
                          : 'text-slate-300'
                      }`}>
                        {date.getDate()}
                      </span>
                    </div>

                    <div className="space-y-1.5">
                      {dayEvents.map((ev, index) => {
                        const meta = getMeta(ev.event_type);

                        return (
                          <div
                            key={`${ev.id}-${index}`}
                            title={`${ev.title}${ev.school_closed ? ' - School Closed' : ''}`}
                            className={`flex items-center gap-1 px-2 py-1.5 rounded-md text-[10px] font-bold truncate ${meta.calendar}`}
                          >
                            <span className="truncate flex-1">
                              {ev.title}
                            </span>

                            {Number(ev.school_closed) === 1 && (
                              <span className="shrink-0 px-1 rounded bg-white/80 text-[8px] text-rose-600">
                                CLOSED
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-slate-50/70 flex items-center justify-between gap-2">
          <span className="text-xs text-slate-500">
            {filteredEvents.length} events displayed
          </span>
          <span className="text-xs text-slate-400">
            Academic Calendar
          </span>
        </div>

      </div>
    </div>
  );
};

export default StudentCalendar;
