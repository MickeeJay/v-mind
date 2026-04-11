import { z } from 'zod';

export const readOnlyCallResponseSchema = z.object({
  okay: z.boolean(),
  result: z.string().min(1),
  cause: z.string().optional(),
});

export type ReadOnlyCallResponse = z.infer<typeof readOnlyCallResponseSchema>;
