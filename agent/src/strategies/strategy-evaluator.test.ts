import { describe, expect, it } from 'vitest';
import { blocksSinceLastExecution, toError, toExecute, toWait } from './strategy-evaluator';

describe('strategy-evaluator helpers', () => {
  it('returns null blocks elapsed when no prior execution exists', () => {
    expect(blocksSinceLastExecution(100, null)).toBeNull();
    expect(blocksSinceLastExecution(100, undefined)).toBeNull();
  });

  it('clamps elapsed blocks to non-negative value', () => {
    expect(blocksSinceLastExecution(100, 120)).toBe(0);
  });

  it('creates execute, wait, and error result objects', () => {
    expect(toExecute('ok')).toEqual({ decision: 'execute', reason: 'ok' });
    expect(toWait('later')).toEqual({ decision: 'wait', reason: 'later' });
    expect(toError('bad', ['x'])).toEqual({ decision: 'error', reason: 'bad', errors: ['x'] });
  });
});
