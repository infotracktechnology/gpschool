import { api } from '../api/client';

export const calendarService = {
  // Get all events with optional filters (month, year, event_type, class_id, section_id)
  async getEvents({ branch_id = 1, academic_year_id = 1, event_type, month, year, class_id, section_id } = {}) {
    const params = new URLSearchParams({
      branch_id,
      academic_year_id
    });
    if (event_type && event_type !== 'all') params.append('event_type', event_type);
    if (month) params.append('month', month);
    if (year) params.append('year', year);
    if (class_id && class_id !== 'all') params.append('class_id', class_id);
    if (section_id && section_id !== 'all') params.append('section_id', section_id);

    return api.get(`/calendar/events?${params.toString()}`);
  },

  // Create event
  async createEvent(payload) {
    return api.post('/calendar/events', payload);
  },

  // Update event
  async updateEvent(id, payload) {
    return api.put(`/calendar/events/${id}`, payload);
  },

  // Delete event
  async deleteEvent(id) {
    return api.delete(`/calendar/events/${id}`);
  },

  // Get upcoming agenda events
  async getUpcoming({ branch_id = 1, academic_year_id = 1, class_id, section_id } = {}) {
    const params = new URLSearchParams({ branch_id, academic_year_id });
    if (class_id && class_id !== 'all') params.append('class_id', class_id);
    if (section_id && section_id !== 'all') params.append('section_id', section_id);

    return api.get(`/calendar/upcoming?${params.toString()}`);
  }
};
