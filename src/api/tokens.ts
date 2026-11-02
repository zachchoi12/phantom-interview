import { z } from "zod";

import { apiFetch } from "@/api/client";
import { config } from "@/config";

const TOKEN_DATA_URL = `${config.phantomApiBaseUrl}/token-data`;
const UNSIGNED_DECIMAL_PATTERN = /^\d+(\.\d+)?$/;
const ZERO_AMOUNT_PATTERN = /^0+(\.0+)?$/;

const walletTokenSchema = z.object({
  mintAddress: z.string(),
  // Already in whole tokens, not base units; the API doesn't send decimals.
  amount: z.string().regex(UNSIGNED_DECIMAL_PATTERN),
  type: z.enum(["fungible", "collectible"]),
  name: z.string().optional(),
  symbol: z.string().optional(),
  imageUrl: z.string().optional(),
});

export type WalletToken = z.infer<typeof walletTokenSchema>;

const walletTokensPageSchema = z.object({
  page: z.number().int(),
  perPage: z.number().int(),
  total: z.number().int(),
  records: z.array(walletTokenSchema).transform(dropZeroBalances),
});

// Pages can come back shorter than perPage; page, perPage, and total still count the dropped records.
function dropZeroBalances(tokens: WalletToken[]): WalletToken[] {
  return tokens.filter((token) => !ZERO_AMOUNT_PATTERN.test(token.amount));
}

type WalletTokensPage = z.infer<typeof walletTokensPageSchema>;

type WalletTokensParams = {
  publicKey: string;
  page: number;
  perPage: number;
};

export function getWalletTokens(
  params: WalletTokensParams,
  signal: AbortSignal,
): Promise<WalletTokensPage> {
  const endpoint = `${TOKEN_DATA_URL}/`;
  return apiFetch(endpoint, walletTokensPageSchema, { params, signal });
}
