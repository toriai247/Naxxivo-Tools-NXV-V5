import React, { Suspense, lazy, useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Route, Switch, Router as WouterRouter } from 'wouter';
import { ThemeProvider } from '@/components/theme-provider';
import { AppLayout } from '@/components/layout/AppLayout';
import { NotificationBanner } from '@/components/NotificationBanner';
import { initNotifications } from '@/lib/notifications';

// Eager load Home for instant LCP on root
import HomePage from '@/pages/Home';

// Lazy load other routes to keep initial bundle tiny and fast on mobile
const SmartBot = lazy(() => import('@/pages/SmartBot'));
const YouTubeDownloader = lazy(() => import('@/pages/YouTubeDownloader'));
const TitleGenerator = lazy(() => import('@/pages/TitleGenerator'));
const DescriptionGenerator = lazy(() => import('@/pages/DescriptionGenerator'));
const ChannelAnalyzer = lazy(() => import('@/pages/ChannelAnalyzer'));
const VideoAnalyzer = lazy(() => import('@/pages/VideoAnalyzer'));
const ImageConverter = lazy(() => import('@/pages/ImageConverter'));
const ImageCompressor = lazy(() => import('@/pages/ImageCompressor'));
const ImageCropper = lazy(() => import('@/pages/ImageCropper'));
const MenuDirectory = lazy(() => import('@/pages/MenuDirectory'));
const TextTools = lazy(() => import('@/pages/TextTools'));
const FaviconGenerator = lazy(() => import('@/pages/FaviconGenerator'));
const AboutUs = lazy(() => import('@/pages/AboutUs'));
const ContactUs = lazy(() => import('@/pages/ContactUs'));
const PrivacyPolicy = lazy(() => import('@/pages/PrivacyPolicy'));
const History = lazy(() => import('@/pages/History'));
const PromptsHome = lazy(() => import('@/pages/PromptsHome'));
const PromptDetail = lazy(() => import('@/pages/PromptDetail'));
const SoundEffectsLibrary = lazy(() => import('@/pages/SoundEffectsLibrary'));
const ApiKeysDashboard = lazy(() => import('@/pages/ApiKeysDashboard'));
const AuthPage = lazy(() => import('@/pages/Auth'));
const ProfilePage = lazy(() => import('@/pages/Profile'));
const NotFound = lazy(() => import('@/pages/not-found'));

const queryClient = new QueryClient();

function PageFallback() {
  return (
    <div className="flex items-center justify-center py-20 min-h-[300px]">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        <span className="text-xs text-muted-foreground font-medium">Loading tool...</span>
      </div>
    </div>
  );
}

function Router() {
  return (
    <AppLayout>
      <Suspense fallback={<PageFallback />}>
        <Switch>
          <Route path="/" component={HomePage} />
          <Route path="/smart-bot" component={SmartBot} />
          <Route path="/ai-bot" component={SmartBot} />
          <Route path="/chatbot" component={SmartBot} />
          <Route path="/thumbnail-downloader" component={YouTubeDownloader} />
          <Route path="/youtube-thumbnail-downloader" component={YouTubeDownloader} />
          <Route path="/prompts" component={PromptsHome} />
          <Route path="/prompts/:id" component={PromptDetail} />
          <Route path="/auth" component={AuthPage} />
          <Route path="/profile" component={ProfilePage} />
          <Route path="/title-generator" component={TitleGenerator} />
          <Route path="/description-generator" component={DescriptionGenerator} />
          <Route path="/channel-analyzer" component={ChannelAnalyzer} />
          <Route path="/video-analyzer" component={VideoAnalyzer} />
          <Route path="/image-converter" component={ImageConverter} />
          <Route path="/image-compressor" component={ImageCompressor} />
          <Route path="/compress-image" component={ImageCompressor} />
          <Route path="/image-cropper" component={ImageCropper} />
          <Route path="/crop-image" component={ImageCropper} />
          <Route path="/menu" component={MenuDirectory} />
          <Route path="/tools" component={MenuDirectory} />
          <Route path="/text-tools" component={TextTools} />
          <Route path="/sound-effects" component={SoundEffectsLibrary} />
          <Route path="/sfx" component={SoundEffectsLibrary} />
          <Route path="/sounds" component={SoundEffectsLibrary} />
          <Route path="/api-keys" component={ApiKeysDashboard} />
          <Route path="/developers" component={ApiKeysDashboard} />
          <Route path="/api-docs" component={ApiKeysDashboard} />
          <Route path="/favicon-generator" component={FaviconGenerator} />
          <Route path="/history" component={History} />
          <Route path="/about-us" component={AboutUs} />
          <Route path="/contact-us" component={ContactUs} />
          <Route path="/privacy-policy" component={PrivacyPolicy} />
          <Route component={NotFound} />
        </Switch>
      </Suspense>
    </AppLayout>
  );
}

function App() {
  useEffect(() => {
    if ('requestIdleCallback' in window) {
      window.requestIdleCallback(() => {
        initNotifications();
      }, { timeout: 3000 });
    } else {
      setTimeout(() => {
        initNotifications();
      }, 2000);
    }
  }, []);

  return (
    <ThemeProvider defaultTheme="dark">
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <WouterRouter base={(import.meta.env.BASE_URL || '/').replace(/\/$/, '')}>
            <Router />
            <NotificationBanner />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
