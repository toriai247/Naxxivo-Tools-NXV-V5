import { useEffect, lazy, Suspense } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Route, Switch, Router as WouterRouter } from 'wouter';
import { ThemeProvider } from '@/components/theme-provider';
import { AppLayout } from '@/components/layout/AppLayout';
import { NotificationBanner } from '@/components/NotificationBanner';
import { initNotifications } from '@/lib/notifications';
import { Loader2 } from 'lucide-react';

// Direct load for homepage to render fast
import HomePage from '@/pages/Home';

// Lazy load secondary routes to save 350KB+ unused JS on mobile entry
const YouTubeDownloader = lazy(() => import('@/pages/YouTubeDownloader'));
const TitleGenerator = lazy(() => import('@/pages/TitleGenerator'));
const DescriptionGenerator = lazy(() => import('@/pages/DescriptionGenerator'));
const ChannelAnalyzer = lazy(() => import('@/pages/ChannelAnalyzer'));
const VideoAnalyzer = lazy(() => import('@/pages/VideoAnalyzer'));
const ImageConverter = lazy(() => import('@/pages/ImageConverter'));
const TextTools = lazy(() => import('@/pages/TextTools'));
const FaviconGenerator = lazy(() => import('@/pages/FaviconGenerator'));
const AboutUs = lazy(() => import('@/pages/AboutUs'));
const ContactUs = lazy(() => import('@/pages/ContactUs'));
const PrivacyPolicy = lazy(() => import('@/pages/PrivacyPolicy'));
const History = lazy(() => import('@/pages/History'));
const PromptsHome = lazy(() => import('@/pages/PromptsHome'));
const PromptDetail = lazy(() => import('@/pages/PromptDetail'));
const AuthPage = lazy(() => import('@/pages/Auth'));
const ProfilePage = lazy(() => import('@/pages/Profile'));
const NotFound = lazy(() => import('@/pages/not-found'));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 60 * 1000,
    },
  },
});

function RouteLoadingFallback() {
  return (
    <div className="flex items-center justify-center min-h-[40vh] w-full">
      <div className="flex flex-col items-center gap-3 text-muted-foreground">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <span className="text-xs font-medium">Loading studio view...</span>
      </div>
    </div>
  );
}

function Router() {
  return (
    <AppLayout>
      <Suspense fallback={<RouteLoadingFallback />}>
        <Switch>
          <Route path="/" component={HomePage} />
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
          <Route path="/text-tools" component={TextTools} />
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
    initNotifications();
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
