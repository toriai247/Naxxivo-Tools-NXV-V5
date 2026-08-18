import { 
  CreateMLCEngine, 
  MLCEngineInterface, 
  InitProgressReport, 
  prebuiltAppConfig, 
  AppConfig, 
  ModelRecord 
} from '@mlc-ai/web-llm';

export interface ModelOption {
  id: string;
  mlcModelId?: string;
  customUrl?: string;
  name: string;
  provider: 'cloud' | 'local';
  tagline: string;
  downloadSize: string;
  recommendedDevice: string;
  memoryUsage: string;
  speedRating: string;
  intelligenceRating: string;
  description: string;
  badge: string;
  badgeColor: string;
}

// Custom model record list ensuring all SmolLM, Llama, and Qwen models resolve properly
const ADDITIONAL_MODELS: ModelRecord[] = [
  {
    model_id: 'SmolLM-135M-Instruct-q4f16_1-MLC',
    model: 'https://huggingface.co/mlc-ai/SmolLM2-135M-Instruct-q4f16_1-MLC',
    model_lib: 'https://raw.githubusercontent.com/mlc-ai/binary-mlc-llm-libs/main/web-llm-models/v0_2_48/SmolLM2-135M-Instruct-q4f16_1-ctx2k-webgpu.wasm',
    low_resource_required: true,
  },
  {
    model_id: 'SmolLM2-135M-Instruct-q4f16_1-MLC',
    model: 'https://huggingface.co/mlc-ai/SmolLM2-135M-Instruct-q4f16_1-MLC',
    model_lib: 'https://raw.githubusercontent.com/mlc-ai/binary-mlc-llm-libs/main/web-llm-models/v0_2_48/SmolLM2-135M-Instruct-q4f16_1-ctx2k-webgpu.wasm',
    low_resource_required: true,
  },
  {
    model_id: 'SmolLM-360M-Instruct-q4f16_1-MLC',
    model: 'https://huggingface.co/mlc-ai/SmolLM2-360M-Instruct-q4f16_1-MLC',
    model_lib: 'https://raw.githubusercontent.com/mlc-ai/binary-mlc-llm-libs/main/web-llm-models/v0_2_48/SmolLM2-360M-Instruct-q4f16_1-ctx2k-webgpu.wasm',
    low_resource_required: true,
  },
  {
    model_id: 'SmolLM2-360M-Instruct-q4f16_1-MLC',
    model: 'https://huggingface.co/mlc-ai/SmolLM2-360M-Instruct-q4f16_1-MLC',
    model_lib: 'https://raw.githubusercontent.com/mlc-ai/binary-mlc-llm-libs/main/web-llm-models/v0_2_48/SmolLM2-360M-Instruct-q4f16_1-ctx2k-webgpu.wasm',
    low_resource_required: true,
  },
  {
    model_id: 'Llama-3.2-1B-Instruct-q4f16_1-MLC',
    model: 'https://huggingface.co/mlc-ai/Llama-3.2-1B-Instruct-q4f16_1-MLC',
    model_lib: 'https://raw.githubusercontent.com/mlc-ai/binary-mlc-llm-libs/main/web-llm-models/v0_2_48/Llama-3.2-1B-Instruct-q4f16_1-ctx4k-webgpu.wasm',
    low_resource_required: false,
  },
  {
    model_id: 'Qwen2.5-0.5B-Instruct-q4f16_1-MLC',
    model: 'https://huggingface.co/mlc-ai/Qwen2.5-0.5B-Instruct-q4f16_1-MLC',
    model_lib: 'https://raw.githubusercontent.com/mlc-ai/binary-mlc-llm-libs/main/web-llm-models/v0_2_48/Qwen2.5-0.5B-Instruct-q4f16_1-ctx4k-webgpu.wasm',
    low_resource_required: true,
  },
];

export const CUSTOM_APP_CONFIG: AppConfig = {
  ...prebuiltAppConfig,
  model_list: [
    ...ADDITIONAL_MODELS,
    ...(prebuiltAppConfig.model_list || []),
  ],
};

