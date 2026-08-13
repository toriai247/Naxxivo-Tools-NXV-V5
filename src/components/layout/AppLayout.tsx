import React from "react";
import { Link, useLocation } from "wouter";
import { Youtube, Image, Type, Moon, Sun, Github, Palette, BarChart3, Video, Sparkles, FileText } from "lucide-react";
import { useTheme } from "@/components/theme-provider";
import { motion, AnimatePresence } from "framer-motion";
import { BookmarkBanner } from "@/components/seo/BookmarkBanner";

const navItems = [
  { href: "/", label: "Thumbnail Downloader", icon: Youtube },
  { href: "/title-generator", label: "Title Generator", icon: Sparkles },
  { href: "/description-generator", label: "Description Generator", icon: FileText },
  { href: "/channel-analyzer", label: "Channel Analyzer", icon: BarChart3 },
  { href: "/video-analyzer", label: "Video Analyzer", icon: Video },
  { href: "/image-converter", label: "Image Converter", icon: Image },
  { href: "/text-tools", label: "Text Tools", icon: Type },
  { href: "/favicon-generator", label: "Favicon Generator", icon: Palette },
];

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { theme, setTheme } = useTheme();

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col md:flex-row overflow-hidden">
      {/* Mobile Top Header */}
      <header className="md:hidden flex items-center justify-between p-4 border-b bg-card z-10 shrink-0">
        <Link href="/" className="flex items-center gap-2.5">
          <img
            src="/favicon.svg"
            alt="Naxxivo Logo"
            className="w-7 h-7 rounded-lg shadow-sm"
            referrerPolicy="no-referrer"
          />
          <span className="font-bold text-lg tracking-tight">Naxxivo</span>
        </Link>
        <button
          onClick={() => setTheme(theme === "light" ? "dark" : "light")}
          className="p-2 rounded-md hover:bg-muted transition-colors"
          title="Toggle theme"
        >
          {theme === "light" ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
        </button>
      </header>

      {/* Mobile Nav Scrollable */}
      <nav className="md:hidden flex overflow-x-auto border-b bg-card shrink-0 scrollbar-hide hide-scrollbar relative">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex-shrink-0 flex items-center justify-center gap-1.5 px-3 py-3 text-xs font-medium whitespace-nowrap relative ${
              location === item.href ? "text-primary" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <item.icon className="w-3.5 h-3.5" />
            {item.label}
            {location === item.href && (
              <motion.div
                layoutId="mobile-indicator"
                className="absolute bottom-0 left-0 right-0 h-[2px] bg-primary"
                initial={false}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
              />
            )}
          </Link>
        ))}
      </nav>

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 flex-col border-r bg-card/50 z-10 shrink-0">
        <div className="p-6 flex flex-col gap-6 h-full">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <img
              src="/favicon.svg"
              alt="Naxxivo Logo"
              className="w-9 h-9 rounded-xl shadow-md transition-transform group-hover:scale-105"
              referrerPolicy="no-referrer"
            />
            <div className="flex flex-col">
              <span className="font-bold text-xl tracking-tight leading-none">Naxxivo</span>
              <span className="text-[10px] text-muted-foreground font-medium tracking-wide uppercase mt-0.5">Web Utility Hub</span>
            </div>
          </Link>

          {/* Nav */}
          <nav className="flex-1 flex flex-col gap-1 relative">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-md transition-colors relative z-10 ${
                  location === item.href
                    ? "text-primary font-medium"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                }`}
              >
                <item.icon className="w-5 h-5 shrink-0" />
                <span className="text-sm">{item.label}</span>
                {location === item.href && (
                  <motion.div
                    layoutId="desktop-indicator"
                    className="absolute inset-0 bg-primary/10 border border-primary/20 rounded-md -z-10"
                    initial={false}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  />
                )}
              </Link>
            ))}
          </nav>

          {/* Bottom controls */}
          <div className="pt-6 border-t flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setTheme(theme === "light" ? "dark" : "light")}
                className="flex items-center justify-center w-10 h-10 rounded-md bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors shrink-0"
                title="Toggle theme"
              >
                {theme === "light" ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
              </button>
              <a
                href="https://github.com"
                target="_blank"
                rel="noreferrer"
                className="flex flex-1 items-center justify-center gap-2 h-10 rounded-md bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors font-medium text-sm"
              >
                <Github className="w-4 h-4" />
                Star on GitHub
              </a>
            </div>

            {/* Sidebar Ad */}
            <div className="w-full aspect-square border-2 border-dashed border-muted rounded-md bg-muted/20 flex items-center justify-center text-muted-foreground text-sm uppercase tracking-widest p-4 text-center">
              Advertisement
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        <div className="flex-1 overflow-y-auto w-full">
          <div className="max-w-4xl mx-auto p-4 md:p-8 flex flex-col gap-8 min-h-full">
            <BookmarkBanner />

            {/* Top Ad */}
            <div className="w-full h-[90px] border-2 border-dashed border-muted rounded-md bg-muted/20 flex items-center justify-center text-muted-foreground text-sm uppercase tracking-widest shrink-0">
              Advertisement
            </div>

            {/* Page */}
            <div className="flex-1">
              <AnimatePresence mode="wait">
                <motion.div
                  key={location}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                >
                  {children}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Bottom Ad */}
            <div className="w-full h-[90px] border-2 border-dashed border-muted rounded-md bg-muted/20 flex items-center justify-center text-muted-foreground text-sm uppercase tracking-widest shrink-0 mt-8">
              Advertisement
            </div>

            {/* Google SEO Booster Content Section */}
            <section className="w-full px-4 py-10 text-muted-foreground border-t border-border mt-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <h2 className="text-2xl font-bold text-foreground mb-4">Why Use Naxxivo Free Online Web Tools?</h2>
                  <p className="mb-4 leading-relaxed text-sm md:text-base">
                    In today's fast-paced digital world, efficiency is everything. <strong className="text-primary font-semibold">Naxxivo Tools</strong> provides essential, high-speed single-purpose web utility tools designed for creators, web developers, and students. All tasks are processed 100% inside your browser, ensuring absolute data privacy and rapid performance without complex server delays.
                  </p>
                  <h3 className="text-xl font-semibold text-foreground mb-2">Maximize SEO Speed with WebP Converter</h3>
                  <p className="leading-relaxed text-sm md:text-base">
                    Converting traditional PNG or JPG images into modern <strong className="text-emerald-500 font-semibold">Next-Gen WebP format</strong> dramatically shrinks file sizes without losing visual quality. This enhances your own website speed, a critical factor for ranking high on Google search results.
                  </p>
                </div>

                <div>
                  <h2 className="text-2xl font-bold text-foreground mb-4">Frequently Asked Questions (FAQ)</h2>
                  <div className="space-y-4">
                    <div className="bg-card/80 p-4 rounded-lg border border-border">
                      <h4 className="font-semibold text-foreground mb-1">How secure is my data on Naxxivo?</h4>
                      <p className="text-sm text-muted-foreground">Your files never leave your computer. All file conversions, text formatting, and thumbnail processes occur locally inside your web browser.</p>
                    </div>
                    <div className="bg-card/80 p-4 rounded-lg border border-border">
                      <h4 className="font-semibold text-foreground mb-1">Can I use downloaded thumbnails commercially?</h4>
                      <p className="text-sm text-muted-foreground">Yes, you can fetch HD previews. However, make sure you own the rights or have permission from the original YouTube content creator before using them commercially.</p>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Footer */}
            <footer className="shrink-0 py-6 border-t flex flex-col items-center gap-3">
              <p className="text-sm font-semibold text-foreground tracking-tight">
                Naxxivo — Free Web Tools
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                {[
                  "#Naxxivo",
                  "#FreeWebTools",
                  "#YouTubeThumbnail",
                  "#ImageCompressor",
                  "#WebPConverter",
                  "#TextConverter",
                  "#FaviconGenerator",
                  "#OnlineTools",
                  "#NoSignup",
                ].map((tag) => (
                  <span key={tag} className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary font-medium">
                    {tag}
                  </span>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                &copy; {new Date().getFullYear()} Naxxivo. All tools run locally in your browser.
              </p>
            </footer>
          </div>
        </div>
      </main>
    </div>
  );
}
