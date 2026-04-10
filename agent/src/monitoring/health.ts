export interface HealthSnapshot {
  status: 'ok' | 'degraded' | 'down';
  details: Record<string, unknown>;
}

export interface HealthCheck {
  check(): Promise<HealthSnapshot>;
}