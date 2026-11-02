import { z } from "zod";

const httpUrlSchema = z.url({ protocol: /^https?$/ });

const publicConfigSchema = z.object({
  // Empty means same-origin.
  apiBaseUrl: z
    .union([httpUrlSchema, z.literal("")])
    .transform(trimTrailingSlashes),
});

export const config = publicConfigSchema.parse({
  apiBaseUrl: process.env.NEXT_PUBLIC_API_BASE_URL ?? "",
});

function trimTrailingSlashes(url: string): string {
  return url.replace(/\/+$/, "");
}
