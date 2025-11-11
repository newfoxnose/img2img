declare module 'onnxruntime-web' {
    export interface Env {
      wasm: {
        proxy?: boolean;
        numThreads?: number;
      };
      webgl?: {
        contextId?: 'webgl' | 'webgl2';
        matmulMaxBatchSize?: number;
        textureCacheMode?: 'initializerOnly' | 'full';
        pack?: boolean;
        async?: boolean;
      };
      webgpu?: {
        device?: unknown;
      };
    }
  
    export const env: Env;
  }