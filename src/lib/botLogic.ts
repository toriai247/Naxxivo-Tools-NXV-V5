// SmartBot Core Logic & NLP Rule Engine (Zero External AI API + Persistent Memory Layer)
// Maps user phrases, synonyms, qualifiers, size intents to internal tool actions and maintains long-term session context.

import { supabase, SUPABASE_URL, SUPABASE_ANON_KEY } from './supabase';

export function isSupabaseConfigured(): boolean {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY && !SUPABASE_URL.includes('placeholder'));
}

export type TargetFormat = 'webp' | 'png' | 'jpeg';

export interface ImageProcessingIntent {
  action: 'crop' | 'webp' | 'png' | 'jpeg' | 'compress' | 'favicon' | 'options' | 'unsupported';
  targetFormat?: TargetFormat;
  quality: number; // 0.1 to 1.0 (defaults: webp 0.9, compress 0.6, high-quality 0.95)
  aspectPreset?: 'free' | '1:1' | '16:9' | '9:16' | '4:3' | '3:2';
  aspectValue?: number;
  unsupportedReason?: string;
  matchedRules: string[];
  detectedParameters: {
    requestedQualityPercent?: number;
    intentType?: 'increase_quality' | 'decrease_size' | 'exact_percent' | 'format_only' | 'crop_transform';
    aspectPreset?: 'free' | '1:1' | '16:9' | '9:16' | '4:3' | '3:2';
    aspectValue?: number;
    originalKeywordsFound: string[];
  };
}

export interface YouTubeProcessingIntent {
  action: 'tags' | 'thumbnails' | 'keywords' | 'hashtags' | 'embed' | 'ai_optimize' | 'description' | 'options' | 'unsupported';
  unsupportedReason?: string;
  matchedRules: string[];
}

export interface DocumentProcessingIntent {
  action: 'summary' | 'count' | 'json_format' | 'case_upper' | 'case_lower' | 'options' | 'unsupported';
  unsupportedReason?: string;
  matchedRules: string[];
}

export interface GeneralBotIntent {
  matched: boolean;
  intent: 
    | 'image_process'
    | 'image_cropper_guide'
    | 'youtube_process'
    | 'document_process'
    | 'title_generator'
    | 'greeting'
    | 'clear_chat'
    | 'help_menu'
    | 'remember_channel'
    | 'query_saved_channel'
    | 'unsupported_service'
    | 'fallback_guidance';
  replyText?: string;
  suggestedAction?: string;
  channelAlias?: string;
}

// ─────────────────────────────────────────────────────────────
// 0. Persistent Memory Layer & Session History Structures
// ─────────────────────────────────────────────────────────────

export interface UserSessionHistoryItem {
  id: string;
  sessionId: string;
  role: 'user' | 'bot' | 'assistant';
  text: string;
  timestamp: number;
  dateFormatted: string;
  toolType?: string;
  attachmentInfo?: {
    type: string;
    name: string;
    size?: string;
  };
  metadata?: {
    channelData?: any;
    videoData?: any;
    imageInfo?: any;
    documentInfo?: any;
    detectedIntent?: string;
    topic?: string;
    tags?: string[];
    actionResultData?: any;
    [key: string]: any;
  };
}

export interface BotMemoryFact {
  key: string;
  value: any;
  category: 'channel' | 'preference' | 'personal' | 'topic' | 'custom';
  updatedAt: number;
}

export interface BotSavedChannel {
  alias: string;
  channelId: string;
  title: string;
  handle?: string;
  lastStats?: {
    subscribers?: string;
    views?: string;
    videos?: string;
  };
  updatedAt: number;
}

const LOCAL_STORAGE_SESSION_KEY = 'naxxivo_bot_session_history_v2';
const LOCAL_STORAGE_FACTS_KEY = 'naxxivo_bot_memory_facts_v2';
const LOCAL_STORAGE_CHANNELS_KEY = 'naxxivo_bot_saved_channels_v2';
const DEFAULT_SESSION_ID = 'default_active_session';

/**
 * Fast synchronous reader for user session history from LocalStorage.
 */
export function getUserSessionHistorySync(limit: number = 30, sessionId: string = DEFAULT_SESSION_ID): UserSessionHistoryItem[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_SESSION_KEY);
    if (!raw) return [];
    const list: UserSessionHistoryItem[] = JSON.parse(raw);
    const filtered = sessionId ? list.filter(i => !i.sessionId || i.sessionId === sessionId) : list;
    return filtered.slice(-limit);
  } catch {
    return [];
  }
}

/**
 * Asynchronously fetches user session history from LocalStorage with Supabase cloud synchronization fallback.
 * Allows the bot to maintain long-term memory and context during conversations.
 */
export async function fetchUserSessionHistory(options?: {
  limit?: number;
  sessionId?: string;
  userId?: string;
}): Promise<UserSessionHistoryItem[]> {
  const limit = options?.limit || 30;
  const sessionId = options?.sessionId || DEFAULT_SESSION_ID;
  const localHistory = getUserSessionHistorySync(limit, sessionId);

  // Attempt Supabase fetch if online/available and userId/sessionId is provided
  if (options?.userId && supabase) {
    try {
      const { data, error } = await supabase
        .from('bot_chat_history')
        .select('*')
        .eq('user_id', options.userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (!error && data && data.length > 0) {
        const cloudItems: UserSessionHistoryItem[] = data.reverse().map((row: any) => ({
          id: row.id || `cloud-${row.created_at}`,
          sessionId: row.session_id || sessionId,
          role: row.role === 'user' ? 'user' : 'bot',
          text: row.text || row.content || '',
          timestamp: new Date(row.created_at).getTime(),
          dateFormatted: new Date(row.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          toolType: row.tool_type,
          metadata: row.metadata || {}
        }));

        // Merge without duplicate IDs
        const existingIds = new Set(localHistory.map(i => i.id));
        const merged = [...localHistory];
        for (const item of cloudItems) {
          if (!existingIds.has(item.id)) {
            merged.push(item);
          }
        }
        merged.sort((a, b) => a.timestamp - b.timestamp);
        return merged.slice(-limit);
      }
    } catch {
      // Graceful fallback to local history
    }
  }

  return localHistory;
}

/**
 * Saves a new conversational turn or action into the persistent memory layer (LocalStorage + Supabase).
 */
export async function saveUserSessionHistory(
  item: Partial<UserSessionHistoryItem>,
  userId?: string
): Promise<UserSessionHistoryItem> {
  const now = Date.now();
  const newItem: UserSessionHistoryItem = {
    id: item.id || `msg-${now}-${Math.random().toString(36).substr(2, 6)}`,
    sessionId: item.sessionId || DEFAULT_SESSION_ID,
    role: item.role || 'user',
    text: item.text || '',
    timestamp: item.timestamp || now,
    dateFormatted: item.dateFormatted || new Date(now).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    toolType: item.toolType,
    attachmentInfo: item.attachmentInfo,
    metadata: item.metadata || {}
  };

  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_SESSION_KEY);
    const list: UserSessionHistoryItem[] = raw ? JSON.parse(raw) : [];
    // Keep max 100 recent entries in local storage
    const updated = [...list, newItem].slice(-100);
    localStorage.setItem(LOCAL_STORAGE_SESSION_KEY, JSON.stringify(updated));
  } catch (err) {
    console.warn('LocalStorage save error:', err);
  }

  // Asynchronously push to Supabase if connected
  if (supabase && userId) {
    try {
      await supabase.from('bot_chat_history').insert({
        id: newItem.id,
        user_id: userId,
        session_id: newItem.sessionId,
        role: newItem.role,
        text: newItem.text,
        tool_type: newItem.toolType,
        metadata: newItem.metadata,
        created_at: new Date(newItem.timestamp).toISOString()
      });
    } catch {
      // Silent error handling for optional backend table
    }
  }

  return newItem;
}

