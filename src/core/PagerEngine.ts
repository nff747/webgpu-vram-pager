import { PagerOptions, PagedTensor, ChunkDescriptor } from '../types';
import { WebGPUContext } from './WebGPUContext';
import { WeightStreamer } from '../streaming/WeightStreamer';
import { RingBufferPool } from './RingBuffer';

export class PagerEngine {
  private context: WebGPUContext;
  private streamer: WeightStreamer | null = null;
  private ringPool: RingBufferPool | null = null;
  private safeBindingLimit: number = 0;

  constructor(private options: PagerOptions = {}) {
    this.context = new WebGPUContext();
  }

  async init(): Promise<void> {
    await this.context.init();
    
    const hardwareLimit = this.context.limits!.maxStorageBufferBindingSize;
    this.safeBindingLimit = this.options.maxBufferSize 
      ? Math.min(this.options.maxBufferSize, hardwareLimit)
      : Math.floor(hardwareLimit * 0.95);

    const poolSize = this.options.ringBufferSize || 4;
    this.ringPool = new RingBufferPool(this.context.device!, poolSize, this.safeBindingLimit);
    this.streamer = new WeightStreamer(this.context.device!, this.safeBindingLimit);
    
    if (this.options.debug) {
      console.log(`[VRAM Pager] Safe binding limit established at ${(this.safeBindingLimit / 1024 / 1024).toFixed(2)} MB`);
      console.log(`[VRAM Pager] Ring Buffer pool created with ${poolSize} buffers`);
    }
  }

  public allocatePagedTensor(id: string, totalBytes: number): PagedTensor {
    if (!this.context.device || !this.ringPool) throw new Error('Pager not initialized');
    
    const numChunks = Math.ceil(totalBytes / this.safeBindingLimit);
    const chunks: ChunkDescriptor[] = [];
    
    let remainingBytes = totalBytes;
    let currentOffset = 0;

    for (let i = 0; i < numChunks; i++) {
      const chunkSize = Math.min(remainingBytes, this.safeBindingLimit);
      
      chunks.push({
        id: `${id}_${i}`,
        byteOffset: currentOffset,
        byteLength: chunkSize,
        bufferIndex: -1 // Will be assigned dynamically from the ring buffer
      });

      remainingBytes -= chunkSize;
      currentOffset += chunkSize;
    }

    if (this.options.debug) {
      console.log(`[VRAM Pager] Tensor '${id}' (${(totalBytes / 1024 / 1024).toFixed(2)} MB) partitioned into ${numChunks} logical chunks.`);
    }

    return { id, totalBytes, chunks };
  }

  public getPhysicalBuffer(index: number): GPUBuffer {
    if (!this.ringPool) throw new Error('Pager not initialized');
    return this.ringPool.getBuffer(index);
  }

  /**
   * Asynchronously writes tensor data using mapAsync for large chunks to avoid GC spikes
   */
  public async writeTensorDataAsync(tensor: PagedTensor, data: ArrayBuffer): Promise<void> {
    if (!this.streamer || !this.ringPool) throw new Error('Not initialized');
    
    let sourceOffset = 0;
    
    for (const chunk of tensor.chunks) {
      // Acquire mapped buffer from Ring Pool
      const { buffer, index, arrayBuffer } = await this.ringPool.acquireMapped();
      chunk.bufferIndex = index;
      
      // Fast JS-side copy without allocation to prevent GC spikes
      new Uint8Array(arrayBuffer).set(new Uint8Array(data, sourceOffset, chunk.byteLength));
      
      buffer.unmap();
      
      sourceOffset += chunk.byteLength;
    }
  }

  /**
   * Fast queue-based write
   */
  public writeTensorDataQueue(tensor: PagedTensor, data: ArrayBuffer): void {
    if (!this.streamer || !this.ringPool) throw new Error('Not initialized');
    
    let sourceOffset = 0;
    
    for (const chunk of tensor.chunks) {
      const { buffer, index } = this.ringPool.acquireForQueue();
      chunk.bufferIndex = index;
      
      // Pass the slice directly through the queue API offsets to avoid slice()
      this.context.device!.queue.writeBuffer(
        buffer, 
        0, 
        data, 
        sourceOffset, 
        chunk.byteLength
      );
      
      sourceOffset += chunk.byteLength;
    }
  }
  
  // Keep original for backwards compatibility
  public writeTensorData(tensor: PagedTensor, data: ArrayBuffer): void {
      this.writeTensorDataQueue(tensor, data);
  }

  public destroy(): void {
    if (this.ringPool) {
      this.ringPool.destroy();
    }
  }
}
