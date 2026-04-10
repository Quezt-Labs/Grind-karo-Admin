import axios from "axios";
import toast from "react-hot-toast";
import { useAuthStore } from "@/store/authStore";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:3000/api",
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 10000,
});

api.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().token;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (axios.isAxiosError(error)) {
      const message = error.response?.data?.message || error.message;

      if (error.response?.status === 401) {
        useAuthStore.getState().logout();
        window.location.href = "/login";
      } else {
        toast.error(message);
      }
    }
    return Promise.reject(error);
  },
);

export default api;
