import apiClient from './apiClient';

export const listLeads = (params) => apiClient.get('/telesales/leads', { params });
export const getLeadFilterOptions = () => apiClient.get('/telesales/leads/filter-options');
export const getLead = (id) => apiClient.get(`/telesales/leads/${id}`);
export const createLead = (data) => apiClient.post('/telesales/leads', data);
export const updateLead = (id, data) => apiClient.put(`/telesales/leads/${id}`, data);
export const setLeadPhoneInvalid = (id, isInvalid) => apiClient.patch(`/telesales/leads/${id}/phone-invalid`, { is_phone_invalid: isInvalid });
export const listLeadCalls = (id) => apiClient.get(`/telesales/leads/${id}/calls`);
export const createLeadCall = (id, data) => apiClient.post(`/telesales/leads/${id}/calls`, data);
export const listAnswerOptions = () => apiClient.get('/telesales/answer-options');
export const listCallbacks = (params) => apiClient.get('/telesales/callbacks', { params });
export const countDueCallbacks = (until) => apiClient.get('/telesales/callbacks/count', { params: { until } });
export const getTelesalesReport = (params) => apiClient.get('/telesales/reports', { params });
// Extra-info checkbox options (LV#72): list for everyone, the rest admin-only
export const listExtraInfoOptions = () => apiClient.get('/telesales/extra-info-options');
export const createExtraInfoOption = (data) => apiClient.post('/telesales/extra-info-options', data);
export const updateExtraInfoOption = (id, data) => apiClient.put(`/telesales/extra-info-options/${id}`, data);
export const setExtraInfoOptionActive = (id, is_active) => apiClient.patch(`/telesales/extra-info-options/${id}/status`, { is_active });
export const moveExtraInfoOption = (id, direction) => apiClient.patch(`/telesales/extra-info-options/${id}/move`, { direction });
