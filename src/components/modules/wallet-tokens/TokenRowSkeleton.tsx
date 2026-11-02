import { Item, ItemContent, ItemMedia } from "@/components/ui/item";
import { Skeleton } from "@/components/ui/skeleton";

export function TokenRowSkeleton() {
  return (
    <Item size="sm" className="h-16 flex-nowrap">
      <ItemMedia>
        <Skeleton className="size-10 rounded-full" />
      </ItemMedia>
      <ItemContent>
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-4 w-20" />
      </ItemContent>
      <ItemContent className="min-w-20 items-end">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-4 w-12" />
      </ItemContent>
    </Item>
  );
}
