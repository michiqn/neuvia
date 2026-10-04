import { logger } from "@/lib/logger";
import { useRef, useState } from "react";
import { Milestone, ContentBubble, BubbleType, Bubble, QuizQuestion, IOWEntry, SummaryData, FlashcardEntry, GeneratedBubbleSummary } from "@/types/learning";
import { useGenerationManager } from "@/hooks/useGenerationManager";
import DragMenu, { DragMenuRef } from "./DragMenu";
import FeedbackButton from "./FeedbackButton";
import MilestoneSection from "./MilestoneSection";
import RoadmapModals from "./RoadmapModals";
import RequestContentModal from "./RequestContentModal";
import { Button } from "@/components/ui/button";
import { useDragAndDrop } from "./hooks/useDragAndDrop";
import { useRoadmapModals } from "./hooks/useRoadmapModals";
import { useRoadmapData } from "./hooks/useRoadmapData";

interface RoadmapCanvasProps {
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
  onGenerateBubbleSummary?: (contentBubbleId: string) => Promise<GeneratedBubbleSummary | null>;
  onRequestMilestone?: () => void;
  onDemoModeRedirect?: () => void;
}

const RoadmapCanvas = ({
  milestones,
  onMilestonesChange,
  onSaveContentBubble,
  onDeleteContentBubble,
  onSaveInteraction,
  onDeleteInteraction,
  onSaveQuizzes,
  onSaveFlashcards,
  onSaveIOWEntries,
  onSaveSummary,
  onGenerateBubbleSummary,
  onRequestMilestone,
  onDemoModeRedirect,
}: RoadmapCanvasProps) => {
  const { isGenerating: isGeneratingBubble } = useGenerationManager();
  const dragMenuRef = useRef<DragMenuRef>(null);

  // Content modal state
  const [contentModalState, setContentModalState] = useState<{
    isOpen: boolean;
    milestoneId?: string;
    milestoneTitle?: string;
    milestoneDescription?: string;
    suggestedTopic?: string;
    previousTopic?: string;
    orderIndex?: number;
  } | null>(null);

  // Data mutations and content generation (moved up to use in drag & drop)
  const {
    addingContentTo,
    generatingBubbles,
    toggleMilestone,
    saveMilestone,
    addContentBubble,
    generateContentForBubble,
    generateFirstContent,
    createContentBubbleFromModal,
    saveContentBubble,
    handleDropOnBubble,
    handleTrashDrop,
    saveQuizzes,
    saveFlashcards,
    saveIOWEntries,
    saveSummary,
  } = useRoadmapData({
    milestones,
    onMilestonesChange,
    onSaveContentBubble,
    onDeleteContentBubble,
    onSaveInteraction,
    onDeleteInteraction,
    onSaveQuizzes,
    onSaveFlashcards,
    onSaveIOWEntries,
    onSaveSummary,
    onDemoModeRedirect,
  });

  // Drag & Drop management
  const {
    draggingBubble,
    draggingExisting,
    dropTarget,
    isDraggingExisting,
    handleDragStart,
    handleExistingBubbleDragStart,
    handleDragEnd,
    handleDragOver,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    handleExistingBubbleTouchStart,
  } = useDragAndDrop({
    onExistingBubbleTouchDrop: async (draggingExisting, isTrash) => {
      if (isTrash && draggingExisting) {
        await handleTrashDrop(draggingExisting);
      }
    },
    onExistingBubbleDragStart: () => {
      // Auto-expand menu when dragging existing bubble
      dragMenuRef.current?.expand();
    },
  });

  // Modal management
  const {
    modalState,
    openContentModal,
    openFlashcardModal,
    openQuizModal,
    openIOWModal,
    openSummaryModal,
    openMilestoneModal,
    openHelpModal,
    closeModal,
  } = useRoadmapModals();

  // Handle desktop drop
  const handleDrop = async (e: React.DragEvent, milestoneId: string, contentBubbleId: string) => {
    e.preventDefault();
    if (draggingBubble) {
      await handleDropOnBubble(draggingBubble, milestoneId, contentBubbleId);
    }
    handleDragEnd();
  };

  // Handle touch drop
  const handleTouchEndWrapper = async (e: React.TouchEvent) => {
    const touchDropData = handleTouchEnd(e);

    if (touchDropData === 'trash' && draggingExisting) {
      // Handle trash drop
      await handleTrashDrop(draggingExisting);
    } else if (touchDropData && touchDropData !== 'trash' && draggingBubble) {
      // Handle content bubble drop
      await handleDropOnBubble(
        draggingBubble,
        touchDropData.milestoneId,
        touchDropData.contentBubbleId
      );
    }
  };

  // Handle trash drop
  const handleTrashDropWrapper = async () => {
    if (draggingExisting) {
      await handleTrashDrop(draggingExisting);
    }
    handleDragEnd();
  };

  // Handle bubble click to open appropriate modal
  const handleBubbleClick = async (type: BubbleType, bubble: Bubble | ContentBubble) => {
    logger.debug('[RoadmapCanvas] handleBubbleClick called', { type, bubbleId: bubble.id, timestamp: Date.now() });

    // Find milestone and content bubble for this interaction
    let milestoneId = "";
    let contentBubbleId = "";

    if (type === "content") {
      const contentBubble = bubble as ContentBubble;
      const milestone = milestones.find((m) =>
        m.contentBubbles.some((cb) => cb.id === contentBubble.id)
      );
      if (milestone) {
        milestoneId = milestone.id;
        // Look up fresh content bubble from current state
        const freshContentBubble = milestone.contentBubbles.find((cb) => cb.id === contentBubble.id);
        if (!freshContentBubble) return;

        // If content is not generated yet, trigger generation
        if (!freshContentBubble.content) {
          await generateContentForBubble(milestone, freshContentBubble);
        } else {
          // Only open modal if content is already generated
          openContentModal(milestoneId, freshContentBubble);
        }
      }
      return;
    }

    // For interaction bubbles, find parent content bubble and fresh interaction data
    const bubbleId = bubble.id;
    let freshInteraction: Bubble | undefined;

    for (const m of milestones) {
      const cb = m.contentBubbles.find((cb) =>
        cb.interactions.some((i) => i.id === bubbleId)
      );
      if (cb) {
        milestoneId = m.id;
        contentBubbleId = cb.id;
        // IMPORTANT: Get fresh interaction data from current state
        freshInteraction = cb.interactions.find((i) => i.id === bubbleId);
        break;
      }
    }

    if (!freshInteraction) {
      console.error('[RoadmapCanvas] Could not find interaction in current state');
      return;
    }

    logger.debug('[RoadmapCanvas] Opening modal with fresh data:', {
      type,
      bubbleId: freshInteraction.id,
      quizCount: freshInteraction.quizzes?.length || 0,
      flashcardCount: freshInteraction.flashcards?.length || 0,
      iowCount: freshInteraction.iowEntries?.length || 0
    });

    // Open appropriate modal based on type
    switch (type) {
      case "flashcard":
        openFlashcardModal(milestoneId, contentBubbleId, freshInteraction);
        break;
      case "quiz":
        openQuizModal(milestoneId, contentBubbleId, freshInteraction);
        break;
      case "iow":
        openIOWModal(milestoneId, contentBubbleId, freshInteraction);
        break;
      case "summary": {
        const summaryData = freshInteraction.summaryData;
        openSummaryModal(milestoneId, contentBubbleId, summaryData);
        break;
      }
      case "help":
        openHelpModal();
        break;
    }
  };

  // Modal save handlers
  const handleSaveContentBubble = async (title: string, content: string) => {
    if (modalState.type !== "content") return;
    const bubbleId = modalState.bubble?.id;
    if (!bubbleId) return;
    await saveContentBubble(title, content, modalState.milestoneId, bubbleId);
    closeModal();
  };

  const handleSaveQuizzes = async (quizzes: QuizQuestion[], shouldSummarize?: boolean, bubbleIdFromBackground?: string) => {
    // Allow background saves to proceed even if modal type doesn't match
    // (user may have opened a different modal while generation was running)
    if (bubbleIdFromBackground) {
      logger.debug('[RoadmapCanvas] Background save for quiz:', { bubbleIdFromBackground, quizCount: quizzes.length });
      // Background save - find the correct milestone/content bubble for this interaction
      let targetMilestoneId = "";
      let targetContentBubbleId = "";

      for (const m of milestones) {
        for (const cb of m.contentBubbles) {
          if (cb.interactions.some(i => i.id === bubbleIdFromBackground)) {
            targetMilestoneId = m.id;
            targetContentBubbleId = cb.id;
            break;
          }
        }
        if (targetMilestoneId) break;
      }

      logger.debug('[RoadmapCanvas] Found target:', { targetMilestoneId, targetContentBubbleId });

      if (targetMilestoneId && targetContentBubbleId) {
        await saveQuizzes(
          targetMilestoneId,
          targetContentBubbleId,
          bubbleIdFromBackground,
          quizzes,
          shouldSummarize
        );
        logger.debug('[RoadmapCanvas] Background save completed');
      } else {
        console.error('[RoadmapCanvas] Could not find milestone/content bubble for background save');
      }
      // NEVER close modal for background saves
      return;
    }

    // Normal save from modal - proceed as usual
    if (modalState.type !== "quiz") return;
    await saveQuizzes(
      modalState.milestoneId,
      modalState.contentBubbleId,
      modalState.bubble.id,
      quizzes,
      shouldSummarize
    );
    closeModal();
  };

  const handleSaveFlashcards = async (flashcards: FlashcardEntry[], shouldSummarize?: boolean, bubbleIdFromBackground?: string) => {
    // Allow background saves to proceed even if modal type doesn't match
    if (bubbleIdFromBackground) {
      let targetMilestoneId = "";
      let targetContentBubbleId = "";

      for (const m of milestones) {
        for (const cb of m.contentBubbles) {
          if (cb.interactions.some(i => i.id === bubbleIdFromBackground)) {
            targetMilestoneId = m.id;
            targetContentBubbleId = cb.id;
            break;
          }
        }
        if (targetMilestoneId) break;
      }

      if (targetMilestoneId && targetContentBubbleId) {
        await saveFlashcards(
          targetMilestoneId,
          targetContentBubbleId,
          bubbleIdFromBackground,
          flashcards,
          shouldSummarize
        );
      }
      // NEVER close modal for background saves
      return;
    }

    // Normal save from modal
    if (modalState.type !== "flashcard") return;
    await saveFlashcards(
      modalState.milestoneId,
      modalState.contentBubbleId,
      modalState.bubble.id,
      flashcards,
      shouldSummarize
    );
    closeModal();
  };

  const handleSaveIOWEntries = async (entries: IOWEntry[], shouldSummarize?: boolean, bubbleIdFromBackground?: string) => {
    // Allow background saves to proceed even if modal type doesn't match
    if (bubbleIdFromBackground) {
      let targetMilestoneId = "";
      let targetContentBubbleId = "";

      for (const m of milestones) {
        for (const cb of m.contentBubbles) {
          if (cb.interactions.some(i => i.id === bubbleIdFromBackground)) {
            targetMilestoneId = m.id;
            targetContentBubbleId = cb.id;
            break;
          }
        }
        if (targetMilestoneId) break;
      }

      if (targetMilestoneId && targetContentBubbleId) {
        await saveIOWEntries(
          targetMilestoneId,
          targetContentBubbleId,
          bubbleIdFromBackground,
          entries,
          shouldSummarize
        );
      }
      // NEVER close modal for background saves
      return;
    }

    // Normal save from modal
    if (modalState.type !== "iow") return;
    await saveIOWEntries(
      modalState.milestoneId,
      modalState.contentBubbleId,
      modalState.bubble.id,
      entries,
      shouldSummarize
    );
    closeModal();
  };

  const handleSaveSummary = async (summary: SummaryData) => {
    if (modalState.type !== "summary") return;
    await saveSummary(modalState.milestoneId, modalState.contentBubbleId, summary);
    closeModal();
  };

  const handleSaveMilestone = (title: string, description: string) => {
    if (modalState.type !== "milestone") return;
    saveMilestone(title, description, modalState.milestone.id);
    closeModal();
  };

  // Handle content modal
  const handleGenerateFirstContent = (milestone: Milestone) => {
    const modalContext = generateFirstContent(milestone);
    if (modalContext) {
      setContentModalState({
        isOpen: true,
        ...modalContext,
      });
    }
  };

  const handleAddContent = (milestoneId: string) => {
    const modalContext = addContentBubble(milestoneId);
    if (modalContext) {
      setContentModalState({
        isOpen: true,
        ...modalContext,
      });
    }
  };

  const handleContentCreated = async (bubble: ContentBubble, shouldGenerate: boolean = false) => {
    const milestone = milestones.find((m) => m.id === bubble.parentId);
    if (!milestone) return;

    // Create and save the empty bubble first
    await createContentBubbleFromModal(bubble);

    // Close modal immediately (user can continue working)
    setContentModalState(null);

    // If we should generate content, start background generation
    if (shouldGenerate) {
      // Build the updated milestone with the new bubble
      const updatedMilestone = {
        ...milestone,
        contentBubbles: [...milestone.contentBubbles, bubble],
      };

      // Build the updated milestones array
      const updatedMilestones = milestones.map((m) =>
        m.id === bubble.parentId ? updatedMilestone : m
      );

      // Generate content in the background (user can continue working)
      generateContentForBubble(updatedMilestone, bubble, updatedMilestones);
    }
  };

  return (
    <div className="relative min-h-screen pb-32">
      <DragMenu
        ref={dragMenuRef}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEndWrapper}
        onTrashDrop={handleTrashDropWrapper}
        isDraggingExisting={isDraggingExisting}
      />

      <FeedbackButton />

      <div className="flex flex-col items-center pt-8 px-4">
        {milestones.map((milestone, mIndex) => (
          <MilestoneSection
            key={milestone.id}
            milestone={milestone}
            milestoneIndex={mIndex}
            isGeneratingBubble={(bubbleId) => isGeneratingBubble(bubbleId) || generatingBubbles.has(bubbleId)}
            addingContentTo={addingContentTo}
            dropTarget={dropTarget}
            onToggle={() => toggleMilestone(milestone.id)}
            onMilestoneClick={() => openMilestoneModal(milestone)}
            onGenerateFirst={() => handleGenerateFirstContent(milestone)}
            onAddContent={() => handleAddContent(milestone.id)}
            onBubbleClick={handleBubbleClick}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onDragStart={handleExistingBubbleDragStart}
            onDragEnd={handleDragEnd}
            onTouchStart={handleExistingBubbleTouchStart}
          />
        ))}

        {/* Add Milestone Button */}
        {onRequestMilestone && (
          <div className="mt-16">
            <Button onClick={onRequestMilestone} variant="outline" size="lg">
              Request New Milestone
            </Button>
          </div>
        )}
      </div>

      {/* All Modals */}
      <RoadmapModals
        modalState={modalState}
        milestones={milestones}
        onClose={closeModal}
        onSaveContentBubble={handleSaveContentBubble}
        onSaveQuizzes={handleSaveQuizzes}
        onSaveFlashcards={handleSaveFlashcards}
        onSaveIOWEntries={handleSaveIOWEntries}
        onSaveSummary={handleSaveSummary}
        onSaveMilestone={handleSaveMilestone}
        onGenerateBubbleSummary={onGenerateBubbleSummary}
      />

      {/* Request Content Modal */}
      {contentModalState?.isOpen && (
        <RequestContentModal
          milestoneId={contentModalState.milestoneId!}
          milestoneTitle={contentModalState.milestoneTitle!}
          milestoneDescription={contentModalState.milestoneDescription}
          suggestedTopic={contentModalState.suggestedTopic!}
          previousTopic={contentModalState.previousTopic}
          orderIndex={contentModalState.orderIndex!}
          isOpen={contentModalState.isOpen}
          onClose={() => setContentModalState(null)}
          onContentCreated={handleContentCreated}
        />
      )}
    </div>
  );
};

export default RoadmapCanvas;
