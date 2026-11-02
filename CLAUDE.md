# Project conventions

Keep each change small and typed; I need to be able to explain every line.

## Commands

- `npm run check`: typecheck + lint + format check. Run it after every change. Fix what your change caused; report anything else in one line.
- Mechanical rules live in `eslint.config.mjs`, not here: no `any`/`as`/`!`, strict equality, `type` over `interface`, `function` declarations at top level, return types in `src/api` and `src/lib`, no nested ternaries, braces on every `if`, `@/` imports, named exports, and doc comments on shared helpers.
- `npm run build`: run only when I ask.

## Working rules

- Reuse before writing. Check `src/lib/`, `src/hooks/`, `src/api/client.ts`, `src/components/shared/`, and `src/components/ui/` before adding a helper, hook, or component.
- Don't add dependencies without asking.
- Keep changes scoped to what was asked. No drive-by refactors.
- Build for current callers: don't add parameters, input types, or options no caller needs.
- Export only what another file imports, plus the entry point you're building for the next step (e.g. a fetch function before its hook). Schemas, types, and helpers stay private until another file needs them. Shared helpers in `src/lib/`, shared schemas in `src/api/schemas.ts`, generic hooks in `src/hooks/`, and components in `src/components/shared/` are exempt; they exist to be imported.
- When the prompt or API doc is ambiguous, ask. If you must proceed, pick the narrowest interpretation and say so.
- Before working around a library bug, reproduce it and describe what you observed, not what its source suggests.
- When refactoring logic that has no tests, run the old and new versions on the same edge-case inputs and compare the outputs before calling it done.
- Before calling a change done, re-read the changed code against the Readability and Comments rules; lint doesn't check those.
- Reply in a few lines: what changed, which files, and anything I should check. No recap of the code.

## Structure

| Path                                      | What lives there                                                                                            |
| ----------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `src/api/<domain>.ts`                     | One API domain: zod schemas, their `z.infer` types, request param types, and fetch functions via `apiFetch` |
| `src/hooks/<domain>/`                     | React Query hooks (`useTokens.ts`)                                                                          |
| `src/stores/`                             | zustand stores, one per domain (`swap-store.ts` → `useSwapStore`)                                           |
| `src/components/modules/<feature>/`       | Components for one feature (`token-picker/index.tsx`)                                                       |
| `src/components/modules/<feature>/hooks/` | Hooks used only by that feature; React Query hooks stay in `src/hooks/<domain>/`                            |
| `src/components/shared/`                  | Components used by two or more features (`token-selector/TokenRow.tsx`)                                     |

Data flows one way: component → hook → API function → `apiFetch`. API files don't import React, hooks don't render, and components never call `fetch` or `apiFetch`.

Pages stay thin and compose module components. They're server components, so put `"use client"` on the module component that needs hooks, zustand, or event handlers, not on `page.tsx`.

File names: components PascalCase (`TokenRow.tsx`), hooks `useX.ts`, everything else kebab-case. Each component folder in `shared/` or `modules/` uses `index.tsx` as its entry (`modules/token-picker/index.tsx`).

## TypeScript

- Instead of casts or `!`, narrow with control flow or parse with zod. Instead of `!= null`, check `null` and `undefined` separately or use `??` and `?.`.
- Model fields that only make sense together as discriminated unions (`z.discriminatedUnion` for API variants), not booleans plus optionals.

## Data fetching

- All requests go through `apiFetch(endpoint, schema, options)` from `@/api/client`. Build the endpoint from a base URL in `config` (`${config.apiBaseUrl}/tokens/search`); base URLs come from `NEXT_PUBLIC_*` env vars parsed in `src/config.ts`. Failures throw `ApiError`; use `detail.kind` when the UI needs to tell failures apart (e.g. timeout vs. HTTP).
- In a domain file, put the shared URL prefix in a top-level constant (`` const TOKENS_URL = `${config.apiBaseUrl}/tokens` ``). Each fetch function builds `const endpoint`, then returns `apiFetch(endpoint, schema, { params, signal })`. A new base URL also gets a line in `.env.example` and a row in the README's env table.
- Every fetch function takes an `AbortSignal` as its last parameter and passes it through; hooks use the `signal` from `queryFn`. No manual `useEffect` fetching.
- Query keys are inline arrays that start with the domain's `QUERY_KEY` constant (`const QUERY_KEY = "prices"`, then `[QUERY_KEY, mint]`) and are JSON-serializable (never a `bigint`). Declare it once per domain; other hooks in that domain import it.
- Every `useQuery` and `useInfiniteQuery` sets `staleTime`, `gcTime`, and `refetchInterval` explicitly as `_MS` constants, matched to how fast the data changes. Keep `gcTime` ≥ `staleTime`. Use `refetchInterval: false` when polling isn't needed.
- Add an optional `select` to a `useQuery` hook only when a caller needs a derived slice (`usePrice<T = Price>(mint: string, select?: (price: Price) => T)`); callers pass a stable selector (module-level or `useCallback`).
- After a successful mutation, invalidate by domain prefix (`queryClient.invalidateQueries({ queryKey: [QUERY_KEY] })`).

## zod schemas

- Build schemas only from the API doc and live responses; if they disagree, follow the live response and tell me. Don't invent fields or add any "just in case".
- If the doc leaves a field's type or nullability unclear, call the live endpoint and check real responses. If that still doesn't settle it, use the narrowest type the responses support and flag it in your reply, not in a code comment.
- Match nullability to the API: `.nullable()` for `null`, `.optional()` for absent.
- Parse base-unit token amounts into `bigint` with `baseUnitsSchema` (`src/api/schemas.ts`).

## Client state (zustand)

