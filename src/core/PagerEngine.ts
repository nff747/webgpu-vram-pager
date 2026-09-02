/**
 * ═══════════════════════════════════════════════════════════════════
 * VRAM Pager — Core Paging Engine
 * 
 * Orchestrates the chunking of massive LLM tensors (e.g., 8B weights).
 * Virtualizes WebGPU memory by creating a pool of GPU buffers that 
 * respect the browser's maxStorageBufferBindingSize limit.
 * ═══════════════════════════════════════════════════════════════════
 */

import { PagerOptions, PagedTensor, ChunkDescriptor } from '../types';
import { WebGPUContext } from './WebGPUContext';
import { WeightStreamer } from '../streaming/WeightStreamer';

export class PagerEngine {
  private context: WebGPUContext;
  private streamer: WeightStreamer | null = null;
  
  // The physical GPU buffers allocated on the device
  private hardwareBuffers: GPUBuffer[] = [];
  
  // The calculated safe limit for this specific browser/OS
  private safeBindingLimit: number = 0;

  constructor(private options: PagerOptions = {}) {
    this.context = new WebGPUContext();
  }

  /**
   * Initializes the engine, probes limits, and allocates the ring pool.
   */
  async init(): Promise<void> {
    await this.context.init();
    
    // Use override if provided, otherwise use browser limits minus a 5% safety margin
    const hardwareLimit = this.context.limits!.maxStorageBufferBindingSize;
    this.safeBindingLimit = this.options.maxBufferSize 
      ? Math.min(this.options.maxBufferSize, hardwareLimit)
      : Math.floor(hardwareLimit * 0.95);

    this.streamer = new WeightStreamer(this.context.device!, this.safeBindingLimit);
    
    if (this.options.debug) {
      console.log(\`[VRAM Pager] Safe binding limit established at \${(this.safeBindingLimit / 1024 / 1024).toFixed(2)} MB\`);
    }
  }

  /**
   * Virtualizes a massive tensor. Returns a mapping descriptor that
   * instructions the compute pipeline how to iterate through the chunks.
   */
  public allocatePagedTensor(id: string, totalBytes: number): PagedTensor {
    if (!this.context.device) throw new Error('Pager not initialized');
    
    // Calculate required chunks based on binding limits
    const numChunks = Math.ceil(totalBytes / this.safeBindingLimit);
    const chunks: ChunkDescriptor[] = [];
    
    let remainingBytes = totalBytes;
    let currentOffset = 0;

    for (let i = 0; i < numChunks; i++) {
      const chunkSize = Math.min(remainingBytes, this.safeBindingLimit);
      
      // Allocate the physical GPU buffer for this chunk
      const buffer = this.context.device.createBuffer({
        size: chunkSize,
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
        // Align label for WebGPU debugging
        label: \`Tensor_\${id}_Chunk_\${i}\`
      });
      
      this.hardwareBuffers.push(buffer);
      const bufferIndex = this.hardwareBuffers.length - 1;

      chunks.push({
        id: \`\${id}_\${i}\`,
        byteOffset: currentOffset,
        byteLength: chunkSize,
        bufferIndex
      });

      remainingBytes -= chunkSize;
      currentOffset += chunkSize;
    }

    if (this.options.debug) {
      console.log(\`[VRAM Pager] Tensor '\${id}' (\${(totalBytes / 1024 / 1024).toFixed(2)} MB) partitioned into \${numChunks} physical chunks.\`);
    }

    return { id, totalBytes, chunks };
  }

  /**
   * Access underlying GPU buffer by index.
   */
  public getPhysicalBuffer(index: number): GPUBuffer {
    return this.hardwareBuffers[index];
  }

  /**
   * Upload data directly to a paged tensor.
   */
  public writeTensorData(tensor: PagedTensor, data: ArrayBuffer): void {
    if (!this.streamer) throw new Error('Streamer not initialized');
    
    let sourceOffset = 0;
    
    // Route data to the correct physical chunks
    for (const chunk of tensor.chunks) {
      const chunkData = data.slice(sourceOffset, sourceOffset + chunk.byteLength);
      const buffer = this.getPhysicalBuffer(chunk.bufferIndex);
      
      this.streamer.writeLocalData(buffer, chunkData, 0);
      sourceOffset += chunk.byteLength;
    }
  }

  /**
   * Releases all physical memory back to the GPU driver.
   */
  public destroy(): void {
    for (const buffer of this.hardwareBuffers) {
      buffer.destroy();
    }
    this.hardwareBuffers = [];
  }
}
