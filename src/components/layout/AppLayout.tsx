import React, { useState } from "react";
import { Link, useLocation } from "wouter";
import { Youtube, Image, Type, Moon, Sun, Github, Palette, BarChart3, Video, Sparkles, FileText, Menu, X, History, Image as ImageIcon, User } from "lucide-react";
import { useTheme } from "@/components/theme-provider";
import { motion, AnimatePresence } from "framer-motion";
import { BookmarkBanner } from "@/components/seo/BookmarkBanner";

const navItems = [
  { href: "/", label: "Thumbnail Downloader", icon: Youtube },
  { href: "/prompts", label: "AI Image Prompts", icon: ImageIcon },
  { href: "/title-generator", label: "Title Generator", icon: Sparkles },
  { href: "/description-generator", label: "Description Generator", icon: FileText },
  { href: "/channel-analyzer", label: "Channel Analyzer", icon: BarChart3 },
  { href: "/video-analyzer", label: "Video Analyzer", icon: Video },
  { href: "/image-converter", label: "Image Converter", icon: Image },
  { href: "/text-tools", label: "Text Tools", icon: Type },
  { href: "/favicon-generator", label: "Favicon Generator", icon: Palette },
  { href: "/history", label: "History", icon: History },
  { href: "/profile", label: "User Profile", icon: User },
];

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { theme, setTheme } = useTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col md:flex-row overflow-hidden">
      {/* Mobile Top Header */}
      <header className="md:hidden flex items-center justify-between p-4 border-b bg-card z-20 shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="p-2 -ml-2 rounded-md hover:bg-muted transition-colors text-foreground"
            aria-label="Open menu"
          >
            <Menu className="w-6 h-6" />
          </button>
          <Link href="/" className="flex items-center gap-2.5">
            <img
              src="/favicon.svg"
              alt="Naxxivo Logo"
              className="w-7 h-7 rounded-lg shadow-sm"
              referrerPolicy="no-referrer"
            />
            <span className="font-bold text-lg tracking-tight">Naxxivo</span>
          </Link>
        </div>
        <button
          onClick={() => setTheme(theme === "light" ? "dark" : "light")}
          className="p-2 rounded-md hover:bg-muted transition-colors"
          title="Toggle theme"
        >
          {theme === "light" ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
        </button>
      </header>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileMenuOpen(false)}
              className="fixed inset-0 bg-background/80 backdrop-blur-sm z-30 md:hidden"
            />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="fixed top-0 left-0 bottom-0 w-3/4 max-w-sm bg-card border-r z-40 md:hidden flex flex-col"
            >
              <div className="p-4 flex items-center justify-between border-b">
                <Link href="/" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-3">
                  <img
                    src="/favicon.svg"
                    alt="Naxxivo Logo"
                    className="w-8 h-8 rounded-lg shadow-sm"
                    referrerPolicy="no-referrer"
                  />
                  <span className="font-bold text-xl tracking-tight">Naxxivo</span>
                </Link>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-2 rounded-md hover:bg-muted transition-colors text-muted-foreground"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <nav className="flex-1 overflow-y-auto p-4 flex flex-col gap-2">
                {navItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-md transition-colors ${
                      location === item.href
                        ? "bg-primary/10 text-primary font-medium"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    }`}
                  >
                    <item.icon className="w-5 h-5 shrink-0" />
                    <span>{item.label}</span>
                  </Link>
                ))}
              </nav>
              <div className="p-4 border-t">
                <a
                  href="https://github.com"
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-center gap-2 w-full h-10 rounded-md bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors font-medium text-sm"
                >
                  <Github className="w-4 h-4" />
                  Star on GitHub
                </a>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

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
            <footer className="shrink-0 py-6 border-t flex flex-col items-center gap-4">
              <div className="flex flex-wrap justify-center items-center gap-4 md:gap-6 text-xs md:text-sm font-medium text-muted-foreground">
                <Link href="/about-us" className="hover:text-primary transition-colors">
                  About Us
                </Link>
                <span className="text-border">•</span>
                <Link href="/contact-us" className="hover:text-primary transition-colors">
                  Contact Us
                </Link>
                <span className="text-border">•</span>
                <Link href="/privacy-policy" className="hover:text-primary transition-colors">
                  Privacy Policy
                </Link>
              </div>

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

              <p className="text-xs text-muted-foreground text-center">
                &copy; {new Date().getFullYear()} Naxxivo. All rights reserved. All tools run locally in your browser.
              </p>
            </footer>
          </div>
        </div>
      </main>
    </div>
  );
}
