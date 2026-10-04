import { logger } from "@/lib/logger";
import { useState, useRef } from "react";
import { Milestone, ContentBubble, Bubble, SummaryData } from "@/types/learning";

// Discriminated union for modal state
export type ModalState =
  | { type: "closed" }
  | {
      type: "content";
      milestoneId: string;
      bubble?: ContentBubble;
    }
  | {
      type: "flashcard";
      milestoneId: string;
      contentBubbleId: string;
      bubble: Bubble;
    }
  | {
      type: "quiz";
      milestoneId: string;
      contentBubbleId: string;
      bubble: Bubble;
    }
  | {
      type: "iow";
      milestoneId: string;
      contentBubbleId: string;
      bubble: Bubble;
    }
  | {
      type: "summary";
      milestoneId: string;
      contentBubbleId: string;
      summary?: SummaryData;
    }
  | {
      type: "milestone";
      milestone: Milestone;
    }
  | {
      type: "help";
    };

export function useRoadmapModals() {
  const [modalState, setModalState] = useState<ModalState>({ type: "closed" });
  const lastOpenTimeRef = useRef<number>(0);
  const MODAL_OPEN_DEBOUNCE = 1000; // Prevent closing for 1000ms after opening (mobile touch fix)

  const openContentModal = (milestoneId: string, bubble?: ContentBubble) => {
    lastOpenTimeRef.current = Date.now();
    setModalState({ type: "content", milestoneId, bubble });
  };

  const openFlashcardModal = (
    milestoneId: string,
    contentBubbleId: string,
    bubble: Bubble
  ) => {
    logger.debug('[useRoadmapModals] openFlashcardModal called', { bubbleId: bubble.id, timestamp: Date.now() });
    lastOpenTimeRef.current = Date.now();
    setModalState({ type: "flashcard", milestoneId, contentBubbleId, bubble });
  };

  const openQuizModal = (
    milestoneId: string,
    contentBubbleId: string,
    bubble: Bubble
  ) => {
    logger.debug('[useRoadmapModals] openQuizModal called', { bubbleId: bubble.id, timestamp: Date.now() });
    lastOpenTimeRef.current = Date.now();
    setModalState({ type: "quiz", milestoneId, contentBubbleId, bubble });
  };

  const openIOWModal = (
    milestoneId: string,
    contentBubbleId: string,
    bubble: Bubble
  ) => {
    logger.debug('[useRoadmapModals] openIOWModal called', { bubbleId: bubble.id, timestamp: Date.now() });
    lastOpenTimeRef.current = Date.now();
    setModalState({ type: "iow", milestoneId, contentBubbleId, bubble });
  };

  const openSummaryModal = (
    milestoneId: string,
    contentBubbleId: string,
    summary?: SummaryData
  ) => {
    lastOpenTimeRef.current = Date.now();
    setModalState({ type: "summary", milestoneId, contentBubbleId, summary });
  };

  const openMilestoneModal = (milestone: Milestone) => {
    lastOpenTimeRef.current = Date.now();
    setModalState({ type: "milestone", milestone });
  };

  const openHelpModal = () => {
    lastOpenTimeRef.current = Date.now();
    setModalState({ type: "help" });
  };

  const closeModal = () => {
    // Prevent closing if modal was just opened (debounce to avoid accidental closes from touch events)
    const timeSinceOpen = Date.now() - lastOpenTimeRef.current;
    if (timeSinceOpen < MODAL_OPEN_DEBOUNCE) {
      logger.debug('[useRoadmapModals] closeModal blocked - too soon after opening', {
        timeSinceOpen,
        timestamp: Date.now()
      });
      return;
    }
    logger.debug('[useRoadmapModals] closeModal called', { timestamp: Date.now(), stack: new Error().stack });
    setModalState({ type: "closed" });
  };

  return {
    modalState,
    openContentModal,
    openFlashcardModal,
    openQuizModal,
    openIOWModal,
    openSummaryModal,
    openMilestoneModal,
    openHelpModal,
    closeModal,
  };
}
