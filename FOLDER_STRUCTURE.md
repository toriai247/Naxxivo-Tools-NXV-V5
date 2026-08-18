# 📁 Project Folder & File Structure Guide

This document outlines the complete file, folder, and system workflow architecture for the Naxxivo Web Utilities platform.

---

## 🔄 System Architecture & Workflow Diagram

```mermaid
graph TD
    A[User Browser] -->|Requests Route| B(src/main.tsx)
    B --> C(src/App.tsx - Wouter Router)
    C --> D[src/components/layout/AppLayout.tsx]
    
    D --> E[Navigation Sidebar & Categorized Menu]
    D --> F[Page Router Container]
    D --> G[Footer & Sound Settings]
    D -->|Tracks Route Visits| REC[src/hooks/useRecentTools.ts - LocalStorage Sync]

    F -->|/| H[pages/Home.tsx - Creator Studio Hub]
    H --> RUT[src/components/RecentlyUsedTools.tsx - Horizontal Quick List]
    RUT --> REC
    
    F -->|/smart-bot| SB[pages/SmartBot.tsx - All-in-One Smart AI Assistant]
    F -->|/sound-effects| SFX[pages/SoundEffectsLibrary.tsx - 60+ Royalty-Free SFX Studio Hub]
    F -->|/api-keys| KEYS[pages/ApiKeysDashboard.tsx - Developer API Keys & Live Sandbox]
    F -->|/image-compressor| IC[pages/ImageCompressor.tsx - 10MB Quality Compressor]
    F -->|/image-cropper| ICR[pages/ImageCropper.tsx - Image Cropper & Aspect Ratio Tools]
    F -->|/image-converter| ICONV[pages/ImageConverter.tsx - 5 Formats WebP/PNG/JPG/AVIF/BMP]
    F -->|/menu| MENU[pages/MenuDirectory.tsx - Categorized Tools Directory]
    F -->|/title-generator| TG[pages/TitleGenerator.tsx]
    F -->|/description-generator| DG[pages/DescriptionGenerator.tsx]
    F -->|/channel-analyzer| CH[pages/ChannelAnalyzer.tsx]
    F -->|/video-analyzer| VA[pages/VideoAnalyzer.tsx]
    F -->|/thumbnail-downloader| TD[pages/YouTubeDownloader.tsx]
    F -->|/text-tools| J[pages/TextTools.tsx]
    F -->|/favicon-generator| K[pages/FaviconGenerator.tsx]
    F -->|/prompts| P[pages/PromptsHome.tsx]
    F -->|/prompts/:id| PD[pages/PromptDetail.tsx]
    F -->|/history| HIST[pages/History.tsx]
    F -->|/about-us| ABT[pages/AboutUs.tsx]
    F -->|/contact-us| CNT[pages/ContactUs.tsx]
    F -->|/privacy-policy| PP[pages/PrivacyPolicy.tsx]
    F -->|404 Route| L[pages/not-found.tsx]

    KEYS -->|REST v1 Endpoints| SRV[server.ts - Express Public API v1 Engine]
    SRV --> EP1[/api/v1/prompts - AI Prompts Catalog]
    SRV --> EP2[/api/v1/youtube/extract - 4K/HD YouTube Metadata & Thumbnails]
    SRV --> EP3[/api/v1/sfx - 60+ Royalty-Free Audio FX]
    SRV --> EP4[/api/v1/text/convert - Case/Slug/Reading Time API]
    SRV --> EP5[/api/v1/ai/generate-title - Gemini AI Title Generator]
    SRV --> EP6[/api/v1/keys - API Key Generation & Management]

    ICR -->|Canvas Transforms & Export| CROPUTIL[src/lib/cropImage.ts - getCroppedImg with Rotate & Flip]
    SB -->|Auto-detects YouTube URLs| YT[src/api/youtubeApi.ts]
    SB -->|In-Chat Image Processing| CANVAS[Browser Canvas - WebP/PNG/JPG/Compress]
    SB -->|Gemini 3.7 Chat & Intelligence| AI[src/api/aiService.ts]
    CH & VA & TG & DG --> YT
    CH & VA & TG & DG --> AI
    AI -->|1. Try Express Endpoint| SRV[server.ts - Express Endpoints /api/ai/chat, /api/ai/optimize]
    AI -->|2. Direct Browser Fallback| GEMINI[Gemini AI Engine - Direct Client API Call]
    YT --> KEY[src/api/apiKeys.ts - YouTube Permanent API Key]

    CH --> M1[Channel Banner, Handle, ID, Stats, Account Age, Keywords]
    CH --> M2[Gemini AI Channel Optimizer - SEO Name, Description, Tags]
    VA --> V1[Video Thumbnail + 1080p HD Download, Metrics, SEO Keywords]
    VA --> V2[Gemini AI Video Optimizer - High CTR Titles, SEO Description, Hashtags]
```

