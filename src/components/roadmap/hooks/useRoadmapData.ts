import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Milestone,
  ContentBubble,
  Bubble,
  QuizQuestion,
  FlashcardEntry,
  IOWEntry,
  SummaryData,
  BubbleType,
} from "@/types/learning";
import { generateUUID } from "@/lib/uuid";

interface UseRoadmapDataProps {
  milestones: Milestone[];
  onMilestonesChange: (milestones: Milestone[] | ((prevMilestones: Milestone[]) => Milestone[])) => void;
  onSaveContentBubble?: (milestoneId: string, bubble: ContentBubble) => Promise<void>;
  onDeleteContentBubble?: (contentBubbleId: string) => Promise<void>;
  onSaveInteraction?: (contentBubbleId: string, interaction: Bubble) => Promise<void>;
  onDeleteInteraction?: (interactionId: string) => Promise<void>;
  onSaveQuizzes?: (interactionId: string, quizzes: QuizQuestion[], shouldSummarize?: boolean) => Promise<void>;
  onSaveFlashcards?: (interactionId: string, flashcards: FlashcardEntry[], shouldSummarize?: boolean) => Promise<void>;
  onSaveIOWEntries?: (interactionId: string, entries: IOWEntry[], shouldSummarize?: boolean) => Promise<void>;
  onSaveSummary?: (contentBubbleId: string, summary: SummaryData) => Promise<void>;
  onDemoModeRedirect?: () => void;
}

