/**
 * ═══════════════════════════════════════════════════════════════════
 * VRAM Pager — WebGPU Context & Limit Negotiation
 * 
 * Manages device initialization and probes the browser's hidden 
 * memory limits (specifically maxStorageBufferBindingSize).
 * ═══════════════════════════════════════════════════════════════════
 */

import { DeviceLimits } from '../types';

export class WebGPUContext {
  public device: GPUDevice | null = null;
  public limits: DeviceLimits | null = null;

  async init(): Promise<void> {
    if (!navigator.gpu) {
      throw new Error('WebGPU is not supported in this browser.');
    }

    const adapter = await navigator.gpu.requestAdapter({
      powerPreference: 'high-performance'
    });

    if (!adapter) {
      throw new Error('No appropriate GPU adapter found.');
    }

    // Request the absolute maximum limits the browser will allow
    this.device = await adapter.requestDevice({
      requiredLimits: {
        maxStorageBufferBindingSize: adapter.limits.maxStorageBufferBindingSize,
        maxComputeInvocationsPerWorkgroup: adapter.limits.maxComputeInvocationsPerWorkgroup,
        maxComputeWorkgroupSizeX: adapter.limits.maxComputeWorkgroupSizeX
      }
    });

    this.limits = {
      maxStorageBufferBindingSize: this.device.limits.maxStorageBufferBindingSize,
      maxComputeInvocationsPerWorkgroup: this.device.limits.maxComputeInvocationsPerWorkgroup,
      maxComputeWorkgroupSizeX: this.device.limits.maxComputeWorkgroupSizeX
    };
    
    // Diagnostic output for hardware limits
    const limitMB = (this.limits.maxStorageBufferBindingSize / 1024 / 1024).toFixed(2);
    console.log(\`[VRAM Pager] Hardware limit negotiated: Max Binding Size = \${limitMB} MB\`);
  }
}
