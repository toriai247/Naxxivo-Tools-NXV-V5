import React, { useState, useCallback } from 'react';
import Cropper, { Area, Point } from 'react-easy-crop';
import { 
  Crop, 
  RotateCw, 
  RotateCcw, 
  ZoomIn, 
  ZoomOut, 
  FlipHorizontal, 
  FlipVertical, 
  Check, 
  RefreshCw, 
  ExternalLink,
  Sliders,
  Sparkles,
  Download,
  Copy,
  Layers
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import getCroppedImg, { FlipState } from '@/lib/cropImage';
import { sound } from '@/lib/sound';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Link } from 'wouter';

export interface AspectRatioOption {
  label: string;
  sublabel: string;
  value: number | undefined;
}

export const BOT_ASPECT_RATIOS: AspectRatioOption[] = [
  { label: 'Free', sublabel: 'Custom', value: undefined },
  { label: '1:1', sublabel: 'Square / DP', value: 1 / 1 },
  { label: '16:9', sublabel: 'YouTube (16:9)', value: 16 / 9 },
  { label: '9:16', sublabel: 'Shorts / Reels', value: 9 / 16 },
  { label: '4:3', sublabel: 'Standard', value: 4 / 3 },
  { label: '3:2', sublabel: 'Classic Photo', value: 3 / 2 },
];

export interface CropResultPayload {
  fileUrl: string;
  blob: Blob;
  width: number;
  height: number;
  size: number;
  sizeStr: string;
  format: string;
  aspectLabel: string;
}

interface InChatCropperProps {
  imageUrl: string;
  fileName: string;
  initialAspect?: number;
  initialPreset?: string;
  onApplyCrop: (result: CropResultPayload) => void;
  onCancel?: () => void;
}

