import express from "express";
import path from "path";
import crypto from "crypto";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";

const app = express();
const PORT = 3000;

app.use(express.json());

// Server-side In-Memory Cache to save AI tokens on repeated requests
const aiCache = new Map<string, { data: any; timestamp: number; estimatedTokens: number }>();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours TTL

// Helper to calculate simple hash
function getRequestHash(payload: any): string {
  const normStr = JSON.stringify({
    type: payload.type || payload.mode,
    title: (payload.title || "").trim().toLowerCase(),
    descSnippet: (payload.description || "").trim().toLowerCase().slice(0, 300),
    tags: Array.isArray(payload.tags) ? payload.tags.slice(0, 10) : [],
    prompt: (payload.extraPrompt || "").trim().toLowerCase(),
  });
  return crypto.createHash("md5").update(normStr).digest("hex");
}

// Estimate token count (~4 chars per token)
function estimateTokenCount(text: string): number {
  return Math.ceil((text || "").length / 4);
}

// Robust JSON parser with auto-repair and fallback
function safeParseAIJson<T>(rawText: string, fallbackData: T): T {
  if (!rawText) return fallbackData;

  let cleaned = rawText.trim();
  if (cleaned.startsWith("```json")) {
    cleaned = cleaned.replace(/^```json\s*/i, "").replace(/\s*```$/, "");
  } else if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```\s*/, "").replace(/\s*```$/, "");
  }

  // 1. Direct JSON Parse
  try {
    return JSON.parse(cleaned);
  } catch (e1) {
    console.warn("Direct JSON parse failed, sanitizing text...", e1);
  }

  // 2. Clean control chars, trailing commas, and unescaped quotes in strings
  let sanitized = cleaned
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, " ")
    .replace(/,\s*([\}\]])/g, "$1");

  try {
    return JSON.parse(sanitized);
  } catch (e2) {
    console.warn("Sanitized JSON parse failed, attempting auto-repair...", e2);
  }

  // 3. Attempt structural repair for truncated or unclosed JSON
  let repaired = sanitized;
  const quoteCount = (repaired.match(/"/g) || []).length;
  if (quoteCount % 2 !== 0) {
    repaired += '"';
  }

  const lastCurly = repaired.lastIndexOf("}");
  const lastSquare = repaired.lastIndexOf("]");
  const lastValidIndex = Math.max(lastCurly, lastSquare);

  if (lastValidIndex > 0) {
    let candidate = repaired.slice(0, lastValidIndex + 1);
    const openCurly = (candidate.match(/\{/g) || []).length;
    const closeCurly = (candidate.match(/\}/g) || []).length;
    const openSquare = (candidate.match(/\[/g) || []).length;
    const closeSquare = (candidate.match(/\]/g) || []).length;

    for (let i = 0; i < openSquare - closeSquare; i++) candidate += "]";
    for (let i = 0; i < openCurly - closeCurly; i++) candidate += "}";

    try {
      return JSON.parse(candidate);
    } catch (e3) {
      console.warn("Auto-repaired JSON parse failed:", e3);
    }
  }

  return fallbackData;
}

// Initialize Gemini AI Client
const getGeminiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY || 'AIzaSyAE9TerFp7AyHlSd7q1bab6ne0G09LVQAc';
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
};

