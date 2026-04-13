import { describe, expect, it } from 'vitest';

import { estimateMintedShares, formatBpsToPercent } from '@/lib/vault-creation-formatters';

describe('vault creation share estimates', () => {
  it('computes minted shares from deposit and current share price', () => {
    expect(estimateMintedShares(2_000_000n, 1_000_000n, 1_000_000n)).toBe(2_000_000n);
    expect(estimateMintedShares(2_000_000n, 2_000_000n, 1_000_000n)).toBe(1_000_000n);
  });

  it('returns zero for invalid pricing inputs', () => {
    expect(estimateMintedShares(2_000_000n, 0n, 1_000_000n)).toBe(0n);
    expect(estimateMintedShares(2_000_000n, 1_000_000n, 0n)).toBe(0n);
  });

  it('formats basis points into percent strings', () => {
    expect(formatBpsToPercent(1000n)).toBe('10.00%');
    expect(formatBpsToPercent(25n)).toBe('0.25%');
  });
});
