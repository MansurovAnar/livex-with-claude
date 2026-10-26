import apiClient from './apiClient';

// params: { search, page, limit } — limit must be one of PAGE_SIZES in students.api.js
export const listCourseStudents = (params) => apiClient.get('/course-students', { params });
export const createCourseStudent = (data) => apiClient.post('/course-students', data);
export const updateCourseStudent = (id, data) => apiClient.put(`/course-students/${id}`, data);