export function useRoadmapData({
  milestones,
  onMilestonesChange,
  onSaveContentBubble,
  onDeleteContentBubble,
  onSaveInteraction,
  onDeleteInteraction,
  onSaveQuizzes,
  onSaveFlashcards,
  onSaveIOWEntries,
  onSaveSummary: onSaveSummaryProp,
  onDemoModeRedirect,
}: UseRoadmapDataProps) {
  const [addingContentTo, setAddingContentTo] = useState<string | null>(null);
  const [generatingBubbles, setGeneratingBubbles] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  // Updates one content bubble in the nested milestone state. Uses a functional update so
  // background saves never overwrite changes made in the meantime.
  const updateContentBubble = (
    milestoneId: string,
    contentBubbleId: string,
    update: (contentBubble: ContentBubble) => ContentBubble
  ) => {
    onMilestonesChange((prevMilestones) =>
      prevMilestones.map((m) =>
        m.id === milestoneId
          ? { ...m, contentBubbles: m.contentBubbles.map((cb) => (cb.id === contentBubbleId ? update(cb) : cb)) }
          : m
      )
    );
  };

  const updateInteraction = (
    milestoneId: string,
    contentBubbleId: string,
    interactionId: string,
    changes: Partial<Bubble>
  ) => {
    updateContentBubble(milestoneId, contentBubbleId, (cb) => ({
      ...cb,
      interactions: cb.interactions.map((i) => (i.id === interactionId ? { ...i, ...changes } : i)),
    }));
  };

  // Runs a persistence callback (if the page provided one); returns false and shows a toast if it fails
  const persist = async (save: (() => Promise<unknown>) | null | undefined, logLabel: string, errorDescription: string) => {
    if (!save) return true;
    try {
      await save();
      return true;
    } catch (error) {
      console.error(`Error saving ${logLabel}:`, error);
      toast({ title: "Error", description: errorDescription, variant: "destructive" });
      return false;
    }
  };

  // Toggle milestone expansion
  const toggleMilestone = (id: string) => {
    onMilestonesChange(
      milestones.map((m) => (m.id === id ? { ...m, isExpanded: !m.isExpanded } : m))
    );
  };

  // Add a new content bubble to milestone (returns modal context)
  const addContentBubble = (milestoneId: string) => {
    const milestone = milestones.find((m) => m.id === milestoneId);
    if (!milestone) return null;

    // Check if we're in demo mode (no save callback)
    if (!onSaveContentBubble) {
      toast({
        title: "Ready to start your learning journey?",
        description: "Create a real learning path to add and generate content!",
      });
      if (onDemoModeRedirect) {
        onDemoModeRedirect();
      }
      return null;
    }

    // Determine suggested topic
    const bubbleIndex = milestone.contentBubbles.length;
    let suggestedTopic = milestone.firstTopic || "Introduction";
    let previousTopicText: string | undefined;

    if (bubbleIndex > 0) {
      const previousBubble = milestone.contentBubbles[bubbleIndex - 1];
      suggestedTopic = previousBubble.nextTopic || milestone.firstTopic || "Introduction";
      previousTopicText = previousBubble.title;
    }

    // Return modal context
    return {
      milestoneId: milestone.id,
      milestoneTitle: milestone.title,
      milestoneDescription: milestone.description,
      suggestedTopic: suggestedTopic,
      previousTopic: previousTopicText,
      orderIndex: bubbleIndex,
    };
  };

  // Create content bubble from modal (called after generation in modal)
  const createContentBubbleFromModal = async (contentBubble: ContentBubble) => {
    const milestone = milestones.find((m) => m.id === contentBubble.parentId);
    if (!milestone) return;

    try {
      // Save to database
      if (onSaveContentBubble) {
        await onSaveContentBubble(contentBubble.parentId, contentBubble);
      }

      // Add to local state
      const updatedMilestone = {
        ...milestone,
        contentBubbles: [...milestone.contentBubbles, contentBubble],
      };

      onMilestonesChange(
        milestones.map((m) => (m.id === contentBubble.parentId ? updatedMilestone : m))
      );
    } catch (error) {
      console.error("Error saving content bubble:", error);
      toast({
        title: "Error",
        description: "Failed to save content bubble",
        variant: "destructive",
      });
      throw error;
    }
  };

  // Generate content for a content bubble (for existing empty bubbles)
  const generateContentForBubble = async (
    milestone: Milestone,
    contentBubble: ContentBubble,
    currentMilestones?: Milestone[]
  ) => {
    // Determine the topic to generate
    const bubbleIndex = milestone.contentBubbles.findIndex(cb => cb.id === contentBubble.id);
    let topicToGenerate: string | undefined;
    let previousTopicText: string | undefined;

    // Priority 1: Use userTopicInput if available (from modal)
    if (contentBubble.userTopicInput) {
      topicToGenerate = contentBubble.userTopicInput;
    } else {
      // Priority 2: Use suggested topic flow (firstTopic or nextTopic)
      topicToGenerate = milestone.firstTopic;
      if (bubbleIndex > 0) {
        const previousBubble = milestone.contentBubbles[bubbleIndex - 1];
        topicToGenerate = previousBubble.nextTopic || milestone.firstTopic;
      }
    }

    // Get previous topic for context
    if (bubbleIndex > 0) {
      const previousBubble = milestone.contentBubbles[bubbleIndex - 1];
      previousTopicText = previousBubble.title;
    }

    if (!topicToGenerate) {
      toast({
        title: "No topic available",
        description: "Unable to determine the next topic to generate.",
        variant: "destructive",
      });
      return;
    }

    setGeneratingBubbles((prev) => new Set(prev).add(contentBubble.id));

    try {
      const { data, error } = await supabase.functions.invoke("generate-content", {
        body: {
          milestoneTitle: milestone.title,
          milestoneDescription: milestone.description,
          userTopicInput: topicToGenerate,
          previousTopic: previousTopicText,
        },
      });

      if (error) throw error;

      const updatedBubble: ContentBubble = {
        ...contentBubble,
        title: data.title,
        content: data.content,
        nextTopic: data.nextTopic,
      };

      // Save to database
      if (onSaveContentBubble) {
        await onSaveContentBubble(milestone.id, updatedBubble);
      }

      // Use the milestone parameter (which has the updated contentBubbles array)
      const updatedMilestone = {
        ...milestone,
        contentBubbles: milestone.contentBubbles.map((cb) =>
          cb.id === contentBubble.id ? updatedBubble : cb
        ),
      };

      // Use currentMilestones if provided (to avoid stale closure), otherwise fall back to milestones
      const milestonesToUpdate = currentMilestones || milestones;
      const newMilestones = milestonesToUpdate.map((m) =>
        m.id === milestone.id ? updatedMilestone : m
      );

      onMilestonesChange(newMilestones);

      toast({
        title: "Content generated!",
        description: `Created "${data.title}"`,
      });
    } catch (error) {
      console.error("Error generating content:", error);
      toast({
        title: "Generation failed",
        description: error instanceof Error ? error.message : "Failed to generate content",
        variant: "destructive",
      });
    } finally {
      setGeneratingBubbles((prev) => {
        const next = new Set(prev);
        next.delete(contentBubble.id);
        return next;
      });
    }
  };

  // Generate first content for a milestone (returns modal context)
  const generateFirstContent = (milestone: Milestone) => {
    // Check if we're in demo mode (no save callback)
    if (!onSaveContentBubble) {
      toast({
        title: "Ready to start your learning journey?",
        description: "Create a real learning path to add and generate content!",
      });
      if (onDemoModeRedirect) {
        onDemoModeRedirect();
      }
      return null;
    }

    // Return modal context (same as addContentBubble)
    return {
      milestoneId: milestone.id,
      milestoneTitle: milestone.title,
      milestoneDescription: milestone.description,
      suggestedTopic: milestone.firstTopic || "Introduction",
      previousTopic: undefined,
      orderIndex: 0,
    };
  };

  // Handle dropping an interaction onto a content bubble
  const handleDropOnBubble = async (
    draggingBubble: BubbleType,
    milestoneId: string,
    contentBubbleId: string
  ) => {
    if (!draggingBubble || draggingBubble === "content") return false;

    const milestone = milestones.find((m) => m.id === milestoneId);
    const contentBubble = milestone?.contentBubbles.find((cb) => cb.id === contentBubbleId);

    if (contentBubble) {
      const existingOfType = contentBubble.interactions.find((i) => i.type === draggingBubble);
      if (existingOfType) {
        toast({
          title: "Already added",
          description: `This content already has a ${draggingBubble} bubble. Click it to add more items inside.`,
          variant: "destructive",
        });
        return false;
      }
    }

    const newInteraction: Bubble = {
      id: generateUUID(),
      type: draggingBubble,
      parentId: contentBubbleId,
      order: contentBubble?.interactions.length || 0,
    };

    if (onSaveInteraction) {
      try {
        await onSaveInteraction(contentBubbleId, newInteraction);
      } catch (error) {
        console.error("Error saving interaction:", error);
        toast({
          title: "Error",
          description: "Failed to save interaction",
          variant: "destructive",
        });
        return false;
      }
    }

    updateContentBubble(milestoneId, contentBubbleId, (cb) => ({
      ...cb,
      interactions: [...cb.interactions, newInteraction],
    }));

    return true;
  };

  // Handle trash drop for deleting bubbles
  const handleTrashDrop = async (draggingExisting: {
    milestoneId: string;
    contentBubbleId: string;
    interactionId?: string;
  }) => {
    if (!draggingExisting.interactionId) {
      // Deleting content bubble
      if (onDeleteContentBubble) {
        try {
          await onDeleteContentBubble(draggingExisting.contentBubbleId);
        } catch (error) {
          console.error("Error deleting content bubble:", error);
          toast({
            title: "Error",
            description: "Failed to delete content bubble",
            variant: "destructive",
          });
          return;
        }
      }

      // Use functional update to ensure we're working with latest state
      onMilestonesChange((prevMilestones) =>
        prevMilestones.map((m) => {
          if (m.id === draggingExisting.milestoneId) {
            return {
              ...m,
              contentBubbles: m.contentBubbles.filter(
                (cb) => cb.id !== draggingExisting.contentBubbleId
              ),
            };
          }
          return m;
        })
      );

      toast({
        title: "Content bubble deleted",
        description: "The content bubble has been removed",
      });
    } else {
      // Deleting interaction bubble
      if (onDeleteInteraction) {
        try {
          await onDeleteInteraction(draggingExisting.interactionId);
        } catch (error) {
          console.error("Error deleting interaction:", error);
        }
      }

      updateContentBubble(draggingExisting.milestoneId, draggingExisting.contentBubbleId, (cb) => ({
        ...cb,
        interactions: cb.interactions.filter((i) => i.id !== draggingExisting.interactionId),
      }));
    }
  };

  // Save content bubble
  const saveContentBubble = async (title: string, content: string, milestoneId: string, bubbleId: string) => {
    const existingBubble = milestones
      .find((m) => m.id === milestoneId)
      ?.contentBubbles.find((b) => b.id === bubbleId);
    if (!existingBubble) return;

    const updatedBubble: ContentBubble = { ...existingBubble, title, content };
    const saved = await persist(
      onSaveContentBubble && (() => onSaveContentBubble(milestoneId, updatedBubble)),
      "content bubble",
      "Failed to save changes"
    );
    if (!saved) return;

    updateContentBubble(milestoneId, bubbleId, () => updatedBubble);
    toast({ title: "Saved", description: "Content updated successfully" });
  };

  // Save quiz questions
  const saveQuizzes = async (
    milestoneId: string,
    contentBubbleId: string,
    bubbleId: string,
    quizzes: QuizQuestion[],
    shouldSummarize?: boolean
  ) => {
    const saved = await persist(
      onSaveQuizzes && (() => onSaveQuizzes(bubbleId, quizzes, shouldSummarize)),
      "quizzes",
      "Failed to save quizzes"
    );
    if (saved) updateInteraction(milestoneId, contentBubbleId, bubbleId, { quizzes });
  };

  // Save flashcards
  const saveFlashcards = async (
    milestoneId: string,
    contentBubbleId: string,
    bubbleId: string,
    flashcards: FlashcardEntry[],
    shouldSummarize?: boolean
  ) => {
    const saved = await persist(
      onSaveFlashcards && (() => onSaveFlashcards(bubbleId, flashcards, shouldSummarize)),
      "flashcards",
      "Failed to save flashcards"
    );
    if (saved) updateInteraction(milestoneId, contentBubbleId, bubbleId, { flashcards });
  };

  // Save IOW entries
  const saveIOWEntries = async (
    milestoneId: string,
    contentBubbleId: string,
    bubbleId: string,
    iowEntries: IOWEntry[],
    shouldSummarize?: boolean
  ) => {
    const saved = await persist(
      onSaveIOWEntries && (() => onSaveIOWEntries(bubbleId, iowEntries, shouldSummarize)),
      "IOW entries",
      "Failed to save entries"
    );
    if (saved) updateInteraction(milestoneId, contentBubbleId, bubbleId, { iowEntries });
  };

  // Save summary
  const saveSummary = async (milestoneId: string, contentBubbleId: string, summary: SummaryData) => {
    const saved = await persist(
      onSaveSummaryProp && (() => onSaveSummaryProp(contentBubbleId, summary)),
      "summary",
      "Failed to save summary"
    );
    if (!saved) return;

    updateContentBubble(milestoneId, contentBubbleId, (cb) => ({ ...cb, summary }));
    toast({ title: "Summary saved", description: "Your summary has been updated" });
  };

  // Save milestone
  const saveMilestone = (title: string, description: string, milestoneId: string) => {
    // Use functional update to ensure we're working with latest state
    onMilestonesChange((prevMilestones) =>
      prevMilestones.map((m) =>
        m.id === milestoneId ? { ...m, title, description } : m
      )
    );
  };

  return {
    // State
    addingContentTo,
    generatingBubbles,

    // Milestone actions
    toggleMilestone,
    saveMilestone,

    // Content bubble actions
    addContentBubble,
    generateContentForBubble,
    generateFirstContent,
    createContentBubbleFromModal,
    saveContentBubble,

    // Interaction actions
    handleDropOnBubble,
    handleTrashDrop,
    saveQuizzes,
    saveFlashcards,
    saveIOWEntries,
    saveSummary,
  };
}
