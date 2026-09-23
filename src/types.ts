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
