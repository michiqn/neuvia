import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Milestone } from "@/types/learning";

interface MilestoneCardProps {
  milestone: Milestone;
  onToggle: () => void;
  onOpenDetails: () => void;
}

const MilestoneCard = ({ milestone, onToggle, onOpenDetails }: MilestoneCardProps) => {
  return (
    <div className="milestone-card flex items-center justify-between gap-4 w-full max-w-xs hover:scale-[1.02] active:scale-100">
      <button
        onClick={onOpenDetails}
        className="flex-1 text-left font-bold text-milestone-foreground hover:text-primary transition-colors"
      >
        {milestone.title}
      </button>
      <button
        onClick={onToggle}
        className="p-1 rounded-full hover:bg-muted transition-colors"
      >
        <ChevronDown
          className={cn(
            "w-5 h-5 text-primary transition-transform duration-300",
            milestone.isExpanded && "rotate-180"
          )}
        />
      </button>
    </div>
  );
};

export default MilestoneCard;
