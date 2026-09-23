import { describe, it, expect } from 'vitest';
import { VRAMAllocator } from '../src/VRAMAllocator';

describe('VRAMAllocator', () => {
  it('should allocate memory correctly', () => {
    const allocator = new VRAMAllocator(1024);
    const alloc1 = allocator.allocate(256);
    expect(alloc1.offset).toBe(0);
    expect(alloc1.size).toBe(256);

    const alloc2 = allocator.allocate(256);
    expect(alloc2.offset).toBe(256);
    expect(alloc2.size).toBe(256);
  });

  it('should free memory correctly', () => {
    const allocator = new VRAMAllocator(1024);
    const alloc1 = allocator.allocate(256);
    const alloc2 = allocator.allocate(256);
    
    allocator.free(alloc1.id);
    
    // The next allocation should reuse the freed space
    const alloc3 = allocator.allocate(128);
    expect(alloc3.offset).toBe(0);
  });

  it('should defragment memory correctly', () => {
    const allocator = new VRAMAllocator(1024);
    const alloc1 = allocator.allocate(256);
    const alloc2 = allocator.allocate(256);
    const alloc3 = allocator.allocate(256);
    
    allocator.free(alloc2.id);
    
    // Memory map: [alloc1 (0-256)] [FREE (256-512)] [alloc3 (512-768)]
    
    allocator.defragment();
    
    // Memory map should now be: [alloc1 (0-256)] [alloc3 (256-512)]
    expect(alloc3.offset).toBe(256);
  });

  it('should handle eviction and restoration', () => {
    const allocator = new VRAMAllocator(1024);
    const alloc1 = allocator.allocate(512);
    const alloc2 = allocator.allocate(512);
    
    // Buffer is full. Next allocation would fail.
    expect(() => allocator.allocate(256)).toThrow("Out of memory");
    
    allocator.evict(alloc1.id);
    expect(alloc1.isEvicted).toBe(true);
    
    const alloc3 = allocator.allocate(256);
    expect(alloc3.offset).toBe(0); // Takes place of evicted alloc1
    
    // To restore alloc1, we might need to evict others or it might fail if full
    expect(() => allocator.restore(alloc1.id)).toThrow("Out of memory during restore");
    
    allocator.evict(alloc2.id);
    allocator.restore(alloc1.id);
    expect(alloc1.isEvicted).toBe(false);
  });
});
