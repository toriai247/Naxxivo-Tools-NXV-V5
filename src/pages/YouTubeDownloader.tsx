import React, { useState } from "react";
import { 
  Download, 
  AlertCircle, 
  Image as ImageIcon, 
  Check, 
  Loader2, 
  Youtube, 
  Video, 
  Music, 
  Copy, 
  ExternalLink, 
  Sparkles,
  Play,
  Pause,
  Clock,
  User,
  CheckCircle2
} from "lucide-react";
import { SeoContentYouTube } from "@/components/seo/SeoContentYouTube";
import { FaqSection } from "@/components/seo/FaqSection";
import { motion, AnimatePresence } from "motion/react";
import { useHistory } from "@/hooks/useHistory";
import { sound } from "@/lib/sound";
import { useToast } from "@/hooks/use-toast";
import { 
  extractYoutubeVideo, 
  downloadYoutubeFile, 
  parseYoutubeId, 
  formatDuration, 
  YoutubeVideoData 
} from "@/api/youtubeDownload";

interface Thumbnail {
  quality: string;
  url: string;
  width: string;
  height: string;
}

export default function YouTubeDownloader() {
  const { toast } = useToast();
  const [url, setUrl] = useState("");
  const [videoId, setVideoId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [videoData, setVideoData] = useState<YoutubeVideoData | null>(null);
  
  // Active Tab: 'video' | 'audio' | 'thumbnail'
  const [activeTab, setActiveTab] = useState<'video' | 'audio' | 'thumbnail'>('video');
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [downloadProgress, setDownloadProgress] = useState<number>(0);
  const { addHistoryItem } = useHistory();

  // Audio Player State for Previews
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setUrl(val);
    setError("");

    if (!val.trim()) {
      setVideoId(null);
      setVideoData(null);
      return;
    }

    const id = parseYoutubeId(val);
    if (id) {
      setVideoId(id);
    } else {
      setVideoId(null);
      setError("Please enter a valid YouTube or Shorts URL.");
    }
  };

  const handleExtract = async () => {
    if (!url.trim()) {
      setError("Please paste a YouTube link first.");
      sound.error();
      return;
    }

    const id = parseYoutubeId(url);
    if (!id) {
      setError("Unable to identify a valid YouTube Video ID from this link.");
      sound.error();
      return;
    }

    setLoading(true);
    setError("");
    sound.click();

    try {
      const response = await extractYoutubeVideo(url);
      if (response.success && response.data) {
        setVideoData(response.data);
        sound.success();
        toast({
          title: "🎥 Video Parsed Successfully!",
          description: "All high-speed video, audio, and thumbnail stream options are ready."
        });

        // Add search history
        addHistoryItem({
          type: 'thumbnail',
          title: response.data.title,
          description: `Extracted video downloads for ${id}`,
          url: url
        });
      } else {
        throw new Error(response.error || "Failed to parse YouTube streaming links.");
      }
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Extraction failed. The video might be private, blocked, or unavailable.");
      sound.error();
    } finally {
      setLoading(false);
    }
  };

  const handleFileDownload = async (
    mediaUrl: string, 
    label: string, 
    mediaType: 'video' | 'audio', 
    format: 'mp4' | 'webm' | 'mp3' | 'm4a' | 'wav'
  ) => {
    if (!videoData) return;

    sound.download();
    setDownloadingId(label);
    setDownloadProgress(10);

    const safeTitle = videoData.title.slice(0, 30).replace(/[^a-zA-Z0-9_\-]/g, '_');
    const filename = `${safeTitle}_${label}`;

    const success = await downloadYoutubeFile(
      mediaUrl,
      filename,
      mediaType,
      format,
      label,
      (percent) => setDownloadProgress(percent)
    );

    setDownloadingId(null);
    setDownloadProgress(0);

    if (success) {
      sound.success();
      toast({
        title: "✅ Download Complete!",
        description: `Successfully saved ${filename}.${format}`
      });
    } else {
      sound.error();
      toast({
        title: "Download Initiated",
        description: "Triggered standard browser download stream."
      });
    }
  };

  const handleThumbnailDownload = async (thumbnail: Thumbnail) => {
    try {
      sound.download();
      setDownloadingId(thumbnail.quality);
      const response = await fetch(thumbnail.url);
      if (!response.ok) throw new Error("Failed to fetch image");
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = `youtube-thumbnail-${videoId}-${thumbnail.quality.replace(/\s+/g, '_')}.jpg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
      sound.success();
      
      toast({
        title: "🖼️ Thumbnail Saved!",
        description: `Successfully downloaded ${thumbnail.quality} image.`
      });
    } catch (err) {
      console.error(err);
      sound.error();
      toast({
        title: "Download Triggered",
        description: "Opening thumbnail link in a new tab due to security restrictions."
      });
      window.open(thumbnail.url, "_blank");
    } finally {
      setTimeout(() => setDownloadingId(null), 1000);
    }
  };

  const toggleAudioPreview = (audioUrl: string) => {
    if (isPlaying && audioElement) {
      audioElement.pause();
      setIsPlaying(false);
      sound.click();
    } else {
      if (audioElement) {
        audioElement.play();
        setIsPlaying(true);
        sound.success();
      } else {
        const audio = new Audio(audioUrl);
        audio.play();
        audio.onended = () => setIsPlaying(false);
        setAudioElement(audio);
        setIsPlaying(true);
        sound.success();
      }
    }
  };

  const handleCopyTitle = () => {
    if (!videoData) return;
    navigator.clipboard.writeText(videoData.title);
    sound.copy();
    toast({
      title: "📋 Copied!",
      description: "Video title copied to clipboard."
    });
  };

  const thumbnails: Thumbnail[] = videoId ? [
    { quality: "Max Resolution (1080p)", url: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`, width: "1280", height: "720" },
    { quality: "Standard Quality (720p)", url: `https://img.youtube.com/vi/${videoId}/sddefault.jpg`, width: "640", height: "480" },
    { quality: "High Quality (480p)", url: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`, width: "480", height: "360" },
    { quality: "Medium Quality (360p)", url: `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`, width: "320", height: "180" },
  ] : [];

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <div className="bg-red-500/10 text-red-500 p-1.5 rounded-lg">
            <Youtube className="w-6 h-6" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">YouTube Downloader</h1>
        </div>
        <p className="text-muted-foreground">Download YouTube videos, audio tracks, and HD thumbnails in 1-click. No API key required.</p>
      </div>

      {/* Input section */}
      <div className="bg-card border rounded-xl p-6 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/5 rounded-bl-full -z-10" />
        <label htmlFor="youtube-url" className="block text-sm font-medium mb-2">
          Paste YouTube Video or Shorts URL
        </label>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <input
              id="youtube-url"
              type="text"
              className={`w-full bg-background border ${error ? 'border-destructive focus:ring-destructive' : 'border-input focus:ring-primary'} rounded-md py-3 px-4 outline-none focus:ring-2 focus:ring-opacity-50 transition-all`}
              placeholder="e.g., https://www.youtube.com/watch?v=dQw4w9WgXcQ"
              value={url}
              onChange={handleInputChange}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleExtract();
              }}
            />
          </div>
          <button
            onClick={handleExtract}
            disabled={loading}
            className="bg-red-600 hover:bg-red-500 text-white font-medium py-3 px-6 rounded-md shadow-sm transition-all flex items-center justify-center gap-2 shrink-0 disabled:opacity-75"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Extracting...
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                Get Downloads
              </>
            )}
          </button>
        </div>
        {error && (
          <p className="flex items-center gap-1 text-destructive text-sm mt-2">
            <AlertCircle className="w-4 h-4" /> {error}
          </p>
        )}
      </div>

      {/* Downloader Result Card */}
      <AnimatePresence mode="wait">
        {videoData ? (
          <motion.div
            key="result"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            {/* Download progress overlay */}
            {downloadProgress > 0 && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-center justify-between gap-4 animate-pulse">
                <div className="flex-1">
                  <div className="flex justify-between text-sm font-medium mb-1.5">
                    <span className="text-red-600 dark:text-red-400">Downloading stream file...</span>
                    <span>{downloadProgress}%</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                    <div 
                      className="bg-red-600 h-full rounded-full transition-all duration-300"
                      style={{ width: `${downloadProgress}%` }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Video Overview Row */}
            <div className="bg-card border rounded-xl p-4 sm:p-5 flex flex-col md:flex-row gap-5">
              <div className="relative aspect-video w-full md:w-64 bg-black rounded-lg overflow-hidden border shrink-0">
                <img 
                  src={videoData.thumbnail} 
                  alt={videoData.title} 
                  className="w-full h-full object-cover"
                />
                <div className="absolute bottom-2 right-2 bg-black/80 px-2 py-0.5 rounded text-xs font-mono text-white flex items-center gap-1">
                  <Clock className="w-3 h-3" /> {formatDuration(videoData.duration)}
                </div>
              </div>

              <div className="flex-1 flex flex-col justify-between space-y-3">
                <div className="space-y-1.5">
                  <div className="flex items-start justify-between gap-2">
                    <h2 className="text-xl font-bold leading-tight line-clamp-2">{videoData.title}</h2>
                    <button 
                      onClick={handleCopyTitle}
                      className="p-1.5 hover:bg-muted rounded-lg border shrink-0 transition-colors"
                      title="Copy video title"
                    >
                      <Copy className="w-4 h-4 text-muted-foreground" />
                    </button>
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <User className="w-4 h-4 text-red-500" /> {videoData.author.name}
                    </span>
                    <span className="text-muted-foreground/50">|</span>
                    <span className="text-xs bg-red-500/10 text-red-600 dark:text-red-400 font-medium px-2 py-0.5 rounded-full">
                      Active Stream
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2.5 pt-2">
                  <a 
                    href={videoData.sourceUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-xs font-medium px-3 py-2 rounded-lg border bg-background hover:bg-muted transition-colors inline-flex items-center gap-1.5"
                  >
                    <ExternalLink className="w-3.5 h-3.5" /> Watch on YouTube
                  </a>

                  {videoData.audioUrl && (
                    <button
                      onClick={() => toggleAudioPreview(videoData.audioUrl || "")}
                      className={`text-xs font-medium px-3 py-2 rounded-lg border transition-colors inline-flex items-center gap-1.5 ${isPlaying ? 'bg-red-500/10 border-red-500/30 text-red-600' : 'bg-background hover:bg-muted'}`}
                    >
                      {isPlaying ? (
                        <>
                          <Pause className="w-3.5 h-3.5 animate-pulse text-red-500" /> Playing Soundtrack Preview
                        </>
                      ) : (
                        <>
                          <Play className="w-3.5 h-3.5 text-muted-foreground" /> Preview Audio Track
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Downloader Tabs (Video, Audio, Thumbnails) */}
            <div className="space-y-4">
              <div className="flex border-b">
                <button
                  onClick={() => { setActiveTab('video'); sound.click(); }}
                  className={`px-5 py-3 font-semibold text-sm border-b-2 transition-all flex items-center gap-2 ${activeTab === 'video' ? 'border-red-600 text-red-600' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
                >
                  <Video className="w-4 h-4" /> Download Video (MP4)
                </button>
                <button
                  onClick={() => { setActiveTab('audio'); sound.click(); }}
                  className={`px-5 py-3 font-semibold text-sm border-b-2 transition-all flex items-center gap-2 ${activeTab === 'audio' ? 'border-red-600 text-red-600' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
                >
                  <Music className="w-4 h-4" /> Extract Audio (MP3)
                </button>
                <button
                  onClick={() => { setActiveTab('thumbnail'); sound.click(); }}
                  className={`px-5 py-3 font-semibold text-sm border-b-2 transition-all flex items-center gap-2 ${activeTab === 'thumbnail' ? 'border-red-600 text-red-600' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
                >
                  <ImageIcon className="w-4 h-4" /> HD Thumbnails
                </button>
              </div>

              {/* Tab Contents */}
              <AnimatePresence mode="wait">
                {activeTab === 'video' && (
                  <motion.div
                    key="video-tab"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    className="grid grid-cols-1 sm:grid-cols-2 gap-4"
                  >
                    {/* HD Option */}
                    <div className="bg-card border rounded-xl p-5 flex flex-col justify-between space-y-4 hover:shadow-md transition-shadow">
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-red-600 dark:text-red-400 uppercase tracking-wider bg-red-500/10 px-2.5 py-0.5 rounded-full">
                            Recommended
                          </span>
                          <span className="text-sm font-mono text-muted-foreground">MP4 Format</span>
                        </div>
                        <h3 className="text-lg font-bold mt-2">Full HD Resolution (1080p)</h3>
                        <p className="text-sm text-muted-foreground mt-1">Best quality video and audio stream. Crystal clear playback.</p>
                      </div>

                      <button
                        onClick={() => handleFileDownload(videoData.videoHdUrl || "", "1080p", "video", "mp4")}
                        disabled={downloadingId !== null}
                        className="w-full bg-red-600 hover:bg-red-500 text-white py-3 rounded-lg font-medium shadow-sm transition-all flex items-center justify-center gap-2"
                      >
                        {downloadingId === "1080p" ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" /> Processing...
                          </>
                        ) : (
                          <>
                            <Download className="w-4 h-4" /> Download 1080p Video
                          </>
                        )}
                      </button>
                    </div>

                    {/* SD Option */}
                    <div className="bg-card border rounded-xl p-5 flex flex-col justify-between space-y-4 hover:shadow-md transition-shadow">
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider bg-muted px-2.5 py-0.5 rounded-full">
                            Data Saver
                          </span>
                          <span className="text-sm font-mono text-muted-foreground">MP4 Format</span>
                        </div>
                        <h3 className="text-lg font-bold mt-2">Standard Quality (720p)</h3>
                        <p className="text-sm text-muted-foreground mt-1">Highly compressed. Ideal for smaller file sizes and fast downloads.</p>
                      </div>

                      <button
                        onClick={() => handleFileDownload(videoData.videoSdUrl || "", "720p", "video", "mp4")}
                        disabled={downloadingId !== null}
                        className="w-full border border-input hover:bg-muted py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                      >
                        {downloadingId === "720p" ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" /> Processing...
                          </>
                        ) : (
                          <>
                            <Download className="w-4 h-4" /> Download 720p Video
                          </>
                        )}
                      </button>
                    </div>
                  </motion.div>
                )}

                {activeTab === 'audio' && (
                  <motion.div
                    key="audio-tab"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    className="grid grid-cols-1 sm:grid-cols-3 gap-4"
                  >
                    {/* MP3 High Quality */}
                    <div className="bg-card border rounded-xl p-5 flex flex-col justify-between space-y-4 hover:shadow-sm transition-all">
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold bg-red-500/10 text-red-600 px-2 py-0.5 rounded">MP3</span>
                          <span className="text-xs font-mono text-muted-foreground">320kbps</span>
                        </div>
                        <h4 className="font-bold text-base mt-2.5">High Quality Audio</h4>
                        <p className="text-xs text-muted-foreground mt-1">Excellent for music and premium podcast listening.</p>
                      </div>

                      <button
                        onClick={() => handleFileDownload(videoData.audioUrl || "", "320k", "audio", "mp3")}
                        disabled={downloadingId !== null}
                        className="w-full bg-red-600 hover:bg-red-500 text-white py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-1.5"
                      >
                        {downloadingId === "320k" ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Download className="w-4 h-4" />
                        )}
                        Download MP3
                      </button>
                    </div>

                    {/* M4A Optimized */}
                    <div className="bg-card border rounded-xl p-5 flex flex-col justify-between space-y-4 hover:shadow-sm transition-all">
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold bg-muted text-muted-foreground px-2 py-0.5 rounded">M4A</span>
                          <span className="text-xs font-mono text-muted-foreground">128kbps</span>
                        </div>
                        <h4 className="font-bold text-base mt-2.5">Standard Audio</h4>
                        <p className="text-xs text-muted-foreground mt-1">Lightweight option with perfect acoustic balance.</p>
                      </div>

                      <button
                        onClick={() => handleFileDownload(videoData.audioUrl || "", "128k", "audio", "m4a")}
                        disabled={downloadingId !== null}
                        className="w-full border border-input hover:bg-muted py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-1.5"
                      >
                        {downloadingId === "128k" ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Download className="w-4 h-4" />
                        )}
                        Download M4A
                      </button>
                    </div>

                    {/* Lossless WAV */}
                    <div className="bg-card border rounded-xl p-5 flex flex-col justify-between space-y-4 hover:shadow-sm transition-all">
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold bg-blue-500/10 text-blue-600 px-2 py-0.5 rounded">WAV</span>
                          <span className="text-xs font-mono text-muted-foreground">1411kbps</span>
                        </div>
                        <h4 className="font-bold text-base mt-2.5">Studio Lossless</h4>
                        <p className="text-xs text-muted-foreground mt-1">Uncompressed master soundtrack for editing and mixing.</p>
                      </div>

                      <button
                        onClick={() => handleFileDownload(videoData.audioUrl || "", "lossless", "audio", "wav")}
                        disabled={downloadingId !== null}
                        className="w-full border border-input hover:bg-muted py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-1.5"
                      >
                        {downloadingId === "lossless" ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Download className="w-4 h-4" />
                        )}
                        Download WAV
                      </button>
                    </div>
                  </motion.div>
                )}

                {activeTab === 'thumbnail' && (
                  <motion.div
                    key="thumbnail-tab"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
                  >
                    {thumbnails.map((thumb) => (
                      <div key={thumb.quality} className="bg-card border rounded-xl overflow-hidden shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
                        <div className="aspect-video bg-muted relative overflow-hidden border-b">
                          <img src={thumb.url} alt={thumb.quality} className="w-full h-full object-cover" />
                        </div>
                        <div className="p-3.5 space-y-3">
                          <div>
                            <h5 className="font-bold text-sm line-clamp-1">{thumb.quality}</h5>
                            <span className="text-xs font-mono text-muted-foreground">{thumb.width} × {thumb.height}</span>
                          </div>
                          <button
                            onClick={() => handleThumbnailDownload(thumb)}
                            disabled={downloadingId !== null}
                            className="w-full bg-red-600 hover:bg-red-500 text-white text-xs font-medium py-2 rounded-lg transition-colors flex items-center justify-center gap-1.5"
                          >
                            {downloadingId === thumb.quality ? (
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            ) : (
                              <Download className="w-3.5 h-3.5" />
                            )}
                            Save Image
                          </button>
                        </div>
                      </div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-card/50 border border-dashed rounded-xl p-12 flex flex-col items-center justify-center text-center space-y-4"
          >
            <div className="bg-red-500/10 p-4 rounded-full text-red-500">
              <Youtube className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">Ready to Extract Streams</h3>
              <p className="text-muted-foreground text-sm max-w-sm mt-1">
                Paste any YouTube video or Shorts link above to view, preview, and download HD video files, MP3 audios, or cover images.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* SEO: How-to guide + deep dive content */}
      <SeoContentYouTube />

      {/* SEO: FAQ with JSON-LD schema */}
      <FaqSection />
    </div>
  );
}
