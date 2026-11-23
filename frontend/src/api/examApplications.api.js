import apiClient from './apiClient';

// Applications sent from the landing page form (LV#81), for reception
export const listExamApplications = () => apiClient.get('/exam-applications');
export const markApplicationMoved = (id) => apiClient.patch(`/exam-applications/${id}/moved`);
