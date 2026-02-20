import axios from 'axios';

// Base URLs for different services (Docker internal ports exposed to localhost for now)
// In production, these should be behind an Nginx gateway
const URLs = {
    core: import.meta.env.VITE_API_Core_URL || 'http://localhost:8000',
    chat: import.meta.env.VITE_API_Chat_URL || 'http://localhost:8001',
    meetings: import.meta.env.VITE_API_Meetings_URL || 'http://localhost:8002',
    documents: import.meta.env.VITE_API_Documents_URL || 'http://localhost:8003',
    calendar: import.meta.env.VITE_API_Calendar_URL || 'http://localhost:8004',
    ai: import.meta.env.VITE_API_AI_URL || 'http://localhost:8005',
};

// Helper to create axios instance with auth interceptor
const createApi = (baseURL) => {
    const instance = axios.create({
        baseURL,
        headers: { 'Content-Type': 'application/json' },
    });

    // Request Interceptor (Attach Token)
    instance.interceptors.request.use(
        (config) => {
            const token = localStorage.getItem('token');
            if (token) {
                config.headers.Authorization = `Bearer ${token}`;
            }
            return config;
        },
        (error) => Promise.reject(error)
    );

    // Response Interceptor (Handle 401)
    instance.interceptors.response.use(
        (response) => response,
        (error) => {
            if (error.response?.status === 401) {
                // Only redirect to login if not already there, to avoid loops
                if (window.location.pathname !== '/login' && window.location.pathname !== '/setup') {
                    localStorage.removeItem('token');
                    window.location.href = '/login';
                }
            }
            return Promise.reject(error);
        }
    );

    return instance;
};

// Export instances
export const apiCore = createApi(URLs.core);
export const apiChat = createApi(URLs.chat);
export const apiMeetings = createApi(URLs.meetings);
export const apiDocuments = createApi(URLs.documents);
export const apiCalendar = createApi(URLs.calendar);
export const apiAI = createApi(URLs.ai);

// Default export for backward compatibility (Core service)
export default apiCore;
