import { useState } from "react";
import { X, Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface RequestMilestoneModalProps {
  learningPathId: string;
  isOpen: boolean;
  onClose: () => void;
  onMilestoneCreated: () => void; // Callback to refetch milestones
}

const RequestMilestoneModal = ({
  learningPathId,
  isOpen,
  onClose,
  onMilestoneCreated
}: RequestMilestoneModalProps) => {
  const [customTopic, setCustomTopic] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  if (!isOpen) return null;

  const handleGenerateNext = async (useCustomTopic: boolean) => {
    setIsGenerating(true);

    try {
      // Call edge function to generate next milestone
      const { data, error } = await supabase.functions.invoke('generate-next-milestone', {
        body: {
          learningPathId,
          customTopicRequest: useCustomTopic ? customTopic : undefined
        }
      });

      if (error) throw error;

      if (!data?.milestone) {
        throw new Error('Invalid response from AI');
      }

      // Create the new milestone in database
      const { error: insertError } = await supabase
        .from('milestones')
        .insert({
          learning_path_id: learningPathId,
          title: data.milestone.title,
          description: data.milestone.description,
          first_topic: data.milestone.firstTopic,
          order_index: data.orderIndex,
          milestone_status: 'active',
          started_at: new Date().toISOString(),
          is_custom_request: useCustomTopic,
          custom_topic_request: useCustomTopic ? customTopic : null,
        });

      if (insertError) {
        console.error('Error inserting milestone:', insertError);
        throw insertError;
      }

      // Update learning path's current milestone index
      const { error: updateError } = await supabase
        .from('learning_paths')
        .update({ current_milestone_index: data.orderIndex })
        .eq('id', learningPathId);

      if (updateError) {
        console.error('Error updating learning path:', updateError);
        throw updateError;
      }

      toast({
        title: "New milestone unlocked!",
        description: data.milestone.title,
      });

      onMilestoneCreated();
      onClose();
      setCustomTopic("");

    } catch (error) {
      console.error('Error generating milestone:', error);
      toast({
        title: "Failed to generate milestone",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-2xl shadow-xl w-full max-w-2xl">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-semibold">Request Next Milestone</h2>
          <Button variant="ghost" size="icon" onClick={onClose} disabled={isGenerating}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        <div className="p-6 space-y-6">
          {/* Default Option */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium">Continue Learning Path</h3>
            <p className="text-sm text-muted-foreground">
              Generate the next milestone based on your progress and the curriculum outline.
              Our AI will adapt the content to match your performance.
            </p>
            <Button
              onClick={() => handleGenerateNext(false)}
              disabled={isGenerating}
              className="w-full"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Generate Next Milestone
                </>
              )}
            </Button>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">Or</span>
            </div>
          </div>

          {/* Custom Topic Option */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium">Request a Custom Topic</h3>
            <p className="text-sm text-muted-foreground">
              Want to learn something specific? Tell us what you'd like to explore next.
            </p>
            <Input
              placeholder="e.g., I want to learn about neural networks"
              value={customTopic}
              onChange={(e) => setCustomTopic(e.target.value)}
              disabled={isGenerating}
            />
            <Button
              onClick={() => handleGenerateNext(true)}
              disabled={isGenerating || !customTopic.trim()}
              variant="outline"
              className="w-full"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Generate Custom Milestone
                </>
              )}
            </Button>
          </div>
        </div>

        <div className="flex justify-end gap-3 p-4 border-t border-border">
          <Button variant="ghost" onClick={onClose} disabled={isGenerating}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
};

export default RequestMilestoneModal;