export const MODEL_CATALOG: ModelOption[] = [
  {
    id: 'cloud-gemini',
    name: 'Google Gemini Flash (Cloud API)',
    provider: 'cloud',
    tagline: 'Default Cloud Engine • Multimodal & High Speed',
    downloadSize: '0 MB (Cloud)',
    recommendedDevice: 'All Devices (Mobile & Desktop)',
    memoryUsage: '0 MB RAM',
    speedRating: '⚡⚡⚡⚡⚡ Ultra Fast',
    intelligenceRating: '🧠🧠🧠🧠🧠 Highest',
    description: 'Fast, highly intelligent cloud AI with vision support. Handles YouTube summaries, image commands, and complex questions effortlessly.',
    badge: 'DEFAULT CLOUD',
    badgeColor: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
  },
  {
    id: 'smollm-135m',
    mlcModelId: 'SmolLM-135M-Instruct-q4f16_1-MLC',
    name: 'SmolLM-135M-Instruct (On-Device)',
    provider: 'local',
    tagline: 'Ultra Lightweight Local AI • Minimal Storage & RAM',
    downloadSize: '~45 MB',
    recommendedDevice: 'Any Smartphone / Low-spec Phone',
    memoryUsage: '~150 MB RAM',
    speedRating: '⚡⚡⚡⚡⚡ Extremely Fast',
    intelligenceRating: '🧠🧠 Basic Chat',
    description: 'Extremely small model that downloads in seconds and runs 100% offline inside browser IndexedDB storage without server costs.',
    badge: 'ULTRA LIGHT',
    badgeColor: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
  },
  {
    id: 'smollm-360m',
    mlcModelId: 'SmolLM-360M-Instruct-q4f16_1-MLC',
    name: 'SmolLM-360M-Instruct (On-Device)',
    provider: 'local',
    tagline: 'Balanced Local AI • Fast & Smart for Mobile',
    downloadSize: '~120 MB',
    recommendedDevice: 'Mid-range Smartphones & Laptops',
    memoryUsage: '~350 MB RAM',
    speedRating: '⚡⚡⚡⚡ Fast',
    intelligenceRating: '🧠🧠🧠 Good',
    description: 'Great balance of speed and reasoning capability. Ideal for offline assistant chats and quick offline text formatting.',
    badge: 'BALANCED',
    badgeColor: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
  },
  {
    id: 'llama-1b',
    mlcModelId: 'Llama-3.2-1B-Instruct-q4f16_1-MLC',
    name: 'Llama-3.2-1B Instruct (On-Device)',
    provider: 'local',
    tagline: 'High Intelligence Offline AI • Meta Llama 3.2',
    downloadSize: '~580 MB',
    recommendedDevice: 'Smartphones with 4GB+ RAM / PC',
    memoryUsage: '~1.2 GB RAM',
    speedRating: '⚡⚡⚡ Moderate',
    intelligenceRating: '🧠🧠🧠🧠 Very High',
    description: 'Powerful Meta Llama 3.2 1B model running completely offline inside your browser. Delivers rich, nuanced responses with zero server API keys.',
    badge: 'POWERFUL',
    badgeColor: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
  },
  {
    id: 'qwen-0.5b',
    mlcModelId: 'Qwen2.5-0.5B-Instruct-q4f16_1-MLC',
    name: 'Qwen 2.5 0.5B Instruct (On-Device)',
    provider: 'local',
    tagline: 'Fast Multilingual Offline AI • Alibaba Qwen',
    downloadSize: '~300 MB',
    recommendedDevice: 'Mid-range Phones & Laptops',
    memoryUsage: '~600 MB RAM',
    speedRating: '⚡⚡⚡⚡ Very Fast',
    intelligenceRating: '🧠🧠🧠🧠 High',
    description: 'Highly competent multilingual model with strong logic and fast response times running on-device.',
    badge: 'MULTILINGUAL',
    badgeColor: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20',
  },
];

let engineInstance: MLCEngineInterface | null = null;
let currentLoadedModelId: string | null = null;

const STORAGE_KEY = 'naxxivo_ai_engine_config_v1';

export interface EngineConfig {
  activeModelId: string;
  downloadedModelIds: string[];
  customModelUrls?: Record<string, string>;
}

export function getEngineConfig(): EngineConfig {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return {
        activeModelId: parsed.activeModelId || 'cloud-gemini',
        downloadedModelIds: Array.isArray(parsed.downloadedModelIds) ? parsed.downloadedModelIds : [],
        customModelUrls: parsed.customModelUrls || {},
      };
    }
  } catch {
    // Ignore storage errors
  }
  return { activeModelId: 'cloud-gemini', downloadedModelIds: [], customModelUrls: {} };
}

export function saveEngineConfig(config: EngineConfig) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch {
    // Ignore storage errors
  }
}

export function checkWebGpuSupport(): { supported: boolean; reason?: string } {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return { supported: false, reason: 'Server side environment' };
  }
  if (!('gpu' in navigator) || !(navigator as any).gpu) {
    return {
      supported: false,
      reason: 'WebGPU is not enabled in this browser. Please use Chrome 113+, Edge 113+, or Safari 18+ for On-Device AI.',
    };
  }
  return { supported: true };
}

