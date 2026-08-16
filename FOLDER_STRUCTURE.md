# 📁 Project Folder & File Structure Guide (প্রজেক্ট ফোল্ডার ও ওয়ার্কফ্লো গাইড)

এই প্রজেক্টের ফাইল, ফোল্ডার এবং কাজের ওয়ার্কফ্লো (Workflow) অত্যন্ত পরিষ্কার ও গোছানোভাবে সাজানো রয়েছে যাতে আপনি সহজে বুঝতে পারেন কোন ফাইলের কাজ কী এবং কীভাবে অ্যাপ্লিকেশনটি পরিচালিত হচ্ছে।

---

## 🔄 System Architecture & Workflow Diagram (ওয়ার্কফ্লো ডায়াগ্রাম)

```mermaid
graph TD
    A[User Browser] -->|Requests Route| B(src/main.tsx)
    B --> C(src/App.tsx - Wouter Router)
    C --> D[src/components/layout/AppLayout.tsx]
    
    D --> E[Navigation Sidebar & Header]
    D --> F[Page Router Container]
    D --> G[Footer & SEO Links]

    F -->|/| H[pages/YouTubeDownloader.tsx]
    F -->|/title-generator| TG[pages/TitleGenerator.tsx]
    F -->|/description-generator| DG[pages/DescriptionGenerator.tsx]
    F -->|/channel-analyzer| CH[pages/ChannelAnalyzer.tsx]
    F -->|/video-analyzer| VA[pages/VideoAnalyzer.tsx]
    F -->|/image-converter| I[pages/ImageConverter.tsx]
    F -->|/text-tools| J[pages/TextTools.tsx]
    F -->|/favicon-generator| K[pages/FaviconGenerator.tsx]
    F -->|404 Route| L[pages/not-found.tsx]

    CH & VA & TG & DG --> YT[src/api/youtubeApi.ts]
    CH & VA & TG & DG --> AI[src/api/aiService.ts]
    AI -->|1. Try Express Endpoint| SRV[server.ts - Express Endpoints /api/ai/optimize, /api/ai/title-generator, /api/ai/description-generator]
    AI -->|2. Direct Browser Fallback on Static Deploy| GEMINI[Gemini AI Engine - Direct Client API Call with Permanent Key: AIzaSyAE9TerFp7AyHlSd7q1bab6ne0G09LVQAc]
    YT --> KEY[src/api/apiKeys.ts - YouTube Permanent API Key: AIzaSyAg9E9e1UEg8PEGCSqU7l1nI5pzCmlLWvg]

    CH --> M1[Channel Banner, Logo, Handle, Channel ID, Direct URL, Trailer Link]
    CH --> M2[Subscribers, Video Count, Total Views, Avg Views per Video]
    CH --> M3[Joined Date, Account Age, Primary Language, Country, Made For Kids]
    CH --> M4[Active Status Indicator & Success Rate %]
    CH --> M5[Channel Keywords + 1-Click Copy, Wikipedia Topics & Social Links]
    CH --> M6[Gemini AI Channel Optimizer - SEO Name, About Description, Tags]
    CH --> M7[Last 30 Days Top 3 Most Viewed Videos List]

    VA --> V1[Video Thumbnail + 1080p HD Download]
    VA --> V2[Title, Views, Likes, Comments, Engagement Rate %]
    VA --> V3[Gemini AI Video Optimizer - High CTR Titles, SEO Description, Hashtags]
    VA --> V4[Video Tags + 1-Click Copy All Tags]
    VA --> V5[Extracted #Hashtags + 1-Click Copy]
    VA --> V6[Generated SEO Keywords + 1-Click Copy]
    VA --> V7[Technical Specs: Duration, HD/SD, Captions, Category]
    VA --> V8[Extracted Description Links List & Wikipedia Topics]

    H & CH & VA & I & J & K --> P[components/seo/FaqSection.tsx]
    H & CH & VA & I & J & K --> Q[components/seo/BookmarkBanner.tsx]
```

