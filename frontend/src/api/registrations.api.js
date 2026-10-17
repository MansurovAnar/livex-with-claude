import apiClient from './apiClient';

export const listRegistrations = (examId) => apiClient.get(`/exams/${examId}/registrations`);
export const registerStudent = (examId, data) => apiClient.post(`/exams/${examId}/registrations`, data);
export const deregisterStudent = (registrationId) => apiClient.delete(`/registrations/${registrationId}`);
export const updatePayment = (registrationId, amount_paid, payment_method) => apiClient.patch(`/registrations/${registrationId}/payment`, { amount_paid, payment_method });
