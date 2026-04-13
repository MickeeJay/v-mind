const MICROSTX_SCALE = 1_000_000n;

function formatBigIntWithCommas(value: bigint): string {
  const raw = value.toString();
  return raw.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

export function formatMicrostx(value: bigint, maximumFractionDigits = 6): string {
  const negative = value < 0n;
  const absolute = negative ? -value : value;
  const whole = absolute / MICROSTX_SCALE;
  const fraction = absolute % MICROSTX_SCALE;

  let fractionText = fraction.toString().padStart(6, '0');
  if (maximumFractionDigits < 6) {
    fractionText = fractionText.slice(0, Math.max(0, maximumFractionDigits));
  }
  fractionText = fractionText.replace(/0+$/, '');

  const wholeText = formatBigIntWithCommas(whole);
  const prefix = negative ? '-' : '';

  if (!fractionText) {
    return `${prefix}${wholeText}`;
  }

  return `${prefix}${wholeText}.${fractionText}`;
}

export function formatBpsToPercent(value: bigint): string {
  const percent = Number(value) / 100;
  return `${percent.toFixed(2)}%`;
}

export function parseMicrostxInput(input: string): bigint | null {
  const normalized = input.trim();

  if (!normalized) {
    return null;
  }

  if (!/^\d+(\.\d{0,6})?$/.test(normalized)) {
    return null;
  }

  const [wholePart, fractionPart = ''] = normalized.split('.');
  const whole = BigInt(wholePart || '0');
  const fraction = BigInt(fractionPart.padEnd(6, '0') || '0');

  return whole * MICROSTX_SCALE + fraction;
}

export function estimateMintedShares(depositMicrostx: bigint, pricePerShareScaled: bigint, shareScale: bigint): bigint {
  if (pricePerShareScaled <= 0n || shareScale <= 0n) {
    return 0n;
  }

  return (depositMicrostx * shareScale) / pricePerShareScaled;
}

export const MICROSTX_PRECISION = MICROSTX_SCALE;
