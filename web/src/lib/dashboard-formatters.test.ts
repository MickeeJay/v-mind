import { describe, expect, it } from 'vitest';

import { formatBtc, formatLastExecution, formatPercent, formatUsd } from '@/lib/dashboard-formatters';

describe('dashboard formatters', () => {
  it('formats USD values', () => {
    expect(formatUsd(125000)).toBe('$125,000');
  });

  it('formats BTC values', () => {
    expect(formatBtc(0.123456789)).toBe('0.123457 BTC');
  });

  it('formats percent values', () => {
    expect(formatPercent(12.3456)).toBe('12.35%');
  });

  it('formats last execution safely', () => {
    expect(formatLastExecution(null)).toBe('Not executed yet');
    expect(formatLastExecution('not-a-date')).toBe('Unavailable');
  });
});
