import { CreateMLCEngine, MLCEngine, InitProgressReport, AppConfig } from '@mlc-ai/web-llm';

export interface WebLlmModelConfig {
  id: string;
  name: string;
  hfRepo: string;
  description: string;
  size: string;
  modelUrl: string;
  wasmUrl?: string;
}

export const SUPPORTED_LOCAL_MODELS: WebLlmModelConfig[] = [
  {
    id: 'smollm2-135m-rony',
    name: 'SmolLM2-135M (User Bucket)',
    hfRepo: 'rony1234554321/SmolLM2-135M-Instruct-q4f16_1-MLC-bucket',
    description: 'User uploaded 4-bit quantized SmolLM2 135M model on HuggingFace',
    size: '~85 MB',
    modelUrl: 'https://huggingface.co/rony1234554321/SmolLM2-135M-Instruct-q4f16_1-MLC-bucket/resolve/main/',
    wasmUrl: 'https://raw.githubusercontent.com/mlc-ai/binary-mlc-llm-libs/main/SmolLM2-135M-Instruct/SmolLM2-135M-Instruct-q4f16_1-ctx2k-webgpu.wasm'
  },
  {
    id: 'smollm2-135m-official',
    name: 'SmolLM2-135M (Official MLC)',
    hfRepo: 'mlc-ai/SmolLM2-135M-Instruct-q4f16_1-MLC',
    description: 'Official Hugging Face MLC SmolLM2 135M Instruct WebGPU model',
    size: '~85 MB',
    modelUrl: 'https://huggingface.co/mlc-ai/SmolLM2-135M-Instruct-q4f16_1-MLC/resolve/main/',
    wasmUrl: 'https://raw.githubusercontent.com/mlc-ai/binary-mlc-llm-libs/main/SmolLM2-135M-Instruct/SmolLM2-135M-Instruct-q4f16_1-ctx2k-webgpu.wasm'
  }
];

let engineInstance: MLCEngine | null = null;
let currentLoadedModelId: string | null = null;

export function isWebGpuSupported(): boolean {
  return typeof navigator !== 'undefined' && 'gpu' in navigator && !!navigator.gpu;
}

export async function getOrInitLlmEngine(
  selectedModel: WebLlmModelConfig,
  onProgress?: (progress: InitProgressReport) => void
): Promise<MLCEngine> {
  if (engineInstance && currentLoadedModelId === selectedModel.id) {
    return engineInstance;
  }

  if (engineInstance) {
    try {
      await engineInstance.unload();
    } catch {
      // Ignore unload error
    }
    engineInstance = null;
    currentLoadedModelId = null;
  }

  const appConfig: AppConfig = {
    model_list: [
      {
        model_id: selectedModel.id,
        model: selectedModel.modelUrl,
        model_lib: selectedModel.wasmUrl || 'https://raw.githubusercontent.com/mlc-ai/binary-mlc-llm-libs/main/SmolLM2-135M-Instruct/SmolLM2-135M-Instruct-q4f16_1-ctx2k-webgpu.wasm',
        overrides: {
          context_window_size: 2048,
        }
      }
    ]
  };

  try {
    engineInstance = await CreateMLCEngine(selectedModel.id, {
      appConfig,
      initProgressCallback: (report: InitProgressReport) => {
        if (onProgress) onProgress(report);
      }
    });
    currentLoadedModelId = selectedModel.id;
    return engineInstance;
  } catch (err) {
    console.warn(`Failed to load ${selectedModel.id}, trying fallback official model...`, err);
    // Fallback to pre-built official SmolLM2-135M-Instruct-q4f16_1-MLC if custom repo fails
    if (selectedModel.id !== 'smollm2-135m-official') {
      const fallbackModel = SUPPORTED_LOCAL_MODELS[1];
      const fallbackAppConfig: AppConfig = {
        model_list: [
          {
            model_id: fallbackModel.id,
            model: fallbackModel.modelUrl,
            model_lib: fallbackModel.wasmUrl || 'https://raw.githubusercontent.com/mlc-ai/binary-mlc-llm-libs/main/SmolLM2-135M-Instruct/SmolLM2-135M-Instruct-q4f16_1-ctx2k-webgpu.wasm',
            overrides: {
              context_window_size: 2048,
            }
          }
        ]
      };
      engineInstance = await CreateMLCEngine(fallbackModel.id, {
        appConfig: fallbackAppConfig,
        initProgressCallback: (report: InitProgressReport) => {
          if (onProgress) onProgress(report);
        }
      });
      currentLoadedModelId = fallbackModel.id;
      return engineInstance;
    }
    throw err;
  }
}

export async function sendLocalLlmChatMessage(
  messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>,
  modelConfig: WebLlmModelConfig,
  onStreamChunk?: (chunkText: string) => void,
  onProgress?: (progress: InitProgressReport) => void
): Promise<string> {
  const engine = await getOrInitLlmEngine(modelConfig, onProgress);

  const formattedMessages = messages.map(m => ({
    role: m.role,
    content: m.content
  }));

  if (onStreamChunk) {
    const asyncChunkGenerator = await engine.chat.completions.create({
      messages: formattedMessages,
      stream: true,
      temperature: 0.7,
      max_tokens: 1024,
    });

    let fullReply = '';
    for await (const chunk of asyncChunkGenerator) {
      const delta = chunk.choices[0]?.delta?.content || '';
      fullReply += delta;
      onStreamChunk(fullReply);
    }
    return fullReply;
  } else {
    const response = await engine.chat.completions.create({
      messages: formattedMessages,
      stream: false,
      temperature: 0.7,
      max_tokens: 1024,
    });
    return response.choices[0]?.message?.content || '';
  }
}

export function unloadLlmEngine(): void {
  if (engineInstance) {
    engineInstance.unload().catch(() => {});
    engineInstance = null;
    currentLoadedModelId = null;
  }
}
