import { describe, it, expect } from 'vitest';
import * as PagerAPI from '../src/index';

describe('VRAM Pager API Exports', () => {
  it('exports all core engine and allocator classes', () => {
    expect(PagerAPI.PagerEngine).toBeDefined();
    expect(PagerAPI.VRAMAllocator).toBeDefined();
    expect(PagerAPI.RingBufferPool).toBeDefined();
    expect(PagerAPI.WebGPUContext).toBeDefined();
    expect(PagerAPI.WeightStreamer).toBeDefined();
  });

  it('instantiates VRAMAllocator with custom size', () => {
    const allocator = new PagerAPI.VRAMAllocator(1024 * 1024 * 64);
    expect(allocator.getAvailableMemory()).toBe(1024 * 1024 * 64);
  });
});
