import React, { useState, useEffect } from 'react';
import { Link } from 'wouter';
import { supabase, PromptItem, PROMPT_CATEGORIES } from '@/lib/supabase';
import { Search, Sparkles, Copy, Check, Heart, Plus, Filter, Tag, Layers, ExternalLink, Image as ImageIcon } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useHistory } from '@/hooks/useHistory';
import { sound } from '@/lib/sound';

export default function PromptsHome() {
  const [prompts, setPrompts] = useState<PromptItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [likedIds, setLikedIds] = useState<Record<string, boolean>>({});
  const [showAddModal, setShowAddModal] = useState(false);

  // New Prompt Form state
  const [newTitle, setNewTitle] = useState('');
  const [newPrompt, setNewPrompt] = useState('');
  const [newNegativePrompt, setNewNegativePrompt] = useState('');
  const [newCategory, setNewCategory] = useState('Anime');
  const [newImageUrl, setNewImageUrl] = useState('');
  const [newModel, setNewModel] = useState('Midjourney v6');
  const [newAuthor, setNewAuthor] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { toast } = useToast();
  const { addHistoryItem } = useHistory();

  useEffect(() => {
    fetchPrompts();
  }, []);

  const fetchPrompts = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('prompts')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Supabase fetch error:', error);
        setPrompts([]);
      } else {
        setPrompts((data as PromptItem[]) || []);
      }
    } catch (err) {
      console.error('Supabase fetch exception:', err);
      setPrompts([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyPrompt = (e: React.MouseEvent, promptItem: PromptItem) => {
    e.stopPropagation();
    e.preventDefault();
    sound.copy();
    navigator.clipboard.writeText(promptItem.prompt);
    setCopiedId(promptItem.id);
    setTimeout(() => setCopiedId(null), 2000);

    toast({
      title: "Prompt Copied! 📋",
      description: `Copied prompt for "${promptItem.title}" to clipboard.`,
    });

    addHistoryItem({
      type: 'text_tool',
      title: `Copied Prompt: ${promptItem.title}`,
      description: promptItem.prompt.substring(0, 40) + '...'
    });
  };

  const handleToggleLike = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    e.preventDefault();
    sound.like();
    const isLiked = likedIds[id];
    setLikedIds(prev => ({ ...prev, [id]: !prev[id] }));

    const targetPrompt = prompts.find(p => p.id === id);
    if (!targetPrompt) return;

    const newLikesCount = Math.max(0, targetPrompt.likes_count + (isLiked ? -1 : 1));

    setPrompts(prev => prev.map(p => {
      if (p.id === id) {
        return { ...p, likes_count: newLikesCount };
      }
      return p;
    }));

    try {
      await supabase.from('prompts').update({ likes_count: newLikesCount }).eq('id', id);
    } catch (err) {
      console.error('Error updating likes in Supabase:', err);
    }
  };

  const handleAddPromptSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newPrompt.trim() || !newImageUrl.trim()) {
      sound.error();
      toast({
        title: "Missing Fields",
        description: "Please fill in title, prompt, and image URL.",
        variant: "destructive"
      });
      return;
    }

    sound.generate();
    setSubmitting(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const authorName = newAuthor.trim() || session?.user?.user_metadata?.full_name || session?.user?.email?.split('@')[0] || 'Creator';

      const itemToInsert = {
        title: newTitle.trim(),
        prompt: newPrompt.trim(),
        negative_prompt: newNegativePrompt.trim() || null,
        category: newCategory,
        image_url: newImageUrl.trim(),
        model: newModel,
        aspect_ratio: '1:1',
        likes_count: 0,
        author_name: authorName,
        author_id: session?.user?.id || null,
        created_at: new Date().toISOString()
      };

      const { data, error } = await supabase.from('prompts').insert([itemToInsert]).select();

      if (error) {
        console.error('Supabase insert error:', error);
        sound.error();
        toast({
          title: "Database Error",
          description: error.message || "Failed to publish prompt to Supabase.",
          variant: "destructive"
        });
      } else {
        sound.success();
        if (data && data[0]) {
          setPrompts(prev => [data[0] as PromptItem, ...prev]);
        } else {
          fetchPrompts();
        }

        toast({
          title: "Prompt Published! 🎉",
          description: "Your AI prompt has been added to the Supabase database.",
        });

        // Reset form
        setNewTitle('');
        setNewPrompt('');
        setNewNegativePrompt('');
        setNewImageUrl('');
        setNewAuthor('');
        setShowAddModal(false);
      }
    } catch (err: any) {
      console.error('Exception publishing prompt:', err);
      sound.error();
      toast({
        title: "Error",
        description: err.message || "An unexpected error occurred.",
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  const filteredPrompts = prompts.filter(p => {
    const matchesCategory = selectedCategory === 'All' || p.category.toLowerCase() === selectedCategory.toLowerCase();
    const matchesSearch = searchQuery === '' || 
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
      p.prompt.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.tags && p.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase())));
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="space-y-8 max-w-7xl mx-auto py-4">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-primary/20 via-purple-500/10 to-blue-500/10 border border-primary/20 p-6 md:p-10 shadow-xl">
        <div className="max-w-2xl space-y-3 relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" /> AI Image Prompts Hub
          </div>
          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-foreground">
            Explore & Copy High-CTR <span className="text-primary">AI Prompts</span>
          </h1>
          <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
            Free collection of Midjourney, DALL-E, Stable Diffusion & FLUX prompts. Select any category, preview generated images, and copy prompts with 1 click. No signup required to view!
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-3">
            <Button onClick={() => setShowAddModal(true)} className="gap-2 shadow-lg">
              <Plus className="w-4 h-4" /> Share Your Prompt
            </Button>
            <a 
              href="#category-section" 
              className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground px-4 py-2 rounded-lg hover:bg-muted/50 transition-colors"
            >
              <Filter className="w-4 h-4" /> Browse Categories
            </a>
          </div>
        </div>

        <div className="absolute right-[-20px] bottom-[-20px] opacity-15 pointer-events-none hidden md:block">
          <ImageIcon className="w-80 h-80 text-primary" />
        </div>
      </div>

      {/* Search & Category Filter */}
      <div id="category-section" className="space-y-4">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          {/* Search bar */}
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3.5 top-3 w-4 h-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search prompts, styles, keywords..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-11 bg-card border-primary/20 rounded-xl focus:border-primary"
            />
          </div>

          <div className="text-xs text-muted-foreground font-mono self-end md:self-auto">
            Showing <span className="font-bold text-foreground">{filteredPrompts.length}</span> Prompts
          </div>
        </div>

        {/* Categories Bar */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          {PROMPT_CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border ${
                selectedCategory === cat
                  ? 'bg-primary text-primary-foreground border-primary shadow-md scale-[1.02]'
                  : 'bg-card text-muted-foreground border-border hover:bg-muted hover:text-foreground'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Prompt Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-80 bg-card rounded-2xl animate-pulse border border-border" />
          ))}
        </div>
      ) : filteredPrompts.length === 0 ? (
        <Card className="border-dashed bg-card/50 p-12 text-center space-y-3">
          <Layers className="w-12 h-12 text-muted-foreground/50 mx-auto" />
          <h3 className="font-bold text-lg">No prompts found</h3>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto">
            No AI prompts matched your search query or selected category.
          </p>
          <Button variant="outline" onClick={() => { setSelectedCategory('All'); setSearchQuery(''); }}>
            Reset Filters
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPrompts.map((item) => {
            const isLiked = !!likedIds[item.id];
            const isCopied = copiedId === item.id;

            return (
              <Card 
                key={item.id} 
                className="group overflow-hidden rounded-2xl bg-card border-border hover:border-primary/50 transition-all duration-300 shadow-md hover:shadow-xl flex flex-col"
              >
                {/* Image Preview Container */}
                <div className="relative aspect-[4/3] bg-muted overflow-hidden">
                  <img
                    src={item.image_url}
                    alt={item.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                    onError={(e) => {
                      // Fallback image if link is broken
                      (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=800';
                    }}
                  />
                  
                  {/* Category Badge */}
                  <span className="absolute top-3 left-3 px-2.5 py-1 rounded-lg bg-background/80 backdrop-blur-md text-[11px] font-bold text-foreground border border-white/10 shadow-sm">
                    {item.category}
                  </span>

                  {/* Likes button */}
                  <button
                    onClick={(e) => handleToggleLike(e, item.id)}
                    className={`absolute top-3 right-3 p-2 rounded-full backdrop-blur-md transition-transform active:scale-95 shadow-md ${
                      isLiked 
                        ? 'bg-red-500 text-white' 
                        : 'bg-background/80 text-foreground hover:bg-background'
                    }`}
                  >
                    <Heart className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`} />
                  </button>

                  {/* Hover Quick Action */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 p-4 flex flex-col justify-end">
                    <Link href={`/prompts/${item.id}`}>
                      <Button size="sm" variant="secondary" className="w-full gap-2 text-xs font-semibold backdrop-blur-md bg-white/20 hover:bg-white text-white hover:text-black border border-white/20">
                        <ExternalLink className="w-3.5 h-3.5" /> View Prompt Details
                      </Button>
                    </Link>
                  </div>
                </div>

                {/* Content Details */}
                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <Link href={`/prompts/${item.id}`}>
                        <h3 className="font-bold text-base text-foreground hover:text-primary transition-colors line-clamp-1">
                          {item.title}
                        </h3>
                      </Link>
                      {item.model && (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-muted text-muted-foreground border shrink-0">
                          {item.model}
                        </span>
                      )}
                    </div>

                    {/* Prompt Box */}
                    <div className="p-3 rounded-xl bg-muted/60 border border-border/80 text-xs font-mono text-muted-foreground line-clamp-3 relative leading-relaxed my-2">
                      "{item.prompt}"
                    </div>
                  </div>

                  {/* Footer & Copy Action */}
                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/60 text-xs text-muted-foreground">
                    <span className="truncate">By {item.author_name || 'Creator'}</span>
                    
                    <Button
                      size="sm"
                      onClick={(e) => handleCopyPrompt(e, item)}
                      className={`gap-1.5 text-xs font-bold transition-all ${
                        isCopied 
                          ? 'bg-emerald-600 hover:bg-emerald-700 text-white' 
                          : 'bg-primary hover:bg-primary/90 text-primary-foreground'
                      }`}
                    >
                      {isCopied ? (
                        <>
                          <Check className="w-3.5 h-3.5" /> Copied
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" /> Copy Prompt
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Share Prompt Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-card border border-primary/20 p-6 rounded-2xl shadow-2xl max-w-lg w-full space-y-4 animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" /> Submit AI Image Prompt
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-muted-foreground hover:text-foreground">
                ✕
              </button>
            </div>

            <form onSubmit={handleAddPromptSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold mb-1 text-foreground">Title</label>
                <Input
                  type="text"
                  placeholder="e.g. Cyberpunk Samurai in Rain"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="block font-semibold mb-1 text-foreground">Generated Result Image URL</label>
                <Input
                  type="url"
                  placeholder="https://images.unsplash.com/... or direct image link"
                  value={newImageUrl}
                  onChange={(e) => setNewImageUrl(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="block font-semibold mb-1 text-foreground">Prompt Text</label>
                <textarea
                  rows={3}
                  placeholder="Enter the full AI generation prompt..."
                  value={newPrompt}
                  onChange={(e) => setNewPrompt(e.target.value)}
                  className="w-full p-2.5 rounded-lg bg-background border border-border text-foreground focus:border-primary text-xs"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold mb-1 text-foreground">Negative Prompt (Optional)</label>
                <textarea
                  rows={2}
                  placeholder="e.g. ugly, blurry, extra fingers, watermark..."
                  value={newNegativePrompt}
                  onChange={(e) => setNewNegativePrompt(e.target.value)}
                  className="w-full p-2.5 rounded-lg bg-background border border-border text-foreground focus:border-primary text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1 text-foreground">Category</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="w-full p-2.5 rounded-lg bg-background border border-border text-foreground focus:border-primary"
                  >
                    {PROMPT_CATEGORIES.filter(c => c !== 'All').map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold mb-1 text-foreground">AI Model</label>
                  <select
                    value={newModel}
                    onChange={(e) => setNewModel(e.target.value)}
                    className="w-full p-2.5 rounded-lg bg-background border border-border text-foreground focus:border-primary"
                  >
                    <option value="Midjourney v6">Midjourney v6</option>
                    <option value="FLUX.1 Dev">FLUX.1 Dev</option>
                    <option value="DALL-E 3">DALL-E 3</option>
                    <option value="Niji 6">Niji 6 (Anime)</option>
                    <option value="Stable Diffusion XL">Stable Diffusion XL</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold mb-1 text-foreground">Your Name / Creator Handle</label>
                <Input
                  type="text"
                  placeholder="e.g. Naxxivo Creator"
                  value={newAuthor}
                  onChange={(e) => setNewAuthor(e.target.value)}
                />
              </div>

              <div className="flex gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setShowAddModal(false)} className="w-full">
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting} className="w-full">
                  {submitting ? 'Publishing...' : 'Publish Prompt'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