### 🔁 Data & Execution Flow Summary
1. **Entry Point**: `src/main.tsx` initializes the application and renders `src/App.tsx`.
2. **Layout Shell**: `AppLayout.tsx` provides categorized navigation (Image Tools, YouTube Tools, AI & Prompts, Text & Utilities), collapsible sidebar groups, theme toggle, audio controllers, and auto-records tool page visits into `useRecentTools`.
3. **Recently Used Carousel**: `RecentlyUsedTools.tsx` renders on the homepage as a responsive horizontal list of clickable cards with relative time badges, tool icons, and one-click quick open transitions.
4. **Smart AI Assistant**: `src/pages/SmartBot.tsx` operates with pure client-side intelligence and zero API key requirement for local image operations (compression, format conversion, and tag extraction).
5. **Image Cropper**: `src/pages/ImageCropper.tsx` uses `react-easy-crop` and `src/lib/cropImage.ts` to perform in-browser free-form, 1:1, 4:3, 16:9, 9:16 cropping with zoom, 360° rotation, horizontal/vertical flipping, and instant format export.
6. **YouTube API Integration**: `src/api/youtubeApi.ts` fetches real-time channel statistics and video metadata.
7. **AI Optimizer & Token Saver**: `src/components/AiOptimizerCard.tsx` uses token caching, prompt compression, and server-side optimization to save API tokens.

---

## 📂 Root Directory Structure

