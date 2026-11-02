import { z } from "zod";

import { apiFetch } from "@/api/client";
import { config } from "@/config";

const BIRDEYE_DEFI_URL = `${config.birdeyeApiBaseUrl}/defi`;

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

export function getTokenPrices(
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
