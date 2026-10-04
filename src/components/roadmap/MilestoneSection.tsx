import { Plus, Loader2, Sparkles } from "lucide-react";
import { Milestone, ContentBubble, Bubble, BubbleType } from "@/types/learning";
import MilestoneCard from "./MilestoneCard";
import BubbleNode from "./BubbleNode";
import SummaryDiamond from "./SummaryDiamond";
import { Button } from "@/components/ui/button";

interface MilestoneSectionProps {
  milestone: Milestone;
  milestoneIndex: number;
  isGeneratingBubble: (bubbleId: string) => boolean;
  addingContentTo: string | null;
  dropTarget: string | null;
  onToggle: () => void;
  onMilestoneClick: () => void;
  onGenerateFirst: () => void;
  onAddContent: () => void;
  onBubbleClick: (type: BubbleType, bubble: Bubble | ContentBubble) => void;
  onDragOver: (e: React.DragEvent, contentId: string) => void;
  onDrop: (e: React.DragEvent, milestoneId: string, contentBubbleId: string) => void;
  onDragStart: (milestoneId: string, contentBubbleId: string, interactionId?: string) => void;
  onDragEnd: () => void;
  onTouchStart?: (milestoneId: string, contentBubbleId: string, interactionId: string | undefined, e: React.TouchEvent) => void;
}

