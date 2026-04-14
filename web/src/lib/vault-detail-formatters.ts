export function formatMicrostx(value: bigint, decimals = 6): string {
  const scale = 10n ** BigInt(decimals);
  const integer = value / scale;
  const fraction = value % scale;

  if (decimals === 0) {
    return integer.toString();
  }

  const fractionText = fraction.toString().padStart(decimals, '0').replace(/0+$/, '');
  return fractionText ? `${integer.toString()}.${fractionText}` : integer.toString();
}

export function formatBasisPoints(value: bigint): string {
  return `${(Number(value) / 100).toFixed(2)}%`;
}

export function formatPercent(value: number): string {
  return `${value.toFixed(2)}%`;
}

export function formatBlockHeight(value: bigint | null): string {
  return value ? `#${value.toString()}` : 'Unavailable';
}

export function formatVaultDate(value: string | null): string {
  if (!value) {
    return 'Unavailable';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'Unavailable';
  }

  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

export function formatDeltaPercent(left: bigint, right: bigint): number {
  if (right === 0n) {
    return 0;
  }

  const delta = Number(left - right);
  const base = Number(right);
  return (delta / base) * 100;
}
