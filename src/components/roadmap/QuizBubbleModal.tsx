import { MathText } from "@/components/MathText";
import { useState, useEffect, useRef } from "react";
import { X, Plus, ChevronLeft, ChevronRight, Loader2, BadgeHelp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { QuizQuestion } from "@/types/learning";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useGenerationManager } from "@/hooks/useGenerationManager";
import { generateUUID } from "@/lib/uuid";

interface QuizBubbleModalProps {
  isOpen: boolean;
  quizzes: QuizQuestion[];
  bubbleId: string;
  contentBubbleId: string;
  onClose: () => void;
  onSave: (quizzes: QuizQuestion[], shouldSummarize?: boolean, bubbleIdFromBackground?: string) => void;
  contentContext?: string;
}

const QuizBubbleModal = ({ isOpen, quizzes, bubbleId, contentBubbleId, onClose, onSave, contentContext }: QuizBubbleModalProps) => {
  const [currentQuizzes, setCurrentQuizzes] = useState<QuizQuestion[]>(
    quizzes.length > 0 ? quizzes : []
  );
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [wrongAnswers, setWrongAnswers] = useState<Set<number>>(new Set()); // Track wrong attempts
  const [isGeneratingQuiz, setIsGeneratingQuiz] = useState(false);
  const [hasNewAIContent, setHasNewAIContent] = useState(false);
  const { toast } = useToast();
  const { generateQuiz, isGenerating } = useGenerationManager();

  // Check if there's a background generation running for this bubble
  const isBackgroundGenerating = isGenerating(bubbleId);

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

    setCurrentQuizzes(quizzes.length > 0 ? quizzes : []);
    setCurrentIndex(0);
    setSelectedAnswer(null);
    setShowResult(false);
    setIsCorrect(false);
    setWrongAnswers(new Set());
    setHasNewAIContent(false);

    // If no quizzes exist and not already generating in background, generate the first one
    if (quizzes.length === 0 && contentContext && !isBackgroundGenerating) {
      generateQuizQuestionInModal();
    }
  }, [isOpen, bubbleId, quizzes, contentContext, isBackgroundGenerating]);

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

  function createEmptyQuiz(): QuizQuestion {
    return {
      id: generateUUID(),
      question: "",
      answers: ["", "", "", ""],
      correctAnswer: 0,
    };
  }

  // Generate quiz in modal (blocks UI until done)
  const generateQuizQuestionInModal = async () => {
    if (!contentContext) {
      setCurrentQuizzes([createEmptyQuiz()]);
      return;
    }

    setIsGeneratingQuiz(true);
    try {
      // Token optimization: Only send last 5 quizzes if more than 5 exist
      const existingQuizzes = currentQuizzes.length > 5
        ? currentQuizzes.slice(-5).map(q => ({ question: q.question, answers: q.answers }))
        : currentQuizzes.map(q => ({ question: q.question, answers: q.answers }));

      const { data, error } = await supabase.functions.invoke('quiz-generate-question', {
        body: {
          contentContext,
          existingQuizzes: existingQuizzes.length > 0 ? existingQuizzes : undefined,
        },
      });

      if (error) {
        console.error('Failed to generate quiz question:', error);
        toast({
          title: "Warning",
          description: "Could not auto-generate quiz. You can add one manually.",
          variant: "default",
        });
        setCurrentQuizzes([createEmptyQuiz()]);
      } else if (data?.question && data?.answers && typeof data?.correctAnswer === 'number') {
        const newQuiz: QuizQuestion = {
          id: generateUUID(),
          question: data.question,
          answers: data.answers,
          correctAnswer: data.correctAnswer,
        };
        setCurrentQuizzes(prev => [...prev, newQuiz]);
        setHasNewAIContent(true); // Mark that AI generated new content
      }
    } catch (error) {
      console.error('Error generating quiz question:', error);
      toast({
        title: "Error",
        description: "Failed to generate quiz. Try again.",
        variant: "destructive",
      });
      setCurrentQuizzes([createEmptyQuiz()]);
    } finally {
      setIsGeneratingQuiz(false);
    }
  };

  const currentQuiz = currentQuizzes[currentIndex];

  const updateQuiz = (field: keyof QuizQuestion, value: string | string[] | number) => {
    setCurrentQuizzes(prev =>
      prev.map((q, i) => i === currentIndex ? { ...q, [field]: value } : q)
    );
  };

  const updateAnswer = (answerIndex: number, value: string) => {
    const newAnswers = [...currentQuiz.answers];
    newAnswers[answerIndex] = value;
    updateQuiz("answers", newAnswers);
  };

  const addNewQuiz = async () => {
    setSelectedAnswer(null);
    setShowResult(false);
    setIsCorrect(false);
    setWrongAnswers(new Set());
    await generateQuizQuestionInModal();
    setCurrentIndex(currentQuizzes.length);
  };

  const goToNextQuiz = () => {
    if (currentIndex < currentQuizzes.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setSelectedAnswer(null);
      setShowResult(false);
      setIsCorrect(false);
      setWrongAnswers(new Set());
    }
  };

  const goToPrevQuiz = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setSelectedAnswer(null);
      setShowResult(false);
      setIsCorrect(false);
      setWrongAnswers(new Set());
    }
  };

  const checkAnswer = () => {
    if (selectedAnswer === null) {
      toast({
        title: "Select an answer",
        description: "Please select an answer before checking.",
        variant: "destructive",
      });
      return;
    }

    const answerIndex = parseInt(selectedAnswer);
    const correct = answerIndex === currentQuiz.correctAnswer;
    setIsCorrect(correct);
    setShowResult(true);

    if (correct) {
      toast({
        title: "Correct!",
        description: "Well done! You got it right.",
      });
    } else {
      // Track wrong answer for this question
      setWrongAnswers(prev => new Set(prev).add(answerIndex));
      toast({
        title: "Incorrect",
        description: "That's not quite right. Try again!",
        variant: "default",
      });
    }
  };

  const handleSave = () => {
    // Filter out empty quizzes
    const validQuizzes = currentQuizzes.filter(
      q => q.question.trim() && q.answers.some(a => a.trim())
    );
    onSave(validQuizzes, hasNewAIContent);
    onClose();
  };

  const handleClose = () => {
    // If generating, continue in background and save when done
    if (isGeneratingQuiz && contentContext) {
      generateQuiz({
        bubbleId,
        contentBubbleId,
        contentContext,
        existingQuizzes: currentQuizzes,
        onComplete: (quiz) => {
          if (quiz) {
            // Save existing + new quiz directly to DB, with shouldSummarize = true
            // Pass bubbleId as 3rd parameter to prevent closing other modals
            const allQuizzes = [...currentQuizzes.filter(q => q.question.trim()), quiz];
            onSave(allQuizzes, true, bubbleId);
          }
        }
      });
      toast({
        title: "Generating in background",
        description: "Quiz will be saved when ready.",
      });
    } else {
      // Normal save - pass hasNewAIContent flag (no bubbleId = will close modal)
      const validQuizzes = currentQuizzes.filter(
        q => q.question.trim() && q.answers.some(a => a.trim())
      );
      if (validQuizzes.length > 0) {
        onSave(validQuizzes, hasNewAIContent);
      }
    }
    onClose();
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
            <BadgeHelp className="w-6 h-6 text-bubble-quiz" />
            <h3 className="font-semibold text-lg">Quiz</h3>
          </div>
          <Button variant="ghost" size="icon" onClick={handleClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[70vh] overflow-y-auto">
          {/* Show loading state when generating quiz */}
          {isGeneratingQuiz && currentQuizzes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <Loader2 className="w-12 h-12 animate-spin text-primary" />
              <p className="text-muted-foreground">Generating your quiz question...</p>
            </div>
          ) : currentQuiz ? (
            <>
              {/* Quiz counter */}
              <p className="text-sm text-primary italic mb-4">
                {currentIndex + 1}/{currentQuizzes.length} Quizzes
              </p>

              {/* Question - Read Only */}
              <div className="bg-bubble-quiz/30 rounded-xl p-4 mb-6">
                {currentQuiz.question ? (
                  <p className="text-lg font-medium text-foreground">
                    <MathText inline>{currentQuiz.question}</MathText>
                  </p>
                ) : (
                  <p className="text-lg font-medium text-muted-foreground/50">
                    &lt;... Question ...&gt;
                  </p>
                )}
              </div>

              {/* Answers - Read Only with Selection */}
              <RadioGroup
                value={selectedAnswer ?? ""}
                onValueChange={setSelectedAnswer}
                className="space-y-3"
                disabled={showResult && isCorrect} // Only disable if correct - allow retry if wrong
              >
                {currentQuiz.answers.map((answer, index) => {
                  // Determine styling based on result state
                  let borderClass = "border-border hover:border-primary/50";

                  if (showResult && isCorrect) {
                    // User got it right - show green on correct answer
                    if (index === currentQuiz.correctAnswer) {
                      borderClass = "border-green-500 bg-green-50 dark:bg-green-950";
                    } else {
                      borderClass = "border-border";
                    }
                  } else if (wrongAnswers.has(index)) {
                    // This answer was previously tried and wrong - show red
                    borderClass = "border-red-500 bg-red-50 dark:bg-red-950";
                  }

                  return (
                    <div
                      key={index}
                      className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${borderClass}`}
                    >
                      <RadioGroupItem
                        value={String(index)}
                        id={`answer-${index}`}
                        disabled={(showResult && isCorrect) || wrongAnswers.has(index)} // Disable correct answers and already-tried wrong ones
                      />
                      <Label htmlFor={`answer-${index}`} className="flex-1 cursor-pointer">
                        <p className="text-foreground"><MathText inline>{answer}</MathText></p>
                      </Label>
                      {/* Show checkmark only when user got it correct */}
                      {showResult && isCorrect && index === currentQuiz.correctAnswer && (
                        <span className="text-green-600 dark:text-green-400 font-bold">✓</span>
                      )}
                      {/* Show X on wrong attempts */}
                      {wrongAnswers.has(index) && (
                        <span className="text-red-600 dark:text-red-400 font-bold">✗</span>
                      )}
                    </div>
                  );
                })}
              </RadioGroup>

              {/* Feedback after answer is checked - only show success feedback */}
              {showResult && isCorrect && (
                <div className="mt-6 rounded-xl p-4 border-2 bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800">
                  <h4 className="font-semibold mb-2 text-green-900 dark:text-green-100">
                    ✓ Correct!
                  </h4>
                  <p className="text-sm text-foreground/90">
                    Well done! You got it right.
                  </p>
                </div>
              )}

              {/* Show hint when wrong - don't reveal answer */}
              {wrongAnswers.size > 0 && !isCorrect && (
                <div className="mt-6 rounded-xl p-4 border-2 bg-amber-50 border-amber-200 dark:bg-amber-950 dark:border-amber-800">
                  <h4 className="font-semibold mb-2 text-amber-900 dark:text-amber-100">
                    Keep trying!
                  </h4>
                  <p className="text-sm text-foreground/90">
                    {wrongAnswers.size === 1
                      ? "That wasn't quite right. Select another answer."
                      : `${wrongAnswers.size} wrong attempts. Keep going!`}
                  </p>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              No quiz available
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-border">
          {/* Hide footer buttons during initial quiz generation */}
          {!(isGeneratingQuiz && currentQuizzes.length === 0) && (
            <>
              <div className="flex gap-2">
                {/* Check Answer button - disabled when correct or no valid selection */}
                <Button
                  variant="outline"
                  onClick={checkAnswer}
                  disabled={
                    !selectedAnswer ||
                    (showResult && isCorrect) || // Disable if already correct
                    wrongAnswers.has(parseInt(selectedAnswer ?? "-1")) // Disable if selecting already-tried wrong answer
                  }
                >
                  Check Answer
                </Button>
              </div>

              <div className="flex gap-2 items-center">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={goToPrevQuiz}
                  disabled={currentIndex === 0}
                >
                  <ChevronLeft className="w-5 h-5" />
                </Button>

                {currentIndex === currentQuizzes.length - 1 ? (
                  <Button
                    variant="outline"
                    onClick={addNewQuiz}
                    disabled={isGeneratingQuiz}
                  >
                    {isGeneratingQuiz ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4 mr-1" />
                        Add Quiz
                      </>
                    )}
                  </Button>
                ) : (
                  <Button variant="outline" onClick={goToNextQuiz}>
                    Next Quiz
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default QuizBubbleModal;
