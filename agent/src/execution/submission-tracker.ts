export interface SubmissionTracker {
  track<T>(work: Promise<T>): Promise<T>;
  drain(): Promise<void>;
}