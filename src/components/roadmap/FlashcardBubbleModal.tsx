import { useState, useEffect, useRef } from "react";
import { X, ChevronLeft, ChevronRight, Plus, Trash2, Sparkles, Loader2, Send, WalletCards } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import BubbleNode from "./BubbleNode";
import { FlashcardEntry } from "@/types/learning";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useGenerationManager } from "@/hooks/useGenerationManager";
import { generateUUID } from "@/lib/uuid";

interface FlashcardBubbleModalProps {
  isOpen: boolean;
  onClose: () => void;
  flashcards: FlashcardEntry[];
  bubbleId: string;
  contentBubbleId: string;
  onSave: (flashcards: FlashcardEntry[], shouldSummarize?: boolean, bubbleIdFromBackground?: string) => void;
  categories: string[];
  contentContext?: string;
}

const FlashcardBubbleModal = ({
  isOpen,
  onClose,
  flashcards: initialFlashcards,
  bubbleId,
  contentBubbleId,
  onSave,
  categories,
  contentContext = "",
}: FlashcardBubbleModalProps) => {
  const [flashcards, setFlashcards] = useState<FlashcardEntry[]>(initialFlashcards);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [aiPrompt, setAiPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [hasNewAIContent, setHasNewAIContent] = useState(false);
  const { toast } = useToast();
  const { generateFlashcard, isGenerating: isBackgroundGenerating } = useGenerationManager();

  // Track the bubble ID to detect when we're opening a different bubble
  const lastBubbleIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      // Reset ref when modal closes
      lastBubbleIdRef.current = null;
      return;
    }

    // Only reset state when opening a different bubble or opening for the first time
    const isDifferentBubble = lastBubbleIdRef.current !== bubbleId;

    if (!isDifferentBubble) {
      // Same bubble still open - don't reset anything to preserve user input
      return;
    }

    // Different bubble or first open - reset everything
    lastBubbleIdRef.current = bubbleId;

    if (initialFlashcards.length > 0) {
      setFlashcards(initialFlashcards);
      setCurrentIndex(0);
      setAiPrompt("");
      setHasNewAIContent(false);
    } else {
      setFlashcards([
        {
          id: generateUUID(),
          front: "",
          back: "",
          category: categories[0] || "General",
        },
      ]);
      setCurrentIndex(0);
      setAiPrompt("");
      setHasNewAIContent(false);
    }
  }, [isOpen, bubbleId, initialFlashcards, categories]);

  // ESC key to close modal
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose(); // ESC should close immediately without background generation
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const safeCard: FlashcardEntry =
    flashcards[currentIndex] || {
      id: generateUUID(),
      front: "",
      back: "",
      category: categories[0] || "General",
    };

  const handleGenerateFlashcard = async () => {
    if (!aiPrompt.trim() || isGenerating) {
      return;
    }

    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-flashcard', {
        body: {
          userPrompt: aiPrompt.trim(),
          contentContext,
        },
      });

      if (error) {
        console.error('Failed to generate flashcard:', error);
        throw error;
      }

      if (data?.front && data?.back) {
        const updatedFlashcards = [...flashcards];
        updatedFlashcards[currentIndex] = {
          ...updatedFlashcards[currentIndex],
          front: data.front,
          back: data.back,
        };

        setFlashcards(updatedFlashcards);
        setAiPrompt("");
        setHasNewAIContent(true); // Mark that AI generated new content

        toast({
          title: "Flashcard generated!",
          description: "Review and edit the flashcard, then save.",
        });
      } else {
        console.error('Invalid flashcard data:', data);
      }
    } catch (error) {
      console.error('Error generating flashcard:', error);
      toast({
        title: "Generation failed",
        description: "Failed to generate flashcard. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleGenerateFlashcard();
    }
  };

  const handleAddNew = () => {
    const newCard: FlashcardEntry = {
      id: generateUUID(),
      front: "",
      back: "",
      category: categories[0] || "General",
    };
    setFlashcards([...flashcards, newCard]);
    setCurrentIndex(flashcards.length);
  };

  const handleDelete = () => {
    if (flashcards.length <= 1) {
      setFlashcards([]);
      return;
    }
    const newFlashcards = flashcards.filter((_, i) => i !== currentIndex);
    setFlashcards(newFlashcards);
    setCurrentIndex(Math.min(currentIndex, newFlashcards.length - 1));
  };

  const updateCurrentCard = (field: keyof FlashcardEntry, value: string) => {
    setFlashcards((prev) => {
      if (prev.length === 0) {
        return [
          {
            id: generateUUID(),
            front: field === "front" ? value : "",
            back: field === "back" ? value : "",
            category: categories[0] || "General",
          },
        ];
      }
      return prev.map((card, i) =>
        i === currentIndex ? { ...card, [field]: value } : card
      );
    });
  };

  const handleSave = () => {
    onSave(flashcards.filter(f => f.front.trim() || f.back.trim()), hasNewAIContent);
    onClose();
  };

  const handleClose = () => {
    // If generating, continue in background and save when done
    if (isGenerating && aiPrompt.trim() && contentContext) {
      generateFlashcard({
        bubbleId,
        contentBubbleId,
        userPrompt: aiPrompt.trim(),
        contentContext,
        onComplete: (flashcard) => {
          if (flashcard) {
            const allFlashcards = [...flashcards.filter(f => f.front.trim() || f.back.trim()), flashcard];
            // Pass bubbleId as 3rd parameter to prevent closing other modals
            onSave(allFlashcards, true, bubbleId);
          }
        }
      });
      toast({
        title: "Generating in background",
        description: "Flashcard will be saved when ready.",
      });
    } else {
      // Normal save - pass hasNewAIContent flag (no bubbleId = will close modal)
      const validFlashcards = flashcards.filter(f => f.front.trim() || f.back.trim());
      if (validFlashcards.length > 0) {
        onSave(validFlashcards, hasNewAIContent);
      }
    }
    onClose();
  };

  const goToPrev = () => {
    setCurrentIndex((prev) => Math.max(0, prev - 1));
  };

  const goToNext = () => {
    setCurrentIndex((prev) => Math.min(flashcards.length - 1, prev + 1));
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/20 backdrop-blur-sm animate-fade-in"
      onClick={handleClose}
    >
      <div
        className="relative bg-card rounded-2xl shadow-soft border-2 border-border w-full max-w-lg mx-4 animate-scale-in"
        onClick={(e) => {
          // Prevent clicks inside modal from propagating to overlay
          e.stopPropagation();
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div className="flex items-center gap-3">
            <WalletCards className="w-6 h-6 text-bubble-flashcard" />
            <span className="font-bold text-lg">Flashcard</span>
          </div>
          <div className="flex items-center gap-2">
            {flashcards.length > 0 && (
              <Button
                variant="ghost"
                size="icon"
                onClick={handleDelete}
                className="text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
            <Button variant="ghost" size="icon" onClick={handleClose}>
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* AI Generation Input */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              Generate with AI
            </label>
            <div className="flex gap-2">
              <Input
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="What do you want to learn? e.g. 'key benefits of stretching'"
                className="flex-1"
                disabled={isGenerating}
              />
              <Button
                size="icon"
                onClick={handleGenerateFlashcard}
                disabled={!aiPrompt.trim() || isGenerating}
              >
                {isGenerating ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">or edit manually</span>
            </div>
          </div>

          <>
            {/* Category selector */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Category:</span>
              <select
                value={safeCard.category || ""}
                onChange={(e) => updateCurrentCard("category", e.target.value)}
                className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
                <option value="__new__">+ New category...</option>
              </select>
            </div>

            {safeCard.category === "__new__" && (
              <Input
                placeholder="Enter new category name"
                onBlur={(e) => {
                  if (e.target.value.trim()) {
                    updateCurrentCard("category", e.target.value.trim());
                  } else {
                    updateCurrentCard("category", categories[0] || "General");
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    const input = e.target as HTMLInputElement;
                    if (input.value.trim()) {
                      updateCurrentCard("category", input.value.trim());
                    }
                  }
                }}
                autoFocus
              />
            )}

            {/* Front */}
            <div className="bg-accent/50 rounded-xl p-4">
              <label className="text-xs text-muted-foreground uppercase tracking-wide mb-2 block">
                Front (Question)
              </label>
              <Textarea
                placeholder="What's on the front of your flashcard?"
                value={safeCard.front}
                onChange={(e) => updateCurrentCard("front", e.target.value)}
                className="bg-transparent border-none px-2 py-1 min-h-[60px] resize-none focus-visible:ring-0"
              />
            </div>

            {/* Back */}
            <div className="bg-bubble-flashcard/20 rounded-xl p-4 border border-bubble-flashcard/30">
              <label className="text-xs text-muted-foreground uppercase tracking-wide mb-2 block">
                Back (Answer)
              </label>
              <Textarea
                placeholder="What's on the back of your flashcard?"
                value={safeCard.back}
                onChange={(e) => updateCurrentCard("back", e.target.value)}
                className="bg-transparent border-none px-2 py-1 min-h-[80px] resize-none focus-visible:ring-0"
              />
            </div>

            {/* Navigation */}
            <div className="flex items-center justify-between pt-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={goToPrev}
                disabled={currentIndex === 0}
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                prev
              </Button>
              <span className="text-sm text-muted-foreground">
                {currentIndex + 1} / {flashcards.length || 1}
              </span>
              <div className="flex gap-2">
                {currentIndex === flashcards.length - 1 ? (
                  <Button variant="ghost" size="sm" onClick={handleAddNew}>
                    <Plus className="w-4 h-4 mr-1" />
                    new
                  </Button>
                ) : (
                  <Button variant="ghost" size="sm" onClick={goToNext}>
                    next
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                )}
              </div>
            </div>
          </>
        </div>

        {/* Footer */}
        <div className="flex justify-center py-6 border-t">
          <Button
            variant="outline"
            onClick={handleSave}
            className="text-primary border-primary hover:bg-primary/10 font-handwritten text-xl px-6"
          >
            save flashcards
          </Button>
        </div>
      </div>
    </div>
  );
};

export default FlashcardBubbleModal;
