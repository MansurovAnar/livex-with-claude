import apiClient from './apiClient';

export const verifyAndLog = (data) => apiClient.post('/entry/verify-and-log', data);
