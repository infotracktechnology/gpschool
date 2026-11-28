import { api } from '../api/client';

const COMM_BASE = '/communication';

const buildScopedQuery = (params = {}) => {
  const q = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '' && v !== 'all') {
      q.set(k, String(v));
    }
  });
  const s = q.toString();
  return s ? `?${s}` : '';
};

export const communicationService = {
  // --- Homework ---
  async getHomework(params = {}) {
    const res = await api.get(`${COMM_BASE}/homework${buildScopedQuery(params)}`);
    return res.data || [];
  },
  async createHomework(payload) {
    const res = await api.post(`${COMM_BASE}/homework`, payload);
    return res.data;
  },
  async updateHomework(id, payload) {
    const res = await api.put(`${COMM_BASE}/homework/${id}`, payload);
    return res.data;
  },
  async deleteHomework(id) {
    await api.delete(`${COMM_BASE}/homework/${id}`);
  },
  async uploadAttachment(filename, base64Data) {
    return api.post(`${COMM_BASE}/upload-attachment`, { filename, base64Data });
  },

  // --- Assignments ---
  async getAssignments(params = {}) {
    const res = await api.get(`${COMM_BASE}/assignments${buildScopedQuery(params)}`);
    return res.data || [];
  },
  async getAssignmentDetails(id) {
    return api.get(`${COMM_BASE}/assignments/${id}`);
  },
  async createAssignment(payload) {
    const res = await api.post(`${COMM_BASE}/assignments`, payload);
    return res.data;
  },
  async updateAssignment(id, payload) {
    const res = await api.put(`${COMM_BASE}/assignments/${id}`, payload);
    return res.data;
  },
  async deleteAssignment(id) {
    await api.delete(`${COMM_BASE}/assignments/${id}`);
  },
  async submitAssignmentWork(assignmentId, payload) {
    await api.post(`${COMM_BASE}/assignments/${assignmentId}/submit`, payload);
  },
  async reviewAssignment(assignmentId, studentId, payload) {
    await api.put(`${COMM_BASE}/assignments/${assignmentId}/review/${studentId}`, payload);
  },
  async markOfflineCompletion(assignmentId, studentId, payload) {
    await api.put(`${COMM_BASE}/assignments/${assignmentId}/offline-verify/${studentId}`, payload);
  },

  // --- Announcements ---
  async getAnnouncements(params = {}) {
    const res = await api.get(`${COMM_BASE}/announcements${buildScopedQuery(params)}`);
    return res.data || [];
  },
  async createAnnouncement(payload) {
    const res = await api.post(`${COMM_BASE}/announcements`, payload);
    return res.data;
  },
  async updateAnnouncement(id, payload) {
    const res = await api.put(`${COMM_BASE}/announcements/${id}`, payload);
    return res.data;
  },
  async deleteAnnouncement(id) {
    await api.delete(`${COMM_BASE}/announcements/${id}`);
  },

  // --- Gallery ---
  async getAlbums(params = {}) {
    const res = await api.get(`${COMM_BASE}/gallery${buildScopedQuery(params)}`);
    return res.data || [];
  },
  async getAlbumDetails(id) {
    return api.get(`${COMM_BASE}/gallery/${id}`);
  },
  async createAlbum(payload) {
    const res = await api.post(`${COMM_BASE}/gallery`, payload);
    return res.data;
  },
  async updateAlbum(id, payload) {
    const res = await api.put(`${COMM_BASE}/gallery/${id}`, payload);
    return res.data;
  },
  async deleteAlbum(id) {
    await api.delete(`${COMM_BASE}/gallery/${id}`);
  },
  async addMediaToAlbum(albumId, media) {
    const res = await api.post(`${COMM_BASE}/gallery/${albumId}/media`, { media });
    return res.data;
  },
  async updateMediaItem(mediaId, payload) {
    return api.put(`${COMM_BASE}/gallery/media/${mediaId}`, payload);
  },
  async deleteMediaItem(mediaId) {
    await api.delete(`${COMM_BASE}/gallery/media/${mediaId}`);
  },

  // --- Dashboard & Monitoring ---
  async getDashboardSummary(branch_id, academic_year_id) {
    return api.get(`${COMM_BASE}/dashboard/summary${buildScopedQuery({ branch_id, academic_year_id })}`);
  },
  async getHomeworkMonitoring(branch_id, academic_year_id, date) {
    return api.get(`${COMM_BASE}/dashboard/homework-monitoring${buildScopedQuery({ branch_id, academic_year_id, date })}`);
  },
  async getAssignmentMonitoring(branch_id, academic_year_id) {
    return api.get(`${COMM_BASE}/dashboard/assignment-monitoring${buildScopedQuery({ branch_id, academic_year_id })}`);
  },

  // --- History & Audit ---
  async getAuditHistory(params = {}) {
    const res = await api.get(
      `${COMM_BASE}/history${buildScopedQuery({
        branch_id: params.branch_id,
        academic_year_id: params.academic_year_id,
        limit: params.limit || 100,
        module: params.module,
      })}`
    );
    return res.data || [];
  },
  async getAuditLogs(params = {}) {
    const res = await api.get(
      `${COMM_BASE}/history${buildScopedQuery({
        branch_id: params.branch_id,
        academic_year_id: params.academic_year_id,
        limit: params.limit || 100,
        activity_type: params.module_name,
      })}`
    );
    return { logs: res.data || [] };
  },

  // --- Student / Parent Portal Feed ---
  async getStudentPortalFeed(student_id, academic_year_id) {
    return api.get(`${COMM_BASE}/portal/student-feed${buildScopedQuery({ student_id, academic_year_id })}`);
  },

  // --- Multi-Module Feeds for All Classes ---
  async getClassModuleFeeds(params = {}) {
    const res = await api.get(`${COMM_BASE}/feeds${buildScopedQuery(params)}`);
    return res.data || [];
  },
};
