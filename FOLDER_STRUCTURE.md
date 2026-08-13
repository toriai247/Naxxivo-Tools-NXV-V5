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
├── server.ts                 # Express Backend Server (Gemini AI Endpoint /api/ai/optimize)
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
│   │   ├── YouTubeDownloader.tsx # ইউটিউব থাম্বনেইল ডাউনলোড পেজ (Home)
│   │   ├── TitleGenerator.tsx    # এআই ইউটিউব টাইটেল জেনারেটর পেজ (High CTR, Viral Hooks, Token Saver)
│   │   ├── DescriptionGenerator.tsx # এআই ইউটিউব ডেসক্রিপশন জেনারেটর পেজ (SEO Hook, Timestamps, Hashtags)
│   │   ├── ChannelAnalyzer.tsx   # চ্যানেল অ্যানালাইজার পেজ + AI Channel Optimizer Mode
│   │   ├── VideoAnalyzer.tsx     # ভিডিও অ্যানালাইজার পেজ + AI Video Optimizer Mode
│   │   ├── ImageConverter.tsx    # ইমেজ কনভার্টার পেজ (JPG, PNG, WEBP, AVIF)
│   │   ├── TextTools.tsx         # টেক্সট কেস কনভার্টার ও স্ট্রিং ইউটিলিটি পেজ
│   │   ├── FaviconGenerator.tsx  # ফেভিকন জেনারেটর পেজ (Multi-resolution)
│   │   └── not-found.tsx         # ৪০৪ এরর পেজ (404 Page)
│   │
│   ├── components/           # পুনর্ব্যবহারযোগ্য UI উপাদানসমূহ (Reusable UI)
│   │   ├── AiOptimizerCard.tsx # জেমিনি এআই চালিত ভিডিও ও চ্যানেল অ্যানালাইসিস ও অটো-জেনারেটর কম্পোনেন্ট
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
│       └── utils.ts          # Tailwind Class merger (cn utility)
```

---

## 💡 ফোল্ডার ও ফাইলগুলোর কাজের বিবরণ (File & Folder Purposes)

| ফোল্ডার / ফাইল | কাজের বিবরণ (Description) |
| :--- | :--- |
| **`server.ts`** | Express পূর্ণাঙ্গ ব্যাকএন্ড সার্ভার। জেমিনি এআই এপিআই (`AIzaSyAE9TerFp7AyHlSd7q1bab6ne0G09LVQAc`) এর মাধ্যমে `/api/ai/optimize` রুট পরিচালনা করে। |
| **`src/components/AiOptimizerCard.tsx`** | Gemini AI Powered Optimizer Component - চ্যানেল ও ভিডিও কনটেন্টের খুঁত শনাক্তকরণ এবং ৫টি হাই-সিটিআর টাইটেল, এসইও ডেসক্রিপশন, ট্যাগ, কিওয়ার্ড ও হ্যাশট্যাগ জেনারেটর। |
| **`src/api/aiService.ts`** | ক্লায়েন্ট-সাইড এআই সার্ভিস। ব্যাকএন্ড এনপয়েন্ট চেষ্টা করার পাশাপাশি স্ট্যাটিক ডিপ্লয়ে সরাসরি ব্রাউজার থেকে জেমিনি এআই এপিআই কল সাপোর্ট করে। |
| **`src/pages/ChannelAnalyzer.tsx`** | ইউটিউব চ্যানেল অ্যানালাইসিস পেজ - প্রফেশনাল চ্যানেলের যাবতীয় তথ্য ও জেমিনি এআই চ্যানেল অপটিমাইজার অন্তর্ভুক্ত। |
| **`src/pages/VideoAnalyzer.tsx`** | ইউটিউব ভিডিও অ্যানালাইসিস পেজ - ভিডিওর বিস্তারিত তথ্য, HD থাম্বনেইল ডাউনলোড ও জেমিনি এআই ভিডিও অপটিমাইজার অন্তর্ভুক্ত। |
| **`src/api/youtubeApi.ts`** | YouTube Data API v3 এর জন্য পার্সিং ও অ্যানালাইসিস ফাংশনসমূহ। |
| **`src/api/apiKeys.ts`** | হার্ডকোডেড প্রাইমারি YouTube API Key (`AIzaSyAg9E9e1UEg8PEGCSqU7l1nI5pzCmlLWvg`) এবং Gemini AI Key (`AIzaSyAE9TerFp7AyHlSd7q1bab6ne0G09LVQAc`) ধারণ করে যা ডিপ্লয় ওয়েবসাইটে সরাসরি কার্যকর। |
| **`FOLDER_STRUCTURE.md`** | সম্পূর্ণ প্রজেক্ট ফাইল স্ট্রাকচার এবং ওয়ার্কফ্লো নথিভুক্তকরণ ফাইল। |

---

## 📌 অটো-আপডেট প্রোটোকল (Automatic Update Protocol)
> **নিয়ম:** যখনই কোনো নতুন ফাইল বা ফোল্ডার পরিবর্তন/যুক্ত করা হবে, তখনই এই `FOLDER_STRUCTURE.md` ফাইলটি স্বয়ংক্রিয়ভাবে হালনাগাদ রাখা হবে।
