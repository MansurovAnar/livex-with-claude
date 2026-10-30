import apiClient from './apiClient';

export const listLeads = (params) => apiClient.get('/telesales/leads', { params });
export const getLead = (id) => apiClient.get(`/telesales/leads/${id}`);
export const createLead = (data) => apiClient.post('/telesales/leads', data);
export const updateLead = (id, data) => apiClient.put(`/telesales/leads/${id}`, data);
