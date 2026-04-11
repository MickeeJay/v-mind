import { z } from 'zod';

export const clarityUintSchema = z.bigint().nonnegative();
export const clarityIntSchema = z.bigint();
export const clarityBooleanSchema = z.boolean();
export const clarityPrincipalSchema = z.string().min(1);

export const clarityOptionalSchema = <T extends z.ZodTypeAny>(inner: T) =>
  z.union([inner, z.null()]);

export const clarityListSchema = <T extends z.ZodTypeAny>(inner: T) => z.array(inner);

export const clarityOkResponseSchema = <T extends z.ZodTypeAny>(inner: T) =>
  z.object({
    type: z.literal('ok'),
    value: inner,
  });

export const clarityErrResponseSchema = <T extends z.ZodTypeAny>(inner: T) =>
  z.object({
    type: z.literal('err'),
    value: inner,
  });
