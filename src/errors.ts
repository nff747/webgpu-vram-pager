export class PagerError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PagerError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class OutOfVRAMError extends PagerError {
  constructor(public readonly requestedBytes: number, public readonly availableBytes: number) {
    super(`VRAM allocation failed. Requested ${requestedBytes} bytes, but only ${availableBytes} bytes available.`);
    this.name = 'OutOfVRAMError';
  }
}

export class UninitializedPagerError extends PagerError {
  constructor() {
    super('PagerEngine or RingBufferPool has not been initialized. Call init() before allocating or paging.');
    this.name = 'UninitializedPagerError';
  }
}

export class BindingSizeExceededError extends PagerError {
  constructor(public readonly size: number, public readonly limit: number) {
    super(`Requested buffer size ${size} bytes exceeds negotiated hardware maxStorageBufferBindingSize (${limit} bytes).`);
    this.name = 'BindingSizeExceededError';
  }
}
