import apiClient from './apiClient';

// Landing page endpoints, no login needed (LV#81)
export const listPublicExams = () => apiClient.get('/public/exams');
export const submitExamApplication = (data) => apiClient.post('/public/applications', data);
