import apiClient from './apiClient';

export const listLeads = (params) => apiClient.get('/telesales/leads', { params });
export const getLead = (id) => apiClient.get(`/telesales/leads/${id}`);
export const createLead = (data) => apiClient.post('/telesales/leads', data);
export const updateLead = (id, data) => apiClient.put(`/telesales/leads/${id}`, data);
export const setLeadPhoneInvalid = (id, isInvalid) => apiClient.patch(`/telesales/leads/${id}/phone-invalid`, { is_phone_invalid: isInvalid });
export const listLeadCalls = (id) => apiClient.get(`/telesales/leads/${id}/calls`);
export const createLeadCall = (id, data) => apiClient.post(`/telesales/leads/${id}/calls`, data);
export const listAnswerOptions = () => apiClient.get('/telesales/answer-options');
