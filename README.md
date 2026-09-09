<div align="center">

<img src="assets/banner.jpg" width="800" alt="Project Banner">


# 🧠 webgpu-vram-pager

**Dynamic Memory Paging & PCIe Streaming for Browser-Based LLMs**

[![Powered by nff747](https://img.shields.io/badge/Powered%20by-nff747-111111?style=for-the-badge&logo=github&logoColor=white)](https://github.com/nff747)
[![License: MIT](https://img.shields.io/badge/License-MIT-FF0055.svg?style=for-the-badge)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-3178C6.svg?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![WebGPU](https://img.shields.io/badge/WebGPU-Compute-000000.svg?style=for-the-badge&logo=webgl&logoColor=white)]()

*Bypass browser `maxStorageBufferBindingSize` limits. Stream 8B parameter models across the PCIe bus. Run massive local AI on restricted hardware.*

[The WebGPU Memory Death-Trap](#the-problem-the-webgpu-memory-death-trap) · [How It Works](#how-it-works-virtual-buffer-paging) · [API Usage](#api-usage) · [Integration](#integrating-with-webllm--onnx-web)

</div>

---

## The Problem: The WebGPU Memory Death-Trap

Running local LLMs (like LLaMA 3 8B) in the browser is the holy grail of zero-cost, private AI. However, browsers artificially sandbox WebGPU to prevent rogue tabs from crashing graphics drivers.

Even if you have an M3 Max with 128GB of Unified Memory, browsers like Chrome and Safari hard-cap the `maxStorageBufferBindingSize` (often strictly limited to **128MB** or **256MB**).

When WebLLM or Transformers.js tries to bind a 2GB model weight tensor to a compute shader for matrix multiplication, the browser throws:
> `TypeError: Binding size is larger than the maximum binding size.`

**Result:** The model crashes before generating a single token.

---

## How It Works: Virtual Buffer Paging

`webgpu-vram-pager` intercepts model allocation and virtualizes the GPU buffers. 

1. **Hardware Probing:** It queries the absolute maximum limits allowed by the specific browser/OS combo.
2. **Dynamic Chunking:** Instead of allocating a single 2GB tensor, it slices the model weights into an array of strictly compliant chunks (e.g., `8 × 256MB` buffers).
3. **PCIe Streaming (`WeightStreamer`):** Using the `Fetch` API streaming reader, it pipes model weights directly from the network across the PCIe bus into the chunked `GPUBuffer` array using `device.queue.writeBuffer`. It bypasses holding the gigabytes of data in JS heap memory.
4. **Paged Dispatch Orchestration (`ComputePipeline`):** During inference, instead of one massive compute dispatch, it orchestrates a ring-buffered pass. It binds Chunk 0 -> Compute -> Accumulates -> Binds Chunk 1 -> Compute... ensuring the shader never violates the binding limits while successfully completing the entire matrix multiplication.

---

## API Usage

### 1. Installation

```bash
npm install webgpu-vram-pager
```

### 2. Initialize the Pager

```typescript
import { PagerEngine } from 'webgpu-vram-pager';

// The engine probes the browser limits and establishes a safe buffer size
const engine = new PagerEngine({ debug: true });
await engine.init();
```

### 3. Virtualize a Massive Tensor

```typescript
// Example: A 2GB weight tensor for an 8B parameter model
const TWO_GB = 2 * 1024 * 1024 * 1024;

// Automatically allocates the correct number of WebGPU chunks under the hood
const pagedTensor = engine.allocatePagedTensor('llama_layers_0', TWO_GB);
```

### 4. Stream Weights over PCIe

```typescript
import { WeightStreamer } from 'webgpu-vram-pager';

// The streamer pipes the network request directly to VRAM, chunk by chunk,
// preventing browser JS heap Out-Of-Memory (OOM) crashes.
const streamer = new WeightStreamer(device, engine.safeBindingLimit);
await streamer.streamToBuffer('https://huggingface.co/.../model.safetensors', pagedTensor);
```

### 5. Execute Paged Compute Dispatch

```typescript
import { ComputePipeline } from 'webgpu-vram-pager';

// Executes the WGSL compute shader by iterating over the physical chunks
const pipelineManager = new ComputePipeline(device, engine, myComputePipeline);

// Dispatch matrix multiplication safely
pipelineManager.executePagedDispatch(
  pagedTensor,      // Input virtualized tensor
  outputBuffer,     // Accumulation buffer
  workgroupCountX,
  1, 1
);
```

---

## Integrating with WebLLM / ONNX Web

`webgpu-vram-pager` is designed to be injected into the buffer allocation layer of existing frameworks.

*For **WebLLM** (TVM)*: Override the `createBuffer` call inside the TVM WebGPU device manager to return a `PagedTensor` proxy instead of a native `GPUBuffer`. Update the `dispatch` command encoder to loop through the proxy's `chunks`.

*For **ONNX Runtime Web***: Provide a custom Execution Provider (EP) hook that utilizes the `PagerEngine` for weight initialization.

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
