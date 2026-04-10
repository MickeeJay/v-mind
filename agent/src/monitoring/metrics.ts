export interface MetricsRecorder {
  increment(metricName: string, value?: number): void;
  gauge(metricName: string, value: number): void;
}

export class InMemoryMetricsRecorder implements MetricsRecorder {
  private readonly counters = new Map<string, number>();
  private readonly gauges = new Map<string, number>();

  increment(metricName: string, value = 1): void {
    const current = this.counters.get(metricName) ?? 0;
    this.counters.set(metricName, current + value);
  }

  gauge(metricName: string, value: number): void {
    this.gauges.set(metricName, value);
  }

  snapshot(): { counters: Record<string, number>; gauges: Record<string, number> } {
    return {
      counters: Object.fromEntries(this.counters.entries()),
      gauges: Object.fromEntries(this.gauges.entries()),
    };
  }
}