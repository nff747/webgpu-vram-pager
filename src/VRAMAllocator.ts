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
}
