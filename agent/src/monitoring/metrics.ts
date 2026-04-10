export interface MetricsRecorder {
  increment(metricName: string, value?: number): void;
  gauge(metricName: string, value: number): void;
}