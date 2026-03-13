// ─── API Client ───────────────────────────────────────────────────────
// Thin fetch wrapper with cookie auth, CSRF, and snake↔camelCase conversion.

// ─── Case Conversion ─────────────────────────────────────────────────

function snakeToCamel(str: string): string {
  return str.replace(/_([a-z0-9])/g, (_, c: string) => c.toUpperCase());
}

function camelToSnake(str: string): string {
  return str.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
}

/**
 * Recursively transforms object keys using the provided function.
 * Arrays are traversed, primitives pass through unchanged.
 */
function transformKeys<T>(obj: unknown, fn: (key: string) => string): T {
  if (Array.isArray(obj)) {
    return obj.map((item) => transformKeys(item, fn)) as T;
  }
  if (obj !== null && typeof obj === 'object' && !(obj instanceof Date) && !(obj instanceof File)) {
    return Object.fromEntries(
      Object.entries(obj as Record<string, unknown>).map(([key, value]) => [
        fn(key),
        transformKeys(value, fn),
      ]),
    ) as T;
  }
  return obj as T;
}

// ─── Utilities ───────────────────────────────────────────────────────

/** Parse a Pydantic Decimal string (e.g. "123.45") to a JS number. */
export function toNumber(value: string | number | null | undefined): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'number') return value;
  const parsed = parseFloat(value);
  return isNaN(parsed) ? 0 : parsed;
}

/** Read the CSRF token from the csrf_token cookie. */
function getCsrfToken(): string | null {
  const match = document.cookie.match(/(?:^|;\s*)csrf_token=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : null;
}

// ─── Error ───────────────────────────────────────────────────────────

export class ApiError extends Error {
  status: number;
  details?: unknown;

  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }

  /** True for 401 Unauthorized */
  get isUnauthorized(): boolean {
    return this.status === 401;
  }

  /** True for 404 Not Found */
  get isNotFound(): boolean {
    return this.status === 404;
  }

  /** True for 422 Validation Error */
  get isValidationError(): boolean {
    return this.status === 422;
  }
}

// ─── Core Request ────────────────────────────────────────────────────

interface RequestOptions {
  params?: Record<string, string | number | boolean | undefined | null>;
  body?: unknown;
  headers?: Record<string, string>;
}

async function request<T>(
  method: string,
  url: string,
  options: RequestOptions = {},
): Promise<T> {
  const { params, body, headers: extraHeaders } = options;

  // Build URL with query params.
  // Preserve caller-provided names because the backend exposes camelCase aliases
  // for many filter/query params (for example `parserId`, `accountId`, `pageSize`).
  let fullUrl = url;
  if (params) {
    const searchParams = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null && value !== '') {
        searchParams.set(key, String(value));
      }
    }
    const qs = searchParams.toString();
    if (qs) fullUrl += `?${qs}`;
  }

  const headers: Record<string, string> = { ...extraHeaders };

  // Add CSRF token for mutations
  if (method !== 'GET') {
    const csrf = getCsrfToken();
    if (csrf) headers['X-CSRF-Token'] = csrf;
  }

  // Serialize body
  let fetchBody: BodyInit | undefined;
  if (body !== undefined && body !== null) {
    if (body instanceof FormData) {
      fetchBody = body;
      // Don't set Content-Type — browser sets multipart boundary
    } else {
      headers['Content-Type'] = 'application/json';
      fetchBody = JSON.stringify(transformKeys(body, camelToSnake));
    }
  }

  const response = await fetch(fullUrl, {
    method,
    headers,
    body: fetchBody,
    credentials: 'same-origin',
  });

  // No-content responses
  if (response.status === 204) return undefined as T;

  // Parse response body
  const contentType = response.headers.get('content-type');
  let data: unknown;
  if (contentType?.includes('application/json')) {
    data = await response.json();
  } else {
    data = await response.text();
  }

  if (!response.ok) {
    const message =
      typeof data === 'object' && data !== null && 'detail' in data
        ? String((data as { detail: unknown }).detail)
        : `Request failed with status ${response.status}`;
    throw new ApiError(response.status, message, data);
  }

  // Transform response keys to camelCase
  return transformKeys<T>(data, snakeToCamel);
}

// ─── Public API ──────────────────────────────────────────────────────

export const api = {
  get<T>(url: string, params?: Record<string, string | number | boolean | undefined | null>) {
    return request<T>('GET', url, { params });
  },

  post<T>(url: string, body?: unknown) {
    return request<T>('POST', url, { body });
  },

  put<T>(url: string, body?: unknown) {
    return request<T>('PUT', url, { body });
  },

  delete(url: string, body?: unknown) {
    return request<void>('DELETE', url, { body });
  },

  /** Upload a file via multipart/form-data POST. */
  upload<T>(
    url: string,
    file: File,
    params?: Record<string, string | number | boolean | undefined | null>,
    fields?: Record<string, unknown>,
  ) {
    const formData = new FormData();
    formData.append('file', file);

    if (fields) {
      for (const [key, value] of Object.entries(fields)) {
        if (value === undefined || value === null) continue;
        if (typeof value === 'string') {
          formData.append(key, value);
          continue;
        }

        formData.append(key, JSON.stringify(transformKeys(value, camelToSnake)));
      }
    }

    return request<T>('POST', url, { params, body: formData });
  },
};
