import { useState } from "react";
import { MessageSquare } from "lucide-react";
import FeedbackModal from "./FeedbackModal";

interface FeedbackButtonProps {
  position?: "centered" | "top";
}

const FeedbackButton = ({ position = "centered" }: FeedbackButtonProps) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const containerClass = position === "centered"
    ? "fixed left-4 top-1/2 -translate-y-1/2 z-40"
    : "fixed left-4 top-[350px] z-40";

  return (
    <>
      {/* Feedback Button */}
      <div className={containerClass}>
        <button
          onClick={() => setIsModalOpen(true)}
          className="group flex items-center justify-center w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-bubble hover:shadow-soft transition-all duration-300 hover:scale-110"
          title="Send Feedback"
        >
          <MessageSquare className="w-6 h-6" />
        </button>
      </div>

      {/* Feedback Modal */}
      <FeedbackModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
};

export default FeedbackButton;
