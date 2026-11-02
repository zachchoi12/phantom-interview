// Fixed locale so server and client render identical strings (no hydration mismatch).
export const LOCALE = "en-US";
const ADDRESS_EDGE_CHARS = 4;
const CENT_USD = 0.01;
const COMPACT_MIN_USD = 1_000_000;
const SUBSCRIPT_MIN_ZEROS = 4;
const SUBSCRIPT_DIGITS = "₀₁₂₃₄₅₆₇₈₉";
const LEADING_ZEROS = /^0+/;

const usdFormatter = new Intl.NumberFormat(LOCALE, {
  style: "currency",
  currency: "USD",
});
const subCentFormatter = new Intl.NumberFormat(LOCALE, {
  style: "currency",
  currency: "USD",
  maximumSignificantDigits: 4,
});
const subDollarFormatter = new Intl.NumberFormat(LOCALE, {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 4,
});
const usdChangeFormatter = new Intl.NumberFormat(LOCALE, {
  style: "currency",
  currency: "USD",
  signDisplay: "exceptZero",
});
const percentChangeFormatter = new Intl.NumberFormat(LOCALE, {
  style: "percent",
  signDisplay: "exceptZero",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const compactUsdFormatter = new Intl.NumberFormat(LOCALE, {
  style: "currency",
  currency: "USD",
  notation: "compact",
  maximumSignificantDigits: 3,
});

/**
 * Formats a USD value with cents, e.g. `"$1,234.50"`.
 * Nonzero values under a cent render as `"<$0.01"`.
 */
export function formatUsd(value: number): string {
  const isUnderOneCent = value > 0 && value < 0.01;
  if (isUnderOneCent) {
    return "<$0.01";
  }
  return usdFormatter.format(value);
}

/**
 * Formats a token's USD price at any magnitude, e.g. `"$95.37"`, `"$0.0123"`, `"$1.23B"`.
 * Sub-cent prices keep 4 significant digits, with 4+ leading zeros collapsed to a count: `"$0.0₅279"` is $0.00000279.
 */
export function formatPrice(priceUsd: number): string {
  const isSubCent = priceUsd > 0 && priceUsd < CENT_USD;
  if (isSubCent) {
    return formatSubCentPrice(priceUsd);
  }
  if (priceUsd < 1) {
    return subDollarFormatter.format(priceUsd);
  }
  if (priceUsd < COMPACT_MIN_USD) {
    return usdFormatter.format(priceUsd);
  }
  return compactUsdFormatter.format(priceUsd);
}

function formatSubCentPrice(priceUsd: number): string {
  const parts = subCentFormatter.formatToParts(priceUsd);
  const shownParts = parts.map((part) => {
    if (part.type === "fraction") {
      return collapseLeadingZeros(part.value);
    }
    return part.value;
  });
  return shownParts.join("");
}

function collapseLeadingZeros(fractionDigits: string): string {
  const significantDigits = fractionDigits.replace(LEADING_ZEROS, "");
  const zeroCount = fractionDigits.length - significantDigits.length;
  if (zeroCount < SUBSCRIPT_MIN_ZEROS) {
    return fractionDigits;
  }
  return `0${toSubscript(zeroCount)}${significantDigits}`;
}

function toSubscript(value: number): string {
  const digits = [...String(value)];
  const subscriptDigits = digits.map((digit) => {
    return SUBSCRIPT_DIGITS.charAt(Number(digit));
  });
  return subscriptDigits.join("");
}

/**
 * Formats a USD change with its sign, e.g. `"+$1.23"` or `"-$0.50"`.
 */
export function formatUsdChange(value: number): string {
  return usdChangeFormatter.format(value);
}

/**
 * Formats a change given in percent units with its sign, e.g. `-2.7227` → `"-2.72%"`.
 */
export function formatPercentChange(percent: number): string {
  return percentChangeFormatter.format(percent / 100);
}

/**
 * Shortens an address for display, e.g. `"7xKX…gAsU"`.
 * Copy actions should still use the full address.
 */
export function shortenAddress(address: string): string {
  const shortenedLength = ADDRESS_EDGE_CHARS * 2 + 1;
  if (address.length <= shortenedLength) {
    return address;
  }
  const start = address.slice(0, ADDRESS_EDGE_CHARS);
  const end = address.slice(-ADDRESS_EDGE_CHARS);
  return `${start}…${end}`;
}
