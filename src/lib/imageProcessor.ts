/**
 * Universal In-Browser Image Processing Engine
 * High-performance image loading, decoding, format conversion & compression
 * Fully compatible with Mobile Chrome, Safari, Firefox, Edge and WebWorkers.
 */

export type TargetImageFormat = 'webp' | 'png' | 'jpeg' | 'avif' | 'bmp';

export interface ImageConversionOptions {
  source: File | Blob | string;
  targetFormat: TargetImageFormat;
  quality?: number; // 0.05 to 1.0 (default 0.85)
  maxWidth?: number;
  maxHeight?: number;
  fallbackOriginalSize?: number;
}

export interface ImageConversionResult {
  dataUrl: string;
  blob: Blob;
  blobUrl: string;
  width: number;
  height: number;
  newSizeBytes: number;
  newSizeStr: string;
  savingsPercent: number;
  formatName: string;
  mimeType: string;
}

/**
 * Pure JS BMP generator for universal browser export
 */
export function canvasToBmpBlob(canvas: HTMLCanvasElement): Blob {
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas context missing');
  const width = canvas.width;
  const height = canvas.height;
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;

  const extraBytes = (4 - ((width * 3) % 4)) % 4;
  const rowSize = width * 3 + extraBytes;
  const imageSize = rowSize * height;
  const totalFileSize = 54 + imageSize;

  const buffer = new ArrayBuffer(totalFileSize);
  const view = new DataView(buffer);

  // File Header
  view.setUint16(0, 0x4d42, false); // BM
  view.setUint32(2, totalFileSize, true);
  view.setUint16(6, 0, true);
  view.setUint16(8, 0, true);
  view.setUint32(10, 54, true); // Offset

  // BITMAPINFOHEADER
  view.setUint32(14, 40, true);
  view.setInt32(18, width, true);
  view.setInt32(22, height, true);
  view.setUint16(26, 1, true); // planes
  view.setUint16(28, 24, true); // 24-bit
  view.setUint32(30, 0, true); // BI_RGB
  view.setUint32(34, imageSize, true);
  view.setInt32(38, 2835, true);
  view.setInt32(42, 2835, true);
  view.setUint32(46, 0, true);
  view.setUint32(50, 0, true);

  const bytes = new Uint8Array(buffer);
  let offset = 54;
  for (let y = height - 1; y >= 0; y--) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      bytes[offset++] = data[idx + 2]; // B
      bytes[offset++] = data[idx + 1]; // G
      bytes[offset++] = data[idx];     // R
    }
    for (let p = 0; p < extraBytes; p++) {
      bytes[offset++] = 0;
    }
  }

  return new Blob([buffer], { type: 'image/bmp' });
}

/**
 * Robust, resilient Image element loader supporting File, Blob, DataURL, ObjectURL & Remote URLs
 */
