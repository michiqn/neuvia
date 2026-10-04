import { MathText } from "@/components/MathText";
import { useState, useEffect } from "react";
import { X, Loader2, Brain, Layers, MessageSquare, Sparkles, RefreshCw, Sigma } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SummaryData, GeneratedBubbleSummary } from "@/types/learning";

interface SummaryBubbleModalProps {
  isOpen: boolean;
  summary?: SummaryData;
  contentBubbleId?: string;
  onClose: () => void;
  onSave: (summary: SummaryData) => void;
  onGenerateSummary?: (contentBubbleId: string) => Promise<GeneratedBubbleSummary | null>;
}

const SummaryBubbleModal = ({
  isOpen,
  summary,
  contentBubbleId,
  onClose,
  onSave,
  onGenerateSummary
}: SummaryBubbleModalProps) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedSummary, setGeneratedSummary] = useState<GeneratedBubbleSummary | null>(null);
  const [hasGenerated, setHasGenerated] = useState(false);

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

  // Parse existing summary from database if available
  const existingSummary: GeneratedBubbleSummary | null = (() => {
    if (!summary?.content) return null;
    try {
      const parsed = JSON.parse(summary.content);
      // Check if it's a structured summary (has overallSummary field)
      if (parsed.overallSummary) {
        return {
          title: summary.title || "Summary",
          quizSummary: parsed.quizSummary || null,
          flashcardSummary: parsed.flashcardSummary || null,
          iowSummary: parsed.iowSummary || null,
          overallSummary: parsed.overallSummary,
        };
      }
      return null;
    } catch {
      return null;
    }
  })();

  // Determine what to display: generated > existing > null
  const displaySummary = generatedSummary || existingSummary;

  useEffect(() => {
    // Only auto-generate if modal opens, no existing summary, and hasn't generated yet
    if (isOpen && contentBubbleId && onGenerateSummary && !hasGenerated && !existingSummary) {
      generateSummary();
    }
  }, [isOpen, contentBubbleId, existingSummary]);

  useEffect(() => {
    if (!isOpen) {
      // Reset state when modal closes
      setHasGenerated(false);
      setGeneratedSummary(null);
    }
  }, [isOpen]);

  const generateSummary = async () => {
    if (!contentBubbleId || !onGenerateSummary) return;

    setIsGenerating(true);
    try {
      const result = await onGenerateSummary(contentBubbleId);
      setGeneratedSummary(result);
      setHasGenerated(true);
      // Note: The edge function already saves the summary to the database
      // No need to call onSave here - it would cause RLS issues
    } catch (error) {
      console.error("Error generating summary:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRegenerate = () => {
    setHasGenerated(false);
    generateSummary();
  };

  if (!isOpen) return null;

  const SummarySection = ({
    icon: Icon,
    title,
    content,
    colorClass
  }: {
    icon: React.ElementType;
    title: string;
    content: string | null;
    colorClass: string;
  }) => {
    if (!content) return null;

    return (
      <div className={`rounded-xl p-4 ${colorClass}`}>
        <div className="flex items-center gap-2 mb-2">
          <Icon className="w-5 h-5" />
          <h4 className="font-semibold">{title}</h4>
        </div>
        <p className="text-sm leading-relaxed"><MathText inline>{content}</MathText></p>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-card w-full max-w-lg rounded-2xl border-2 border-border shadow-soft animate-fade-in" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Sigma className="w-6 h-6 text-bubble-summary" />
            <h3 className="font-semibold text-lg">Learning Summary</h3>
          </div>
          <div className="flex items-center gap-2">
            {hasGenerated && !isGenerating && (
              <Button variant="ghost" size="icon" onClick={handleRegenerate} title="Regenerate">
                <RefreshCw className="w-4 h-4" />
              </Button>
            )}
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[70vh] overflow-y-auto space-y-4">
          {isGenerating ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-muted-foreground">Generating your learning summary...</p>
              <p className="text-sm text-muted-foreground/70">This may take a few seconds</p>
            </div>
          ) : displaySummary ? (
            <div className="space-y-4">
              {/* Quiz Summary */}
              <SummarySection
                icon={Brain}
                title="Quizzes"
                content={displaySummary.quizSummary}
                colorClass="bg-bubble-quiz/20 border border-bubble-quiz/30"
              />

              {/* Flashcard Summary */}
              <SummarySection
                icon={Layers}
                title="Flashcards"
                content={displaySummary.flashcardSummary}
                colorClass="bg-bubble-flashcard/20 border border-bubble-flashcard/30"
              />

              {/* IOW Summary */}
              <SummarySection
                icon={MessageSquare}
                title="In Your Own Words"
                content={displaySummary.iowSummary}
                colorClass="bg-bubble-iow/20 border border-bubble-iow/30"
              />

              {/* Overall Summary */}
              <div className="rounded-xl p-4 bg-primary/10 border border-primary/20">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="w-5 h-5 text-primary" />
                  <h4 className="font-semibold">Overall Summary</h4>
                </div>
                <p className="text-sm leading-relaxed"><MathText inline>{displaySummary.overallSummary}</MathText></p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <Sparkles className="w-12 h-12 text-muted-foreground/50" />
              <p className="text-muted-foreground text-center">
                No summary available yet.<br />
                Complete some interactions first!
              </p>
              {contentBubbleId && onGenerateSummary && (
                <Button onClick={generateSummary} variant="outline">
                  <Sparkles className="w-4 h-4 mr-2" />
                  Generate Summary
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end p-4 border-t border-border">
          <Button onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SummaryBubbleModal;
