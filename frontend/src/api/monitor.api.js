import apiClient from './apiClient';

export const getExamMonitor = (examId) => apiClient.get(`/monitor/exams/${examId}`);
export const addExamExpense = (examId, data) => apiClient.post(`/monitor/exams/${examId}/expenses`, data);
export const getTodayDashboard = () => apiClient.get('/monitor/today');