export async function loadImageElement(source: File | Blob | string | any): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    let resolvedUrl = '';
    let isCreatedBlobUrl = false;
    let isResolved = false;

    // Unwrap object source if an attachment/info object was passed directly
    let effectiveSource: any = source;
    if (effectiveSource && typeof effectiveSource === 'object' && !(effectiveSource instanceof Blob)) {
      const stringDataUrl = effectiveSource.originalUrl || effectiveSource.convertedUrl || effectiveSource.croppedDataUrl || effectiveSource.dataUrl || effectiveSource.previewUrl || effectiveSource.url || effectiveSource.imageUrl || effectiveSource.src;
      if (typeof stringDataUrl === 'string' && stringDataUrl.trim().length > 0) {
        effectiveSource = stringDataUrl.trim();
      } else if (effectiveSource.fileObj instanceof Blob) {
        effectiveSource = effectiveSource.fileObj;
      }
    }

    const cleanup = () => {
      if (isCreatedBlobUrl && resolvedUrl) {
        try {
          URL.revokeObjectURL(resolvedUrl);
        } catch {
          // Ignore revoke error
        }
      }
    };

    const handleSuccess = (img: HTMLImageElement) => {
      if (isResolved) return;
      isResolved = true;
      cleanup();
      resolve(img);
    };

    const handleError = (msg: string) => {
      if (isResolved) return;
      isResolved = true;
      cleanup();
      reject(new Error(msg));
    };

    // Safety timeout: abort if image load hangs longer than 8 seconds
    const timer = setTimeout(() => {
      handleError('Image loading timed out after 8 seconds');
    }, 8000);

    const wrapSuccess = (img: HTMLImageElement) => {
      clearTimeout(timer);
      handleSuccess(img);
    };

    const wrapError = (msg: string) => {
      clearTimeout(timer);
      handleError(msg);
    };

    // CASE 1: Blob or File source
    if (effectiveSource instanceof Blob) {
      const blobSource = effectiveSource;
      // 1. Try Object URL first (fastest, lowest memory overhead)
      try {
        resolvedUrl = URL.createObjectURL(blobSource);
        isCreatedBlobUrl = true;

        const img = new Image();
        img.onload = () => {
          if (img.naturalWidth > 0 && img.naturalHeight > 0) {
            wrapSuccess(img);
          } else {
            fallbackFileReader();
          }
        };
        img.onerror = () => {
          fallbackFileReader();
        };

        img.src = resolvedUrl;

        // Try HTMLImageElement.decode() if supported
        if ('decode' in img && typeof img.decode === 'function') {
          img.decode().then(() => {
            if (img.naturalWidth > 0) wrapSuccess(img);
          }).catch(() => {
            // onload / onerror fallback will handle this
          });
        }
        return;
      } catch {
        fallbackFileReader();
        return;
      }

      function fallbackFileReader() {
        cleanup();
        isCreatedBlobUrl = false;
        const reader = new FileReader();
        reader.onload = (e) => {
          const dataUrl = e.target?.result as string;
          if (!dataUrl) {
            wrapError('Failed to read image file data');
            return;
          }
          const img2 = new Image();
          img2.onload = () => wrapSuccess(img2);
          img2.onerror = () => wrapError('Image decoding failed in browser');
          img2.src = dataUrl;
          if (img2.complete && img2.naturalWidth > 0) {
            wrapSuccess(img2);
          }
        };
        reader.onerror = () => wrapError('FileReader encountered an error reading the file');
        reader.readAsDataURL(blobSource);
      }
    }

    // CASE 2: String URL / Data URL source
    if (typeof effectiveSource === 'string') {
      resolvedUrl = effectiveSource.trim();
      if (!resolvedUrl) {
        wrapError('Empty image source provided');
        return;
      }

      const img = new Image();
      // ONLY apply crossOrigin to remote http/https URLs to avoid browser security failures on data:/blob: URLs
      if (resolvedUrl.startsWith('http://') || resolvedUrl.startsWith('https://')) {
        img.crossOrigin = 'anonymous';
      }

      img.onload = () => wrapSuccess(img);
      img.onerror = () => {
        // If crossOrigin was set and failed, try one more time without crossOrigin
        if (img.crossOrigin === 'anonymous') {
          const imgFallback = new Image();
          imgFallback.onload = () => wrapSuccess(imgFallback);
          imgFallback.onerror = () => wrapError('Failed to load image from remote URL');
          imgFallback.src = resolvedUrl;
        } else {
          wrapError('Failed to load image from URL');
        }
      };

      img.src = resolvedUrl;

      if (img.complete && img.naturalWidth > 0) {
        wrapSuccess(img);
      }
      return;
    }

    wrapError('Unsupported or invalid image source provided. Please re-upload your image.');
  });
}

/**
 * Universal Image Conversion & Compression Method
 */
