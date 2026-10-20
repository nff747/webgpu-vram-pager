import { ChunkDescriptor } from '../types';

/**
 * Computes chunk boundary descriptors for partitioning oversized tensor payloads
 * across hardware storage buffer limits.
 */
export function computeChunkDescriptors(
  tensorId: string,
  totalBytes: number,
  maxChunkBytes: number
): ChunkDescriptor[] {
  if (totalBytes <= 0 || !Number.isFinite(totalBytes)) {
    throw new RangeError(`Invalid total bytes: ${totalBytes}. Must be a positive number.`);
  }
  if (maxChunkBytes <= 0 || !Number.isFinite(maxChunkBytes)) {
    throw new RangeError(`Invalid max chunk bytes: ${maxChunkBytes}. Must be a positive number.`);
  }

  const numChunks = Math.ceil(totalBytes / maxChunkBytes);
  const chunks: ChunkDescriptor[] = [];
  let remainingBytes = totalBytes;
  let currentOffset = 0;

  for (let i = 0; i < numChunks; i++) {
    const chunkSize = Math.min(remainingBytes, maxChunkBytes);
    chunks.push({
      id: `${tensorId}_chunk_${i}`,
      byteOffset: currentOffset,
      byteLength: chunkSize,
      bufferIndex: -1
    });
    remainingBytes -= chunkSize;
    currentOffset += chunkSize;
  }

  return chunks;
}
