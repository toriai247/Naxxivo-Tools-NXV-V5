import { ReelPost } from '@/types/reels';
import { SEED_REELS } from '@/data/seedReels';
import { supabase } from '@/lib/supabase';

/**
 * Normalizes a TikTok or media URL to avoid subtle differences like
 * URL query parameters, hash fragments, protocols, or trailing slashes.
 */
export function normalizeTikTokUrl(rawUrl: string): string {
  if (!rawUrl) return '';
  try {
    const trimmed = rawUrl.trim();
    // Parse URL if possible
    const urlObj = new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`);
    
    // Lowercase hostname and strip standard tracking query parameters
    const host = urlObj.hostname.toLowerCase().replace(/^www\./, '');
    let pathname = urlObj.pathname.replace(/\/+$/, ''); // Remove trailing slash

    return `${host}${pathname}`.toLowerCase();
  } catch {
    // If not a standard URL, clean basic string
    return rawUrl
      .trim()
      .toLowerCase()
      .split('?')[0]
      .split('#')[0]
      .replace(/^https?:\/\//, '')
      .replace(/^www\./, '')
      .replace(/\/+$/, '');
  }
}

/**
 * Extracts unique numeric Video/Photo ID from TikTok URL if present.
 * Example: https://www.tiktok.com/@user/video/732948271892819 -> 732948271892819
 */
export function extractTikTokMediaId(rawUrl: string): string | null {
  if (!rawUrl) return null;
  const match = rawUrl.match(/(?:video|photo|v)\/(\d+)/i);
  if (match && match[1]) {
    return match[1];
  }
  return null;
}

/**
 * Checks whether an input URL matches any existing reel in a given list.
 */
export function findDuplicateInList(
  inputUrl: string,
  existingList: ReelPost[]
): { isDuplicate: boolean; duplicateReel?: ReelPost } {
  if (!inputUrl || !existingList || existingList.length === 0) {
    return { isDuplicate: false };
  }

  const normalizedInput = normalizeTikTokUrl(inputUrl);
  const inputId = extractTikTokMediaId(inputUrl);
  const rawInputTrimmed = inputUrl.trim().toLowerCase();

  for (const reel of existingList) {
    const reelRawUrl = (reel.tiktok_url || '').trim().toLowerCase();
    const reelStreamUrl = (reel.stream_url || '').trim().toLowerCase();

    // 1. Exact raw URL match
    if (reelRawUrl && reelRawUrl === rawInputTrimmed) {
      return { isDuplicate: true, duplicateReel: reel };
    }

    // 2. Exact Stream URL match
    if (reelStreamUrl && reelStreamUrl === rawInputTrimmed) {
      return { isDuplicate: true, duplicateReel: reel };
    }

    // 3. Normalized URL match
    if (reelRawUrl && normalizeTikTokUrl(reelRawUrl) === normalizedInput) {
      return { isDuplicate: true, duplicateReel: reel };
    }

    // 4. Video/Photo ID match (e.g. same video with different share params)
    if (inputId) {
      const reelId = extractTikTokMediaId(reel.tiktok_url || '');
      if (reelId && reelId === inputId) {
        return { isDuplicate: true, duplicateReel: reel };
      }
    }
  }

  return { isDuplicate: false };
}

/**
 * Comprehensive check against LocalStorage, Supabase database, and SEED_REELS
 */
export async function checkReelUrlIsDuplicate(
  inputUrl: string
): Promise<{ isDuplicate: boolean; duplicateTitle?: string; author?: string }> {
  if (!inputUrl || !inputUrl.trim()) {
    return { isDuplicate: false };
  }

  // 1. Check LocalStorage custom reels
  try {
    const stored = localStorage.getItem('naxxivo_custom_reels');
    if (stored) {
      const customList: ReelPost[] = JSON.parse(stored);
      const match = findDuplicateInList(inputUrl, customList);
      if (match.isDuplicate && match.duplicateReel) {
        return {
          isDuplicate: true,
          duplicateTitle: match.duplicateReel.title,
          author: match.duplicateReel.author_name || 'Creator'
        };
      }
    }
  } catch (err) {
    console.warn('LocalStorage check failed:', err);
  }

  // 2. Check Seed Reels
  const seedMatch = findDuplicateInList(inputUrl, SEED_REELS);
  if (seedMatch.isDuplicate && seedMatch.duplicateReel) {
    return {
      isDuplicate: true,
      duplicateTitle: seedMatch.duplicateReel.title,
      author: seedMatch.duplicateReel.author_name || 'Creator'
    };
  }

  // 3. Check Supabase Database
  try {
    const normalized = normalizeTikTokUrl(inputUrl);
    const mediaId = extractTikTokMediaId(inputUrl);

    // Fetch latest reels from database
    const { data, error } = await supabase
      .from('reels_posts')
      .select('id, title, tiktok_url, stream_url, author_name');

    if (!error && data && data.length > 0) {
      const dbMatch = findDuplicateInList(inputUrl, data as ReelPost[]);
      if (dbMatch.isDuplicate && dbMatch.duplicateReel) {
        return {
          isDuplicate: true,
          duplicateTitle: dbMatch.duplicateReel.title,
          author: dbMatch.duplicateReel.author_name || 'Creator'
        };
      }
    }
  } catch (dbErr) {
    console.warn('Supabase duplicate check skipped/offline:', dbErr);
  }

  return { isDuplicate: false };
}

/**
 * Deduplicates an array of reels by unique URL/ID while preserving the newest / best entries.
 * Also cleans up duplicate entries in LocalStorage `naxxivo_custom_reels`.
 */
export function deduplicateReelsList(reels: ReelPost[]): ReelPost[] {
  const seenUrls = new Set<string>();
  const seenIds = new Set<string>();
  const seenMediaIds = new Set<string>();
  const uniqueList: ReelPost[] = [];

  for (const reel of reels) {
    // Check ID
    if (reel.id && seenIds.has(reel.id)) {
      continue;
    }

    // Check TikTok URL
    const normUrl = normalizeTikTokUrl(reel.tiktok_url || reel.stream_url || '');
    if (normUrl && seenUrls.has(normUrl)) {
      continue;
    }

    // Check TikTok Media ID
    const mediaId = extractTikTokMediaId(reel.tiktok_url || '');
    if (mediaId && seenMediaIds.has(mediaId)) {
      continue;
    }

    // Mark as seen
    if (reel.id) seenIds.add(reel.id);
    if (normUrl) seenUrls.add(normUrl);
    if (mediaId) seenMediaIds.add(mediaId);

    uniqueList.push(reel);
  }

  // Clean LocalStorage if duplicates were stored previously
  try {
    const stored = localStorage.getItem('naxxivo_custom_reels');
    if (stored) {
      const customList: ReelPost[] = JSON.parse(stored);
      const cleanedCustom = deduplicateReelsListCustom(customList);
      if (cleanedCustom.length !== customList.length) {
        localStorage.setItem('naxxivo_custom_reels', JSON.stringify(cleanedCustom));
      }
    }
  } catch {
    // Ignore
  }

  return uniqueList;
}

function deduplicateReelsListCustom(customReels: ReelPost[]): ReelPost[] {
  const seenUrls = new Set<string>();
  const seenIds = new Set<string>();
  const seenMediaIds = new Set<string>();
  const unique: ReelPost[] = [];

  for (const reel of customReels) {
    if (reel.id && seenIds.has(reel.id)) continue;
    const normUrl = normalizeTikTokUrl(reel.tiktok_url || reel.stream_url || '');
    if (normUrl && seenUrls.has(normUrl)) continue;
    const mediaId = extractTikTokMediaId(reel.tiktok_url || '');
    if (mediaId && seenMediaIds.has(mediaId)) continue;

    if (reel.id) seenIds.add(reel.id);
    if (normUrl) seenUrls.add(normUrl);
    if (mediaId) seenMediaIds.add(mediaId);
    unique.push(reel);
  }

  return unique;
}