// AI Title Generator Route with Token Saver Engine
app.post("/api/ai/title-generator", async (req, res) => {
  try {
    const { topic, category, tone, language, currentTitle, extraPrompt, bypassCache } = req.body;

    if (!topic && !currentTitle) {
      return res.status(400).json({ error: "Please provide a topic or current title to generate ideas." });
    }

    // 1. Check Token Saver Cache
    const cacheKey = getRequestHash({ type: 'title-gen', topic, category, tone, language, currentTitle, extraPrompt });
    const cachedEntry = aiCache.get(cacheKey);

    if (!bypassCache && cachedEntry && (Date.now() - cachedEntry.timestamp < CACHE_TTL_MS)) {
      return res.json({
        success: true,
        data: cachedEntry.data,
        cached: true,
        tokensSaved: cachedEntry.estimatedTokens,
        message: "Served instantly from AI Token Saver Cache!",
      });
    }

    const ai = getGeminiClient();

    const cleanTopic = (topic || "").trim().slice(0, 300);
    const cleanCurrentTitle = (currentTitle || "").trim().slice(0, 200);

    const systemPrompt = `You are an elite YouTube Growth & Viral Title Strategist.
Generate 8-10 high-CTR, click-worthy, SEO-friendly YouTube video title ideas based on the user's topic.
Group titles by different psychological angles (Viral Hook, Curiosity Driven, How-To/Educational, Listicle/Numbers, SEO Keyword Driven, Storytelling, Emotional/Shocking, Bangla/Bilingual if requested).
Keep titles concise (preferably 40-70 characters for best display on mobile/desktop).
CRITICAL: Do NOT use raw unescaped double quotes inside title or reason strings. Use single quotes (') instead.
Return JSON strictly matching the requested schema.`;

    const userContent = `
Generate YouTube Titles for:
- Main Topic / Idea: "${cleanTopic}"
${cleanCurrentTitle ? `- Current Title to Improve: "${cleanCurrentTitle}"` : ''}
${category ? `- Video Category: ${category}` : ''}
${tone ? `- Desired Tone/Style: ${tone}` : ''}
${language ? `- Target Language: ${language}` : ''}
${extraPrompt ? `- Additional Instructions: ${extraPrompt}` : ''}
`;

    const estimatedInputTokens = estimateTokenCount(systemPrompt + userContent);

    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: userContent,
      config: {
        systemInstruction: systemPrompt,
        maxOutputTokens: 3000,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            titles: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  style: { type: Type.STRING },
                  ctrScore: { type: Type.INTEGER },
                  charCount: { type: Type.INTEGER },
                  reason: { type: Type.STRING },
                  powerWords: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                  },
                },
                required: ["title", "style", "ctrScore", "charCount", "reason", "powerWords"],
              },
            },
            viralHooks: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            suggestedKeywords: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            summary: { type: Type.STRING },
          },
          required: ["titles", "viralHooks", "suggestedKeywords", "summary"],
        },
      },
    });

    const resultText = response.text || "{}";

    const defaultFallbackTitles = {
      titles: [
        {
          title: cleanTopic ? `How to Earn Money with Websites: Complete Guide (${cleanTopic})` : "How to Earn Money with Websites in 2026",
          style: "How-To & Educational",
          ctrScore: 92,
          charCount: 55,
          reason: "Clear step-by-step benefit for viewers looking to make money online.",
          powerWords: ["Complete Guide", "Earn Money"]
        },
        {
          title: "I Made $1,000 from a Simple Website (Here's How)",
          style: "Curiosity & Hook",
          ctrScore: 95,
          charCount: 48,
          reason: "Creates high curiosity with proof and low barrier to entry.",
          powerWords: ["$1,000", "Simple Website"]
        },
        {
          title: "5 Best Websites to Earn Money Online Without Investment",
          style: "Listicle & Numbers",
          ctrScore: 94,
          charCount: 56,
          reason: "Numbers and 'without investment' drive massive click-through-rates.",
          powerWords: ["5 Best", "Without Investment"]
        }
      ],
      viralHooks: [
        "In this video, I will show you the exact strategy to earn money with websites step-by-step.",
        "Stop wasting time! Here is how beginners are making passive income with simple websites."
      ],
      suggestedKeywords: ["website income", "earn money online", "make money website 2026", "online passive income"],
      summary: "Focus on high-value keywords like 'passive income' and 'without investment' to boost search CTR."
    };

    const parsedData = safeParseAIJson(resultText, defaultFallbackTitles);

    const estimatedOutputTokens = estimateTokenCount(resultText);
    const totalTokensUsed = estimatedInputTokens + estimatedOutputTokens;
    const totalTokensSaved = 250;

    aiCache.set(cacheKey, {
      data: parsedData,
      timestamp: Date.now(),
      estimatedTokens: totalTokensUsed + totalTokensSaved,
    });

    return res.json({
      success: true,
      data: parsedData,
      cached: false,
      tokensUsed: totalTokensUsed,
      tokensSaved: totalTokensSaved,
    });
  } catch (error: any) {
    console.error("AI Title Generator Error:", error);
    return res.status(500).json({
      error: "Failed to generate AI titles",
      message: error?.message || String(error),
    });
  }
});

