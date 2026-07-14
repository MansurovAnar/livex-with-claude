import apiClient from './apiClient';

export const listExams = (params) => apiClient.get('/exams', { params });
export const getExam = (id) => apiClient.get(`/exams/${id}`);
export const createExam = (data) => apiClient.post('/exams', data);
export const updateExam = (id, data) => apiClient.put(`/exams/${id}`, data);
export const deleteExam = (id) => apiClient.delete(`/exams/${id}`);
export const updateExamStatus = (id, status) => apiClient.patch(`/exams/${id}/status`, { status });
