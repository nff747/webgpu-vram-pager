import { VRAMAllocator } from '../VRAMAllocator';

export enum PressureLevel {
  NOMINAL = 'NOMINAL',       // < 75% memory utilized
  WARNING = 'WARNING',       // 75% - 89% memory utilized
  CRITICAL = 'CRITICAL',     // >= 90% memory utilized, eviction required
}

export interface MemorySnapshot {
  totalBytes: number;
  allocatedBytes: number;
  availableBytes: number;
  utilizationRatio: number;
  fragmentationRatio: number;
  pressure: PressureLevel;
}

export class HeadroomMonitor {
  private warningThreshold: number;
  private criticalThreshold: number;

  constructor(warningThreshold: number = 0.75, criticalThreshold: number = 0.90) {
    this.warningThreshold = warningThreshold;
    this.criticalThreshold = criticalThreshold;
  }

  evaluate(allocator: VRAMAllocator): MemorySnapshot {
    const total = allocator.getBufferSize();
    const allocated = allocator.getAllocatedMemory();
    const available = allocator.getAvailableMemory();
    const utilization = total > 0 ? allocated / total : 0;
    const fragmentation = allocator.getFragmentationRatio();

    let pressure = PressureLevel.NOMINAL;
    if (utilization >= this.criticalThreshold) {
      pressure = PressureLevel.CRITICAL;
    } else if (utilization >= this.warningThreshold) {
      pressure = PressureLevel.WARNING;
    }

    return {
      totalBytes: total,
      allocatedBytes: allocated,
      availableBytes: available,
      utilizationRatio: utilization,
      fragmentationRatio: fragmentation,
      pressure,
    };
  }

  /**
   * Estimates how many bytes must be evicted to restore memory pressure to NOMINAL.
   */
  estimateEvictionDebtBytes(allocator: VRAMAllocator, targetUtilization: number = 0.70): number {
    const total = allocator.getBufferSize();
    const allocated = allocator.getAllocatedMemory();
    const targetAllocated = total * targetUtilization;
    return Math.max(0, allocated - targetAllocated);
  }
}
