import { Allocation, VRAMBuffer } from './types';

export class VRAMAllocator {
  private buffer: VRAMBuffer;
  private nextId = 0;

  constructor(size: number) {
    this.buffer = {
      size,
      allocations: []
    };
  }

  getBufferSize(): number {
    return this.buffer.size;
  }

  allocate(size: number): Allocation {
    if (size > this.buffer.size) {
      throw new Error("Allocation size exceeds total buffer size");
    }

    // Sort by offset
    this.buffer.allocations.sort((a, b) => a.offset - b.offset);

    let currentOffset = 0;
    for (const alloc of this.buffer.allocations) {
      if (!alloc.isEvicted && currentOffset + size <= alloc.offset) {
        break; // found space
      }
      if (!alloc.isEvicted) {
        currentOffset = Math.max(currentOffset, alloc.offset + alloc.size);
      }
    }

    if (currentOffset + size > this.buffer.size) {
      throw new Error("Out of memory");
    }

    const allocation: Allocation = {
      id: String(this.nextId++),
      offset: currentOffset,
      size,
      isEvicted: false
    };

    this.buffer.allocations.push(allocation);
    return allocation;
  }

  free(allocationId: string): void {
    const index = this.buffer.allocations.findIndex(a => a.id === allocationId);
    if (index === -1) {
      throw new Error(`Allocation ${allocationId} not found`);
    }
    this.buffer.allocations.splice(index, 1);
  }

  defragment(): void {
    this.buffer.allocations.sort((a, b) => a.offset - b.offset);
    let currentOffset = 0;
    for (const alloc of this.buffer.allocations) {
      if (!alloc.isEvicted) {
        alloc.offset = currentOffset;
        currentOffset += alloc.size;
      }
    }
  }

  evict(allocationId: string): void {
    const alloc = this.buffer.allocations.find(a => a.id === allocationId);
    if (!alloc) {
      throw new Error(`Allocation ${allocationId} not found`);
    }
    if (alloc.isEvicted) {
      throw new Error(`Allocation ${allocationId} is already evicted`);
    }
    alloc.isEvicted = true;
  }
}