export async function downloadAndInitModel(
  modelId: string,
  onProgress?: (progress: { progress: number; text: string }) => void,
  customUrlInput?: string
): Promise<MLCEngineInterface> {
  const modelOpt = MODEL_CATALOG.find((m) => m.id === modelId);
  const mlcModelId = modelOpt?.mlcModelId || modelId;

  const gpuCheck = checkWebGpuSupport();
  if (!gpuCheck.supported) {
    throw new Error(gpuCheck.reason || 'WebGPU not supported');
  }

  if (engineInstance && currentLoadedModelId === modelId) {
    return engineInstance;
  }

  onProgress?.({ progress: 0.05, text: `Initializing ${modelOpt?.name || modelId}...` });

  const progressHandler = (report: InitProgressReport) => {
    onProgress?.({
      progress: Math.min(0.99, Math.max(0.05, report.progress)),
      text: report.text,
    });
  };

  // Build appConfig with custom URL if user provided Supabase / HuggingFace link
  const appConfigToUse: AppConfig = { ...CUSTOM_APP_CONFIG };

  if (customUrlInput && customUrlInput.trim()) {
    const url = customUrlInput.trim();
    // Dynamically insert or replace model_list entry
    const customRecord: ModelRecord = {
      model_id: mlcModelId,
      model: url,
      model_lib: url.endsWith('.wasm')
        ? url
        : 'https://raw.githubusercontent.com/mlc-ai/binary-mlc-llm-libs/main/web-llm-models/v0_2_48/SmolLM2-135M-Instruct-q4f16_1-ctx2k-webgpu.wasm',
      low_resource_required: true,
    };
    appConfigToUse.model_list = [customRecord, ...(appConfigToUse.model_list || [])];
  }

  try {
    const engine = await CreateMLCEngine(mlcModelId, {
      appConfig: appConfigToUse,
      initProgressCallback: progressHandler,
    });

    engineInstance = engine;
    currentLoadedModelId = modelId;

    // Mark model as downloaded in storage
    const config = getEngineConfig();
    if (!config.downloadedModelIds.includes(modelId)) {
      config.downloadedModelIds.push(modelId);
    }
    config.activeModelId = modelId;
    if (customUrlInput) {
      if (!config.customModelUrls) config.customModelUrls = {};
      config.customModelUrls[modelId] = customUrlInput;
    }
    saveEngineConfig(config);

    onProgress?.({ progress: 1.0, text: `${modelOpt?.name || modelId} loaded & ready!` });
    return engine;
  } catch (err: any) {
    console.error('Failed to initialize WebLLM engine:', err);
    throw new Error(err?.message || `Failed to download or load model.`);
  }
}

export async function generateOnDeviceResponse(
  promptMessages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>,
  modelId: string,
  onChunk?: (chunk: string) => void
): Promise<string> {
  let engine = engineInstance;

  if (!engine || currentLoadedModelId !== modelId) {
    const config = getEngineConfig();
    const savedCustomUrl = config.customModelUrls?.[modelId];
    engine = await downloadAndInitModel(modelId, undefined, savedCustomUrl);
  }

  try {
    const completion = await engine.chat.completions.create({
      messages: promptMessages as any,
      temperature: 0.7,
      max_tokens: 512,
      stream: Boolean(onChunk),
    });

    if (onChunk && typeof (completion as any)[Symbol.asyncIterator] === 'function') {
      let fullText = '';
      for await (const chunk of completion as any) {
        const textChunk = chunk.choices[0]?.delta?.content || '';
        fullText += textChunk;
        onChunk(fullText);
      }
      return fullText;
    } else {
      const response = completion as any;
      return response.choices[0]?.message?.content || 'No response generated.';
    }
  } catch (err: any) {
    console.error('WebLLM generation error:', err);
    throw new Error(`On-Device AI error: ${err?.message || 'Failed to generate response'}`);
  }
}

export async function deleteCachedModel(modelId: string): Promise<void> {
  if (currentLoadedModelId === modelId && engineInstance) {
    try {
      await engineInstance.unload();
    } catch {
      // Ignore unload error
    }
    engineInstance = null;
    currentLoadedModelId = null;
  }

  // Update storage
  const config = getEngineConfig();
  config.downloadedModelIds = config.downloadedModelIds.filter((id) => id !== modelId);
  if (config.customModelUrls) {
    delete config.customModelUrls[modelId];
  }
  if (config.activeModelId === modelId) {
    config.activeModelId = 'cloud-gemini';
  }
  saveEngineConfig(config);
}
