<div align="center">

<img src="assets/banner.jpg" width="800" alt="Project Banner">

# 🧠 webgpu-vram-pager

**Dynamic Memory Paging & PCIe Streaming for Browser-Based LLMs**

[![Powered by nff747](https://img.shields.io/badge/Powered%20by-nff747-111111?style=for-the-badge&logo=github&logoColor=white)](https://github.com/nff747)
[![License: MIT](https://img.shields.io/badge/License-MIT-FF0055.svg?style=for-the-badge)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-3178C6.svg?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![WebGPU](https://img.shields.io/badge/WebGPU-Compute-000000.svg?style=for-the-badge&logo=webgl&logoColor=white)]()

*Bypass browser `maxStorageBufferBindingSize` limits. Stream 8B parameter models across the PCIe bus. Run massive local AI on restricted hardware.*

[The Problem](#problem-statement) · [Quick Start](#quick-start) · [How It Works](#how-it-works-virtual-buffer-paging) · [API Reference](#api-reference) · [Use Cases](#use-cases)

</div>

---

## Problem Statement

WebGPU OOM crashes when loading large AI models (>2GB) in-browser. Browsers artificially sandbox WebGPU to prevent rogue tabs from crashing graphics drivers by imposing strict `maxStorageBufferBindingSize` limits (often 128MB or 256MB). When you try to bind a 2GB model weight tensor, the browser throws an error and crashes. This library solves it by virtualizing the memory and streaming chunks.

---

## Architecture Flow

```text
[ NETWORK ]      [ SYSTEM RAM ]                   [ VRAM (GPU) ]
    |                  |                                |
[Safetensors] -- Fetch API Stream --> [ AETHEL-1 AI CORE ]
                                                |
                                      ( QUANTUM DATA SLICER )
                                                |
                              +-----------------------------------+
                              |       DATA STREAM OF AI WEIGHTS   |
                              v                                   v
                      [ VRAM_CHIP 0 ]                    [ VRAM_CHIP 1 ]
                      [ AI MEMORY MODULE ]               [ AI MEMORY MODULE ]
                              |                                   |
                      (Compute Pass)                     (Compute Pass)
                              \                                 /
                               \                               /
                                [  ACCUMULATION BUFFER   ]
```

---

## Quick Start

```typescript
import { VRAMPager, WeightStreamer } from 'webgpu-vram-pager';

async function loadModel() {
  // 1. Initialize the pager
  const pager = new VRAMPager({ debug: true, ringBufferSize: 4 });
  await pager.init();

  // 2. Allocate a 2GB virtual tensor
  const TWO_GB = 2 * 1024 * 1024 * 1024;
  const pagedTensor = pager.allocatePagedTensor('llama_layers_0', TWO_GB);

  // 3. Stream weights directly to VRAM
  const device = pager.context.device;
  const streamer = new WeightStreamer(device, pager.safeBindingLimit);
  
  await streamer.streamToBuffer('https://huggingface.co/model.safetensors', pagedTensor);
  console.log('Model weights paged to VRAM successfully!');
}
```

---

## How It Works: Virtual Buffer Paging

`webgpu-vram-pager` intercepts model allocation and virtualizes the GPU buffers. 

1. **Hardware Probing:** Queries absolute maximum limits allowed by browser/OS.
2. **Dynamic Chunking:** Slices the model weights into compliant chunks (`8 × 256MB`).
3. **PCIe Streaming:** Uses the `Fetch` API to pipe model weights directly from the network across the PCIe bus into `GPUBuffer` arrays using `device.queue.writeBuffer`.
4. **Paged Dispatch Orchestration:** Binds Chunk 0 -> Compute -> Binds Chunk 1 -> Compute... ensuring the shader never violates binding limits.

---

## API Reference

### `VRAMPager` (formerly `PagerEngine`)
The main engine for probing hardware limits, configuring the memory pool, and orchestrating virtual tensors.
- `init()`: Probes the device limits.
- `allocatePagedTensor(id, totalBytes)`: Creates a logical tensor partitioned into compliant physical chunks.

### `RingBuffer` (formerly `RingBufferPool`)
Adaptive memory pool for recycling WebGPU buffers.
- `acquireMapped()`: Gets a buffer ready for MAP_WRITE.
- `acquireForQueue()`: Gets a buffer ready for queue writing.

### `MemoryBudget`
Interface representing real-time monitoring of WebGPU VRAM.
- `totalVRAM`: Total theoretical memory.
- `allocated`: Memory currently locked.
- `available`: Memory ready to be acquired.

### `PageStrategy`
Defines the eviction policy (`'lru' | 'fifo' | 'adaptive'`).

---

## Use Cases

- **In-browser LLM inference:** Run LLaMA, Mistral, or WebLLM entirely locally without hitting memory limits.
- **Large texture streaming:** Load gigapixel textures or massive satellite imagery in 3D maps.
- **Real-time point cloud rendering:** Stream and compute on millions of LiDAR points on the fly.

---

## License

[MIT](LICENSE) — iKi / Frozen Flame

---

## 📜 Open Source & Commercial Use (MIT)

This project is 100% open-source software under the **[MIT License](LICENSE)**.

### 💼 Commercial Use & Free Redistribution
You are explicitly permitted to use, modify, fork, integrate, package, and sell commercial products or SaaS built using this engine with **one visible attribution requirement**:
> **Attribution Requirement**: You must include a visible credit to **nff747** in your application (e.g., `Powered by nff747` linking to [https://github.com/nff747](https://github.com/nff747) in your application UI, footer, about modal, or documentation).

```html
<!-- Example visible footer attribution -->
<p>Powered by <a href="https://github.com/nff747" target="_blank">nff747</a></p>
```
