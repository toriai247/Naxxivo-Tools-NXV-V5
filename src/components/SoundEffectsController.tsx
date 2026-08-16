import React, { useState, useEffect } from 'react';
import { Volume2, VolumeX, Volume1, Sparkles, Play, Sliders, Music, Check } from 'lucide-react';
import { sound, soundManager, SfxType } from '@/lib/sound';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { motion, AnimatePresence } from 'framer-motion';

export function SoundToggleBtn({ className = "" }: { className?: string }) {
  const [enabled, setEnabled] = useState(soundManager.isEnabled());

  useEffect(() => {
    return soundManager.subscribe((newEnabled) => {
      setEnabled(newEnabled);
    });
  }, []);

  const handleToggle = () => {
    sound.toggle();
  };

  return (
    <button
      onClick={handleToggle}
      className={`relative p-2 rounded-lg border transition-all duration-200 ${
        enabled
          ? "bg-primary/10 border-primary/30 text-primary hover:bg-primary/20"
          : "bg-muted/50 border-border text-muted-foreground hover:text-foreground hover:bg-muted"
      } ${className}`}
      title={enabled ? "Sound FX: ON (Click to Mute)" : "Sound FX: Muted (Click to Enable)"}
      aria-label={enabled ? "Mute sound effects" : "Unmute sound effects"}
    >
      <AnimatePresence mode="wait" initial={false}>
        {enabled ? (
          <motion.div
            key="sound-on"
            initial={{ scale: 0.7, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.7, opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            <Volume2 className="w-4 h-4" />
          </motion.div>
        ) : (
          <motion.div
            key="sound-off"
            initial={{ scale: 0.7, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.7, opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            <VolumeX className="w-4 h-4" />
          </motion.div>
        )}
      </AnimatePresence>
      {enabled && (
        <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
      )}
    </button>
  );
}

export function SoundSettingsModal() {
  const [enabled, setEnabled] = useState(soundManager.isEnabled());
  const [volume, setVolume] = useState(soundManager.getVolume() * 100);
  const [activePlay, setActivePlay] = useState<SfxType | null>(null);

  useEffect(() => {
    return soundManager.subscribe((newEnabled, newVol) => {
      setEnabled(newEnabled);
      setVolume(newVol * 100);
    });
  }, []);

  const soundsList = soundManager.getAllSounds();

  const handlePlay = (type: SfxType) => {
    setActivePlay(type);
    soundManager.play(type);
    setTimeout(() => {
      setActivePlay(null);
    }, 450);
  };

  const handleVolumeChange = (values: number[]) => {
    const val = values[0];
    setVolume(val);
    soundManager.setVolume(val / 100);
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          onClick={() => sound.click()}
          className="gap-2 text-xs h-8 border-border bg-card/50 hover:bg-muted"
        >
          <Music className="w-3.5 h-3.5 text-primary" />
          <span>SFX Audio Library</span>
          {enabled ? (
            <Badge variant="secondary" className="px-1.5 py-0 text-[10px] bg-primary/15 text-primary border-none">
              ON
            </Badge>
          ) : (
            <Badge variant="outline" className="px-1.5 py-0 text-[10px] text-muted-foreground">
              OFF
            </Badge>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <Music className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-lg">Interactive Audio & Sound FX</DialogTitle>
              <DialogDescription className="text-xs">
                Custom studio audio feedback for interactions, AI generation, and clicks.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-5 pt-2">
          {/* Master controls */}
          <div className="p-3.5 rounded-xl border bg-muted/30 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {enabled ? (
                  <Volume2 className="w-4 h-4 text-primary" />
                ) : (
                  <VolumeX className="w-4 h-4 text-muted-foreground" />
                )}
                <span className="text-sm font-semibold">Sound FX System</span>
              </div>
              <Button
                size="sm"
                variant={enabled ? "default" : "outline"}
                onClick={() => {
                  const nowEnabled = sound.toggle();
                  setEnabled(nowEnabled);
                }}
                className="h-7 text-xs px-3"
              >
                {enabled ? "Enabled" : "Muted"}
              </Button>
            </div>

            {enabled && (
              <div className="space-y-1.5 pt-1">
                <div className="flex justify-between text-xs text-muted-foreground font-medium">
                  <span>Volume</span>
                  <span>{Math.round(volume)}%</span>
                </div>
                <Slider
                  value={[volume]}
                  onValueChange={handleVolumeChange}
                  max={100}
                  step={1}
                  className="w-full"
                />
              </div>
            )}
          </div>

          {/* Sound Library Grid */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Sound Effects ({soundsList.length})
              </span>
              <span className="text-[11px] text-muted-foreground">Click to test</span>
            </div>

            <div className="grid grid-cols-1 gap-2">
              {soundsList.map((item) => {
                const isPlaying = activePlay === item.type;
                return (
                  <div
                    key={item.type}
                    onClick={() => handlePlay(item.type)}
                    className={`flex items-center justify-between p-2.5 rounded-lg border transition-all cursor-pointer select-none ${
                      isPlaying
                        ? "border-primary bg-primary/10 shadow-sm scale-[0.99]"
                        : "border-border bg-card hover:bg-muted/40 hover:border-muted-foreground/30"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <button
                        className={`w-7 h-7 rounded-full flex items-center justify-center transition-colors ${
                          isPlaying
                            ? "bg-primary text-primary-foreground shadow-md"
                            : "bg-muted text-foreground group-hover:bg-primary/20"
                        }`}
                      >
                        <Play className={`w-3 h-3 ${isPlaying ? "animate-pulse" : "ml-0.5"}`} />
                      </button>
                      <div className="flex flex-col">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-semibold text-foreground">
                            {item.name}
                          </span>
                          <Badge variant="outline" className="text-[9px] px-1 py-0 font-medium">
                            {item.tag}
                          </Badge>
                        </div>
                        <span className="text-[11px] text-muted-foreground">
                          {item.description}
                        </span>
                      </div>
                    </div>

                    <div className="text-[10px] font-mono text-muted-foreground/70 hidden sm:block">
                      .wav
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
