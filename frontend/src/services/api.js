import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:3333",
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use((config) => {
  try {
    const storedAuth = JSON.parse(
      localStorage.getItem("iserv.auth") || "null",
    );

    if (storedAuth?.token) {
      config.headers.Authorization = `Bearer ${storedAuth.token}`;
    }
  } catch {
    localStorage.removeItem("iserv.auth");
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("iserv.auth");

      if (window.location.pathname !== "/login") {
        window.location.assign("/login");
      }
    }

    return Promise.reject(error);
  },
);

export { api };
