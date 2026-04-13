export function formatUsd(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: value > 1000 ? 0 : 2,
  }).format(value);
}

export function formatBtc(value: number): string {
  return `${value.toFixed(6)} BTC`;
}

export function formatPercent(value: number): string {
  return `${value.toFixed(2)}%`;
}

export function formatLastExecution(value: string | null): string {
  if (!value) {
    return 'Not executed yet';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'Unavailable';
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}
