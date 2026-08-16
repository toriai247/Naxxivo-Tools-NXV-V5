import React, { useState, useRef, useCallback } from "react";
import { Upload, FileImage, Settings2, Download, RefreshCw, X, ArrowRight } from "lucide-react";
import { SeoContentImage } from "@/components/seo/SeoContentImage";
import { motion, AnimatePresence } from "framer-motion";
import { useHistory } from "@/hooks/useHistory";
import { sound } from "@/lib/sound";

type ImageFormat = "image/webp" | "image/jpeg" | "image/png";

interface ProcessedImage {
  originalSize: number;
  newSize: number;
  url: string;
  format: string;
}

export default function ImageConverter() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [dimensions, setDimensions] = useState<{ width: number; height: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  
  const [format, setFormat] = useState<ImageFormat>("image/webp");
  const [quality, setQuality] = useState<number>(80);
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<ProcessedImage | null>(null);
  const [processError, setProcessError] = useState<string | null>(null);
  const { addHistoryItem } = useHistory();
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processImageData = useCallback(
    async (
      sourcePreview: string,
      sourceFile: File,
      targetFormat: ImageFormat,
      targetQuality: number
    ) => {
      setIsProcessing(true);
      setProcessError(null);

      try {
        const img = new Image();
        img.crossOrigin = "anonymous";

        await new Promise((resolve, reject) => {
          img.onload = () => resolve(null);
          img.onerror = () => reject(new Error("Failed to load image element"));
          img.src = sourcePreview;
          if (img.complete) resolve(null);
        });

        const width = img.naturalWidth || img.width;
        const height = img.naturalHeight || img.height;
        setDimensions({ width, height });

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");

        if (!ctx) throw new Error("Could not get canvas context");

        // Fill background white for JPEG conversion (otherwise transparent becomes black)
        if (targetFormat === "image/jpeg") {
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, width, height);
        }

        ctx.drawImage(img, 0, 0, width, height);

        // Export data URL directly for robust preview & download
        const dataUrl = canvas.toDataURL(targetFormat, targetQuality / 100);

        // Get exact blob size
        const blob: Blob | null = await new Promise((resolve) => {
          canvas.toBlob(resolve, targetFormat, targetQuality / 100);
        });

        const newSize = blob ? blob.size : Math.round((dataUrl.length * 3) / 4);
        
        const finalFormat = targetFormat.split("/")[1].toUpperCase();

        setResult({
          originalSize: sourceFile.size,
          newSize,
          url: dataUrl,
          format: finalFormat,
        });
        sound.success();
        
        addHistoryItem({
          type: 'image_conv',
          title: `Converted ${sourceFile.name}`,
          description: `Format: ${finalFormat}, Quality: ${targetQuality}%`
        });
      } catch (error) {
        console.error("Image processing error:", error);
        sound.error();
        setProcessError("Failed to process image. Please try another image file.");
      } finally {
        setIsProcessing(false);
      }
    },
    [addHistoryItem]
  );

  const handleFile = (selectedFile: File) => {
    if (!selectedFile.type.startsWith("image/")) {
      sound.error();
      alert("Please select a valid image file.");
      return;
    }
    
    sound.generate();
    setFile(selectedFile);
    setResult(null);
    setProcessError(null);
    setIsProcessing(true);

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      if (dataUrl) {
        setPreview(dataUrl);
        processImageData(dataUrl, selectedFile, format, quality);
      } else {
        setProcessError("Could not read image file.");
        setIsProcessing(false);
      }
    };
    reader.onerror = () => {
      setProcessError("Failed to read image file.");
      setIsProcessing(false);
    };
    reader.readAsDataURL(selectedFile);
  };

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const onDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  }, []);

  const handleFormatChange = (newFormat: ImageFormat) => {
    sound.tab();
    setFormat(newFormat);
    if (preview && file) {
      processImageData(preview, file, newFormat, quality);
    }
  };

  const handleQualityChange = (newQuality: number) => {
    setQuality(newQuality);
    if (preview && file) {
      processImageData(preview, file, format, newQuality);
    }
  };

  const processImage = () => {
    sound.generate();
    if (preview && file) {
      processImageData(preview, file, format, quality);
    }
  };

  const formatBytes = (bytes: number, decimals = 2) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };

  const getReductionClass = (original: number, newSize: number) => {
    if (newSize < original) return "text-emerald-500";
    if (newSize > original) return "text-amber-500";
    return "text-muted-foreground";
  };

  const reset = () => {
    sound.clear();
    setFile(null);
    setPreview(null);
    setResult(null);
    setDimensions(null);
    setProcessError(null);
  };

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Image Converter & Compressor</h1>
        <p className="text-muted-foreground">Convert images to WebP, PNG, or JPG and reduce file size completely in your browser. No data sent to servers.</p>
      </div>

      <AnimatePresence mode="wait">
        {!file ? (
          <motion.div 
            key="upload"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className={`border-2 border-dashed rounded-xl p-12 flex flex-col items-center justify-center text-center space-y-4 transition-colors cursor-pointer min-h-[300px]
              ${isDragging ? 'border-primary bg-primary/5' : 'border-muted hover:border-primary/50 hover:bg-card/50'}`}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept="image/png, image/jpeg, image/webp, image/gif, image/svg+xml"
              onChange={(e) => e.target.files && e.target.files[0] && handleFile(e.target.files[0])}
            />
            <div className={`p-4 rounded-full transition-colors ${isDragging ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'}`}>
              <Upload className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-lg font-medium">Drag & drop your image here</h3>
              <p className="text-muted-foreground text-sm mt-1">
                or click to browse from your device
              </p>
            </div>
            <div className="flex gap-2 mt-2">
              {['JPG', 'PNG', 'WebP', 'GIF', 'SVG'].map(ext => (
                <span key={ext} className="text-xs font-mono bg-muted px-2 py-1 rounded-md text-muted-foreground">{ext}</span>
              ))}
            </div>
          </motion.div>
        ) : (
          <motion.div 
            key="editor"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-1 md:grid-cols-[1fr_300px] gap-6"
          >
            {/* Preview Section */}
            <div className="bg-card border rounded-xl overflow-hidden shadow-sm flex flex-col">
              <div className="p-4 border-b bg-muted/30 flex items-center justify-between">
                <div className="flex items-center gap-3 overflow-hidden">
                  <FileImage className="w-5 h-5 text-primary shrink-0" />
                  <div className="truncate">
                    <p className="font-medium text-sm truncate">{file.name}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{formatBytes(file.size)}</span>
                      {dimensions && (
                        <>
                          <span>•</span>
                          <span>{dimensions.width} × {dimensions.height} px</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <button 
                  onClick={reset}
                  className="p-1.5 hover:bg-muted rounded-md text-muted-foreground hover:text-foreground transition-colors shrink-0"
                  title="Remove image"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              
              <div className="flex-1 bg-black/5 dark:bg-black/20 p-4 flex items-center justify-center min-h-[300px] relative overflow-hidden checkerboard-bg">
                {isProcessing && !result ? (
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <RefreshCw className="w-8 h-8 animate-spin text-primary" />
                    <span className="text-sm font-medium">Processing image...</span>
                  </div>
                ) : processError ? (
                  <div className="text-center p-6 text-destructive space-y-2">
                    <p className="font-medium">{processError}</p>
                    <button
                      onClick={reset}
                      className="text-xs text-muted-foreground underline hover:text-foreground"
                    >
                      Try another file
                    </button>
                  </div>
                ) : (
                  <img 
                    src={result ? result.url : preview!} 
                    alt="Converted Preview" 
                    className="max-w-full max-h-[400px] object-contain rounded-md shadow-sm"
                    referrerPolicy="no-referrer"
                  />
                )}
              </div>
              
              {result && (
                <div className="p-4 border-t bg-muted/10">
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-4 w-full sm:w-auto">
                      <div className="text-center sm:text-left">
                         <p className="text-xs text-muted-foreground uppercase tracking-wider">Original</p>
                         <p className="font-mono text-sm">{formatBytes(result.originalSize)}</p>
                      </div>
                      <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />
                      <div className="text-center sm:text-left">
                         <p className="text-xs text-muted-foreground uppercase tracking-wider">{result.format}</p>
                         <p className={`font-mono text-sm font-semibold ${getReductionClass(result.originalSize, result.newSize)}`}>
                           {formatBytes(result.newSize)}
                         </p>
                      </div>
                      
                      {result.originalSize > result.newSize ? (
                        <span className="ml-auto sm:ml-4 bg-emerald-500/10 text-emerald-500 text-xs font-bold px-2 py-1 rounded-full">
                          -{Math.round((1 - result.newSize / result.originalSize) * 100)}%
                        </span>
                      ) : result.originalSize < result.newSize ? (
                        <span className="ml-auto sm:ml-4 bg-amber-500/10 text-amber-500 text-xs font-bold px-2 py-1 rounded-full">
                          +{Math.round((result.newSize / result.originalSize - 1) * 100)}%
                        </span>
                      ) : null}
                    </div>
                    
                    <a
                      href={result.url}
                      onClick={() => sound.download()}
                      download={`converted-${file.name.replace(/\.[^/.]+$/, "")}.${result.format.toLowerCase()}`}
                      className="w-full sm:w-auto bg-primary text-primary-foreground hover:bg-primary/90 px-6 py-2 rounded-md font-medium transition-colors flex items-center justify-center gap-2 shadow-sm"
                    >
                      <Download className="w-4 h-4" /> Download
                    </a>
                  </div>
                </div>
              )}
            </div>

            {/* Controls Section */}
            <div className="bg-card border rounded-xl p-6 shadow-sm flex flex-col gap-6">
              <div className="flex items-center gap-2 text-lg font-semibold border-b pb-4">
                <Settings2 className="w-5 h-5 text-primary" />
                Settings
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium block mb-2">Output Format</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { val: "image/webp", label: "WebP" },
                      { val: "image/jpeg", label: "JPG" },
                      { val: "image/png", label: "PNG" }
                    ].map(fmt => (
                      <button
                        key={fmt.val}
                        onClick={() => handleFormatChange(fmt.val as ImageFormat)}
                        className={`py-2 text-sm font-medium rounded-md transition-colors ${
                          format === fmt.val 
                            ? 'bg-primary text-primary-foreground shadow-sm' 
                            : 'bg-muted text-muted-foreground hover:bg-muted/80'
                        }`}
                      >
                        {fmt.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className={`transition-opacity ${format === "image/png" ? "opacity-50 pointer-events-none" : "opacity-100"}`}>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium">Quality</label>
                    <span className="text-xs font-mono bg-muted px-2 py-0.5 rounded text-muted-foreground">{quality}%</span>
                  </div>
                  <input 
                    type="range" 
                    min="10" 
                    max="100" 
                    step="5"
                    value={quality}
                    onChange={(e) => handleQualityChange(Number(e.target.value))}
                    className="w-full accent-primary"
                  />
                  <p className="text-xs text-muted-foreground mt-2">
                    Lower quality means smaller file size. Not applicable for PNG.
                  </p>
                </div>
              </div>

              <div className="mt-auto pt-6">
                <button
                  onClick={processImage}
                  disabled={isProcessing}
                  className="w-full bg-foreground text-background hover:bg-foreground/90 py-3 rounded-md font-semibold transition-colors flex items-center justify-center gap-2 shadow-sm disabled:opacity-70"
                >
                  {isProcessing ? (
                    <RefreshCw className="w-5 h-5 animate-spin" />
                  ) : (
                    "Re-Convert Image"
                  )}
                </button>
                {result && (
                  <button
                    onClick={reset}
                    className="w-full mt-3 bg-muted text-foreground hover:bg-muted/80 py-2.5 rounded-md font-medium transition-colors text-sm"
                  >
                    Process Another Image
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* SEO: How-to guide + WebP deep dive */}
      <SeoContentImage />

      {/* Custom CSS for checkerboard pattern */}
      <style>{`
        .checkerboard-bg {
          background-image: 
            linear-gradient(45deg, rgba(128,128,128,0.1) 25%, transparent 25%), 
            linear-gradient(-45deg, rgba(128,128,128,0.1) 25%, transparent 25%), 
            linear-gradient(45deg, transparent 75%, rgba(128,128,128,0.1) 75%), 
            linear-gradient(-45deg, transparent 75%, rgba(128,128,128,0.1) 75%);
          background-size: 20px 20px;
          background-position: 0 0, 0 10px, 10px -10px, -10px 0px;
        }
      `}</style>
    </div>
  );
}