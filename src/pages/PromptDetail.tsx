import React, { useState, useEffect } from 'react';
import { useRoute, Link } from 'wouter';
import { supabase, PromptItem } from '@/lib/supabase';
import { Copy, Check, ArrowLeft, Heart, Sparkles, Tag, Layers, Share2, Eye, ShieldCheck, User } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useHistory } from '@/hooks/useHistory';

export default function PromptDetail() {
  const [match, params] = useRoute<{ id: string }>('/prompts/:id');
  const promptId = match && params ? params.id : undefined;

  const [promptData, setPromptData] = useState<PromptItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [copiedNegative, setCopiedNegative] = useState(false);
  const [liked, setLiked] = useState(false);

  const { toast } = useToast();
  const { addHistoryItem } = useHistory();

  useEffect(() => {
    if (promptId) {
      fetchPromptDetail(promptId);
    }
  }, [promptId]);

  const fetchPromptDetail = async (id: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('prompts')
        .select('*')
        .eq('id', id)
        .single();

      if (error || !data) {
        console.error('Supabase detail fetch error:', error);
        setPromptData(null);
      } else {
        setPromptData(data as PromptItem);
      }
    } catch (err) {
      console.error('Supabase detail fetch exception:', err);
      setPromptData(null);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleDetailLike = async () => {
    if (!promptData) return;
    const newLiked = !liked;
    setLiked(newLiked);
    const newLikesCount = Math.max(0, promptData.likes_count + (newLiked ? 1 : -1));
    setPromptData({ ...promptData, likes_count: newLikesCount });

    try {
      await supabase.from('prompts').update({ likes_count: newLikesCount }).eq('id', promptData.id);
    } catch (err) {
      console.error('Error updating likes in Supabase:', err);
    }
  };

  const handleCopyPromptText = (text: string, isNegative = false) => {
    navigator.clipboard.writeText(text);
    if (isNegative) {
      setCopiedNegative(true);
      setTimeout(() => setCopiedNegative(false), 2000);
    } else {
      setCopiedPrompt(true);
      setTimeout(() => setCopiedPrompt(false), 2000);
    }

    toast({
      title: "Copied to Clipboard! 📋",
      description: isNegative ? "Negative prompt copied." : "Positive prompt copied.",
    });

    if (promptData) {
      addHistoryItem({
        type: 'text_tool',
        title: `Copied Prompt: ${promptData.title}`,
        description: text.substring(0, 40) + '...'
      });
    }
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    toast({
      title: "Link Copied!",
      description: "Prompt URL copied to clipboard.",
    });
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto py-12 space-y-6 animate-pulse">
        <div className="h-8 w-32 bg-muted rounded-lg" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="h-96 bg-muted rounded-2xl" />
          <div className="space-y-4">
            <div className="h-10 w-3/4 bg-muted rounded-lg" />
            <div className="h-32 bg-muted rounded-xl" />
            <div className="h-20 bg-muted rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  if (!promptData) {
    return (
      <div className="max-w-md mx-auto py-16 text-center space-y-4">
        <h2 className="text-xl font-bold">Prompt Not Found</h2>
        <p className="text-muted-foreground text-sm">The prompt you are looking for does not exist or has been removed.</p>
        <Link href="/prompts">
          <Button>Back to Prompts Hub</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-5xl mx-auto py-4">
      {/* Back Button */}
      <Link href="/prompts">
        <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-4 h-4" /> Back to Prompts Hub
        </Button>
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Result Image */}
        <div className="lg:col-span-6 space-y-4">
          <Card className="overflow-hidden rounded-2xl border-primary/20 bg-card shadow-xl">
            <div className="relative bg-muted overflow-hidden">
              <img
                src={promptData.image_url}
                alt={promptData.title}
                className="w-full h-auto max-h-[600px] object-cover rounded-t-2xl"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=800';
                }}
              />
              <span className="absolute top-4 left-4 px-3 py-1 rounded-xl bg-background/90 backdrop-blur-md text-xs font-bold text-foreground border border-white/10 shadow-md">
                {promptData.category}
              </span>
            </div>

            <CardContent className="p-4 flex items-center justify-between text-xs text-muted-foreground border-t">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-primary" />
                <span>Created by <strong className="text-foreground">{promptData.author_name || 'Creator'}</strong></span>
              </div>

              <div className="flex items-center gap-2">
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={handleToggleDetailLike} 
                  className={`gap-1.5 text-xs ${liked ? 'text-red-500 border-red-500/30 bg-red-500/10' : ''}`}
                >
                  <Heart className={`w-3.5 h-3.5 ${liked ? 'fill-current' : ''}`} />
                  {promptData.likes_count}
                </Button>

                <Button size="sm" variant="ghost" onClick={handleShare} className="gap-1.5 text-xs">
                  <Share2 className="w-3.5 h-3.5" /> Share
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Prompt Text & Metadata */}
        <div className="lg:col-span-6 space-y-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-semibold">
                {promptData.model || 'Midjourney v6'}
              </span>
              {promptData.aspect_ratio && (
                <span className="px-2.5 py-0.5 rounded-full bg-muted text-muted-foreground text-xs font-mono border">
                  Ratio: {promptData.aspect_ratio}
                </span>
              )}
            </div>

            <h1 className="text-2xl md:text-3xl font-extrabold text-foreground">
              {promptData.title}
            </h1>
          </div>

          {/* Positive Prompt Box */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="font-bold text-sm text-foreground flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" /> AI Generation Prompt
              </label>

              <Button
                size="sm"
                onClick={() => handleCopyPromptText(promptData.prompt, false)}
                className={`gap-1.5 text-xs font-bold transition-all ${
                  copiedPrompt ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : ''
                }`}
              >
                {copiedPrompt ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedPrompt ? 'Copied Prompt' : 'Copy Prompt'}
              </Button>
            </div>

            <div className="p-4 rounded-xl bg-card border border-primary/30 text-sm font-mono text-foreground leading-relaxed shadow-sm relative selection:bg-primary/20">
              {promptData.prompt}
            </div>
          </div>

          {/* Negative Prompt Box (If available) */}
          {promptData.negative_prompt && (
            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between">
                <label className="font-bold text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-amber-500" /> Negative Prompt
                </label>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleCopyPromptText(promptData.negative_prompt!, true)}
                  className="gap-1.5 text-xs"
                >
                  {copiedNegative ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedNegative ? 'Copied' : 'Copy Negative'}
                </Button>
              </div>

              <div className="p-3 rounded-xl bg-muted/60 border border-border text-xs font-mono text-muted-foreground leading-relaxed">
                {promptData.negative_prompt}
              </div>
            </div>
          )}

          {/* Tags */}
          {promptData.tags && promptData.tags.length > 0 && (
            <div className="space-y-2 pt-2">
              <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5" /> Style & Keywords Tags
              </label>
              <div className="flex flex-wrap gap-2">
                {promptData.tags.map((tag) => (
                  <span key={tag} className="px-3 py-1 rounded-lg bg-muted text-foreground text-xs font-medium border">
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Quick Guide */}
          <div className="p-4 rounded-xl bg-primary/5 border border-primary/10 space-y-2 text-xs text-muted-foreground">
            <h4 className="font-bold text-foreground">How to use this prompt?</h4>
            <ol className="list-decimal list-inside space-y-1">
              <li>Click <strong>Copy Prompt</strong> above.</li>
              <li>Paste into Midjourney, DALL-E 3, Leonardo AI, or Stable Diffusion.</li>
              <li>Tweak keywords or aspect ratio to customize your output!</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}
