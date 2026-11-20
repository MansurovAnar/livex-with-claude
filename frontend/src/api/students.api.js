import apiClient from './apiClient';

export const PAGE_SIZES = [10, 25, 50];

// params: { search, page, limit } — limit must be one of PAGE_SIZES (server falls back to 10)
export const listStudents = (params) => apiClient.get('/students', { params });
// { student_number, next_student_number } of the latest student added by reception (LV#10)
export const getLastReceptionNumber = () => apiClient.get('/students/last-reception-number');
export const getStudent = (id) => apiClient.get(`/students/${id}`);
export const getStudentExams = (id) => apiClient.get(`/students/${id}/exams`);
export const createStudent = (data) => apiClient.post('/students', data);
export const updateStudent = (id, data) => apiClient.put(`/students/${id}`, data);
export const deleteStudent = (id) => apiClient.delete(`/students/${id}`);
