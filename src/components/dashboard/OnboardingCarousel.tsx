import { useState, useRef, useEffect } from "react";
import { ChevronDown, ChevronUp, Play, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CarouselCard {
  id: string;
  title: string;
  bodyText: React.ReactNode;
  gradient: string;
  hasButtons?: boolean;
}

interface OnboardingCarouselProps {
  onVideoClick?: () => void;
  onDemoClick?: () => void;
}

const OnboardingCarousel = ({ onVideoClick, onDemoClick }: OnboardingCarouselProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isMinimized, setIsMinimized] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Check if user has minimized the carousel
  useEffect(() => {
    const carouselMinimized = localStorage.getItem("onboardingMinimized");
    if (carouselMinimized === "true") {
      setIsMinimized(true);
    }
  }, []);

  const cards: CarouselCard[] = [
    {
      id: "card-reality",
      title: "Tutorial",
      bodyText: (<>Below you can find a video and interactive guide for the app.<br />
        <strong>Content Bubbles:</strong> Where you learn new information.<br />
        <strong>Menu Bubbles:</strong> Your active learning methods.<br />
        Drag and drop to interact.</>),
      gradient: "from-[#f97000] to-[#f97000]",  /* Solid Orange 2 #f97000 */
      hasButtons: true,
    },
    {
      id: "card-new",
      title: "AI-Driven Roadmap Learning",
      bodyText: (<>Your learning journey begins with a <strong>specific goal</strong> and any existing context you choose to provide, such as <strong>personal notes</strong> or study materials. The AI synthesises this input into a <strong>structured roadmap</strong>, translating your objective into a <strong>logical curriculum</strong>. This curriculum is organised into <strong>milestones</strong>, each representing a significant topic necessary for mastering your goal. Within these milestones, the journey is further refined into individual learning units called <strong>content bubbles</strong>, which currently present foundational knowledge in a clean, text-based format.
        To move beyond passive reading, you utilise a suite of <strong>human-AI learning tools</strong> located in the left-hand menu. Interaction is designed to be tactile: you <strong>drag and drop</strong> these tools, such as "In Own Words" (IOW), Quizzes, Summaries, or Flashcards, directly onto a content bubble to engage with the information. Any flashcards you generate are automatically aggregated and can be accessed at any time through the <strong>top navigation bar</strong>, where they are organised by their respective learning paths.
        Progression is determined by your completion of these milestones. Once you have finished a topic, you have the choice to either let the AI generate the next milestone based on your established progress <strong>or</strong> to manually define the next step yourself. In this early stage, the experience remains focused on text-centric knowledge and the efficiency of the drag-and-drop interaction model, ensuring the core logic of the curriculum serves your learning objective.`,
      </>),
      gradient: "from-[#f7930f] to-[#f7930f]",  /* Solid Orange 1 #f7930f */
    },
    {
      id: "card-solution",
      title: "The Reality Check",
      bodyText: `Between five different classes and a busy life, staying on top of everything is a struggle. A huge chunk of "study time" often disappears into busywork, organizing folders, summarizing materials and getting materials ready before you even start.
We've all been there: you put a topic down for five days, and when you come back, you've lost that mental momentum. You aren't starting from zero, but you end up spending your best energy just trying to remember where you left off and re-learning the context.`,
      gradient: "from-[#002ff5] to-[#002ff5]",  /* Solid Blue #002ff5 */
    },
    {
      id: "card-vision",
      title: "The Solution",
      bodyText: `Neuvia is one portable journey for all your courses, designed to keep the thread alive.
Instant Context: It holds your place for you, so even after a break, you can jump back in without the long "warm-up" phase.
Interactive Learning: Stop writing manual summaries. Just load your notes or start fresh and interact directly with the content.
Smart Flow: We use an orchestration of system prompts with memory to identify your specific "understanding issues" and bridge those gaps as you go.
      `,
      gradient: "from-[#020062] to-[#020062]",  /* Solid Dark Blue #020062 */
    },
    {
      id: "card-tips",
      title: "The Vision",
      bodyText: `It's in a really early stage, but this is just the beginning.
      Our goal is to build and fine-tune our own safe and transparent AI models. We're aiming to build a system that is scientifically aligned with how we learn, adapting its approach just like a human teacher would.`,
      gradient: "from-[#2d2d2d] to-[#2d2d2d]",  /* Solid Dark Grey #2d2d2d */
    },
  ];

  const handleMinimize = () => {
    const newState = !isMinimized;
    setIsMinimized(newState);
    localStorage.setItem("onboardingMinimized", newState.toString());
  };

  const handleScroll = () => {
    if (!scrollContainerRef.current) return;
    const container = scrollContainerRef.current;
    const cardWidth = 300; // Approximate card width + gap
    const scrollLeft = container.scrollLeft;
    const index = Math.round(scrollLeft / cardWidth);
    setCurrentIndex(Math.min(index, cards.length - 1));
  };

  const scrollToCard = (index: number) => {
    if (!scrollContainerRef.current) return;
    const container = scrollContainerRef.current;
    const cardElements = container.children;
    if (cardElements[index]) {
      (cardElements[index] as HTMLElement).scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "start",
      });
    }
  };

  // Collapsed state - slim bar
  if (isMinimized) {
    return (
      <button
        onClick={handleMinimize}
        className="mb-8 w-full group bg-gradient-to-r from-primary/5 via-accent/5 to-primary/5 border-2 border-border rounded-xl p-4 transition-all duration-300 hover:border-primary/30 hover:shadow-soft animate-fade-in"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <span className="text-white text-xs font-bold">N</span>
            </div>
            <span className="text-sm font-semibold text-foreground">
              Review <span className="font-logo">Neuvia</span> Vision & Guides
            </span>
          </div>
          <ChevronDown className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
        </div>
      </button>
    );
  }

  // Expanded state - full carousel
  return (
    <div className="mb-8 animate-fade-in">
      {/* Header with Minimize */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold">Welcome to <span className="font-logo">Neuvia</span></h2>
        </div>
        <button
          onClick={handleMinimize}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
        >
          <ChevronUp className="w-4 h-4" />
          Minimize
        </button>
      </div>

      {/* Carousel */}
      <div className="relative">
        <div
          ref={scrollContainerRef}
          onScroll={handleScroll}
          className="flex gap-4 overflow-x-auto scrollbar-hide snap-x snap-mandatory scroll-smooth pb-2"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {cards.map((card) => (
            <div
              key={card.id}
              className="flex-shrink-0 w-[280px] snap-start"
            >
              {/* Card Container */}
              <div className="bg-card rounded-[20px] shadow-lg overflow-hidden transition-transform duration-300 hover:shadow-xl" style={{ aspectRatio: "4/5" }}>
                {/* Hero Section with Gradient - Takes up ~25% */}
                <div className={`relative bg-gradient-to-br ${card.gradient} h-[25%] p-4 flex flex-col justify-center`}>
                  {/* Title */}
                  <h3 className="text-white text-base font-bold leading-tight">
                    {card.title}
                  </h3>
                </div>

                {/* White Content Section - Takes up ~75% */}
                <div className="bg-white dark:bg-card h-[75%] p-4 flex flex-col justify-between">
                  {/* Body Text */}
                  <p className="text-base text-foreground leading-relaxed whitespace-pre-line flex-1 overflow-y-auto scrollbar-hide">
                    {card.bodyText}
                  </p>

                  {/* Buttons for Card 1 */}
                  {card.hasButtons && (
                    <div className="flex flex-col gap-2 mt-3">
                      <Button
                        onClick={onDemoClick}
                        size="sm"
                        className="w-full text-xs h-8"
                        variant="default"
                      >
                        <BookOpen className="w-3 h-3 mr-1" />
                        Start Interactive Guide
                      </Button>
                      <Button
                        onClick={onVideoClick}
                        size="sm"
                        className="w-full text-xs h-8"
                        variant="outline"
                      >
                        <Play className="w-3 h-3 mr-1" />
                        Watch Video Tutorial
                      </Button>
                    </div>
                  )}

                  {/* Footer with Avatar (only for non-button cards) */}
                  {!card.hasButtons && (
                    <div className="flex items-center gap-2 mt-3 pt-2 border-t border-border/50">
                      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                        <span className="text-white text-[10px] font-bold">N</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[10px] font-semibold text-foreground">Neuvia Guide</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Pagination Dots */}
        <div className="flex items-center justify-center gap-2 mt-4">
          {cards.map((_, index) => (
            <button
              key={index}
              onClick={() => scrollToCard(index)}
              className={`h-2 rounded-full transition-all duration-300 ${index === currentIndex
                ? "w-6 bg-primary"
                : "w-2 bg-muted-foreground/30 hover:bg-muted-foreground/50"
                }`}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      </div>

      {/* Custom CSS for hiding scrollbar */}
      <style>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
};

export default OnboardingCarousel;
