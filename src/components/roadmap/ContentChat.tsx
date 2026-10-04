import { useEffect, useRef, useState } from "react";
import { Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MathText } from "@/components/MathText";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { logger } from "@/lib/logger";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface ContentChatProps {
  /** Without an id (unsaved bubble) the chat works but history is neither loaded nor saved */
  contentBubbleId?: string;
  contentTitle: string;
  contentText: string;
  /** Passage the user highlighted in the lesson, sent to the AI as extra context */
  highlightedText: string;
  onHighlightUsed: () => void;
  input: string;
  onInputChange: (value: string) => void;
}

/** "Ask AI" chat about a content bubble, with history persisted per user. */
const ContentChat = ({
  contentBubbleId,
  contentTitle,
  contentText,
  highlightedText,
  onHighlightUsed,
  input,
  onInputChange,
}: ContentChatProps) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    if (!user || !contentBubbleId) return;

    const loadHistory = async () => {
      setLoadingHistory(true);
      try {
        const { data, error } = await supabase
          .from("content_chat_messages")
          .select("role, message, created_at")
          .eq("content_bubble_id", contentBubbleId)
          .eq("user_id", user.id)
          .order("created_at", { ascending: true });

        if (error) throw error;
        setMessages((data ?? []).map((msg) => ({ role: msg.role as ChatMessage["role"], content: msg.message })));
      } catch (error) {
        // Chat history is not critical, so the chat just starts empty
        console.error("Error loading chat history:", error);
      } finally {
        setLoadingHistory(false);
      }
    };

    loadHistory();
  }, [contentBubbleId, user]);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [messages]);

  const saveMessage = async (role: ChatMessage["role"], message: string) => {
    if (!user || !contentBubbleId) return;
    try {
      await supabase.from("content_chat_messages").insert({
        content_bubble_id: contentBubbleId,
        user_id: user.id,
        role,
        message,
      });
    } catch (error) {
      // Continue even if saving fails; the answer is still shown
      console.error("Error saving chat message:", error);
    }
  };

  const askAi = async () => {
    const question = input.trim();
    if (!question || isLoading) return;

    setMessages((prev) => [...prev, { role: "user", content: question }]);
    await saveMessage("user", question);
    onInputChange("");
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("content-chat", {
        body: {
          question,
          contentTitle,
          contentText,
          highlightedText: highlightedText || undefined,
        },
      });
      if (error) throw error;

      if (data?.answer) {
        setMessages((prev) => [...prev, { role: "assistant", content: data.answer }]);
        await saveMessage("assistant", data.answer);
      } else {
        logger.error("No answer in content-chat response", data);
      }
      onHighlightUsed();
    } catch (error) {
      logger.error("Error asking AI about content", error);
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
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      askAi();
    }
  };

  return (
    <div className="space-y-3 flex-1 flex flex-col min-h-0">
      <label className="text-sm font-medium text-muted-foreground block">
        Ask AI
        {highlightedText && (
          <span className="text-xs ml-2 text-primary">(Selected: "{highlightedText.slice(0, 30)}...")</span>
        )}
      </label>

      {(messages.length > 0 || loadingHistory) && (
        <div
          ref={containerRef}
          className="flex-1 overflow-y-auto space-y-3 p-3 border border-border rounded-md bg-muted/20 min-h-[120px] max-h-[200px]"
        >
          {loadingHistory ? (
            <div className="flex justify-center items-center h-full">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                    msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted border border-border"
                  }`}
                >
                  {msg.role === "assistant" ? <MathText className="[&_p]:my-1">{msg.content}</MathText> : msg.content}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      <div className="flex gap-2 shrink-0 mt-2">
        <Input
          value={input}
          onChange={(e) => onInputChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask about this content..."
          className="text-sm flex-1 h-12"
          disabled={isLoading}
        />
        <Button size="icon" className="h-12 w-12" onClick={askAi} disabled={!input.trim() || isLoading}>
          {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </Button>
      </div>
    </div>
  );
};

export default ContentChat;
