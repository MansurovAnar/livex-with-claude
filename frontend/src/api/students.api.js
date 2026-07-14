import apiClient from './apiClient';

export const listStudents = (params) => apiClient.get('/students', { params });
export const getStudent = (id) => apiClient.get(`/students/${id}`);
export const createStudent = (data) => apiClient.post('/students', data);
export const updateStudent = (id, data) => apiClient.put(`/students/${id}`, data);
export const deleteStudent = (id) => apiClient.delete(`/students/${id}`);
