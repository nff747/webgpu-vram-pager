import { Allocation } from '../types';

export interface EvictionRecord {
  allocationId: string;
  lastAccessTime: number;
  sequence: number;
  accessCount: number;
  size: number;
}

export class LRUEvictionPolicy {
  private records: Map<string, EvictionRecord> = new Map();
  private sequenceCounter: number = 0;

  track(allocation: Allocation): void {
    this.records.set(allocation.id, {
      allocationId: allocation.id,
      lastAccessTime: Date.now(),
      sequence: ++this.sequenceCounter,
      accessCount: 1,
      size: allocation.size,
    });
  }

  touch(allocationId: string): void {
    const record = this.records.get(allocationId);
    if (record) {
      record.lastAccessTime = Date.now();
      record.sequence = ++this.sequenceCounter;
      record.accessCount++;
    }
  }

  untrack(allocationId: string): void {
    this.records.delete(allocationId);
  }

  /**
   * Selects candidate allocations to evict until targetBytes are reclaimed.
   * Evicts least-recently-used (LRU) records first.
   */
  selectCandidates(targetBytes: number, currentlyEvictedIds: Set<string>): string[] {
    const activeRecords = Array.from(this.records.values())
      .filter(r => !currentlyEvictedIds.has(r.allocationId))
      .sort((a, b) => a.sequence - b.sequence);

    const candidates: string[] = [];
    let reclaimed = 0;

    for (const record of activeRecords) {
      candidates.push(record.allocationId);
      reclaimed += record.size;
      if (reclaimed >= targetBytes) {
        break;
      }
    }

    return candidates;
  }
}
