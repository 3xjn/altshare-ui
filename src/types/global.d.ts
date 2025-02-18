declare const global: typeof globalThis & {
  Buffer: typeof Buffer
  process: NodeJS.Process
} 