/**
 * Clears current session history from local memory.
 */
export function clearUserSessionHistory(sessionId: string = DEFAULT_SESSION_ID): void {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_SESSION_KEY);
    if (!raw) return;
    const list: UserSessionHistoryItem[] = JSON.parse(raw);
    const remaining = list.filter(i => i.sessionId && i.sessionId !== sessionId);
    localStorage.setItem(LOCAL_STORAGE_SESSION_KEY, JSON.stringify(remaining));
  } catch {
    // Storage error ignored
  }
}

/**
 * Retrieves all stored key-value memory facts (e.g., user name, preferences, persona).
 */
export function getBotMemoryFacts(): Record<string, BotMemoryFact> {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_FACTS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

/**
 * Saves a key-value fact into the bot's persistent memory.
 */
export function saveBotMemoryFact(
  key: string,
  value: any,
  category: 'channel' | 'preference' | 'personal' | 'topic' | 'custom' = 'custom'
): void {
  try {
    const facts = getBotMemoryFacts();
    facts[key] = {
      key,
      value,
      category,
      updatedAt: Date.now()
    };
    localStorage.setItem(LOCAL_STORAGE_FACTS_KEY, JSON.stringify(facts));
  } catch {
    // Storage error ignored
  }
}

/**
 * Stores a recognized YouTube channel alias in memory (e.g. "Rony" -> "UC...").
 */
export function rememberUserChannel(
  alias: string,
  channelId: string,
  title: string,
  handle?: string,
  stats?: any
): BotSavedChannel {
  const normAlias = alias.trim().toLowerCase();
  const channelObj: BotSavedChannel = {
    alias: normAlias,
    channelId,
    title,
    handle,
    lastStats: stats,
    updatedAt: Date.now()
  };

  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_CHANNELS_KEY);
    const channels: Record<string, BotSavedChannel> = raw ? JSON.parse(raw) : {};
    channels[normAlias] = channelObj;
    localStorage.setItem(LOCAL_STORAGE_CHANNELS_KEY, JSON.stringify(channels));

    // Also register fact
    saveBotMemoryFact(`channel_${normAlias}`, channelObj, 'channel');
  } catch {
    // Storage error ignored
  }

  return channelObj;
}

/**
 * Retrieves all remembered channels from persistent memory.
 */
export function getRememberedChannels(): BotSavedChannel[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_CHANNELS_KEY);
    if (!raw) return [];
    const channels: Record<string, BotSavedChannel> = JSON.parse(raw);
    return Object.values(channels);
  } catch {
    return [];
  }
}

/**
 * Searches memory for a matching channel by alias or title.
 */
export function findRememberedChannel(nameOrQuery: string): BotSavedChannel | null {
  const norm = normalizeUserInput(nameOrQuery);
  const channels = getRememberedChannels();
  if (channels.length === 0) return null;

  for (const ch of channels) {
    if (
      norm.includes(ch.alias) || 
      ch.alias.includes(norm) || 
      norm.includes(ch.title.toLowerCase()) || 
      (ch.handle && norm.includes(ch.handle.toLowerCase().replace('@', '')))
    ) {
      return ch;
    }
  }
  return null;
}

/**
 * Removes a channel from persistent memory.
 */
export function removeRememberedChannel(alias: string): void {
  try {
    const norm = alias.trim().toLowerCase();
    const raw = localStorage.getItem(LOCAL_STORAGE_CHANNELS_KEY);
    if (!raw) return;
    const channels: Record<string, BotSavedChannel> = JSON.parse(raw);
    delete channels[norm];
    localStorage.setItem(LOCAL_STORAGE_CHANNELS_KEY, JSON.stringify(channels));
  } catch {
    // Storage error ignored
  }
}

/**
 * Extracts and automatically remembers facts from user inputs (e.g., "amar channel er nam Rony", "my name is Alex").
 */
