import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../api/client';
import { useAuth } from './AuthContext';

const StudentContext = createContext(null);

export const StudentProvider = ({ children }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState({
    student: null,
    assigned_subjects: [],
    attendance_summary: {
      percentage: 100,
      total_records: 0,
      present_days: 0,
      absent_days: 0,
      standing: 'Good Standing',
      morning_session: 'Not Marked',
      afternoon_session: 'Not Marked',
    },
    attendance_logs: [],
    homework: [],
    assignments: [],
    announcements: [],
    events: [],
    albums: [],
  });

  const fetchFeed = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
      setError(null);
      const queryParam = user.student_id ? `?student_id=${user.student_id}` : '';
      const res = await api.get(`/communication/portal/student-feed${queryParam}`);
      if (res && res.success) {
        setData({
          student: res.student || null,
          assigned_subjects: res.assigned_subjects || [],
          attendance_summary: res.attendance_summary || {
            percentage: 100,
            total_records: 0,
            present_days: 0,
            absent_days: 0,
            standing: 'Good Standing',
            morning_session: 'Not Marked',
            afternoon_session: 'Not Marked',
          },
          attendance_logs: res.attendance_logs || [],
          homework: res.homework || [],
          assignments: res.assignments || [],
          announcements: res.announcements || [],
          events: res.events || [],
          albums: res.albums || [],
        });
      }
    } catch (err) {
      console.error('Failed to load student portal feed:', err);
      setError(err.message || 'Failed to fetch student data');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchFeed();
  }, [fetchFeed]);

  const submitAssignment = async (assignmentId, payload) => {
    const studentId = data.student?.id || user?.student_id;
    if (!studentId) throw new Error('Student ID is missing');
    const res = await api.post(`/communication/assignments/${assignmentId}/submit`, {
      ...payload,
      student_id: studentId,
    });
    await fetchFeed();
    return res;
  };

  return (
    <StudentContext.Provider
      value={{
        loading,
        error,
        student: data.student,
        assignedSubjects: data.assigned_subjects,
        attendanceSummary: data.attendance_summary,
        attendanceLogs: data.attendance_logs,
        homework: data.homework,
        assignments: data.assignments,
        announcements: data.announcements,
        events: data.events,
        albums: data.albums,
        refreshFeed: fetchFeed,
        submitAssignment,
      }}
    >
      {children}
    </StudentContext.Provider>
  );
};

export const useStudent = () => {
  const context = useContext(StudentContext);
  if (!context) {
    throw new Error('useStudent must be used within a StudentProvider');
  }
  return context;
};
