"use client";

import { useCallback } from "react";

import { TokenList } from "@/components/modules/wallet-tokens/TokenList";
import { TokenRowSkeleton } from "@/components/modules/wallet-tokens/TokenRowSkeleton";
import {
  Alert,
  AlertAction,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import { useWalletTokens } from "@/hooks/tokens/useWalletTokens";

const SKELETON_ROW_COUNT = 8;
const SKELETON_ROW_KEYS = Array.from(
  { length: SKELETON_ROW_COUNT },
  (_, index) => index,
);

type WalletTokensProps = {
  publicKey: string;
};

export function WalletTokens({ publicKey }: WalletTokensProps) {
  const tokensQuery = useWalletTokens(publicKey);
  const { hasNextPage, isFetchingNextPage, fetchNextPage } = tokensQuery;
  const fetchMoreTokens = useCallback(() => {
    const canFetchMore = hasNextPage && !isFetchingNextPage;
    if (canFetchMore) {
      void fetchNextPage({ cancelRefetch: false });
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  switch (tokensQuery.status) {
    case "pending": {
      return (
        <div className="flex min-h-0 flex-1 flex-col">
          {SKELETON_ROW_KEYS.map((key) => (
            <TokenRowSkeleton key={key} />
          ))}
        </div>
      );
    }
    case "error": {
      return (
        <div className="flex min-h-0 flex-1 flex-col">
          <Alert variant="destructive">
            <AlertTitle>Couldn&apos;t load tokens</AlertTitle>
            <AlertDescription>
              Check your connection and retry.
            </AlertDescription>
            <AlertAction>
              <Button size="sm" onClick={() => tokensQuery.refetch()}>
                Retry
              </Button>
            </AlertAction>
          </Alert>
        </div>
      );
    }
    case "success": {
      const tokens = tokensQuery.data.pages.flatMap((page) => page.records);
      if (tokens.length === 0) {
        return (
          <Empty>
            <EmptyHeader>
              <EmptyTitle>No tokens</EmptyTitle>
              <EmptyDescription>
                This wallet doesn&apos;t hold any tokens.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        );
      }

      return <TokenList tokens={tokens} onNearEnd={fetchMoreTokens} />;
    }
  }
}
