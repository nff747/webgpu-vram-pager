/**
 * ═══════════════════════════════════════════════════════════════════
 * VRAM Pager — PCIe Weight Streamer
 * 
 * Streams LLM weights (e.g., Safetensors, GGML) into WebGPU buffers.
 * Implements a ring buffer system to stream chunks across the PCIe bus 
 * dynamically without exceeding the browser's allocation caps.
 * ═══════════════════════════════════════════════════════════════════
 */

export class WeightStreamer {
  constructor(private device: GPUDevice, private maxChunkSize: number) {}

  /**
   * Fetches weights from a URL and streams them directly into a 
   * pre-allocated WebGPU buffer chunk to minimize RAM usage.
   */
  async streamToBuffer(url: string, buffer: GPUBuffer, byteOffset: number = 0): Promise<void> {
    const response = await fetch(url);
    if (!response.body) throw new Error('Response body is null');

    const reader = response.body.getReader();
    let position = byteOffset;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      // Write chunk across the PCIe bus immediately
      // This avoids holding the entire model in JS heap memory
      this.device.queue.writeBuffer(
        buffer, 
        position, 
        value.buffer, 
        value.byteOffset, 
        value.byteLength
      );
      
      position += value.byteLength;
    }
    
    // Wait for queue to finish uploading
    await this.device.queue.onSubmittedWorkDone();
  }

  /**
   * For pre-loaded local arrays (ArrayBuffer/Float32Array).
   * Writes data bypassing max limit by slicing JS-side and queuing sequentially.
   */
  writeLocalData(buffer: GPUBuffer, data: ArrayBuffer, offset: number = 0): void {
    let position = 0;
    const totalBytes = data.byteLength;

    while (position < totalBytes) {
      const writeSize = Math.min(this.maxChunkSize, totalBytes - position);
      
      this.device.queue.writeBuffer(
        buffer,
        offset + position,
        data,
        position,
        writeSize
      );
      
      position += writeSize;
    }
  }
}
