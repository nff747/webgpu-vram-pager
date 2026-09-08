export interface RingBufferOptions {
  initialPoolSize?: number;
  maxMemoryBytes?: number;
}

export class RingBufferPool {
  private buffers: GPUBuffer[] = [];
  private inFlightFences: Map<number, Promise<void>> = new Map();
  private lastAccessTime: number[] = [];
  private head: number = 0;
  private poolSize: number;
  private maxMemoryBytes: number;

  constructor(
    private device: GPUDevice,
    poolSize: number,
    private bufferSize: number,
    options: RingBufferOptions = {}
  ) {
    this.poolSize = poolSize > 0 ? poolSize : 4;
    this.maxMemoryBytes = options.maxMemoryBytes || (1024 * 1024 * 1024); // 1GB default cap

    for (let i = 0; i < this.poolSize; i++) {
      this.allocateBuffer(i);
    }
  }

  private allocateBuffer(index: number): GPUBuffer {
    // Section 5.2 of W3C WebGPU specification prohibits combining STORAGE and MAP_WRITE.
    // Device compute storage buffers must use STORAGE | COPY_DST, while host mapped buffers use MAP_WRITE | COPY_SRC.
    const usage = (GPUBufferUsage.MAP_WRITE && (this.device as any).__isStagingPool)
      ? (GPUBufferUsage.MAP_WRITE | GPUBufferUsage.COPY_SRC)
      : (GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST);

    const buf = this.device.createBuffer({
      size: this.bufferSize,
      usage: usage,
      label: `AdaptiveRingBuffer_Slab_${index}`
    });
    this.buffers[index] = buf;
    this.lastAccessTime[index] = performance.now();
    return buf;
  }

  /**
   * Acquire next buffer with adaptive slab growth and LRU recycling
   */
  acquireForQueue(): { buffer: GPUBuffer, index: number } {
    let index = this.head;
    
    // Check if current slab is under active compute lock
    const currentUsageBytes = this.buffers.length * this.bufferSize;
    if (this.inFlightFences.has(index) && currentUsageBytes + this.bufferSize <= this.maxMemoryBytes) {
      // Amortized dynamic growth: spawn new slab
      index = this.buffers.length;
      this.allocateBuffer(index);
      this.poolSize = this.buffers.length;
    } else {
      this.head = (this.head + 1) % this.poolSize;
    }

    this.lastAccessTime[index] = performance.now();
    return { buffer: this.buffers[index], index };
  }

  async acquireMapped(): Promise<{ buffer: GPUBuffer, index: number, arrayBuffer: ArrayBuffer }> {
    const { buffer, index } = this.acquireForQueue();
    await buffer.mapAsync(GPUMapMode.WRITE);
    return { buffer, index, arrayBuffer: buffer.getMappedRange() };
  }

  registerComputeFence(index: number, fence: Promise<void>): void {
    this.inFlightFences.set(index, fence);
    fence.finally(() => {
      this.inFlightFences.delete(index);
    });
  }

  getBuffer(index: number): GPUBuffer {
    return this.buffers[index];
  }

  destroy(): void {
    for (const buffer of this.buffers) {
      buffer.destroy();
    }
    this.buffers = [];
    this.inFlightFences.clear();
  }
}
