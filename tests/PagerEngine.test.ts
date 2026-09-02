import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PagerEngine } from '../src/core/PagerEngine';

// Mock WebGPU API for Node
(global as any).GPUBufferUsage = {
  STORAGE: 128,
  COPY_DST: 8,
  MAP_WRITE: 2
};
(global as any).GPUMapMode = {
  WRITE: 2
};

const mockBuffer = {
  mapAsync: vi.fn().mockResolvedValue(undefined),
  getMappedRange: vi.fn().mockReturnValue(new ArrayBuffer(1024)),
  unmap: vi.fn(),
  destroy: vi.fn(),
};

const mockDevice = {
  createBuffer: vi.fn().mockReturnValue(mockBuffer),
  queue: {
    writeBuffer: vi.fn(),
    onSubmittedWorkDone: vi.fn().mockResolvedValue(undefined),
  },
  limits: {
    maxStorageBufferBindingSize: 268435456, // 256MB
    maxComputeInvocationsPerWorkgroup: 256,
    maxComputeWorkgroupSizeX: 256,
  }
};

const mockAdapter = {
  requestDevice: vi.fn().mockResolvedValue(mockDevice),
  limits: mockDevice.limits
};

beforeEach(() => {
  vi.clearAllMocks();
  (global as any).navigator = {
    gpu: {
      requestAdapter: vi.fn().mockResolvedValue(mockAdapter),
    }
  };
});

describe('PagerEngine', () => {
  it('should initialize and create a ring buffer pool', async () => {
    const pager = new PagerEngine({ ringBufferSize: 2 });
    await pager.init();
    
    // Should have created 2 buffers
    expect(mockDevice.createBuffer).toHaveBeenCalledTimes(2);
  });

  it('should allocate a paged tensor logically without creating buffers', async () => {
    const pager = new PagerEngine({ ringBufferSize: 2, maxBufferSize: 1024 });
    await pager.init();
    
    mockDevice.createBuffer.mockClear();
    
    const tensor = pager.allocatePagedTensor('test', 2500);
    
    expect(tensor.chunks.length).toBe(3); // 1024, 1024, 452
    expect(tensor.chunks[0].byteLength).toBe(1024);
    expect(tensor.chunks[2].byteLength).toBe(452);
    
    // Should NOT create buffers synchronously anymore
    expect(mockDevice.createBuffer).toHaveBeenCalledTimes(0);
  });

  it('should write tensor data using queue', async () => {
    const pager = new PagerEngine({ ringBufferSize: 2, maxBufferSize: 1024 });
    await pager.init();
    
    const tensor = pager.allocatePagedTensor('test', 2500);
    const data = new ArrayBuffer(2500);
    
    pager.writeTensorDataQueue(tensor, data);
    
    expect(mockDevice.queue.writeBuffer).toHaveBeenCalledTimes(3);
    expect(tensor.chunks[0].bufferIndex).toBe(0);
    expect(tensor.chunks[1].bufferIndex).toBe(1);
    expect(tensor.chunks[2].bufferIndex).toBe(0); // ring buffer wraps around
  });

  it('should write tensor data using mapAsync', async () => {
    const pager = new PagerEngine({ ringBufferSize: 2, maxBufferSize: 1024 });
    await pager.init();
    
    const tensor = pager.allocatePagedTensor('test', 2500);
    const data = new ArrayBuffer(2500);
    
    await pager.writeTensorDataAsync(tensor, data);
    
    expect(mockBuffer.mapAsync).toHaveBeenCalledTimes(3);
    expect(mockBuffer.getMappedRange).toHaveBeenCalledTimes(3);
    expect(mockBuffer.unmap).toHaveBeenCalledTimes(3);
    
    expect(tensor.chunks[0].bufferIndex).toBe(0);
    expect(tensor.chunks[1].bufferIndex).toBe(1);
    expect(tensor.chunks[2].bufferIndex).toBe(0); // ring buffer wraps around
  });
});
