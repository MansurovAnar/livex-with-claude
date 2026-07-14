import apiClient from './apiClient';

export const listBuildings = () => apiClient.get('/buildings');
export const listRooms = (buildingId) => apiClient.get(`/buildings/${buildingId}/rooms`);
