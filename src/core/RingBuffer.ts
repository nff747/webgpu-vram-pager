export interface RingBufferOptions {
  initialPoolSize?: number;
  maxMemoryBytes?: number;
}

export class RingBufferPool {
  private buffers: GPUBuffer[] = [];
  private stagingBuffers: Map<number, GPUBuffer> = new Map();
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
    const buf = this.device.createBuffer({
      size: this.bufferSize,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
      label: `AdaptiveRingBuffer_Slab_${index}`
    });
    this.buffers[index] = buf;
    this.lastAccessTime[index] = performance.now();
    return buf;
  }

  acquireForQueue(): { buffer: GPUBuffer, index: number } {
    let index = this.head;
    const currentUsageBytes = this.buffers.length * this.bufferSize;
    if (this.inFlightFences.has(index) && currentUsageBytes + this.bufferSize <= this.maxMemoryBytes) {
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
    
    // Check if buffer directly supports mapAsync (e.g. test mock environment)
    if (typeof buffer.mapAsync === 'function') {
      try {
        await buffer.mapAsync(GPUMapMode.WRITE);
        return { buffer, index, arrayBuffer: buffer.getMappedRange() };
      } catch {
        // Spec compliant fallback to staging buffer
      }
    }

    let staging = this.stagingBuffers.get(index);
    if (!staging) {
      staging = this.device.createBuffer({
        size: this.bufferSize,
        usage: GPUBufferUsage.MAP_WRITE | GPUBufferUsage.COPY_SRC,
        label: `StagingBuffer_${index}`
      });
      this.stagingBuffers.set(index, staging);
    }

    await staging.mapAsync(GPUMapMode.WRITE);
    return { buffer: staging, index, arrayBuffer: staging.getMappedRange() };
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
    for (const buf of this.buffers) {
      buf.destroy();
    }
    for (const staging of this.stagingBuffers.values()) {
      staging.destroy();
    }
    this.buffers = [];
    this.stagingBuffers.clear();
  }
}
