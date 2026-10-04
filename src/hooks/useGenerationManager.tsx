import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { QuizQuestion, FlashcardEntry, IOWEntry, GeneratedBubbleSummary } from "@/types/learning";
import { useToast } from "@/hooks/use-toast";
import { generateUUID } from "@/lib/uuid";

export type GenerationType = "quiz" | "flashcard" | "iow" | "summary";

interface GenerationTask {
    id: string; // Unique task ID
    bubbleId: string; // The interaction bubble ID
    contentBubbleId: string;
    type: GenerationType;
    status: "pending" | "running" | "completed" | "failed";
    startedAt: Date;
    result?: QuizQuestion | FlashcardEntry | IOWEntry | GeneratedBubbleSummary | null;
    error?: string;
}

interface GenerationManagerContextType {
    // State
    activeTasks: Map<string, GenerationTask>;

    // Check if a bubble is generating
    isGenerating: (bubbleId: string) => boolean;
    getTaskForBubble: (bubbleId: string) => GenerationTask | undefined;

    // Start generation
    generateQuiz: (params: {
        bubbleId: string;
        contentBubbleId: string;
        contentContext: string;
        existingQuizzes?: QuizQuestion[];
        onComplete: (quiz: QuizQuestion | null) => void;
    }) => void;

    generateFlashcard: (params: {
        bubbleId: string;
        contentBubbleId: string;
        userPrompt: string;
        contentContext: string;
        onComplete: (flashcard: FlashcardEntry | null) => void;
    }) => void;

    generateIOWQuestion: (params: {
        bubbleId: string;
        contentBubbleId: string;
        contentContext: string;
        existingQuestions?: string[];
        onComplete: (entry: IOWEntry | null) => void;
    }) => void;

    generateSummary: (params: {
        bubbleId: string;
        contentBubbleId: string;
        onComplete: (summary: GeneratedBubbleSummary | null) => void;
    }) => void;

    // Cancel a running task
    cancelTask: (bubbleId: string) => void;
}

const GenerationManagerContext = createContext<GenerationManagerContextType | null>(null);

