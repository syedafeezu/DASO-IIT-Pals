import axios from 'axios';

const API_URL = 'http://localhost:8000';

export const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

export const predictTime = async (data) => {
    const response = await api.post('/predict-time', data);
    return response.data;
};

export const bookSlot = async (data) => {
    const response = await api.post('/book-slot', data);
    return response.data;
};

export const getQueueStatus = async (status = null) => {
    const url = status ? `/queue-status?status=${status}` : '/queue-status';
    const response = await api.get(url);
    return response.data;
};

export const updateStaffAction = async (data) => {
    const response = await api.post('/staff-update', data);
    return response.data;
};

export const simulateProximity = async (mobile) => {
    const response = await api.post('/sim-proximity', { mobile });
    return response.data;
};

export const getAnalytics = async () => {
    const response = await api.get('/analytics');
    return response.data;
};

export const getServiceTypes = async () => {
    const response = await api.get('/service-types');
    return response.data;
};
