// SmartBot Core Logic & NLP Rule Engine (Zero External AI API, 100% Client-Side)
// Maps user phrases, synonyms, qualifiers, size intents (increase, reduce, 90%, 40%, etc.) to internal tool actions.

export type TargetFormat = 'webp' | 'png' | 'jpeg';

export interface ImageProcessingIntent {
  action: 'webp' | 'png' | 'jpeg' | 'compress' | 'favicon' | 'options' | 'unsupported';
  targetFormat?: TargetFormat;
  quality: number; // 0.1 to 1.0 (defaults: webp 0.9, compress 0.6, high-quality 0.95)
  unsupportedReason?: string;
  matchedRules: string[];
  detectedParameters: {
    requestedQualityPercent?: number;
    intentType?: 'increase_quality' | 'decrease_size' | 'exact_percent' | 'format_only';
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
    | 'youtube_process'
    | 'document_process'
    | 'title_generator'
    | 'greeting'
    | 'clear_chat'
    | 'help_menu'
    | 'unsupported_service'
    | 'fallback_guidance';
  replyText?: string;
  suggestedAction?: string;
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

  // ── WEBP CONVERSION PATTERNS ──────────────────────────────
  const webpPatterns = [
    'webp', 'convert webp', 'png to webp', 'jpg to webp', 'jpeg to webp',
    'image to webp', 'convert image to webp', 'make webp', 'to webp', 'into webp', 'change to webp',
    'web p', 'webp file', 'save as webp'
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
    'save as png', 'transparent png'
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
    'image to jpg', 'jpg format', 'jpeg format', 'to jpg', 'into jpg', 'make jpg', 'save as jpg', 'save as jpeg'
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
    'compress', 'compression', 'reduce size', 'optimize image', 'shrink', 'file size', 'optimize'
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

  // ── FAVICON PATTERNS ──────────────────────────────────────
  const faviconPatterns = ['favicon', 'icon', 'app icon', 'site icon', 'ico', 'create favicon'];
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

  // Greetings
  const greetings = ['hi', 'hello', 'hey', 'who are you', 'help', 'bot'];
  if (greetings.some(w => norm === w || norm.startsWith(w + ' '))) {
    return {
      matched: true,
      intent: 'greeting',
      replyText: `👋 **Hello! I am Naxxivo Smart Bot.**\n\nI process automation tasks directly in your browser with zero latency:\n\n• 🎬 **YouTube Automation:** Paste any YouTube video link to get tags, 1080p HD thumbnails, SEO keywords, or embed code.\n• 🖼️ **Image Converter & Compressor:** Upload any image and tell me what to do *(e.g. "convert to webp", "png to webp", "compress image", "90% quality")*.\n• ✍️ **Title & Description Ideas:** Ask for video ideas *(e.g. "viral titles for React tutorial")*.\n\nHow can I help you today?`
    };
  }

  // Clear Chat
  if (['clear', 'clear chat', 'reset', 'clean'].includes(norm)) {
    return {
      matched: true,
      intent: 'clear_chat'
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