### 🔁 Data & Execution Flow Summary
1. **Entry Point**: ব্যবহারকারী ওয়েবসাইটে প্রবেশ করলে `src/main.tsx` লোড হয় এবং `src/App.tsx` কে চালু করে।
2. **Layout Shell**: `AppLayout.tsx` সব পেজে নেভিগেশন হেডার, সাইডবার, ডার্ক/লাইট মোড টগল এবং ফুটার প্রদর্শন করে।
3. **Express + Gemini Server**: `server.ts` ফাইলটি Express ব্যাকএন্ড এবং `@google/genai` এর মাধ্যমে `/api/ai/optimize` এনপয়েন্টে সারভার-সাইড জেমিনি এআই এপিআই কল সাপোর্ট করে। এতে বিল্ট-ইন **AI Token Saver System** (Server-side In-Memory MD5 Cache, Smart Prompt Truncation & Compression, maxOutputTokens Limit) যুক্ত আছে।
4. **YouTube API Integration**: `src/api/youtubeApi.ts` ফাইলটি `src/api/apiKeys.ts` এর পার্মানেন্ট প্রাইমারি ইউটিউব API key (`AIzaSyAg9E9e1UEg8PEGCSqU7l1nI5pzCmlLWvg`) ব্যবহার করে রিয়েল-টাইম চ্যানেল ও ভিডিও ইনফরমেশন এনে দেয়।
5. **AI Optimizer & Token Saver**: `src/components/AiOptimizerCard.tsx` পার্মানেন্ট জেমিনি এআই কী (`AIzaSyAE9TerFp7AyHlSd7q1bab6ne0G09LVQAc`) এবং স্মার্ট টোকেন সেভার ব্যবহার করে অপটিমাইজেশন জেনারেট করে এবং টোকেন অপচয় রোধে ক্যাশ থেকে ইনস্ট্যান্ট রেজাল্ট ডেলিভার করে।

---

## 📂 Root Directory Structure (ফোল্ডার স্ট্রাকচার)

