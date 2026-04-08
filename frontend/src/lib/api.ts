import axios from "axios";
import {API_BASE_URL, SUBSCRIBER_EMAIL_KEY} from "./constants";

const api = axios.create({
    baseURL: API_BASE_URL,
});

export const getSubscriberEmail = () => localStorage.getItem(SUBSCRIBER_EMAIL_KEY);

export const setSubscriberEmail = (email: string) => {
    localStorage.setItem(SUBSCRIBER_EMAIL_KEY, email.trim().toLowerCase());
    window.dispatchEvent(new Event("pulsejobmail:subscriber-changed"));
};

export const clearSubscriberEmail = () => {
    localStorage.removeItem(SUBSCRIBER_EMAIL_KEY);
    window.dispatchEvent(new Event("pulsejobmail:subscriber-changed"));
};

api.interceptors.request.use((config) => {
    const subscriberEmail = getSubscriberEmail();

    if (subscriberEmail) {
        config.headers["x-subscriber-email"] = subscriberEmail;
    }

    return config;
});

export const extractApiError = (error: unknown) => {
    if (axios.isAxiosError(error)) {
        return error.response?.data?.errorMsg || error.response?.data?.message || error.message;
    }

    if (error instanceof Error) {
        return error.message;
    }

    return "Something went wrong";
};

export default api;