export function InChatCropper({
  imageUrl,
  fileName,
  initialAspect,
  initialPreset = 'Free',
  onApplyCrop,
  onCancel,
}: InChatCropperProps) {
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState<number>(1);
  const [rotation, setRotation] = useState<number>(0);
  const [aspect, setAspect] = useState<number | undefined>(initialAspect);
  const [selectedPresetLabel, setSelectedPresetLabel] = useState<string>(initialPreset);
  const [flip, setFlip] = useState<FlipState>({ horizontal: false, vertical: false });
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

  const [outputFormat, setOutputFormat] = useState<'image/png' | 'image/jpeg' | 'image/webp'>('image/png');
  const [quality, setQuality] = useState<number>(92);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [showAdvanced, setShowAdvanced] = useState<boolean>(false);

  const onCropComplete = useCallback((_croppedArea: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handlePresetSelect = (preset: AspectRatioOption) => {
    sound.click();
    setAspect(preset.value);
    setSelectedPresetLabel(preset.label);
  };

  const handleRotate = (deg: number) => {
    sound.click();
    setRotation((prev) => (prev + deg) % 360);
  };

  const handleFlip = (axis: 'horizontal' | 'vertical') => {
    sound.click();
    setFlip((prev) => ({ ...prev, [axis]: !prev[axis] }));
  };

  const handleReset = () => {
    sound.click();
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setRotation(0);
    setAspect(undefined);
    setSelectedPresetLabel('Free');
    setFlip({ horizontal: false, vertical: false });
  };

  const handleApply = async () => {
    if (!croppedAreaPixels) return;
    sound.generate();
    setIsProcessing(true);

    try {
      const cropped = await getCroppedImg(
        imageUrl,
        croppedAreaPixels,
        rotation,
        flip,
        outputFormat,
        quality / 100
      );

      const sizeKb = cropped.size / 1024;
      const sizeStr = sizeKb > 1024 ? `${(sizeKb / 1024).toFixed(2)} MB` : `${sizeKb.toFixed(1)} KB`;
      const formatStr = outputFormat === 'image/png' ? 'PNG' : outputFormat === 'image/jpeg' ? 'JPEG' : 'WebP';

      sound.success();
      onApplyCrop({
        fileUrl: cropped.fileUrl,
        blob: cropped.blob,
        width: cropped.width,
        height: cropped.height,
        size: cropped.size,
        sizeStr,
        format: formatStr,
        aspectLabel: selectedPresetLabel,
      });
    } catch (err) {
      console.error('Crop execution error:', err);
      sound.error();
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="w-full bg-card border border-border/80 rounded-2xl overflow-hidden shadow-md space-y-3 p-3">
      {/* Header Info */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
            <Crop className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-foreground">Interactive Image Cropper</h4>
            <p className="text-[10px] text-muted-foreground truncate max-w-[200px] sm:max-w-xs">{fileName}</p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <Link
            href="/crop"
            className="text-[11px] text-muted-foreground hover:text-primary flex items-center gap-1 px-2 py-1 rounded-md hover:bg-muted transition-colors"
            title="Open Full Image Cropper Studio"
          >
            <ExternalLink className="w-3 h-3" />
            <span className="hidden sm:inline">Studio</span>
          </Link>
          {onCancel && (
            <button
              onClick={onCancel}
              className="text-[11px] text-muted-foreground hover:text-foreground px-2 py-1 rounded-md hover:bg-muted"
            >
              Cancel
            </button>
          )}
        </div>
      </div>

      {/* Cropper Viewport */}
      <div className="relative w-full h-64 sm:h-72 rounded-xl overflow-hidden bg-black/90 border shadow-inner">
        <Cropper
          image={imageUrl}
          crop={crop}
          zoom={zoom}
          rotation={rotation}
          aspect={aspect}
          transform={`scale(${flip.horizontal ? -1 : 1}, ${flip.vertical ? -1 : 1})`}
          onCropChange={setCrop}
          onZoomChange={setZoom}
          onRotationChange={setRotation}
          onCropComplete={onCropComplete}
          showGrid={true}
          style={{
            containerStyle: {
              borderRadius: '0.75rem',
            },
            cropAreaStyle: {
              border: '2px solid #10b981',
              boxShadow: '0 0 0 9999em rgba(0, 0, 0, 0.65)',
            },
          }}
        />

        {/* Floating preset badge indicator */}
        <div className="absolute top-2 left-2 pointer-events-none">
          <Badge className="bg-black/70 text-white border-white/20 text-[10px] font-mono backdrop-blur-md">
            {selectedPresetLabel} {aspect ? `(${aspect.toFixed(2)})` : ''}
          </Badge>
        </div>
      </div>

      {/* Aspect Ratio Buttons */}
      <div className="space-y-1.5">
        <label className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1 px-0.5">
          <Layers className="w-3 h-3 text-emerald-500" />
          <span>Aspect Ratio Presets:</span>
        </label>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
          {BOT_ASPECT_RATIOS.map((item) => {
            const isSelected = selectedPresetLabel === item.label;
            return (
              <button
                key={item.label}
                type="button"
                onClick={() => handlePresetSelect(item)}
                className={`px-2 py-1.5 rounded-lg text-xs font-semibold flex flex-col items-center justify-center transition-all border ${
                  isSelected
                    ? 'bg-emerald-500 text-white border-emerald-600 shadow-sm'
                    : 'bg-muted/60 hover:bg-muted text-foreground border-transparent hover:border-border'
                }`}
              >
                <span className="leading-tight">{item.label}</span>
                <span className={`text-[9px] ${isSelected ? 'text-white/80' : 'text-muted-foreground'}`}>
                  {item.sublabel}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Transform Controls Toolbar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t">
        {/* Zoom Control */}
        <div className="p-2 rounded-xl bg-muted/40 border space-y-1.5">
          <div className="flex items-center justify-between text-[11px]">
            <span className="font-semibold text-foreground flex items-center gap-1">
              <ZoomIn className="w-3 h-3 text-emerald-500" /> Zoom
            </span>
            <span className="font-mono text-muted-foreground">{zoom.toFixed(1)}x</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setZoom((z) => Math.max(1, z - 0.1))}
              className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <Slider
              value={[zoom]}
              min={1}
              max={3}
              step={0.05}
              onValueChange={([val]) => setZoom(val)}
              className="flex-1"
            />
            <button
              onClick={() => setZoom((z) => Math.min(3, z + 0.1))}
              className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Rotate & Flip Toolbar */}
        <div className="p-2 rounded-xl bg-muted/40 border flex items-center justify-between">
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleRotate(-90)}
              className="h-8 px-2 text-xs gap-1"
              title="Rotate Counter-Clockwise"
            >
              <RotateCcw className="w-3.5 h-3.5" /> -90°
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleRotate(90)}
              className="h-8 px-2 text-xs gap-1"
              title="Rotate Clockwise"
            >
              <RotateCw className="w-3.5 h-3.5" /> +90°
            </Button>
          </div>

          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant={flip.horizontal ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleFlip('horizontal')}
              className="h-8 w-8 p-0"
              title="Flip Horizontal"
            >
              <FlipHorizontal className="w-3.5 h-3.5" />
            </Button>
            <Button
              type="button"
              variant={flip.vertical ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleFlip('vertical')}
              className="h-8 w-8 p-0"
              title="Flip Vertical"
            >
              <FlipVertical className="w-3.5 h-3.5" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleReset}
              className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
              title="Reset Transform"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Format & Advanced Accordion */}
      <div className="pt-1">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold text-muted-foreground">Export:</span>
            {(['image/png', 'image/jpeg', 'image/webp'] as const).map((fmt) => (
              <button
                key={fmt}
                type="button"
                onClick={() => {
                  sound.click();
                  setOutputFormat(fmt);
                }}
                className={`px-2 py-0.5 rounded text-[11px] font-bold transition-all ${
                  outputFormat === fmt
                    ? 'bg-primary text-primary-foreground shadow-xs'
                    : 'bg-muted/70 text-muted-foreground hover:text-foreground'
                }`}
              >
                {fmt === 'image/png' ? 'PNG' : fmt === 'image/jpeg' ? 'JPG' : 'WebP'}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setShowAdvanced((p) => !p)}
            className="text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-1"
          >
            <Sliders className="w-3 h-3" />
            <span>{showAdvanced ? 'Hide' : 'Quality'}</span>
          </button>
        </div>

        {showAdvanced && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="pt-2 px-1 space-y-1"
          >
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-muted-foreground">Quality Compression:</span>
              <span className="font-mono font-bold text-emerald-500">{quality}%</span>
            </div>
            <Slider
              value={[quality]}
              min={20}
              max={100}
              step={5}
              onValueChange={([val]) => setQuality(val)}
            />
          </motion.div>
        )}
      </div>

      {/* Main Execution CTA */}
      <div className="pt-2 flex items-center gap-2">
        <Button
          type="button"
          onClick={handleApply}
          disabled={isProcessing}
          className="flex-1 h-10 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl shadow-md shadow-emerald-600/20 gap-2"
        >
          {isProcessing ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Processing Crop...</span>
            </>
          ) : (
            <>
              <Crop className="w-4 h-4" />
              <span>✂️ Apply & Crop Image Now</span>
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

export function InChatCropResultCard({
  result,
  onReCrop,
}: {
  result: CropResultPayload;
  onReCrop?: () => void;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopyLink = async () => {
    sound.click();
    try {
      await navigator.clipboard.writeText(result.fileUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  return (
    <div className="p-3.5 rounded-2xl bg-card border border-border shadow-md space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 font-bold text-xs text-foreground">
          <Check className="w-4 h-4 text-emerald-500" />
          <span>Image Cropped Successfully!</span>
        </div>
        <Badge variant="outline" className="text-[10px] border-emerald-500/30 text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-500/10">
          {result.aspectLabel} ({result.width} × {result.height}px)
        </Badge>
      </div>

      {/* Cropped Image Output Preview */}
      <div className="relative rounded-xl overflow-hidden border bg-black/40 flex items-center justify-center max-h-72">
        <img
          src={result.fileUrl}
          alt="Cropped Preview"
          className="max-h-72 w-full object-contain rounded-lg shadow-sm"
        />
      </div>

      {/* Meta Specs */}
      <div className="grid grid-cols-3 gap-2 text-center py-1">
        <div className="p-2 rounded-lg bg-muted/50 border">
          <span className="block text-[10px] text-muted-foreground">Dimensions</span>
          <strong className="text-xs font-bold text-foreground">{result.width} × {result.height}</strong>
        </div>
        <div className="p-2 rounded-lg bg-muted/50 border">
          <span className="block text-[10px] text-muted-foreground">File Size</span>
          <strong className="text-xs font-bold text-emerald-500">{result.sizeStr}</strong>
        </div>
        <div className="p-2 rounded-lg bg-muted/50 border">
          <span className="block text-[10px] text-muted-foreground">Format</span>
          <strong className="text-xs font-bold text-foreground">{result.format}</strong>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between pt-1 gap-2">
        {onReCrop && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              sound.click();
              onReCrop();
            }}
            className="text-xs h-9 gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Re-Crop</span>
          </Button>
        )}

        <div className="flex items-center gap-1.5 ml-auto">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleCopyLink}
            className="text-xs h-9 gap-1 text-muted-foreground hover:text-foreground"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </Button>

          <a
            href={result.fileUrl}
            download={`cropped-image-${result.width}x${result.height}.${result.format.toLowerCase() === 'jpeg' ? 'jpg' : result.format.toLowerCase()}`}
            onClick={() => sound.download()}
            className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-emerald-600/20 transition-all"
          >
            <Download className="w-4 h-4" />
            <span>Download High-Res</span>
          </a>
        </div>
      </div>
    </div>
  );
}