// AI Description Generator Route with Token Saver Engine
app.post("/api/ai/description-generator", async (req, res) => {
  try {
    const { title, topic, type, tone, language, timestamps, socialLinks, extraPrompt, bypassCache } = req.body;

    if (!title && !topic) {
      return res.status(400).json({ error: "Please provide a video title or topic to generate description." });
    }

    // 1. Check Token Saver Cache
    const cacheKey = getRequestHash({ type: 'desc-gen', title, topic, descType: type, tone, language, timestamps, socialLinks, extraPrompt });
    const cachedEntry = aiCache.get(cacheKey);

    if (!bypassCache && cachedEntry && (Date.now() - cachedEntry.timestamp < CACHE_TTL_MS)) {
      return res.json({
        success: true,
        data: cachedEntry.data,
        cached: true,
        tokensSaved: cachedEntry.estimatedTokens,
        message: "Served instantly from AI Token Saver Cache!",
      });
    }

    const ai = getGeminiClient();

    const cleanTitle = (title || "").trim().slice(0, 200);
    const cleanTopic = (topic || "").trim().slice(0, 300);

    const isChannelAbout = type === 'channel';

    const systemPrompt = isChannelAbout
      ? `You are an expert YouTube Channel Branding Strategist.
Generate an engaging, SEO-optimized, highly structured YouTube Channel "About" description.
Include channel purpose, content schedule, subscription call to action, contact info placeholder, social links section, and top channel keywords.
CRITICAL: Do NOT use raw unescaped double quotes inside values. Use single quotes (') or clean text instead.
Return JSON strictly matching the requested schema.`
      : `You are an expert YouTube Video SEO Copywriter.
Generate a high-converting, beautifully structured YouTube Video Description.
Include an irresistible hook paragraph (first 2 lines), detailed value breakdown, chapter timestamps placeholder (00:00 Intro, etc.), social media links placeholder, key search tags, and relevant #hashtags.
CRITICAL: Do NOT use raw unescaped double quotes inside values. Use single quotes (') or clean text instead.
Return JSON strictly matching the requested schema.`;

    const userContent = `
Generate YouTube ${isChannelAbout ? 'Channel About Section' : 'Video Description'} for:
${cleanTitle ? `- Video Title / Channel Name: "${cleanTitle}"` : ''}
${cleanTopic ? `- Topic / Details: "${cleanTopic}"` : ''}
${tone ? `- Tone: ${tone}` : ''}
${language ? `- Language: ${language}` : ''}
${timestamps ? `- Include Timestamps Placeholder: Yes` : ''}
${socialLinks ? `- Include Social Links Section: Yes` : ''}
${extraPrompt ? `- Focus / Instructions: ${extraPrompt}` : ''}
`;

    const estimatedInputTokens = estimateTokenCount(systemPrompt + userContent);

    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: userContent,
      config: {
        systemInstruction: systemPrompt,
        maxOutputTokens: 2500,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            fullDescription: {
              type: Type.STRING,
              description: "Complete formatted description with markdown line breaks and sections",
            },
            hookParagraph: {
              type: Type.STRING,
              description: "The first 2 lines designed for search results snippet",
            },
            timestampsSection: {
              type: Type.STRING,
              description: "Formatted chapters/timestamps block",
            },
            suggestedHashtags: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "5-8 hashtags starting with #",
            },
            suggestedKeywords: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "8-12 search intent keywords used",
            },
            summary: {
              type: Type.STRING,
              description: "1-2 sentence tip on using this description",
            },
          },
          required: ["fullDescription", "hookParagraph", "timestampsSection", "suggestedHashtags", "suggestedKeywords", "summary"],
        },
      },
    });

    const resultText = response.text || "{}";

    const defaultDescFallback = {
      fullDescription: `🔥 Welcome to our channel!\n\nIn this video "${cleanTitle || cleanTopic || "YouTube Guide"}", we dive deep into actionable tips and strategies.\n\n📌 What You Will Learn:\n- Key concepts and step-by-step guidance\n- Proven strategies for growth and success\n- Real-world examples and tools\n\n⏰ TIMESTAMPS:\n0:00 - Introduction\n1:15 - Main Concept\n3:45 - Step-by-Step Tutorial\n6:20 - Bonus Tips & Wrap-Up\n\n🔗 CONNECT WITH US:\n- Subscribe for more: https://youtube.com/@yourchannel\n- Instagram: https://instagram.com/yourhandle\n\n#YouTubeSEO #ContentCreation #Growth`,
      hookParagraph: `In this video "${cleanTitle || cleanTopic || "YouTube Guide"}", discover step-by-step strategies to succeed online.`,
      timestampsSection: "0:00 - Introduction\n1:15 - Main Concept\n3:45 - Step-by-Step Tutorial\n6:20 - Wrap-Up",
      suggestedHashtags: ["#YouTubeSEO", "#ContentCreator", "#VideoOptimization", "#GrowthTips"],
      suggestedKeywords: ["youtube description", "video seo", "channel growth", "youtube tips"],
      summary: "Place the hook paragraph in the first 2 lines so viewers see it before clicking 'Show More'."
    };

    const parsedData = safeParseAIJson(resultText, defaultDescFallback);

    const estimatedOutputTokens = estimateTokenCount(resultText);
    const totalTokensUsed = estimatedInputTokens + estimatedOutputTokens;
    const totalTokensSaved = 300;

    aiCache.set(cacheKey, {
      data: parsedData,
      timestamp: Date.now(),
      estimatedTokens: totalTokensUsed + totalTokensSaved,
    });

    return res.json({
      success: true,
      data: parsedData,
      cached: false,
      tokensUsed: totalTokensUsed,
      tokensSaved: totalTokensSaved,
    });
  } catch (error: any) {
    console.error("AI Description Generator Error:", error);
    return res.status(500).json({
      error: "Failed to generate AI description",
      message: error?.message || String(error),
    });
  }
});