export function detectAndStoreUserFactsFromInput(input: string): {
  factStored?: boolean;
  memoryFact?: BotMemoryFact;
  channelSaved?: BotSavedChannel;
  matchedIntent?: string;
} {
  const norm = normalizeUserInput(input);

  // 1. Channel Memory Declaration: e.g. "amar channel er nam Rony", "remember channel rony https://...", "save my channel X"
  const channelDeclMatch = input.match(/(?:amar\s+channel(?:'er|\s+er)?\s+nam\s+|my\s+channel\s+is\s+|remember\s+channel\s+|save\s+channel\s+)([A-Za-z0-9\s_-]+)/i);
  if (channelDeclMatch && channelDeclMatch[1]) {
    const alias = channelDeclMatch[1].trim();
    if (alias.length >= 2 && !['is', 'the', 'a', 'to'].includes(alias.toLowerCase())) {
      saveBotMemoryFact('preferred_channel_alias', alias, 'channel');
      return {
        factStored: true,
        matchedIntent: 'remember_channel',
        memoryFact: {
          key: 'preferred_channel_alias',
          value: alias,
          category: 'channel',
          updatedAt: Date.now()
        }
      };
    }
  }

  // 2. User Name Declaration: e.g. "amar nam Alex", "my name is John"
  const nameMatch = input.match(/(?:amar\s+nam\s+|my\s+name\s+is\s+|i\s+am\s+called\s+)([A-Za-z]+)/i);
  if (nameMatch && nameMatch[1]) {
    const name = nameMatch[1].trim();
    saveBotMemoryFact('user_name', name, 'personal');
    return {
      factStored: true,
      matchedIntent: 'remember_name',
      memoryFact: {
        key: 'user_name',
        value: name,
        category: 'personal',
        updatedAt: Date.now()
      }
    };
  }

  return {};
}

/**
 * Builds a structured, context-rich prompt incorporating session memory, remembered facts, and recent conversation turns.
 * Used for Gemini AI calls to give the bot deep conversational awareness.
 */
export function buildConversationContextPrompt(
  history?: UserSessionHistoryItem[],
  maxTurns: number = 10
): string {
  const sessionHistory = history || getUserSessionHistorySync(maxTurns);
  const facts = getBotMemoryFacts();
  const rememberedChannels = getRememberedChannels();

  const factsList: string[] = [];
  if (facts.user_name) factsList.push(`- User's Name: ${facts.user_name.value}`);
  if (facts.preferred_channel_alias) factsList.push(`- Primary Channel Alias: ${facts.preferred_channel_alias.value}`);
  
  if (rememberedChannels.length > 0) {
    const channelSummaries = rememberedChannels.map(
      c => `"${c.alias}" (ID: ${c.channelId}, Title: "${c.title}"${c.lastStats?.subscribers ? `, Subs: ${c.lastStats.subscribers}` : ''})`
    );
    factsList.push(`- Remembered User Channels in Memory Database:\n  ${channelSummaries.join('\n  ')}`);
  }

  // Recent interaction entities summary
  const recentEntities: string[] = [];
  const recentTurns = sessionHistory.slice(-maxTurns);

  for (const item of recentTurns) {
    if (item.metadata?.videoData?.title) {
      recentEntities.push(`- Previously Analyzed Video: "${item.metadata.videoData.title}" (ID: ${item.metadata.videoData.id})`);
    }
    if (item.metadata?.channelData?.title) {
      recentEntities.push(`- Previously Analyzed Channel: "${item.metadata.channelData.title}" (ID: ${item.metadata.channelData.id})`);
    }
    if (item.metadata?.topic) {
      recentEntities.push(`- Last Discussed Topic: "${item.metadata.topic}"`);
    }
  }

  const memorySection = factsList.length > 0 || recentEntities.length > 0
    ? `\n### 🧠 PERSISTENT MEMORY & USER DATABASE CONTEXT:\n${factsList.join('\n')}\n${recentEntities.slice(-4).join('\n')}\n`
    : '';

  const personaInstruction = `
You are Naxxivo Smart Assistant, an advanced, highly capable, and respectful AI built directly into the Naxxivo Web Utility Hub.
Persona Guidelines:
- Tone: Respectful, polite, professional, and friendly (e.g. When communicating in Bengali/Banglish, naturally use respectful greetings like "জি স্যার, আজ কীভাবে সাহায্য করতে পারি?").
- Capabilities: Expert in YouTube Growth/SEO, Image Optimization (WebP/PNG/Compression), Document Formatting, and Content Creation.
- Conversational Memory: Maintain strict context across turns. If the user refers to "that video", "more titles for it", "amar channel", or names a remembered channel like "Rony", use the memory context seamlessly without asking them to repeat.
- Formatting: Use elegant Markdown, bullet points, and code snippets when appropriate.
`;

  return `${personaInstruction.trim()}${memorySection}`;
}

/**
 * Resolves follow-up queries using session history (e.g. "give 5 more titles for it", "what were its tags?", "download its thumbnail").
 */
export function resolveContextualQuery(
  input: string,
  history?: UserSessionHistoryItem[]
): {
  resolvedText: string;
  isFollowUp: boolean;
  referencedEntity?: {
    type: 'video' | 'channel' | 'image' | 'topic';
    data: any;
  };
} {
  const norm = normalizeUserInput(input);
  const sessionHistory = history || getUserSessionHistorySync(10);

  // Look for pronoun or follow-up references
  const followUpIndicators = [
    'for it', 'for that', 'about that', 'that video', 'this video', 'same video',
    'more titles', 'more ideas', 'what was the view', 'show tags', 'its thumbnail',
    'aro title', 'arekta', 'oi video', 'oi channel', 'arekta dao'
  ];

  const isFollowUp = followUpIndicators.some(ind => norm.includes(ind));

  if (!isFollowUp || sessionHistory.length === 0) {
    return { resolvedText: input, isFollowUp: false };
  }

  // Scan backwards for last video or channel or topic
  for (let i = sessionHistory.length - 1; i >= 0; i--) {
    const item = sessionHistory[i];
    if (item.metadata?.videoData) {
      return {
        resolvedText: `${input} (Context: Video "${item.metadata.videoData.title}" - ID: ${item.metadata.videoData.id})`,
        isFollowUp: true,
        referencedEntity: {
          type: 'video',
          data: item.metadata.videoData
        }
      };
    }
    if (item.metadata?.channelData) {
      return {
        resolvedText: `${input} (Context: Channel "${item.metadata.channelData.title}" - ID: ${item.metadata.channelData.id})`,
        isFollowUp: true,
        referencedEntity: {
          type: 'channel',
          data: item.metadata.channelData
        }
      };
    }
    if (item.metadata?.topic) {
      return {
        resolvedText: `${input} (Context Topic: "${item.metadata.topic}")`,
        isFollowUp: true,
        referencedEntity: {
          type: 'topic',
          data: item.metadata.topic
        }
      };
    }
  }

  return { resolvedText: input, isFollowUp: false };
}

// ─────────────────────────────────────────────────────────────
// 1. Text Normalizer
// ─────────────────────────────────────────────────────────────
export function normalizeUserInput(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"'’]/g, ' ')
    .replace(/\s+/g, ' ');
}

// ─────────────────────────────────────────────────────────────
// 2. Comprehensive Quality & Size Intent Detector
// ─────────────────────────────────────────────────────────────
export function detectQualityAndSizeMod(text: string): {
  quality: number;
  percent?: number;
  intentType: 'increase_quality' | 'decrease_size' | 'exact_percent' | 'format_only';
  matchedKeywords: string[];
} {
  const norm = normalizeUserInput(text);
  const matchedKeywords: string[] = [];

  // Check explicit percentage e.g. "90%", "90 %", "40%", "75 %"
  const percentMatch = text.match(/(\d{1,3})\s*%/);
  if (percentMatch) {
    const val = parseInt(percentMatch[1], 10);
    if (!isNaN(val) && val >= 10 && val <= 100) {
      matchedKeywords.push(`${val}%`);
      return {
        quality: Math.max(0.2, Math.min(1.0, val / 100)),
        percent: val,
        intentType: 'exact_percent',
        matchedKeywords
      };
    }
  }

  // Increase Quality / High Resolution / Large
  const highQualityKeywords = [
    'big', 'high', 'hd', 'hq', 'high quality', 'clear', 'best', 'ultra', 'maximum', 'max quality',
    'no loss', 'lossless', 'original quality', 'increase quality', 'higher quality'
  ];
  for (const kw of highQualityKeywords) {
    if (norm.includes(kw)) {
      matchedKeywords.push(kw);
    }
  }
  if (matchedKeywords.length > 0) {
    return {
      quality: 0.95,
      percent: 95,
      intentType: 'increase_quality',
      matchedKeywords
    };
  }

  // Decrease Size / Compress / Small
  const decreaseKeywords = [
    'compress', 'reduce', 'shrink', 'smaller', 'small', 'tiny', 'low quality', 'fast load',
    'kb', 'mb', 'less size', 'decrease size', 'minimize'
  ];
  for (const kw of decreaseKeywords) {
    if (norm.includes(kw)) {
      matchedKeywords.push(kw);
    }
  }
  if (matchedKeywords.length > 0) {
    return {
      quality: 0.60,
      percent: 60,
      intentType: 'decrease_size',
      matchedKeywords
    };
  }

  return {
    quality: 0.85,
    intentType: 'format_only',
    matchedKeywords: []
  };
}

// ─────────────────────────────────────────────────────────────
// 3. Image Parser & Command Mapper
// ─────────────────────────────────────────────────────────────
export function parseImageCommandLogic(text: string): ImageProcessingIntent {
  const norm = normalizeUserInput(text);
  const matchedRules: string[] = [];
  const qualityMod = detectQualityAndSizeMod(text);

  // Unsupported requests (e.g. OCR text extraction from image)
  if (norm.includes('ocr') || (norm.includes('text') && (norm.includes('extract') || norm.includes('read')))) {
    matchedRules.push('unsupported_ocr');
    return {
      action: 'unsupported',
      quality: 0.9,
      unsupportedReason: '❌ **Optical Character Recognition (OCR) is currently not supported.**',
      matchedRules,
      detectedParameters: {
        intentType: 'format_only',
        originalKeywordsFound: ['ocr', 'text']
      }
    };
  }

  // ── CROP / ASPECT RATIO PATTERNS ──────────────────────────
  const cropKeywords = [
    'crop', 'cropper', 'cropping', 'cut image', 'cut photo', 'crop photo', 'image crop', 'image cropper',
    'aspect ratio', 'resize crop', 'square crop', '1:1', '1.1', '1 1', '1-1', '16:9', '16.9', '16 9', '16-9',
    '9:16', '9.16', '9 16', '9-16', '4:3', '4.3', '4 3', '4-3', '3:2', '3.2', '3 2', '3-2',
    'circle crop', 'circular crop', 'profile crop', 'dp crop', 'avatar crop', 'thumbnail crop',
    'story crop', 'reels crop', 'shorts crop', 'portrait crop', 'landscape crop',
    // Bengali / Banglish
    'crop koro', 'ক্রপ করো', 'ক্রপ', 'ছবি ক্রপ করো', 'ছবি ক্রপ', 'image crop koro', 'photo cut koro',
    'সাইজ করো', 'square koro', '16:9 koro', '16.9 koro', '1:1 koro', '1.1 koro', '9:16 koro', '9.16 koro',
    '4:3 koro', '4.3 koro', 'dp banao', 'thumbnail banao', 'kete dao', 'কেটে দাও', 'রেশিও', 'রেশিও পরিবর্তন'
  ];

  if (cropKeywords.some(p => norm.includes(p))) {
    matchedRules.push('match_crop_action');
    let aspectPreset: 'free' | '1:1' | '16:9' | '9:16' | '4:3' | '3:2' = 'free';
    let aspectValue: number | undefined = undefined;

    if (norm.includes('16:9') || norm.includes('16.9') || norm.includes('16 9') || norm.includes('16-9') || norm.includes('youtube') || norm.includes('thumbnail') || norm.includes('widescreen') || norm.includes('landscape')) {
      aspectPreset = '16:9';
      aspectValue = 16 / 9;
      matchedRules.push('aspect_16_9');
    } else if (norm.includes('1:1') || norm.includes('1.1') || norm.includes('1 1') || norm.includes('1-1') || norm.includes('square') || norm.includes('dp') || norm.includes('profile') || norm.includes('avatar') || norm.includes('circle') || norm.includes('instagram')) {
      aspectPreset = '1:1';
      aspectValue = 1;
      matchedRules.push('aspect_1_1');
    } else if (norm.includes('9:16') || norm.includes('9.16') || norm.includes('9 16') || norm.includes('9-16') || norm.includes('reels') || norm.includes('shorts') || norm.includes('tiktok') || norm.includes('story') || norm.includes('vertical')) {
      aspectPreset = '9:16';
      aspectValue = 9 / 16;
      matchedRules.push('aspect_9_16');
    } else if (norm.includes('4:3') || norm.includes('4.3') || norm.includes('4 3') || norm.includes('4-3') || norm.includes('standard')) {
      aspectPreset = '4:3';
      aspectValue = 4 / 3;
      matchedRules.push('aspect_4_3');
    } else if (norm.includes('3:2') || norm.includes('3.2') || norm.includes('3 2') || norm.includes('3-2') || norm.includes('photo')) {
      aspectPreset = '3:2';
      aspectValue = 3 / 2;
      matchedRules.push('aspect_3_2');
    }

    return {
      action: 'crop',
      targetFormat: 'png',
      quality: 0.92,
      aspectPreset,
      aspectValue,
      matchedRules,
      detectedParameters: {
        intentType: 'crop_transform',
        aspectPreset,
        aspectValue,
        originalKeywordsFound: matchedRules
      }
    };
  }

  // ── WEBP CONVERSION PATTERNS ──────────────────────────────
  const webpPatterns = [
    'webp', 'convert webp', 'png to webp', 'jpg to webp', 'jpeg to webp',
    'image to webp', 'convert image to webp', 'make webp', 'to webp', 'into webp', 'change to webp',
    'web p', 'webp file', 'save as webp', 'webp te convert', 'webp koro', 'ওয়েবপি', 'webp format'
  ];
  if (webpPatterns.some(p => norm.includes(p))) {
    matchedRules.push('match_webp_format');
    const finalQuality = qualityMod.intentType === 'exact_percent' 
      ? qualityMod.quality 
      : qualityMod.intentType === 'increase_quality' ? 0.96
      : qualityMod.intentType === 'decrease_size' ? 0.60 : 0.90;

    return {
      action: 'webp',
      targetFormat: 'webp',
      quality: finalQuality,
      matchedRules,
      detectedParameters: {
        requestedQualityPercent: Math.round(finalQuality * 100),
        intentType: qualityMod.intentType,
        originalKeywordsFound: matchedRules
      }
    };
  }

  // ── PNG CONVERSION PATTERNS ───────────────────────────────
  const pngPatterns = [
    'png', 'convert png', 'webp to png', 'jpg to png', 'jpeg to png',
    'image to png', 'convert image to png', 'png format', 'make png', 'to png', 'into png',
    'save as png', 'transparent png', 'png te convert', 'png koro', 'পিএনজি'
  ];
  if (pngPatterns.some(p => norm.includes(p))) {
    matchedRules.push('match_png_format');
    return {
      action: 'png',
      targetFormat: 'png',
      quality: 1.0, // PNG is lossless
      matchedRules,
      detectedParameters: {
        requestedQualityPercent: 100,
        intentType: qualityMod.intentType,
        originalKeywordsFound: matchedRules
      }
    };
  }

  // ── JPG/JPEG CONVERSION PATTERNS ──────────────────────────
  const jpgPatterns = [
    'jpg', 'jpeg', 'convert jpg', 'convert jpeg', 'webp to jpg', 'png to jpg',
    'image to jpg', 'jpg format', 'jpeg format', 'to jpg', 'into jpg', 'make jpg', 'save as jpg', 'save as jpeg',
    'jpg te convert', 'jpg koro', 'জেপিজি', 'photo format'
  ];
  if (jpgPatterns.some(p => norm.includes(p))) {
    matchedRules.push('match_jpeg_format');
    const finalQuality = qualityMod.intentType === 'exact_percent'
      ? qualityMod.quality
      : qualityMod.intentType === 'increase_quality' ? 0.95
      : qualityMod.intentType === 'decrease_size' ? 0.65 : 0.85;

    return {
      action: 'jpeg',
      targetFormat: 'jpeg',
      quality: finalQuality,
      matchedRules,
      detectedParameters: {
        requestedQualityPercent: Math.round(finalQuality * 100),
        intentType: qualityMod.intentType,
        originalKeywordsFound: matchedRules
      }
    };
  }

  // ── COMPRESSION / SIZE REDUCTION PATTERNS ─────────────────
  const compressPatterns = [
    'compress', 'compression', 'reduce size', 'optimize image', 'shrink', 'file size', 'optimize',
    // User typos & Banglish
    'compromise', 'compres', 'komao', 'size komao', 'komano', 'chobi komao', 'file size komao',
    'kb komao', 'mb komao', 'কম্প্রেস', 'সাইজ কমাও', 'কমপ্রেস', 'ছোট করো'
  ];
  if (compressPatterns.some(p => norm.includes(p)) || qualityMod.intentType === 'decrease_size') {
    matchedRules.push('match_compress_action');
    const finalQuality = qualityMod.intentType === 'exact_percent'
      ? qualityMod.quality
      : qualityMod.quality <= 0.65 ? qualityMod.quality : 0.60;

    return {
      action: 'compress',
      targetFormat: 'webp',
      quality: finalQuality,
      matchedRules,
      detectedParameters: {
        requestedQualityPercent: Math.round(finalQuality * 100),
        intentType: 'decrease_size',
        originalKeywordsFound: matchedRules
      }
    };
  }

  // ── GENERAL FORMAT CHANGE PATTERNS ────────────────────────
  const formatChangePatterns = [
    'format change', 'formet change', 'change format', 'format bodlao', 'ফরম্যাট চেঞ্জ', 'ফরম্যাট পরিবর্তন',
    'format change koro', 'change image format', 'convert format'
  ];
  if (formatChangePatterns.some(p => norm.includes(p))) {
    matchedRules.push('match_format_change_options');
    return {
      action: 'options',
      quality: 0.9,
      matchedRules,
      detectedParameters: {
        intentType: 'format_only',
        originalKeywordsFound: matchedRules
      }
    };
  }

  // ── FAVICON PATTERNS ──────────────────────────────────────
  const faviconPatterns = ['favicon', 'icon', 'app icon', 'site icon', 'ico', 'create favicon', 'ফেভিকন', 'আইকন'];
  if (faviconPatterns.some(p => norm.includes(p))) {
    matchedRules.push('match_favicon_action');
    return {
      action: 'favicon',
      targetFormat: 'png',
      quality: 1.0,
      matchedRules,
      detectedParameters: {
        intentType: 'format_only',
        originalKeywordsFound: matchedRules
      }
    };
  }

  // Fallback: If user wrote quality/size words only
  if (qualityMod.intentType === 'increase_quality' || qualityMod.intentType === 'exact_percent') {
    matchedRules.push('match_fallback_quality_modifier');
    return {
      action: 'webp',
      targetFormat: 'webp',
      quality: qualityMod.quality,
      matchedRules,
      detectedParameters: {
        requestedQualityPercent: Math.round(qualityMod.quality * 100),
        intentType: qualityMod.intentType,
        originalKeywordsFound: matchedRules
      }
    };
  }

  return {
    action: 'options',
    quality: 0.9,
    matchedRules: ['no_direct_match_show_options'],
    detectedParameters: {
      intentType: 'format_only',
      originalKeywordsFound: []
    }
  };
}

// ─────────────────────────────────────────────────────────────
// 4. YouTube Parser & Function Mapper
// ─────────────────────────────────────────────────────────────
export function parseYouTubeCommandLogic(text: string): YouTubeProcessingIntent {
  const norm = normalizeUserInput(text);
  const matchedRules: string[] = [];

  // Unsupported YouTube actions (Full video / mp4 / mp3 download)
  const isVideoDownload = [
    'video download', 'download video', 'mp4', 'mp3', 'full video', 'video file',
    'audio download', 'song download', 'get video'
  ].some(kw => norm.includes(kw));

  if (isVideoDownload) {
    matchedRules.push('unsupported_youtube_download');
    return {
      action: 'unsupported',
      unsupportedReason: '❌ **Direct YouTube video or audio (MP4/MP3) downloads are not available.**\n\n🔒 Due to copyright and YouTube platform policies, video file downloads are not permitted. However, you can freely:\n• 🏷️ **Copy all video tags** with 1 click\n• 🖼️ **Download 1080p HD Thumbnails**\n• 🔑 **Extract SEO Keywords & Hashtags**\n• 💻 **Get responsive Embed player code**',
      matchedRules
    };
  }

  // Tags
  const tagPatterns = ['tag', 'tags', 'tag extract', 'get tags', 'video tags', 'copy tags'];
  if (tagPatterns.some(kw => norm.includes(kw))) {
    matchedRules.push('match_yt_tags');
    return { action: 'tags', matchedRules };
  }

  // Thumbnails
  const thumbPatterns = ['thumbnail', 'thumb', 'photo', 'picture', 'cover', 'image download', 'thumbnail download', 'hd thumbnail', 'cover photo'];
  if (thumbPatterns.some(kw => norm.includes(kw))) {
    matchedRules.push('match_yt_thumbnails');
    return { action: 'thumbnails', matchedRules };
  }

  // Hashtags
  const hashPatterns = ['hashtag', 'hashtags', '#', 'hash tag'];
  if (hashPatterns.some(kw => norm.includes(kw))) {
    matchedRules.push('match_yt_hashtags');
    return { action: 'hashtags', matchedRules };
  }

  // Keywords
  const keywordPatterns = ['keyword', 'keywords', 'seo keywords', 'search terms', 'key word'];
  if (keywordPatterns.some(kw => norm.includes(kw))) {
    matchedRules.push('match_yt_keywords');
    return { action: 'keywords', matchedRules };
  }

  // Embed
  const embedPatterns = ['embed', 'iframe', 'code', 'player code', 'embed code'];
  if (embedPatterns.some(kw => norm.includes(kw))) {
    matchedRules.push('match_yt_embed');
    return { action: 'embed', matchedRules };
  }

  return { action: 'options', matchedRules: ['default_yt_options'] };
}

// ─────────────────────────────────────────────────────────────
// 5. Global Pure Text Command Mapper
// ─────────────────────────────────────────────────────────────
export function parsePureTextCommandLogic(text: string): GeneralBotIntent {
  const norm = normalizeUserInput(text);
  if (!norm) {
    return {
      matched: true,
      intent: 'fallback_guidance',
      replyText: 'Please enter a command, paste a YouTube link, or upload an image.'
    };
  }

  // Check if user is asking to view saved memory / channels
  if (
    norm.includes('saved channel') || 
    norm.includes('my channels') || 
    norm.includes('memory') || 
    norm.includes('saved memory') || 
    norm.includes('remembered channel') ||
    norm === 'channels' ||
    norm === 'my channel'
  ) {
    const channels = getRememberedChannels();
    const facts = getBotMemoryFacts();
    if (channels.length === 0) {
      return {
        matched: true,
        intent: 'remember_channel',
        replyText: `🧠 **Persistent Memory & Channels Database:**\n\nNo custom channels are saved in memory yet.\n\n💡 **How to save a channel in memory:**\n• Type: *"Amar channel er nam Rony"* followed by your YouTube link\n• Or analyze any YouTube channel and click **Save to Memory (⭐)**.`
      };
    }
    const channelList = channels.map((c, i) => `**${i + 1}. ${c.alias.toUpperCase()}** - ${c.title} (\`${c.channelId}\`)`).join('\n');
    return {
      matched: true,
      intent: 'remember_channel',
      replyText: `🧠 **Remembered Channels in Memory Database:**\n\n${channelList}\n\n💡 *You can type "Amar ${channels[0]?.alias} channel er info dao" anytime to get instant live stats!*`
    };
  }

  // Check if user mentions a remembered channel by alias (e.g., "Rony channel er update dao", "info for rony channel")
  const rememberedChannel = findRememberedChannel(norm);
  if (rememberedChannel && (norm.includes('info') || norm.includes('stat') || norm.includes('update') || norm.includes('data') || norm.includes('channel') || norm.includes('details'))) {
    return {
      matched: true,
      intent: 'query_saved_channel',
      suggestedAction: rememberedChannel.channelId,
      channelAlias: rememberedChannel.alias,
      replyText: `🔍 **Retrieving live data for remembered channel: "${rememberedChannel.title}"...**`
    };
  }

  // Greetings with Personalized Tone & Memory
  const greetings = ['hi', 'hello', 'hey', 'who are you', 'help', 'bot', 'salam', 'kemon acho', 'ki khobor', 'ji sir'];
  if (greetings.some(w => norm === w || norm.startsWith(w + ' '))) {
    const facts = getBotMemoryFacts();
    const userName = facts.user_name?.value;
    const greetingHeader = userName ? `👋 **জি ${userName} স্যার!**` : `👋 **জি স্যার! আমি Naxxivo Smart Assistant.**`;

    return {
      matched: true,
      intent: 'greeting',
      replyText: `${greetingHeader}\n\nআজ কীভাবে সাহায্য করতে পারি? ব্রাউজার লেভেলে কোনো বিলম্ব ছাড়াই আমি আপনার জন্য কাজ করতে প্রস্তুত:\n\n• 🎬 **YouTube Automation:** যেকোনো ভিডিও বা চ্যানেলের লিংক পেস্ট করুন—ট্যাগ, 1080p থাম্বনেইল, বা এসইও কিওয়ার্ড পেয়ে যাবেন।\n• 🧠 **Memory & Channels:** আপনার চ্যানেলের নাম সেভ করে রাখলে নাম বললেই লাইভ আপডেট দিব।\n• 🖼️ **Image Processing:** ইমেজ কনভার্ট বা কম্প্রেস করতে 📎 বাটনে ইমেজ আপলোড করুন *(e.g. "WebP", "Compress")*.\n• ✍️ **Viral Titles & SEO:** যেকোনো টপিকের জন্য ভাইরাল আইডিয়া চান *(e.g. "Titles for Tech Review")*.\n\nআপনার রিকোয়েস্টটি লিখুন!`
    };
  }

  // Clear Chat
  if (['clear', 'clear chat', 'reset', 'clean'].includes(norm)) {
    return {
      matched: true,
      intent: 'clear_chat'
    };
  }

  // User wrote Crop keywords without attaching image
  const isCropWord = [
    'crop', 'cropper', 'cropping', 'cut image', 'cut photo', 'crop photo', 'image cropper', 'image crop',
    'aspect ratio', 'square crop', '1:1', '16:9', '9:16', '4:3', '3:2',
    'crop koro', 'ক্রপ করো', 'ক্রপ', 'ছবি ক্রপ করো', 'ছবি ক্রপ'
  ].some(w => norm.includes(w));

  if (isCropWord) {
    return {
      matched: true,
      intent: 'image_cropper_guide',
      replyText: `✂️ **Image Cropper & Aspect Ratio System:**\n\nYou can crop, rotate, flip, and adjust aspect ratios for any image directly inside this chat or in the dedicated Studio.\n\n📐 **Aspect Ratio Presets:**\n• **1:1** — Square / Profile DP / Instagram Post\n• **16:9** — YouTube Thumbnail / Widescreen\n• **9:16** — Reels / TikTok / YouTube Shorts / Story\n• **4:3** — Standard Photography\n• **3:2** — Classic DSLR Photo\n• **Free** — Custom Crop Area\n\n📌 **Click the 📎 button or Drag & Drop an image here to start cropping!**`,
      suggestedAction: 'open_image_cropper'
    };
  }

  // User wrote Image keywords without attaching image
  const isImageWord = [
    'webp', 'png', 'jpeg', 'jpg', 'compress', 'convert image', 'image format', 'favicon'
  ].some(w => norm.includes(w));

  if (isImageWord) {
    return {
      matched: true,
      intent: 'image_process',
      replyText: `🖼️ **To convert or compress an image, please click the 📎 button below to attach your image first!**\n\nAfter uploading, you can specify commands such as:\n• *"Convert to WebP"*\n• *"PNG to WebP"*\n• *"Compress image"* or *"90% quality"*`
    };
  }

  // User wrote YouTube keywords without link
  const isYouTubeWord = [
    'thumbnail', 'tags', 'youtube tag', 'video tag', 'extract tag', 'channel'
  ].some(w => norm.includes(w));

  if (isYouTubeWord) {
    return {
      matched: true,
      intent: 'youtube_process',
      replyText: `🎬 **To extract YouTube tags, keywords, or thumbnails, please paste your YouTube video URL here!**\n\n(e.g., \`https://www.youtube.com/watch?v=...\`)`
    };
  }

  // Title generator
  if (norm.includes('title') || norm.includes('headline') || norm.includes('topic')) {
    return {
      matched: true,
      intent: 'title_generator',
      suggestedAction: norm.replace(/(generate|create|make|viral|youtube|title|titles|for|about)/gi, '').trim()
    };
  }

  // Unsupported services check
  const unsupportedServices = [
    { key: 'facebook video', msg: 'Facebook video downloading is not supported. We specialize in YouTube metadata, SEO tags, and image processing.' },
    { key: 'instagram reel', msg: 'Instagram Reel downloading is not supported.' },
    { key: 'tiktok', msg: 'TikTok video downloading is not supported.' },
    { key: 'pdf to word', msg: 'PDF to Word conversion is currently not supported.' },
    { key: 'mp3 converter', msg: 'Audio or MP3 conversion from YouTube is not supported due to platform copyright policies.' }
  ];

  for (const s of unsupportedServices) {
    if (norm.includes(s.key)) {
      return {
        matched: true,
        intent: 'unsupported_service',
        replyText: `❌ **${s.msg}**\n\nYou can use our available YouTube inspection, image converter, and SEO tools.`
      };
    }
  }

  return {
    matched: false,
    intent: 'fallback_guidance',
    replyText: `🤖 **Command not fully recognized.**\n\nSmart Bot can instantly perform:\n1. 🔗 **Paste a YouTube URL:** Extract tags, HD thumbnails, and SEO keywords.\n2. 🖼️ **Upload an Image (📎):** Convert to WebP, PNG, JPG or compress file size *(e.g. "webp", "compress", "90% quality")*.\n3. 📝 **Title Ideas:** Type *"Titles for [your topic]"* to generate viral YouTube title ideas.`
  };
}

// ─────────────────────────────────────────────────────────────
// 6. Document & Text File Command Parser
// ─────────────────────────────────────────────────────────────
export function parseDocumentCommandLogic(text: string): DocumentProcessingIntent {
  const norm = normalizeUserInput(text);
  const matchedRules: string[] = [];

  if (['count', 'word count', 'words', 'lines', 'length'].some(kw => norm.includes(kw))) {
    matchedRules.push('match_doc_count');
    return { action: 'count', matchedRules };
  }

  if (['json', 'format json', 'prettify', 'beautify', 'format', 'minify'].some(kw => norm.includes(kw))) {
    matchedRules.push('match_doc_json');
    return { action: 'json_format', matchedRules };
  }

  if (['upper', 'uppercase', 'capital', 'caps'].some(kw => norm.includes(kw))) {
    matchedRules.push('match_doc_upper');
    return { action: 'case_upper', matchedRules };
  }

  if (['lower', 'lowercase', 'small letters'].some(kw => norm.includes(kw))) {
    matchedRules.push('match_doc_lower');
    return { action: 'case_lower', matchedRules };
  }

  if (['summary', 'summarize', 'overview'].some(kw => norm.includes(kw))) {
    matchedRules.push('match_doc_summary');
    return { action: 'summary', matchedRules };
  }

  return { action: 'options', matchedRules: ['default_doc_options'] };
}

// ─────────────────────────────────────────────────────────────
// 7. URL & Media Stream Intelligent Detector
// ─────────────────────────────────────────────────────────────
export type DetectedMediaType = 'image_url' | 'youtube_video' | 'youtube_channel' | 'document_file' | 'general_web_url' | 'none';

export interface MediaDetectionResult {
  type: DetectedMediaType;
  url?: string;
  videoId?: string;
  channelId?: string;
  name?: string;
  extension?: string;
  hasExplicitCommand: boolean;
  rawText: string;
}

/**
 * Checks if a string is a direct image URL (e.g. png, jpg, webp, svg, unsplash, imgur, etc.)
 */
export function isDirectImageUrl(url: string): boolean {
  if (!url || typeof url !== 'string') return false;
  const clean = url.trim().toLowerCase();
  
  // Direct extension match
  if (/\.(jpg|jpeg|png|webp|gif|svg|bmp|ico|avif)(\?.*)?$/i.test(clean)) {
    return true;
  }

  // Data URLs
  if (clean.startsWith('data:image/')) {
    return true;
  }

  // Image CDN hosts
  const imageHosts = [
    'images.unsplash.com',
    'i.imgur.com',
    'imgur.com',
    'res.cloudinary.com',
    'cdn.jsdelivr.net',
    'images.pexels.com',
    'i.pinimg.com',
    'pbs.twimg.com/media'
  ];

  try {
    const parsed = new URL(url);
    if (imageHosts.some(h => parsed.hostname.includes(h))) {
      return true;
    }
  } catch {
    // ignore
  }

  return false;
}

/**
 * Extracts the first URL from a text string
 */
export function extractFirstUrl(text: string): string | null {
  if (!text) return null;
  const match = text.match(/(https?:\/\/[^\s]+)/i);
  return match ? match[1] : null;
}

/**
 * Analyzes raw user text to detect if an image URL, YouTube URL, or Document link was supplied
 */
export function detectMediaTypeFromInput(text: string): MediaDetectionResult {
  const rawText = text.trim();
  const url = extractFirstUrl(rawText);

  if (url) {
    // 1. Image URL
    if (isDirectImageUrl(url)) {
      const urlParts = url.split('?')[0].split('/');
      const fileName = urlParts[urlParts.length - 1] || 'Web-Image.png';
      return {
        type: 'image_url',
        url,
        name: fileName,
        hasExplicitCommand: rawText.length > url.length + 3,
        rawText
      };
    }

    // 2. YouTube Video or Shorts URL
    if (url.includes('youtube.com/watch') || url.includes('youtu.be/') || url.includes('youtube.com/shorts/')) {
      const vidMatch = url.match(/(?:v=|\/|shorts\/)([a-zA-Z0-9_-]{11})/);
      return {
        type: 'youtube_video',
        url,
        videoId: vidMatch ? vidMatch[1] : undefined,
        hasExplicitCommand: rawText.length > url.length + 3,
        rawText
      };
    }

    // 3. YouTube Channel URL
    if (url.includes('youtube.com/@') || url.includes('youtube.com/channel/') || url.includes('youtube.com/c/') || url.includes('youtube.com/user/')) {
      return {
        type: 'youtube_channel',
        url,
        hasExplicitCommand: rawText.length > url.length + 3,
        rawText
      };
    }

    // 4. Document / Code URL
    if (/\.(pdf|json|csv|txt|md|js|ts|html|css)(\?.*)?$/i.test(url)) {
      const urlParts = url.split('?')[0].split('/');
      const fileName = urlParts[urlParts.length - 1] || 'document.txt';
      return {
        type: 'document_file',
        url,
        name: fileName,
        hasExplicitCommand: rawText.length > url.length + 3,
        rawText
      };
    }

    // 5. General Web URL
    return {
      type: 'general_web_url',
      url,
      hasExplicitCommand: rawText.length > url.length + 3,
      rawText
    };
  }

  return {
    type: 'none',
    hasExplicitCommand: false,
    rawText
  };
}

/**
 * Generates polite Bengali + English options guidance prompt for uploaded files / URLs
 */
export function getPoliteOptionsPrompt(
  category: 'image' | 'video' | 'channel' | 'document' | 'web_url',
  details?: { name?: string; size?: string; title?: string; url?: string }
): string {
  if (category === 'image') {
    const fileLabel = details?.name ? `"${details.name}"` : 'আপনার ছবিটি';
    const sizeLabel = details?.size ? ` (${details.size})` : '';
    return `👋 **জি স্যার! ${fileLabel}${sizeLabel} পেয়েছি।**\n\nআপনি এই ছবিটি দিয়ে ঠিক কী করতে চান? নিচের অপশনগুলো থেকে বেছে নিন অথবা চ্যাটে সরাসরি লিখে দিন:\n• ✂️ **Crop & Aspect Ratio** — 1:1, 16:9, 9:16, 4:3 ক্রপ ও সাইজ করা\n• 🗜️ **Compress / Size Reduce** — কোয়ালিটি ঠিক রেখে ফাইলের সাইজ কমানো\n• 🔄 **Format Change** — WebP, PNG বা JPG ফরম্যাটে রূপান্তর\n• 🔲 **Favicon Maker** — ওয়েবসাইট ও অ্যাপ আইকন তৈরি\n\n*(আপনি চাইলে চ্যাটে লিখতে পারেন যেমন: "Crop 1.1", "16.9 crop", "compress koro", "webp te convert")*`;
  }

  if (category === 'video') {
    const titleLabel = details?.title ? `"${details.title}"` : 'ইউটিউব ভিডিও';
    return `🎬 **জি স্যার! ${titleLabel} ভিডিওটি পেয়েছি।**\n\nআপনি ভিডিওটি থেকে কী দেখতে বা এক্সট্রাক্ট করতে চান? নিচের অপশন সিলেক্ট করুন বা চ্যাটে লিখে দিন:\n• 🏷️ **Extract Tags** — ভিডিওর সব ট্যাগ একসাথে কপি\n• 🖼️ **1080p HD Thumbnail** — ফুল এইচডি থাম্বনেইল ডাউনলোড\n• 🔑 **SEO Keywords & Hashtags** — ভাইরাল কিওয়ার্ড ও হ্যাশট্যাগ\n• 💡 **Viral Title Ideas** — এই টপিকের ১০টি ভাইরাল টাইটেল আইডিয়া\n• 💻 **Embed Code** — ওয়েবসাইটে যুক্ত করার প্লেয়ার কোড`;
  }

  if (category === 'document') {
    const nameLabel = details?.name ? `\`${details.name}\`` : 'আপনার ডকুমেন্ট';
    const sizeLabel = details?.size ? ` (${details.size})` : '';
    return `📄 **জি স্যার! ${nameLabel}${sizeLabel} ফাইলটি পেয়েছি।**\n\nএই ডকুমেন্টের জন্য আপনি কী করতে চান? নিচের অপশন বেছে নিন অথবা চ্যাটে লিখুন:\n• 📊 **Word & Character Stats** — শব্দ, বর্ণ ও পড়ার সময় বিশ্লেষণ\n• ⚡ **JSON Prettify & Minify** — জেএসওন ফরম্যাট ও ভ্যালিডেশন\n• 🔠 **Case Converter** — UPPERCASE / lowercase এ রূপান্তর\n• 📑 **Quick Summary** — ডকুমেন্টের মূল সারাংশ তৈরি`;
  }

  if (category === 'web_url') {
    const urlLabel = details?.url ? `\`${details.url}\`` : 'ওয়েব লিংক';
    return `🌐 **জি স্যার! ${urlLabel} লিংকটি পেয়েছি।**\n\nএই লিংকের জন্য আপনি কী করতে চান?\n• 📱 **Generate QR Code** — স্ক্যানযোগ্য কিউআর কোড তৈরি\n• 🔍 **Inspect Metadata** — পেজের মেটা ও ওপেনগ্রাফ তথ্য\n• 🔗 **Clean & Shorten Link** — ট্র্যাকিং প্যারামিটার ছাড়া ক্লিন লিংক`;
  }

  return `👋 **জি স্যার! আপনার রিকোয়েস্টটি কীভাবে সম্পন্ন করতে পারি?**`;
}

