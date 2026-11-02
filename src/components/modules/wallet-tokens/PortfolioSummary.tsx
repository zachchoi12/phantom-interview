import type { ReactNode } from "react";

import type { TokenPrices } from "@/api/prices";
import type { WalletToken } from "@/api/tokens";
import { Skeleton } from "@/components/ui/skeleton";
import { useTokenPrices } from "@/hooks/prices/useTokenPrices";
import { formatPercentChange, formatUsd, formatUsdChange } from "@/lib/format";
import { cn } from "@/lib/utils";

const NO_VALUE_LABEL = "—";

type PortfolioSummaryProps = {
  tokens: WalletToken[];
};

export function PortfolioSummary({ tokens }: PortfolioSummaryProps) {
  const mints = tokens.map((token) => token.mintAddress);
  const pricesQuery = useTokenPrices(mints);

  switch (pricesQuery.status) {
    case "pending": {
      return <PortfolioSummarySkeleton />;
    }
    // TokenList shows the prices Alert with retry.
    case "error": {
      return (
        <SummaryFrame>
          <span className="text-3xl font-semibold text-muted-foreground">
            {NO_VALUE_LABEL}
          </span>
        </SummaryFrame>
      );
    }
    case "success": {
      const totals = sumPortfolio(tokens, pricesQuery.data);
      return (
        <SummaryFrame>
          <span className="max-w-full truncate text-3xl font-semibold tabular-nums">
            {formatUsd(totals.valueUsd)}
          </span>
          <PortfolioChange totals={totals} />
        </SummaryFrame>
      );
    }
  }
}

export function PortfolioSummarySkeleton() {
  return (
    <SummaryFrame>
      <Skeleton className="h-9 w-40" />
      <Skeleton className="h-5 w-32" />
    </SummaryFrame>
  );
}

type SummaryFrameProps = {
  children: ReactNode;
};

function SummaryFrame({ children }: SummaryFrameProps) {
  return (
    <div className="flex min-h-20 flex-col items-center justify-center gap-1 py-2">
      {children}
    </div>
  );
}

type PortfolioChangeProps = {
  totals: PortfolioTotals;
};

function PortfolioChange({ totals }: PortfolioChangeProps) {
  const { changeUsd, changePercent } = totals;
  const changeColor = getChangeColor(changeUsd);
  return (
    <span className={cn("flex gap-2 text-sm tabular-nums", changeColor)}>
      <span>{formatUsdChange(changeUsd)}</span>
      <span>
        {changePercent === null
          ? NO_VALUE_LABEL
          : formatPercentChange(changePercent)}
      </span>
    </span>
  );
}

function getChangeColor(changeUsd: number): string {
  if (changeUsd > 0) {
    return "text-success";
  }
  if (changeUsd < 0) {
    return "text-destructive";
  }
  return "text-muted-foreground";
}

type PortfolioTotals = {
  valueUsd: number;
  changeUsd: number;
  changePercent: number | null;
};

// Tokens without a 24h change count as unchanged, so their value is in both the total and the 24h-ago baseline.
function sumPortfolio(
  tokens: WalletToken[],
  prices: TokenPrices,
): PortfolioTotals {
  let valueUsd = 0;
  let changeUsd = 0;
  for (const token of tokens) {
    const price = prices[token.mintAddress];
    if (price === undefined || price === null) {
      continue;
    }
    const tokenValueUsd = Number(token.amount) * price.value;
    valueUsd += tokenValueUsd;
    if (price.priceChange24h !== null) {
      changeUsd += getValueChange(tokenValueUsd, price.priceChange24h);
    }
  }

  const previousValueUsd = valueUsd - changeUsd;
  const changePercent =
    previousValueUsd === 0 ? null : (changeUsd / previousValueUsd) * 100;
  return { valueUsd, changeUsd, changePercent };
}

function getValueChange(
  currentValueUsd: number,
  percentChange: number,
): number {
  const priceRatioSince24h = 1 + percentChange / 100;
  const previousValueUsd = currentValueUsd / priceRatioSince24h;
  return currentValueUsd - previousValueUsd;
}