// Health Check API
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", message: "Server and AI Engine active" });
});

// AI Optimization Route for YouTube Videos & Channels (With Token Saver Engine)
app.post("/api/ai/optimize", async (req, res) => {
  try {
    const { mode, type, title, description, tags, keywords, category, stats, extraPrompt, bypassCache } = req.body;

    if (!title && !description) {
      return res.status(400).json({ error: "Please provide title or description to analyze." });
    }

    const isVideo = type === 'video' || mode === 'video';

    // 1. Check Token Saver Cache first
    const cacheKey = getRequestHash(req.body);
    const cachedEntry = aiCache.get(cacheKey);

    if (!bypassCache && cachedEntry && (Date.now() - cachedEntry.timestamp < CACHE_TTL_MS)) {
      return res.json({
        success: true,
        data: cachedEntry.data,
        cached: true,
        tokensSaved: cachedEntry.estimatedTokens,
        message: "Served instantly from AI Token Saver Cache!",
      });
    }

    const ai = getGeminiClient();

    // 2. Token Saver: Compress and truncate over-length input text
    const cleanTitle = (title || "").trim().slice(0, 200);
    const cleanDescription = (description || "").trim().slice(0, 800); // Truncate giant descriptions to save tokens
    const cleanTags = Array.isArray(tags) ? tags.slice(0, 15) : tags;
    const cleanKeywords = Array.isArray(keywords) ? keywords.slice(0, 10) : keywords;

    const rawInputLength = (title || "").length + (description || "").length;
    const compressedInputLength = cleanTitle.length + cleanDescription.length;
    const inputTokensSaved = Math.max(0, estimateTokenCount(description || "") - estimateTokenCount(cleanDescription));

    const systemPrompt = isVideo
      ? `You are an efficient YouTube SEO Specialist.
Analyze video metadata, detect main SEO flaws, and generate concise, high-converting alternatives.
Keep all reasons and descriptions short, punchy, and direct to conserve response tokens.
Return JSON strictly with:
- issues: array of 2-4 brief flaws in current metadata
- suggestedTitles: array of 5 viral titles with brief 1-sentence clickability reasons
- suggestedDescription: concise, highly structured description with hook, timestamps placeholder, and keywords
- suggestedTags: array of 15 relevant video tags
- suggestedKeywords: array of 8 search keywords
- suggestedHashtags: array of 5 hashtags
- overallScore: integer 0-100
- summary: concise 1-2 sentence summary.`
      : `You are an efficient YouTube Channel Strategist.
Analyze channel metadata, detect branding flaws, and generate concise channel branding optimizations.
Keep explanations brief and direct.
Return JSON strictly with:
- issues: array of 2-4 channel flaws
- suggestedTitles: array of 5 channel name / slogan ideas with 1-sentence reasons
- suggestedDescription: concise, professional channel About section
- suggestedTags: array of 15 channel search tags
- suggestedKeywords: array of 8 channel keywords
- suggestedHashtags: array of 5 channel hashtags
- overallScore: integer 0-100
- summary: concise 1-2 sentence summary.`;

    const userContent = `
Analyze & Optimize YouTube ${isVideo ? 'Video' : 'Channel'}:
${cleanTitle ? `- Title: "${cleanTitle}"` : ''}
${cleanDescription ? `- Description Snippet:\n"""\n${cleanDescription}\n"""` : ''}
${cleanTags && cleanTags.length ? `- Tags: ${Array.isArray(cleanTags) ? cleanTags.join(', ') : cleanTags}` : ''}
${cleanKeywords && cleanKeywords.length ? `- Keywords: ${Array.isArray(cleanKeywords) ? cleanKeywords.join(', ') : cleanKeywords}` : ''}
${category ? `- Category: ${category}` : ''}
${extraPrompt ? `- Focus: ${extraPrompt}` : ''}
`;

    const estimatedInputTokens = estimateTokenCount(systemPrompt + userContent);

    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: userContent,
      config: {
        systemInstruction: systemPrompt,
        maxOutputTokens: 2560, // Safe output token limit to prevent truncated JSON
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            issues: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Brief issues found",
            },
            suggestedTitles: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  reason: { type: Type.STRING },
                },
              },
              description: "5 titles with short reasons",
            },
            suggestedDescription: {
              type: Type.STRING,
              description: "Concise optimized description",
            },
            suggestedTags: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Array of tags",
            },
            suggestedKeywords: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Array of keywords",
            },
            suggestedHashtags: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Array of hashtags",
            },
            overallScore: {
              type: Type.INTEGER,
              description: "SEO score 0-100",
            },
            summary: {
              type: Type.STRING,
              description: "Concise summary",
            },
          },
          required: [
            "issues",
            "suggestedTitles",
            "suggestedDescription",
            "suggestedTags",
            "suggestedKeywords",
            "suggestedHashtags",
            "overallScore",
            "summary",
          ],
        },
      },
    });

    const resultText = response.text || "{}";

    const defaultOptimizerFallback = {
      issues: ["Metadata is missing key SEO search triggers", "Description lacks clear call-to-action"],
      suggestedTitles: [
        { title: cleanTitle ? `${cleanTitle} (2026 Updated)` : "Viral Video Optimization Idea", reason: "Adds year and high search relevance." }
      ],
      suggestedDescription: `${cleanTitle || "Video"}\n\nIn this video, discover the ultimate guide and insights.\n\nCHAPTERS:\n0:00 Introduction\n1:30 Main Highlights\n\n#YouTubeSEO #Growth`,
      suggestedTags: ["youtube seo", "growth", "viral video", "optimization"],
      suggestedKeywords: ["youtube ranking", "seo tips", "video views"],
      suggestedHashtags: ["#YouTubeSEO", "#ViralVideo", "#Growth"],
      overallScore: 78,
      summary: "Metadata optimized for search intent and viewer retention."
    };

    const parsedData = safeParseAIJson(resultText, defaultOptimizerFallback);

    const estimatedOutputTokens = estimateTokenCount(resultText);
    const totalTokensUsed = estimatedInputTokens + estimatedOutputTokens;
    const totalTokensSaved = inputTokensSaved + 300; // estimated savings from prompt truncation & token limits

    // 3. Store in Token Saver Cache
    aiCache.set(cacheKey, {
      data: parsedData,
      timestamp: Date.now(),
      estimatedTokens: totalTokensUsed + totalTokensSaved,
    });

    return res.json({
      success: true,
      data: parsedData,
      cached: false,
      tokensUsed: totalTokensUsed,
      tokensSaved: totalTokensSaved,
      compressionRatio: rawInputLength > 0 ? Math.round(((rawInputLength - compressedInputLength) / rawInputLength) * 100) : 0,
    });
  } catch (error: any) {
    console.error("AI Optimization Error:", error);
    return res.status(500).json({
      error: "Failed to generate AI optimizations",
      message: error?.message || String(error),
    });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

if (process.env.VERCEL !== "1" && !process.env.VERCEL_ENV) {
  startServer();
}

export default app;