```text
/
├── AGENTS.md                 # প্রজেক্ট রুলস ও অটো-আপডেট প্রোটোকল
├── FOLDER_STRUCTURE.md       # প্রজেক্টের সম্পূর্ণ ফাইল স্ট্রাকচার ও ওয়ার্কফ্লো গাইড
├── vercel.json               # Vercel ডিপ্লয়মেন্ট রিউরাইট কনফিগারেশন (404 Page Refresh Issue Fix)
├── index.html                # মূল এইচটিএমএল টেমপ্লেট ও গুগল অ্যাডসেন্স (Google AdSense: ca-pub-7837194709908029) ইন্টিগ্রেশন
├── server.ts                 # Express Backend Server (Gemini AI Endpoint /api/ai/optimize)
├── api/                      # Vercel Serverless Function ডিরেক্টরি
│   └── index.ts              # Express Serverless Handler for Vercel (/api/*)
├── public/                   # স্ট্যাটিক অ্যাসেটস ও ডিরেক্টরি
│   ├── sw.js                 # Service Worker for handling background Push Notification clicks
│   ├── sitemap.xml           # সমস্ত টুলস ও পেজসমূহের সার্চ ইঞ্জিন সাইটম্যাপ Index
│   ├── robots.txt            # Search Engine Crawler নির্দেশিকা ও সাইটম্যাপ লিংক
│   ├── google5e581e8123c0b2a5.html # Google Search Console সাইট ভেরিফিকেশন ফাইল
│   ├── _redirects            # Netlify/Static Host SPA Routing Rewrite Rules
│   └── sounds/               # ইন্টারেক্টিভ অডিও সাউন্ড ইফেক্ট লাইব্রেরি (.wav files)
│       ├── UI_Button_Press.wav
│       ├── UI_Tab_Switch.wav
│       ├── UI_Success.wav
│       ├── UI_Error.wav
│       ├── UI_Copy.wav
│       ├── UI_Download.wav
│       ├── UI_Generate.wav
│       ├── UI_Trash_Clear.wav
│       ├── UI_Bookmark.wav
│       ├── UI_Like_Heart.wav
│       ├── UI_Glitch_Scan.wav
│       ├── UI_Bounce.wav
│       └── UI_Launch.wav
├── metadata.json             # অ্যাপ্লিকেশনের নাম ও মেটাডেটা
├── package.json              # প্রজেক্টের ডিপেন্ডেন্সি ও নোড প্যাকেজসমূহ
├── vite.config.ts            # Vite বিল্ড ও সার্ভার কনফিগারেশন
├── src/                      # মূল অ্যাপ্লিকেশনের সোর্স কোড (Source Code)
│   ├── main.tsx              # ওয়েবসাইটের প্রধান এন্ট্রি পয়েন্ট (Main Entry Point)
│   ├── App.tsx               # মূল রাউটিং এবং পেজ হ্যান্ডলার (Main App Router)
│   ├── index.css             # গ্লোবাল CSS এবং Tailwind CSS ডিরেক্টিভ
│   │
│   ├── api/                  # API চাবি ও এক্সটার্নাল সার্ভিস ইন্টিগ্রেশন
│   │   ├── apiKeys.ts        # প্রাইমারি YouTube API Key ও Gemini AI Permanent Key কনফিগারেশন
│   │   ├── aiService.ts      # Gemini AI Optimizer Client API Handler
│   │   └── youtubeApi.ts     # ইউটিউব চ্যানেল এবং ভিডিও অ্যানালাইসিসের ডেটা ফেচিং লজিক
│   │
│   ├── pages/                # ওয়েবসাইটের প্রতিটি একক পেজ/ভিউ
│   │   ├── Home.tsx              # মূল হোমপেজ / ক্রিয়েটর স্টুডিও হাব (All-in-One Creator & AI Hub)
│   │   ├── YouTubeDownloader.tsx # ইউটিউব থাম্বনেইল ডাউনলোড পেজ (/thumbnail-downloader)
│   │   ├── TitleGenerator.tsx    # এআই ইউটিউব টাইটেল জেনারেটর পেজ (High CTR, Viral Hooks, Token Saver)
│   │   ├── DescriptionGenerator.tsx # এআই ইউটিউব ডেসক্রিপশন জেনারেটর পেজ (SEO Hook, Timestamps, Hashtags)
│   │   ├── ChannelAnalyzer.tsx   # চ্যানেল অ্যানালাইজার পেজ + AI Channel Optimizer Mode
│   │   ├── VideoAnalyzer.tsx     # ভিডিও অ্যানালাইজার পেজ + AI Video Optimizer Mode
│   │   ├── ImageConverter.tsx    # ইমেজ কনভার্টার পেজ (JPG, PNG, WEBP, AVIF)
│   │   ├── TextTools.tsx         # টেক্সট কেস কনভার্টার ও স্ট্রিং ইউটিলিটি পেজ
│   │   ├── FaviconGenerator.tsx  # ফেভিকন জেনারেটর পেজ (Multi-resolution)
│   │   ├── PromptsHome.tsx       # AI Image Prompts Hub পেজ (Browse, Categories, 1-Click Copy & Share)
│   │   ├── PromptDetail.tsx      # AI Image Prompt Detail পেজ (Full Prompt, Negative Prompt, Model, Ratio)
│   │   ├── Auth.tsx              # Supabase Login & Signup পেজ
│   │   ├── Profile.tsx           # User Profile পেজ (Name, Address, Email, Phone, Social Links, Avatar)
│   │   ├── History.tsx           # ইউজার অ্যাকশন ও ডাউনলোড হিস্ট্রি ট্র্যাক করার পেজ
│   │   ├── AboutUs.tsx           # 'About Us' ইনফরমেশন পেজ (মিশন, ভিশন ও প্লাটফর্ম পরিচিতি)
│   │   ├── ContactUs.tsx         # 'Contact Us' কন্টাক্ট ফর্ম ও মেসেজ পেজ
│   │   ├── PrivacyPolicy.tsx     # 'Privacy Policy' গুগল এডসেন্স ও ডাটা প্রাইভেসি পলিসি পেজ
│   │   └── not-found.tsx         # ৪০৪ এরর পেজ (404 Page)
│   │
│   ├── components/           # পুনর্ব্যবহারযোগ্য UI উপাদানসমূহ (Reusable UI)
│   │   ├── SoundEffectsController.tsx # গ্লোবাল সাউন্ড কন্ট্রোলার (Mute/Unmute, ভলিউম স্লাইডার ও সেটিংস মডাল)
│   │   ├── NotificationBanner.tsx # ইউজারের থেকে নোটিফিকেশন পারমিশন নেয়ার ফ্লোটিং ব্যানার
│   │   ├── AiOptimizerCard.tsx # জেমিনি এআই চালিত ভিডিও ও চ্যানেল অ্যানালাইসিস ও অটো-জেনারেটর কম্পোনেন্ট
│   │   ├── WorkflowScanner.tsx # ইউটিউব চ্যানেল ও ভিডিও অ্যানালাইসিসের লাইভ স্টেপ-বাই-স্টেপ এনিমেশন ও প্রোগ্রেস স্ক্যানার
│   │   ├── layout/           # লেআউট, হেডার ও ফুটার
│   │   │   └── AppLayout.tsx # নেভিগেশন সাইডবার, হেডার ও ফুটার শেল
│   │   ├── seo/              # SEO আর্টিকেলের কনটেন্ট, ব্যানার ও FAQ সেকশন
│   │   │   ├── BookmarkBanner.tsx # বুকমার্ক করার ইউজার নোটিশ ব্যানার
│   │   │   ├── FaqSection.tsx     # আক্সড কোশ্চেন (FAQ) কম্পোনেন্ট
│   │   │   ├── SeoContentImage.tsx # ইমেজ টুলসের SEO টেক্সট
│   │   │   ├── SeoContentText.tsx  # টেক্সট টুলসের SEO টেক্সট
│   │   │   └── SeoContentYouTube.tsx # ইউটিউব টুলের SEO টেক্সট
│   │   ├── ui/               # বাটন, ইনপুট, কার্ডস ইত্যাদি কম্পোনেন্ট
│   │   └── theme-provider.tsx # ডার্ক ও লাইট থিম মোড সুইচ করার কম্পোনেন্ট
│   │
│   ├── config/               # সাইট লেভেল মেটাডেটা ও লিংকস
│   │   └── site.ts           # নেভিগেশন লিংকস ও সাইট ইনফরমেশন
│   │
│   ├── types/                # টাইপস্ক্রিপ্ট ইন্টারফেস ও ডেটা টাইপ
│   │   └── index.ts          # গ্লোবাল টাইপ ডিক্লেয়ারেশন (ChannelAnalysisData, VideoAnalysisData)
│   │
│   ├── hooks/                # কাস্টম রিয়েক্ট হুকস (React Hooks)
│   └── lib/                  # হেল্পার ইউটিলিটি ফাংশন
│       ├── sound.ts          # রিয়েলটাইম সাউন্ড ম্যানেজার ইঞ্জিন (Web Audio API Fallback, LocalStorage Persistence & Preloading)
│       ├── supabase.ts       # Supabase Direct Client & Types (Direct API URLs & Real Database Connection)
│       ├── supabaseSchema.sql# Database SQL Schema for Prompts & Profiles
│       ├── notifications.ts  # Auto-Push Notification API logic ও 25 টি ফানি টেমপ্লেট
│       └── utils.ts          # Tailwind Class merger (cn utility)
```

