import React, { useState } from 'react';
import {
  GraduationCap,
  BookOpen,
  Calendar,
  Clock,
  Building2,
  Users,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const PortalClasses = () => {
  const { user } = useAuth();

  const classTeacherDetails = {
    class_name: 'Grade 10',
    section_name: 'Section A',
    room: 'Room 301 (Senior Secondary Block)',
    students_count: 36,
    co_teacher: 'Ananya Deshmukh (Physics)',
    class_rep: 'Aditya Krishnan',
  };

  const subjectAllocations = [
    { id: 1, class_name: 'Grade 10', section_name: 'Section A', subject: 'Mathematics (Advanced Calculus)', periods_per_week: 7, syllabus_progress: '72%' },
    { id: 2, class_name: 'Grade 10', section_name: 'Section B', subject: 'Mathematics (Core Algebra)', periods_per_week: 7, syllabus_progress: '68%' },
    { id: 3, class_name: 'Grade 9', section_name: 'Section A', subject: 'Mathematics (Geometry & Trig)', periods_per_week: 6, syllabus_progress: '75%' },
    { id: 4, class_name: 'Grade 11', section_name: 'Section Science', subject: 'Applied Mathematics (Elective)', periods_per_week: 5, syllabus_progress: '64%' },
  ];

  const timetable = [
    { period: 1, time: '08:30 - 09:15', mon: 'Grade 10-A (Math)', tue: 'Grade 10-B (Math)', wed: 'Grade 10-A (Math)', thu: 'Grade 9-A (Math)', fri: 'Grade 10-A (Math)' },
    { period: 2, time: '09:15 - 10:00', mon: 'Grade 10-B (Math)', tue: 'Grade 10-A (Math)', wed: 'Grade 9-A (Math)', thu: 'Grade 10-B (Math)', fri: 'Grade 10-B (Math)' },
    { period: 3, time: '10:15 - 11:00', mon: 'Free / Prep', tue: 'Grade 11-Sci (Math)', wed: 'Free / Prep', thu: 'Grade 11-Sci (Math)', fri: 'Grade 9-A (Math)' },
    { period: 4, time: '11:00 - 11:45', mon: 'Grade 9-A (Math)', tue: 'Free / Prep', wed: 'Grade 10-B (Math)', thu: 'Free / Prep', fri: 'Grade 11-Sci (Math)' },
    { period: 5, time: '12:45 - 01:30', mon: 'Grade 11-Sci (Math)', tue: 'Grade 9-A (Math)', wed: 'Grade 11-Sci (Math)', thu: 'Grade 10-A (Math)', fri: 'Free / Prep' },
    { period: 6, time: '01:30 - 02:15', mon: 'Math Tutorial (10-A)', tue: 'Free / Prep', wed: 'Math Lab (10-A)', thu: 'Math Lab (10-B)', fri: 'Remedial Math' },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="bg-white p-6 rounded-2xl border border-border shadow-xs">
        <h1 className="text-2xl font-bold text-heading">My Classes & Curricular Allocations</h1>
        <p className="text-xs text-muted">
          Class teacher leadership, subject teaching responsibilities, and weekly academic timetable
        </p>
      </div>

      {/* Class Teacher Leadership Card */}
      <div className="bg-gradient-to-r from-emerald-900 to-teal-950 p-6 rounded-2xl text-white shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold bg-emerald-800 text-emerald-200 px-2 py-0.5 rounded">
              PRIMARY CLASS IN-CHARGE
            </span>
            <span className="text-xs text-emerald-300">AY 2026-27</span>
          </div>
          <h2 className="text-2xl font-extrabold text-white">
            {classTeacherDetails.class_name} • {classTeacherDetails.section_name}
          </h2>
          <p className="text-xs text-slate-300">
            {classTeacherDetails.room} • {classTeacherDetails.students_count} Active Enrolled Students
          </p>
          <div className="flex flex-wrap items-center gap-4 text-xs text-emerald-200 pt-1">
            <span>Co-Teacher: <strong className="text-white">{classTeacherDetails.co_teacher}</strong></span>
            <span>•</span>
            <span>Class Representative: <strong className="text-white">{classTeacherDetails.class_rep}</strong></span>
          </div>
        </div>

        <div className="shrink-0 flex items-center gap-3">
          <div className="p-3 bg-emerald-800/60 rounded-xl border border-emerald-700/60 text-center">
            <span className="text-[10px] text-emerald-300 uppercase font-bold block">Class Size</span>
            <span className="text-xl font-black text-white">{classTeacherDetails.students_count}</span>
          </div>
        </div>
      </div>

      {/* Subject Teaching Assignments */}
      <div className="bg-white rounded-2xl border border-border shadow-xs p-6 space-y-4">
        <div>
          <h3 className="text-sm font-bold text-heading">Curricular Subject Allocations</h3>
          <p className="text-xs text-muted">Classes, weekly periods, and syllabus coverage tracking</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {subjectAllocations.map((sub) => (
            <div key={sub.id} className="p-4 rounded-xl border border-border bg-slate-50/50 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <span className="font-bold text-sm text-slate-900 block">{sub.class_name}</span>
                  <span className="text-xs text-emerald-700 font-semibold">{sub.section_name}</span>
                </div>
                <span className="font-mono text-xs font-bold bg-slate-200 text-slate-700 px-2 py-0.5 rounded">
                  {sub.periods_per_week} P/W
                </span>
              </div>

              <p className="text-xs font-semibold text-slate-700 line-clamp-1">{sub.subject}</p>

              <div className="space-y-1 pt-2 border-t border-border">
                <div className="flex justify-between text-[11px] text-muted">
                  <span>Syllabus Covered</span>
                  <span className="font-bold text-emerald-700">{sub.syllabus_progress}</span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                  <div className="bg-emerald-600 h-full rounded-full" style={{ width: sub.syllabus_progress }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Weekly Timetable Schedule */}
      <div className="bg-white rounded-2xl border border-border shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-border bg-slate-50/60 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-heading">Weekly Teaching Timetable</h3>
            <p className="text-xs text-muted">Weekly schedule matrix mapped to your faculty code</p>
          </div>
          <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
            25 Total Weekly Periods
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-bold uppercase border-b border-border">
              <tr>
                <th className="py-2.5 px-3">Period & Time</th>
                <th className="py-2.5 px-3">Monday</th>
                <th className="py-2.5 px-3">Tuesday</th>
                <th className="py-2.5 px-3">Wednesday</th>
                <th className="py-2.5 px-3">Thursday</th>
                <th className="py-2.5 px-3">Friday</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {timetable.map((t) => (
                <tr key={t.period} className="hover:bg-slate-50/70">
                  <td className="py-3 px-3 font-mono font-bold text-slate-800">
                    P{t.period} ({t.time})
                  </td>
                  <td className="py-3 px-3 font-semibold text-slate-800">{t.mon}</td>
                  <td className="py-3 px-3 font-semibold text-slate-800">{t.tue}</td>
                  <td className="py-3 px-3 font-semibold text-slate-800">{t.wed}</td>
                  <td className="py-3 px-3 font-semibold text-slate-800">{t.thu}</td>
                  <td className="py-3 px-3 font-semibold text-slate-800">{t.fri}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
