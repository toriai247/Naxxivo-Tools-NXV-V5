import React, { useState, useRef } from 'react';
import { UploadCloud, Image as ImageIcon, Check, Loader2, Link2, X, Sparkles, AlertCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { uploadImageToImgBB, formatFileSize, UploadResult } from '@/lib/imageUploader';
import { useToast } from '@/hooks/use-toast';

interface ImageUploadInputProps {
  value: string;
  onChange: (url: string) => void;
  label?: string;
  placeholder?: string;
  required?: boolean;
  helpText?: string;
  previewSize?: 'sm' | 'md' | 'lg';
}

export function ImageUploadInput({
  value,
  onChange,
  label = "Image URL",
  placeholder = "https://i.ibb.co/... or upload below",
  required = false,
  helpText = "Upload any image (1-5MB+) — it will automatically compress to lightweight WebP & upload to ImgBB cloud.",
  previewSize = 'md'
}: ImageUploadInputProps) {
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string>('');
  const [uploadStats, setUploadStats] = useState<UploadResult | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid File Type",
        description: "Please select an image file (PNG, JPG, JPEG, WEBP, etc.).",
        variant: "destructive"
      });
      return;
    }

    setUploading(true);
    setUploadStats(null);

    try {
      const result = await uploadImageToImgBB(file, (status, info) => {
        if (status === 'compressing') {
          setUploadStatus('Auto-compressing to WebP format...');
        } else if (status === 'uploading') {
          setUploadStatus(info || 'Uploading to ImgBB Cloud...');
        } else {
          setUploadStatus('Finalizing image URL...');
        }
      });

      setUploadStats(result);
      onChange(result.url);

      toast({
        title: "Image Uploaded! 🚀",
        description: `Compressed from ${formatFileSize(result.originalSize)} to ${formatFileSize(result.compressedSize)} (${result.savedPercent}% saved)!`,
      });
    } catch (err: any) {
      console.error(err);
      toast({
        title: "Upload Failed",
        description: err.message || "Could not upload image to ImgBB.",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
      setUploadStatus('');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFile(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFile(file);
    }
  };

  return (
    <div className="space-y-2">
      {label && (
        <div className="flex items-center justify-between">
          <label className="block font-semibold text-foreground text-xs">{label}</label>
          {uploadStats && (
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1 bg-emerald-500/10 px-2 py-0.5 rounded-full">
              <Sparkles className="w-3 h-3" />
              {formatFileSize(uploadStats.originalSize)} ➔ {formatFileSize(uploadStats.compressedSize)} ({uploadStats.savedPercent}% saved)
            </span>
          )}
        </div>
      )}

      {/* URL Input Row with Upload Button */}
      <div className="flex gap-2 items-center">
        <div className="relative flex-1">
          <Link2 className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <Input
            type="url"
            placeholder={placeholder}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            required={required}
            className="pl-9 pr-8 text-xs font-mono"
          />
          {value && (
            <button
              type="button"
              onClick={() => onChange('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs"
              title="Clear URL"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileInputChange}
        />

        {/* 1-Click Upload Button */}
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={uploading}
          onClick={() => fileInputRef.current?.click()}
          className="shrink-0 gap-1.5 text-xs font-semibold bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20"
        >
          {uploading ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Uploading...</span>
            </>
          ) : (
            <>
              <UploadCloud className="w-3.5 h-3.5" />
              <span>Upload Image</span>
            </>
          )}
        </Button>
      </div>

      {/* Drag & Drop Mini Area / Status Box */}
      {uploading ? (
        <div className="p-3 rounded-xl border border-primary/30 bg-primary/5 flex items-center justify-center gap-2.5 text-xs text-primary animate-pulse">
          <Loader2 className="w-4 h-4 animate-spin text-primary" />
          <span className="font-medium">{uploadStatus || 'Processing & uploading image...'}</span>
        </div>
      ) : (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`p-2.5 rounded-xl border border-dashed transition-all duration-200 cursor-pointer flex items-center justify-between text-xs ${
            dragOver
              ? 'border-primary bg-primary/10 text-primary'
              : 'border-border/80 hover:border-primary/50 bg-background/50 hover:bg-muted/30 text-muted-foreground'
          }`}
        >
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
              <UploadCloud className="w-3.5 h-3.5" />
            </div>
            <span>Drop image here or <strong className="text-foreground underline">browse files</strong></span>
          </div>
          <span className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded-md font-mono">
            Auto-WebP ⚡
          </span>
        </div>
      )}

      {/* Live Thumbnail Preview */}
      {value && (
        <div className="flex items-center gap-3 p-2.5 rounded-xl bg-card border border-border/60 shadow-sm mt-2">
          <img
            src={value}
            alt="Preview"
            className="w-12 h-12 rounded-lg object-cover border border-border shrink-0 bg-muted"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-semibold text-foreground truncate">Direct Image URL Ready</p>
            <p className="text-[10px] text-muted-foreground truncate font-mono">{value}</p>
          </div>
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                navigator.clipboard.writeText(value);
                toast({ title: "Copied! 📋", description: "Direct image URL copied to clipboard." });
              }}
              className="h-7 px-2 text-[10px]"
            >
              Copy Link
            </Button>
          </div>
        </div>
      )}

      {helpText && !value && (
        <p className="text-[11px] text-muted-foreground flex items-center gap-1">
          <AlertCircle className="w-3 h-3 shrink-0 text-primary/70" />
          <span>{helpText}</span>
        </p>
      )}
    </div>
  );
}
