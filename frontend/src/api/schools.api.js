import apiClient from './apiClient';

// Active schools as { id, name } — readable by admin and telesales
export const listSchoolOptions = () => apiClient.get('/schools/options');
