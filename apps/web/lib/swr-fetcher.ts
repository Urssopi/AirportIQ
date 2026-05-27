import { apiFetch } from "./api";

export const swrFetcher = <T,>(path: string) => apiFetch<T>(path);
