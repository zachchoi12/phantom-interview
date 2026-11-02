import { QueryClient } from "@tanstack/react-query";
import { ApiError, isRetryableError } from "@/api/client";

const DEFAULT_STALE_TIME_MS = 30_000;
const MAX_RETRIES = 3;
const BASE_RETRY_DELAY_MS = 1_000;
const MAX_RETRY_DELAY_MS = 30_000;

/**
 * Creates the app's `QueryClient`. Queries retry retryable `ApiError`s with backoff or `Retry-After`; mutations never retry.
 */
export function makeQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: DEFAULT_STALE_TIME_MS,
        retry: shouldRetry,
        retryDelay: getRetryDelay,
      },
      // Mutations aren't idempotent: a timed-out request may have already reached the server.
      mutations: { retry: false },
    },
  });
}

function shouldRetry(failureCount: number, error: unknown): boolean {
  return failureCount < MAX_RETRIES && isRetryableError(error);
}

function getRetryDelay(failureCount: number, error: unknown): number {
  const retryAfterMs = getRetryAfterMs(error);
  if (retryAfterMs !== null) {
    return Math.min(retryAfterMs, MAX_RETRY_DELAY_MS);
  }

  const backoffMs = BASE_RETRY_DELAY_MS * 2 ** failureCount;
  const cappedBackoffMs = Math.min(backoffMs, MAX_RETRY_DELAY_MS);
  // Full jitter, so clients that failed together don't retry in lockstep.
  return Math.random() * cappedBackoffMs;
}

function getRetryAfterMs(error: unknown): number | null {
  if (error instanceof ApiError && error.detail.kind === "http") {
    return error.detail.retryAfterMs;
  }
  return null;
}