```text
/
├── AGENTS.md                 # Agent instructions and automatic documentation rules
├── FOLDER_STRUCTURE.md       # Comprehensive folder structure and workflow guide
├── vercel.json               # Vercel deployment SPA rewrite configuration
├── index.html                # Main HTML entry point with Google AdSense and meta tags
├── server.ts                 # Express Backend Server with Gemini AI endpoints
├── api/                      # Vercel Serverless Function directory
│   └── index.ts              # Express Serverless Handler for Vercel (/api/*)
├── public/                   # Static assets and media files
│   ├── sw.js                 # Service Worker for push notification handling
│   ├── sitemap.xml           # Search Engine Sitemap Index
│   ├── robots.txt            # Search Engine Crawler rules
│   ├── _redirects            # Netlify/Static Host SPA rewrite rules
│   └── sounds/               # Audio sound effects library (.wav files)
│       └── SFX50+/           # New SFX 50+ Audio pack (53 high quality WAV sound effects)
├── metadata.json             # App metadata and title configuration
├── package.json              # Project dependencies and script definitions
├── vite.config.ts            # Vite build and development configuration
├── src/                      # Source code root
│   ├── main.tsx              # Application entry point
│   ├── App.tsx               # Main Router and page layout routes
│   ├── index.css             # Global CSS and Tailwind directives
│   │
│   ├── api/                  # API clients and key configurations
│   │   ├── apiKeys.ts        # YouTube and Gemini API key constants
│   │   ├── aiService.ts      # Gemini AI client handler
│   │   └── youtubeApi.ts     # YouTube Data API v3 helper functions
│   │
│   ├── pages/                # Application page views
│   │   ├── Home.tsx              # Main Creator Studio Hub with categorized tool search & Recently Used section
│   │   ├── SmartBot.tsx          # Full-screen Smart AI Bot & Automation chat
│   │   ├── SoundEffectsLibrary.tsx # SFX Audio Studio Hub with 60+ previewable and downloadable WAV sound effects
│   │   ├── ApiKeysDashboard.tsx  # Developer API Keys Hub, Code Generators (cURL, Python, JS, PHP), and Live Sandbox
│   │   ├── ImageCompressor.tsx   # Image Compressor (10MB max, Quality slider 10-100)
│   │   ├── ImageCropper.tsx      # Image Cropper (Free, 1:1, 4:3, 16:9, Zoom, Rotate, Flip)
│   │   ├── ImageConverter.tsx    # Format Converter (JPEG, PNG, WebP, AVIF, BMP)
│   │   ├── MenuDirectory.tsx     # Categorized Tools Directory (/menu, /tools)
│   │   ├── ChannelAnalyzer.tsx   # YouTube Channel Analyzer & AI Audit
│   │   ├── VideoAnalyzer.tsx     # YouTube Video & SEO Tag Inspector
│   │   ├── YouTubeDownloader.tsx # YouTube HD Thumbnail Downloader
│   │   ├── TitleGenerator.tsx    # AI YouTube Title Generator (High CTR, Viral Hooks)
│   │   ├── DescriptionGenerator.tsx # AI Video Description Generator (Timestamps, SEO)
│   │   ├── TextTools.tsx         # Text manipulation and format exporter
│   │   ├── FaviconGenerator.tsx  # Multi-resolution Favicon Generator (.ico)
│   │   ├── PromptsHome.tsx       # AI Image Prompts Hub
│   │   ├── PromptDetail.tsx      # Prompt Detail and 1-Click Copy View
│   │   ├── Auth.tsx              # Supabase Authentication View
│   │   ├── Profile.tsx           # User Profile View
│   │   ├── History.tsx           # Action and Download History Tracker
│   │   ├── AboutUs.tsx           # About Us information page
│   │   ├── ContactUs.tsx         # Contact Us feedback form
│   │   ├── PrivacyPolicy.tsx     # Privacy policy and GDPR compliance
│   │   └── not-found.tsx         # 404 error page
│   │
│   ├── components/           # Reusable UI components
│   │   ├── SmartBotTour.tsx      # Interactive popover & tooltip onboarding tour for Smart Bot & proactive features
│   │   ├── RecentlyUsedTools.tsx # Horizontal clickable list of recently interacted tools with scroll & clear
│   │   ├── SoundEffectsController.tsx # Global audio toggle and volume modal
│   │   ├── NotificationBanner.tsx # Push notification permission banner
│   │   ├── AiOptimizerCard.tsx # Gemini AI optimization card
│   │   ├── WorkflowScanner.tsx # YouTube inspection progress animation
│   │   ├── bot/              # SmartBot dedicated chat components
│   │   │   ├── InChatCropper.tsx # Interactive in-chat cropper with aspect ratio presets, zoom, rotate, flip & export
│   │   │   ├── TypewriterText.tsx # Smooth typewriter-style response streaming animation component with cursor & skip feature
│   │   │   └── AiEngineSettingsModal.tsx # On-device local AI & WebLLM engine selection modal with progress bar & cache controls
│   │   ├── layout/
│   │   │   └── AppLayout.tsx # Navigation layout shell with categorized menus
│   │   ├── seo/
│   │   │   ├── BookmarkBanner.tsx # Bookmark helper banner
│   │   │   ├── FaqSection.tsx     # Reusable FAQ accordion
│   │   │   ├── SeoContentImage.tsx # Image tools SEO content
│   │   │   ├── SeoContentText.tsx  # Text tools SEO content
│   │   │   └── SeoContentYouTube.tsx # YouTube tools SEO content
│   │   ├── ui/               # Base UI primitives (buttons, inputs, cards)
│   │   └── theme-provider.tsx # Dark/Light theme provider
│   │
│   ├── hooks/                # Custom React hooks
│   │   ├── useRecentTools.ts # Tracks interacted tools, timestamps, and localStorage persistence
│   │   ├── useHistory.ts     # Action and download history tracker
│   │   └── useToast.ts       # Toast notification hook
│   │
│   └── lib/                  # Helper utilities
│       ├── imageProcessor.ts # Universal in-browser image decoding, format conversion & compression engine
│       ├── cropImage.ts      # Canvas image cropping, rotation, flip & export engine
│       ├── botLogic.ts       # SmartBot NLP engine and rule matching
│       ├── botCommandMatcher.ts # SmartBot command exporter
│       ├── sound.ts          # Web Audio & sound effect manager
│       ├── webLlmEngine.ts   # WebLLM & IndexedDB on-device AI model management, download progress & local inference engine
│       ├── supabase.ts       # Supabase client configuration
│       ├── notifications.ts  # Push notification triggers
│       └── utils.ts          # Tailwind cn utility function
```

---

## 💡 File & Component Purpose Guide

