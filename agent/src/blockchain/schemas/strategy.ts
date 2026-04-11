import { z } from 'zod';
import { clarityBooleanSchema, clarityPrincipalSchema, clarityUintSchema } from './clarity';

export const strategyEntrySchema = z.object({
  'strategy-name': z.string().min(1),
  'strategy-type': clarityUintSchema,
  'target-protocol': clarityPrincipalSchema,
  'risk-tier': clarityUintSchema,
  'authorized-executor': clarityPrincipalSchema,
  active: clarityBooleanSchema,
  'created-at-block': clarityUintSchema,
  'last-updated-block': clarityUintSchema,
});

export const strategyViewSchema = z.object({
  name: z.string().min(1),
  type: clarityUintSchema,
  'target-protocol-principal': clarityPrincipalSchema,
  'risk-tier': clarityUintSchema,
  'is-active': clarityBooleanSchema,
  'created-at-block': clarityUintSchema,
  'updated-at-block': clarityUintSchema,
});

export const strategyConfigurationSchema = z.object({
  strategyId: clarityUintSchema,
  active: clarityBooleanSchema,
  parameters: z.object({
    name: z.string().min(1),
    strategyType: clarityUintSchema,
    targetProtocol: clarityPrincipalSchema,
    riskTier: clarityUintSchema,
    authorizedExecutor: clarityPrincipalSchema,
    createdAtBlock: clarityUintSchema,
    updatedAtBlock: clarityUintSchema,
  }),
});

export type StrategyEntry = z.infer<typeof strategyEntrySchema>;
export type StrategyConfiguration = z.infer<typeof strategyConfigurationSchema>;
