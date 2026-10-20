import { describe, it, expect } from 'vitest';
import {
  PagerError,
  OutOfVRAMError,
  UninitializedPagerError,
  BindingSizeExceededError,
} from '../src/errors';

describe('PagerError hierarchy', () => {
  it('instantiates base PagerError correctly', () => {
    const err = new PagerError('Base failure');
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(PagerError);
    expect(err.name).toBe('PagerError');
    expect(err.message).toBe('Base failure');
  });

  it('instantiates OutOfVRAMError with requested and available metrics', () => {
    const err = new OutOfVRAMError(1024 * 1024 * 128, 1024 * 1024 * 64);
    expect(err).toBeInstanceOf(PagerError);
    expect(err.name).toBe('OutOfVRAMError');
    expect(err.requestedBytes).toBe(134217728);
    expect(err.availableBytes).toBe(67108864);
    expect(err.message).toContain('134217728 bytes');
  });

  it('instantiates UninitializedPagerError with standard guidance', () => {
    const err = new UninitializedPagerError();
    expect(err).toBeInstanceOf(PagerError);
    expect(err.name).toBe('UninitializedPagerError');
    expect(err.message).toContain('Call init() before allocating');
  });

  it('instantiates BindingSizeExceededError with limits', () => {
    const err = new BindingSizeExceededError(256 * 1024 * 1024, 128 * 1024 * 1024);
    expect(err).toBeInstanceOf(PagerError);
    expect(err.name).toBe('BindingSizeExceededError');
    expect(err.size).toBe(268435456);
    expect(err.limit).toBe(134217728);
    expect(err.message).toContain('exceeds negotiated hardware maxStorageBufferBindingSize');
  });
});
