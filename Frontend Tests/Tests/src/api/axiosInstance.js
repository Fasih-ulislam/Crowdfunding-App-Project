import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:80/api",
  withCredentials: true, // REQUIRED: sends HttpOnly cookie with every request
  headers: {
    "Content-Type": "application/json",
  },
});

// Global response interceptor — converts backend errors into thrown strings
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message =
      error.response?.data?.error ||
      error.response?.data?.message ||
      "Something went wrong. Please try again.";
    return Promise.reject(new Error(message));
  },
);

export default api;
