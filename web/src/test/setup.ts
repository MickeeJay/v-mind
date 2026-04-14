import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, vi } from 'vitest';

Object.assign(process.env, {
  NEXT_PUBLIC_STACKS_NETWORK: process.env.NEXT_PUBLIC_STACKS_NETWORK ?? 'mainnet',
  NEXT_PUBLIC_STACKS_API_URL: process.env.NEXT_PUBLIC_STACKS_API_URL ?? 'https://api.testnet.hiro.so',
  NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3001',
  NEXT_PUBLIC_API_VERSION: process.env.NEXT_PUBLIC_API_VERSION ?? 'v1',
  NEXT_PUBLIC_API_TIMEOUT: process.env.NEXT_PUBLIC_API_TIMEOUT ?? '30000',
  NEXT_PUBLIC_DEPLOYER_ADDRESS: process.env.NEXT_PUBLIC_DEPLOYER_ADDRESS ?? 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM',
});

afterEach(() => {
  vi.clearAllMocks();
});

beforeEach(() => {
  Object.defineProperty(window, 'scrollTo', {
    value: vi.fn(),
    writable: true,
  });

  class ResizeObserverMock {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
  }

  class IntersectionObserverMock {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
  }

  vi.stubGlobal('ResizeObserver', ResizeObserverMock);
  vi.stubGlobal('IntersectionObserver', IntersectionObserverMock);

  window.matchMedia ??= vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
});