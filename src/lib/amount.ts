import { LOCALE } from "@/lib/format";

const MAX_FRACTION_DIGITS = 4;
const SMALLEST_SHOWN_AMOUNT = `0.${"0".repeat(MAX_FRACTION_DIGITS - 1)}1`;
const DECIMAL_PATTERN = /^-?(\d+\.?\d*|\.\d+)$/;
const integerFormatter = new Intl.NumberFormat(LOCALE);

type ToBaseUnitsResult =
  | { ok: true; value: bigint }
  | { ok: false; error: "invalid" | "too-many-decimals" };

/**
 * Converts a decimal string to base units without rounding.
 * Example: `toBaseUnits("1.5", 9)` → `{ ok: true, value: 1_500_000_000n }`.
 * Fails with `"too-many-decimals"` when the input is more precise than the token.
 */
export function toBaseUnits(
  input: string,
  decimals: number,
): ToBaseUnitsResult {
  assertValidDecimals(decimals);
  const text = input.trim();
  if (!DECIMAL_PATTERN.test(text)) {
    return { ok: false, error: "invalid" };
  }

  const { isNegative, wholeDigits, fractionDigits } = splitDecimal(text);
  const significantFraction = trimTrailingZeros(fractionDigits);
  if (significantFraction.length > decimals) {
    return { ok: false, error: "too-many-decimals" };
  }

  const magnitude = joinBaseUnits(wholeDigits, significantFraction, decimals);
  return { ok: true, value: isNegative ? -magnitude : magnitude };
}

type DecimalParts = {
  isNegative: boolean;
  wholeDigits: string;
  fractionDigits: string;
};

function splitDecimal(text: string): DecimalParts {
  const isNegative = text.startsWith("-");
  const unsigned = isNegative ? text.slice(1) : text;
  const [wholeDigits = "", fractionDigits = ""] = unsigned.split(".");
  return { isNegative, wholeDigits, fractionDigits };
}

function joinBaseUnits(
  wholeDigits: string,
  fractionDigits: string,
  decimals: number,
): bigint {
  const paddedFraction = fractionDigits.padEnd(decimals, "0");
  const wholeUnits = BigInt(wholeDigits || "0") * baseUnitsPerToken(decimals);
  const fractionUnits = BigInt(paddedFraction || "0");
  return wholeUnits + fractionUnits;
}

/**
 * Formats a base-unit token amount for display, truncating instead of rounding.
 * Example: `formatAmount(1_234_567_891n, 9)` → `"1.2345"`.
 * Nonzero amounts too small to show render as `"<0.0001"`, or `"-<0.0001"` when negative.
 */
export function formatAmount(baseUnits: bigint, decimals: number): string {
  assertValidDecimals(decimals);
  const isNegative = baseUnits < 0n;
  const magnitude = isNegative ? -baseUnits : baseUnits;
  const { whole, fractionDigits } = splitBaseUnits(magnitude, decimals);
  const shownFraction = truncateFraction(fractionDigits);
  const sign = isNegative ? "-" : "";

  const isDust = magnitude !== 0n && whole === 0n && shownFraction === "";
  if (isDust) {
    return `${sign}<${SMALLEST_SHOWN_AMOUNT}`;
  }

  const formattedWhole = integerFormatter.format(whole);
  const fractionPart = shownFraction === "" ? "" : `.${shownFraction}`;
  return `${sign}${formattedWhole}${fractionPart}`;
}

type BaseUnitParts = {
  whole: bigint;
  fractionDigits: string;
};

function splitBaseUnits(magnitude: bigint, decimals: number): BaseUnitParts {
  const unitsPerToken = baseUnitsPerToken(decimals);
  const whole = magnitude / unitsPerToken;
  const remainder = magnitude % unitsPerToken;
  const fractionDigits = remainder.toString().padStart(decimals, "0");
  return { whole, fractionDigits };
}

// Truncate, don't round, so we never display more than the user holds.
function truncateFraction(fractionDigits: string): string {
  const shownDigits = fractionDigits.slice(0, MAX_FRACTION_DIGITS);
  return trimTrailingZeros(shownDigits);
}

/**
 * Converts base units to a decimal `number` for presentational math like USD value.
 * Example: `toUiAmount(1_500_000_000n, 9)` → `1.5`.
 * Lossy: never use it for amount math.
 */
export function toUiAmount(baseUnits: bigint, decimals: number): number {
  assertValidDecimals(decimals);
  return Number(baseUnits) / 10 ** decimals;
}

function baseUnitsPerToken(decimals: number): bigint {
  return 10n ** BigInt(decimals);
}

function trimTrailingZeros(digits: string): string {
  return digits.replace(/0+$/, "");
}

function assertValidDecimals(decimals: number): void {
  if (!Number.isInteger(decimals) || decimals < 0) {
    throw new RangeError(`Invalid token decimals: ${decimals}`);
  }
}