export default function MilestoneSection({
  milestone,
  milestoneIndex,
  isGeneratingBubble,
  addingContentTo,
  dropTarget,
  onToggle,
  onMilestoneClick,
  onGenerateFirst,
  onAddContent,
  onBubbleClick,
  onDragOver,
  onDrop,
  onDragStart,
  onDragEnd,
  onTouchStart,
}: MilestoneSectionProps) {
  return (
    <div className="flex flex-col items-center mb-8">
      {/* Milestone Card */}
      <MilestoneCard
        milestone={milestone}
        onToggle={onToggle}
        onOpenDetails={onMilestoneClick}
      />

      {/* Expanded Content */}
      {milestone.isExpanded && (
        <div className="flex flex-col items-center mt-6 animate-fade-in">
          {/* Connection line from milestone */}
          <div className="w-0.5 h-8 bg-muted-foreground/30" />

          {milestone.contentBubbles.map((contentBubble, cbIndex) => (
            <div key={contentBubble.id} className="flex flex-col items-center">
              {/* Title above bubble */}
              <p className="text-center font-handwritten text-sm mb-2 max-w-[250px] leading-tight">
                {contentBubble.title}
              </p>

              {/* Content Bubble - draggable to trash */}
              <div
                className={`relative ${dropTarget === contentBubble.id ? "drop-zone-active rounded-full" : ""
                  }`}
                data-content-bubble-id={contentBubble.id}
                data-milestone-id={milestone.id}
                draggable
                onDragStart={() => onDragStart(milestone.id, contentBubble.id)}
                onDragEnd={onDragEnd}
                onDragOver={(e) => onDragOver(e, contentBubble.id)}
                onDrop={(e) => onDrop(e, milestone.id, contentBubble.id)}
                onTouchStart={(e) => onTouchStart?.(milestone.id, contentBubble.id, undefined, e)}
              >
                <BubbleNode
                  type="content"
                  size="lg"
                  isLoading={isGeneratingBubble(contentBubble.id)}
                  onClick={() => onBubbleClick("content", contentBubble)}
                />
              </div>

              {/* Show interaction bubbles only if content exists */}
              {contentBubble.content && contentBubble.interactions.length > 0 && (
                <>
                  {/* Connection lines container with SVG */}
                  <div className="relative w-full" style={{ height: '80px', marginTop: '16px' }}>
                    <svg
                      className="absolute inset-0"
                      width="100%"
                      height="100%"
                      style={{ overflow: 'visible' }}
                      preserveAspectRatio="none"
                      viewBox="0 0 400 80"
                    >
                      {contentBubble.interactions
                        .filter((interaction) => interaction.type !== "summary")
                        .map((interaction, index, arr) => {
                          const totalBubbles = arr.length;
                          const bubbleWidth = 56; // w-14 = 56px
                          const gap = 16; // gap-4 = 16px

                          // SVG center
                          const svgCenterX = 200;
                          const startY = 0;

                          // Calculate end point for each bubble
                          // Position relative to center
                          const bubbleOffset = (index - (totalBubbles - 1) / 2) * (bubbleWidth + gap);
                          const endX = svgCenterX + bubbleOffset;
                          const endY = 80;

                          // Control point for curve (midpoint, centered)
                          const controlY = 40;

                          return (
                            <path
                              key={interaction.id}
                              d={`M ${svgCenterX} ${startY} Q ${svgCenterX} ${controlY}, ${endX} ${endY}`}
                              fill="none"
                              stroke="hsl(var(--muted-foreground))"
                              strokeWidth="2"
                              strokeOpacity="0.3"
                              strokeDasharray="8,6"
                            />
                          );
                        })}
                    </svg>
                  </div>
                  <div className="flex gap-4 justify-center">
                    {contentBubble.interactions
                      .filter((interaction) => interaction.type !== "summary")
                      .map((interaction) => (
                        <div
                          key={interaction.id}
                          draggable
                          onDragStart={() =>
                            onDragStart(
                              milestone.id,
                              contentBubble.id,
                              interaction.id
                            )
                          }
                          onDragEnd={onDragEnd}
                          onTouchStart={(e) => {
                            onTouchStart?.(
                              milestone.id,
                              contentBubble.id,
                              interaction.id,
                              e
                            );
                          }}
                        >
                          <BubbleNode
                            type={interaction.type}
                            size="md"
                            isLoading={isGeneratingBubble(interaction.id)}
                            onClick={() => onBubbleClick(interaction.type, interaction)}
                          />
                        </div>
                      ))}
                  </div>
                </>
              )}

              {/* Summary bubble if exists */}
              {contentBubble.interactions.some((i) => i.type === "summary") && (
                <>
                  <div className="w-0.5 h-8 bg-muted-foreground/30 mt-4" />
                  <SummaryDiamond
                    draggable
                    onDragStart={() => {
                      const summaryBubble = contentBubble.interactions.find(
                        (i) => i.type === "summary"
                      );
                      if (summaryBubble) {
                        onDragStart(milestone.id, contentBubble.id, summaryBubble.id);
                      }
                    }}
                    onDragEnd={onDragEnd}
                    onTouchStart={(e) => {
                      const summaryBubble = contentBubble.interactions.find(
                        (i) => i.type === "summary"
                      );
                      if (summaryBubble) {
                        onTouchStart?.(milestone.id, contentBubble.id, summaryBubble.id, e);
                      }
                    }}
                    onClick={() => {
                      const summaryBubble = contentBubble.interactions.find(
                        (i) => i.type === "summary"
                      );
                      if (summaryBubble) {
                        onBubbleClick("summary", summaryBubble);
                      }
                    }}
                  />
                </>
              )}

              {/* Connection line to next bubble */}
              {cbIndex < milestone.contentBubbles.length - 1 && (
                <div className="w-0.5 h-16 bg-muted-foreground/30 mt-4" />
              )}
            </div>
          ))}

          {/* Add content bubble button - always show at the end */}
          {milestone.contentBubbles.length === 0 ? (
            <Button
              onClick={onGenerateFirst}
              variant="outline"
              size="lg"
              disabled={addingContentTo !== null}
              className="mt-4"
            >
              {addingContentTo ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Generating first content...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5 mr-2" />
                  Add first content
                </>
              )}
            </Button>
          ) : (
            <div className="flex flex-col items-center mt-8">
              <div className="w-0.5 h-8 bg-muted-foreground/30" />
              <button
                onClick={onAddContent}
                className="w-12 h-12 rounded-full border-2 border-dashed border-primary/50 hover:border-primary hover:bg-primary/10 flex items-center justify-center transition-all cursor-pointer group"
                disabled={addingContentTo !== null}
              >
                {addingContentTo ? (
                  <Loader2 className="w-6 h-6 text-primary animate-spin" />
                ) : (
                  <Plus className="w-6 h-6 text-primary group-hover:scale-110 transition-transform" />
                )}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Connection line to next milestone */}
      {milestoneIndex < milestone.contentBubbles.length - 1 && (
        <div className="w-0.5 h-16 bg-muted-foreground/30 mt-8" />
      )}
    </div>
  );
}
