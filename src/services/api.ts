import axios, { type AxiosError, type InternalAxiosRequestConfig } from "axios";
import toast from "react-hot-toast";
import { useAuthStore } from "@/store/authStore";
import {
  formatApiErrorMessage,
  reportClientError,
  shouldReportApiError,
  shouldToastApiError,
} from "@/lib/clientErrorReporting";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 15000,
});

/** Deep program tree copies can take longer than the default axios timeout. */
export const CLONE_STRUCTURE_TIMEOUT_MS = 120_000;

api.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().token;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    // Let the browser set multipart/form-data with boundary for file uploads.
    if (config.data instanceof FormData) {
      delete config.headers["Content-Type"];
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// Token refresh logic
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (error: unknown) => void;
}> = [];

function processQueue(error: unknown, token: string | null) {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token!);
    }
  });
  failedQueue = [];
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    // If 401 and not already retrying, attempt token refresh
    if (error.response?.status === 401 && !originalRequest._retry) {
      const refreshToken = useAuthStore.getState().refreshToken;

      // No refresh token or this is already the refresh call — logout
      if (
        !refreshToken ||
        originalRequest.url?.includes("/auth/token/refresh")
      ) {
        useAuthStore.getState().logout();
        window.location.href = "/login";
        return Promise.reject(error);
      }

      if (isRefreshing) {
        // Queue this request until refresh completes
        return new Promise((resolve, reject) => {
          failedQueue.push({
            resolve: (token: string) => {
              originalRequest.headers.Authorization = `Bearer ${token}`;
              resolve(api(originalRequest));
            },
            reject,
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const { data } = await axios.post(
          `${api.defaults.baseURL}/auth/token/refresh`,
          { refreshToken },
        );
        const newToken = data.accessToken;
        useAuthStore.getState().setToken(newToken);
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        processQueue(null, newToken);
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        useAuthStore.getState().logout();
        window.location.href = "/login";
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    if (shouldToastApiError(error)) {
      const data = axios.isAxiosError(error)
        ? (error.response?.data as Record<string, unknown> | undefined)
        : undefined;
      const message =
        (typeof data?.message === "string" && data.message) ||
        (error instanceof Error ? error.message : "Something went wrong");
      toast.error(message);
    }

    if (shouldReportApiError(error, originalRequest.url)) {
      reportClientError({
        category: "API",
        message: formatApiErrorMessage(error),
        stack: error instanceof Error ? error.stack : undefined,
        metadata: {
          method: originalRequest.method,
          url: originalRequest.url,
          status: error.response?.status,
        },
      });
    }

    return Promise.reject(error);
  },
);

export default api;
