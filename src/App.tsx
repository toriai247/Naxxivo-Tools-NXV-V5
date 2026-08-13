import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { Route, Switch, Router as WouterRouter } from 'wouter';
import { ThemeProvider } from '@/components/theme-provider';
import { AppLayout } from '@/components/layout/AppLayout';

import YouTubeDownloader from '@/pages/YouTubeDownloader';
import TitleGenerator from '@/pages/TitleGenerator';
import DescriptionGenerator from '@/pages/DescriptionGenerator';
import ChannelAnalyzer from '@/pages/ChannelAnalyzer';
import VideoAnalyzer from '@/pages/VideoAnalyzer';
import ImageConverter from '@/pages/ImageConverter';
import TextTools from '@/pages/TextTools';
import FaviconGenerator from '@/pages/FaviconGenerator';

const queryClient = new QueryClient();

function Router() {
  return (
    <AppLayout>
      <Switch>
        <Route path="/" component={YouTubeDownloader} />
        <Route path="/title-generator" component={TitleGenerator} />
        <Route path="/description-generator" component={DescriptionGenerator} />
        <Route path="/channel-analyzer" component={ChannelAnalyzer} />
        <Route path="/video-analyzer" component={VideoAnalyzer} />
        <Route path="/image-converter" component={ImageConverter} />
        <Route path="/text-tools" component={TextTools} />
        <Route path="/favicon-generator" component={FaviconGenerator} />
        <Route component={NotFound} />
      </Switch>
    </AppLayout>
  );
}

function App() {
  return (
    <ThemeProvider defaultTheme="dark">
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <WouterRouter base={(import.meta.env.BASE_URL || '/').replace(/\/$/, '')}>
            <Router />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
