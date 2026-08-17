import React, { useState, useRef, useEffect } from 'react';
import { 
  Bot, 
  Send, 
  Sparkles, 
  Image as ImageIcon, 
  Youtube, 
  Type, 
  Paperclip, 
  Trash2, 
  Copy, 
  Check, 
  Download, 
  ExternalLink, 
  RefreshCw, 
  FileText, 
  Sliders, 
  Cpu, 
  Zap, 
  X, 
  Layers, 
  Hash, 
  Tag, 
  Eye, 
  Palette, 
  Code2, 
  Info,
  Maximize2,
  History,
  ArrowUp,
  ArrowDown,
  Camera,
  Folder,
  File as FileIcon,
  Clipboard,
  UploadCloud,
  FileCode,
  CheckCircle2,
  Plus,
  Wand2,
  FileSpreadsheet
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '@/hooks/use-toast';
import { sound } from '@/lib/sound';
import { generateTitleIdeas, generateDescriptionIdeas } from '@/api/aiService';
import { analyzeYouTubeVideo, analyzeYouTubeChannel, extractVideoId, parseChannelIdentifier } from '@/api/youtubeApi';
import { 
  parseImageCommandLogic, 
  parseYouTubeCommandLogic, 
  parsePureTextCommandLogic, 
  parseDocumentCommandLogic,
  normalizeUserInput 
} from '@/lib/botLogic';
import { VideoAnalysisData, ChannelAnalysisData } from '@/types';

interface BotMessage {
  id: string;
  sender: 'user' | 'bot';
  timestamp: string;
  text: string;
  attachment?: {
    type: 'image' | 'file' | 'document';
    name: string;
    url: string;
    size?: string;
    fileObj?: File;
    textContent?: string;
  };
  toolState?: {
    type: 
      | 'youtube_video_options' 
      | 'youtube_video_result' 
      | 'youtube_channel_options' 
      | 'youtube_channel_result' 
      | 'image_options' 
      | 'image_result' 
      | 'document_options'
      | 'document_result'
      | 'text_tool_result' 
      | 'general_ai';
    videoData?: VideoAnalysisData;
    channelData?: ChannelAnalysisData;
    selectedAction?: string;
    actionResultData?: any;
    imageInfo?: {
      name: string;
      originalSize: string;
      originalUrl: string;
      convertedUrl?: string;
      newSize?: string;
      savingsPercent?: number;
      format?: string;
    };
    documentInfo?: {
      name: string;
      size: string;
      type: string;
      words?: number;
      chars?: number;
      lines?: number;
      content?: string;
      formattedResult?: string;
      actionType?: string;
    };
  };
}

const STARTER_PROMPTS = [
  {
    icon: Youtube,
    title: "YouTube Video Automation",
    desc: "Paste any link to get tags, 1080p thumbnail, keywords & embed code",
    action: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    color: "text-red-500 bg-red-500/10 border-red-500/20"
  },
  {
    icon: ImageIcon,
    title: "Image Converter & Compressor",
    desc: "Upload image to convert to WebP, PNG or reduce file size",
    action: "Upload Image",
    color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20"
  },
  {
    icon: Sparkles,
    title: "Viral YouTube Title Ideas",
    desc: "Generate 10 high-CTR, psychological title angles for your video",
    action: "Generate viral YouTube titles for a video about: AI Tools in 2026",
    color: "text-purple-500 bg-purple-500/10 border-purple-500/20"
  },
  {
    icon: FileText,
    title: "Document & Text Tools",
    desc: "Analyze word count, format JSON, or convert case in text files",
    action: "Analyze Document",
    color: "text-blue-500 bg-blue-500/10 border-blue-500/20"
  }
];

export default function SmartBot() {
  const { toast } = useToast();

  const [messages, setMessages] = useState<BotMessage[]>(() => {
    try {
      const saved = localStorage.getItem('naxxivo_bot_messages_v1');
      if (saved) return JSON.parse(saved);
    } catch {
      // Storage error ignored
    }
    return [
      {
        id: 'welcome-1',
        sender: 'bot',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        text: `👋 **Welcome to Naxxivo Smart Bot!**\n\nI am a browser-level, fast and private automation engine:\n\n• 🎬 **Paste YouTube Link:** Extract tags, 1080p HD thumbnails, SEO keywords, and responsive embed code.\n• 🖼️ **Upload Image (📎 button or Drag & Drop):** Directly convert *(e.g., "WebP", "PNG to WebP", "Compress size", "90% quality")*.\n• 📄 **Document Files (PDF/TXT/JSON):** Count words, convert text cases, or format JSON.\n• 📋 **Clipboard Paste (Ctrl+V):** Paste any screenshot or image directly into the chat.\n\nWhat would you like to start with?`,
      }
    ];
  });

  const [inputVal, setInputVal] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [attachedFile, setAttachedFile] = useState<{ 
    file: File; 
    previewUrl: string; 
    name: string; 
    size: string;
    type: 'image' | 'document' | 'file';
    textContent?: string;
  } | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Attachment Menu Sheet state
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  // Session-based Command History state
  const [commandHistory, setCommandHistory] = useState<string[]>(() => {
    try {
      const saved = sessionStorage.getItem('naxxivo_bot_cmd_history');
      if (saved) return JSON.parse(saved);
    } catch {
      // fallback
    }
    return [];
  });
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  const [showHistorySheet, setShowHistorySheet] = useState<boolean>(false);

  // File Inputs Refs
  const imageInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);
  const allFileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close attachment menu on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowAttachMenu(false);
      }
    };
    if (showAttachMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showAttachMenu]);

  // Sync command history to sessionStorage
  useEffect(() => {
    try {
      sessionStorage.setItem('naxxivo_bot_cmd_history', JSON.stringify(commandHistory));
    } catch {
      // Storage error ignored
    }
  }, [commandHistory]);

  // Global Clipboard Paste Handler (Ctrl+V directly anywhere in SmartBot)
  useEffect(() => {
    const handleGlobalPaste = (e: ClipboardEvent) => {
      const clipboardFiles = e.clipboardData?.files;
      if (clipboardFiles && clipboardFiles.length > 0) {
        const file = clipboardFiles[0];
        attachSelectedFile(file);
        toast({ title: `Attached from clipboard: ${file.name || 'Pasted Image'}` });
        return;
      }
    };

    window.addEventListener('paste', handleGlobalPaste);
    return () => window.removeEventListener('paste', handleGlobalPaste);
  }, []);

  // Navigate through command history with Up/Down Arrow
  const navigateHistory = (direction: 'up' | 'down') => {
    if (commandHistory.length === 0) return;

    if (direction === 'up') {
      const nextIndex = historyIndex === -1 ? commandHistory.length - 1 : Math.max(0, historyIndex - 1);
      setHistoryIndex(nextIndex);
      const text = commandHistory[nextIndex];
      setInputVal(text);
      if (textareaRef.current) {
        textareaRef.current.value = text;
        textareaRef.current.style.height = 'auto';
        textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 160)}px`;
      }
    } else if (direction === 'down') {
      if (historyIndex === -1) return;
      const nextIndex = historyIndex + 1;
      if (nextIndex >= commandHistory.length) {
        setHistoryIndex(-1);
        setInputVal('');
        if (textareaRef.current) {
          textareaRef.current.value = '';
          textareaRef.current.style.height = 'auto';
        }
      } else {
        setHistoryIndex(nextIndex);
        const text = commandHistory[nextIndex];
        setInputVal(text);
        if (textareaRef.current) {
          textareaRef.current.value = text;
          textareaRef.current.style.height = 'auto';
          textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 160)}px`;
        }
      }
    }
  };

  // Auto scroll to bottom
  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  useEffect(() => {
    scrollToBottom('smooth');
    try {
      localStorage.setItem('naxxivo_bot_messages_v1', JSON.stringify(messages));
    } catch {
      // Storage error ignored
    }
  }, [messages]);

  // Adjust textarea height dynamically
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputVal(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 160)}px`;
    }
  };

  const handleClearChat = () => {
    sound.clear();
    const initialWelcome: BotMessage = {
      id: `welcome-${Date.now()}`,
      sender: 'bot',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      text: `🧹 **Chat reset!** How can I assist you now? Paste a YouTube URL, attach an image/file, or ask any question!`,
    };
    setMessages([initialWelcome]);
    toast({ title: 'Chat Cleared', description: 'Conversation history reset.' });
  };

  const copyToClipboard = (text: string, id: string) => {
    sound.copy();
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast({ title: 'Copied to clipboard!' });
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Unified File Attach Function
  const attachSelectedFile = (file: File) => {
    sound.click();
    const isImage = file.type.startsWith('image/');
    const isDoc = file.type.includes('text') || 
                  file.type.includes('pdf') || 
                  file.name.endsWith('.json') || 
                  file.name.endsWith('.md') || 
                  file.name.endsWith('.txt') || 
                  file.name.endsWith('.csv');

    const previewUrl = isImage ? URL.createObjectURL(file) : '';
    const sizeInKb = (file.size / 1024).toFixed(1);
    const sizeStr = file.size > 1024 * 1024 ? `${(file.size / (1024 * 1024)).toFixed(2)} MB` : `${sizeInKb} KB`;

    if (isDoc && !isImage && file.size < 2 * 1024 * 1024) {
      // Read text for documents
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        setAttachedFile({
          file,
          previewUrl,
          name: file.name,
          size: sizeStr,
          type: 'document',
          textContent: text
        });
      };
      reader.readAsText(file);
    } else {
      setAttachedFile({
        file,
        previewUrl,
        name: file.name,
        size: sizeStr,
        type: isImage ? 'image' : 'file',
      });
    }

    setShowAttachMenu(false);
  };

  // Handle Standard File Inputs
  const handleNativeFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      attachSelectedFile(file);
      e.target.value = '';
    }
  };

  // Clipboard Paste Helper Button
  const handlePasteClipboardBtn = async () => {
    try {
      const items = await navigator.clipboard.read();
      for (const item of items) {
        for (const type of item.types) {
          if (type.startsWith('image/')) {
            const blob = await item.getType(type);
            const file = new File([blob], `clipboard-image-${Date.now()}.${type.split('/')[1] || 'png'}`, { type });
            attachSelectedFile(file);
            toast({ title: 'Image pasted from clipboard!' });
            return;
          }
        }
      }
      const text = await navigator.clipboard.readText();
      if (text) {
        setInputVal((prev) => (prev ? `${prev} ${text}` : text));
        toast({ title: 'Text pasted from clipboard!' });
        setShowAttachMenu(false);
      } else {
        toast({ title: 'No image or text in clipboard' });
      }
    } catch {
      toast({ 
        title: 'Clipboard Shortcut', 
        description: 'Tip: Press Ctrl+V (or Cmd+V) directly inside the text box to paste images or text!' 
      });
      setShowAttachMenu(false);
    }
  };

  // Generate Sample In-Browser File (No external downloads required)
  const handleLoadSampleFile = (type: 'photo' | 'icon' | 'json') => {
    sound.click();
    if (type === 'photo') {
      const canvas = document.createElement('canvas');
      canvas.width = 1200;
      canvas.height = 800;
      const ctx = canvas.getContext('2d')!;
      const grad = ctx.createLinearGradient(0, 0, 1200, 800);
      grad.addColorStop(0, '#0f172a');
      grad.addColorStop(0.5, '#059669');
      grad.addColorStop(1, '#0284c7');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 1200, 800);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 50px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Naxxivo Sample HD Image', 600, 380);
      ctx.font = '26px sans-serif';
      ctx.fillStyle = '#a7f3d0';
      ctx.fillText('1200x800 - Test WebP, PNG & Compression Conversion', 600, 440);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
      const byteString = atob(dataUrl.split(',')[1]);
      const ab = new ArrayBuffer(byteString.length);
      const ia = new Uint8Array(ab);
      for (let i = 0; i < byteString.length; i++) ia[i] = byteString.charCodeAt(i);
      const file = new File([ab], 'sample-mountain-hd.jpg', { type: 'image/jpeg' });
      attachSelectedFile(file);
      toast({ title: 'Sample HD Photo loaded!' });
    } else if (type === 'icon') {
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 512;
      const ctx = canvas.getContext('2d')!;
      ctx.clearRect(0, 0, 512, 512);
      ctx.beginPath();
      ctx.arc(256, 256, 220, 0, Math.PI * 2);
      ctx.fillStyle = '#10b981';
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 120px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('NX', 256, 256);
      const dataUrl = canvas.toDataURL('image/png');
      const byteString = atob(dataUrl.split(',')[1]);
      const ab = new ArrayBuffer(byteString.length);
      const ia = new Uint8Array(ab);
      for (let i = 0; i < byteString.length; i++) ia[i] = byteString.charCodeAt(i);
      const file = new File([ab], 'sample-logo-icon.png', { type: 'image/png' });
      attachSelectedFile(file);
      toast({ title: 'Sample Logo Icon loaded!' });
    } else {
      const sampleJson = JSON.stringify({
        appName: "Naxxivo Smart Bot",
        version: "3.0.0",
        engine: "100% Client-Side Local Rule Parser",
        supportedFeatures: [
          "YouTube Tags & Thumbnail Extraction",
          "WebP, PNG, JPG Conversion",
          "Image Size Compression",
          "Document Word Count & JSON Formatting",
          "In-Browser Clipboard & Drag-and-Drop"
        ],
        apiKeyRequired: false
      }, null, 2);
      const blob = new Blob([sampleJson], { type: 'application/json' });
      const file = new File([blob], 'sample-data.json', { type: 'application/json' });
      attachSelectedFile(file);
      toast({ title: 'Sample JSON Document loaded!' });
    }
  };

  // Convert and Compress Image Helper
  const processImageConversion = async (
    file: File, 
    targetFormat: 'webp' | 'png' | 'jpeg', 
    quality: number = 0.85
  ): Promise<{ dataUrl: string; newSizeStr: string; savings: number }> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const reader = new FileReader();
      reader.onload = (e) => {
        img.src = e.target?.result as string;
      };
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject('Canvas error');

        if (targetFormat === 'jpeg') {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
        ctx.drawImage(img, 0, 0);

        const mime = `image/${targetFormat}`;
        const dataUrl = canvas.toDataURL(mime, quality);

        // Calculate approximate size
        const head = `data:${mime};base64,`;
        const base64Len = dataUrl.length - head.length;
        const newSizeBytes = Math.round((base64Len * 3) / 4);
        const newSizeStr = newSizeBytes > 1024 * 1024 
          ? `${(newSizeBytes / (1024 * 1024)).toFixed(2)} MB` 
          : `${(newSizeBytes / 1024).toFixed(1)} KB`;

        const savings = Math.max(0, Math.round(((file.size - newSizeBytes) / file.size) * 100));

        resolve({ dataUrl, newSizeStr, savings });
      };
      img.onerror = () => reject('Failed to load image');
      reader.readAsDataURL(file);
    });
  };

  // Main Submit Handler
  const handleSendMessage = async (customText?: string) => {
    const rawText = (customText !== undefined ? customText : inputVal).trim();
    if (!rawText && !attachedFile) return;

    sound.click();

    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const userMsgId = `user-${Date.now()}`;

    const newUserMsg: BotMessage = {
      id: userMsgId,
      sender: 'user',
      timestamp,
      text: rawText || (attachedFile ? `Uploaded ${attachedFile.type}: ${attachedFile.name}` : ''),
      attachment: attachedFile ? {
        type: attachedFile.type,
        name: attachedFile.name,
        url: attachedFile.previewUrl,
        size: attachedFile.size,
        fileObj: attachedFile.file,
        textContent: attachedFile.textContent
      } : undefined
    };

    const currentAttached = attachedFile;
    setAttachedFile(null);
    setInputVal('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';

    // Store in session command history if text was typed
    if (rawText) {
      setCommandHistory((prev) => {
        const filtered = prev.filter((item) => item !== rawText);
        return [...filtered, rawText];
      });
      setHistoryIndex(-1);
    }

    setMessages((prev) => [...prev, newUserMsg]);
    setIsLoading(true);

    try {
      // ─────────────────────────────────────────────────────────────
      // 1. SCENARIO A: User Attached an Image File (+ optional text command)
      // ─────────────────────────────────────────────────────────────
      if (currentAttached && currentAttached.type === 'image' && currentAttached.file) {
        sound.scan();
        const parsedCmd = parseImageCommandLogic(rawText);

        if (parsedCmd.action === 'unsupported' && parsedCmd.unsupportedReason) {
          sound.error();
          const botMsgId = `bot-${Date.now()}`;
          const botResponseMsg: BotMessage = {
            id: botMsgId,
            sender: 'bot',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            text: parsedCmd.unsupportedReason,
          };
          setMessages((prev) => [...prev, botResponseMsg]);
          setIsLoading(false);
          return;
        }

        if (parsedCmd.action && parsedCmd.action !== 'options' && parsedCmd.action !== 'unsupported') {
          sound.generate();
          const targetFormat = parsedCmd.targetFormat || (parsedCmd.action === 'compress' ? 'webp' : parsedCmd.action === 'favicon' ? 'png' : parsedCmd.action);
          const quality = parsedCmd.quality;
          const formatToConvert: 'webp' | 'png' | 'jpeg' = targetFormat;
          
          const conversionRes = await processImageConversion(currentAttached.file, formatToConvert, quality);
          sound.success();

          const qualityText = parsedCmd.detectedParameters.requestedQualityPercent ? ` (Quality: ${parsedCmd.detectedParameters.requestedQualityPercent}%)` : '';

          const botMsgId = `bot-${Date.now()}`;
          const botResponseMsg: BotMessage = {
            id: botMsgId,
            sender: 'bot',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            text: `✅ **Task Completed!**\nYour image has been converted to **${parsedCmd.action === 'compress' ? 'Compressed WebP' : formatToConvert.toUpperCase()}**${qualityText}. Download your processed file below:`,
            toolState: {
              type: 'image_result',
              selectedAction: parsedCmd.action,
              imageInfo: {
                name: currentAttached.name,
                originalSize: currentAttached.size,
                originalUrl: currentAttached.previewUrl,
                convertedUrl: conversionRes.dataUrl,
                newSize: conversionRes.newSizeStr,
                savingsPercent: conversionRes.savings,
                format: parsedCmd.action === 'compress' ? 'Compressed WebP' : formatToConvert.toUpperCase(),
              }
            }
          };
          setMessages((prev) => [...prev, botResponseMsg]);
          setIsLoading(false);
          return;
        }

        const botMsgId = `bot-${Date.now()}`;
        const botResponseMsg: BotMessage = {
          id: botMsgId,
          sender: 'bot',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          text: `🖼️ **Image received: "${currentAttached.name}" (${currentAttached.size})**\n\nWhat would you like to do? Select an option below or type commands *(e.g., "WebP", "PNG", "Compress", "90% quality")*:`,
          toolState: {
            type: 'image_options',
            imageInfo: {
              name: currentAttached.name,
              originalSize: currentAttached.size,
              originalUrl: currentAttached.previewUrl,
            }
          }
        };
        setMessages((prev) => [...prev, botResponseMsg]);
        setIsLoading(false);
        return;
      }

      // ─────────────────────────────────────────────────────────────
      // 2. SCENARIO B: User Attached a Document or Text File
      // ─────────────────────────────────────────────────────────────
      if (currentAttached && (currentAttached.type === 'document' || currentAttached.type === 'file')) {
        sound.scan();
        const textContent = currentAttached.textContent || '';
        const wordsCount = textContent.trim() ? textContent.trim().split(/\s+/).length : 0;
        const linesCount = textContent ? textContent.split('\n').length : 0;
        const charsCount = textContent.length;

        const docCmd = parseDocumentCommandLogic(rawText);

        if (docCmd.action === 'count') {
          sound.success();
          const botMsgId = `bot-${Date.now()}`;
          setMessages((prev) => [
            ...prev,
            {
              id: botMsgId,
              sender: 'bot',
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              text: `📊 **Document Analysis:**\n\n• **File:** \`${currentAttached.name}\` (${currentAttached.size})\n• **Words:** ${wordsCount.toLocaleString()}\n• **Characters:** ${charsCount.toLocaleString()}\n• **Lines:** ${linesCount.toLocaleString()}\n• **Estimated Read Time:** ~${Math.max(1, Math.ceil(wordsCount / 200))} min`,
              toolState: {
                type: 'document_result',
                documentInfo: {
                  name: currentAttached.name,
                  size: currentAttached.size,
                  type: currentAttached.file.type || 'text/plain',
                  words: wordsCount,
                  chars: charsCount,
                  lines: linesCount,
                  content: textContent,
                  actionType: 'count'
                }
              }
            }
          ]);
          setIsLoading(false);
          return;
        }

        if (docCmd.action === 'json_format' && textContent) {
          sound.success();
          try {
            const parsedObj = JSON.parse(textContent);
            const formatted = JSON.stringify(parsedObj, null, 2);
            const botMsgId = `bot-${Date.now()}`;
            setMessages((prev) => [
              ...prev,
              {
                id: botMsgId,
                sender: 'bot',
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                text: `⚡ **JSON formatted and validated successfully!**`,
                toolState: {
                  type: 'document_result',
                  documentInfo: {
                    name: currentAttached.name,
                    size: currentAttached.size,
                    type: 'application/json',
                    formattedResult: formatted,
                    actionType: 'json'
                  }
                }
              }
            ]);
            setIsLoading(false);
            return;
          } catch {
            sound.error();
            toast({ title: 'Invalid JSON', description: 'Could not parse JSON format.' });
          }
        }

        // Default document options menu
        const botMsgId = `bot-${Date.now()}`;
        setMessages((prev) => [
          ...prev,
          {
            id: botMsgId,
            sender: 'bot',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            text: `📄 **Document received: "${currentAttached.name}" (${currentAttached.size})**\n\nChoose an action below to process your file:`,
            toolState: {
              type: 'document_options',
              documentInfo: {
                name: currentAttached.name,
                size: currentAttached.size,
                type: currentAttached.file.type || 'Document',
                words: wordsCount,
                chars: charsCount,
                lines: linesCount,
                content: textContent
              }
            }
          }
        ]);
        setIsLoading(false);
        return;
      }

      // ─────────────────────────────────────────────────────────────
      // 3. SCENARIO C: User pasted a YouTube Video Link
      // ─────────────────────────────────────────────────────────────
      const videoId = extractVideoId(rawText);
      if (videoId && (rawText.includes('youtube.com') || rawText.includes('youtu.be') || /^[a-zA-Z0-9_-]{11}$/.test(rawText))) {
        sound.scan();
        const ytCmd = parseYouTubeCommandLogic(rawText);

        if (ytCmd.action === 'unsupported' && ytCmd.unsupportedReason) {
          sound.error();
          const botMsgId = `bot-${Date.now()}`;
          const botResponseMsg: BotMessage = {
            id: botMsgId,
            sender: 'bot',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            text: ytCmd.unsupportedReason,
          };
          setMessages((prev) => [...prev, botResponseMsg]);
          setIsLoading(false);
          return;
        }

        const videoAnalysis = await analyzeYouTubeVideo(videoId);
        sound.success();

        if (ytCmd.action && ytCmd.action !== 'options' && ytCmd.action !== 'unsupported') {
          const botMsgId = `bot-${Date.now()}`;
          const botResponseMsg: BotMessage = {
            id: botMsgId,
            sender: 'bot',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            text: `🎬 **YouTube Video Metadata Loaded!**\n**"${videoAnalysis.title}"**\nHere is your requested output:`,
            toolState: {
              type: 'youtube_video_result',
              videoData: videoAnalysis,
              selectedAction: ytCmd.action,
            }
          };
          setMessages((prev) => [...prev, botResponseMsg]);
          setIsLoading(false);
          return;
        }

        const botMsgId = `bot-${Date.now()}`;
        const botResponseMsg: BotMessage = {
          id: botMsgId,
          sender: 'bot',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          text: `🎬 **YouTube video detected: "${videoAnalysis.title}"**\n\nWhat would you like to extract? Select an option below:`,
          toolState: {
            type: 'youtube_video_options',
            videoData: videoAnalysis,
          }
        };
        setMessages((prev) => [...prev, botResponseMsg]);
        setIsLoading(false);
        return;
      }

      // ─────────────────────────────────────────────────────────────
      // 4. SCENARIO D: YouTube Channel URL
      // ─────────────────────────────────────────────────────────────
      const channelIdentifier = parseChannelIdentifier(rawText);
      if (channelIdentifier && (rawText.includes('/channel/') || rawText.includes('/c/') || rawText.includes('/@') || rawText.includes('/user/'))) {
        sound.scan();
        const channelAnalysis = await analyzeYouTubeChannel(channelIdentifier.value);
        sound.success();

        const botMsgId = `bot-${Date.now()}`;
        const botResponseMsg: BotMessage = {
          id: botMsgId,
          sender: 'bot',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          text: `📺 **YouTube Channel Analysis Ready: "${channelAnalysis.title}"**\n\nClick below to view channel keywords, banners, and analytics:`,
          toolState: {
            type: 'youtube_channel_options',
            channelData: channelAnalysis,
          }
        };
        setMessages((prev) => [...prev, botResponseMsg]);
        setIsLoading(false);
        return;
      }

      // ─────────────────────────────────────────────────────────────
      // 5. SCENARIO E: Pure Text Command & Smart Logic (0 API Key)
      // ─────────────────────────────────────────────────────────────
      const pureTextMatch = parsePureTextCommandLogic(rawText);

      if (pureTextMatch.intent === 'clear_chat') {
        handleClearChat();
        setIsLoading(false);
        return;
      }

      if (pureTextMatch.intent === 'title_generator') {
        sound.generate();
        const topic = pureTextMatch.suggestedAction || rawText;
        try {
          const res = await generateTitleIdeas({ topic });
          const titlesList = res?.data?.titles?.map((t: any) => typeof t === 'string' ? t : t.title) || [];
          sound.success();

          const botMsgId = `bot-${Date.now()}`;
          const botResponseMsg: BotMessage = {
            id: botMsgId,
            sender: 'bot',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            text: `💡 **10 Viral YouTube Title Ideas for "${topic}":**\n\n${titlesList.map((t: string, idx: number) => `${idx + 1}. ${t}`).join('\n\n')}`,
            toolState: {
              type: 'text_tool_result',
              actionResultData: titlesList
            }
          };
          setMessages((prev) => [...prev, botResponseMsg]);
          setIsLoading(false);
          return;
        } catch {
          // Local fallback titles
          const fallbackTitles = [
            `Why ${topic} Will Change Everything in 2026`,
            `I Tried ${topic} for 30 Days (Here's What Happened)`,
            `Stop Doing ${topic} the WRONG Way!`,
            `The Ultimate Beginner's Guide to ${topic}`,
            `10 Secrets About ${topic} Nobody Tells You`
          ];
          const botMsgId = `bot-${Date.now()}`;
          setMessages((prev) => [
            ...prev,
            {
              id: botMsgId,
              sender: 'bot',
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              text: `💡 **Suggested Title Ideas for "${topic}":**\n\n${fallbackTitles.map((t, idx) => `${idx + 1}. ${t}`).join('\n\n')}`,
            }
          ]);
          setIsLoading(false);
          return;
        }
      }

      // Default local response
      sound.success();
      const botMsgId = `bot-${Date.now()}`;
      const botResponseMsg: BotMessage = {
        id: botMsgId,
        sender: 'bot',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        text: pureTextMatch.replyText || `🤖 **How can I help you?**\n\n• 🎬 **YouTube Tags & Thumbnails:** Paste any YouTube video or Shorts link.\n• 🖼️ **Image Convert & Compress:** Select an image via the 📎 button or drag & drop.\n• 📄 **Document Tools:** Upload TXT, JSON, or documents for fast word counts & formatting.`,
      };
      setMessages((prev) => [...prev, botResponseMsg]);
    } catch (error: any) {
      sound.error();
      const botMsgId = `bot-${Date.now()}`;
      setMessages((prev) => [
        ...prev,
        {
          id: botMsgId,
          sender: 'bot',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          text: `⚠️ **Unable to process request.**\n\nPlease check your input, paste a valid YouTube URL, or attach an image/file using the 📎 button.`,
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Video Option Execution
  const executeVideoAction = (messageId: string, actionKey: string, videoData: VideoAnalysisData) => {
    sound.click();
    setMessages((prev) =>
      prev.map((msg) => {
        if (msg.id === messageId && msg.toolState) {
          return {
            ...msg,
            toolState: {
              ...msg.toolState,
              type: 'youtube_video_result',
              selectedAction: actionKey,
            }
          };
        }
        return msg;
      })
    );
  };

  // Handle Image Option Execution
  const executeImageAction = async (
    messageId: string, 
    action: 'webp' | 'png' | 'jpeg' | 'compress' | 'favicon', 
    imageInfo: any,
    userMessageWithFile?: BotMessage
  ) => {
    sound.generate();
    setIsLoading(true);

    try {
      const file = userMessageWithFile?.attachment?.fileObj;
      if (!file) {
        toast({ title: "Image file reference expired", description: "Please re-upload your image." });
        setIsLoading(false);
        return;
      }

      if (action === 'webp' || action === 'png' || action === 'jpeg') {
        const quality = action === 'jpeg' ? 0.85 : 0.9;
        const res = await processImageConversion(file, action, quality);
        sound.success();

        setMessages((prev) =>
          prev.map((msg) => {
            if (msg.id === messageId && msg.toolState) {
              return {
                ...msg,
                toolState: {
                  ...msg.toolState,
                  type: 'image_result',
                  selectedAction: action,
                  imageInfo: {
                    ...msg.toolState.imageInfo!,
                    convertedUrl: res.dataUrl,
                    newSize: res.newSizeStr,
                    savingsPercent: res.savings,
                    format: action.toUpperCase(),
                  }
                }
              };
            }
            return msg;
          })
        );
      } else if (action === 'compress') {
        const res = await processImageConversion(file, 'webp', 0.65);
        sound.success();

        setMessages((prev) =>
          prev.map((msg) => {
            if (msg.id === messageId && msg.toolState) {
              return {
                ...msg,
                toolState: {
                  ...msg.toolState,
                  type: 'image_result',
                  selectedAction: 'compress',
                  imageInfo: {
                    ...msg.toolState.imageInfo!,
                    convertedUrl: res.dataUrl,
                    newSize: res.newSizeStr,
                    savingsPercent: res.savings,
                    format: 'Compressed WebP',
                  }
                }
              };
            }
            return msg;
          })
        );
      }
    } catch (err: any) {
      sound.error();
      toast({ title: 'Conversion error', description: String(err) });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Document Option Execution
  const executeDocumentAction = (messageId: string, action: string, docInfo: any) => {
    sound.click();
    const content = docInfo.content || '';

    let formattedResult = '';
    if (action === 'upper') {
      formattedResult = content.toUpperCase();
    } else if (action === 'lower') {
      formattedResult = content.toLowerCase();
    } else if (action === 'title_case') {
      formattedResult = content.replace(/\w\S*/g, (txt: string) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
    } else if (action === 'json') {
      try {
        formattedResult = JSON.stringify(JSON.parse(content), null, 2);
      } catch {
        formattedResult = content;
        toast({ title: 'Not valid JSON' });
      }
    }

    setMessages((prev) =>
      prev.map((msg) => {
        if (msg.id === messageId && msg.toolState) {
          return {
            ...msg,
            toolState: {
              ...msg.toolState,
              type: 'document_result',
              documentInfo: {
                ...msg.toolState.documentInfo!,
                formattedResult,
                actionType: action
              }
            }
          };
        }
        return msg;
      })
    );
  };

  // Drag and Drop Event Handlers
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setIsDraggingOver(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      attachSelectedFile(file);
      toast({ title: `Attached: ${file.name}` });
    }
  };

  return (
    <div 
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className="flex flex-col h-full w-full bg-background overflow-hidden relative"
    >
      {/* ─── FULL-SCREEN DRAG & DROP OVERLAY ────────────────────────────────── */}
      <AnimatePresence>
        {isDraggingOver && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="absolute inset-0 z-50 bg-background/90 backdrop-blur-md flex flex-col items-center justify-center p-6 border-4 border-dashed border-emerald-500 rounded-3xl m-3 shadow-2xl pointer-events-none"
          >
            <div className="w-20 h-20 rounded-full bg-emerald-500/20 text-emerald-500 flex items-center justify-center mb-4 shadow-lg shadow-emerald-500/20 animate-bounce">
              <UploadCloud className="w-10 h-10" />
            </div>
            <h3 className="text-xl font-bold text-foreground">Drop your Image or File here!</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm text-center">
              Works with JPG, PNG, WebP, PDF, TXT, and JSON files directly in-browser.
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── BOT APP HEADER ─────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-3 md:px-6 py-2.5 md:py-3 border-b bg-card/95 backdrop-blur-md shrink-0 shadow-xs z-10">
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <div className="relative shrink-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-gradient-to-tr from-emerald-500 via-teal-500 to-cyan-500 flex items-center justify-center text-white shadow-md shadow-emerald-500/20">
              <Bot className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-card rounded-full" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <h1 className="font-bold text-sm sm:text-base tracking-tight truncate text-foreground">Naxxivo Smart Bot</h1>
              <span className="text-[9px] sm:text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shrink-0">
                100% Local Engine
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground truncate">
              YouTube Automation & In-Browser Media Converter
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          {commandHistory.length > 0 && (
            <div className="relative">
              <button
                onClick={() => setShowHistorySheet(!showHistorySheet)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
                  showHistorySheet 
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30' 
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/80 border-transparent hover:border-border'
                }`}
                title="Recent Commands History"
              >
                <History className="w-4 h-4" />
                <span className="hidden sm:inline">History</span>
                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-muted text-muted-foreground">
                  {commandHistory.length}
                </span>
              </button>

              {/* History Dropdown Panel */}
              <AnimatePresence>
                {showHistorySheet && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute right-0 top-full mt-2 w-72 sm:w-80 bg-card border rounded-2xl shadow-xl z-50 p-3 space-y-2.5 overflow-hidden"
                  >
                    <div className="flex items-center justify-between border-b pb-2 px-1">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                        <History className="w-3.5 h-3.5 text-emerald-500" />
                        <span>Recent Commands</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            setCommandHistory([]);
                            setHistoryIndex(-1);
                            sessionStorage.removeItem('naxxivo_bot_cmd_history');
                            setShowHistorySheet(false);
                            toast({ title: 'Command history cleared' });
                          }}
                          className="text-[11px] text-muted-foreground hover:text-destructive transition-colors px-1.5 py-0.5 rounded hover:bg-destructive/10"
                        >
                          Clear
                        </button>
                        <button
                          onClick={() => setShowHistorySheet(false)}
                          className="text-muted-foreground hover:text-foreground p-0.5 rounded"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="max-h-56 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                      {commandHistory.slice().reverse().map((cmd, idx) => (
                        <button
                          key={`hist-${idx}`}
                          onClick={() => {
                            setInputVal(cmd);
                            setShowHistorySheet(false);
                            if (textareaRef.current) {
                              textareaRef.current.focus();
                              textareaRef.current.value = cmd;
                              textareaRef.current.style.height = 'auto';
                              textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 160)}px`;
                            }
                          }}
                          className="w-full text-left p-2 rounded-xl text-xs hover:bg-muted/80 text-foreground transition-all flex items-center justify-between group border border-transparent hover:border-border"
                        >
                          <span className="truncate font-mono text-[11px]">{cmd}</span>
                          <span className="text-[10px] text-muted-foreground group-hover:text-emerald-500 shrink-0 ml-2 font-sans opacity-0 group-hover:opacity-100 transition-opacity">
                            Use ↵
                          </span>
                        </button>
                      ))}
                    </div>

                    <div className="pt-1.5 border-t text-[10px] text-muted-foreground text-center flex items-center justify-center gap-2">
                      <span>💡 <b>↑ / ↓</b> keys to scroll in input</span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          <button
            onClick={handleClearChat}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors border border-transparent hover:border-destructive/20"
            title="Clear Chat History"
          >
            <Trash2 className="w-4 h-4" />
            <span className="hidden sm:inline">Clear</span>
          </button>
        </div>
      </div>

      {/* ─── MESSAGES SCROLL AREA (MOBILE APP CHAT UI) ────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-3 py-4 md:px-6 md:py-5 space-y-4 md:space-y-5 max-w-4xl mx-auto w-full">
        {/* Empty State / Starter Suggestions */}
        {messages.length <= 1 && (
          <div className="py-2 sm:py-6 space-y-4 max-w-xl mx-auto">
            <div className="text-center space-y-1">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-500 mx-auto flex items-center justify-center mb-2 shadow-inner">
                <Sparkles className="w-6 h-6" />
              </div>
              <h2 className="text-base sm:text-lg font-bold text-foreground">What can I do for you today?</h2>
              <p className="text-xs text-muted-foreground">Select an option, drag & drop an image, or paste a YouTube URL:</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {STARTER_PROMPTS.map((starter, i) => (
                <button
                  key={i}
                  onClick={() => {
                    if (starter.action === "Upload Image") {
                      imageInputRef.current?.click();
                    } else if (starter.action === "Analyze Document") {
                      docInputRef.current?.click();
                    } else {
                      handleSendMessage(starter.action);
                    }
                  }}
                  className="p-3 rounded-xl border bg-card/70 hover:bg-card hover:border-emerald-500/40 text-left transition-all hover:scale-[1.01] hover:shadow-sm flex flex-col justify-between gap-1.5 group"
                >
                  <div className="flex items-center gap-2 font-semibold text-xs text-foreground">
                    <div className="p-1 rounded-lg bg-muted text-foreground group-hover:text-emerald-500 transition-colors">
                      <starter.icon className="w-3.5 h-3.5 shrink-0" />
                    </div>
                    <span className="truncate">{starter.title}</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-2">{starter.desc}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Message Thread */}
        {messages.map((msg) => {
          const isUser = msg.sender === 'user';
          return (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.15 }}
              className={`flex gap-2.5 sm:gap-3 max-w-3xl ${isUser ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}
            >
              {/* Avatar Icon */}
              <div
                className={`w-7 h-7 sm:w-8 sm:h-8 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 shadow-sm ${
                  isUser
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white'
                }`}
              >
                {isUser ? <Send className="w-3.5 h-3.5" /> : <Bot className="w-4 h-4" />}
              </div>

              {/* Message Bubble Card */}
              <div
                className={`p-3.5 sm:p-4 rounded-2xl text-xs sm:text-sm space-y-3 leading-relaxed shadow-sm max-w-[85vw] sm:max-w-xl ${
                  isUser
                    ? 'bg-primary text-primary-foreground rounded-tr-sm'
                    : 'bg-card border text-card-foreground rounded-tl-sm'
                }`}
              >
                {/* User Attachment Preview */}
                {msg.attachment && (
                  <div className="p-2 rounded-xl bg-black/10 dark:bg-white/10 flex items-center gap-2.5">
                    {msg.attachment.type === 'image' && msg.attachment.url ? (
                      <div className="w-11 h-11 rounded-lg overflow-hidden shrink-0 border border-white/20 relative bg-black/20 flex items-center justify-center">
                        <img
                          src={msg.attachment.url}
                          alt=""
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                        <ImageIcon className="w-5 h-5 text-white/80 shrink-0 absolute inset-0 m-auto -z-0 pointer-events-none" />
                      </div>
                    ) : (
                      <div className="w-11 h-11 rounded-lg bg-background/40 flex items-center justify-center shrink-0">
                        <FileText className="w-5 h-5 text-emerald-500" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-xs truncate">{msg.attachment.name}</p>
                      <p className="text-[10px] opacity-75">{msg.attachment.size || 'Attached File'}</p>
                    </div>
                  </div>
                )}

                {/* Message Body Text */}
                <div className="whitespace-pre-wrap font-sans text-xs sm:text-[13px] leading-relaxed break-words">
                  {msg.text}
                </div>

                {/* 1. YouTube Video Action Options */}
                {msg.toolState?.type === 'youtube_video_options' && msg.toolState.videoData && (
                  <div className="pt-2 border-t space-y-3">
                    <div className="flex items-center gap-2.5 p-2 rounded-xl bg-muted/40 border">
                      <img
                        src={msg.toolState.videoData.thumbnailUrl}
                        alt="Thumbnail"
                        className="w-16 h-10 object-cover rounded-lg shrink-0 border"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold truncate text-foreground">{msg.toolState.videoData.title}</p>
                        <p className="text-[10px] text-muted-foreground">{msg.toolState.videoData.channelTitle}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => executeVideoAction(msg.id, 'tags', msg.toolState!.videoData!)}
                        className="p-2 rounded-lg text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20 flex items-center justify-center gap-1.5 transition-colors"
                      >
                        <Tag className="w-3.5 h-3.5" />
                        <span>Extract Tags</span>
                      </button>

                      <button
                        onClick={() => executeVideoAction(msg.id, 'thumbnails', msg.toolState!.videoData!)}
                        className="p-2 rounded-lg text-xs font-semibold bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20 flex items-center justify-center gap-1.5 transition-colors"
                      >
                        <ImageIcon className="w-3.5 h-3.5" />
                        <span>HD Thumbnail</span>
                      </button>

                      <button
                        onClick={() => executeVideoAction(msg.id, 'keywords', msg.toolState!.videoData!)}
                        className="p-2 rounded-lg text-xs font-semibold bg-purple-500/10 text-purple-500 hover:bg-purple-500/20 border border-purple-500/20 flex items-center justify-center gap-1.5 transition-colors"
                      >
                        <Hash className="w-3.5 h-3.5" />
                        <span>Keywords & SEO</span>
                      </button>

                      <button
                        onClick={() => executeVideoAction(msg.id, 'embed', msg.toolState!.videoData!)}
                        className="p-2 rounded-lg text-xs font-semibold bg-cyan-500/10 text-cyan-500 hover:bg-cyan-500/20 border border-cyan-500/20 flex items-center justify-center gap-1.5 transition-colors"
                      >
                        <Code2 className="w-3.5 h-3.5" />
                        <span>Embed Code</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* 2. YouTube Video Execution Result */}
                {msg.toolState?.type === 'youtube_video_result' && msg.toolState.videoData && (
                  <div className="pt-2 border-t space-y-3">
                    {/* Tags Result */}
                    {msg.toolState.selectedAction === 'tags' && (
                      <div className="p-3 rounded-xl bg-background/60 border space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-xs flex items-center gap-1.5 text-foreground">
                            <Tag className="w-3.5 h-3.5 text-emerald-500" /> Extracted Video Tags ({msg.toolState.videoData.tags?.length || 0})
                          </span>
                          <button
                            onClick={() => copyToClipboard(msg.toolState!.videoData!.tags?.join(', ') || '', `tags-${msg.id}`)}
                            className="text-xs text-primary font-medium hover:underline flex items-center gap-1"
                          >
                            {copiedId === `tags-${msg.id}` ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                            Copy All
                          </button>
                        </div>
                        <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-1">
                          {msg.toolState.videoData.tags && msg.toolState.videoData.tags.length > 0 ? (
                            msg.toolState.videoData.tags.map((tag, tIdx) => (
                              <span key={tIdx} className="px-2 py-0.5 rounded-md bg-muted text-[11px] font-mono border">
                                {tag}
                              </span>
                            ))
                          ) : (
                            <p className="text-xs text-muted-foreground italic">No public tags found for this video.</p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Thumbnail Result */}
                    {msg.toolState.selectedAction === 'thumbnails' && (
                      <div className="p-3 rounded-xl bg-background/60 border space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-xs flex items-center gap-1.5 text-foreground">
                            <ImageIcon className="w-3.5 h-3.5 text-emerald-500" /> 1080p Maximum Resolution Thumbnail
                          </span>
                          <a
                            href={msg.toolState.videoData.maxResThumbnailUrl || msg.toolState.videoData.thumbnailUrl}
                            target="_blank"
                            rel="noreferrer"
                            download="youtube-thumbnail.jpg"
                            onClick={() => sound.download()}
                            className="text-xs font-semibold px-2.5 py-1 rounded-md bg-emerald-500 text-white flex items-center gap-1 hover:bg-emerald-600 transition-colors shadow-xs"
                          >
                            <Download className="w-3 h-3" /> Download HD
                          </a>
                        </div>
                        <div className="relative rounded-lg overflow-hidden border">
                          <img
                            src={msg.toolState.videoData.maxResThumbnailUrl || msg.toolState.videoData.thumbnailUrl}
                            alt="HD Thumbnail"
                            className="w-full h-auto object-cover"
                          />
                        </div>
                      </div>
                    )}

                    {/* Keywords Result */}
                    {msg.toolState.selectedAction === 'keywords' && (
                      <div className="p-3 rounded-xl bg-background/60 border space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-xs flex items-center gap-1.5 text-foreground">
                            <Hash className="w-3.5 h-3.5 text-emerald-500" /> SEO Keywords & Hashtags
                          </span>
                          <button
                            onClick={() => copyToClipboard(msg.toolState!.videoData!.keywords?.join(', ') || '', `kw-${msg.id}`)}
                            className="text-xs text-primary font-medium hover:underline flex items-center gap-1"
                          >
                            {copiedId === `kw-${msg.id}` ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                            Copy
                          </button>
                        </div>
                        <div className="flex flex-wrap gap-1.5 p-1">
                          {msg.toolState.videoData.keywords?.map((kw, kidx) => (
                            <span key={kidx} className="px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 text-[11px] font-medium border border-purple-500/20">
                              #{kw}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Embed Result */}
                    {msg.toolState.selectedAction === 'embed' && (
                      <div className="p-3 rounded-xl bg-background/60 border space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-xs flex items-center gap-1.5 text-foreground">
                            <Code2 className="w-3.5 h-3.5 text-emerald-500" /> Responsive Embed Code
                          </span>
                          <button
                            onClick={() => copyToClipboard(`<iframe width="560" height="315" src="https://www.youtube.com/embed/${msg.toolState!.videoData!.id}" frameborder="0" allowfullscreen></iframe>`, `embed-${msg.id}`)}
                            className="text-xs text-primary font-medium hover:underline flex items-center gap-1"
                          >
                            {copiedId === `embed-${msg.id}` ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                            Copy Code
                          </button>
                        </div>
                        <pre className="p-2 rounded-lg bg-muted text-[11px] font-mono overflow-x-auto border text-foreground">
                          {`<iframe width="560" height="315" src="https://www.youtube.com/embed/${msg.toolState.videoData.id}" frameborder="0" allowfullscreen></iframe>`}
                        </pre>
                      </div>
                    )}
                  </div>
                )}

                {/* 3. Image Options Tray */}
                {msg.toolState?.type === 'image_options' && msg.toolState.imageInfo && (
                  <div className="pt-2 border-t space-y-3">
                    <div className="flex items-center gap-3 p-2 rounded-xl bg-muted/40 border">
                      <img
                        src={msg.toolState.imageInfo.originalUrl}
                        alt="Uploaded"
                        className="w-16 h-16 object-cover rounded-lg border shadow-sm"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold truncate text-foreground">{msg.toolState.imageInfo.name}</p>
                        <p className="text-[10px] text-muted-foreground">Original: {msg.toolState.imageInfo.originalSize}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => {
                          const userMsg = messages.find(m => m.attachment?.fileObj);
                          executeImageAction(msg.id, 'webp', msg.toolState!.imageInfo!, userMsg);
                        }}
                        className="p-2.5 rounded-xl text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20 flex items-center justify-center gap-1.5"
                      >
                        <Zap className="w-3.5 h-3.5" />
                        <span>Convert to WebP</span>
                      </button>

                      <button
                        onClick={() => {
                          const userMsg = messages.find(m => m.attachment?.fileObj);
                          executeImageAction(msg.id, 'compress', msg.toolState!.imageInfo!, userMsg);
                        }}
                        className="p-2.5 rounded-xl text-xs font-semibold bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20 flex items-center justify-center gap-1.5"
                      >
                        <Sliders className="w-3.5 h-3.5" />
                        <span>Compress Size (65%)</span>
                      </button>

                      <button
                        onClick={() => {
                          const userMsg = messages.find(m => m.attachment?.fileObj);
                          executeImageAction(msg.id, 'png', msg.toolState!.imageInfo!, userMsg);
                        }}
                        className="p-2.5 rounded-xl text-xs font-semibold bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 border border-blue-500/20 flex items-center justify-center gap-1.5"
                      >
                        <ImageIcon className="w-3.5 h-3.5" />
                        <span>Convert to PNG</span>
                      </button>

                      <button
                        onClick={() => {
                          const userMsg = messages.find(m => m.attachment?.fileObj);
                          executeImageAction(msg.id, 'jpeg', msg.toolState!.imageInfo!, userMsg);
                        }}
                        className="p-2.5 rounded-xl text-xs font-semibold bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 border border-amber-500/20 flex items-center justify-center gap-1.5"
                      >
                        <Palette className="w-3.5 h-3.5" />
                        <span>Convert to JPG</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* 4. Image Result Box */}
                {msg.toolState?.type === 'image_result' && msg.toolState.imageInfo && (
                  <div className="pt-2 border-t space-y-3">
                    <div className="p-3 rounded-xl bg-background/60 border space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-xs flex items-center gap-1.5 text-foreground">
                          <Check className="w-3.5 h-3.5 text-emerald-500" /> Processed into {msg.toolState.imageInfo.format}
                        </span>
                        {msg.toolState.imageInfo.savingsPercent !== undefined && msg.toolState.imageInfo.savingsPercent > 0 && (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 text-[10px] font-bold border border-emerald-500/20">
                            {msg.toolState.imageInfo.savingsPercent}% Smaller!
                          </span>
                        )}
                      </div>

                      <div className="relative rounded-lg overflow-hidden border">
                        <img
                          src={msg.toolState.imageInfo.convertedUrl}
                          alt="Converted"
                          className="w-full max-h-56 object-contain bg-muted/30"
                        />
                      </div>

                      <div className="flex items-center justify-between pt-1">
                        <div className="text-[11px] text-muted-foreground">
                          <span>{msg.toolState.imageInfo.originalSize}</span> → <strong className="text-emerald-500">{msg.toolState.imageInfo.newSize}</strong>
                        </div>

                        <a
                          href={msg.toolState.imageInfo.convertedUrl}
                          download={`converted-${msg.toolState.imageInfo.name.split('.')[0]}.${msg.toolState.imageInfo.format?.toLowerCase().includes('png') ? 'png' : msg.toolState.imageInfo.format?.toLowerCase().includes('jpg') ? 'jpg' : 'webp'}`}
                          onClick={() => sound.download()}
                          className="px-3 py-1.5 rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-emerald-500/20 transition-all"
                        >
                          <Download className="w-3.5 h-3.5" />
                          Download Image
                        </a>
                      </div>
                    </div>
                  </div>
                )}

                {/* 5. Document Options Tray */}
                {msg.toolState?.type === 'document_options' && msg.toolState.documentInfo && (
                  <div className="pt-2 border-t space-y-3">
                    <div className="flex items-center gap-3 p-2.5 rounded-xl bg-muted/40 border">
                      <div className="w-10 h-10 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold truncate text-foreground">{msg.toolState.documentInfo.name}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {msg.toolState.documentInfo.size} • {msg.toolState.documentInfo.words || 0} Words • {msg.toolState.documentInfo.lines || 0} Lines
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => executeDocumentAction(msg.id, 'count', msg.toolState!.documentInfo)}
                        className="p-2 rounded-lg text-xs font-semibold bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20 flex items-center justify-center gap-1.5"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>Word Stats</span>
                      </button>

                      <button
                        onClick={() => executeDocumentAction(msg.id, 'upper', msg.toolState!.documentInfo)}
                        className="p-2 rounded-lg text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20 flex items-center justify-center gap-1.5"
                      >
                        <Type className="w-3.5 h-3.5" />
                        <span>UPPERCASE</span>
                      </button>

                      <button
                        onClick={() => executeDocumentAction(msg.id, 'lower', msg.toolState!.documentInfo)}
                        className="p-2 rounded-lg text-xs font-semibold bg-purple-500/10 text-purple-500 hover:bg-purple-500/20 border border-purple-500/20 flex items-center justify-center gap-1.5"
                      >
                        <Type className="w-3.5 h-3.5" />
                        <span>lowercase</span>
                      </button>

                      <button
                        onClick={() => executeDocumentAction(msg.id, 'json', msg.toolState!.documentInfo)}
                        className="p-2 rounded-lg text-xs font-semibold bg-cyan-500/10 text-cyan-500 hover:bg-cyan-500/20 border border-cyan-500/20 flex items-center justify-center gap-1.5"
                      >
                        <FileCode className="w-3.5 h-3.5" />
                        <span>Format JSON</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* 6. Document Result Box */}
                {msg.toolState?.type === 'document_result' && msg.toolState.documentInfo && (
                  <div className="pt-2 border-t space-y-3">
                    <div className="p-3 rounded-xl bg-background/60 border space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-xs flex items-center gap-1.5 text-foreground">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Output Result
                        </span>
                        {msg.toolState.documentInfo.formattedResult && (
                          <button
                            onClick={() => copyToClipboard(msg.toolState!.documentInfo!.formattedResult || '', `doc-${msg.id}`)}
                            className="text-xs text-primary font-medium hover:underline flex items-center gap-1"
                          >
                            {copiedId === `doc-${msg.id}` ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                            Copy Text
                          </button>
                        )}
                      </div>

                      {msg.toolState.documentInfo.formattedResult && (
                        <pre className="p-2.5 rounded-lg bg-muted text-[11px] font-mono max-h-48 overflow-y-auto border whitespace-pre-wrap break-all text-foreground">
                          {msg.toolState.documentInfo.formattedResult}
                        </pre>
                      )}
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between text-[10px] opacity-60 pt-1">
                  <span>{msg.timestamp}</span>
                  {!isUser && (
                    <button
                      onClick={() => copyToClipboard(msg.text, `msg-${msg.id}`)}
                      className="hover:opacity-100 flex items-center gap-1 transition-opacity"
                      title="Copy response"
                    >
                      {copiedId === `msg-${msg.id}` ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                      <span>Copy</span>
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}

        {/* Interactive Typing Animation & Indicator */}
        {isLoading && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="flex gap-2.5 max-w-3xl mr-auto items-end"
          >
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-500 via-teal-600 to-emerald-700 flex items-center justify-center text-white text-xs font-bold shrink-0 shadow-sm ring-2 ring-emerald-500/20">
              <Bot className="w-4 h-4" />
            </div>

            <div className="px-4 py-3 rounded-2xl rounded-bl-sm bg-card border shadow-sm flex items-center gap-3">
              {/* Three Bouncing Dots Animation */}
              <div className="flex items-center gap-1 py-1">
                <motion.span
                  className="w-2 h-2 rounded-full bg-emerald-500 inline-block"
                  animate={{ y: [0, -6, 0], opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 0.8, repeat: Infinity, ease: 'easeInOut', delay: 0 }}
                />
                <motion.span
                  className="w-2 h-2 rounded-full bg-teal-500 inline-block"
                  animate={{ y: [0, -6, 0], opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 0.8, repeat: Infinity, ease: 'easeInOut', delay: 0.2 }}
                />
                <motion.span
                  className="w-2 h-2 rounded-full bg-emerald-600 inline-block"
                  animate={{ y: [0, -6, 0], opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 0.8, repeat: Infinity, ease: 'easeInOut', delay: 0.4 }}
                />
              </div>

              <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium pl-1 border-l">
                <Sparkles className="w-3 h-3 text-emerald-500 animate-spin" style={{ animationDuration: '3s' }} />
                <span className="text-[11px] animate-pulse">SmartBot is processing...</span>
              </div>
            </div>
          </motion.div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* ─── BOTTOM INPUT SECTION (HIGH-END TEXT BOX & ATTACHMENT HUB) ──────── */}
      <div className="p-2.5 sm:p-3 border-t bg-card/95 backdrop-blur-md shrink-0 space-y-2 z-20">
        {/* Recent Session Command Quick Chips */}
        {commandHistory.length > 0 && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-4xl mx-auto scrollbar-none">
            <span className="text-[10px] uppercase font-bold text-muted-foreground shrink-0 flex items-center gap-1 pl-1">
              <History className="w-3 h-3 text-emerald-500" /> Recent:
            </span>
            {commandHistory.slice(-4).reverse().map((cmd, idx) => (
              <button
                key={`chip-${idx}`}
                onClick={() => {
                  sound.click();
                  setInputVal(cmd);
                  if (textareaRef.current) {
                    textareaRef.current.focus();
                    textareaRef.current.value = cmd;
                    textareaRef.current.style.height = 'auto';
                    textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 160)}px`;
                  }
                }}
                className="text-[11px] px-2.5 py-1 rounded-full bg-muted hover:bg-emerald-500/10 hover:text-emerald-600 dark:hover:text-emerald-400 border text-muted-foreground hover:border-emerald-500/30 transition-all truncate max-w-[160px] sm:max-w-[200px] shrink-0 font-mono"
                title={`Reuse: "${cmd}"`}
              >
                {cmd}
              </button>
            ))}
          </div>
        )}

        {/* Attached File Preview Bar before Sending */}
        {attachedFile && (
          <div className="flex items-center justify-between p-2 rounded-xl bg-muted/80 border text-xs max-w-md animate-in fade-in slide-in-from-bottom-2 mx-auto sm:mx-0 shadow-xs">
            <div className="flex items-center gap-2.5 min-w-0">
              {attachedFile.type === 'image' && attachedFile.previewUrl ? (
                <img src={attachedFile.previewUrl} alt="preview" className="w-9 h-9 object-cover rounded-lg border shadow-xs" />
              ) : (
                <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
              )}
              <div className="truncate">
                <p className="font-semibold truncate text-foreground text-xs">{attachedFile.name}</p>
                <p className="text-[10px] text-muted-foreground">{attachedFile.size} • {attachedFile.type.toUpperCase()}</p>
              </div>
            </div>
            <button
              onClick={() => setAttachedFile(null)}
              className="p-1 rounded-md hover:bg-destructive/10 hover:text-destructive transition-colors"
              title="Remove attachment"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Text Input Row - Perfectly Leveled & Optimized */}
        <div className="flex items-center gap-2 max-w-4xl mx-auto w-full relative">
          {/* Hidden HTML Inputs for Direct Selection */}
          <input
            type="file"
            ref={imageInputRef}
            onChange={handleNativeFileChange}
            accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml,image/bmp"
            className="hidden"
          />
          <input
            type="file"
            ref={docInputRef}
            onChange={handleNativeFileChange}
            accept=".pdf,.txt,.json,.md,.csv,.doc,.docx"
            className="hidden"
          />
          <input
            type="file"
            ref={allFileInputRef}
            onChange={handleNativeFileChange}
            accept="*/*"
            className="hidden"
          />
          <input
            type="file"
            ref={cameraInputRef}
            onChange={handleNativeFileChange}
            accept="image/*"
            capture="environment"
            className="hidden"
          />

          {/* Attachment Button & Popover Trigger */}
          <div className="relative shrink-0" ref={menuRef}>
            <button
              onClick={() => {
                sound.click();
                setShowAttachMenu(!showAttachMenu);
              }}
              className={`p-2.5 rounded-2xl border transition-all shrink-0 flex items-center justify-center h-11 w-11 ${
                showAttachMenu 
                  ? 'bg-emerald-500 text-white border-emerald-500 shadow-md shadow-emerald-500/20' 
                  : 'bg-muted/80 hover:bg-muted text-muted-foreground hover:text-foreground border-border hover:border-emerald-500/40'
              }`}
              title="Attach Images, Documents, Camera or Clipboard"
            >
              <Plus className={`w-5 h-5 transition-transform duration-200 ${showAttachMenu ? 'rotate-45 text-white' : ''}`} />
            </button>

            {/* In-Browser Attachment Options Popover Menu */}
            <AnimatePresence>
              {showAttachMenu && (
                <motion.div
                  initial={{ opacity: 0, y: 12, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 12, scale: 0.95 }}
                  className="absolute left-0 bottom-full mb-2 w-72 sm:w-80 bg-card border rounded-2xl shadow-2xl z-50 p-3 space-y-2.5 overflow-hidden"
                >
                  <div className="flex items-center justify-between border-b pb-2 px-1">
                    <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-emerald-500" /> In-Browser File Options
                    </span>
                    <button
                      onClick={() => setShowAttachMenu(false)}
                      className="text-muted-foreground hover:text-foreground p-0.5"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Primary Selection Grid */}
                  <div className="grid grid-cols-2 gap-2">
                    {/* Image / Gallery */}
                    <button
                      onClick={() => imageInputRef.current?.click()}
                      className="p-2.5 rounded-xl border bg-muted/40 hover:bg-emerald-500/10 hover:border-emerald-500/30 text-left transition-all group flex flex-col gap-1"
                    >
                      <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 w-fit group-hover:scale-105 transition-transform">
                        <ImageIcon className="w-4 h-4" />
                      </div>
                      <span className="text-xs font-semibold text-foreground">Photos & Images</span>
                      <span className="text-[10px] text-muted-foreground">PNG, JPG, WebP</span>
                    </button>

                    {/* Documents */}
                    <button
                      onClick={() => docInputRef.current?.click()}
                      className="p-2.5 rounded-xl border bg-muted/40 hover:bg-blue-500/10 hover:border-blue-500/30 text-left transition-all group flex flex-col gap-1"
                    >
                      <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-500 w-fit group-hover:scale-105 transition-transform">
                        <FileText className="w-4 h-4" />
                      </div>
                      <span className="text-xs font-semibold text-foreground">Documents</span>
                      <span className="text-[10px] text-muted-foreground">PDF, TXT, JSON, MD</span>
                    </button>

                    {/* Camera */}
                    <button
                      onClick={() => cameraInputRef.current?.click()}
                      className="p-2.5 rounded-xl border bg-muted/40 hover:bg-purple-500/10 hover:border-purple-500/30 text-left transition-all group flex flex-col gap-1"
                    >
                      <div className="p-1.5 rounded-lg bg-purple-500/10 text-purple-500 w-fit group-hover:scale-105 transition-transform">
                        <Camera className="w-4 h-4" />
                      </div>
                      <span className="text-xs font-semibold text-foreground">Take Photo</span>
                      <span className="text-[10px] text-muted-foreground">Direct Camera</span>
                    </button>

                    {/* Clipboard Direct Paste */}
                    <button
                      onClick={handlePasteClipboardBtn}
                      className="p-2.5 rounded-xl border bg-muted/40 hover:bg-amber-500/10 hover:border-amber-500/30 text-left transition-all group flex flex-col gap-1"
                    >
                      <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-500 w-fit group-hover:scale-105 transition-transform">
                        <Clipboard className="w-4 h-4" />
                      </div>
                      <span className="text-xs font-semibold text-foreground">Paste Clipboard</span>
                      <span className="text-[10px] text-muted-foreground">Ctrl+V / Screenshot</span>
                    </button>
                  </div>

                  {/* Quick Sample Presets */}
                  <div className="pt-2 border-t space-y-1.5">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground px-1">
                      ⚡ Quick Sample Files
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleLoadSampleFile('photo')}
                        className="flex-1 py-1.5 px-2 rounded-lg bg-muted text-[10px] font-medium hover:bg-emerald-500/10 hover:text-emerald-600 dark:hover:text-emerald-400 border text-foreground transition-colors truncate"
                      >
                        🌄 HD Photo
                      </button>
                      <button
                        onClick={() => handleLoadSampleFile('icon')}
                        className="flex-1 py-1.5 px-2 rounded-lg bg-muted text-[10px] font-medium hover:bg-emerald-500/10 hover:text-emerald-600 dark:hover:text-emerald-400 border text-foreground transition-colors truncate"
                      >
                        🎨 Logo Icon
                      </button>
                      <button
                        onClick={() => handleLoadSampleFile('json')}
                        className="flex-1 py-1.5 px-2 rounded-lg bg-muted text-[10px] font-medium hover:bg-emerald-500/10 hover:text-emerald-600 dark:hover:text-emerald-400 border text-foreground transition-colors truncate"
                      >
                        📄 JSON
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Elevated Textarea Input Container */}
          <div className="flex-1 relative focus-within:ring-2 focus-within:ring-emerald-500/40 rounded-2xl transition-all flex items-center">
            <textarea
              ref={textareaRef}
              value={inputVal}
              onChange={handleInputChange}
              onKeyDown={(e) => {
                if (e.key === 'ArrowUp' && (inputVal === '' || historyIndex !== -1)) {
                  e.preventDefault();
                  navigateHistory('up');
                } else if (e.key === 'ArrowDown' && historyIndex !== -1) {
                  e.preventDefault();
                  navigateHistory('down');
                } else if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              placeholder="Type a message or paste URL..."
              rows={1}
              className="w-full resize-none rounded-2xl border bg-background px-3.5 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm text-foreground placeholder:text-muted-foreground focus:outline-none leading-normal min-h-[44px] max-h-32 overflow-y-auto"
            />

            {/* Clear Input Button if text present */}
            {inputVal && (
              <button
                onClick={() => {
                  setInputVal('');
                  if (textareaRef.current) {
                    textareaRef.current.value = '';
                    textareaRef.current.style.height = 'auto';
                  }
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1 rounded-full bg-muted/60 hover:bg-muted transition-colors"
                title="Clear input"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Send Button */}
          <button
            onClick={() => handleSendMessage()}
            disabled={isLoading || (!inputVal.trim() && !attachedFile)}
            className="p-2.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white transition-all shadow-md shadow-emerald-500/20 disabled:opacity-40 disabled:cursor-not-allowed shrink-0 flex items-center justify-center h-11 w-11"
            title="Send Message"
          >
            <Send className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
