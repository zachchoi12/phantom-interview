# Next.js Starter

Next.js 15 + React 19 + TypeScript starter with typed data fetching, `bigint` token amounts, and shadcn/ui. Working conventions live in `CLAUDE.md`, with ESLint and Prettier enforcing the mechanical ones.

```bash
cp .env.example .env.local
npm install
npm run dev     # http://localhost:3000
npm run check   # typecheck + lint + format check
```

## Project structure

```
.
├── src/
│   ├── app/                  # Next.js pages (thin server components)
│   ├── api/                  # client.ts, schemas.ts, one <domain>.ts per API
│   ├── components/
│   │   ├── ui/               # shadcn primitives
│   │   ├── shared/           # Components used by multiple features
│   │   └── modules/          # One folder per feature
│   │       └── <feature>/
│   │           └── hooks/    # Hooks used only by this feature
│   ├── hooks/                # Generic hooks; <domain>/useX.ts for React Query
│   ├── lib/                  # amount, format, query-client, utils
│   ├── providers/            # React Query, tooltip, toaster
│   ├── stores/               # zustand stores, one per domain
│   └── config.ts             # Parsed NEXT_PUBLIC_* env vars
├── .env.example              # Environment variables example
├── CLAUDE.md                 # Code conventions
├── components.json           # shadcn config
├── eslint.config.mjs         # Lint rules
└── ...
```

## Config

`config.ts`: parses `NEXT_PUBLIC_*` env vars with zod at startup, so a bad base URL fails immediately instead of at the first request

| Var                        | Default             | Use                            |
| -------------------------- | ------------------- | ------------------------------ |
| `NEXT_PUBLIC_API_BASE_URL` | empty (same origin) | Base URL for the app's own API |

## API client

`client.ts`: `fetch` wrapper with zod schema validation, a typed `ApiError`, and timeouts

```ts
const PRICES_URL = `${config.apiBaseUrl}/prices`;

const priceSchema = z.object({
  mint: z.string(),
  priceUsd: z.number().nullable(),
});

export type Price = z.infer<typeof priceSchema>;

export function getPrice(mint: string, signal: AbortSignal): Promise<Price> {
  const endpoint = PRICES_URL;
  return apiFetch(endpoint, priceSchema, { params: { mint }, signal });
}
```

## React Query

`query-client.ts`: shared `QueryClient` with these defaults:

- `staleTime` of 30s
- Retries only retryable `ApiError`s, up to 3 times
- Retry delay uses `Retry-After` when sent, otherwise full-jitter backoff (1s base, 30s cap)
- Each query still sets its own `staleTime`, `gcTime`, and `refetchInterval`

## Utilities

`amount.ts`: token amounts (`bigint` base units)

```ts
toBaseUnits("1.5", 9);              // Parse user input into base units
formatAmount(1_234_567_891n, 9);    // Show a token amount
toUiAmount(1_500_000_000n, 9);      // Get a number for USD math
```

`format.ts`: USD and addresses

```ts
formatUsd(1234.5);                  // Show a USD value
formatPrice(0.00000279);            // Show a token's USD price
shortenAddress(address);            // Show an address as 7xKX…gAsU
```
