import { z } from "zod";

const httpUrlSchema = z.url({ protocol: /^https?$/ });
const baseUrlSchema = httpUrlSchema.transform(trimTrailingSlashes);

const publicConfigSchema = z.object({
  // Empty means same-origin.
  apiBaseUrl: z
    .union([httpUrlSchema, z.literal("")])
    .transform(trimTrailingSlashes),
  phantomApiBaseUrl: baseUrlSchema,
  birdeyeApiBaseUrl: baseUrlSchema,
  birdeyeApiKey: z.string().min(1),
});

export const config = publicConfigSchema.parse({
  apiBaseUrl: process.env.NEXT_PUBLIC_API_BASE_URL ?? "",
  phantomApiBaseUrl: process.env.NEXT_PUBLIC_PHANTOM_API_BASE_URL,
  birdeyeApiBaseUrl: process.env.NEXT_PUBLIC_BIRDEYE_API_BASE_URL,
  birdeyeApiKey: process.env.NEXT_PUBLIC_BIRDEYE_API_KEY,
});

function trimTrailingSlashes(url: string): string {
  return url.replace(/\/+$/, "");
}
