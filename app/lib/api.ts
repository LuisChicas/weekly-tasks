// API client — typed wrappers around fetch for auth and sync endpoints
import type { TaskPanelData } from '../components/TaskPanel/TaskPanel';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3009';

export type FeatureFlags = Record<string, string | boolean | number>;

// Full user state returned by sync and auth endpoints (includes evaluated flags)
interface SyncState {
  coins: number;
  activeLists: TaskPanelData[];
  completedLists: TaskPanelData[];
  flags: FeatureFlags;
}


interface AuthResponse extends SyncState {
  token: string;
}

interface ApiError {
  error: string;
}

// Union type for API responses — either success data or an error object
type Result<T> = T | ApiError;

// Type guard to check if an API result is an error
function isError<T>(result: Result<T>): result is ApiError {
  return 'error' in (result as ApiError);
}

// Base fetch wrapper — adds JSON headers, returns Result<T> for type-safe error handling
async function request<T>(path: string, options: RequestInit): Promise<Result<T>> {
  try {
    const res = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });
    const data = await res.json();
    if (!res.ok) {
      const msg = res.status >= 500
        ? 'Something went wrong. Please try again.'
        : (data.error || `Request failed (${res.status})`);
      return { error: msg };
    }
    return data as T;
  } catch {
    return { error: 'Network error. Is the API running?' };
  }
}

// Creates account and migrates current localStorage state to the server
export async function register(
  username: string,
  password: string,
  coins: number,
  activeLists: TaskPanelData[],
  completedLists: TaskPanelData[],
): Promise<Result<AuthResponse>> {
  return request<AuthResponse>('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ username, password, coins, activeLists, completedLists }),
  });
}

// Authenticates and returns JWT token + full user state
export async function login(
  username: string,
  password: string,
): Promise<Result<AuthResponse>> {
  return request<AuthResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
}

// Fetches latest user state from server (called on app load if logged in)
export async function fetchSync(token: string): Promise<Result<SyncState>> {
  return request<SyncState>('/sync', {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });
}

// Pushes local state to server (triggered manually via sync button)
export async function pushSync(
  token: string,
  coins: number,
  activeLists: TaskPanelData[],
  completedLists: TaskPanelData[],
): Promise<Result<{ success: true }>> {
  return request<{ success: true }>('/sync', {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ coins, activeLists, completedLists }),
  });
}


export { isError };
export type { AuthResponse, SyncState, ApiError, Result };