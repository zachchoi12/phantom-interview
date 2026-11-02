import { useQuery } from "@tanstack/react-query";

import { getTokenPrices } from "@/api/prices";
import { isSolanaAddress } from "@/lib/address";

const QUERY_KEY = "prices";
const REFETCH_INTERVAL_MS = 15_000;
const STALE_TIME_MS = REFETCH_INTERVAL_MS;
const GC_TIME_MS = 5 * 60_000;

export function useTokenPrices(mints: string[]) {
  const priceableMints = normalizeMints(mints);
  return useQuery({
    queryKey: [QUERY_KEY, priceableMints],
    queryFn: ({ signal }) => getTokenPrices(priceableMints, signal),
    enabled: priceableMints.length > 0,
    staleTime: STALE_TIME_MS,
    gcTime: GC_TIME_MS,
    refetchInterval: REFETCH_INTERVAL_MS,
  });
}

// Sorted so the query key doesn't change when callers reorder the same mints.
function normalizeMints(mints: string[]): string[] {
  const validMints = mints.filter(isSolanaAddress);
  const uniqueMints = [...new Set(validMints)];
  return uniqueMints.sort();
}
