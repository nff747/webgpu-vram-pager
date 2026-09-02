export interface PagerOptions {
  /** Override the browser's reported max storage buffer binding size (in bytes) */
  maxBufferSize?: number;
  /** Number of buffers to keep in the ring pool for PCIe streaming */
  ringBufferSize?: number;
  /** Whether to log diagnostic memory information */
  debug?: boolean;
}

export interface ChunkDescriptor {
  id: string;
  byteOffset: number;
  byteLength: number;
  bufferIndex: number;
}

export interface PagedTensor {
  id: string;
  totalBytes: number;
  chunks: ChunkDescriptor[];
}

export interface DeviceLimits {
  maxStorageBufferBindingSize: number;
  maxComputeInvocationsPerWorkgroup: number;
  maxComputeWorkgroupSizeX: number;
}
