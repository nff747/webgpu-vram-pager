import { describe, it, expect } from 'vitest';
import { LRUEvictionPolicy } from '../src/core/LRUEvictionPolicy';

describe('LRUEvictionPolicy', () => {
  it('selects oldest accessed allocations to satisfy reclamation target', () => {
    const policy = new LRUEvictionPolicy();

    policy.track({ id: 'block-1', offset: 0, size: 200, isEvicted: false });
    policy.track({ id: 'block-2', offset: 200, size: 300, isEvicted: false });
    policy.track({ id: 'block-3', offset: 500, size: 400, isEvicted: false });

    // Touch block-1 so it becomes newer than block-2 and block-3
    policy.touch('block-1');

    // Want to reclaim 300 bytes -> oldest is block-2 (size 300)
    const evicted = new Set<string>();
    const candidates = policy.selectCandidates(300, evicted);
    expect(candidates).toContain('block-2');

    // Want to reclaim 600 bytes -> block-2 (300) and block-3 (400)
    const candidatesLarge = policy.selectCandidates(600, evicted);
    expect(candidatesLarge).toEqual(['block-2', 'block-3']);
  });
});
