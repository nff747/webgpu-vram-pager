import { describe, it, expect } from 'vitest';
import { computeChunkDescriptors } from '../src/core/chunking';

describe('Tensor Chunk Descriptors', () => {
  it('partitions 1 GB model into 256 MB chunks', () => {
    const oneGB = 1024 * 1024 * 1024;
    const maxChunk = 256 * 1024 * 1024;
    const chunks = computeChunkDescriptors('llama_layer_0', oneGB, maxChunk);

    expect(chunks.length).toBe(4);
    expect(chunks[0].byteOffset).toBe(0);
    expect(chunks[0].byteLength).toBe(maxChunk);
    expect(chunks[3].byteOffset).toBe(3 * maxChunk);
    expect(chunks[3].byteLength).toBe(maxChunk);
  });

  it('correctly handles non-power-of-two uneven chunk remainder', () => {
    const totalBytes = 500;
    const maxChunk = 200;
    const chunks = computeChunkDescriptors('weights', totalBytes, maxChunk);

    expect(chunks.length).toBe(3);
    expect(chunks[0].byteLength).toBe(200);
    expect(chunks[1].byteLength).toBe(200);
    expect(chunks[2].byteLength).toBe(100);
    expect(chunks[2].byteOffset).toBe(400);
  });

  it('keeps single chunk for tensors smaller than maxChunkBytes', () => {
    const chunks = computeChunkDescriptors('bias', 1024, 65536);
    expect(chunks.length).toBe(1);
    expect(chunks[0].byteOffset).toBe(0);
    expect(chunks[0].byteLength).toBe(1024);
  });

  it('throws RangeError for invalid or negative byte sizes', () => {
    expect(() => computeChunkDescriptors('t', 0, 1024)).toThrow(RangeError);
    expect(() => computeChunkDescriptors('t', 1024, 0)).toThrow(RangeError);
    expect(() => computeChunkDescriptors('t', -50, 1024)).toThrow(RangeError);
  });
});
