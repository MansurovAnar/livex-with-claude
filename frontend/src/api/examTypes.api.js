import apiClient from './apiClient';

export const listExamTypes = () => apiClient.get('/exam-types');
export const createExamType = (data) => apiClient.post('/exam-types', data);
export const updateExamType = (id, data) => apiClient.put(`/exam-types/${id}`, data);
export const deleteExamType = (id) => apiClient.delete(`/exam-types/${id}`);