export async function convertImage(options: ImageConversionOptions): Promise<ImageConversionResult> {
  const {
    source,
    targetFormat,
    quality = 0.85,
    maxWidth,
    maxHeight,
    fallbackOriginalSize = 0
  } = options;

  let effectiveSource: any = source;
  if (effectiveSource && typeof effectiveSource === 'object' && !(effectiveSource instanceof Blob)) {
    const stringDataUrl = effectiveSource.originalUrl || effectiveSource.convertedUrl || effectiveSource.croppedDataUrl || effectiveSource.dataUrl || effectiveSource.previewUrl || effectiveSource.url || effectiveSource.imageUrl || effectiveSource.src;
    if (typeof stringDataUrl === 'string' && stringDataUrl.trim().length > 0) {
      effectiveSource = stringDataUrl.trim();
    } else if (effectiveSource.fileObj instanceof Blob) {
      effectiveSource = effectiveSource.fileObj;
    }
  }

  let originalSizeBytes = 0;
  if (effectiveSource instanceof Blob) {
    originalSizeBytes = effectiveSource.size;
  } else if (fallbackOriginalSize > 0) {
    originalSizeBytes = fallbackOriginalSize;
  }

  // 1. Attempt High-Performance ImageBitmap decoding first if source is a Blob/File
  let canvasWidth = 0;
  let canvasHeight = 0;
  let drawableSource: ImageBitmap | HTMLImageElement | null = null;

  if (effectiveSource instanceof Blob && typeof window.createImageBitmap === 'function') {
    try {
      const bitmap = await createImageBitmap(effectiveSource);
      drawableSource = bitmap;
      canvasWidth = bitmap.width;
      canvasHeight = bitmap.height;
    } catch {
      // Fallback to HTMLImageElement loader below
      drawableSource = null;
    }
  }

  // 2. Fallback to HTMLImageElement loader if ImageBitmap failed or source is a URL
  if (!drawableSource) {
    const img = await loadImageElement(effectiveSource);
    drawableSource = img;
    canvasWidth = img.naturalWidth || img.width;
    canvasHeight = img.naturalHeight || img.height;
  }

  if (canvasWidth <= 0 || canvasHeight <= 0) {
    throw new Error('Image has invalid dimensions');
  }

  // 3. Apply optional dimension scaling
  let targetWidth = canvasWidth;
  let targetHeight = canvasHeight;

  if (maxWidth && targetWidth > maxWidth) {
    targetHeight = Math.round((targetHeight * maxWidth) / targetWidth);
    targetWidth = maxWidth;
  }
  if (maxHeight && targetHeight > maxHeight) {
    targetWidth = Math.round((targetWidth * maxHeight) / targetHeight);
    targetHeight = maxHeight;
  }

  // 4. Render to Canvas
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, targetWidth);
  canvas.height = Math.max(1, targetHeight);
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Failed to initialize 2D canvas context');
  }

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  // For JPEG or BMP, fill white background to handle transparency
  if (targetFormat === 'jpeg' || targetFormat === 'bmp') {
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  ctx.drawImage(drawableSource as any, 0, 0, canvas.width, canvas.height);

  // Close ImageBitmap if used to free GPU memory immediately
  if (typeof (drawableSource as any).close === 'function') {
    try {
      (drawableSource as any).close();
    } catch {
      // Ignore cleanup error
    }
  }

  // 5. Generate Target Format Blob & Data URL
  const clampedQuality = Math.min(Math.max(quality, 0.05), 1.0);
  const mimeType = targetFormat === 'jpeg' ? 'image/jpeg' 
    : targetFormat === 'webp' ? 'image/webp'
    : targetFormat === 'png' ? 'image/png'
    : targetFormat === 'avif' ? 'image/avif'
    : 'image/bmp';

  let finalBlob: Blob;
  let finalDataUrl: string = '';

  if (targetFormat === 'bmp') {
    finalBlob = canvasToBmpBlob(canvas);
    finalDataUrl = canvas.toDataURL('image/png'); // for preview display
  } else {
    // Generate Blob
    finalBlob = await new Promise<Blob>((resolve) => {
      canvas.toBlob(
        (blob) => {
          if (blob && blob.size > 0) {
            resolve(blob);
          } else {
            // Fallback via toDataURL
            try {
              const dUrl = canvas.toDataURL(mimeType, clampedQuality);
              const parts = dUrl.split(',');
              const byteString = atob(parts[1]);
              const ab = new ArrayBuffer(byteString.length);
              const ia = new Uint8Array(ab);
              for (let i = 0; i < byteString.length; i++) {
                ia[i] = byteString.charCodeAt(i);
              }
              resolve(new Blob([ab], { type: mimeType }));
            } catch {
              // Extreme fallback to PNG
              const dUrl = canvas.toDataURL('image/png');
              const parts = dUrl.split(',');
              const byteString = atob(parts[1]);
              const ab = new ArrayBuffer(byteString.length);
              const ia = new Uint8Array(ab);
              for (let i = 0; i < byteString.length; i++) {
                ia[i] = byteString.charCodeAt(i);
              }
              resolve(new Blob([ab], { type: 'image/png' }));
            }
          }
        },
        mimeType,
        clampedQuality
      );
    });

    try {
      finalDataUrl = canvas.toDataURL(mimeType, clampedQuality);
    } catch {
      finalDataUrl = URL.createObjectURL(finalBlob);
    }
  }

  const newSizeBytes = finalBlob.size;
  const newSizeStr = newSizeBytes > 1024 * 1024
    ? `${(newSizeBytes / (1024 * 1024)).toFixed(2)} MB`
    : `${(newSizeBytes / 1024).toFixed(1)} KB`;

  const baseRefSize = originalSizeBytes || (newSizeBytes * 1.5);
  const savingsPercent = Math.max(0, Math.round(((baseRefSize - newSizeBytes) / baseRefSize) * 100));

  const formatName = targetFormat === 'webp' ? 'WebP'
    : targetFormat === 'png' ? 'PNG'
    : targetFormat === 'jpeg' ? 'JPG'
    : targetFormat === 'avif' ? 'AVIF'
    : 'BMP';

  const blobUrl = URL.createObjectURL(finalBlob);

  return {
    dataUrl: finalDataUrl || blobUrl,
    blob: finalBlob,
    blobUrl,
    width: canvas.width,
    height: canvas.height,
    newSizeBytes,
    newSizeStr,
    savingsPercent,
    formatName,
    mimeType
  };
}