---

## 💡 ফোল্ডার ও ফাইলগুলোর কাজের বিবরণ (File & Folder Purposes)

| ফোল্ডার / ফাইল | কাজের বিবরণ (Description) |
| :--- | :--- |
| **`server.ts`** | Express পূর্ণাঙ্গ ব্যাকএন্ড সার্ভার। জেমিনি এআই এপিআই (`AIzaSyAE9TerFp7AyHlSd7q1bab6ne0G09LVQAc`) এর মাধ্যমে `/api/ai/optimize` রুট পরিচালনা করে। |
| **`src/pages/Home.tsx`** | মূল ড্যাশবোর্ড ও ক্রিয়েটর হাব হোমপেজ। সব ১০+ ক্রিয়েটর টুলস, রিয়েলটাইম সার্চ বার, ক্যাটাগরি ফিল্টার ও হাইলাইটস প্রদর্শন করে। |
| **`src/lib/supabase.ts`** | Supabase ক্লায়েন্ট ইনিশিয়ালাইজেশন ফাইল। ডিরেক্ট API URL ও পাবলিশেবল কি সরাসরি সংজ্ঞায়িত এবং কোনো ডেমো ডেটা ছাড়া রিয়েল ডেটাবেস অপারেশন নিশ্চিত করে। |
| **`src/pages/PromptsHome.tsx`** | এআই প্রম্পট হাব - সরাসরি Supabase `prompts` টেবিল থেকে রিয়েল প্রম্পট ডেটা ফেচ ও পাবলিশ করে। |
| **`src/pages/PromptDetail.tsx`** | নির্দিষ্ট প্রম্পটের ফুল রেজুলেশন প্রিভিউ, পজিটিভ/নেগেটিভ প্রম্পট কপি এবং রিয়েল লাইক কাউন্টার। |
| **`src/pages/Profile.tsx`** | ইউজার প্রোফাইল পেজ - Supabase Auth সেশনের সাথে সংযুক্ত এবং `profiles` টেবিলে আসল নাম, ইমেইল, ফোন, ঠিকানা ও সোশ্যাল লিংক সংরক্ষণ করে। |
| **`src/components/AiOptimizerCard.tsx`** | Gemini AI Powered Optimizer Component - চ্যানেল ও ভিডিও কনটেন্টের খুঁত শনাক্তকরণ এবং ৫টি হাই-সিটিআর টাইটেল, এসইও ডেসক্রিপশন, ট্যাগ, কিওয়ার্ড ও হ্যাশট্যাগ জেনারেটর। |
| **`src/api/aiService.ts`** | ক্লায়েন্ট-সাইড এআই সার্ভিস। ব্যাকএন্ড এনপয়েন্ট চেষ্টা করার পাশাপাশি স্ট্যাটিক ডিপ্লয়ে সরাসরি ব্রাউজার থেকে জেমিনি এআই এপিআই কল সাপোর্ট করে। |
| **`src/pages/ChannelAnalyzer.tsx`** | ইউটিউব চ্যানেল অ্যানালাইসিস পেজ - প্রফেশনাল চ্যানেলের যাবতীয় তথ্য ও জেমিনি এআই চ্যানেল অপটিমাইজার অন্তর্ভুক্ত। |
| **`src/pages/VideoAnalyzer.tsx`** | ইউটিউব ভিডিও অ্যানালাইসিস পেজ - ভিডিওর বিস্তারিত তথ্য, HD থাম্বনেইল ডাউনলোড ও জেমিনি এআই ভিডিও অপটিমাইজার অন্তর্ভুক্ত। |
| **`src/lib/sound.ts`** | ইন্টারেক্টিভ সাউন্ড ম্যানেজার ইঞ্জিন - অডিও ফাইল প্লেব্যাক, ভলিউম কন্ট্রোল, লোকালস্টোরেজ পারসিস্টেন্স এবং ওয়েব অডিও এপিআই সিন্থেসিস ফলব্যাক পরিচালনা করে। |
| **`src/components/SoundEffectsController.tsx`** | সাউন্ড কন্ট্রোলার UI - হেডার/সাইডবারে দ্রুত সাউন্ড মিউট/আনমিউট বাটন এবং ফুটার সেটিংস মডাল প্রদান করে। |
| **`src/api/youtubeApi.ts`** | YouTube Data API v3 এর জন্য পার্সিং ও অ্যানালাইসিস ফাংশনসমূহ। |
| **`src/api/apiKeys.ts`** | হার্ডকোডেড প্রাইমারি YouTube API Key (`AIzaSyAg9E9e1UEg8PEGCSqU7l1nI5pzCmlLWvg`) এবং Gemini AI Key (`AIzaSyAE9TerFp7AyHlSd7q1bab6ne0G09LVQAc`) ধারণ করে যা ডিপ্লয় ওয়েবসাইটে সরাসরি কার্যকর। |
| **`FOLDER_STRUCTURE.md`** | সম্পূর্ণ প্রজেক্ট ফাইল স্ট্রাকচার এবং ওয়ার্কফ্লো নথিভুক্তকরণ ফাইল। |

---

## 📌 অটো-আপডেট প্রোটোকল (Automatic Update Protocol)
> **নিয়ম:** যখনই কোনো নতুন ফাইল বা ফোল্ডার পরিবর্তন/যুক্ত করা হবে, তখনই এই `FOLDER_STRUCTURE.md` ফাইলটি স্বয়ংক্রিয়ভাবে হালনাগাদ রাখা হবে।