- Server data lives in React Query only. Store IDs or params, never query results.
- Use zustand only for state shared by components that are far apart; otherwise `useState` and props.
- Subscribe to the narrowest slice (`useSwapStore((s) => s.inputMint)`), with `useShallow` for several fields.

## Token amounts

- Amounts stay in base units as `bigint` from parse to render, and all amount math is `bigint`. Never use floats or `parseFloat` for amounts, and never assume decimals (0 to 18+).
- User input: `toBaseUnits(input, decimals)` from `src/lib/amount.ts`. Show its error inline; never round.
- Display: `formatAmount(baseUnits, decimals)`. USD display is the one float path: `formatUsd(toUiAmount(amount, decimals) * priceUsd)`.

## UI

- Use shadcn primitives from `src/components/ui/`; don't hand-build what shadcn ships (add missing ones with `npx shadcn@latest add <name>`). Don't edit `ui/`; wrap it in `shared/`.
- Style with Tailwind and theme tokens (`bg-background`, `text-muted-foreground`), never hard-coded colors.
- Size with Tailwind's rem-based scale (`p-4`, `text-sm`, `size-4`) so layouts follow the user's font size. Use px only for things that shouldn't scale, like borders and rings (`border`, `ring-1`); avoid arbitrary px values like `w-[13px]`.
- Every data-driven component renders pending (Skeleton shaped like the layout), error (Alert with a retry calling `refetch`), empty (`Empty`), and success. Switch on `query.status` so `data` narrows without `!`.
- Avoid layout shift. Anything whose content changes (query states, images loading, live prices, labels that change length) gets a stable size: fixed or `min-h-*`/`min-w-*` dimensions, `size-*` on media, `truncate` on variable-length text, and `tabular-nums` on numbers that update.
- Share layout instead of sizing each variant separately: render pending, error, empty, and success inside one wrapper sized like the success state. Check it in the browser, since primitives can override your sizing (`Empty` is `flex-1`).
- Disable queries that are missing input with `enabled`. A disabled query with no data stays `"pending"`, so check the input first (`if (search === "")`) and render the idle state before switching on `status`.
- Use `useMemo`/`useCallback` only when a dependency array, a memoized child, or a selector needs a stable reference, not to cache cheap work.

## Edge cases

Build the simplest working version first. Apply these only when I ask for the edge-case pass or name one. Assume real wallets: thousands of tokens, flaky networks, messy data.

- **Long lists:** paginate with `useInfiniteQuery` when the API supports it, fetching the next page from the virtualizer's `onChange` when the last visible row is within a buffer of the end. Virtualize with `@tanstack/react-virtual` past ~100 rows. Key rows by stable IDs (mint address), never indexes.
- **Inputs that trigger requests:** debounce with `useDebouncedValue` (~300ms), put the debounced value in the query key, and use `placeholderData: keepPreviousData`.
- **Failed polls:** a failed background refetch lands in `"error"` but keeps `data`. When `query.isRefetchError` is true, keep rendering `data` with a small inline Alert, so one failed poll doesn't blank the screen.
- **Amounts:** check that amounts and USD values display correctly for dust, zero, huge balances, and negative deltas.
- **Missing data:** null prices, missing logos (Avatar fallback), unknown or very long names (truncate). Display addresses with `shortenAddress`; copy the full address, never the shortened one.

## Readability

- One idea per statement. If Prettier wraps a statement mid-expression, split it into named consts.
- Exported functions read as a short sequence of named steps; move mechanics into helpers below them. With several exported functions in a file, follow each with its own helpers, and put helpers shared by several at the bottom.
- Within a file, one name means one thing. Don't reuse a name for values of different types; tell them apart in the name (`wholeDigits` for the string, `whole` for the `bigint`).
- Declare each type directly above the first function that uses it, so it moves or gets deleted with that function. Keep module-level constants together at the top of the file, so settings are easy to find and change.
- Name intent over mechanics: if a reader has to decode an expression to know what it's for (a regex, a string or math trick, a compound condition, a magic number), give it a named const or a small helper.
- Put units in duration names (`delayMs`, `retryAfterMs`, `REQUEST_TIMEOUT_MS`).
- Name module-level constants by what they hold: values written directly in the file that someone might tune (numbers, strings, regexes, literal arrays and lookup objects) are `UPPER_SNAKE_CASE` (`MAX_RETRIES`, `TOKENS_URL`); anything created by a call (schemas, formatters, clients, parsed config) is `camelCase` (`tokenSchema`, `usdFormatter`, `config`).
- When a constant has to stay in step with another, derive it (`const STALE_TIME_MS = REFETCH_INTERVAL_MS`) instead of repeating the literal.
- No ternaries whose branches mostly repeat; compute only the part that differs.
- Prefer blocks over condensed forms: `switch` cases get a braced body (`case "http": { … }`), and `useEffect`/`useLayoutEffect` callbacks always use a block body. One-expression callbacks like `.map((t) => t.mint)` or store selectors can stay concise when they fit on one line; if Prettier wraps one after `=>`, give it a block body with `return`.

## Comments

- Comment only the why (tradeoff, workaround, API quirk, known limitation), never the what. No commented-out code.
- Before adding a comment, ask: without it, would a reader misread the code or change it wrongly in a way typecheck and lint wouldn't catch? If not, leave it out.
- Keep investigation notes out of code (gaps in the doc, what live responses showed, what you tried). Put them in your reply or the commit message.
- Keep a why-comment to one short line. If it needs to explain how a library or the compiler behaves, put that in your reply instead.
- Doc comments on shared helpers and generic hooks (lint requires them) say in 1–2 sentences what the function returns and any non-obvious behavior. Skip them for components and feature hooks.
