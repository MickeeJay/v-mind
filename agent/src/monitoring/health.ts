export interface HealthSnapshot {
  status: 'ok' | 'degraded' | 'down';
  details: Record<string, unknown>;
}

export interface HealthCheck {
  check(): Promise<HealthSnapshot>;
}

export class CompositeHealthCheck implements HealthCheck {
  constructor(
    private readonly checks: Record<string, () => Promise<boolean>>
  ) {}

  async check(): Promise<HealthSnapshot> {
    const entries = await Promise.all(
      Object.entries(this.checks).map(async ([name, check]) => {
        try {
          return [name, await check()] as const;
        } catch {
          return [name, false] as const;
        }
      })
    );

    const details = Object.fromEntries(entries);
    const allHealthy = Object.values(details).every((value) => value === true);
    return {
      status: allHealthy ? 'ok' : 'degraded',
      details,
    };
  }
}