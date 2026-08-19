export interface FacebookAuthor {
  name: string;
  avatar?: string;
  url?: string;
}

export interface FacebookStats {
  views?: number;
  likes?: number;
  comments?: number;
  shares?: number;
}

export interface FacebookVideoData {
  id: string;
  title: string;
  description: string;
  duration: number; // in seconds
  thumbnail: string;
  videoHdUrl?: string; // 1080p or 720p high definition MP4
  videoSdUrl: string; // 360p or 480p standard definition MP4
  audioUrl?: string; // MP3 / audio stream
  author: FacebookAuthor;
  stats?: FacebookStats;
  sourceUrl: string;
  isVideo: boolean;
  qualityOptions: Array<{
    label: string;
    resolution: string;
    url: string;
    format: string;
    isHd: boolean;
  }>;
  fetchedAt: string;
}

export interface FacebookExtractResponse {
  success: boolean;
  data?: FacebookVideoData;
  error?: string;
}

export type MediaFormat = 'mp4' | 'webm' | 'mp3' | 'm4a' | 'wav' | 'jpg';
export type MediaQuality = '1080p' | '720p' | '480p' | '360p';

// Curated sample public Facebook URLs for 1-click test
export const SAMPLE_FACEBOOK_URLS = [
  {
    label: "Facebook Reel",
    url: "https://www.facebook.com/reel/1063920958617592",
    tag: "Reels"
  },
  {
    label: "Watch Video",
    url: "https://www.facebook.com/watch/?v=809204097419139",
    tag: "Watch"
  },
  {
    label: "Short Link (fb.watch)",
    url: "https://fb.watch/uK8a910xyz/",
    tag: "Shortlink"
  }
];

// Helper to ensure clean media filename
export function ensureMediaExtension(filename: string, format: MediaFormat | string): string {
  const clean = (filename || 'facebook_download').trim().replace(/\.[a-zA-Z0-9]+$/i, '');
  const formatExtMap: Record<string, string> = {
    webm: '.webm',
    mp3: '.mp3',
    m4a: '.m4a',
    wav: '.wav',
    jpg: '.jpg',
    mp4: '.mp4',
  };
  const ext = formatExtMap[format?.toLowerCase()] || '.mp4';
  return `${clean}${ext}`;
}

// Generate direct download URL with quality & format options via proxy
export function getFacebookDownloadUrl(
  mediaUrl: string,
  filename: string,
  type: 'video' | 'audio' | 'image' = 'video',
  format?: MediaFormat | string,
  quality?: MediaQuality | string
): string {
  if (!mediaUrl) return '#';
  const targetFormat = format || (type === 'audio' ? 'mp3' : type === 'image' ? 'jpg' : 'mp4');
  const cleanFilename = ensureMediaExtension(filename, targetFormat);
  let proxyUrl = `/api/facebook/download?url=${encodeURIComponent(mediaUrl)}&filename=${encodeURIComponent(cleanFilename)}&type=${type}&format=${targetFormat}`;
  if (quality) {
    proxyUrl += `&quality=${encodeURIComponent(quality)}`;
  }
  return proxyUrl;
}

// Helper to validate Facebook URL patterns
export function isValidFacebookUrl(url: string): boolean {
  if (!url || typeof url !== 'string') return false;
  const clean = url.trim();
  const fbRegex = /^(https?:\/\/)?((www|m|web|mobile|touch)\.)?(facebook\.com|fb\.watch|fb\.com|fb\.gg)\/.+$/i;
  return fbRegex.test(clean);
}

