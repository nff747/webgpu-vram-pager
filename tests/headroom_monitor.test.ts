import { describe, it, expect } from 'vitest';
import { VRAMAllocator } from '../src/VRAMAllocator';
import { HeadroomMonitor, PressureLevel } from '../src/core/HeadroomMonitor';

describe('HeadroomMonitor', () => {
  it('evaluates memory pressure levels across allocation lifecycle', () => {
    const allocator = new VRAMAllocator(1000);
    const monitor = new HeadroomMonitor(0.75, 0.90);

    // Initial state: 0% used -> NOMINAL
    let snap = monitor.evaluate(allocator);
    expect(snap.pressure).toBe(PressureLevel.NOMINAL);
    expect(snap.utilizationRatio).toBe(0);

    // Allocate 760 bytes -> 76% used -> WARNING
    const a1 = allocator.allocate(760, 1);
    snap = monitor.evaluate(allocator);
    expect(snap.pressure).toBe(PressureLevel.WARNING);
    expect(snap.utilizationRatio).toBeCloseTo(0.76, 2);

    // Allocate another 150 bytes -> 910 bytes used -> CRITICAL
    const a2 = allocator.allocate(150, 1);
    snap = monitor.evaluate(allocator);
    expect(snap.pressure).toBe(PressureLevel.CRITICAL);
    expect(snap.utilizationRatio).toBeCloseTo(0.91, 2);

    // Eviction debt to return to 70% (700 bytes)
    const debt = monitor.estimateEvictionDebtBytes(allocator, 0.70);
    expect(debt).toBe(910 - 700);

    // Free a1 -> 150 bytes used -> NOMINAL
    allocator.free(a1.id);
    snap = monitor.evaluate(allocator);
    expect(snap.pressure).toBe(PressureLevel.NOMINAL);
  });
});
