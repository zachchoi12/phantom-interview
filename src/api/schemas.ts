import { z } from "zod";

const integerStringSchema = z.string().regex(/^-?\d+$/);

// zod's .int() only accepts safe integers, so a JSON number that already lost precision fails loudly instead of parsing.
export const baseUnitsSchema = z
  .union([integerStringSchema, z.number().int()])
  .transform((value) => BigInt(value));
