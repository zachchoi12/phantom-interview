import type { z } from "zod";

const REQUEST_TIMEOUT_MS = 15_000;

type ApiErrorDetail =
  | { kind: "http"; status: number; body: unknown; retryAfterMs: number | null }
  | { kind: "network" }
  | { kind: "timeout"; timeoutMs: number }
  | { kind: "parse" };

export class ApiError extends Error {
  readonly url: string;
  readonly detail: ApiErrorDetail;

  constructor(url: string, detail: ApiErrorDetail, cause?: unknown) {
    super(describeError(url, detail), { cause });
    this.name = "ApiError";
    this.url = url;
    this.detail = detail;
  }
}

function describeError(url: string, detail: ApiErrorDetail): string {
  switch (detail.kind) {
    case "http": {
      return `Request to ${url} failed with status ${detail.status}`;
    }
    case "network": {
      return `Network error requesting ${url}`;
    }
    case "timeout": {
      return `Request to ${url} timed out after ${detail.timeoutMs}ms`;
    }
    case "parse": {
      return `Unexpected response shape from ${url}`;
    }
  }
}

/**
 * True for failures a retry can fix: network errors, timeouts, 429, and 5xx.
 */
export function isRetryableError(error: unknown): boolean {
  if (!(error instanceof ApiError)) {
    return false;
  }

  switch (error.detail.kind) {
    case "network":
    case "timeout": {
      return true;
    }
    case "http": {
      return error.detail.status === 429 || error.detail.status >= 500;
    }
    case "parse": {
      return false;
    }
  }
}

type QueryParams = Record<string, string | number | boolean | null | undefined>;

type RequestOptions = {
  method?: "GET" | "POST";
  params?: QueryParams;
  body?: unknown;
  signal: AbortSignal;
};

/**
 * Requests `endpoint` with `params` as its query string and returns the JSON response parsed with `schema`.
 * Throws `ApiError` on HTTP, network, timeout, or parse failure; caller aborts rethrow as-is.
 */
export async function apiFetch<T>(
  endpoint: string,
  schema: z.ZodType<T>,
  options: RequestOptions,
): Promise<T> {
  const url = buildUrl(endpoint, options.params);
  const { response, text } = await sendRequest(url, options);
  if (!response.ok) {
    throw toHttpError(url, response, text);
  }
  return parseResponse(url, text, schema);
}

function buildUrl(endpoint: string, params: QueryParams = {}): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== null && value !== undefined) {
      search.set(key, String(value));
    }
  }
  const query = search.toString();
  if (query === "") {
    return endpoint;
  }
  return `${endpoint}?${query}`;
}

type RawResponse = {
  response: Response;
  text: string;
};

async function sendRequest(
  url: string,
  { method = "GET", body, signal }: RequestOptions,
): Promise<RawResponse> {
  const timeoutSignal = AbortSignal.timeout(REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      method,
      headers: buildHeaders(body),
      body: stringifyBody(body),
      signal: AbortSignal.any([signal, timeoutSignal]),
    });
    const text = await response.text();
    return { response, text };
  } catch (error) {
    // Caller cancellations must surface as AbortError so React Query treats them as cancelled, not failed.
    if (signal.aborted) {
      throw error;
    }
    if (timeoutSignal.aborted) {
      throw new ApiError(
        url,
        { kind: "timeout", timeoutMs: REQUEST_TIMEOUT_MS },
        error,
      );
    }
    throw new ApiError(url, { kind: "network" }, error);
  }
}

function buildHeaders(body: unknown): Headers {
  const headers = new Headers({ Accept: "application/json" });
  if (body !== undefined) {
    headers.set("Content-Type", "application/json");
  }
  return headers;
}

function stringifyBody(body: unknown): string | undefined {
  if (body === undefined) {
    return undefined;
  }
  return JSON.stringify(body, (_key, value: unknown) => {
    return typeof value === "bigint" ? value.toString() : value;
  });
}

function toHttpError(url: string, response: Response, text: string): ApiError {
  return new ApiError(url, {
    kind: "http",
    status: response.status,
    body: tryParseJson(text) ?? text,
    retryAfterMs: parseRetryAfter(response.headers.get("Retry-After")),
  });
}

function tryParseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

// Cross-origin, this header is only readable if the server sends Access-Control-Expose-Headers: Retry-After.
function parseRetryAfter(header: string | null): number | null {
  if (header === null) {
    return null;
  }
  const value = header.trim();
  const isDelaySeconds = /^\d+$/.test(value);
  if (isDelaySeconds) {
    return Number(value) * 1000;
  }

  const retryAt = Date.parse(value);
  if (Number.isNaN(retryAt)) {
    return null;
  }
  return Math.max(0, retryAt - Date.now());
}

function parseResponse<T>(url: string, text: string, schema: z.ZodType<T>): T {
  const json = parseJsonBody(url, text);
  const result = schema.safeParse(json);
  if (!result.success) {
    throw new ApiError(url, { kind: "parse" }, result.error);
  }
  return result.data;
}

function parseJsonBody(url: string, text: string): unknown {
  if (text === "") {
    return undefined;
  }
  try {
    return JSON.parse(text);
  } catch (error) {
    throw new ApiError(url, { kind: "parse" }, error);
  }
}
