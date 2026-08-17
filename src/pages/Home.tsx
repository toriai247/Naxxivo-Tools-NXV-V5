import React, { useState, useMemo } from 'react';
import { Link } from 'wouter';
import { 
  Sparkles, 
  Youtube, 
  Image as ImageIcon, 
  BarChart3, 
  Video, 
  FileText, 
  Palette, 
  Type, 
  History, 
  Search, 
  ArrowRight, 
  Zap, 
  ShieldCheck, 
  Sliders, 
  Star, 
  CheckCircle2,
  TrendingUp,
  Download,
  Copy,
  ExternalLink,
  Bot,
  Crop
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import { sound } from '@/lib/sound';

interface ToolItem {
  id: string;
  title: string;
  description: string;
  category: 'ai' | 'youtube' | 'design' | 'utility';
  href: string;
  icon: React.ElementType;
  badge?: string;
  badgeColor?: string;
  features: string[];
  gradient: string;
}

const TOOLS_LIST: ToolItem[] = [
  {
    id: 'smart-bot',
    title: 'Smart AI Bot & Automation Hub',
    description: 'Auto-detects YouTube links to extract tags & thumbnails, converts uploaded images, and automates tasks with Gemini 3.7 in a single chat.',
    category: 'ai',
    href: '/smart-bot',
    icon: Bot,
    badge: 'AUTOMATIC BOT ⚡',
    badgeColor: 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white border-none shadow-sm',
    features: ['Auto-Detect YouTube Links', 'In-Chat Image Converter', 'Gemini 3.7 Intelligence'],
    gradient: 'from-emerald-500/15 via-teal-500/10 to-transparent'
  },
  {
    id: 'prompts',
    title: 'AI Image Prompts Hub',
    description: 'Discover, preview, and 1-click copy high-quality prompts for Midjourney v6, FLUX.1, DALL-E 3, and Niji 6.',
    category: 'ai',
    href: '/prompts',
    icon: ImageIcon,
    badge: 'NEW & HOT 🔥',
    badgeColor: 'bg-gradient-to-r from-purple-600 to-pink-600 text-white border-none',
    features: ['1-Click Prompt Copy', 'Negative Prompts Included', 'Realtime Community Database'],
    gradient: 'from-purple-500/10 via-pink-500/5 to-transparent'
  },
  {
    id: 'thumbnail-downloader',
    title: 'YouTube Thumbnail Downloader',
    description: 'Extract and download highest resolution Ultra HD 4K, 1080p, and HD thumbnails from any YouTube video or Shorts.',
    category: 'youtube',
    href: '/thumbnail-downloader',
    icon: Youtube,
    badge: 'POPULAR ⭐',
    badgeColor: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20',
    features: ['MaxRes 4K Quality', 'Shorts & Regular Videos', 'Fast 1-Click Save'],
    gradient: 'from-red-500/10 via-orange-500/5 to-transparent'
  },
  {
    id: 'channel-analyzer',
    title: 'Channel Analyzer & AI Audit',
    description: 'Analyze any YouTube channel growth metrics, video upload velocity, subscriber projections, and get Gemini AI audit advice.',
    category: 'youtube',
    href: '/channel-analyzer',
    icon: BarChart3,
    badge: 'AI POWERED 🤖',
    badgeColor: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
    features: ['Subscriber Projections', 'Gemini AI Channel Audit', 'Tags & Topics Extraction'],
    gradient: 'from-blue-500/10 via-cyan-500/5 to-transparent'
  },
  {
    id: 'video-analyzer',
    title: 'YouTube Video & SEO Inspector',
    description: 'Inspect video metadata, hidden search tags, engagement rates, SEO score, and generate optimized titles.',
    category: 'youtube',
    href: '/video-analyzer',
    icon: Video,
    badge: 'SEO TOOL',
    badgeColor: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
    features: ['Extract Hidden Tags', 'Engagement & CTR Metrics', 'Gemini AI Optimization'],
    gradient: 'from-emerald-500/10 via-teal-500/5 to-transparent'
  },
  {
    id: 'title-generator',
    title: 'AI YouTube Title Generator',
    description: 'Generate high-converting, viral, click-worthy video titles engineered to increase CTR and organic search impressions.',
    category: 'ai',
    href: '/title-generator',
    icon: Sparkles,
    badge: 'HIGH CTR',
    badgeColor: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
    features: ['5+ Viral Title Formulas', 'Emotion & Click Triggers', 'Multi-Language Support'],
    gradient: 'from-amber-500/10 via-yellow-500/5 to-transparent'
  },
  {
    id: 'description-generator',
    title: 'AI Video Description Generator',
    description: 'Create comprehensive SEO descriptions with auto-generated timestamps, affiliate links, and keyword enrichment.',
    category: 'ai',
    href: '/description-generator',
    icon: FileText,
    badge: 'FULL SEO',
    badgeColor: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20',
    features: ['Timestamp Outlines', 'SEO Keyword Tagging', 'Social Media Templates'],
    gradient: 'from-indigo-500/10 via-purple-500/5 to-transparent'
  },
  {
    id: 'image-compressor',
    title: 'Image Compressor & Optimizer',
    description: 'Compress PNG, JPG, and WebP files to reduce size while preserving visual quality. Fully in-browser with max 10MB support.',
    category: 'design',
    href: '/image-compressor',
    icon: ImageIcon,
    badge: 'MAX 10MB ⚡',
    badgeColor: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
    features: ['Quality Slider (10-100)', 'Canvas Realtime Resizing', 'Before & After Size Comparison'],
    gradient: 'from-emerald-500/10 via-teal-500/5 to-transparent'
  },
  {
    id: 'image-cropper',
    title: 'Image Cropper (ইমেজ ক্রপ)',
    description: 'Crop images with free-form or preset aspect ratios (1:1, 4:3, 16:9, 9:16). Includes zoom, 360° rotation, and flip controls.',
    category: 'design',
    href: '/image-cropper',
    icon: Crop,
    badge: 'FREE & PRESETS ⚡',
    badgeColor: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
    features: ['Free, 1:1, 4:3, 16:9 Ratios', 'Interactive Zoom & Rotate', 'Instant PNG/JPG/WebP Export'],
    gradient: 'from-emerald-500/10 via-green-500/5 to-transparent'
  },
  {
    id: 'image-converter',
    title: 'Image Format Converter',
    description: 'Convert between PNG, JPG, WebP, AVIF, and BMP formats instantly with high fidelity and zero server uploads.',
    category: 'design',
    href: '/image-converter',
    icon: ImageIcon,
    badge: '5 FORMATS ⚡',
    badgeColor: 'bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20',
    features: ['JPEG, PNG, WebP, AVIF, BMP', 'Canvas.toBlob Engine', 'Live Quality & Lossless Mode'],
    gradient: 'from-teal-500/10 via-cyan-500/5 to-transparent'
  },
  {
    id: 'favicon-generator',
    title: 'Favicon & App Icon Generator',
    description: 'Generate complete multi-resolution favicon packages (16x16, 32x32, Apple Touch, Android) from any logo or graphic.',
    category: 'design',
    href: '/favicon-generator',
    icon: Palette,
    badge: 'COMPLETE PACK',
    badgeColor: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
    features: ['Multi-Resolution Export', 'HTML Head Code Generator', 'Instant ZIP/PNG Download'],
    gradient: 'from-rose-500/10 via-pink-500/5 to-transparent'
  },
  {
    id: 'text-tools',
    title: 'Text & String Utilities',
    description: 'Quickly convert case (Title, Camel, Upper), generate clean URL slugs, count words/characters, and format code text.',
    category: 'utility',
    href: '/text-tools',
    icon: Type,
    badge: 'FREE UTILITY',
    badgeColor: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20',
    features: ['Case Conversion Suite', 'Word & Reading Time Counter', 'URL Slug Generator'],
    gradient: 'from-slate-500/10 via-gray-500/5 to-transparent'
  },
  {
    id: 'history',
    title: 'Activity & History Tracker',
    description: 'Review your recently analyzed videos, downloaded thumbnails, generated titles, and favorite prompts in one place.',
    category: 'utility',
    href: '/history',
    icon: History,
    badge: 'LOCAL PRIVACY',
    badgeColor: 'bg-muted text-muted-foreground border-border',
    features: ['Recent Action History', '1-Click Re-Analyze', '100% Private in Browser'],
    gradient: 'from-neutral-500/10 via-stone-500/5 to-transparent'
  }
];

export default function HomePage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<'all' | 'ai' | 'youtube' | 'design' | 'utility'>('all');

  const filteredTools = useMemo(() => {
    return TOOLS_LIST.filter(tool => {
      const matchesCategory = activeCategory === 'all' || tool.category === activeCategory;
      const matchesSearch = 
        tool.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tool.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tool.features.some(f => f.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesCategory && matchesSearch;
    });
  }, [searchQuery, activeCategory]);

  return (
    <div className="max-w-6xl mx-auto py-4 space-y-12 pb-16">
      {/* Hero Banner Section */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-primary/10 via-card to-card border border-primary/20 p-8 sm:p-12 text-center shadow-lg">
        {/* Subtle Background Glow */}
        <div className="absolute -top-24 -left-24 w-72 h-72 bg-primary/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -top-24 -right-24 w-72 h-72 bg-purple-500/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-3xl mx-auto space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-xs font-semibold text-primary">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Naxxivo All-in-One Creator & AI Studio</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-foreground leading-tight">
            Free Professional Tools for <span className="text-primary bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">Content Creators</span> & AI Artists
          </h1>

          <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">
            Download 4K YouTube thumbnails, explore curated AI image prompts, analyze channels with Gemini AI, convert graphic assets, and optimize your creator workflow — all in one place.
          </p>

          {/* Quick Search Bar */}
          <div className="pt-2 max-w-xl mx-auto relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search tools (e.g. prompts, thumbnail, channel analyzer, favicon, tags)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 pr-4 py-6 text-sm rounded-2xl bg-background/80 backdrop-blur-md border-primary/30 shadow-inner focus-visible:ring-primary"
            />
            {searchQuery && (
              <button 
                onClick={() => {
                  sound.clear();
                  setSearchQuery('');
                }}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-medium text-muted-foreground hover:text-foreground bg-muted px-2 py-0.5 rounded-md"
              >
                Clear
              </button>
            )}
          </div>

          {/* Quick Metrics Bar */}
          <div className="pt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-left">
            <div className="p-3 rounded-xl bg-background/60 border border-border/50 backdrop-blur-sm">
              <p className="text-xs text-muted-foreground font-medium">Available Tools</p>
              <p className="text-lg font-bold text-foreground">11+ Dedicated Apps</p>
            </div>
            <div className="p-3 rounded-xl bg-background/60 border border-border/50 backdrop-blur-sm">
              <p className="text-xs text-muted-foreground font-medium">AI Technology</p>
              <p className="text-lg font-bold text-foreground">Gemini 3.7 & Flash</p>
            </div>
            <div className="p-3 rounded-xl bg-background/60 border border-border/50 backdrop-blur-sm">
              <p className="text-xs text-muted-foreground font-medium">Smart Bot Automation</p>
              <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">All-in-One Chat</p>
            </div>
            <div className="p-3 rounded-xl bg-background/60 border border-border/50 backdrop-blur-sm">
              <p className="text-xs text-muted-foreground font-medium">Access & Pricing</p>
              <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">100% Free Forever</p>
            </div>
          </div>

          {/* New Smart AI Bot Banner CTA */}
          <div className="pt-2">
            <Link 
              href="/smart-bot" 
              onClick={() => sound.click()} 
              className="inline-flex items-center justify-between gap-4 w-full p-4 rounded-2xl bg-gradient-to-r from-emerald-500/15 via-teal-500/10 to-primary/10 border border-emerald-500/30 hover:border-emerald-500/50 hover:shadow-lg transition-all group text-left"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center shadow-md shadow-emerald-500/20 group-hover:scale-105 transition-transform">
                  <Bot className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-foreground group-hover:text-emerald-500 transition-colors">
                      Try New: Naxxivo Smart AI Bot
                    </span>
                    <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-emerald-500 text-white shadow-sm">
                      Automatic
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Paste any YouTube URL or upload an image to automatically extract tags, download thumbnails & convert files directly in chat.
                  </p>
                </div>
              </div>
              <span className="hidden sm:inline-flex items-center gap-1 text-xs font-bold text-emerald-500 group-hover:translate-x-1 transition-transform">
                Open Bot <ArrowRight className="w-4 h-4" />
              </span>
            </Link>
          </div>
        </div>
      </div>

      {/* Category Filter Pills */}
      <div className="flex items-center justify-between flex-wrap gap-4 border-b pb-4">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
          <Button
            variant={activeCategory === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveCategory('all')}
            className="rounded-full text-xs font-semibold px-4"
          >
            All Tools ({TOOLS_LIST.length})
          </Button>
          <Button
            variant={activeCategory === 'ai' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveCategory('ai')}
            className="rounded-full text-xs font-semibold px-4 gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5 text-purple-500" /> AI Prompts & Text
          </Button>
          <Button
            variant={activeCategory === 'youtube' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveCategory('youtube')}
            className="rounded-full text-xs font-semibold px-4 gap-1.5"
          >
            <Youtube className="w-3.5 h-3.5 text-red-500" /> YouTube & SEO
          </Button>
          <Button
            variant={activeCategory === 'design' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveCategory('design')}
            className="rounded-full text-xs font-semibold px-4 gap-1.5"
          >
            <Palette className="w-3.5 h-3.5 text-teal-500" /> Image & Design
          </Button>
          <Button
            variant={activeCategory === 'utility' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveCategory('utility')}
            className="rounded-full text-xs font-semibold px-4 gap-1.5"
          >
            <Sliders className="w-3.5 h-3.5 text-slate-500" /> Utilities
          </Button>
        </div>

        <p className="text-xs text-muted-foreground">
          Showing <span className="font-bold text-foreground">{filteredTools.length}</span> tools
        </p>
      </div>

      {/* Tools Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTools.map((tool, idx) => {
          const Icon = tool.icon;
          return (
            <motion.div
              key={tool.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: idx * 0.04 }}
              className="h-full"
            >
              <Link href={tool.href} onClick={() => sound.click()}>
                <Card className={`h-full group cursor-pointer transition-all duration-300 hover:shadow-xl hover:-translate-y-1 border-border hover:border-primary/50 relative overflow-hidden bg-gradient-to-b ${tool.gradient}`}>
                  <CardContent className="p-6 flex flex-col justify-between h-full space-y-4">
                    <div className="space-y-3">
                      {/* Top Row: Icon & Badge */}
                      <div className="flex items-center justify-between">
                        <div className="p-3 rounded-2xl bg-card border border-border shadow-sm group-hover:scale-110 group-hover:border-primary/40 transition-transform duration-300">
                          <Icon className="w-6 h-6 text-primary" />
                        </div>
                        {tool.badge && (
                          <Badge variant="outline" className={`text-[10px] font-bold tracking-wider px-2.5 py-0.5 rounded-full ${tool.badgeColor}`}>
                            {tool.badge}
                          </Badge>
                        )}
                      </div>

                      {/* Title & Description */}
                      <div>
                        <h3 className="text-lg font-bold text-foreground group-hover:text-primary transition-colors flex items-center gap-1.5">
                          {tool.title}
                          <ArrowRight className="w-4 h-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200 text-primary" />
                        </h3>
                        <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                          {tool.description}
                        </p>
                      </div>

                      {/* Feature Bullet Points */}
                      <ul className="space-y-1.5 pt-2 border-t border-border/50">
                        {tool.features.map((feat, fIdx) => (
                          <li key={fIdx} className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                            <CheckCircle2 className="w-3 h-3 text-primary shrink-0" />
                            <span>{feat}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Action Button Link */}
                    <div className="pt-2">
                      <Button variant="secondary" size="sm" className="w-full justify-between text-xs font-semibold group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                        <span>Open Tool</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </motion.div>
          );
        })}
      </div>

      {filteredTools.length === 0 && (
        <div className="text-center py-16 space-y-4">
          <p className="text-lg font-medium text-foreground">No tools found matching "{searchQuery}"</p>
          <p className="text-xs text-muted-foreground">Try clearing your search query or switching categories.</p>
          <Button variant="outline" size="sm" onClick={() => { setSearchQuery(''); setActiveCategory('all'); }}>
            Reset Filters
          </Button>
        </div>
      )}

      {/* Featured Community Banner */}
      <div className="rounded-3xl border border-primary/20 bg-card p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-md">
        <div className="space-y-2 text-center sm:text-left">
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-purple-600 dark:text-purple-400">
            <ImageIcon className="w-4 h-4" /> AI Image Prompts Hub
          </div>
          <h3 className="text-xl sm:text-2xl font-bold text-foreground">
            Explore 100+ Inspiring Prompts with Result Images
          </h3>
          <p className="text-xs sm:text-sm text-muted-foreground max-w-xl">
            Browse high-resolution art generations in Anime, Realistic, 3D Render, Cyberpunk, and Photography. Copy prompts and parameters in 1 click!
          </p>
        </div>

        <Link href="/prompts">
          <Button onClick={() => sound.launch()} className="shrink-0 gap-2 font-bold px-6">
            <Sparkles className="w-4 h-4" /> Browse AI Prompts Hub
          </Button>
        </Link>
      </div>

      {/* Features & Trust Guarantee */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
        <div className="p-6 rounded-2xl bg-card border border-border shadow-sm space-y-2.5">
          <div className="p-2.5 w-fit rounded-xl bg-primary/10 text-primary">
            <Zap className="w-5 h-5" />
          </div>
          <h4 className="font-bold text-sm text-foreground">High Speed & Zero Friction</h4>
          <p className="text-xs text-muted-foreground leading-relaxed">
            All tools execute instantly in your browser with optimized serverless backend routines. No waiting queues or slow loading.
          </p>
        </div>

        <div className="p-6 rounded-2xl bg-card border border-border shadow-sm space-y-2.5">
          <div className="p-2.5 w-fit rounded-xl bg-primary/10 text-primary">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <h4 className="font-bold text-sm text-foreground">100% Free & No Sign-up Needed</h4>
          <p className="text-xs text-muted-foreground leading-relaxed">
            All tools are accessible without required registration. Explore prompts, download 4K thumbnails, and analyze channels freely.
          </p>
        </div>

        <div className="p-6 rounded-2xl bg-card border border-border shadow-sm space-y-2.5">
          <div className="p-2.5 w-fit rounded-xl bg-primary/10 text-primary">
            <TrendingUp className="w-5 h-5" />
          </div>
          <h4 className="font-bold text-sm text-foreground">Creator Growth & SEO Driven</h4>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Engineered specifically to help YouTube creators, digital artists, and marketers grow impressions, CTR, and overall reach.
          </p>
        </div>
      </div>
    </div>
  );
}
