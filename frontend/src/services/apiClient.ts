import { createApi } from './api';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

export const api = createApi(BACKEND_URL);
