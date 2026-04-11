import { z } from 'zod';

export const coreNodeInfoSchema = z.object({
  stacks_tip_height: z.number().int().nonnegative(),
  stacks_tip: z.string().optional(),
  burn_block_height: z.number().int().nonnegative().optional(),
  stable_pox_consensus: z.string().optional(),
  unstable_pox_consensus: z.string().optional(),
  server_version: z.string().optional(),
  network_id: z.number().int().optional(),
  parent_network_id: z.number().int().optional(),
});

export const blockEventSchema = z.object({
  previousHeight: z.number().int().nonnegative(),
  currentHeight: z.number().int().nonnegative(),
  blockHash: z.string().optional(),
  observedAt: z.date(),
});

export type CoreNodeInfo = z.infer<typeof coreNodeInfoSchema>;
export type BlockEvent = z.infer<typeof blockEventSchema>;
