import { MathText } from "@/components/MathText";
import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { RotateCw, ChevronLeft, ChevronRight, Layers, ArrowLeft, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Navbar from "@/components/layout/Navbar";
import { FlashcardEntry } from "@/types/learning";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface FlashcardWithPath extends FlashcardEntry {
  pathName: string;
  pathId: string;
  milestoneName: string;
  milestoneId: string;
  contentBubbleName: string;
  contentBubbleId: string;
}

interface LearningPath {
  id: string;
  title: string;
  flashcardCount: number;
  lastActivity?: string;
}

const Stack = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const pathId = searchParams.get("pathId");

  const [learningPaths, setLearningPaths] = useState<LearningPath[]>([]);
  const [allCards, setAllCards] = useState<FlashcardWithPath[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedMilestone, setSelectedMilestone] = useState("All");
  const [selectedContentBubble, setSelectedContentBubble] = useState("All");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [showPathDropdown, setShowPathDropdown] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) {
        setAllCards([]);
        setLearningPaths([]);
        setLoading(false);
        return;
      }

      try {
        // OPTIMIZED: Single query with joins to get all flashcards with path, milestone, and content info
        const { data: flashcardsData, error: flashcardsError } = await supabase
          .from("flashcards")
          .select(`
            id,
            front,
            back,
            category,
            interaction_id,
            interactions!inner (
              content_bubble_id,
              content_bubbles!inner (
                id,
                title,
                milestone_id,
                milestones!inner (
                  id,
                  title,
                  learning_path_id,
                  learning_paths!inner (
                    id,
                    title,
                    user_id
                  )
                )
              )
            )
          `)
          .eq('interactions.content_bubbles.milestones.learning_paths.user_id', user.id);

        if (flashcardsError) throw flashcardsError;

        // Get unique paths from flashcard data
        const pathsMap = new Map<string, { id: string; title: string }>();
        const flashcardsWithPaths: FlashcardWithPath[] = [];

        (flashcardsData || []).forEach((fc) => {
          const contentBubble = fc.interactions?.content_bubbles;
          const milestone = contentBubble?.milestones;
          const learningPath = milestone?.learning_paths;

          if (learningPath && milestone && contentBubble) {
            pathsMap.set(learningPath.id, {
              id: learningPath.id,
              title: learningPath.title,
            });

            flashcardsWithPaths.push({
              id: fc.id,
              front: fc.front,
              back: fc.back,
              category: fc.category,
              pathName: learningPath.title,
              pathId: learningPath.id,
              milestoneName: milestone.title,
              milestoneId: milestone.id,
              contentBubbleName: contentBubble.title,
              contentBubbleId: contentBubble.id,
            });
          }
        });

        const paths = Array.from(pathsMap.values());

        if (paths.length === 0) {
          setAllCards([]);
          setLearningPaths([]);
          setLoading(false);
          return;
        }

        // Auto-select last visited path if no pathId is specified
        let activePathId = pathId;
        if (!pathId && paths.length > 0) {
          const lastVisitedPathId = localStorage.getItem('lastVisitedStackPath');
          if (lastVisitedPathId && paths.some(p => p.id === lastVisitedPathId)) {
            activePathId = lastVisitedPathId;
            setSearchParams({ pathId: lastVisitedPathId });
          } else {
            activePathId = paths[0].id;
            setSearchParams({ pathId: paths[0].id });
          }
        }

        // Filter cards for the active path
        const activePathCards = activePathId
          ? flashcardsWithPaths.filter(card => card.pathId === activePathId)
          : flashcardsWithPaths;

        setAllCards(activePathCards);

        // Calculate flashcard counts for path list
        const pathFlashcardCounts = new Map<string, number>();
        flashcardsWithPaths.forEach((card) => {
          const count = pathFlashcardCounts.get(card.pathId) || 0;
          pathFlashcardCounts.set(card.pathId, count + 1);
        });

        const lastVisitedPathId = localStorage.getItem('lastVisitedStackPath');
        const lastVisitedTime = localStorage.getItem('lastVisitedStackTime');

        const pathsWithCounts: LearningPath[] = paths.map((p) => ({
          id: p.id,
          title: p.title,
          flashcardCount: pathFlashcardCounts.get(p.id) || 0,
          lastActivity: p.id === lastVisitedPathId ? lastVisitedTime || undefined : undefined,
        }));

        // Sort paths: last visited first, then by flashcard count
        pathsWithCounts.sort((a, b) => {
          if (a.lastActivity && !b.lastActivity) return -1;
          if (!a.lastActivity && b.lastActivity) return 1;
          if (a.lastActivity && b.lastActivity) {
            return new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime();
          }
          return b.flashcardCount - a.flashcardCount;
        });

        setLearningPaths(pathsWithCounts);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user, pathId]);

  const handleLogout = async () => {
    await signOut();
    // ProtectedRoute will automatically redirect to /auth when user becomes null
  };

  const handleBackToRoadmap = () => {
    if (pathId) {
      navigate(`/roadmap?path=${pathId}`);
    } else {
      navigate("/dashboard");
    }
  };

  const handleSelectPath = (selectedPathId: string) => {
    // Save to localStorage as last visited path
    localStorage.setItem('lastVisitedStackPath', selectedPathId);
    localStorage.setItem('lastVisitedStackTime', new Date().toISOString());
    setSearchParams({ pathId: selectedPathId });
    setShowPathDropdown(false);
    setSelectedCategory("All");
    setSelectedMilestone("All");
    setSelectedContentBubble("All");
    setCurrentIndex(0);
    setIsFlipped(false);
  };

  const categories = ["All", ...new Set(allCards.map((f) => f.category))];
  const milestones = ["All", ...new Set(allCards.map((f) => f.milestoneName))];
  const contentBubbles = ["All", ...new Set(allCards.map((f) => f.contentBubbleName))];

  const filteredCards = allCards.filter((c) => {
    const categoryMatch = selectedCategory === "All" || c.category === selectedCategory;
    const milestoneMatch = selectedMilestone === "All" || c.milestoneName === selectedMilestone;
    const contentMatch = selectedContentBubble === "All" || c.contentBubbleName === selectedContentBubble;
    return categoryMatch && milestoneMatch && contentMatch;
  });

  const currentCard = filteredCards[currentIndex];

  const nextCard = () => {
    setIsFlipped(false);
    setTimeout(() => {
      setCurrentIndex((prev) => (prev + 1) % filteredCards.length);
    }, 200);
  };

  const prevCard = () => {
    setIsFlipped(false);
    setTimeout(() => {
      setCurrentIndex((prev) => (prev - 1 + filteredCards.length) % filteredCards.length);
    }, 200);
  };

  // Reset index when filters change
  useEffect(() => {
    setCurrentIndex(0);
    setIsFlipped(false);
  }, [selectedCategory, selectedMilestone, selectedContentBubble]);

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen bg-background">
        <Navbar isLoggedIn onLogout={handleLogout} />
        <main className="flex flex-col flex-1 container max-w-2xl px-4 py-4 sm:py-12">
          <div className="flex flex-col flex-1 items-center justify-center">
            <div className="w-16 h-16 sm:w-20 sm:h-20 mb-4 rounded-full bg-muted flex items-center justify-center animate-pulse">
              <Layers className="w-8 h-8 sm:w-10 sm:h-10 text-muted-foreground" />
            </div>
            <p className="text-sm sm:text-base text-muted-foreground">Loading flashcards...</p>
          </div>
        </main>
      </div>
    );
  }

  const currentPath = learningPaths.find(p => p.id === pathId);

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Navbar isLoggedIn onLogout={handleLogout} />

      <main className="flex flex-col flex-1 container max-w-2xl px-4 py-4 sm:py-12">
        {/* Header with Back Button */}
        <div className="flex items-center justify-between mb-3 sm:mb-8">
          {/* Back to Path - Top Left */}
          {pathId && (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleBackToRoadmap}
              className="rounded-full"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
          )}
          {!pathId && <div />}

          {/* Title - Center */}
          <div className="text-center flex-1">
            <h1 className="text-2xl sm:text-3xl font-bold mb-1 sm:mb-2">Flashcard Stack</h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              {currentPath?.title || "Select a path"}
            </p>
          </div>

          {/* Spacer for alignment */}
          <div className="w-10" />
        </div>

        {learningPaths.length > 0 ? (
          <>
            {/* Path Selector */}
            <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-4 mb-2 sm:mb-4">
              <DropdownMenu open={showPathDropdown} onOpenChange={setShowPathDropdown}>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2 min-w-[140px] sm:min-w-[200px] justify-between text-xs sm:text-sm">
                    <div className="flex items-center gap-2">
                      <Layers className="w-3 h-3 sm:w-4 sm:h-4" />
                      <span className="truncate">{currentPath?.title || "Select Path"}</span>
                    </div>
                    {currentPath?.lastActivity && (
                      <Clock className="w-3 h-3 text-primary" />
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-[300px] max-h-[400px] overflow-y-auto">
                  {learningPaths.map((path) => (
                    <DropdownMenuItem
                      key={path.id}
                      onClick={() => handleSelectPath(path.id)}
                      className={`flex items-center justify-between ${pathId === path.id ? "bg-accent" : ""}`}
                    >
                      <div className="flex items-center gap-2">
                        <Layers className="w-4 h-4" />
                        <div>
                          <div className="font-medium">{path.title}</div>
                          <div className="text-xs text-muted-foreground">
                            {path.flashcardCount} {path.flashcardCount === 1 ? "card" : "cards"}
                          </div>
                        </div>
                      </div>
                      {path.lastActivity && (
                        <span className="flex items-center gap-1 text-xs text-primary">
                          <Clock className="w-3 h-3" />
                        </span>
                      )}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Filters */}
            {allCards.length > 0 && (
              <div className="space-y-2 mb-3 sm:mb-6">
                {/* Category Filter */}
                <div className="flex items-center gap-2">
                  <span className="text-xs sm:text-sm text-muted-foreground min-w-[60px] sm:min-w-[80px]">Category:</span>
                  <div className="flex gap-1 sm:gap-2 overflow-x-auto pb-1 sm:pb-2">
                    {categories.map((category) => (
                      <Button
                        key={category}
                        variant={selectedCategory === category ? "default" : "outline"}
                        onClick={() => {
                          if (category === "All") {
                            // Reset all filters when clicking "All"
                            setSelectedCategory("All");
                            setSelectedMilestone("All");
                            setSelectedContentBubble("All");
                          } else {
                            setSelectedCategory(category);
                          }
                        }}
                        size="sm"
                        className="whitespace-nowrap text-xs h-7 px-2 sm:h-8 sm:px-3"
                      >
                        {category.length > 15 ? `${category.substring(0, 15)}...` : category}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Milestone Filter */}
                <div className="flex items-center gap-2">
                  <span className="text-xs sm:text-sm text-muted-foreground min-w-[60px] sm:min-w-[80px]">Milestone:</span>
                  <div className="flex gap-1 sm:gap-2 overflow-x-auto pb-1 sm:pb-2">
                    {milestones.map((milestone) => (
                      <Button
                        key={milestone}
                        variant={selectedMilestone === milestone ? "default" : "outline"}
                        onClick={() => setSelectedMilestone(milestone)}
                        size="sm"
                        className="whitespace-nowrap text-xs h-7 px-2 sm:h-8 sm:px-3"
                      >
                        {milestone.length > 15 ? `${milestone.substring(0, 15)}...` : milestone}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Content Bubble Filter */}
                <div className="flex items-center gap-2">
                  <span className="text-xs sm:text-sm text-muted-foreground min-w-[60px] sm:min-w-[80px]">Content:</span>
                  <div className="flex gap-1 sm:gap-2 overflow-x-auto pb-1 sm:pb-2">
                    {contentBubbles.map((content) => (
                      <Button
                        key={content}
                        variant={selectedContentBubble === content ? "default" : "outline"}
                        onClick={() => setSelectedContentBubble(content)}
                        size="sm"
                        className="whitespace-nowrap text-xs h-7 px-2 sm:h-8 sm:px-3"
                      >
                        {content.length > 15 ? `${content.substring(0, 15)}...` : content}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {filteredCards.length > 0 && currentCard ? (
              <div className="flex flex-col flex-1 min-h-0">
                {/* Flashcard - Flex Grow to Fill Space */}
                <div
                  onClick={() => setIsFlipped(!isFlipped)}
                  className="relative flex-1 cursor-pointer perspective-1000 min-h-[250px] sm:min-h-[300px]"
                >
                  <div
                    className={`absolute inset-0 transition-all duration-500 transform-style-preserve-3d ${isFlipped ? "rotate-y-180" : ""
                      }`}
                    style={{
                      transformStyle: "preserve-3d",
                      transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
                    }}
                  >
                    {/* Front */}
                    <div
                      className="absolute inset-0 bg-card rounded-2xl border-2 border-border shadow-soft p-4 sm:p-8 flex flex-col items-center justify-center backface-hidden"
                      style={{ backfaceVisibility: "hidden" }}
                    >
                      {/* Progress Indicator - Top Right */}
                      <div className="absolute top-3 right-3 sm:top-4 sm:right-4 flex items-center gap-1 text-xs sm:text-sm text-muted-foreground bg-muted/80 px-2 py-1 rounded-full">
                        <Layers className="w-3 h-3" />
                        <span>{currentIndex + 1}/{filteredCards.length}</span>
                      </div>

                      <div className="flex items-center gap-2 mb-4">
                        <span className="text-xs text-muted-foreground bg-muted px-3 py-1 rounded-full">
                          {currentCard.category}
                        </span>
                      </div>
                      <p className="text-lg sm:text-xl font-bold text-center px-4">
                        <MathText inline>{currentCard.front}</MathText>
                      </p>
                      <p className="text-xs sm:text-sm text-muted-foreground mt-4">
                        Tap to reveal answer
                      </p>
                    </div>

                    {/* Back */}
                    <div
                      className="absolute inset-0 bg-bubble-flashcard/20 rounded-2xl border-2 border-bubble-flashcard shadow-soft p-4 sm:p-8 flex flex-col items-center justify-center"
                      style={{
                        backfaceVisibility: "hidden",
                        transform: "rotateY(180deg)",
                      }}
                    >
                      {/* Progress Indicator - Top Right (Back Side) */}
                      <div className="absolute top-3 right-3 sm:top-4 sm:right-4 flex items-center gap-1 text-xs sm:text-sm text-muted-foreground bg-muted/80 px-2 py-1 rounded-full">
                        <Layers className="w-3 h-3" />
                        <span>{currentIndex + 1}/{filteredCards.length}</span>
                      </div>

                      <p className="text-base sm:text-lg text-center px-4"><MathText inline>{currentCard.back}</MathText></p>
                    </div>
                  </div>
                </div>

                {/* Actions - Always at Bottom */}
                <div className="flex items-center justify-center gap-3 sm:gap-4 mt-4 sm:mt-6 pb-2 sm:pb-4">
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={prevCard}
                    className="rounded-full w-12 h-12 sm:w-14 sm:h-14 p-0"
                  >
                    <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="lg"
                    onClick={() => setIsFlipped(!isFlipped)}
                    className="rounded-full w-10 h-10 sm:w-12 sm:h-12 p-0"
                  >
                    <RotateCw className="w-4 h-4 sm:w-5 sm:h-5" />
                  </Button>
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={nextCard}
                    className="rounded-full w-12 h-12 sm:w-14 sm:h-14 p-0"
                  >
                    <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6" />
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col flex-1 items-center justify-center py-8 sm:py-16">
                <div className="w-16 h-16 sm:w-20 sm:h-20 mb-4 rounded-full bg-muted flex items-center justify-center">
                  <Layers className="w-8 h-8 sm:w-10 sm:h-10 text-muted-foreground" />
                </div>
                <h3 className="text-lg sm:text-xl font-bold mb-2">
                  {selectedCategory === "All" ? "No flashcards yet" : `No flashcards in "${selectedCategory}"`}
                </h3>
                <p className="text-sm sm:text-base text-muted-foreground px-4 text-center">
                  {selectedCategory === "All"
                    ? "Create flashcards in this learning path to see them here"
                    : "Try selecting a different category"}
                </p>
              </div>
            )}
          </>
        ) : (
          <div className="flex flex-col flex-1 items-center justify-center py-8 sm:py-16">
            <div className="w-16 h-16 sm:w-20 sm:h-20 mb-4 rounded-full bg-muted flex items-center justify-center">
              <Layers className="w-8 h-8 sm:w-10 sm:h-10 text-muted-foreground" />
            </div>
            <h3 className="text-lg sm:text-xl font-bold mb-2">No learning paths yet</h3>
            <p className="text-sm sm:text-base text-muted-foreground px-4 text-center">
              Create learning paths with flashcards to see them here
            </p>
          </div>
        )}
      </main>
    </div>
  );
};

export default Stack;
