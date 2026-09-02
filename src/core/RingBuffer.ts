import { ChunkDescriptor } from '../types';

export class RingBufferPool {
  private buffers: GPUBuffer[] = [];
  private head: number = 0;
  private poolSize: number;

  constructor(
    private device: GPUDevice,
    poolSize: number,
    private bufferSize: number
  ) {
    this.poolSize = poolSize > 0 ? poolSize : 4;
    for (let i = 0; i < this.poolSize; i++) {
      this.buffers.push(this.device.createBuffer({
        size: this.bufferSize,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_WRITE,
        label: `RingBuffer_Chunk_${i}`
      }));
    }
  }

  /**
   * Asynchronously acquire the next buffer in the ring.
   * If mapAsync is needed, it can be mapped here.
   */
  async acquireMapped(): Promise<{ buffer: GPUBuffer, index: number, arrayBuffer: ArrayBuffer }> {
    const index = this.head;
    const buffer = this.buffers[index];
    this.head = (this.head + 1) % this.poolSize;
    
    await buffer.mapAsync(GPUMapMode.WRITE);
    return { buffer, index, arrayBuffer: buffer.getMappedRange() };
  }

  /**
   * Acquire buffer for queue.writeBuffer (no mapping needed).
   */
  acquireForQueue(): { buffer: GPUBuffer, index: number } {
    const index = this.head;
    const buffer = this.buffers[index];
    this.head = (this.head + 1) % this.poolSize;
    return { buffer, index };
  }

  getBuffer(index: number): GPUBuffer {
    return this.buffers[index];
  }

  destroy(): void {
    for (const buffer of this.buffers) {
      buffer.destroy();
    }
    this.buffers = [];
  }
}
