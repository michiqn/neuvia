import { useState } from "react";
import { X, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { ContentBubble } from "@/types/learning";
import { generateUUID } from "@/lib/uuid";

interface RequestContentModalProps {
  milestoneId: string;
  milestoneTitle: string;
  milestoneDescription?: string;
  suggestedTopic: string;
  previousTopic?: string;
  orderIndex: number;
  isOpen: boolean;
  onClose: () => void;
  onContentCreated: (bubble: ContentBubble, shouldGenerate: boolean) => void;
}

const RequestContentModal = ({
  milestoneId,
  milestoneTitle,
  milestoneDescription,
  suggestedTopic,
  previousTopic,
  orderIndex,
  isOpen,
  onClose,
  onContentCreated,
}: RequestContentModalProps) => {
  const [topicInput, setTopicInput] = useState(suggestedTopic);
  const { toast } = useToast();

  if (!isOpen) return null;

  const handleGenerate = () => {
    if (!topicInput.trim()) {
      toast({
        title: "Topic required",
        description: "Please enter a topic description",
        variant: "destructive",
      });
      return;
    }

    // Create empty bubble with user input - generation will happen in background
    const newBubble: ContentBubble = {
      id: generateUUID(),
      type: "content",
      parentId: milestoneId,
      title: "Loading...",
      content: null,
      order: orderIndex,
      interactions: [],
      userTopicInput: topicInput,
      suggestedTopic: suggestedTopic,
    };

    toast({
      title: "Generating content...",
      description: "Content will appear on the canvas shortly",
    });

    // Pass bubble and shouldGenerate=true to trigger background generation
    onContentCreated(newBubble, true);
    onClose();
    setTopicInput("");
  };

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-2xl shadow-xl w-full max-w-2xl">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-semibold">Generate Content</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        <div className="p-6 space-y-4">
          <div className="space-y-2">
            <h3 className="text-sm font-medium">Topic Description</h3>
            <p className="text-sm text-muted-foreground">
              Refine the suggested topic or provide your own description with additional context.
            </p>
          </div>

          <Textarea
            placeholder="e.g., Introduction to variables and data types with practical examples"
            value={topicInput}
            onChange={(e) => setTopicInput(e.target.value)}
            rows={6}
            className="resize-none"
          />

          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <div className="flex-1">
              Milestone: <span className="font-medium text-foreground">{milestoneTitle}</span>
            </div>
            {previousTopic && (
              <div className="text-xs">
                Previous: {previousTopic}
              </div>
            )}
          </div>

          <Button
            onClick={handleGenerate}
            disabled={!topicInput.trim()}
            className="w-full"
          >
            <Sparkles className="w-4 h-4 mr-2" />
            Generate Content
          </Button>
        </div>

        <div className="flex justify-end gap-3 p-4 border-t border-border">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
};

export default RequestContentModal;
