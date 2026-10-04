import { getSelectedTextWithMath } from "@/lib/math";
import { MathText } from "@/components/MathText";
import { useState, useEffect, useRef } from "react";
import { X, Send, Loader2 } from "lucide-react";
import { Milestone } from "@/types/learning";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface MilestoneModalProps {
  milestone: Milestone;
  onClose: () => void;
  onSave: (title: string, description: string) => void;
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

const MilestoneModal = ({ milestone, onClose, onSave }: MilestoneModalProps) => {
  const [title, setTitle] = useState(milestone.title);
  const [description] = useState(milestone.description || "");
  const [askAiInput, setAskAiInput] = useState("");
  const [highlightedText, setHighlightedText] = useState("");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const descriptionRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // ESC key to close modal
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  useEffect(() => {
    setTitle(milestone.title);
  }, [milestone]);

  useEffect(() => {
    // Scroll to bottom when new messages arrive
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatMessages]);

  const handleTextSelection = () => {
    const selection = window.getSelection();
    if (selection && selection.toString().trim()) {
      const selectedText = getSelectedTextWithMath(selection);
      setHighlightedText(selectedText);
      setAskAiInput(`"${selectedText}" - `);
    }
  };

  const handleAskAi = async () => {
    if (!askAiInput.trim() || isLoading) return;

    const userMessage = askAiInput.trim();
    setChatMessages(prev => [...prev, { role: "user", content: userMessage }]);
    setAskAiInput("");
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('milestone-chat', {
        body: {
          question: userMessage,
          milestoneDescription: description,
          highlightedText: highlightedText || undefined,
        },
      });

      if (error) throw error;

      if (data?.answer) {
        setChatMessages(prev => [...prev, { role: "assistant", content: data.answer }]);
      }
      
      // Clear highlighted text after sending
      setHighlightedText("");
    } catch (error) {
      console.error('Error asking AI:', error);
      toast({
        title: "Error",
        description: "Failed to get AI response. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleAskAi();
    }
  };

  const handleSave = () => {
    onSave(title, description);
  };

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-card border border-border rounded-2xl shadow-xl w-full max-w-3xl animate-scale-in h-[85vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border shrink-0">
          <h2 className="text-lg font-semibold text-foreground">Milestone</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 overflow-y-auto flex-1">
          <div>
            <label className="text-sm font-medium text-muted-foreground mb-2 block">
              Title
            </label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Milestone title..."
              className="text-lg font-semibold"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-muted-foreground mb-2 block">
              Description
              <span className="text-xs ml-2 text-muted-foreground/70">
                (Highlight text to ask about it)
              </span>
            </label>
            <div
              ref={descriptionRef}
              onMouseUp={handleTextSelection}
              className="p-4 rounded-md border border-border bg-muted/30 min-h-[180px] max-h-[250px] overflow-y-auto text-sm leading-relaxed select-text cursor-text whitespace-pre-wrap"
            >
              {description || <span className="text-muted-foreground italic">No description provided.</span>}
            </div>
          </div>

          {/* Ask AI Section */}
          <div className="space-y-3 flex-1 flex flex-col min-h-0">
            <label className="text-sm font-medium text-muted-foreground block">
              Ask AI
              {highlightedText && (
                <span className="text-xs ml-2 text-primary">
                  (Selected: "{highlightedText.slice(0, 30)}...")
                </span>
              )}
            </label>

            {/* Chat Messages Display */}
            {chatMessages.length > 0 && (
              <div
                ref={chatContainerRef}
                className="flex-1 overflow-y-auto space-y-3 p-3 border border-border rounded-md bg-muted/20 min-h-[120px] max-h-[200px]"
              >
                {chatMessages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                        msg.role === 'user'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted border border-border'
                      }`}
                    >
                      {msg.role === 'assistant' ? <MathText className="[&_p]:my-1">{msg.content}</MathText> : msg.content}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Input */}
            <div className="flex gap-2 shrink-0 mt-2">
              <Input
                value={askAiInput}
                onChange={(e) => setAskAiInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about this milestone..."
                className="text-sm flex-1 h-12"
                disabled={isLoading}
              />
              <Button
                size="icon"
                className="h-12 w-12"
                onClick={handleAskAi}
                disabled={!askAiInput.trim() || isLoading}
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-4 border-t border-border shrink-0">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            Save
          </Button>
        </div>
      </div>
    </div>
  );
};

export default MilestoneModal;
