# Contributing to WebGPU VRAM Pager

Thank you for contributing to **WebGPU VRAM Pager**, a virtual memory paging and staging ring-buffer engine designed to train and infer LLMs/Vision models in browsers under strict hardware VRAM limits.

## Setup & Testing

```bash
npm install
npx vitest run
```

### Technical Design Rules

- **Zero GC Churn**: Staging ring buffers must be reused across frames. Never instantiate transient GPU buffers inside per-step rendering/compute loops.
- **W3C WebGPU Compliance**: Device storage buffers (`STORAGE | COPY_DST`) must remain isolated from host-mapped staging buffers (`MAP_WRITE | COPY_SRC`) in accordance with W3C WebGPU Section 5.2.

## How to Submit Changes

1. Fork the repo and create a feature branch (`git checkout -b feat/pager-improvement`).
2. Run `npx vitest run` to ensure all tests pass.
3. Submit a Pull Request.

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](LICENSE).
