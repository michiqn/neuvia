import { cn } from "@/lib/utils";

interface SummaryDiamondProps {
  onClick?: (e?: React.MouseEvent<HTMLButtonElement>) => void;
  className?: string;
  draggable?: boolean;
  onDragStart?: () => void;
  onDragEnd?: () => void;
  onTouchStart?: (e: React.TouchEvent) => void;
}

const SummaryDiamond = ({
  onClick,
  className,
  draggable = false,
  onDragStart,
  onDragEnd,
  onTouchStart,
}: SummaryDiamondProps) => {
  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    // Prevent event bubbling and default behavior to avoid conflicts with touch handlers
    e.stopPropagation();
    e.preventDefault();
    onClick?.(e);
  };

  return (
    <button
      onClick={handleClick}
      draggable={draggable}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onTouchStart={onTouchStart}
      className={cn(
        "summary-diamond w-24 h-24 rounded-xl shadow-bubble transition-all duration-300 hover:scale-105 hover:shadow-soft",
        draggable && "cursor-grab active:cursor-grabbing",
        className
      )}
    >
      <span className="-rotate-45 font-bold text-summary-foreground">
        Summary
      </span>
    </button>
  );
};

export default SummaryDiamond;
