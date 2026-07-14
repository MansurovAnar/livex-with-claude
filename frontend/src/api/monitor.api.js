import apiClient from './apiClient';

export const getExamMonitor = (examId) => apiClient.get(`/monitor/exams/${examId}`);
export const getTodayDashboard = () => apiClient.get('/monitor/today');
