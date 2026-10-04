import { useState, useRef, useEffect } from "react";
import { BubbleType } from "@/types/learning";

interface DraggingExisting {
  milestoneId: string;
  contentBubbleId: string;
  interactionId?: string;
}

interface UseDragAndDropProps {
  onExistingBubbleTouchDrop?: (draggingExisting: DraggingExisting | null, isTrash: boolean) => Promise<void>;
  onExistingBubbleDragStart?: () => void;
}

export function useDragAndDrop(props?: UseDragAndDropProps) {
  const { onExistingBubbleTouchDrop, onExistingBubbleDragStart } = props || {};
  const [draggingBubble, setDraggingBubble] = useState<BubbleType | null>(null);
  const [draggingExisting, setDraggingExisting] = useState<DraggingExisting | null>(null);
  const [dropTarget, setDropTarget] = useState<string | null>(null);
  const touchMoveListenerRef = useRef<((e: TouchEvent) => void) | null>(null);
  const touchEndListenerRef = useRef<((e: TouchEvent) => void) | null>(null);
  const touchStartRef = useRef<{ x: number; y: number; type?: BubbleType; existing?: DraggingExisting } | null>(null);
  const dragStartedRef = useRef<boolean>(false);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const longPressTriggeredRef = useRef<boolean>(false);
  const DRAG_THRESHOLD = 10; // pixels of movement before drag starts
  const LONG_PRESS_DELAY = 300; // ms to hold before drag is enabled

  // Cleanup all touch listeners on unmount
  useEffect(() => {
    return () => {
      cleanupTouchListeners();
    };
  }, []);

  // Centralized cleanup for all touch listeners
  const cleanupTouchListeners = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    if (touchMoveListenerRef.current) {
      document.removeEventListener('touchmove', touchMoveListenerRef.current);
      touchMoveListenerRef.current = null;
    }
    if (touchEndListenerRef.current) {
      document.removeEventListener('touchend', touchEndListenerRef.current);
      document.removeEventListener('touchcancel', touchEndListenerRef.current);
      touchEndListenerRef.current = null;
    }
    // Remove drag ghost if present
    const dragGhost = document.getElementById("drag-ghost");
    if (dragGhost) {
      dragGhost.remove();
    }
  };

  // Desktop drag handlers
  const handleDragStart = (type: BubbleType, e?: React.DragEvent) => {
    setDraggingBubble(type);

    // Set custom drag image for Safari compatibility
    if (e?.dataTransfer) {
      // Create an off-screen element for the drag image
      const dragImage = document.createElement("div");
      dragImage.style.cssText = `
        position: absolute;
        top: -1000px;
        left: -1000px;
        width: 60px;
        height: 60px;
        border-radius: 50%;
        background-color: ${BUBBLE_COLORS[type]};
        opacity: 0.9;
      `;
      document.body.appendChild(dragImage);

      // Set the custom drag image
      e.dataTransfer.setDragImage(dragImage, 30, 30);

      // Remove the element after a short delay
      setTimeout(() => {
        dragImage.remove();
      }, 0);
    }
  };

  const handleExistingBubbleDragStart = (
    milestoneId: string,
    contentBubbleId: string,
    interactionId?: string
  ) => {
    setDraggingExisting({ milestoneId, contentBubbleId, interactionId });
    // Notify parent to expand menu (so user can see trash zone)
    onExistingBubbleDragStart?.();
  };

  const handleDragEnd = () => {
    setDraggingBubble(null);
    setDraggingExisting(null);
    setDropTarget(null);
    touchStartRef.current = null;
    dragStartedRef.current = false;
    longPressTriggeredRef.current = false;
    cleanupTouchListeners();
  };

  const handleDragOver = (e: React.DragEvent, contentId: string) => {
    e.preventDefault();
    setDropTarget(contentId);
  };

  // Bubble colors for drag ghost - Neuvia brand colors (varied palette)
  const BUBBLE_COLORS: Record<BubbleType, string> = {
    content: "#f7930f",    // Orange 1 - Main learning content
    quiz: "#020062",       // Dark Blue - Testing knowledge
    flashcard: "#002ff5",  // Blue - Memorization
    iow: "#f97000",        // Orange 2 - Explanation
    help: "#d8d8ce",       // Light Grey - Assistance
    summary: "#a8aaa0",    // Medium Grey - Key takeaways
  };

  // Create drag ghost for new bubbles from menu (Safari-compatible)
  // Keep it simple - no innerHTML, no flexbox - just like the working existing bubble ghost
  const createMenuDragGhost = (type: BubbleType, x: number, y: number) => {
    // Remove any existing ghost first
    const existingGhost = document.getElementById("drag-ghost");
    if (existingGhost) existingGhost.remove();

    const ghost = document.createElement("div");
    ghost.id = "drag-ghost";

    // Simple styles matching the working existing bubble ghost
    ghost.style.cssText = `
      position: fixed !important;
      pointer-events: none !important;
      z-index: 2147483647 !important;
      opacity: 0.85 !important;
      left: ${x - 30}px !important;
      top: ${y - 30}px !important;
      width: 60px !important;
      height: 60px !important;
      border-radius: 50% !important;
      background-color: ${BUBBLE_COLORS[type]} !important;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3) !important;
      -webkit-transform: translateZ(0) !important;
      transform: translateZ(0) !important;
      will-change: transform, left, top !important;
    `;

    document.body.appendChild(ghost);
    ghost.getBoundingClientRect();
  };

  // Touch event handlers for mobile (NEW BUBBLES from menu)
  const handleTouchStart = (type: BubbleType, e: React.TouchEvent) => {
    // Clean up any existing listeners first
    cleanupTouchListeners();

    const touch = e.touches[0];

    // Record start position - don't start drag yet
    touchStartRef.current = { x: touch.clientX, y: touch.clientY, type };
    dragStartedRef.current = false;

    // Add touchmove listener to detect drag threshold
    const moveHandler = (e: TouchEvent) => {
      const touch = e.touches[0];
      const startPos = touchStartRef.current;
      if (!startPos || !startPos.type) return;

      const deltaX = Math.abs(touch.clientX - startPos.x);
      const deltaY = Math.abs(touch.clientY - startPos.y);

      // Only start drag after threshold is exceeded
      if (!dragStartedRef.current && (deltaX > DRAG_THRESHOLD || deltaY > DRAG_THRESHOLD)) {
        // Check if we can prevent scrolling - if not, abort drag attempt
        if (!e.cancelable) {
          // Scrolling already started, abort drag
          handleDragEnd();
          return;
        }
        dragStartedRef.current = true;
        setDraggingBubble(startPos.type);
        createMenuDragGhost(startPos.type, touch.clientX, touch.clientY);
      }

      // Once dragging, prevent scroll and update position
      if (dragStartedRef.current) {
        if (e.cancelable) {
          e.preventDefault();
        }

        const dragGhost = document.getElementById("drag-ghost");
        if (dragGhost) {
          dragGhost.style.left = (touch.clientX - 30) + "px";
          dragGhost.style.top = (touch.clientY - 30) + "px";
        }

        const elementBelow = document.elementFromPoint(touch.clientX, touch.clientY);
        const trashZone = elementBelow?.closest('[data-trash-zone]');
        if (trashZone) {
          setDropTarget('trash');
          return;
        }

        const bubbleElement = elementBelow?.closest('[data-content-bubble-id]');
        if (bubbleElement) {
          const bubbleId = bubbleElement.getAttribute('data-content-bubble-id');
          if (bubbleId) setDropTarget(bubbleId);
        } else {
          setDropTarget(null);
        }
      }
    };

    // Document-level end/cancel handler to ensure cleanup
    const endHandler = () => {
      handleDragEnd();
    };

    touchMoveListenerRef.current = moveHandler;
    touchEndListenerRef.current = endHandler;

    document.addEventListener('touchmove', moveHandler, { passive: false });
    document.addEventListener('touchend', endHandler, { once: true });
    document.addEventListener('touchcancel', endHandler, { once: true });
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    // This is now handled by the document listener
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    // If drag wasn't started (just a tap), clean up and return
    if (!dragStartedRef.current) {
      handleDragEnd();
      return null;
    }

    // Clean up drag ghost
    const dragGhost = document.getElementById("drag-ghost");
    if (dragGhost) {
      dragGhost.remove();
    }

    const touch = e.changedTouches[0];
    const dropElement = document.elementFromPoint(touch.clientX, touch.clientY);

    // Check for trash zone first
    const trashZone = dropElement?.closest('[data-trash-zone]');
    let touchDropData: { milestoneId: string; contentBubbleId: string } | 'trash' | null = null;

    if (trashZone && draggingExisting) {
      touchDropData = 'trash';
    } else {
      // Find the content bubble element
      const bubbleElement = dropElement?.closest('[data-content-bubble-id]');

      if (bubbleElement) {
        const contentBubbleId = bubbleElement.getAttribute('data-content-bubble-id');
        const milestoneId = bubbleElement.getAttribute('data-milestone-id');

        if (contentBubbleId && milestoneId && draggingBubble !== "content") {
          touchDropData = { milestoneId, contentBubbleId };
        }
      }
    }

    handleDragEnd();
    return touchDropData;
  };

  // Touch handlers for EXISTING bubbles - uses long-press to initiate drag
  const handleExistingBubbleTouchStart = (
    milestoneId: string,
    contentBubbleId: string,
    interactionId: string | undefined,
    e: React.TouchEvent
  ) => {
    // Clean up any existing listeners first
    cleanupTouchListeners();

    const touch = e.touches[0];
    const target = e.currentTarget as HTMLElement;

    // Record start position and element info
    const existing = { milestoneId, contentBubbleId, interactionId };
    touchStartRef.current = { x: touch.clientX, y: touch.clientY, existing };
    dragStartedRef.current = false;
    longPressTriggeredRef.current = false;

    // Get dimensions for later
    const rect = target.getBoundingClientRect();
    const offsetX = rect.width / 2;
    const offsetY = rect.height / 2;

    // Start long-press timer
    longPressTimerRef.current = setTimeout(() => {
      longPressTriggeredRef.current = true;
      // Notify parent to expand menu when long-press is triggered
      onExistingBubbleDragStart?.();
      // Visual feedback that long-press succeeded (optional: vibrate on mobile)
      if (navigator.vibrate) {
        navigator.vibrate(50);
      }
    }, LONG_PRESS_DELAY);

    // Move handler - cancels long press if user moves before timer fires
    const moveHandler = (e: TouchEvent) => {
      const touch = e.touches[0];
      const startPos = touchStartRef.current;
      if (!startPos || !startPos.existing) return;

      const deltaX = Math.abs(touch.clientX - startPos.x);
      const deltaY = Math.abs(touch.clientY - startPos.y);

      // If user moves before long-press timer fires, cancel and allow scroll
      if (!longPressTriggeredRef.current && (deltaX > 5 || deltaY > 5)) {
        if (longPressTimerRef.current) {
          clearTimeout(longPressTimerRef.current);
          longPressTimerRef.current = null;
        }
        // Don't prevent default - let scrolling happen
        cleanupTouchListeners();
        return;
      }

      // Long press triggered - now handle drag
      if (longPressTriggeredRef.current && (deltaX > DRAG_THRESHOLD || deltaY > DRAG_THRESHOLD)) {
        if (!dragStartedRef.current) {
          // Check if we can prevent scrolling
          if (!e.cancelable) {
            handleDragEnd();
            return;
          }
          dragStartedRef.current = true;
          setDraggingExisting(startPos.existing);

          // Prevent click events when drag starts
          e.preventDefault();

          // Create drag ghost
          const ghost = document.createElement("div");
          ghost.id = "drag-ghost";
          ghost.style.cssText = `
            position: fixed !important;
            pointer-events: none !important;
            z-index: 2147483647 !important;
            opacity: 0.85 !important;
            left: ${touch.clientX - offsetX}px !important;
            top: ${touch.clientY - offsetY}px !important;
            width: ${rect.width}px !important;
            height: ${rect.height}px !important;
            border-radius: 50% !important;
            background-color: #666 !important;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3) !important;
            -webkit-transform: translateZ(0) !important;
            transform: translateZ(0) !important;
            will-change: transform, left, top !important;
          `;
          document.body.appendChild(ghost);
          ghost.getBoundingClientRect();
        }
      }

      // Once dragging, prevent scroll and update position
      if (dragStartedRef.current) {
        if (e.cancelable) {
          e.preventDefault();
        }

        const dragGhost = document.getElementById("drag-ghost");
        if (dragGhost) {
          dragGhost.style.left = (touch.clientX - offsetX) + "px";
          dragGhost.style.top = (touch.clientY - offsetY) + "px";
        }

        const elementBelow = document.elementFromPoint(touch.clientX, touch.clientY);
        const trashZone = elementBelow?.closest('[data-trash-zone]');
        if (trashZone) {
          setDropTarget('trash');
        } else {
          setDropTarget(null);
        }
      }
    };

    // Document-level end/cancel handler
    const endHandler = async (e: TouchEvent) => {
      // Remove listeners immediately to prevent double-firing
      if (touchMoveListenerRef.current) {
        document.removeEventListener('touchmove', touchMoveListenerRef.current);
        touchMoveListenerRef.current = null;
      }
      // Note: touchend/touchcancel are already using {once: true} so they self-remove
      touchEndListenerRef.current = null;

      // If drag never started (just a tap), clean up completely
      if (!dragStartedRef.current) {
        // Clear long press timer if still running
        if (longPressTimerRef.current) {
          clearTimeout(longPressTimerRef.current);
          longPressTimerRef.current = null;
        }
        cleanupTouchListeners();
        touchStartRef.current = null;
        longPressTriggeredRef.current = false;
        // Don't prevent default - let click event fire normally for modal opening
        return;
      }

      // Drag was in progress - handle trash drop and prevent click
      const existingData = touchStartRef.current?.existing;
      let isTrashDrop = false;

      if (e.changedTouches && e.changedTouches.length > 0) {
        const touch = e.changedTouches[0];
        const dropElement = document.elementFromPoint(touch.clientX, touch.clientY);
        const trashZone = dropElement?.closest('[data-trash-zone]');
        isTrashDrop = !!trashZone;

        console.log('[Mobile Drag] Touch end:', {
          dragStarted: dragStartedRef.current,
          touchX: touch.clientX,
          touchY: touch.clientY,
          dropElement: dropElement?.tagName,
          trashZone: !!trashZone,
          existingData,
          hasCallback: !!onExistingBubbleTouchDrop
        });
      }

      if (isTrashDrop && existingData && onExistingBubbleTouchDrop) {
        console.log('[Mobile Drag] Calling trash drop handler');
        // Prevent click event when dropping on trash
        e.preventDefault();
        await onExistingBubbleTouchDrop(existingData, true);
      }

      handleDragEnd();
    };

    touchMoveListenerRef.current = moveHandler;
    touchEndListenerRef.current = endHandler;

    document.addEventListener('touchmove', moveHandler, { passive: false });
    document.addEventListener('touchend', endHandler, { once: true });
    document.addEventListener('touchcancel', endHandler, { once: true });
  };

  return {
    // State
    draggingBubble,
    draggingExisting,
    dropTarget,
    isDraggingExisting: draggingExisting !== null,

    // Handlers
    handleDragStart,
    handleExistingBubbleDragStart,
    handleDragEnd,
    handleDragOver,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    handleExistingBubbleTouchStart,
  };
}
