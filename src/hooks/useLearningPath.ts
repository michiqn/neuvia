import { logger } from "@/lib/logger";
import { useState, useEffect, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useToast } from "./use-toast";
import {
  Milestone,
  ContentBubble,
  Bubble,
  BubbleType,
  QuizQuestion,
  FlashcardEntry,
  IOWEntry,
  SummaryData,
  GeneratedBubbleSummary
} from "@/types/learning";

// Types for background summarization
interface SummarizationData {
  quizQuestions?: Array<{ question: string; answers: string[]; correctAnswer: number }>;
  flashcards?: Array<{ front: string; back: string }>;
  iowEntries?: Array<{ question: string; answer?: string }>;
}

// Helper function to trigger background summarization (non-blocking)
const triggerBackgroundSummarization = (
  interactionId: string,
  contentBubbleId: string,
  interactionType: 'quiz' | 'flashcard' | 'iow',
  interactionData: SummarizationData
) => {
  // Fire and forget - don't await, don't block
  supabase.functions.invoke('summarize-interaction', {
    body: {
      interactionId,
      contentBubbleId,
      interactionType,
      interactionData,
    },
  }).then(({ error }) => {
    if (error) {
      console.warn('[Background Summary] Failed to summarize interaction:', error);
    } else {
      logger.debug('[Background Summary] Summarization triggered for interaction:', interactionId);
    }
  }).catch((err) => {
    console.warn('[Background Summary] Error triggering summarization:', err);
  });
};

export interface LearningPathData {
  id: string;
  title: string;
  goal: string;
  context?: string;
  curriculum?: string;
  created_at: string;
  updated_at: string;
}

export function useLearningPaths() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: paths = [], isLoading: loading, refetch } = useQuery({
    queryKey: ['learning-paths', user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from("learning_paths")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        toast({
          title: "Error",
          description: "Failed to load learning paths",
          variant: "destructive",
        });
        throw error;
      }

      return data || [];
    },
    enabled: !!user, // Only run query if user exists
    staleTime: 1000 * 60 * 5, // Consider data fresh for 5 minutes
    gcTime: 1000 * 60 * 30, // Keep in cache for 30 minutes (renamed from cacheTime in v5)
  });

  // Invalidate cache helper for use after mutations
  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['learning-paths', user?.id] });
  }, [queryClient, user?.id]);

  return { paths, loading, refetch, invalidate };
}

