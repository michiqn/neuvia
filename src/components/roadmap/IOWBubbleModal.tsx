import { MathText } from "@/components/MathText";
import { useState, useEffect, useRef } from "react";
import { X, ChevronLeft, ChevronRight, Plus, Send, RefreshCw, Loader2, PenLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { IOWEntry } from "@/types/learning";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { logger } from "@/lib/logger";
import { useGenerationManager } from "@/hooks/useGenerationManager";
import { generateUUID } from "@/lib/uuid";

interface IOWBubbleModalProps {
  isOpen: boolean;
  entries: IOWEntry[];
  bubbleId: string;
  contentBubbleId: string;
  onClose: () => void;
  onSave: (entries: IOWEntry[], shouldSummarize?: boolean, bubbleIdFromBackground?: string) => void;
  contentContext?: string;
}

interface EvaluationResult {
  isCorrect: boolean;
  feedback: string;
  suggestions?: string;
}

const IOWBubbleModal = ({ isOpen, entries, bubbleId, contentBubbleId, onClose, onSave, contentContext }: IOWBubbleModalProps) => {
  const [currentEntries, setCurrentEntries] = useState<IOWEntry[]>(
    entries.length > 0 ? entries : [createEmptyEntry()]
  );
  const [currentIndex, setCurrentIndex] = useState(0);
  const [evaluationResult, setEvaluationResult] = useState<EvaluationResult | null>(null);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [isGeneratingQuestion, setIsGeneratingQuestion] = useState(false);
  const [hasNewAIContent, setHasNewAIContent] = useState(false);
  const { toast } = useToast();
  const { generateIOWQuestion, isGenerating: isBackgroundGenerating } = useGenerationManager();

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
      // Same bubble still open - don't reset anything to preserve user state
      return;
    }

    // Different bubble or first open - reset everything
    lastBubbleIdRef.current = bubbleId;

    setCurrentEntries(entries.length > 0 ? entries : [createEmptyEntry()]);
    setCurrentIndex(0);
    setEvaluationResult(null);
    setHasNewAIContent(false);

    // If no entries exist and not already generating in background, generate the first question
    if (entries.length === 0 && contentContext && !isBackgroundGenerating(bubbleId)) {
      generateFirstQuestion();
    }
  }, [isOpen, bubbleId, entries, contentContext, isBackgroundGenerating]);

  // ESC key to close modal
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen]);

  const generateFirstQuestion = async () => {
    if (!contentContext) {
      setCurrentEntries([createEmptyEntry()]);
      return;
    }

    setIsGeneratingQuestion(true);
    try {
      const requestBody = { contentContext };

      logger.ai('IOW Generate Question', {
        request: requestBody,
      });

      const { data, error } = await supabase.functions.invoke('iow-generate-questions', {
        body: requestBody,
      });

      logger.ai('IOW Generate Question', {
        response: data,
        error: error,
      });

      if (error) {
        logger.error('Failed to generate IOW question:', error);
        toast({
          title: "Warning",
          description: "Could not auto-generate question. You can add one manually.",
          variant: "default",
        });
        setCurrentEntries([createEmptyEntry()]);
      } else if (data?.question) {
        const newEntry: IOWEntry = {
          id: generateUUID(),
          question: data.question,
          answer: "",
        };
        setCurrentEntries([newEntry]);
        setHasNewAIContent(true); // Mark that AI generated new content
      }
    } catch (error) {
      logger.error('Error generating IOW question:', error);
      toast({
        title: "Error",
        description: "Failed to generate question. Try again.",
        variant: "destructive",
      });
      setCurrentEntries([createEmptyEntry()]);
    } finally {
      setIsGeneratingQuestion(false);
    }
  };

  function createEmptyEntry(): IOWEntry {
    return {
      id: generateUUID(),
      question: "",
      answer: "",
    };
  }

  const currentEntry = currentEntries[currentIndex];

  const updateEntry = (field: keyof IOWEntry, value: string) => {
    setCurrentEntries(prev =>
      prev.map((e, i) => i === currentIndex ? { ...e, [field]: value } : e)
    );
  };

  const addNewEntry = async () => {
    // Generate a new question automatically
    if (contentContext) {
      setIsGeneratingQuestion(true);
      try {
        const { data, error } = await supabase.functions.invoke('iow-generate-questions', {
          body: {
            contentContext,
          },
        });

        if (error) {
          console.error('Failed to generate IOW question:', error);
          toast({
            title: "Warning",
            description: "Could not auto-generate question. You can add one manually.",
            variant: "default",
          });
          setCurrentEntries(prev => [...prev, createEmptyEntry()]);
        } else if (data?.question) {
          const newEntry: IOWEntry = {
            id: generateUUID(),
            question: data.question,
            answer: "",
          };
          setCurrentEntries(prev => [...prev, newEntry]);
          setHasNewAIContent(true); // Mark that AI generated new content
        }
      } catch (error) {
        console.error('Error generating IOW question:', error);
        toast({
          title: "Error",
          description: "Failed to generate question. Try again.",
          variant: "destructive",
        });
        setCurrentEntries(prev => [...prev, createEmptyEntry()]);
      } finally {
        setIsGeneratingQuestion(false);
      }
    } else {
      setCurrentEntries(prev => [...prev, createEmptyEntry()]);
    }

    setCurrentIndex(currentEntries.length);
    setEvaluationResult(null);
  };

  const goToNextEntry = () => {
    if (currentIndex < currentEntries.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setEvaluationResult(null);
    }
  };

  const goToPrevEntry = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setEvaluationResult(null);
    }
  };

  const handleSave = () => {
    // Filter out empty entries
    const validEntries = currentEntries.filter(
      e => e.question.trim() || e.answer.trim()
    );
    onSave(validEntries, hasNewAIContent);
    onClose();
  };

  const handleClose = () => {
    // If generating, continue in background and save when done
    if (isGeneratingQuestion && contentContext) {
      generateIOWQuestion({
        bubbleId,
        contentBubbleId,
        contentContext,
        existingQuestions: currentEntries.map(e => e.question),
        onComplete: (entry) => {
          if (entry) {
            const allEntries = [...currentEntries.filter(e => e.question.trim()), entry];
            // Pass bubbleId as 3rd parameter to prevent closing other modals
            onSave(allEntries, true, bubbleId);
          }
        }
      });
      toast({
        title: "Generating in background",
        description: "Question will be saved when ready.",
      });
    } else {
      // Normal save - pass hasNewAIContent flag (no bubbleId = will close modal)
      const validEntries = currentEntries.filter(
        e => e.question.trim() || e.answer.trim()
      );
      if (validEntries.length > 0) {
        onSave(validEntries, hasNewAIContent);
      }
    }
    onClose();
  };

  const evaluateAnswer = async () => {
    const currentEntry = currentEntries[currentIndex];

    if (!currentEntry.answer.trim()) {
      toast({
        title: "Answer Required",
        description: "Please provide an answer before submitting.",
        variant: "destructive",
      });
      return;
    }

    if (!contentContext) {
      toast({
        title: "Missing Context",
        description: "Content context is required for evaluation.",
        variant: "destructive",
      });
      return;
    }

    setIsEvaluating(true);
    setEvaluationResult(null);

    try {
      const requestBody = {
        question: currentEntry.question,
        userAnswer: currentEntry.answer,
        contentContext,
      };

      logger.ai('IOW Evaluate Answer', {
        request: requestBody,
      });

      const { data, error } = await supabase.functions.invoke('iow-evaluate-answer', {
        body: requestBody,
      });

      logger.ai('IOW Evaluate Answer', {
        response: data,
        error: error,
      });

      if (error) {
        logger.error('Failed to evaluate answer:', error);
        throw error;
      }

      if (data) {
        setEvaluationResult({
          isCorrect: data.isCorrect,
          feedback: data.feedback,
          suggestions: data.suggestions,
        });

        if (data.isCorrect) {
          toast({
            title: "Great job!",
            description: "Your answer demonstrates good understanding.",
          });
        } else {
          toast({
            title: "Keep trying!",
            description: "Review the feedback and try again.",
            variant: "default",
          });
        }
      }
    } catch (error) {
      logger.error('Error evaluating answer:', error);
      toast({
        title: "Evaluation Failed",
        description: "Failed to evaluate your answer. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsEvaluating(false);
    }
  };

  const handleRetry = () => {
    setEvaluationResult(null);
    // Clear the answer to let user try again
    updateEntry("answer", "");
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={handleClose}
    >
      <div
        className="bg-card w-full max-w-lg rounded-2xl border-2 border-border shadow-soft animate-fade-in"
        onClick={(e) => {
          // Prevent clicks inside modal from propagating to overlay
          e.stopPropagation();
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <PenLine className="w-6 h-6 text-bubble-iow" />
            <h3 className="font-semibold text-lg">In Your Own Words</h3>
          </div>
          <Button variant="ghost" size="icon" onClick={handleClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[70vh] overflow-y-auto space-y-4">
          {/* Entry counter */}
          <p className="text-sm text-primary italic">
            {currentIndex + 1}/{currentEntries.length} Questions
          </p>

          {/* Question area - Read Only */}
          <div className="bg-bubble-iow/30 rounded-xl p-4">
            {isGeneratingQuestion && !currentEntry?.question ? (
              // Show loading state inside the question field
              <div className="flex flex-col items-center justify-center min-h-[80px] space-y-3">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Generating question...</p>
              </div>
            ) : currentEntry?.question ? (
              <MathText className="text-foreground min-h-[80px] [&_p]:my-1">
                {currentEntry.question}
              </MathText>
            ) : (
              <p className="text-muted-foreground/50 min-h-[80px]">
                &lt;... Let's test your current understanding in your own words. - Question ...&gt;
              </p>
            )}
          </div>

          {/* Answer area */}
          <div className="bg-accent/30 rounded-xl p-4">
            <Textarea
              value={currentEntry.answer}
              onChange={(e) => updateEntry("answer", e.target.value)}
              placeholder="<... Student types in his understanding in his own words"
              className="border-none bg-transparent resize-none min-h-[120px] placeholder:text-muted-foreground/50"
              disabled={isEvaluating}
            />
            <p className="text-right text-sm text-muted-foreground mt-2">...&gt;</p>
          </div>

          {/* Evaluation Feedback */}
          {/* Evaluation Feedback */}
          {evaluationResult && (
            <div className={`rounded-xl p-4 border-2 ${evaluationResult.isCorrect
              ? 'bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800'
              : 'bg-yellow-50 border-yellow-200 dark:bg-yellow-950 dark:border-yellow-800'
              }`}>
              <h4 className={`font-semibold mb-2 ${evaluationResult.isCorrect ? 'text-green-900 dark:text-green-100' : 'text-yellow-900 dark:text-yellow-100'
                }`}>
                {evaluationResult.isCorrect ? '✓ Correct!' : '↻ Try Again'}
              </h4>
              <p className="text-sm mb-2 text-foreground/90"><MathText inline>{evaluationResult.feedback}</MathText></p>
              {evaluationResult.suggestions && (
                <p className="text-sm text-muted-foreground italic"><MathText inline>{evaluationResult.suggestions}</MathText></p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-border">
          <Button
            variant="ghost"
            size="icon"
            onClick={goToPrevEntry}
            disabled={currentIndex === 0}
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>

          <div className="flex gap-2">
            {/* Show Retry button if answer was incorrect */}
            {evaluationResult && !evaluationResult.isCorrect && (
              <Button variant="outline" onClick={handleRetry}>
                <RefreshCw className="w-4 h-4 mr-1" />
                Try Again
              </Button>
            )}

            {/* Show Submit button if no evaluation or if correct (to move to next) */}
            {(!evaluationResult || evaluationResult.isCorrect) && (
              <>
                {!evaluationResult ? (
                  <Button
                    variant="default"
                    onClick={evaluateAnswer}
                    disabled={isEvaluating || !currentEntry.answer.trim()}
                  >
                    {isEvaluating ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                        Evaluating...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4 mr-1" />
                        Submit Answer
                      </>
                    )}
                  </Button>
                ) : (
                  // Show Next/Add Question if answer was correct
                  currentIndex === currentEntries.length - 1 ? (
                    <Button
                      variant="outline"
                      onClick={addNewEntry}
                      disabled={isGeneratingQuestion}
                    >
                      {isGeneratingQuestion ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <Plus className="w-4 h-4 mr-1" />
                          Add Question
                        </>
                      )}
                    </Button>
                  ) : (
                    <Button variant="outline" onClick={goToNextEntry}>
                      Next Question
                      <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  )
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default IOWBubbleModal;
