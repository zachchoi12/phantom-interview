const BASE58_ALPHABET =
  "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
const LEADING_ZERO_BYTES_PATTERN = /^1+/;
const ADDRESS_BYTES = 32;
const MIN_ADDRESS_LENGTH = 32;
const MAX_ADDRESS_LENGTH = 44;

/**
 * Returns true when `value` is base58 that decodes to exactly 32 bytes, the shape of a Solana address.
 * Doesn't check the curve, so program-derived addresses pass too.
 */
export function isSolanaAddress(value: string): boolean {
  const hasAddressLength =
    value.length >= MIN_ADDRESS_LENGTH && value.length <= MAX_ADDRESS_LENGTH;
  if (!hasAddressLength) {
    return false;
  }
  return countBase58Bytes(value) === ADDRESS_BYTES;
}

function countBase58Bytes(text: string): number | null {
  const value = decodeBase58(text);
  if (value === null) {
    return null;
  }
  // Base58 encodes each leading zero byte as a leading "1".
  const leadingOnes = text.match(LEADING_ZERO_BYTES_PATTERN)?.[0] ?? "";
  return leadingOnes.length + countBytes(value);
}

function decodeBase58(text: string): bigint | null {
  let value = 0n;
  for (const char of text) {
    const digit = BASE58_ALPHABET.indexOf(char);
    if (digit === -1) {
      return null;
    }
    value = value * 58n + BigInt(digit);
  }
  return value;
}

function countBytes(value: bigint): number {
  if (value === 0n) {
    return 0;
  }
  const hexDigits = value.toString(16).length;
  return Math.ceil(hexDigits / 2);
}