export function useLearningPath(pathId: string | null) {
  const [path, setPath] = useState<LearningPathData | null>(null);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  // Fetch path and milestones with all nested data
  const fetchPath = useCallback(async () => {
    if (!pathId || !user) {
      setPath(null);
      setMilestones([]);
      setLoading(false);
      return;
    }

    try {
      // OPTIMIZED: Fetch ALL data in a single parallel batch using joins
      const [
        pathRes,
        milestonesRes,
        contentBubblesRes,
        interactionsRes,
        summariesRes,
        quizRes,
        flashcardRes,
        iowRes
      ] = await Promise.all([
        // Fetch path
        supabase.from("learning_paths").select("*").eq("id", pathId).single(),

        // Fetch milestones
        supabase.from("milestones").select("*").eq("learning_path_id", pathId).order("order_index"),

        // Fetch all content bubbles for this path's milestones
        supabase.from("content_bubbles")
          .select("*, milestones!inner(learning_path_id)")
          .eq("milestones.learning_path_id", pathId)
          .order("order_index"),

        // Fetch all interactions for this path's content bubbles
        supabase.from("interactions")
          .select("*, content_bubbles!inner(milestone_id, milestones!inner(learning_path_id))")
          .eq("content_bubbles.milestones.learning_path_id", pathId)
          .order("order_index"),

        // Fetch all summaries for this path's content bubbles
        supabase.from("summaries")
          .select("*, content_bubbles!inner(milestone_id, milestones!inner(learning_path_id))")
          .eq("content_bubbles.milestones.learning_path_id", pathId),

        // Fetch quiz questions using joins (all in one parallel batch)
        supabase.from("quiz_questions")
          .select("*, interactions!inner(content_bubble_id, content_bubbles!inner(milestone_id, milestones!inner(learning_path_id)))")
          .eq("interactions.content_bubbles.milestones.learning_path_id", pathId)
          .order("order_index"),

        // Fetch flashcards using joins
        supabase.from("flashcards")
          .select("*, interactions!inner(content_bubble_id, content_bubbles!inner(milestone_id, milestones!inner(learning_path_id)))")
          .eq("interactions.content_bubbles.milestones.learning_path_id", pathId)
          .order("order_index"),

        // Fetch IOW entries using joins
        supabase.from("iow_entries")
          .select("*, interactions!inner(content_bubble_id, content_bubbles!inner(milestone_id, milestones!inner(learning_path_id)))")
          .eq("interactions.content_bubbles.milestones.learning_path_id", pathId)
          .order("order_index"),
      ]);

      // Check for critical errors
      if (pathRes.error) {
        console.error("Error fetching learning path:", pathRes.error);
        throw pathRes.error;
      }

      if (milestonesRes.error) {
        console.error("Error fetching milestones:", milestonesRes.error);
        throw milestonesRes.error;
      }

      // Log non-critical errors but don't throw (they might be expected for new paths)
      if (contentBubblesRes.error) console.warn("Error fetching content bubbles:", contentBubblesRes.error);
      if (interactionsRes.error) console.warn("Error fetching interactions:", interactionsRes.error);
      if (summariesRes.error) console.warn("Error fetching summaries:", summariesRes.error);
      if (quizRes.error) console.warn("Error fetching quiz questions:", quizRes.error);
      if (flashcardRes.error) console.warn("Error fetching flashcards:", flashcardRes.error);
      if (iowRes.error) console.warn("Error fetching IOW entries:", iowRes.error);

      logger.debug(`[useLearningPath] Loaded path: ${pathRes.data?.title}, Milestones: ${milestonesRes.data?.length || 0}`);

      setPath(pathRes.data);
      const milestonesData = milestonesRes.data || [];
      const contentBubblesData = contentBubblesRes.data || [];
      const interactionsData = interactionsRes.data || [];
      const summariesData = summariesRes.data || [];
      const quizData = quizRes.data || [];
      const flashcardData = flashcardRes.data || [];
      const iowData = iowRes.data || [];

      // Build the nested structure
      const builtMilestones: Milestone[] = (milestonesData || []).map((m, idx) => {
        const mContentBubbles = contentBubblesData.filter((cb) => cb.milestone_id === m.id);

        const contentBubbles: ContentBubble[] = mContentBubbles.map((cb) => {
          const cbInteractions = interactionsData.filter((i) => i.content_bubble_id === cb.id);

          const interactions: Bubble[] = cbInteractions.map((i) => {
            const quizzes: QuizQuestion[] = quizData
              .filter((q) => q.interaction_id === i.id)
              .map((q) => ({
                id: q.id as string,
                question: q.question as string,
                answers: q.answers as string[],
                correctAnswer: q.correct_answer as number,
              }));

            const flashcards: FlashcardEntry[] = flashcardData
              .filter((f) => f.interaction_id === i.id)
              .map((f) => ({
                id: f.id as string,
                front: f.front as string,
                back: f.back as string,
                category: f.category as string,
              }));

            const iowEntries: IOWEntry[] = iowData
              .filter((e) => e.interaction_id === i.id)
              .map((e) => ({
                id: e.id as string,
                question: e.question as string,
                answer: e.answer as string,
              }));

            return {
              id: i.id as string,
              type: i.type as BubbleType,
              parentId: cb.id as string,
              order: i.order_index as number,
              quizzes: quizzes.length > 0 ? quizzes : undefined,
              flashcards: flashcards.length > 0 ? flashcards : undefined,
              iowEntries: iowEntries.length > 0 ? iowEntries : undefined,
              // Note: summaryData will be populated after we load the summary
            };
          });

          const summaryRow = summariesData.find((s) => s.content_bubble_id === cb.id);
          const summary: SummaryData | undefined = summaryRow
            ? { title: summaryRow.title as string, content: summaryRow.content as string }
            : undefined;

          // Populate summaryData on the summary interaction bubble
          const interactionsWithSummary = interactions.map(interaction => {
            if (interaction.type === 'summary' && summary) {
              return { ...interaction, summaryData: summary };
            }
            return interaction;
          });

          return {
            id: cb.id as string,
            type: "content" as const,
            parentId: m.id,
            title: cb.title as string,
            content: cb.content as string | null,
            nextTopic: (cb.next_topic as string | null) || undefined,
            order: cb.order_index as number,
            interactions: interactionsWithSummary,
            summary,
            userTopicInput: (cb.user_topic_input as string | null) || undefined,
            suggestedTopic: (cb.suggested_topic as string | null) || undefined,
          };
        });

        return {
          id: m.id,
          title: m.title,
          description: m.description || undefined,
          firstTopic: m.first_topic || undefined,
          order: m.order_index,
          isExpanded: idx === 0, // Expand first milestone by default
          contentBubbles,
        };
      });

      setMilestones(builtMilestones);
    } catch (error) {
      console.error("Error fetching path:", error);
      toast({
        title: "Error",
        description: "Failed to load learning path",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [pathId, user, toast]);

  useEffect(() => {
    fetchPath();
  }, [fetchPath]);

  // Save content bubble
  const saveContentBubble = async (milestoneId: string, bubble: ContentBubble) => {
    try {
      const { data: existing } = await supabase
        .from("content_bubbles")
        .select("id")
        .eq("id", bubble.id)
        .maybeSingle();

      if (existing) {
        // Update
        const { error } = await supabase
          .from("content_bubbles")
          .update({
            title: bubble.title,
            content: bubble.content,
            next_topic: bubble.nextTopic,
            order_index: bubble.order,
            user_topic_input: bubble.userTopicInput,
            suggested_topic: bubble.suggestedTopic,
          })
          .eq("id", bubble.id);

        if (error) throw error;
      } else {
        // Insert
        const { error } = await supabase.from("content_bubbles").insert({
          id: bubble.id,
          milestone_id: milestoneId,
          title: bubble.title,
          content: bubble.content,
          next_topic: bubble.nextTopic,
          order_index: bubble.order,
          user_topic_input: bubble.userTopicInput,
          suggested_topic: bubble.suggestedTopic,
        });

        if (error) throw error;
      }
    } catch (error) {
      console.error("Error saving content bubble:", error);
      throw error;
    }
  };

  // Save interaction
  const saveInteraction = async (contentBubbleId: string, interaction: Bubble) => {
    try {
      const { data: existing } = await supabase
        .from("interactions")
        .select("id")
        .eq("id", interaction.id)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from("interactions")
          .update({
            type: interaction.type,
            order_index: interaction.order,
          })
          .eq("id", interaction.id);

        if (error) throw error;
      } else {
        const { error } = await supabase.from("interactions").insert({
          id: interaction.id,
          content_bubble_id: contentBubbleId,
          type: interaction.type,
          order_index: interaction.order,
        });

        if (error) throw error;
      }
    } catch (error) {
      console.error("Error saving interaction:", error);
      throw error;
    }
  };

  // Delete content bubble
  const deleteContentBubble = async (contentBubbleId: string) => {
    try {
      const { error } = await supabase
        .from("content_bubbles")
        .delete()
        .eq("id", contentBubbleId);

      if (error) throw error;
    } catch (error) {
      console.error("Error deleting content bubble:", error);
      throw error;
    }
  };

  // Delete interaction
  const deleteInteraction = async (interactionId: string) => {
    try {
      const { error } = await supabase
        .from("interactions")
        .delete()
        .eq("id", interactionId);

      if (error) throw error;
    } catch (error) {
      console.error("Error deleting interaction:", error);
      throw error;
    }
  };

  // Save quizzes
  const saveQuizzes = async (interactionId: string, quizzes: QuizQuestion[], shouldSummarize?: boolean) => {
    try {
      // Delete existing
      await supabase.from("quiz_questions").delete().eq("interaction_id", interactionId);

      // Insert new (let database generate new UUIDs to avoid conflicts)
      if (quizzes.length > 0) {
        const { error } = await supabase.from("quiz_questions").insert(
          quizzes.map((q, idx) => ({
            // Don't pass id - let database generate new UUID
            interaction_id: interactionId,
            question: q.question,
            answers: q.answers,
            correct_answer: q.correctAnswer,
            order_index: idx,
          }))
        );

        if (error) throw error;

        // Only trigger background summarization when AI generates new content
        if (shouldSummarize) {
          const { data: interaction } = await supabase
            .from("interactions")
            .select("content_bubble_id")
            .eq("id", interactionId)
            .single();

          if (interaction?.content_bubble_id) {
            triggerBackgroundSummarization(
              interactionId,
              interaction.content_bubble_id,
              'quiz',
              {
                quizQuestions: quizzes.map(q => ({
                  question: q.question,
                  answers: q.answers,
                  correctAnswer: q.correctAnswer,
                }))
              }
            );
          }
        }
      }
    } catch (error) {
      console.error("Error saving quizzes:", error);
      throw error;
    }
  };

  // Save flashcards
  const saveFlashcards = async (interactionId: string, flashcards: FlashcardEntry[], shouldSummarize?: boolean) => {
    try {
      await supabase.from("flashcards").delete().eq("interaction_id", interactionId);

      if (flashcards.length > 0) {
        const { error } = await supabase.from("flashcards").insert(
          flashcards.map((f, idx) => ({
            // Don't pass id - let database generate new UUID
            interaction_id: interactionId,
            front: f.front,
            back: f.back,
            category: f.category,
            order_index: idx,
          }))
        );

        if (error) throw error;

        // Only trigger background summarization when AI generates new content
        if (shouldSummarize) {
          const { data: interaction } = await supabase
            .from("interactions")
            .select("content_bubble_id")
            .eq("id", interactionId)
            .single();

          if (interaction?.content_bubble_id) {
            triggerBackgroundSummarization(
              interactionId,
              interaction.content_bubble_id,
              'flashcard',
              {
                flashcards: flashcards.map(f => ({
                  front: f.front,
                  back: f.back,
                }))
              }
            );
          }
        }
      }
    } catch (error) {
      console.error("Error saving flashcards:", error);
      throw error;
    }
  };

  // Save IOW entries
  const saveIOWEntries = async (interactionId: string, entries: IOWEntry[], shouldSummarize?: boolean) => {
    try {
      await supabase.from("iow_entries").delete().eq("interaction_id", interactionId);

      if (entries.length > 0) {
        const { error } = await supabase.from("iow_entries").insert(
          entries.map((e, idx) => ({
            // Don't pass id - let database generate new UUID
            interaction_id: interactionId,
            question: e.question,
            answer: e.answer,
            order_index: idx,
          }))
        );

        if (error) throw error;

        // Only trigger background summarization when AI generates new content
        if (shouldSummarize) {
          const { data: interaction } = await supabase
            .from("interactions")
            .select("content_bubble_id")
            .eq("id", interactionId)
            .single();

          if (interaction?.content_bubble_id) {
            triggerBackgroundSummarization(
              interactionId,
              interaction.content_bubble_id,
              'iow',
              {
                iowEntries: entries.map(e => ({
                  question: e.question,
                  answer: e.answer,
                }))
              }
            );
          }
        }
      }
    } catch (error) {
      console.error("Error saving IOW entries:", error);
      throw error;
    }
  };

  // Save summary (for content bubble summaries)
  const saveSummary = async (contentBubbleId: string, summary: SummaryData) => {
    try {
      const { data: existing } = await supabase
        .from("summaries")
        .select("id")
        .eq("content_bubble_id", contentBubbleId)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from("summaries")
          .update({ title: summary.title, content: summary.content })
          .eq("content_bubble_id", contentBubbleId);

        if (error) throw error;
      } else {
        const { error } = await supabase.from("summaries").insert({
          content_bubble_id: contentBubbleId,
          title: summary.title,
          content: summary.content,
        });

        if (error) throw error;
      }
    } catch (error) {
      console.error("Error saving summary:", error);
      throw error;
    }
  };

  // Mark content bubble as completed
  const markContentBubbleComplete = async (contentBubbleId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('content_bubble_completions')
        .insert({
          content_bubble_id: contentBubbleId,
          user_id: user.id,
        });

      // Ignore duplicate key errors (already completed)
      if (error && error.code !== '23505') {
        throw error;
      }

      toast({
        title: "Content completed",
        description: "Progress saved successfully",
      });
    } catch (error) {
      console.error('Error marking content complete:', error);
      toast({
        title: "Error",
        description: "Failed to save progress",
        variant: "destructive",
      });
      throw error;
    }
  };

  // Record quiz attempt
  const recordQuizAttempt = async (
    quizQuestionId: string,
    selectedAnswer: number,
    isCorrect: boolean
  ) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('quiz_attempts')
        .insert({
          quiz_question_id: quizQuestionId,
          user_id: user.id,
          selected_answer: selectedAnswer,
          is_correct: isCorrect,
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error recording quiz attempt:', error);
      throw error;
    }
  };

  // Mark milestone as completed
  const markMilestoneComplete = async (milestoneId: string) => {
    try {
      const { error } = await supabase
        .from('milestones')
        .update({
          milestone_status: 'completed',
          completed_at: new Date().toISOString(),
        })
        .eq('id', milestoneId);

      if (error) throw error;

      toast({
        title: "Milestone completed!",
        description: "Great work! Ready for the next milestone?",
      });

      // Refetch to update UI
      await fetchPath();
    } catch (error) {
      console.error('Error marking milestone complete:', error);
      toast({
        title: "Error",
        description: "Failed to mark milestone as complete",
        variant: "destructive",
      });
      throw error;
    }
  };

  // Generate AI summary for a content bubble (on-demand)
  const generateBubbleSummary = async (contentBubbleId: string): Promise<GeneratedBubbleSummary | null> => {
    try {
      const { data, error } = await supabase.functions.invoke('generate-bubble-summary', {
        body: { contentBubbleId },
      });

      if (error) {
        console.error('Error generating bubble summary:', error);
        toast({
          title: "Error",
          description: "Failed to generate summary",
          variant: "destructive",
        });
        return null;
      }

      // Refetch path data to update local state with the new summary
      await fetchPath();

      // Edge function returns { success, summary, ... } - extract the summary field
      return data?.summary as GeneratedBubbleSummary;
    } catch (error) {
      console.error('Error calling generate-bubble-summary:', error);
      toast({
        title: "Error",
        description: "Failed to generate summary",
        variant: "destructive",
      });
      return null;
    }
  };

  return {
    path,
    milestones,
    setMilestones,
    loading,
    refetch: fetchPath,
    saveContentBubble,
    deleteContentBubble,
    saveInteraction,
    deleteInteraction,
    saveQuizzes,
    saveFlashcards,
    saveIOWEntries,
    saveSummary,
    markContentBubbleComplete,
    recordQuizAttempt,
    markMilestoneComplete,
    generateBubbleSummary,
  };
}
