import axios from "axios";

export const axiosInstance = axios.create({
    baseURL: import.meta.env.MODE==="development" ? import.meta.env.VITE_DEV_API_URL : import.meta.env.VITE_PROD_API_URL,
    withCredentials: true
});