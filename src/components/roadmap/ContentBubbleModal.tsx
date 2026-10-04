import { MathText } from "@/components/MathText";
import { getSelectedTextWithMath, normalizeMath } from "@/lib/math";
import { logger } from "@/lib/logger";
import { useState, useEffect, useRef } from "react";
import { X, Send, Loader2, Pencil, Check, ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ContentBubble } from "@/types/learning";
import BubbleNode from "./BubbleNode";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

interface ContentBubbleModalProps {
  bubble?: ContentBubble;
  isOpen: boolean;
  onClose: () => void;
  onSave: (title: string, content: string) => void;
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

const ContentBubbleModal = ({
  bubble,
  isOpen,
  onClose,
  onSave,
}: ContentBubbleModalProps) => {
  const [title, setTitle] = useState(bubble?.title || "");
  const [content, setContent] = useState(bubble?.content || "");
  const [isEditingContent, setIsEditingContent] = useState(false);
  const [askAiInput, setAskAiInput] = useState("");
  const [highlightedText, setHighlightedText] = useState("");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [uploadingImages, setUploadingImages] = useState<Set<string>>(new Set());
  const [contentHeight, setContentHeight] = useState(350); // Default height in pixels
  const [isResizing, setIsResizing] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const resizeStartY = useRef<number>(0);
  const resizeStartHeight = useRef<number>(0);
  const { toast } = useToast();
  const { user } = useAuth();

  const MAX_CONTENT_LENGTH = 10000; // Increased to accommodate image URLs
  const MIN_CONTENT_HEIGHT = 150;
  const MAX_CONTENT_HEIGHT = 600;

  // ESC key to close modal
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Load chat history from database when bubble changes
  useEffect(() => {
    if (bubble && user) {
      setTitle(bubble.title || "");
      setContent(bubble.content || "");
      setIsEditingContent(false);
      setAskAiInput("");
      setHighlightedText("");

      // Load chat history
      loadChatHistory(bubble.id);
    }
  }, [bubble, user]);

  const loadChatHistory = async (contentBubbleId: string) => {
    if (!user) return;

    setLoadingHistory(true);
    try {
      const { data, error } = await supabase
        .from('content_chat_messages')
        .select('role, message, created_at')
        .eq('content_bubble_id', contentBubbleId)
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });

      if (error) throw error;

      if (data) {
        setChatMessages(data.map(msg => ({
          role: msg.role as "user" | "assistant",
          content: msg.message,
        })));
      }
    } catch (error) {
      console.error('Error loading chat history:', error);
      // Silently fail - chat history is not critical
    } finally {
      setLoadingHistory(false);
    }
  };

  const saveChatMessage = async (role: "user" | "assistant", message: string) => {
    if (!bubble || !user) return;

    try {
      await supabase.from('content_chat_messages').insert({
        content_bubble_id: bubble.id,
        user_id: user.id,
        role,
        message,
      });
    } catch (error) {
      console.error('Error saving chat message:', error);
      // Continue even if save fails
    }
  };

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatMessages]);

  // Resize handlers - supporting both mouse and touch
  useEffect(() => {
    if (!isResizing) return;

    const handleResizeMove = (clientY: number) => {
      const deltaY = clientY - resizeStartY.current;
      const newHeight = resizeStartHeight.current + deltaY;
      const clampedHeight = Math.min(Math.max(newHeight, MIN_CONTENT_HEIGHT), MAX_CONTENT_HEIGHT);
      setContentHeight(clampedHeight);
    };

    const handleMouseMove = (e: MouseEvent) => {
      handleResizeMove(e.clientY);
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        handleResizeMove(e.touches[0].clientY);
      }
    };

    const handleResizeEnd = () => {
      setIsResizing(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleResizeEnd);
    document.addEventListener('touchmove', handleTouchMove);
    document.addEventListener('touchend', handleResizeEnd);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleResizeEnd);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleResizeEnd);
    };
  }, [isResizing]);

  if (!isOpen) return null;

  const handleTextSelection = () => {
    const selection = window.getSelection();
    if (selection && selection.toString().trim()) {
      const selectedText = getSelectedTextWithMath(selection);
      setHighlightedText(selectedText);
      setAskAiInput(`"${selectedText}" - `);
    }
  };

  const handleAskAi = async () => {
    logger.debug('=== handleAskAi called ===');
    logger.debug('askAiInput:', askAiInput);
    logger.debug('isLoading:', isLoading);

    if (!askAiInput.trim() || isLoading) {
      logger.debug('Early return - input empty or already loading');
      return;
    }

    const userMessage = askAiInput.trim();
    logger.debug('User message:', userMessage);
    logger.debug('Title:', title);
    logger.debug('Content length:', content?.length);
    logger.debug('Highlighted text:', highlightedText);

    // Add user message to UI and save to database
    setChatMessages(prev => [...prev, { role: "user", content: userMessage }]);
    await saveChatMessage("user", userMessage);
    setAskAiInput("");
    setIsLoading(true);

    try {
      logger.debug('Calling supabase.functions.invoke...');
      const requestBody = {
        question: userMessage,
        contentTitle: title,
        contentText: content,
        highlightedText: highlightedText || undefined,
      };
      logger.debug('Request body:', JSON.stringify(requestBody, null, 2));

      const { data, error } = await supabase.functions.invoke('content-chat', {
        body: requestBody,
      });

      logger.debug('Response received - data:', data);
      logger.debug('Response received - error:', error);

      if (error) {
        console.error('Supabase function error:', error);
        throw error;
      }

      if (data?.answer) {
        logger.debug('Got answer from AI:', data.answer);
        // Add AI response to UI and save to database
        setChatMessages(prev => [...prev, { role: "assistant", content: data.answer }]);
        await saveChatMessage("assistant", data.answer);
      } else {
        console.error('No answer in response data:', data);
      }

      setHighlightedText("");
    } catch (error) {
      console.error('=== Error in handleAskAi ===');
      console.error('Error type:', typeof error);
      console.error('Error object:', error);
      console.error('Error message:', error instanceof Error ? error.message : 'Unknown');
      console.error('Error stack:', error instanceof Error ? error.stack : 'No stack');
      toast({
        title: "Error",
        description: "Failed to get AI response. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      logger.debug('=== handleAskAi complete ===');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleAskAi();
    }
  };

  // Insert markdown at cursor position in textarea
  const insertMarkdownAtCursor = (markdown: string) => {
    if (!textareaRef.current) return;

    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const before = content.substring(0, start);
    const after = content.substring(end);

    const newContent = before + markdown + after;

    if (newContent.length <= MAX_CONTENT_LENGTH) {
      setContent(newContent);

      // Set cursor after inserted markdown
      setTimeout(() => {
        if (textarea) {
          const newPosition = start + markdown.length;
          textarea.selectionStart = newPosition;
          textarea.selectionEnd = newPosition;
          textarea.focus();
        }
      }, 0);
    } else {
      toast({
        title: "Content too long",
        description: "Adding this image would exceed the maximum content length.",
        variant: "destructive",
      });
    }
  };

  // Upload image to Supabase Storage
  const uploadImage = async (file: File): Promise<string | null> => {
    if (!user || !bubble) {
      toast({
        title: "Error",
        description: "User not authenticated or bubble not found",
        variant: "destructive",
      });
      return null;
    }

    // Validate file size (5MB limit)
    if (file.size > 5242880) {
      toast({
        title: "Image too large",
        description: "Please use an image smaller than 5MB",
        variant: "destructive",
      });
      return null;
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: "Invalid file type",
        description: "Please use JPG, PNG, GIF, or WebP images",
        variant: "destructive",
      });
      return null;
    }

    const uploadId = `upload-${Date.now()}`;
    setUploadingImages(prev => new Set(prev).add(uploadId));

    try {
      // Create unique filename
      const timestamp = Date.now();
      const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const filePath = `${user.id}/${bubble.id}/${timestamp}-${sanitizedName}`;

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('content-images')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (error) throw error;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('content-images')
        .getPublicUrl(data.path);

      return publicUrl;
    } catch (error) {
      console.error('Error uploading image:', error);
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Failed to upload image",
        variant: "destructive",
      });
      return null;
    } finally {
      setUploadingImages(prev => {
        const next = new Set(prev);
        next.delete(uploadId);
        return next;
      });
    }
  };

  // Handle file upload from button
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    logger.debug('[File Upload] Selected:', file.name, file.type, file.size);

    toast({
      title: "Uploading image...",
      description: "Please wait while your image is being uploaded",
    });

    // Insert placeholder while uploading
    const placeholder = `\n![Uploading image...](uploading)\n`;
    insertMarkdownAtCursor(placeholder);

    // Upload image
    const imageUrl = await uploadImage(file);

    if (imageUrl) {
      logger.debug('[File Upload] Upload successful:', imageUrl);
      // Replace placeholder with actual image URL
      setContent(prev => prev.replace(placeholder, `\n![Image](${imageUrl})\n`));

      toast({
        title: "Image uploaded successfully!",
        description: "Your image has been added to the content",
      });
    } else {
      logger.debug('[File Upload] Upload failed');
      // Remove placeholder if upload failed
      setContent(prev => prev.replace(placeholder, ''));
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Handle paste event (for pasting images)
  const handlePaste = async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    logger.debug('[Paste Event] Triggered');
    const items = e.clipboardData?.items;

    if (!items) {
      logger.debug('[Paste Event] No clipboard items found');
      return;
    }

    logger.debug('[Paste Event] Number of clipboard items:', items.length);

    let hasImage = false;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      logger.debug(`[Paste Event] Item ${i}: type="${item.type}", kind="${item.kind}"`);

      if (item.type.indexOf('image') !== -1) {
        hasImage = true;
        e.preventDefault(); // Prevent default paste behavior for images

        logger.debug('[Paste Event] Image detected! Getting file...');
        const file = item.getAsFile();

        if (file) {
          logger.debug('[Paste Event] File obtained:', {
            name: file.name,
            type: file.type,
            size: file.size
          });

          toast({
            title: "Uploading image...",
            description: "Please wait while your image is being uploaded",
          });

          // Insert placeholder while uploading
          const placeholder = `\n![Uploading image...](uploading)\n`;
          insertMarkdownAtCursor(placeholder);

          // Upload image
          const imageUrl = await uploadImage(file);

          if (imageUrl) {
            logger.debug('[Paste Event] Upload successful:', imageUrl);
            // Replace placeholder with actual image URL
            setContent(prev => prev.replace(placeholder, `\n![Image](${imageUrl})\n`));

            toast({
              title: "Image uploaded successfully!",
              description: "Your image has been added to the content",
            });
          } else {
            logger.debug('[Paste Event] Upload failed');
            // Remove placeholder if upload failed
            setContent(prev => prev.replace(placeholder, ''));
          }
        } else {
          logger.debug('[Paste Event] Failed to get file from clipboard item');
          toast({
            title: "Paste failed",
            description: "Could not read image from clipboard",
            variant: "destructive",
          });
        }
      }
    }

    if (!hasImage) {
      logger.debug('[Paste Event] No image found in clipboard, allowing default paste');
    }
  };

  const handleSave = () => {
    onSave(title, content);
    onClose();
  };

  const handleResizeStart = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    setIsResizing(true);

    if ('touches' in e) {
      // Touch event
      resizeStartY.current = e.touches[0].clientY;
    } else {
      // Mouse event
      resizeStartY.current = e.clientY;
    }

    resizeStartHeight.current = contentHeight;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm animate-fade-in p-4" onClick={onClose}>
      <div className="relative bg-card rounded-2xl shadow-xl border border-border w-full max-w-3xl animate-scale-in h-[85vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <div className="flex items-center gap-3">
            <BubbleNode type="content" size="sm" />
            <span className="font-bold text-lg">Content Bubble</span>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 overflow-y-auto flex-1">
          {/* Title */}
          <div>
            <label className="text-sm font-medium text-muted-foreground mb-2 block">
              Title
            </label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Content title..."
              className="text-lg font-semibold"
            />
          </div>

          {/* Content (editable with toggle) */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-muted-foreground">
                Content
                {!isEditingContent && (
                  <span className="text-xs ml-2 text-muted-foreground/70">
                    (Highlight text to ask about it)
                  </span>
                )}
              </label>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => setIsEditingContent(!isEditingContent)}
                title={isEditingContent ? "Done editing" : "Edit content"}
              >
                {isEditingContent ? (
                  <Check className="w-4 h-4 text-primary" />
                ) : (
                  <Pencil className="w-4 h-4" />
                )}
              </Button>
            </div>

            {isEditingContent ? (
              <div>
                <div className="relative">
                  <Textarea
                    ref={textareaRef}
                    value={content}
                    onChange={(e) => {
                      const newContent = e.target.value;
                      if (newContent.length <= MAX_CONTENT_LENGTH) {
                        setContent(newContent);
                      }
                    }}
                    onPaste={handlePaste}
                    placeholder="Enter your content here... (Markdown supported)"
                    className="text-sm leading-relaxed resize-none"
                    style={{ height: `${contentHeight}px` }}
                    rows={8}
                  />
                  {uploadingImages.size > 0 && (
                    <div className="absolute top-2 right-2 flex items-center gap-2 bg-background/80 px-2 py-1 rounded-md border border-border">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      <span className="text-xs text-muted-foreground">Uploading image...</span>
                    </div>
                  )}
                </div>
                {/* Resize Handle */}
                <div
                  onMouseDown={handleResizeStart}
                  onTouchStart={handleResizeStart}
                  className={`h-3 md:h-2 cursor-ns-resize border-t-2 md:border-t border-border hover:bg-primary/20 active:bg-primary/30 transition-colors ${isResizing ? 'bg-primary/30' : ''}`}
                  title="Drag to resize"
                />
                <div className="flex justify-between items-center mt-1">
                  <div className="flex items-center gap-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      className="h-7 text-xs"
                    >
                      <ImageIcon className="w-3 h-3 mr-1" />
                      Upload Image
                    </Button>
                    <span className="text-xs text-muted-foreground">
                      or paste with Cmd+Ctrl+Shift+4
                    </span>
                  </div>
                  <span className={`text-xs ${content.length >= MAX_CONTENT_LENGTH ? 'text-destructive' : 'text-muted-foreground'}`}>
                    {content.length}/{MAX_CONTENT_LENGTH}
                  </span>
                </div>
              </div>
            ) : (
              <div>
                <div
                  ref={contentRef}
                  onMouseUp={handleTextSelection}
                  className="p-4 rounded-md border border-border bg-muted/30 overflow-y-auto select-text cursor-text"
                  style={{ height: `${contentHeight}px` }}
                >
                  {content ? (
                    <div className="prose prose-base md:prose-sm max-w-none dark:prose-invert prose-headings:mt-2 prose-headings:mb-2 prose-p:my-2 prose-pre:my-2 prose-ul:my-2 prose-ol:my-2">
                      <ReactMarkdown
                      remarkPlugins={[remarkGfm, remarkMath]}
                      rehypePlugins={[rehypeKatex]}
                      components={{
                        img: ({ node, ...props }) => (
                          <img
                            {...props}
                            className="max-w-full h-auto rounded-md my-3 border border-border shadow-sm"
                            loading="lazy"
                            alt={props.alt || 'Image'}
                          />
                        ),
                        a: ({ node, ...props }) => (
                          <a
                            {...props}
                            className="text-primary hover:underline"
                            target="_blank"
                            rel="noopener noreferrer"
                          />
                        ),
                        h1: ({ node, ...props }) => (
                          <h1 {...props} className="text-2xl md:text-xl font-bold mt-3 mb-2" />
                        ),
                        h2: ({ node, ...props }) => (
                          <h2 {...props} className="text-xl md:text-lg font-bold mt-3 mb-2" />
                        ),
                        h3: ({ node, ...props }) => (
                          <h3 {...props} className="text-lg md:text-base font-bold mt-2 mb-1" />
                        ),
                        p: ({ node, ...props }) => (
                          <p {...props} className="my-2 leading-relaxed text-base md:text-sm" />
                        ),
                        ul: ({ node, ...props }) => (
                          <ul {...props} className="my-2 ml-4 list-disc space-y-1" />
                        ),
                        ol: ({ node, ...props }) => (
                          <ol {...props} className="my-2 ml-4 list-decimal space-y-1" />
                        ),
                        li: ({ node, ...props }) => (
                          <li {...props} className="leading-relaxed" />
                        ),
                        code: ({ children, ...props }) => {
                          const isInline = typeof children === 'string' && !children.includes('\n');
                          return isInline ? (
                            <code {...props} className="bg-muted text-foreground px-1 py-0.5 rounded text-sm font-mono">
                              {children}
                            </code>
                          ) : (
                            <code {...props} className="block bg-muted text-foreground p-2 rounded my-2 text-sm font-mono overflow-x-auto">
                              {children}
                            </code>
                          );
                        },
                        blockquote: ({ node, ...props }) => (
                          <blockquote {...props} className="border-l-4 border-primary pl-4 my-2 italic text-muted-foreground" />
                        ),
                        strong: ({ node, ...props }) => (
                          <strong {...props} className="font-bold" />
                        ),
                        em: ({ node, ...props }) => (
                          <em {...props} className="italic" />
                        ),
                      }}
                    >
                      {normalizeMath(content)}
                    </ReactMarkdown>
                  </div>
                ) : (
                  <span className="text-muted-foreground italic">No content provided.</span>
                )}
              </div>
              {/* Resize Handle */}
              <div
                onMouseDown={handleResizeStart}
                onTouchStart={handleResizeStart}
                className={`h-3 md:h-2 cursor-ns-resize border-t-2 md:border-t border-border hover:bg-primary/20 active:bg-primary/30 transition-colors ${isResizing ? 'bg-primary/30' : ''}`}
                title="Drag to resize"
              />
            </div>
            )}
          </div>

          {/* Ask AI Section */}
          <div className="space-y-3 flex-1 flex flex-col min-h-0">
            <label className="text-sm font-medium text-muted-foreground block">
              Ask AI
              {highlightedText && (
                <span className="text-xs ml-2 text-primary">
                  (Selected: "{highlightedText.slice(0, 30)}...")
                </span>
              )}
            </label>

            {/* Chat Messages Display */}
            {(chatMessages.length > 0 || loadingHistory) && (
              <div
                ref={chatContainerRef}
                className="flex-1 overflow-y-auto space-y-3 p-3 border border-border rounded-md bg-muted/20 min-h-[120px] max-h-[200px]"
              >
                {loadingHistory ? (
                  <div className="flex justify-center items-center h-full">
                    <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  chatMessages.map((msg, idx) => (
                    <div
                      key={idx}
                      className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                          msg.role === 'user'
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted border border-border'
                        }`}
                      >
                        {msg.role === 'assistant' ? <MathText className="[&_p]:my-1">{msg.content}</MathText> : msg.content}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Input */}
            <div className="flex gap-2 shrink-0 mt-2">
              <Input
                value={askAiInput}
                onChange={(e) => setAskAiInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about this content..."
                className="text-sm flex-1 h-12"
                disabled={isLoading}
              />
              <Button
                size="icon"
                className="h-12 w-12"
                onClick={handleAskAi}
                disabled={!askAiInput.trim() || isLoading}
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-border shrink-0">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save</Button>
        </div>
      </div>
    </div>
  );
};

export default ContentBubbleModal;
