/* 
  Purpose: Define shared HTTP API client for backend communications.
  Responsibility: Make requests to the backend API, handle authorization headers, and map errors.

  DB Resilience: Requests that fail with 503 (Neon cold-start/DB timeout) are
  automatically retried up to 2 times with exponential backoff (1.5s → 3s).
*/

import { Platform } from 'react-native';
import { useAuthStore } from '../../features/auth/store';

import { useLoadingStore } from './loadingStore';

const getBaseUrl = () => {
  // Production: use environment variable set in Netlify / Render
  if (process.env.EXPO_PUBLIC_API_URL) {
    const url = process.env.EXPO_PUBLIC_API_URL;
    if (url.endsWith('/api/v1')) {
      return url;
    }
    return `${url}/api/v1`;
  }
  // Local development: auto-detect hostname so it works on any machine
  if (Platform.OS === 'web') {
    return 'http://localhost:3000/api/v1';
  }
  // Native mobile (Expo Go on phone, same WiFi)
  return 'http://192.168.0.124:3000/api/v1';
};

export const BASE_URL = getBaseUrl();

// ── DB Resilience helpers ─────────────────────────────────────────────────────
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Returns true if the status/code indicates a transient DB unavailability
function isTransient503(status, code) {
  return status === 503 || code === 'ERR_DB_UNAVAILABLE';
}

// ── Core request ──────────────────────────────────────────────────────────────
async function request(endpoint, options = {}, isRetry = false, dbRetryCount = 0) {
  useLoadingStore.getState().startFetch();
  try {
    const token = useAuthStore.getState().token;
    const hospitalId = useAuthStore.getState().hospitalId;

    const headers = {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...(hospitalId && { 'x-hospital-id': hospitalId }),
      ...options.headers
    };

    let response;
    try {
      response = await fetch(`${BASE_URL}${endpoint}`, {
        ...options,
        headers
      });
    } catch (fetchErr) {
      // ── Auto-retry on network-level fetch failures (ECONNREFUSED, etc.) ───
      if (dbRetryCount < 2) {
        const delayMs = 1500 * (dbRetryCount + 1);
        console.warn(`[API] Network error: ${fetchErr.message}. Retrying in ${delayMs}ms... (attempt ${dbRetryCount + 1}/2)`);
        await sleep(delayMs);
        return await request(endpoint, options, isRetry, dbRetryCount + 1);
      }
      throw fetchErr;
    }

    // Automatically refresh access token on 401 Unauthorized
    if (response.status === 401 && !isRetry) {
      const refreshToken = useAuthStore.getState().refreshToken;
      if (refreshToken) {
        try {
          console.log('Access token expired. Retrying request with refreshed token...');
          const newAccessToken = await useAuthStore.getState().refreshAccessToken();
          if (newAccessToken) {
            return await request(endpoint, options, true, dbRetryCount);
          }
        } catch (refreshErr) {
          console.log('Automatic token refresh failed:', refreshErr.message);
          useAuthStore.getState().logout();
        }
      } else {
        useAuthStore.getState().logout();
      }
    }

    const json = await response.json();

    // ── Auto-retry on DB unavailability (503) ────────────────────────────────
    // Neon serverless DB can have cold-start delays. Retry silently up to 2x.
    if (isTransient503(response.status, json.error?.code) && dbRetryCount < 2) {
      const delayMs = 1500 * (dbRetryCount + 1); // 1.5s, then 3s
      console.warn(`[API] DB temporarily unavailable (503). Retrying in ${delayMs}ms... (attempt ${dbRetryCount + 1}/2)`);
      await sleep(delayMs);
      return await request(endpoint, options, isRetry, dbRetryCount + 1);
    }

    if (!response.ok) {
      let message = json.error?.message || 'Something went wrong';
      if (json.error?.code === 'ERR_VALIDATION_FAILED' && Array.isArray(json.error?.details)) {
        const fieldErrors = json.error.details.map((d) => `• ${d.field}: ${d.issue}`).join('\n');
        message = `Validation Failed:\n${fieldErrors}`;
      }
      const error = new Error(message);
      error.status = response.status;
      error.code = json.error?.code;
      throw error;
    }

    return json.data;
  } finally {
    useLoadingStore.getState().endFetch();
  }
}

export const api = {
  get: (endpoint, options) => request(endpoint, { method: 'GET', ...options }),
  post: (endpoint, body, options) => request(endpoint, { method: 'POST', body: JSON.stringify(body), ...options }),
  put: (endpoint, body, options) => request(endpoint, { method: 'PUT', body: JSON.stringify(body), ...options }),
  patch: (endpoint, body, options) => request(endpoint, { method: 'PATCH', body: JSON.stringify(body), ...options }),
  delete: (endpoint, options) => request(endpoint, { method: 'DELETE', ...options })
};