| File / Directory | Purpose & Functionality |
| :--- | :--- |
| **`src/pages/ApiKeysDashboard.tsx`** | Complete Developer Portal with API key creation, activation/revocation, live interactive request sandbox/tester, status code matrix, and multi-language code snippets (cURL, JavaScript Fetch, Python Requests, Node.js Axios, PHP cURL). |
| **`server.ts`** | Express backend server containing the API Key Registry, `verifyApiKey` rate limiter (60 req/min), and public v1 REST endpoints (`/api/v1/prompts`, `/api/v1/youtube/extract`, `/api/v1/sfx`, `/api/v1/text/convert`, `/api/v1/ai/generate-title`, `/api/v1/health`, `/api/v1/keys`). |
| **`src/components/RecentlyUsedTools.tsx`** | Horizontal clickable list/carousel of recently visited tools with relative timestamps, category tags, horizontal scrolling, and quick removal. |
| **`src/components/SmartBotTour.tsx`** | Lightweight interactive onboarding tour & spotlight tooltip system guiding new homepage visitors through the Smart Bot launcher, proactive attachment workflow, and interactive cropper. |
| **`src/hooks/useRecentTools.ts`** | Custom React hook managing recently used tools, localStorage persistence, visit counts, and relative time formatting. |
| **`src/lib/botLogic.ts`** | Central AI Bot brain & persistent memory orchestration layer with proactive media detection (`detectMediaTypeFromInput`, `getPoliteOptionsPrompt`), contextual follow-up parsing, channel memory, conversational context builder, and zero-API-key regex parsers. |
| **`src/pages/SmartBot.tsx`** | Interactive Smart AI Bot & Automation chat with proactive attachment options, contextual media follow-ups ("crop 1:1", "compress koro"), 1-click Brain Memory management modal, persistent conversation history, live YouTube querying, and interactive in-chat image cropper/converters. |
| **`src/components/bot/InChatCropper.tsx`** | Rich in-chat interactive cropper component embedded directly in conversation flow with aspect presets (1:1, 16:9, 9:16, 4:3, 3:2, Free), real-time zoom (1x-3x), rotation (0°-360°), horizontal/vertical flip, and multi-format export. |
| **`src/pages/Home.tsx`** | Ultra-lightweight, minimal, and fast-loading Creator Studio homepage with instant search, compact category filter pills, direct 1-click tool launcher cards, and fast Recently Used integration. |
| **`src/pages/ImageCropper.tsx`** | Dedicated Image Cropper with `react-easy-crop`, aspect presets (Free, 1:1, 4:3, 16:9, 9:16, 3:2), zoom, rotation, flip, and sound feedback. |
| **`src/lib/cropImage.ts`** | Canvas extraction utility executing rotational and flip calculations to output high-resolution Blobs. |
| **`src/pages/ImageCompressor.tsx`** | Dedicated image compressor with 10–100 quality slider, canvas scaling, live size metrics, and 10MB limit. |
| **`src/pages/ImageConverter.tsx`** | Format converter supporting JPEG, PNG, WebP, AVIF, and BMP with canvas rendering and audio cues. |
| **`src/pages/MenuDirectory.tsx`** | Complete categorized directory view for Image Tools, YouTube Tools, AI Hub, and Text Utilities. |
| **`src/components/layout/AppLayout.tsx`** | Responsive app shell containing categorized collapsible navigation menus, global controls, 1-click Top Header Bot button, and automatic route visit tracking. |
| **`src/pages/SoundEffectsLibrary.tsx`** | Dedicated SFX & Audio Studio Hub allowing users to preview, filter, search, copy file paths, and download 60+ royalty-free WAV sound effects (Core + SFX50+). |
| **`src/components/SoundEffectsController.tsx`** | Global interactive sound dialog featuring category tabs, instant preview, volume controls, and direct 1-click WAV sound downloads. |
| **`src/lib/sound.ts`** | Complete sound manager and SFX audio engine housing metadata for 61 studio sound effects across 6 distinct categories (Impact, Bass, Sci-Fi, Clicks, Bursts, Ambient) with Web Audio API synthesis fallback and local storage persistence. |

---

## 📌 Automatic Documentation Protocol
> **Rule:** Whenever files or folders are modified or added, this `FOLDER_STRUCTURE.md` is updated to keep documentation synchronized.
