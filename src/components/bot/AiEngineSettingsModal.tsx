import React, { useState, useEffect } from 'react';
import { 
  Cpu, 
  Sparkles, 
  Download, 
  CheckCircle2, 
  Trash2, 
  Zap, 
  AlertTriangle, 
  Info, 
  X, 
  RefreshCw, 
  HardDrive, 
  Smartphone, 
  Wifi, 
  WifiOff,
  Check,
  Link,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  MODEL_CATALOG, 
  ModelOption, 
  getEngineConfig, 
  saveEngineConfig, 
  checkWebGpuSupport, 
  downloadAndInitModel, 
  deleteCachedModel 
} from '@/lib/webLlmEngine';
import { useToast } from '@/hooks/use-toast';
import { sound } from '@/lib/sound';

interface AiEngineSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onEngineChanged?: (modelId: string) => void;
}

export const AiEngineSettingsModal: React.FC<AiEngineSettingsModalProps> = ({
  isOpen,
  onClose,
  onEngineChanged,
}) => {
  const { toast } = useToast();
  const [config, setConfig] = useState(getEngineConfig());
  const [gpuInfo, setGpuInfo] = useState<{ supported: boolean; reason?: string }>({ supported: true });
  const [downloadingModelId, setDownloadingModelId] = useState<string | null>(null);
  const [customUrls, setCustomUrls] = useState<Record<string, string>>({});
  const [showCustomLinkInput, setShowCustomLinkInput] = useState<Record<string, boolean>>({});
  const [downloadProgress, setDownloadProgress] = useState<{ progress: number; text: string }>({
    progress: 0,
    text: '',
  });

  useEffect(() => {
    if (isOpen) {
      const currentConfig = getEngineConfig();
      setConfig(currentConfig);
      setGpuInfo(checkWebGpuSupport());
      if (currentConfig.customModelUrls) {
        setCustomUrls(currentConfig.customModelUrls);
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const activeModel = MODEL_CATALOG.find((m) => m.id === config.activeModelId) || MODEL_CATALOG[0];

  const handleSelectCloudGemini = () => {
    sound.click();
    const newConfig = { ...config, activeModelId: 'cloud-gemini' };
    setConfig(newConfig);
    saveEngineConfig(newConfig);
    onEngineChanged?.('cloud-gemini');
    toast({
      title: '☁️ Switched to Google Gemini API',
      description: 'Default cloud AI engine activated. Fast, multimodal, and highly intelligent.',
    });
  };

  const handleDownloadAndActivateLocal = async (model: ModelOption) => {
    sound.click();
    if (!gpuInfo.supported) {
      toast({
        variant: 'destructive',
        title: '⚠️ WebGPU Required',
        description: gpuInfo.reason || 'WebGPU is not supported in this browser.',
      });
      return;
    }

    setDownloadingModelId(model.id);
    setDownloadProgress({ progress: 0.05, text: `Starting download for ${model.name}...` });

    const customUrlToUse = customUrls[model.id]?.trim() || undefined;

    try {
      await downloadAndInitModel(
        model.id, 
        (prog) => setDownloadProgress(prog),
        customUrlToUse
      );

      sound.success();
      const updatedConfig = getEngineConfig();
      setConfig(updatedConfig);
      onEngineChanged?.(model.id);

      toast({
        title: `⚡ ${model.name} Ready!`,
        description: `Successfully loaded into IndexedDB. You are now using 100% offline local AI!`,
      });
    } catch (err: any) {
      sound.error();
      toast({
        variant: 'destructive',
        title: 'Download Failed',
        description: err?.message || 'Could not download model. Check your connection.',
      });
    } finally {
      setDownloadingModelId(null);
    }
  };

  const handleDeleteModelCache = async (model: ModelOption) => {
    sound.click();
    try {
      await deleteCachedModel(model.id);
      sound.success();
      const updatedConfig = getEngineConfig();
      setConfig(updatedConfig);
      if (updatedConfig.activeModelId === 'cloud-gemini') {
        onEngineChanged?.('cloud-gemini');
      }
      toast({
        title: '🗑️ Cache Cleared',
        description: `${model.name} files deleted from browser storage.`,
      });
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Error Deleting Cache',
        description: err?.message || 'Failed to purge cache.',
      });
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="relative w-full max-w-2xl max-h-[90vh] flex flex-col bg-card dark:bg-zinc-900 border border-border rounded-2xl shadow-2xl overflow-hidden"
        >
          {/* Modal Header */}
          <div className="flex items-center justify-between p-4 sm:p-5 border-b border-border/80 bg-muted/30">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20">
                <Cpu className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-semibold text-foreground flex items-center gap-2">
                  AI Engine & Local Model Settings
                </h2>
                <p className="text-xs text-muted-foreground">
                  Choose between Cloud Gemini API or 100% Offline On-Device AI Models
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-xl transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* WebGPU Status Banner */}
          <div className="px-4 sm:px-5 pt-4">
            {gpuInfo.supported ? (
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-xs font-medium">
                <WifiOff className="w-4 h-4 shrink-0" />
                <span>WebGPU Active • 100% On-Device Offline AI Ready</span>
              </div>
            ) : (
              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 text-xs">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold">WebGPU Unavailable: </span>
                  <span>{gpuInfo.reason} You can still use the default Cloud Gemini API seamlessly!</span>
                </div>
              </div>
            )}
          </div>

          {/* Active Model Summary Badge */}
          <div className="px-4 sm:px-5 py-3">
            <div className="flex items-center justify-between p-3 rounded-xl bg-muted/50 border border-border/60">
              <div className="flex items-center gap-2.5 text-xs font-medium">
                <span className="text-muted-foreground">Active Engine:</span>
                <span className={`px-2.5 py-1 rounded-lg border text-xs font-bold ${activeModel.badgeColor}`}>
                  {activeModel.name}
                </span>
              </div>
              {activeModel.provider === 'local' && (
                <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                  <HardDrive className="w-3.5 h-3.5" /> 100% Offline
                </span>
              )}
            </div>
          </div>

          {/* Model Options List */}
          <div className="flex-1 overflow-y-auto px-4 sm:px-5 pb-5 space-y-3.5">
            {MODEL_CATALOG.map((model) => {
              const isActive = config.activeModelId === model.id;
              const isDownloaded = config.downloadedModelIds.includes(model.id);
              const isDownloading = downloadingModelId === model.id;
              const isCustomLinkOpen = Boolean(showCustomLinkInput[model.id]);

              return (
                <div
                  key={model.id}
                  className={`p-4 rounded-xl border transition-all ${
                    isActive
                      ? 'border-primary ring-2 ring-primary/20 bg-primary/5 dark:bg-primary/10'
                      : 'border-border/80 bg-card hover:border-border hover:bg-muted/30'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    {/* Model Info */}
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm font-semibold text-foreground">{model.name}</h3>
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold border ${model.badgeColor}`}>
                          {model.badge}
                        </span>
                        {isDownloaded && model.provider === 'local' && (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                            <Check className="w-3 h-3" /> CACHED IN INDEXEDDB
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">{model.tagline}</p>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2 shrink-0">
                      {model.provider === 'cloud' ? (
                        <button
                          onClick={handleSelectCloudGemini}
                          disabled={isActive}
                          className={`px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all flex items-center gap-1.5 ${
                            isActive
                              ? 'bg-emerald-600 text-white font-semibold cursor-default'
                              : 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm'
                          }`}
                        >
                          {isActive ? (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5" /> Selected Engine
                            </>
                          ) : (
                            <>
                              <Wifi className="w-3.5 h-3.5" /> Use Cloud Engine
                            </>
                          )}
                        </button>
                      ) : (
                        <>
                          {isDownloaded ? (
                            <>
                              <button
                                onClick={() => handleDownloadAndActivateLocal(model)}
                                disabled={isDownloading}
                                className={`px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all flex items-center gap-1.5 ${
                                  isActive
                                    ? 'bg-emerald-600 text-white font-semibold cursor-default'
                                    : 'bg-primary text-primary-foreground hover:bg-primary/90'
                                }`}
                              >
                                {isActive ? (
                                  <>
                                    <CheckCircle2 className="w-3.5 h-3.5" /> Active Engine
                                  </>
                                ) : (
                                  <>
                                    <Zap className="w-3.5 h-3.5" /> Switch to Model
                                  </>
                                )}
                              </button>
                              <button
                                onClick={() => handleDeleteModelCache(model)}
                                title="Delete from IndexedDB"
                                className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors border border-border/60"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => handleDownloadAndActivateLocal(model)}
                              disabled={isDownloading || !gpuInfo.supported}
                              className="px-3.5 py-1.5 rounded-xl text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-all flex items-center gap-1.5 shadow-sm"
                            >
                              {isDownloading ? (
                                <>
                                  <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Downloading...
                                </>
                              ) : (
                                <>
                                  <Download className="w-3.5 h-3.5" /> Download ({model.downloadSize})
                                </>
                              )}
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  {/* Custom Supabase/Drive Link Toggle for Local Models */}
                  {model.provider === 'local' && (
                    <div className="mt-2.5 pt-2 border-t border-border/40">
                      <button
                        onClick={() => {
                          setShowCustomLinkInput((prev) => ({
                            ...prev,
                            [model.id]: !prev[model.id],
                          }));
                        }}
                        className="text-[11px] text-muted-foreground hover:text-primary transition-colors flex items-center gap-1 font-medium"
                      >
                        <Link className="w-3 h-3 text-primary" />
                        <span>Use Custom URL (Supabase / Drive / HuggingFace)</span>
                        {isCustomLinkOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                      </button>

                      {isCustomLinkOpen && (
                        <div className="mt-2 space-y-1.5 p-2 rounded-lg bg-muted/40 border border-border/60">
                          <input
                            type="text"
                            placeholder="e.g. https://your-supabase.supabase.co/storage/v1/object/public/models/SmolLM2-135M"
                            value={customUrls[model.id] || ''}
                            onChange={(e) => {
                              setCustomUrls((prev) => ({
                                ...prev,
                                [model.id]: e.target.value,
                              }));
                            }}
                            className="w-full px-2.5 py-1.5 rounded-md bg-card border border-input text-xs font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                          />
                          <p className="text-[10px] text-muted-foreground">
                            Optional: Paste your own Supabase, Google Drive, or custom CDN model repository link.
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Downloading Progress Bar */}
                  {isDownloading && (
                    <div className="mt-3 p-2.5 rounded-lg bg-primary/10 border border-primary/20 space-y-1.5">
                      <div className="flex items-center justify-between text-[11px] text-primary font-medium">
                        <span className="truncate max-w-[80%]">{downloadProgress.text}</span>
                        <span>{Math.round(downloadProgress.progress * 100)}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-primary/20 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary transition-all duration-200 rounded-full"
                          style={{ width: `${Math.round(downloadProgress.progress * 100)}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Specs Pill Grid */}
                  <div className="mt-2.5 pt-2 border-t border-border/40 grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <HardDrive className="w-3 h-3 text-primary/70 shrink-0" />
                      <span>{model.downloadSize}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Smartphone className="w-3 h-3 text-primary/70 shrink-0" />
                      <span className="truncate">{model.recommendedDevice}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Zap className="w-3 h-3 text-primary/70 shrink-0" />
                      <span>{model.speedRating}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-primary/70 shrink-0" />
                      <span>{model.intelligenceRating}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer Note */}
          <div className="p-3 sm:p-4 border-t border-border/80 bg-muted/20 text-center text-[11px] text-muted-foreground flex items-center justify-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-primary shrink-0" />
            <span>Models download directly into IndexedDB storage and run 100% offline with zero server API keys.</span>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
