// custom-fetch.ts

const API_BASE_URL = "http://localhost:5001";

export type CustomFetchOptions = RequestInit & {
  responseType?: "json" | "text" | "blob" | "auto";
};

export type ErrorType<T = unknown> = ApiError<T>;
export type BodyType<T> = T;

const NO_BODY_STATUS = new Set([204, 205, 304]);
const DEFAULT_JSON_ACCEPT = "application/json, application/problem+json";

function mergeHeaders(...sources: Array<HeadersInit | undefined>): Headers {
  const headers = new Headers();
  for (const source of sources) {
    if (!source) continue;
    new Headers(source).forEach((value, key) => headers.set(key, value));
  }
  return headers;
}

function getMediaType(headers: Headers): string | null {
  const value = headers.get("content-type");
  return value ? value.split(";", 1)[0].trim().toLowerCase() : null;
}

function isJsonMediaType(mediaType: string | null) {
  return mediaType === "application/json" || Boolean(mediaType?.endsWith("+json"));
}

function hasNoBody(response: Response, method: string): boolean {
  if (method === "HEAD") return true;
  if (NO_BODY_STATUS.has(response.status)) return true;
  if (response.headers.get("content-length") === "0") return true;
  if (response.body == null) return true;
  return false;
}

function buildErrorMessage(response: Response, data: unknown) {
  const prefix = `HTTP ${response.status} ${response.statusText}`;
  if (!data) return prefix;
  if (typeof data === "string") return `${prefix}: ${data.slice(0, 300)}`;
  const message =
    (data as any)?.message ||
    (data as any)?.error ||
    (data as any)?.detail;
  return message ? `${prefix}: ${message}` : prefix;
}

export class ApiError<T = unknown> extends Error {
  status: number;
  data: T | null;

  constructor(response: Response, data: T | null) {
    super(buildErrorMessage(response, data));
    this.status = response.status;
    this.data = data;
  }
}

export async function customFetch<T = unknown>(
  path: string,
  options: CustomFetchOptions = {}
): Promise<T> {
  const { responseType = "auto", headers: headersInit, ...init } = options;

  const method = (init.method || "GET").toUpperCase();

  const url = path.startsWith("http")
    ? path
    : `${API_BASE_URL}${path}`;

  const headers = mergeHeaders(headersInit);

  if (typeof window !== "undefined") {
    const token = localStorage.getItem("auth-token");
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
  }

  if (init.body && typeof init.body === "object" && !(init.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
    init.body = JSON.stringify(init.body);
  }

  headers.set("Accept", DEFAULT_JSON_ACCEPT);

  const res = await fetch(url, {
    ...init,
    method,
    headers,
  });

  if (!res.ok) {
    let errorData: unknown = null;
    try {
      const mediaType = getMediaType(res.headers);
      if (isJsonMediaType(mediaType)) {
        errorData = await res.json();
      } else {
        errorData = await res.text();
      }
    } catch {
      errorData = null;
    }
    throw new ApiError(res, errorData);
  }

  if (hasNoBody(res, method)) return {} as T;

  const mediaType = getMediaType(res.headers);

  if (responseType === "text") return (await res.text()) as unknown as T;
  if (responseType === "blob") return (await res.blob()) as unknown as T;

  if (responseType === "json" || (responseType === "auto" && isJsonMediaType(mediaType))) {
    return (await res.json()) as T;
  }

  return (await res.text()) as unknown as T;
}