// Client Extractor Function (Server first with browser fallback)
export async function extractFacebookVideo(url: string): Promise<FacebookExtractResponse> {
  const cleanUrl = url.trim();
  if (!cleanUrl) {
    return { success: false, error: 'Please enter a valid Facebook video or reels URL.' };
  }

  if (!isValidFacebookUrl(cleanUrl)) {
    return { 
      success: false, 
      error: 'Invalid Facebook URL. Please provide a valid facebook.com/reel, /watch, or fb.watch link.' 
    };
  }

  // 1. Try our Express Backend API first
  try {
    const res = await fetch('/api/facebook/extract', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: cleanUrl }),
    });

    if (res.ok) {
      const json = await res.json();
      if (json.success && json.data) {
        return json;
      }
      if (json.error) {
        return { success: false, error: json.error };
      }
    }
  } catch (backendErr) {
    console.warn('Backend Facebook extraction failed, trying public fallback:', backendErr);
  }

  // 2. Client-Side Fallback via free public endpoints
  const fallbackEndpoints = [
    `https://api.tiklydown.eu.org/api/download?url=${encodeURIComponent(cleanUrl)}`,
    `https://api.agatz.xyz/api/facebook?url=${encodeURIComponent(cleanUrl)}`
  ];

  for (const endpoint of fallbackEndpoints) {
    try {
      const fallbackRes = await fetch(endpoint, { signal: AbortSignal.timeout(5000) });
      if (fallbackRes.ok) {
        const json: any = await fallbackRes.json();
        const r = json.result || json.data || json;
        if (r) {
          const hdUrl = r.hd || r.video_hd || r.hd_url || r.videoHD || '';
          const sdUrl = r.sd || r.video_sd || r.sd_url || r.videoSD || r.video || r.url || '';

          if (hdUrl || sdUrl) {
            const videoData: FacebookVideoData = {
              id: String(Date.now()),
              title: r.title || r.caption || 'Facebook Video',
              description: r.desc || r.description || '',
              duration: Number(r.duration) || 0,
              thumbnail: r.thumbnail || r.thumb || r.cover || '',
              videoHdUrl: hdUrl || undefined,
              videoSdUrl: sdUrl || hdUrl,
              audioUrl: r.audio || r.music || sdUrl || hdUrl,
              author: {
                name: r.author || r.creator || 'Facebook Creator',
                avatar: r.author_avatar || '',
              },
              sourceUrl: cleanUrl,
              isVideo: true,
              qualityOptions: [
                ...(hdUrl ? [{ label: 'HD 720p/1080p', resolution: '1080p', url: hdUrl, format: 'mp4', isHd: true }] : []),
                ...(sdUrl ? [{ label: 'SD 360p/480p', resolution: '480p', url: sdUrl, format: 'mp4', isHd: false }] : []),
              ],
              fetchedAt: new Date().toISOString(),
            };
            return { success: true, data: videoData };
          }
        }
      }
    } catch {
      // Quietly ignore failed fallback API attempts
    }
  }

  return {
    success: false,
    error: 'Failed to extract Facebook video. Please make sure the video is public and try again.',
  };
}

// Download file with stream progress reader
export async function downloadFacebookFile(
  url: string,
  filename: string,
  type: 'video' | 'audio' | 'image' = 'video',
  format?: MediaFormat | string,
  quality?: MediaQuality | string,
  onProgress?: (progress: number, loadedBytes: number, totalBytes: number) => void
): Promise<boolean> {
  if (!url) return false;
  const targetFormat = format || (type === 'audio' ? 'mp3' : type === 'image' ? 'jpg' : 'mp4');
  const finalFilename = ensureMediaExtension(filename, targetFormat);

  try {
    let blob: Blob | null = null;

    async function fetchWithStreamProgress(fetchUrl: string): Promise<Blob | null> {
      const res = await fetch(fetchUrl);
      if (!res.ok) return null;

      const contentLengthHeader = res.headers.get('content-length');
      const totalBytes = contentLengthHeader ? parseInt(contentLengthHeader, 10) : 0;

      if (!res.body) {
        const directBlob = await res.blob();
        if (onProgress && totalBytes > 0) onProgress(100, directBlob.size, directBlob.size);
        return directBlob;
      }

      const reader = res.body.getReader();
      const chunks: Uint8Array[] = [];
      let receivedBytes = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        if (value) {
          chunks.push(value);
          receivedBytes += value.length;

          if (onProgress && totalBytes > 0) {
            const pct = Math.min(99, Math.round((receivedBytes / totalBytes) * 100));
            onProgress(pct, receivedBytes, totalBytes);
          } else if (onProgress) {
            onProgress(50, receivedBytes, 0);
          }
        }
      }

      if (onProgress) onProgress(100, receivedBytes, totalBytes || receivedBytes);
      const mime = res.headers.get('content-type') || 'application/octet-stream';
      return new Blob(chunks, { type: mime });
    }

    // 1. Download via server proxy
    try {
      const proxyUrl = getFacebookDownloadUrl(url, finalFilename, type, targetFormat, quality);
      blob = await fetchWithStreamProgress(proxyUrl);
    } catch (proxyErr) {
      console.warn('Facebook download proxy fetch failed, falling back to direct URL:', proxyErr);
    }

    // 2. Direct fetch fallback
    if (!blob) {
      try {
        blob = await fetchWithStreamProgress(url);
      } catch (directErr) {
        console.warn('Direct media fetch failed:', directErr);
      }
    }

    if (blob) {
      const blobUrl = window.URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = blobUrl;
      anchor.download = finalFilename;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);

      setTimeout(() => {
        window.URL.revokeObjectURL(blobUrl);
      }, 5000);

      return true;
    }

    // 3. Last resort: Anchor open in new tab
    const anchorFallback = document.createElement('a');
    anchorFallback.href = getFacebookDownloadUrl(url, finalFilename, type, targetFormat, quality);
    anchorFallback.target = '_blank';
    anchorFallback.rel = 'noopener noreferrer';
    anchorFallback.download = finalFilename;
    document.body.appendChild(anchorFallback);
    anchorFallback.click();
    document.body.removeChild(anchorFallback);
    return true;
  } catch (err) {
    console.error('Facebook download execution error:', err);
    return false;
  }
}
