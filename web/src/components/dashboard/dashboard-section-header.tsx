"use client";

interface DashboardSectionHeaderProps {
  eyebrow: string;
  title: string;
  subtitle: string;
}

export function DashboardSectionHeader({ eyebrow, title, subtitle }: DashboardSectionHeaderProps): JSX.Element {
  return (
    <div>
      <p className="text-xs uppercase tracking-[0.16em] text-bitcoin-300">{eyebrow}</p>
      <h1 className="mt-1 font-[var(--font-display)] text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1>
      <p className="mt-1 break-all text-xs text-muted-foreground sm:text-sm">{subtitle}</p>
    </div>
  );
}
