import { VRAMPager, WeightStreamer } from '../src/index';

async function streamLargeMatrix() {
  console.log('Initializing VRAM Pager...');
  const pager = new VRAMPager({ debug: true, ringBufferSize: 4 });
  await pager.init();

  // Simulate a 2GB Float32 weight matrix
  const TWO_GB = 2 * 1024 * 1024 * 1024;
  console.log('Allocating virtual paged tensor for 2GB matrix...');
  const pagedTensor = pager.allocatePagedTensor('large_weight_matrix', TWO_GB);

  // In a real scenario, this would be your GPU device
  const device = (pager as any).context.device;
  const streamer = new WeightStreamer(device, (pager as any).safeBindingLimit);

  console.log('Streaming weights into VRAM...');
  // Example URL to a large model file
  const modelUrl = 'https://example.com/model/weights.safetensors';
  
  try {
    // await streamer.streamToBuffer(modelUrl, pagedTensor);
    console.log('Streaming completed successfully.');
  } catch (error) {
    console.error('Streaming failed:', error);
  }
}

streamLargeMatrix().catch(console.error);
