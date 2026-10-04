import { useEffect } from "react";
import { X, Users, Lightbulb, Vote } from "lucide-react";
import { Button } from "@/components/ui/button";

interface HelpBubbleModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const HelpBubbleModal = ({ isOpen, onClose }: HelpBubbleModalProps) => {
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

  return (
    <div
      className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-card w-full max-w-lg rounded-2xl border-2 border-border shadow-soft animate-fade-in"
        onClick={(e) => {
          // Prevent clicks inside modal from propagating to overlay
          e.stopPropagation();
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-bubble-help flex items-center justify-center">
              <span className="text-xl font-bold text-bubble-help-foreground">?</span>
            </div>
            <h3 className="font-semibold text-lg">Future Learning Method</h3>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Main Message */}
          <div className="text-center space-y-3">
            <Lightbulb className="w-16 h-16 mx-auto text-primary" />
            <h4 className="text-xl font-semibold">Coming Soon!</h4>
            <p className="text-muted-foreground">
              This is a placeholder for a future AI-powered learning method.
            </p>
          </div>

          {/* Community Feature */}
          <div className="bg-primary/5 rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              <h5 className="font-semibold">Community-Driven</h5>
            </div>
            <p className="text-sm text-muted-foreground">
              The community will be able to vote and suggest new AI learning methods. For example: interactive paper work, mind maps, or other helpful study techniques.
            </p>
          </div>

          {/* Vote Feature */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Vote className="w-4 h-4" />
            <span>Stay tuned for voting and suggestions!</span>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 pt-0">
          <Button onClick={onClose} className="w-full">
            Got it!
          </Button>
        </div>
      </div>
    </div>
  );
};

export default HelpBubbleModal;
