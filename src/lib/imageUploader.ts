/**
 * Utility for Client-side Image Compression (WebP) & Direct ImgBB Cloud Upload
 * API Key: ac5681114bf4c46f44ddfcd035d51afb
 * Endpoint: https://api.imgbb.com/1/upload
 */

const IMGBB_API_KEY = 'ac5681114bf4c46f44ddfcd035d51afb';
const IMGBB_UPLOAD_URL = 'https://api.imgbb.com/1/upload';

export interface CompressResult {
  blob: Blob;
  originalSize: number;
  compressedSize: number;
  width: number;
  height: number;
  compressionRatio: number; // e.g. 85 for 85% saved
}

export interface UploadResult {
  success: boolean;
  url: string;
  display_url: string;
  originalSize: number;
  compressedSize: number;
  savedPercent: number;
}

/**
 * Format bytes to readable string (e.g. 2.4 MB, 85 KB)
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

/**
 * Compresses an image file to WebP format in the browser.
 * Reduces 1-5MB images down to lightweight KB size for fast loading.
 */
export async function compressImageToWebP(
  file: File,
  maxWidth: number = 1920,
  maxHeight: number = 1920,
  quality: number = 0.82
): Promise<CompressResult> {
  return new Promise((resolve, reject) => {
    const originalSize = file.size;
    const reader = new FileReader();

    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;

        // Calculate scaled dimensions while preserving aspect ratio
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Could not get canvas 2D context'));
          return;
        }

        // Draw image smoothly onto canvas
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        // Convert canvas content to WebP blob
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('WebP compression failed'));
              return;
            }

            const compressedSize = blob.size;
            const savedBytes = Math.max(0, originalSize - compressedSize);
            const compressionRatio = originalSize > 0 
              ? Math.round((savedBytes / originalSize) * 100) 
              : 0;

            resolve({
              blob,
              originalSize,
              compressedSize,
              width,
              height,
              compressionRatio
            });
          },
          'image/webp',
          quality
        );
      };

      img.onerror = () => reject(new Error('Failed to parse input image'));
      img.src = e.target?.result as string;
    };

    reader.onerror = () => reject(new Error('Failed to read image file'));
    reader.readAsDataURL(file);
  });
}

/**
 * Compresses an image to WebP and uploads it directly to ImgBB cloud.
 * Returns the permanent direct image URL.
 */
export async function uploadImageToImgBB(
  file: File,
  onProgress?: (status: 'compressing' | 'uploading' | 'done', info?: string) => void
): Promise<UploadResult> {
  try {
    // Step 1: Auto compress to WebP
    if (onProgress) onProgress('compressing', 'Compressing image to WebP format...');
    const compressed = await compressImageToWebP(file);

    // Step 2: Prepare FormData for ImgBB API
    if (onProgress) onProgress('uploading', `Uploading ${formatFileSize(compressed.compressedSize)} to ImgBB...`);
    const formData = new FormData();
    formData.append('key', IMGBB_API_KEY);

    // Convert blob to File with .webp extension
    const cleanName = file.name.replace(/\.[^/.]+$/, '') || 'image';
    const webpFile = new File([compressed.blob], `${cleanName}.webp`, {
      type: 'image/webp',
    });
    formData.append('image', webpFile);

    // Step 3: POST to ImgBB API v1
    const response = await fetch(IMGBB_UPLOAD_URL, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => null);
      throw new Error(errData?.error?.message || `ImgBB upload failed with HTTP ${response.status}`);
    }

    const data = await response.json();

    if (!data.success || !data.data) {
      throw new Error(data?.error?.message || 'ImgBB did not return a valid image URL');
    }

    if (onProgress) onProgress('done', 'Upload completed!');

    return {
      success: true,
      url: data.data.url || data.data.display_url,
      display_url: data.data.display_url || data.data.url,
      originalSize: compressed.originalSize,
      compressedSize: compressed.compressedSize,
      savedPercent: compressed.compressionRatio,
    };
  } catch (error: any) {
    console.error('ImgBB Upload Error:', error);
    throw new Error(error.message || 'Failed to upload image to ImgBB');
  }
}
