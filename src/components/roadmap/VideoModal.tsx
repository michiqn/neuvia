import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface VideoModalProps {
  videoSrc: string;
  title?: string;
  isOpen: boolean;
  onClose: () => void;
}

const VideoModal = ({ videoSrc, title = "Tutorial Video", isOpen, onClose }: VideoModalProps) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-card border border-border rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside modal
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-semibold">{title}</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Video Container */}
        <div className="p-6 flex items-center justify-center overflow-hidden">
          <video
            className="w-full h-auto max-h-[70vh] rounded-lg"
            controls
            autoPlay
          >
            <source src={videoSrc} type="video/mp4" />
            Your browser does not support the video tag.
          </video>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-4 border-t border-border">
          <Button onClick={onClose}>Close</Button>
        </div>
      </div>
    </div>
  );
};

export default VideoModal;
