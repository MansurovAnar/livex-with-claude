import apiClient from './apiClient';

export const listVillages = (params) => apiClient.get('/villages', { params });
export const createVillage = (data) => apiClient.post('/villages', data);
export const updateVillage = (id, data) => apiClient.put(`/villages/${id}`, data);
export const setVillageActive = (id, is_active) => apiClient.patch(`/villages/${id}/status`, { is_active });
