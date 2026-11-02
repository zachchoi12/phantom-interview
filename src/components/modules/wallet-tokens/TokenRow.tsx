import type { TokenPrice } from "@/api/prices";
import type { WalletToken } from "@/api/tokens";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item";
import { Skeleton } from "@/components/ui/skeleton";
import { formatPercentChange, formatUsd, shortenAddress } from "@/lib/format";
import { cn } from "@/lib/utils";

const UNKNOWN_TOKEN_NAME = "Unknown token";
const NO_PRICE_LABEL = "—";

export type TokenRowPrice =
  | { status: "pending" }
  | { status: "unavailable" }
  | { status: "available"; price: TokenPrice };

type TokenRowProps = {
  token: WalletToken;
  price: TokenRowPrice;
};

export function TokenRow({ token, price }: TokenRowProps) {
  const symbol = token.symbol ?? shortenAddress(token.mintAddress);
  const name = token.name ?? UNKNOWN_TOKEN_NAME;
  const amountLabel = `${token.amount} ${symbol}`;

  return (
    <Item size="sm" className="h-16 flex-nowrap">
      <ItemMedia>
        <Avatar size="lg">
          <AvatarImage src={token.imageUrl} alt={symbol} />
          <AvatarFallback>{symbol.charAt(0)}</AvatarFallback>
        </Avatar>
      </ItemMedia>
      <ItemContent className="min-w-0">
        <ItemTitle className="w-full">
          <span className="min-w-0 truncate">{name}</span>
        </ItemTitle>
        <ItemDescription className="truncate tabular-nums">
          {amountLabel}
        </ItemDescription>
      </ItemContent>
      <ItemContent className="min-w-20 items-end">
        <TokenValue amount={token.amount} price={price} />
      </ItemContent>
    </Item>
  );
}

type TokenValueProps = {
  amount: string;
  price: TokenRowPrice;
};

function TokenValue({ amount, price }: TokenValueProps) {
  switch (price.status) {
    case "pending": {
      return (
        <>
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-12" />
        </>
      );
    }
    case "unavailable": {
      return (
        <span className="text-sm text-muted-foreground">{NO_PRICE_LABEL}</span>
      );
    }
    case "available": {
      const { value, priceChange24h } = price.price;
      const usdValue = Number(amount) * value;
      return (
        <>
          <span className="text-sm font-medium tabular-nums">
            {formatUsd(usdValue)}
          </span>
          <PriceChange percent={priceChange24h} />
        </>
      );
    }
  }
}

type PriceChangeProps = {
  percent: number | null;
};

function PriceChange({ percent }: PriceChangeProps) {
  if (percent === null) {
    return (
      <span className="text-sm text-muted-foreground">{NO_PRICE_LABEL}</span>
    );
  }
  const isDown = percent < 0;
  const changeColor = isDown ? "text-destructive" : "text-muted-foreground";
  return (
    <span className={cn("text-sm tabular-nums", changeColor)}>
      {formatPercentChange(percent)}
    </span>
  );
}
