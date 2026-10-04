import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CurriculumModalProps {
  curriculum: string;
  suggestedMilestones?: Array<{ title: string; briefDescription: string }>;
  isOpen: boolean;
  onClose: () => void;
}

const CurriculumModal = ({ curriculum, suggestedMilestones, isOpen, onClose }: CurriculumModalProps) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-2xl shadow-xl w-full max-w-3xl max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-semibold">Curriculum Overview</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        <div className="p-6 overflow-y-auto">
          <div className="prose prose-sm max-w-none dark:prose-invert">
            <div className="whitespace-pre-wrap mb-6 text-muted-foreground leading-relaxed">
              {curriculum}
            </div>

            {suggestedMilestones && suggestedMilestones.length > 0 && (
              <div className="mt-6">
                <h3 className="text-md font-semibold mb-3 text-foreground">Suggested Milestone Sequence</h3>
                <div className="space-y-3">
                  {suggestedMilestones.map((milestone, idx) => (
                    <div key={idx} className="border-l-2 border-primary/30 pl-4 py-2">
                      <div className="font-medium text-sm text-foreground">
                        {idx + 1}. {milestone.title}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {milestone.briefDescription}
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-4 italic bg-muted/30 p-3 rounded-lg">
                  Note: Actual milestones will be generated adaptively based on your progress and performance.
                  You'll request new milestones when you're ready to advance.
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-3 p-4 border-t border-border">
          <Button onClick={onClose}>Close</Button>
        </div>
      </div>
    </div>
  );
};

export default CurriculumModal;
