import { cn } from "@/lib/utils";
import { BubbleType, BUBBLE_CONFIG } from "@/types/learning";
import { Loader2, Sigma, BadgeHelp, WalletCards, BookOpenText, PenLine } from "lucide-react";

interface BubbleNodeProps {
  type: BubbleType;
  size?: "sm" | "md" | "lg";
  onClick?: (e?: React.MouseEvent<HTMLButtonElement>) => void;
  isDragging?: boolean;
  isLoading?: boolean;
  className?: string;
}

const sizeClasses = {
  sm: "w-10 h-10 text-sm",
  md: "w-14 h-14 text-base",
  lg: "w-16 h-16 text-lg",
};

const colorClasses: Record<BubbleType, string> = {
  content: "bg-bubble-content text-bubble-content-foreground",
  quiz: "bg-bubble-quiz text-bubble-quiz-foreground",
  flashcard: "bg-bubble-flashcard text-bubble-flashcard-foreground",
  iow: "bg-bubble-iow text-bubble-iow-foreground",
  help: "bg-bubble-help text-bubble-help-foreground",
  summary: "bg-bubble-summary text-bubble-summary-foreground",
};

const BubbleNode = ({
  type,
  size = "md",
  onClick,
  isDragging,
  isLoading,
  className,
}: BubbleNodeProps) => {
  const config = BUBBLE_CONFIG[type];

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    // Prevent event bubbling and default behavior to avoid conflicts with touch handlers
    e.stopPropagation();
    e.preventDefault();
    onClick?.(e);
  };

  return (
    <button
      onClick={handleClick}
      className={cn(
        "bubble-node",
        sizeClasses[size],
        isLoading
          ? "bg-muted text-muted-foreground animate-pulse"
          : colorClasses[type],
        isDragging && "opacity-50 scale-110 shadow-glow",
        className
      )}
      title={config.name}
      disabled={isLoading}
    >
      {isLoading ? (
        <Loader2 className="w-5 h-5 animate-spin" />
      ) : type === "summary" ? (
        <Sigma className={cn(
          size === "sm" && "w-6 h-6",
          size === "md" && "w-8 h-8",
          size === "lg" && "w-10 h-10"
        )} />
      ) : type === "quiz" ? (
        <BadgeHelp className={cn(
          size === "sm" && "w-6 h-6",
          size === "md" && "w-8 h-8",
          size === "lg" && "w-10 h-10"
        )} />
      ) : type === "flashcard" ? (
        <WalletCards className={cn(
          size === "sm" && "w-6 h-6",
          size === "md" && "w-8 h-8",
          size === "lg" && "w-10 h-10"
        )} />
      ) : type === "iow" ? (
        <PenLine className={cn(
          size === "sm" && "w-6 h-6",
          size === "md" && "w-8 h-8",
          size === "lg" && "w-10 h-10"
        )} />
      ) : type === "content" ? (
        <BookOpenText className={cn(
          size === "sm" && "w-6 h-6",
          size === "md" && "w-8 h-8",
          size === "lg" && "w-10 h-10"
        )} />
      ) : (
        <span className="font-bold">{config.label}</span>
      )}
    </button>
  );
};

export default BubbleNode;
