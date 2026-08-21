import React, { useState } from 'react';
import { useLocation } from 'wouter';
import { 
  Copy, 
  Check, 
  Heart, 
  Share2, 
  FileText, 
  Plus, 
  Music2, 
  Disc3, 
  Sparkles
} from 'lucide-react';
import { ReelPost } from '@/types/reels';
import { soundEffects } from '@/lib/sound';
import { useToast } from '@/hooks/use-toast';
import { useAuthUser } from '@/hooks/useAuthUser';
import { useFollowSystem } from '@/hooks/useFollowSystem';
import { AuthRequiredModal, AuthModalMode } from '@/components/auth/AuthRequiredModal';

interface ReelSideActionsProps {
  reel: ReelPost;
  onCopySuccess?: (newCount: number) => void;
  onLikeToggle?: (newCount: number, isLiked: boolean) => void;
  onOpenInfoModal?: () => void;
}

export const ReelSideActions: React.FC<ReelSideActionsProps> = ({
  reel,
  onCopySuccess,
  onLikeToggle,
  onOpenInfoModal
}) => {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { isAuthenticated } = useAuthUser();
  
  // Follow system integration
  const creatorName = reel.author_name || 'Creator';
  const { isFollowed, toggleFollow } = useFollowSystem(creatorName);

  const [copied, setCopied] = useState<boolean>(false);
  const [isLiked, setIsLiked] = useState<boolean>(false);
  
  // Base TikTok / Seed Likes Count + User Like Toggle
  const baseLikes = reel.likes_count || reel.likes || 1240;
  const [userLiked, setUserLiked] = useState<boolean>(false);
  const [copiesCount, setCopiesCount] = useState<number>(reel.copy_count || 120);

  // Auth gate modal state
  const [authModalOpen, setAuthModalOpen] = useState<boolean>(false);
  const [authModalMode, setAuthModalMode] = useState<AuthModalMode>('copy_prompt');

  // Combined Total Likes = Original TikTok Likes + User Like
  const totalLikes = baseLikes + (userLiked ? 1 : 0);

  const formatNumber = (num: number) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
    return num.toString();
  };

  // Perform actual copy
  const doCopy = async () => {
    const textToCopy = reel.prompt_text || reel.title;
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      const newCount = copiesCount + 1;
      setCopiesCount(newCount);
      soundEffects.play('chime');

      toast({
        title: "Prompt Copied! ✨",
        description: `1-Click copied! Ready to paste into Midjourney, FLUX, CapCut, or ChatGPT.`,
      });

      if (onCopySuccess) {
        onCopySuccess(newCount);
      }

      setTimeout(() => {
        setCopied(false);
      }, 2500);
    } catch (err) {
      console.error('Clipboard copy failed:', err);
    }
  };

  // 1-Click Copy Prompt Action (PTCopy) with Strict Login Check
  const handleCopyPrompt = async (e: React.MouseEvent) => {
    e.stopPropagation();

    if (!isAuthenticated) {
      soundEffects.play('alert');
      setAuthModalMode('copy_prompt');
      setAuthModalOpen(true);
      return;
    }

    await doCopy();
  };

  // Handle Follow Toggle with Strict Login Check
  const handleFollow = async (e: React.MouseEvent) => {
    e.stopPropagation();

    if (!isAuthenticated) {
      soundEffects.play('alert');
      setAuthModalMode('follow_creator');
      setAuthModalOpen(true);
      return;
    }

    const nextState = await toggleFollow();
    soundEffects.play('pop');
    toast({
      title: nextState ? `Following @${creatorName} 🎉` : `Unfollowed @${creatorName}`,
      description: nextState 
        ? "You'll see more prompts from this creator in your feed." 
        : "You have unfollowed this creator.",
    });
  };

  // Handle Like Action (TikTok Base Likes + User Like)
  const handleLike = (e: React.MouseEvent) => {
    e.stopPropagation();
    const nextLiked = !userLiked;
    setUserLiked(nextLiked);
    setIsLiked(nextLiked);

    const updatedTotal = baseLikes + (nextLiked ? 1 : 0);

    if (nextLiked) {
      soundEffects.play('pop');
    } else {
      soundEffects.play('click');
    }

    if (onLikeToggle) {
      onLikeToggle(updatedTotal, nextLiked);
    }
  };

  // Handle Share Link
  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const shareUrl = `${window.location.origin}/prompt/${reel.id}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: reel.title,
          text: `Check out this ${reel.category} prompt by @${creatorName} on Naxxivo!`,
          url: shareUrl,
        });
        soundEffects.play('chime');
        return;
      } catch {
        // Fallback
      }
    }

    try {
      await navigator.clipboard.writeText(shareUrl);
      soundEffects.play('chime');
      toast({
        title: "Link Copied! 🔗",
        description: "Prompt direct link copied to clipboard.",
      });
    } catch {
      // Ignored
    }
  };

  // Open Full Screen Prompt Details Page
  const handleOpenPromptDetails = (e: React.MouseEvent) => {
    e.stopPropagation();
    soundEffects.play('click');
    if (onOpenInfoModal) {
      onOpenInfoModal();
    } else {
      setLocation(`/prompt/${reel.id}`);
    }
  };

  const avatarUrl = reel.author_avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${creatorName}`;

  return (
    <>
      {/* Action Column on Right - Clean Spacing & Zero Overlap */}
      <div className="absolute right-2 sm:right-3 bottom-14 sm:bottom-16 flex flex-col items-center gap-2.5 sm:gap-3.5 z-30 pointer-events-auto select-none">
        
        {/* 1. CREATOR AVATAR + FOLLOW BADGE */}
        <div className="relative mb-0.5 flex flex-col items-center">
          <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-full p-0.5 bg-gradient-to-tr from-cyan-400 via-blue-500 to-indigo-500 shadow-xl overflow-hidden">
            <img
              src={avatarUrl}
              alt={creatorName}
              className="w-full h-full object-cover rounded-full bg-slate-900"
            />
          </div>

          {/* Follow / Unfollow Badge - Positioned neatly without overlapping the next icon */}
          <button
            onClick={handleFollow}
            className={`absolute -bottom-1 w-4.5 h-4.5 rounded-full flex items-center justify-center shadow-lg transition-transform hover:scale-110 active:scale-95 border border-white/40 ${
              isFollowed 
                ? 'bg-emerald-500 text-white' 
                : 'bg-rose-500 hover:bg-rose-600 text-white'
            }`}
            title={isFollowed ? `Following @${creatorName}` : `Follow @${creatorName}`}
          >
            {isFollowed ? (
              <Check className="w-3 h-3 stroke-[3]" />
            ) : (
              <Plus className="w-3 h-3 stroke-[3]" />
            )}
          </button>
        </div>

        {/* 2. PRIMARY 1-CLICK PROMPT COPY BUTTON (PTCopy) */}
        <div className="flex flex-col items-center">
          <button
            onClick={handleCopyPrompt}
            id={`reel-copy-btn-${reel.id}`}
            className={`w-11 h-11 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center transition-all duration-300 shadow-xl relative ${
              copied
                ? 'bg-emerald-500 text-white scale-110 shadow-emerald-500/50 ring-4 ring-emerald-400/40'
                : 'bg-gradient-to-tr from-cyan-500 via-blue-600 to-indigo-600 text-white hover:scale-110 active:scale-95 shadow-cyan-500/40 ring-2 ring-white/30'
            }`}
            title="1-Click Copy Prompt (PTCopy)"
          >
            {copied ? (
              <Check className="w-5 h-5 sm:w-6 sm:h-6 animate-scale-in stroke-[2.5]" />
            ) : (
              <Copy className="w-5 h-5 stroke-[2.5]" />
            )}

            {!copied && (
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-cyan-400 rounded-full animate-ping opacity-80" />
            )}
          </button>
          <span className="text-[10px] font-extrabold tracking-tight text-white mt-0.5 drop-shadow-[0_2px_4px_rgba(0,0,0,0.95)] font-mono whitespace-nowrap">
            {copied ? 'COPIED!' : formatNumber(copiesCount)}
          </span>
        </div>

        {/* 3. LIKE BUTTON (TikTok Base Likes + User Like = Total Likes) */}
        <div className="flex flex-col items-center">
          <button
            onClick={handleLike}
            id={`reel-like-btn-${reel.id}`}
            className={`w-10 h-10 sm:w-11 sm:h-11 rounded-full flex items-center justify-center transition-all duration-200 backdrop-blur-md border shadow-xl ${
              userLiked
                ? 'bg-rose-500 text-white border-rose-400/60 scale-105 shadow-rose-500/40'
                : 'bg-black/45 text-white/90 border-white/20 hover:bg-black/70 hover:text-white'
            }`}
            title="Like Reel"
          >
            <Heart className={`w-5 h-5 transition-transform ${userLiked ? 'fill-white scale-110' : ''}`} />
          </button>
          <span className="text-[10px] font-bold text-white mt-0.5 drop-shadow-[0_2px_4px_rgba(0,0,0,0.95)] font-mono whitespace-nowrap">
            {formatNumber(totalLikes)}
          </span>
        </div>

        {/* 4. PROMPT FULL DETAILS BUTTON (Dedicated Page / Modal) */}
        <div className="flex flex-col items-center">
          <button
            onClick={handleOpenPromptDetails}
            id={`reel-info-btn-${reel.id}`}
            className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-black/45 hover:bg-black/70 text-cyan-300 border border-cyan-400/30 flex items-center justify-center transition-all backdrop-blur-md shadow-xl hover:scale-105 active:scale-95"
            title="Open Dedicated Full Screen Prompt Details"
          >
            <FileText className="w-5 h-5" />
          </button>
          <span className="text-[10px] font-bold text-cyan-300 mt-0.5 drop-shadow-[0_2px_4px_rgba(0,0,0,0.95)] whitespace-nowrap">
            Prompt
          </span>
        </div>

        {/* 5. SHARE BUTTON */}
        <div className="flex flex-col items-center">
          <button
            onClick={handleShare}
            id={`reel-share-btn-${reel.id}`}
            className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-black/45 hover:bg-black/70 text-white/90 border border-white/20 flex items-center justify-center transition-all backdrop-blur-md shadow-xl hover:scale-105 active:scale-95"
            title="Share Reel / Prompt"
          >
            <Share2 className="w-5 h-5" />
          </button>
          <span className="text-[10px] font-medium text-white/90 mt-0.5 drop-shadow-[0_2px_4px_rgba(0,0,0,0.95)] whitespace-nowrap">
            Share
          </span>
        </div>

        {/* 6. ROTATING VINYL MUSIC DISC (TIKTOK ICON) */}
        <div className="relative mt-0.5">
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-slate-950 p-1 border-2 border-slate-700/80 shadow-2xl flex items-center justify-center animate-spin-slow">
            <div className="w-full h-full rounded-full overflow-hidden flex items-center justify-center bg-gradient-to-tr from-purple-600 to-indigo-700">
              {reel.cover_url ? (
                <img src={reel.cover_url} alt="Music" className="w-full h-full object-cover rounded-full" />
              ) : (
                <Disc3 className="w-4 h-4 text-white/90 animate-pulse" />
              )}
            </div>
          </div>

          <div className="absolute -top-2 -left-2 pointer-events-none text-cyan-300 animate-float-note-1 opacity-80">
            <Music2 className="w-3 h-3" />
          </div>
        </div>
      </div>

      {/* Auth Gate Modal */}
      <AuthRequiredModal
        isOpen={authModalOpen}
        mode={authModalMode}
        creatorName={creatorName}
        onClose={() => setAuthModalOpen(false)}
        onSuccess={async () => {
          setAuthModalOpen(false);
          if (authModalMode === 'copy_prompt') {
            await doCopy();
          } else if (authModalMode === 'follow_creator') {
            await toggleFollow();
            toast({
              title: `Following @${creatorName}! 🎉`,
              description: "You're now following this creator.",
            });
          }
        }}
      />
    </>
  );
};
