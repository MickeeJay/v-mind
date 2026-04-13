import { describe, expect, it } from 'vitest';

import { formatMicrostx, parseMicrostxInput } from '@/lib/vault-creation-formatters';

describe('vault creation formatter parsing', () => {
  it('parses whole and decimal STX amounts into microstx', () => {
    expect(parseMicrostxInput('1')).toBe(1_000_000n);
    expect(parseMicrostxInput('1.5')).toBe(1_500_000n);
    expect(parseMicrostxInput('0.000001')).toBe(1n);
  });

  it('rejects malformed values', () => {
    expect(parseMicrostxInput('')).toBeNull();
    expect(parseMicrostxInput('abc')).toBeNull();
    expect(parseMicrostxInput('1.0000001')).toBeNull();
  });

  it('formats microstx as human readable decimal values', () => {
    expect(formatMicrostx(1_234_567n)).toBe('1.234567');
    expect(formatMicrostx(123_000_000n)).toBe('123');
    expect(formatMicrostx(12_345_678_900n)).toBe('12,345.6789');
  });
});
