/**
 * Minimal HTTP client for the BeBe backend (AdonisJS, see backend/start/routes.ts).
 * Built on the browser Fetch API, so no extra library is needed.
 *
 * Successful responses are returned as-is; most endpoints wrap their payload
 * in { data: ... }. Failed responses throw an ApiError.
 */
export const API_URL = "http://localhost:3333/api/v1";

const TOKEN_KEY = "bebe.token";

/** One error as returned by AdonisJS / VineJS validation. */
export interface FieldError {
  message: string;
  field?: string;
  rule?: string;
}

export class ApiError extends Error {
  /** HTTP status code, or 0 when the server could not be reached. */
  readonly status: number;
  readonly errors: FieldError[];

  constructor(status: number, errors: FieldError[]) {
    super(errors[0]?.message ?? `Request failed with status ${status}`);
    this.name = "ApiError";
    this.status = status;
    this.errors = errors;
  }

  /** The validation error for one form field, if any. */
  forField(field: string) {
    return this.errors.find(error => error.field === field);
  }
}

// Storage can be unavailable (private mode, blocked site data), so every access is guarded.
function readStoredToken() {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

let token: string | null = readStoredToken();
let unauthorizedHandler: (() => void) | null = null;

export function getToken() {
  return token;
}

export function setToken(value: string | null) {
  token = value;
  try {
    if (value) localStorage.setItem(TOKEN_KEY, value);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    // The token still works for this page load; it just won't survive a reload.
  }
}

/** Called when the server rejects the stored token (expired or logged out elsewhere). */
export function setUnauthorizedHandler(handler: () => void) {
  unauthorizedHandler = handler;
}

export async function api<T>(
  path: string,
  options: {
    method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
    body?: unknown;
  } = {}
): Promise<T> {
  const headers: Record<string, string> = { Accept: "application/json" };
  if (options.body !== undefined) headers["Content-Type"] = "application/json";
  if (token) headers.Authorization = `Bearer ${token}`;

  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      method: options.method ?? "GET",
      headers,
      body: options.body === undefined ? null : JSON.stringify(options.body)
    });
  } catch {
    throw new ApiError(0, [
      { message: "Cannot reach the server. Is the backend running?" }
    ]);
  }

  const payload: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    if (response.status === 401 && token) {
      setToken(null);
      unauthorizedHandler?.();
    }
    const errors = (payload as { errors?: FieldError[] } | null)?.errors;
    throw new ApiError(response.status, errors ?? []);
  }

  return payload as T;
}
