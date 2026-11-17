import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Plus,
  Edit2,
  Trash2,
  BookOpen,
  Search,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import { api } from '../../api/client';
import { Badge } from '../../components/common/Badge';

export const SubjectList = () => {
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);

  // Lookups for filters
  const [boards, setBoards] = useState([]);
  const [classes, setClasses] = useState([]);
  const [streams, setStreams] = useState([]);

  // Filter state
  const [selectedBoardId, setSelectedBoardId] = useState('');
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedStreamId, setSelectedStreamId] = useState('');
  const [search, setSearch] = useState('');
  const [message, setMessage] = useState(null);

  // Load lookup metadata
  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        const [boardsRes, classesRes, streamsRes] = await Promise.all([
          api.get('/settings/boards').catch(() => ({ boards: [] })),
          api.get('/academics/classes').catch(() => ({ classes: [] })),
          api.get('/academics/streams').catch(() => ({ streams: [] })),
        ]);
        setBoards(boardsRes.boards || boardsRes.data || []);
        setClasses(classesRes.classes || classesRes.data || []);
        setStreams(streamsRes.streams || streamsRes.data || []);
      } catch (err) {
        console.error('Failed to load filter lookups:', err);
      }
    };
    fetchMetadata();
  }, []);

  // Fetch subjects filtered by dropdown filters
  const fetchSubjects = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedBoardId) params.append('board_id', selectedBoardId);
      if (selectedClassId) params.append('class_id', selectedClassId);
      if (selectedStreamId) params.append('stream_id', selectedStreamId);

      const data = await api.get(`/academics/subjects?${params.toString()}`);
      setSubjects(data.subjects || data.data || []);
    } catch (err) {
      console.error('Failed to fetch subjects:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedBoardId, selectedClassId, selectedStreamId]);

  useEffect(() => {
    fetchSubjects();
  }, [fetchSubjects]);

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete subject "${name}"?`)) return;
    try {
      await api.delete(`/academics/subjects/${id}`);
      setMessage({ type: 'success', text: `Subject "${name}" deleted successfully` });
      fetchSubjects();
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to delete subject' });
    }
  };

  const filteredSubjects = subjects.filter((s) => {
    const matchesSearch =
      (s.name || '').toLowerCase().includes(search.toLowerCase()) ||
      (s.code || '').toLowerCase().includes(search.toLowerCase()) ||
      (s.category || '').toLowerCase().includes(search.toLowerCase());
    return matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-heading">Subjects Catalog</h1>
          </div>
          <p className="text-sm text-muted mt-1">
            Curriculum subjects, grading criteria, and school module participation settings.
          </p>
        </div>

        <Link
          to="/academics/subjects/create"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-sm font-semibold shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-brand-500/20"
        >
          <Plus className="w-4 h-4" />
          Add New Subject
        </Link>
      </div>

      {/* Feedback Message */}
      {message && (
        <div
          className={`p-4 rounded-xl flex items-center gap-3 text-sm animate-fade-in ${
            message.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {/* Filter Toolbar */}
      <div className="bg-surface p-4 rounded-2xl border border-border shadow-sm space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Board Filter */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Education Board
            </label>
            <select
              value={selectedBoardId}
              onChange={(e) => setSelectedBoardId(e.target.value)}
              className="w-full px-3 py-1.5 text-xs rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-brand-500/20 bg-white"
            >
              <option value="">All Boards</option>
              {boards.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.code})
                </option>
              ))}
            </select>
          </div>

          {/* Class Filter */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Class / Grade
            </label>
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="w-full px-3 py-1.5 text-xs rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-brand-500/20 bg-white"
            >
              <option value="">All Classes</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Stream Filter */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Stream / Group
            </label>
            <select
              value={selectedStreamId}
              onChange={(e) => setSelectedStreamId(e.target.value)}
              className="w-full px-3 py-1.5 text-xs rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-brand-500/20 bg-white"
            >
              <option value="">All Streams</option>
              {streams.map((st) => (
                <option key={st.id} value={st.id}>
                  {st.name} ({st.code})
                </option>
              ))}
            </select>
          </div>

          {/* Search Input */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Search Subjects
            </label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Name, code, or category..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main Table / Content */}
      {loading ? (
        <div className="p-12 text-center text-muted">
          <div className="animate-spin w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full mx-auto mb-3" />
          Loading subjects...
        </div>
      ) : filteredSubjects.length === 0 ? (
        <div className="p-12 text-center bg-surface rounded-2xl border border-border">
          <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-base font-semibold text-heading">No Subjects Found</p>
          <p className="text-xs text-muted mt-1 max-w-sm mx-auto">
            No subjects match the selected filters. Create a subject using the button above.
          </p>
          <Link
            to="/academics/subjects/create"
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Subject Now
          </Link>
        </div>
      ) : (
        <div className="bg-surface rounded-2xl border border-border shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-border bg-slate-50/70 font-semibold text-slate-600">
                  <th className="py-3.5 px-4">Subject</th>
                  <th className="py-3.5 px-4">Hierarchy</th>
                  <th className="py-3.5 px-4">Category</th>
                  <th className="py-3.5 px-4">Type & Language</th>
                  <th className="py-3.5 px-4">Marks & Credits</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredSubjects.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/70 transition-colors">
                    {/* Subject info */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-brand-50 text-brand-700 border border-brand-200 flex items-center justify-center font-mono font-bold text-xs shrink-0">
                          {s.code}
                        </div>
                        <div>
                          <p className="font-bold text-heading text-sm">{s.name}</p>
                          <span className="font-mono text-[10px] text-slate-400">
                            Code: {s.code}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Hierarchy (Board, Class, Stream) */}
                    <td className="py-3 px-4">
                      <div className="space-y-0.5">
                        <p className="font-semibold text-slate-800">
                          {s.class_name || `Class ID: ${s.class_id}`}
                        </p>
                        <p className="text-[11px] text-muted">
                          {s.board_code || s.board_name || 'Board'}
                          {s.stream_name ? ` • ${s.stream_name}` : ''}
                        </p>
                      </div>
                    </td>

                    {/* Category */}
                    <td className="py-3 px-4">
                      <span className="inline-block px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-medium text-[11px]">
                        {s.category || 'General'}
                      </span>
                    </td>

                    {/* Requirement & Language Badges */}
                    <td className="py-3 px-4">
                      <div className="flex flex-wrap gap-1.5 items-center">
                        <span
                          className={`px-2 py-0.5 rounded-full font-medium text-[10px] border ${
                            s.requirement === 'compulsory'
                              ? 'bg-blue-50 text-blue-700 border-blue-200'
                              : 'bg-amber-50 text-amber-700 border-amber-200'
                          }`}
                        >
                          {s.requirement === 'compulsory' ? 'Compulsory' : 'Elective'}
                        </span>

                        {Boolean(s.is_language) && (
                          <span className="px-2 py-0.5 rounded-full font-medium text-[10px] bg-purple-50 text-purple-700 border border-purple-200">
                            Lang: {s.language_name || 'Language'}
                            {s.language_level ? ` (${s.language_level.replace('_', ' ')})` : ''}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Marks & Credits */}
                    <td className="py-3 px-4">
                      <div className="text-[11px] text-slate-700 space-y-0.5">
                        <p>
                          Max: <strong className="text-heading">{s.max_marks ?? 100}</strong> (Pass:{' '}
                          {s.pass_marks ?? 35})
                        </p>
                        <p className="text-muted text-[10px]">Credits: {s.credits ?? 4}</p>
                      </div>
                    </td>

                    {/* Status */}
                    <td className="py-3 px-4">
                      <Badge variant={s.status === 'active' ? 'active' : 'inactive'}>
                        {s.status}
                      </Badge>
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Link
                          to={`/academics/subjects/${s.id}/edit`}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-brand-600 hover:bg-brand-50 transition-colors"
                          title="Edit Subject"
                        >
                          <Edit2 className="w-4 h-4" />
                        </Link>
                        <button
                          onClick={() => handleDelete(s.id, s.name)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                          title="Delete Subject"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
