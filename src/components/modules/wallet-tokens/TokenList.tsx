import { useVirtualizer, type Virtualizer } from "@tanstack/react-virtual";
import { useEffect, useRef } from "react";

import type { TokenPrices } from "@/api/prices";
import type { WalletToken } from "@/api/tokens";
import {
  TokenRow,
  type TokenRowPrice,
} from "@/components/modules/wallet-tokens/TokenRow";
import { Alert, AlertAction, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useTokenPrices } from "@/hooks/prices/useTokenPrices";

const ROW_HEIGHT_ESTIMATE_PX = 64;
const OVERSCAN_ROWS = 10;
const PREFETCH_BUFFER_ROWS = 10;

type TokenListProps = {
  tokens: WalletToken[];
  onNearEnd: () => void;
};

export function TokenList({ tokens, onNearEnd }: TokenListProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const mints = tokens.map((token) => token.mintAddress);
  const pricesQuery = useTokenPrices(mints);

  const virtualizer = useVirtualizer({
    count: tokens.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ROW_HEIGHT_ESTIMATE_PX,
    getItemKey: (index) => mints[index] ?? index,
    overscan: OVERSCAN_ROWS,
    onChange: (instance) => {
      if (isNearEnd(instance)) {
        onNearEnd();
      }
    },
  });

  // onChange doesn't fire when rows are appended without scrolling, so a short list would stop paginating.
  useEffect(() => {
    if (isNearEnd(virtualizer)) {
      onNearEnd();
    }
  }, [virtualizer, tokens.length, onNearEnd]);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      {pricesQuery.isError && (
        <Alert variant="destructive">
          <AlertTitle>Couldn&apos;t load prices</AlertTitle>
          <AlertAction>
            <Button size="sm" onClick={() => pricesQuery.refetch()}>
              Retry
            </Button>
          </AlertAction>
        </Alert>
      )}
      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto">
        <div
          className="relative w-full"
          style={{ height: virtualizer.getTotalSize() }}
        >
          {virtualizer.getVirtualItems().map((virtualRow) => {
            const token = tokens[virtualRow.index];
            if (token === undefined) {
              return null;
            }
            const price = getRowPrice(
              pricesQuery.data,
              pricesQuery.isFetching,
              token.mintAddress,
            );
            return (
              <div
                key={virtualRow.key}
                ref={virtualizer.measureElement}
                data-index={virtualRow.index}
                className="absolute top-0 left-0 w-full"
                style={{ transform: `translateY(${virtualRow.start}px)` }}
              >
                <TokenRow token={token} price={price} />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function isNearEnd(virtualizer: Virtualizer<HTMLDivElement, Element>): boolean {
  const lastVisibleIndex = virtualizer.range?.endIndex ?? 0;
  const firstPrefetchIndex = virtualizer.options.count - PREFETCH_BUFFER_ROWS;
  return lastVisibleIndex >= firstPrefetchIndex;
}

// A mint missing from the data is still being fetched; null means Birdeye has no price for it.
function getRowPrice(
  prices: TokenPrices | undefined,
  isFetching: boolean,
  mint: string,
): TokenRowPrice {
  const price = prices?.[mint];
  if (price === undefined && isFetching) {
    return { status: "pending" };
  }
  if (price === undefined || price === null) {
    return { status: "unavailable" };
  }
  return { status: "available", price };
}
