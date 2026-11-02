import { useInfiniteQuery } from "@tanstack/react-query";

import { getWalletTokens } from "@/api/tokens";

const QUERY_KEY = "tokens";
const FIRST_PAGE = 1;
const PAGE_SIZE = 20;
const STALE_TIME_MS = 60_000;
const GC_TIME_MS = 5 * 60_000;

export function useWalletTokens(publicKey: string) {
  return useInfiniteQuery({
    queryKey: [QUERY_KEY, publicKey],
    queryFn: ({ pageParam, signal }) => {
      const params = { publicKey, page: pageParam, perPage: PAGE_SIZE };
      return getWalletTokens(params, signal);
    },
    initialPageParam: FIRST_PAGE,
    getNextPageParam: getNextPage,
    enabled: publicKey !== "",
    staleTime: STALE_TIME_MS,
    gcTime: GC_TIME_MS,
    refetchInterval: false,
  });
}

type PageInfo = {
  page: number;
  perPage: number;
  total: number;
};

function getNextPage(lastPage: PageInfo): number | undefined {
  const loadedCount = lastPage.page * lastPage.perPage;
  if (loadedCount >= lastPage.total) {
    return undefined;
  }
  return lastPage.page + 1;
}
