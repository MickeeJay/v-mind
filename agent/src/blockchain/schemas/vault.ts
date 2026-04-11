import { z } from 'zod';
import { clarityBooleanSchema, clarityPrincipalSchema, clarityUintSchema } from './clarity';

export const vaultStatusSchema = z.union([
  z.literal(1n),
  z.literal(2n),
  z.literal(3n),
  z.literal(4n),
]);

export const vaultEntrySchema = z.object({
  'vault-owner': clarityPrincipalSchema,
  'asset-contract': clarityPrincipalSchema,
  'total-assets': clarityUintSchema,
  'strategy-id': clarityUintSchema,
  'created-at-block': clarityUintSchema,
  'last-execution-block': clarityUintSchema,
  'vault-status': vaultStatusSchema,
  'cumulative-fees-paid': clarityUintSchema,
  'execution-locked': clarityBooleanSchema,
});

export const vaultMetadataSchema = z.object({
  owner: clarityPrincipalSchema,
  assetContract: clarityPrincipalSchema,
  createdAtBlock: clarityUintSchema,
});

export const vaultStateSchema = z.object({
  vaultId: clarityUintSchema,
  metadata: vaultMetadataSchema,
  currentBalance: clarityUintSchema,
  assignedStrategy: clarityUintSchema,
  lastExecutionBlock: clarityUintSchema,
  status: vaultStatusSchema,
  executionLocked: clarityBooleanSchema,
});

export type VaultEntry = z.infer<typeof vaultEntrySchema>;
export type VaultState = z.infer<typeof vaultStateSchema>;
