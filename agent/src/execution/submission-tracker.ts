export interface SubmissionTracker {
  track<T>(work: Promise<T>): Promise<T>;
  drain(): Promise<void>;
}

export class InFlightSubmissionTracker implements SubmissionTracker {
  private readonly inFlight = new Set<Promise<unknown>>();

  async track<T>(work: Promise<T>): Promise<T> {
    const tracked = work.finally(() => {
      this.inFlight.delete(tracked);
    });

    this.inFlight.add(tracked);
    return tracked;
  }

  async drain(): Promise<void> {
    if (this.inFlight.size === 0) {
      return;
    }

    await Promise.allSettled(Array.from(this.inFlight));
  }
}