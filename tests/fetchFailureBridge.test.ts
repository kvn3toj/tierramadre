import { describe, it, expect, beforeEach } from 'vitest';
import {
  registerFetchFailureHandler,
  reportFetchFailure,
} from '../src/utils/fetchFailureBridge';

describe('fetchFailureBridge', () => {
  beforeEach(() => {
    registerFetchFailureHandler(null);
  });

  it('calls registered handler with message', () => {
    let seen: string | null = null;
    registerFetchFailureHandler((msg) => {
      seen = msg;
    });
    reportFetchFailure('network');
    expect(seen).toBe('network');
  });

  it('no-ops when handler cleared', () => {
    let calls = 0;
    registerFetchFailureHandler(() => {
      calls += 1;
    });
    registerFetchFailureHandler(null);
    reportFetchFailure('x');
    expect(calls).toBe(0);
  });
});
