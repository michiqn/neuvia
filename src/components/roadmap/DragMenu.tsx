import { useState, useEffect, forwardRef, useImperativeHandle, useRef } from "react";
import { createPortal } from "react-dom";
import { Trash2, ChevronDown, ChevronUp, X } from "lucide-react";
import { BubbleType, BUBBLE_CONFIG } from "@/types/learning";
import BubbleNode from "./BubbleNode";

interface DragMenuProps {
  onDragStart: (type: BubbleType, e: React.DragEvent) => void;
  onDragEnd: () => void;
  onTouchStart?: (type: BubbleType, e: React.TouchEvent) => void;
  onTouchMove?: (e: React.TouchEvent) => void;
  onTouchEnd?: (e: React.TouchEvent) => void;
  onTrashDrop?: () => void;
  isDraggingExisting?: boolean;
}

export interface DragMenuRef {
  expand: () => void;
}

const DragMenu = forwardRef<DragMenuRef, DragMenuProps>(({
  onDragStart,
  onDragEnd,
  onTouchStart,
  onTouchMove,
  onTouchEnd,
  onTrashDrop,
  isDraggingExisting
}, ref) => {
  const interactionBubbles: BubbleType[] = ["quiz", "iow", "flashcard", "summary", "help"];
  const [isExpanded, setIsExpanded] = useState(false);
  const [showQuizTooltip, setShowQuizTooltip] = useState(false);
  const [showIOWTooltip, setShowIOWTooltip] = useState(false);
  const [showFlashcardTooltip, setShowFlashcardTooltip] = useState(false);
  const [showSummaryTooltip, setShowSummaryTooltip] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const autoCloseTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Expose expand method to parent
  useImperativeHandle(ref, () => ({
    expand: () => setIsExpanded(true)
  }));

  // Auto-collapse on scroll (mobile only) - with smooth delay
  useEffect(() => {
    let scrollTimeout: NodeJS.Timeout | null = null;
    let lastScrollY = window.scrollY;
    const SCROLL_THRESHOLD = 50; // pixels to scroll before closing

    const handleScroll = () => {
      if (!isExpanded || window.innerWidth >= 768) return;

      const currentScrollY = window.scrollY;
      const scrollDelta = Math.abs(currentScrollY - lastScrollY);

      // Only close if scrolled more than threshold
      if (scrollDelta > SCROLL_THRESHOLD) {
        // Clear any existing timeout
        if (scrollTimeout) {
          clearTimeout(scrollTimeout);
        }

        // Smooth delay before closing (300ms)
        scrollTimeout = setTimeout(() => {
          setIsExpanded(false);
          lastScrollY = window.scrollY;
        }, 300);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (scrollTimeout) {
        clearTimeout(scrollTimeout);
      }
    };
  }, [isExpanded]);

  // Auto-close tooltips after 30 seconds
  useEffect(() => {
    if (showQuizTooltip || showIOWTooltip || showFlashcardTooltip || showSummaryTooltip) {
      autoCloseTimeoutRef.current = setTimeout(() => {
        setShowQuizTooltip(false);
        setShowIOWTooltip(false);
        setShowFlashcardTooltip(false);
        setShowSummaryTooltip(false);
      }, 30000);
    }

    return () => {
      if (autoCloseTimeoutRef.current) {
        clearTimeout(autoCloseTimeoutRef.current);
      }
    };
  }, [showQuizTooltip, showIOWTooltip, showFlashcardTooltip, showSummaryTooltip]);

  // Click outside to close tooltips
  useEffect(() => {
    if (!showQuizTooltip && !showIOWTooltip && !showFlashcardTooltip && !showSummaryTooltip) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (tooltipRef.current && !tooltipRef.current.contains(e.target as Node)) {
        const target = e.target as HTMLElement;
        const clickedBubble = target.closest('[data-bubble-type]');

        if (!clickedBubble) {
          setShowQuizTooltip(false);
          setShowIOWTooltip(false);
          setShowFlashcardTooltip(false);
          setShowSummaryTooltip(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showQuizTooltip, showIOWTooltip, showFlashcardTooltip, showSummaryTooltip]);

  const handleQuizBubbleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowQuizTooltip(prev => !prev);
    setShowIOWTooltip(false);
    setShowFlashcardTooltip(false);
    setShowSummaryTooltip(false);
  };

  const handleIOWBubbleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowIOWTooltip(prev => !prev);
    setShowQuizTooltip(false);
    setShowFlashcardTooltip(false);
    setShowSummaryTooltip(false);
  };

  const handleFlashcardBubbleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowFlashcardTooltip(prev => !prev);
    setShowQuizTooltip(false);
    setShowIOWTooltip(false);
    setShowSummaryTooltip(false);
  };

  const handleSummaryBubbleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowSummaryTooltip(prev => !prev);
    setShowQuizTooltip(false);
    setShowIOWTooltip(false);
    setShowFlashcardTooltip(false);
  };

  const getBubbleClickHandler = (type: BubbleType) => {
    switch (type) {
      case "quiz": return handleQuizBubbleClick;
      case "iow": return handleIOWBubbleClick;
      case "flashcard": return handleFlashcardBubbleClick;
      case "summary": return handleSummaryBubbleClick;
      default: return undefined;
    }
  };

  const getTooltipText = (type: BubbleType) => {
    switch (type) {
      case "quiz":
        return "This is a quiz, drag and drop it onto a content bubble, to create a new quiz bubble and interact with your learning content.";
      case "iow":
        return "This is an In Own Words exercise, drag and drop it onto a content bubble, to create a new IOW bubble and practice explaining concepts in your own words.";
      case "flashcard":
        return "This is a flashcard, drag and drop it onto a content bubble, to create a new flashcard bubble and memorize key information.";
      case "summary":
        return "This is a summary, drag and drop it onto a content bubble, to create a new summary bubble and review the key takeaways of your learning.";
      default:
        return "";
    }
  };

  const isTooltipVisible = (type: BubbleType) => {
    switch (type) {
      case "quiz": return showQuizTooltip;
      case "iow": return showIOWTooltip;
      case "flashcard": return showFlashcardTooltip;
      case "summary": return showSummaryTooltip;
      default: return false;
    }
  };

  const closeTooltip = (type: BubbleType) => {
    switch (type) {
      case "quiz": setShowQuizTooltip(false); break;
      case "iow": setShowIOWTooltip(false); break;
      case "flashcard": setShowFlashcardTooltip(false); break;
      case "summary": setShowSummaryTooltip(false); break;
    }
  };

  const getBubbleColorClasses = (type: BubbleType) => {
    const colors = {
      quiz: { border: "border-bubble-quiz", arrow: "border-l-bubble-quiz" },
      iow: { border: "border-bubble-iow", arrow: "border-l-bubble-iow" },
      flashcard: { border: "border-bubble-flashcard", arrow: "border-l-bubble-flashcard" },
      summary: { border: "border-bubble-summary", arrow: "border-l-bubble-summary" },
      help: { border: "border-bubble-help", arrow: "border-l-bubble-help" },
      content: { border: "border-bubble-content", arrow: "border-l-bubble-content" },
    };
    return colors[type];
  };

  // Get the currently active tooltip type
  const getActiveTooltip = (): BubbleType | null => {
    if (showQuizTooltip) return "quiz";
    if (showIOWTooltip) return "iow";
    if (showFlashcardTooltip) return "flashcard";
    if (showSummaryTooltip) return "summary";
    return null;
  };

  const activeTooltip = getActiveTooltip();

  const handleTrashDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleTrashDrop = (e: React.DragEvent) => {
    e.preventDefault();
    onTrashDrop?.();
  };

  return (
    <>
    <aside className="fixed right-6 top-1/2 -translate-y-1/2 z-40">
      <div className="bg-card/90 backdrop-blur-md border-2 border-border rounded-2xl shadow-soft transition-all duration-300">
        {/* Mobile: Collapsible */}
        <div className="md:hidden">
          {isExpanded ? (
            // Expanded State
            <div className="p-3">
              <div className="flex flex-col gap-3">
                {/* Collapse Button */}
                <button
                  onClick={() => setIsExpanded(false)}
                  className="flex items-center justify-center w-14 h-14 rounded-full bg-primary/10 hover:bg-primary/20 transition-colors"
                >
                  <ChevronUp className="w-6 h-6 text-primary" />
                </button>

                {interactionBubbles.map((type) => (
                  <div
                    key={type}
                    data-bubble-type={type}
                    draggable
                    onDragStart={(e) => onDragStart(type, e)}
                    onDragEnd={onDragEnd}
                    onTouchStart={(e) => onTouchStart?.(type, e)}
                    onTouchMove={onTouchMove}
                    onTouchEnd={onTouchEnd}
                    className="drag-menu-item cursor-grab active:cursor-grabbing touch-none relative"
                  >
                    <BubbleNode
                      type={type}
                      size="md"
                      onClick={getBubbleClickHandler(type)}
                    />
                  </div>
                ))}

                {/* Separator */}
                <div className="w-full h-px bg-border my-1" />

                {/* Trash Drop Zone */}
                <div
                  data-trash-zone="true"
                  onDragOver={handleTrashDragOver}
                  onDrop={handleTrashDrop}
                  className={`flex items-center justify-center w-12 h-12 mx-auto rounded-xl border-2 border-dashed transition-all duration-200 ${
                    isDraggingExisting
                      ? "border-destructive bg-destructive/10 scale-110"
                      : "border-muted-foreground/30 bg-muted/30"
                  }`}
                >
                  <Trash2
                    className={`w-5 h-5 transition-colors ${
                      isDraggingExisting ? "text-destructive" : "text-muted-foreground"
                    }`}
                  />
                </div>
              </div>
            </div>
          ) : (
            // Collapsed State
            <div className="p-3">
              <button
                onClick={() => setIsExpanded(true)}
                className="flex items-center justify-center w-14 h-14 rounded-full bg-primary/10 hover:bg-primary/20 transition-colors"
              >
                <ChevronDown className="w-6 h-6 text-primary" />
              </button>
            </div>
          )}
        </div>

        {/* Desktop: Always Expanded */}
        <div className="hidden md:block p-3">
          <div className="flex flex-col gap-3">
            {interactionBubbles.map((type) => (
              <div
                key={type}
                data-bubble-type={type}
                draggable
                onDragStart={(e) => onDragStart(type, e)}
                onDragEnd={onDragEnd}
                onTouchStart={(e) => onTouchStart?.(type, e)}
                onTouchMove={onTouchMove}
                onTouchEnd={onTouchEnd}
                className="drag-menu-item cursor-grab active:cursor-grabbing touch-none relative"
              >
                <BubbleNode
                  type={type}
                  size="md"
                  onClick={getBubbleClickHandler(type)}
                />
              </div>
            ))}

            {/* Separator */}
            <div className="w-full h-px bg-border my-1" />

            {/* Trash Drop Zone */}
            <div
              data-trash-zone="true"
              onDragOver={handleTrashDragOver}
              onDrop={handleTrashDrop}
              className={`flex items-center justify-center w-12 h-12 mx-auto rounded-xl border-2 border-dashed transition-all duration-200 ${
                isDraggingExisting
                  ? "border-destructive bg-destructive/10 scale-110"
                  : "border-muted-foreground/30 bg-muted/30"
              }`}
            >
              <Trash2
                className={`w-5 h-5 transition-colors ${
                  isDraggingExisting ? "text-destructive" : "text-muted-foreground"
                }`}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Label - only show on desktop or when collapsed on mobile */}
      <p className={`text-center mt-3 text-lg text-muted-foreground font-handwritten ${isExpanded ? 'md:block hidden' : 'block'}`}>
        Menu
      </p>
    </aside>

    {/* Tooltip rendered via portal to escape transform context */}
    {activeTooltip && createPortal(
      <div
        ref={tooltipRef}
        className="fixed left-4 right-4 bottom-20 z-[9999] animate-fade-in md:fixed md:right-28 md:left-auto md:bottom-auto md:top-1/2 md:-translate-y-1/2 md:w-[280px]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className={`relative bg-card border-2 ${getBubbleColorClasses(activeTooltip).border} rounded-xl shadow-lg p-4`}>
          <button
            onClick={() => closeTooltip(activeTooltip)}
            className="absolute top-2 right-2 p-1 hover:bg-muted rounded-full transition-colors"
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
          <p className="text-sm leading-relaxed pr-6">
            {getTooltipText(activeTooltip)}
          </p>
        </div>
      </div>,
      document.body
    )}
    </>
  );
});

DragMenu.displayName = "DragMenu";

export default DragMenu;