export function GenerationManagerProvider({ children }: { children: ReactNode }) {
    const [activeTasks, setActiveTasks] = useState<Map<string, GenerationTask>>(new Map());
    const { toast } = useToast();

    const updateTask = useCallback((bubbleId: string, updates: Partial<GenerationTask>) => {
        setActiveTasks(prev => {
            const newMap = new Map(prev);
            const existing = newMap.get(bubbleId);
            if (existing) {
                newMap.set(bubbleId, { ...existing, ...updates });
            }
            return newMap;
        });
    }, []);

    const removeTask = useCallback((bubbleId: string) => {
        setActiveTasks(prev => {
            const newMap = new Map(prev);
            newMap.delete(bubbleId);
            return newMap;
        });
    }, []);

    const isGenerating = useCallback((bubbleId: string) => {
        const task = activeTasks.get(bubbleId);
        return task?.status === "running" || task?.status === "pending";
    }, [activeTasks]);

    const getTaskForBubble = useCallback((bubbleId: string) => {
        return activeTasks.get(bubbleId);
    }, [activeTasks]);

    const generateQuiz = useCallback(async ({
        bubbleId,
        contentBubbleId,
        contentContext,
        existingQuizzes = [],
        onComplete
    }: {
        bubbleId: string;
        contentBubbleId: string;
        contentContext: string;
        existingQuizzes?: QuizQuestion[];
        onComplete: (quiz: QuizQuestion | null) => void;
    }) => {
        // Create task
        const task: GenerationTask = {
            id: generateUUID(),
            bubbleId,
            contentBubbleId,
            type: "quiz",
            status: "running",
            startedAt: new Date(),
        };

        setActiveTasks(prev => new Map(prev).set(bubbleId, task));

        try {
            // Token optimization: Only send last 5 quizzes
            const quizzesForContext = existingQuizzes.length > 5
                ? existingQuizzes.slice(-5).map(q => ({ question: q.question, answers: q.answers }))
                : existingQuizzes.map(q => ({ question: q.question, answers: q.answers }));

            const { data, error } = await supabase.functions.invoke('quiz-generate-question', {
                body: {
                    contentContext,
                    existingQuizzes: quizzesForContext.length > 0 ? quizzesForContext : undefined,
                },
            });

            if (error) throw error;

            if (data?.question && data?.answers && typeof data?.correctAnswer === 'number') {
                const newQuiz: QuizQuestion = {
                    id: generateUUID(),
                    question: data.question,
                    answers: data.answers,
                    correctAnswer: data.correctAnswer,
                };

                updateTask(bubbleId, { status: "completed", result: newQuiz });
                onComplete(newQuiz);
            } else {
                throw new Error("Invalid response from quiz generation");
            }
        } catch (error) {
            console.error('Error generating quiz:', error);
            updateTask(bubbleId, {
                status: "failed",
                error: error instanceof Error ? error.message : "Unknown error"
            });
            toast({
                title: "Quiz Generation Failed",
                description: "Could not generate quiz question. Try again.",
                variant: "destructive",
            });
            onComplete(null);
        } finally {
            // Remove task after a delay so UI can show completion state
            setTimeout(() => removeTask(bubbleId), 2000);
        }
    }, [updateTask, removeTask, toast]);

    const generateFlashcard = useCallback(async ({
        bubbleId,
        contentBubbleId,
        userPrompt,
        contentContext,
        onComplete
    }: {
        bubbleId: string;
        contentBubbleId: string;
        userPrompt: string;
        contentContext: string;
        onComplete: (flashcard: FlashcardEntry | null) => void;
    }) => {
        const task: GenerationTask = {
            id: generateUUID(),
            bubbleId,
            contentBubbleId,
            type: "flashcard",
            status: "running",
            startedAt: new Date(),
        };

        setActiveTasks(prev => new Map(prev).set(bubbleId, task));

        try {
            const { data, error } = await supabase.functions.invoke('generate-flashcard', {
                body: {
                    userPrompt,
                    contentContext,
                },
            });

            if (error) throw error;

            if (data?.front && data?.back) {
                const newFlashcard: FlashcardEntry = {
                    id: generateUUID(),
                    front: data.front,
                    back: data.back,
                    category: data.category || "General",
                };

                updateTask(bubbleId, { status: "completed", result: newFlashcard });
                onComplete(newFlashcard);
            } else {
                throw new Error("Invalid response from flashcard generation");
            }
        } catch (error) {
            console.error('Error generating flashcard:', error);
            updateTask(bubbleId, {
                status: "failed",
                error: error instanceof Error ? error.message : "Unknown error"
            });
            toast({
                title: "Flashcard Generation Failed",
                description: "Could not generate flashcard. Try again.",
                variant: "destructive",
            });
            onComplete(null);
        } finally {
            setTimeout(() => removeTask(bubbleId), 2000);
        }
    }, [updateTask, removeTask, toast]);

    const generateIOWQuestion = useCallback(async ({
        bubbleId,
        contentBubbleId,
        contentContext,
        existingQuestions = [],
        onComplete
    }: {
        bubbleId: string;
        contentBubbleId: string;
        contentContext: string;
        existingQuestions?: string[];
        onComplete: (entry: IOWEntry | null) => void;
    }) => {
        const task: GenerationTask = {
            id: generateUUID(),
            bubbleId,
            contentBubbleId,
            type: "iow",
            status: "running",
            startedAt: new Date(),
        };

        setActiveTasks(prev => new Map(prev).set(bubbleId, task));

        try {
            const { data, error } = await supabase.functions.invoke('iow-generate-questions', {
                body: {
                    contentContext,
                    existingQuestions: existingQuestions.length > 0 ? existingQuestions : undefined,
                },
            });

            if (error) throw error;

            if (data?.question) {
                const newEntry: IOWEntry = {
                    id: generateUUID(),
                    question: data.question,
                    answer: "",
                };

                updateTask(bubbleId, { status: "completed", result: newEntry });
                onComplete(newEntry);
            } else {
                throw new Error("Invalid response from IOW generation");
            }
        } catch (error) {
            console.error('Error generating IOW question:', error);
            updateTask(bubbleId, {
                status: "failed",
                error: error instanceof Error ? error.message : "Unknown error"
            });
            toast({
                title: "Question Generation Failed",
                description: "Could not generate question. Try again.",
                variant: "destructive",
            });
            onComplete(null);
        } finally {
            setTimeout(() => removeTask(bubbleId), 2000);
        }
    }, [updateTask, removeTask, toast]);

    const generateSummary = useCallback(async ({
        bubbleId,
        contentBubbleId,
        onComplete
    }: {
        bubbleId: string;
        contentBubbleId: string;
        onComplete: (summary: GeneratedBubbleSummary | null) => void;
    }) => {
        const task: GenerationTask = {
            id: generateUUID(),
            bubbleId,
            contentBubbleId,
            type: "summary",
            status: "running",
            startedAt: new Date(),
        };

        setActiveTasks(prev => new Map(prev).set(bubbleId, task));

        try {
            const { data, error } = await supabase.functions.invoke('generate-bubble-summary', {
                body: { contentBubbleId },
            });

            if (error) throw error;

            if (data?.summary) {
                const summary: GeneratedBubbleSummary = {
                    contentBubbleId,
                    quizSummary: data.summary.quizSummary,
                    flashcardSummary: data.summary.flashcardSummary,
                    iowSummary: data.summary.iowSummary,
                    overallSummary: data.summary.overallSummary,
                };

                updateTask(bubbleId, { status: "completed", result: summary });
                onComplete(summary);
            } else {
                throw new Error("Invalid response from summary generation");
            }
        } catch (error) {
            console.error('Error generating summary:', error);
            updateTask(bubbleId, {
                status: "failed",
                error: error instanceof Error ? error.message : "Unknown error"
            });
            toast({
                title: "Summary Generation Failed",
                description: "Could not generate summary. Try again.",
                variant: "destructive",
            });
            onComplete(null);
        } finally {
            setTimeout(() => removeTask(bubbleId), 2000);
        }
    }, [updateTask, removeTask, toast]);

    const cancelTask = useCallback((bubbleId: string) => {
        // Note: We can't actually cancel the API call, but we can ignore the result
        removeTask(bubbleId);
    }, [removeTask]);

    return (
        <GenerationManagerContext.Provider
            value={{
                activeTasks,
                isGenerating,
                getTaskForBubble,
                generateQuiz,
                generateFlashcard,
                generateIOWQuestion,
                generateSummary,
                cancelTask,
            }}
        >
            {children}
        </GenerationManagerContext.Provider>
    );
}

export function useGenerationManager() {
    const context = useContext(GenerationManagerContext);
    if (!context) {
        throw new Error("useGenerationManager must be used within a GenerationManagerProvider");
    }
    return context;
}
