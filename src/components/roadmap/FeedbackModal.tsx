import { useState, useEffect } from "react";
import { X, Bug, Lightbulb, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FeedbackType, FEEDBACK_TYPE_CONFIG } from "@/types/learning";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const FeedbackModal = ({ isOpen, onClose }: FeedbackModalProps) => {
  const [selectedType, setSelectedType] = useState<FeedbackType>("bug");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ESC key to close modal
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    // Validate title
    if (!title.trim()) {
      toast.error("Please enter a title");
      return;
    }

    if (title.length > 100) {
      toast.error("Title must be 100 characters or less");
      return;
    }

    if (description.length > 500) {
      toast.error("Description must be 500 characters or less");
      return;
    }

    setIsSubmitting(true);

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        toast.error("You must be logged in to submit feedback");
        return;
      }

      // Prepare feedback data
      const feedback = {
        user_id: user.id,
        type: selectedType,
        title: title.trim(),
        description: description.trim() || null,
        user_agent: navigator.userAgent,
        screen_size: `${window.innerWidth}x${window.innerHeight}`,
        url: window.location.href,
      };

      // Insert feedback
      const { error } = await supabase.from("feedback").insert([feedback]);

      if (error) {
        console.error("[FeedbackModal] Error submitting feedback:", error);
        toast.error("Failed to submit feedback. Please try again.");
        return;
      }

      // Success
      toast.success("Thank you for your feedback!");

      // Reset form
      setTitle("");
      setDescription("");
      setSelectedType("bug");

      // Close modal
      onClose();
    } catch (error) {
      console.error("[FeedbackModal] Unexpected error:", error);
      toast.error("An unexpected error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getTypeIcon = (type: FeedbackType) => {
    switch (type) {
      case "bug":
        return <Bug className="w-5 h-5" />;
      case "feature":
        return <Lightbulb className="w-5 h-5" />;
      case "general":
        return <MessageSquare className="w-5 h-5" />;
    }
  };

  return (
    <div
      className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-card w-full max-w-lg max-h-[90vh] md:max-h-[85vh] rounded-2xl border-2 border-border shadow-soft animate-fade-in flex flex-col"
        onClick={(e) => {
          e.stopPropagation();
        }}
      >
        {/* Header - Fixed */}
        <div className="flex items-center justify-between p-4 md:p-6 border-b border-border flex-shrink-0">
          <div className="flex items-center gap-2 md:gap-3">
            <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <MessageSquare className="w-5 h-5 md:w-6 md:h-6 text-primary" />
            </div>
            <h3 className="font-semibold text-base md:text-lg">Send Feedback</h3>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Content - Scrollable */}
        <div className="p-4 md:p-6 space-y-4 md:space-y-6 overflow-y-auto flex-1">
          {/* Type Selector */}
          <div className="space-y-2 md:space-y-3">
            <label className="text-sm font-medium">Feedback Type</label>
            <div className="grid grid-cols-3 gap-2">
              {(Object.keys(FEEDBACK_TYPE_CONFIG) as FeedbackType[]).map((type) => (
                <button
                  key={type}
                  onClick={() => setSelectedType(type)}
                  className={`p-2 md:p-3 rounded-lg border-2 transition-all duration-200 flex flex-col items-center gap-1 md:gap-2 ${
                    selectedType === type
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  {getTypeIcon(type)}
                  <span className="text-xs font-medium text-center leading-tight">
                    {FEEDBACK_TYPE_CONFIG[type].label}
                  </span>
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              {FEEDBACK_TYPE_CONFIG[selectedType].description}
            </p>
          </div>

          {/* Title Input */}
          <div className="space-y-2">
            <label htmlFor="feedback-title" className="text-sm font-medium">
              Title <span className="text-destructive">*</span>
            </label>
            <Input
              id="feedback-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Brief summary of your feedback"
              maxLength={100}
              disabled={isSubmitting}
            />
            <p className="text-xs text-muted-foreground text-right">
              {title.length}/100
            </p>
          </div>

          {/* Description Textarea */}
          <div className="space-y-2">
            <label htmlFor="feedback-description" className="text-sm font-medium">
              Description <span className="text-muted-foreground text-xs">(optional)</span>
            </label>
            <Textarea
              id="feedback-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide more details about your feedback..."
              rows={3}
              maxLength={500}
              disabled={isSubmitting}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground text-right">
              {description.length}/500
            </p>
          </div>

          {/* Info */}
          <div className="text-xs text-muted-foreground bg-muted/30 rounded-lg p-2 md:p-3">
            <p>
              Your feedback will include browser and device information to help us debug issues.
            </p>
          </div>
        </div>

        {/* Footer - Fixed */}
        <div className="p-4 md:p-6 flex gap-2 md:gap-3 flex-shrink-0 border-t border-border bg-card">
          <Button
            onClick={onClose}
            variant="outline"
            className="flex-1"
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            className="flex-1"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Submitting..." : "Submit Feedback"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default FeedbackModal;
