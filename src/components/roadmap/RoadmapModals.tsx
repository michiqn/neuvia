import { useMemo } from "react";
import { Milestone, QuizQuestion, FlashcardEntry, IOWEntry, SummaryData, GeneratedBubbleSummary } from "@/types/learning";
import ContentBubbleModal from "./ContentBubbleModal";
import FlashcardBubbleModal from "./FlashcardBubbleModal";
import QuizBubbleModal from "./QuizBubbleModal";
import IOWBubbleModal from "./IOWBubbleModal";
import SummaryBubbleModal from "./SummaryBubbleModal";
import MilestoneModal from "./MilestoneModal";
import HelpBubbleModal from "./HelpBubbleModal";
import { ModalState } from "./hooks/useRoadmapModals";

interface RoadmapModalsProps {
  modalState: ModalState;
  milestones: Milestone[];
  onClose: () => void;
  onSaveContentBubble: (title: string, content: string) => void;
  onSaveQuizzes: (quizzes: QuizQuestion[], shouldSummarize?: boolean, bubbleIdFromBackground?: string) => void;
  onSaveFlashcards: (flashcards: FlashcardEntry[], shouldSummarize?: boolean, bubbleIdFromBackground?: string) => void;
  onSaveIOWEntries: (entries: IOWEntry[], shouldSummarize?: boolean, bubbleIdFromBackground?: string) => void;
  onSaveSummary: (summary: SummaryData) => void;
  onSaveMilestone: (title: string, description: string) => void;
  onGenerateBubbleSummary?: (contentBubbleId: string) => Promise<GeneratedBubbleSummary | null>;
}

export default function RoadmapModals({
  modalState,
  milestones,
  onClose,
  onSaveContentBubble,
  onSaveQuizzes,
  onSaveFlashcards,
  onSaveIOWEntries,
  onSaveSummary,
  onSaveMilestone,
  onGenerateBubbleSummary,
}: RoadmapModalsProps) {
  // Memoized context helpers
  const flashcardContentContext = useMemo(() => {
    if (modalState.type !== "flashcard") return "";
    return milestones
      .find((m) => m.id === modalState.milestoneId)
      ?.contentBubbles.find((cb) => cb.id === modalState.contentBubbleId)
      ?.content;
  }, [modalState, milestones]);

  const quizContentContext = useMemo(() => {
    if (modalState.type !== "quiz") return "";
    return milestones
      .find((m) => m.id === modalState.milestoneId)
      ?.contentBubbles.find((cb) => cb.id === modalState.contentBubbleId)
      ?.content;
  }, [modalState, milestones]);

  const iowContentContext = useMemo(() => {
    if (modalState.type !== "iow") return "";
    return milestones
      .find((m) => m.id === modalState.milestoneId)
      ?.contentBubbles.find((cb) => cb.id === modalState.contentBubbleId)
      ?.content;
  }, [modalState, milestones]);

  return (
    <>
      {/* Content Modal */}
      {modalState.type === "content" && (
        <ContentBubbleModal
          isOpen={true}
          bubble={modalState.bubble}
          onClose={onClose}
          onSave={onSaveContentBubble}
        />
      )}

      {/* Flashcard Modal */}
      {modalState.type === "flashcard" && (
        <FlashcardBubbleModal
          isOpen={true}
          onClose={onClose}
          flashcards={modalState.bubble.flashcards ?? []}
          bubbleId={modalState.bubble.id}
          contentBubbleId={modalState.contentBubbleId}
          onSave={onSaveFlashcards}
          categories={["General", "Key Concepts", "Definitions", "Formulas", "Examples"]}
          contentContext={flashcardContentContext}
        />
      )}

      {/* Quiz Modal */}
      {modalState.type === "quiz" && (
        <QuizBubbleModal
          isOpen={true}
          quizzes={modalState.bubble.quizzes ?? []}
          bubbleId={modalState.bubble.id}
          contentBubbleId={modalState.contentBubbleId}
          onClose={onClose}
          onSave={onSaveQuizzes}
          contentContext={quizContentContext}
        />
      )}

      {/* IOW Modal */}
      {modalState.type === "iow" && (
        <IOWBubbleModal
          isOpen={true}
          entries={modalState.bubble.iowEntries ?? []}
          bubbleId={modalState.bubble.id}
          contentBubbleId={modalState.contentBubbleId}
          onClose={onClose}
          onSave={onSaveIOWEntries}
          contentContext={iowContentContext}
        />
      )}

      {/* Summary Modal */}
      {modalState.type === "summary" && (
        <SummaryBubbleModal
          isOpen={true}
          summary={modalState.summary}
          contentBubbleId={modalState.contentBubbleId}
          onClose={onClose}
          onSave={onSaveSummary}
          onGenerateSummary={onGenerateBubbleSummary}
        />
      )}

      {/* Milestone Modal */}
      {modalState.type === "milestone" && (
        <MilestoneModal
          milestone={modalState.milestone}
          onClose={onClose}
          onSave={onSaveMilestone}
        />
      )}

      {/* Help Modal */}
      {modalState.type === "help" && (
        <HelpBubbleModal
          isOpen={true}
          onClose={onClose}
        />
      )}
    </>
  );
}
