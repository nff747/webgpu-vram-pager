export interface Allocation {
  id: string;
  offset: number;
  size: number;
  isEvicted: boolean;
}

export interface VRAMBuffer {
  size: number;
  allocations: Allocation[];
}

export interface DeviceLimits {
  maxStorageBufferBindingSize: number;
  maxComputeInvocationsPerWorkgroup: number;
  maxComputeWorkgroupSizeX: number;
}

export interface PagerOptions {
  maxBufferSize?: number;
  ringBufferSize?: number;
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
