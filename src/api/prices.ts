import { z } from "zod";

import { apiFetch } from "@/api/client";
import { config } from "@/config";

const BIRDEYE_DEFI_URL = `${config.birdeyeApiBaseUrl}/defi`;
const MAX_MINTS_PER_REQUEST = 100;

const tokenPriceSchema = z.object({
  value: z.number(),
  priceChange24h: z.number(),
});

// Keyed by mint; a mint Birdeye can't price maps to null.
const multiPriceResponseSchema = z
  .object({
    data: z.record(z.string(), tokenPriceSchema.nullable()),
  })
  .transform((response) => response.data);

type TokenPrices = z.infer<typeof multiPriceResponseSchema>;

export async function getTokenPrices(
  mints: string[],
  signal: AbortSignal,
): Promise<TokenPrices> {
  const batches = chunk(mints, MAX_MINTS_PER_REQUEST);
  const batchPrices = await Promise.all(
    batches.map((batch) => fetchPriceBatch(batch, signal)),
  );
  const entries = batchPrices.flatMap((prices) => Object.entries(prices));
  return Object.fromEntries(entries);
}

function fetchPriceBatch(
  mints: string[],
  signal: AbortSignal,
): Promise<TokenPrices> {
  const endpoint = `${BIRDEYE_DEFI_URL}/multi_price`;
  const params = { list_address: mints.join(",") };
  const headers = { "X-API-KEY": config.birdeyeApiKey };
  return apiFetch(endpoint, multiPriceResponseSchema, {
    params,
    headers,
    signal,
  });
}

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let start = 0; start < items.length; start += size) {
    chunks.push(items.slice(start, start + size));
  }
  return chunks;
}
