import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Plus, BookOpen, Calendar, ArrowRight, Loader2, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import Navbar from "@/components/layout/Navbar";
import VideoModal from "@/components/roadmap/VideoModal";
import OnboardingCarousel from "@/components/dashboard/OnboardingCarousel";
import FeedbackButton from "@/components/roadmap/FeedbackButton";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useLearningPaths, LearningPathData } from "@/hooks/useLearningPath";
import { useAuth } from "@/hooks/useAuth";

const Dashboard = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useToast();
  const { user, signOut } = useAuth();
  const { paths, loading, invalidate } = useLearningPaths();
  const [showNewPathForm, setShowNewPathForm] = useState(false);
  const [newPathGoal, setNewPathGoal] = useState("");
  const [newPathContext, setNewPathContext] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [deletingPathId, setDeletingPathId] = useState<string | null>(null);
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [isPathsExpanded, setIsPathsExpanded] = useState(true);

  // Load paths expanded state from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("pathsExpanded");
    if (saved !== null) {
      setIsPathsExpanded(saved === "true");
    }
  }, []);

  // Auto-show tutorial video for users who haven't seen it yet (user-specific)
  useEffect(() => {
    if (!user) return;
    const tutorialSeen = localStorage.getItem(`tutorialSeen_${user.id}`);
    if (!tutorialSeen) {
      setShowVideoModal(true);
    }
  }, [user]);

  // Check if redirected from tutorial with newPath=true
  useEffect(() => {
    if (searchParams.get("newPath") === "true") {
      setShowNewPathForm(true);
      // Remove the query parameter to clean up the URL
      setSearchParams({});
    }
  }, [searchParams, setSearchParams]);

  const handleLogout = async () => {
    await signOut();
    // ProtectedRoute will automatically redirect to /auth when user becomes null
  };

  const handleCreatePath = async () => {
    if (!newPathGoal.trim() || !user) return;

    setIsGenerating(true);

    try {
      // Generate curriculum with AI
      const { data, error } = await supabase.functions.invoke('generate-curriculum', {
        body: { goal: newPathGoal, context: newPathContext }
      });

      if (error) {
        throw new Error(error.message);
      }

      if (!data?.curriculum || !data?.firstMilestone) {
        throw new Error('Invalid response from AI');
      }

      // Create learning path in database with curriculum
      const { data: pathData, error: pathError } = await supabase
        .from("learning_paths")
        .insert({
          user_id: user.id,
          title: newPathGoal.slice(0, 50),
          goal: newPathGoal,
          context: newPathContext || null,
          curriculum: data.curriculum,
          current_milestone_index: 0,
          progression_context: data.progressionContext || {},
        })
        .select()
        .single();

      if (pathError) throw pathError;

      // Create ONLY the first milestone
      const { error: milestoneError } = await supabase
        .from("milestones")
        .insert({
          learning_path_id: pathData.id,
          title: data.firstMilestone.title,
          description: data.firstMilestone.description,
          first_topic: data.firstMilestone.firstTopic,
          order_index: 0,
          milestone_status: 'active',
          started_at: new Date().toISOString(),
        });

      if (milestoneError) throw milestoneError;

      toast({
        title: "Path created!",
        description: "Your personalized learning journey has begun. Start with your first milestone!",
      });

      // Navigate to roadmap with path ID
      navigate(`/roadmap?path=${pathData.id}`);

    } catch (error) {
      console.error('Error generating curriculum:', error);
      toast({
        title: "Failed to generate curriculum",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const openPath = (path: LearningPathData) => {
    navigate(`/roadmap?path=${path.id}`);
  };

  const togglePathsExpanded = () => {
    const newState = !isPathsExpanded;
    setIsPathsExpanded(newState);
    localStorage.setItem("pathsExpanded", newState.toString());
  };

  const handleDeletePath = async (e: React.MouseEvent, pathId: string, pathTitle: string) => {
    e.stopPropagation(); // Prevent card click

    const confirmed = window.confirm(
      `Are you sure you want to delete "${pathTitle}"?\n\nThis will permanently delete all milestones, content, quizzes, flashcards, and progress data. This action cannot be undone.`
    );

    if (!confirmed) return;

    setDeletingPathId(pathId);

    try {
      const { error } = await supabase
        .from('learning_paths')
        .delete()
        .eq('id', pathId);

      if (error) throw error;

      toast({
        title: "Learning path deleted",
        description: `"${pathTitle}" has been permanently removed`,
      });

      // Invalidate cache to refetch paths
      invalidate();
    } catch (error) {
      console.error('Error deleting learning path:', error);
      toast({
        title: "Failed to delete learning path",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      });
    } finally {
      setDeletingPathId(null);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar isLoggedIn onLogout={handleLogout} />
      <FeedbackButton position="top" />

      <main className="container max-w-5xl px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Your Learning Paths</h1>
            <p className="text-muted-foreground mt-1">
              Create and manage your personalized learning journeys
            </p>
          </div>
          <Button
            variant="hero"
            onClick={() => setShowNewPathForm(!showNewPathForm)}
          >
            <Plus className="w-5 h-5 mr-2" />
            New Path
          </Button>
        </div>

        {/* New Path Form */}
        {showNewPathForm && (
          <div className="bg-card rounded-2xl border-2 border-primary/30 p-6 mb-8 animate-scale-in shadow-soft">
            <h2 className="text-xl font-bold mb-4">Create a New Learning Path</h2>

            {isGenerating ? (
              <div className="flex flex-col items-center justify-center py-12 space-y-4">
                <Loader2 className="w-10 h-10 text-primary animate-spin" />
                <div className="text-center">
                  <p className="text-lg font-medium">AI is creating your personalized curriculum...</p>
                  <p className="text-sm text-muted-foreground mt-1">This may take a few seconds</p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    What do you want to learn?
                  </label>
                  <Input
                    placeholder="e.g., I want to learn Python programming for data science"
                    value={newPathGoal}
                    onChange={(e) => setNewPathGoal(e.target.value)}
                    className="text-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Any additional context? (optional)
                  </label>
                  <Textarea
                    placeholder="e.g., I have some experience with JavaScript and want to transition into data science..."
                    value={newPathContext}
                    onChange={(e) => setNewPathContext(e.target.value)}
                  />
                </div>
                <div className="flex gap-3 pt-2">
                  <Button onClick={handleCreatePath} disabled={!newPathGoal.trim()}>
                    Create Curriculum
                  </Button>
                  <Button variant="ghost" onClick={() => setShowNewPathForm(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="flex justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        )}

        {/* Onboarding Carousel */}
        {!loading && (
          <OnboardingCarousel
            onVideoClick={() => setShowVideoModal(true)}
            onDemoClick={() => navigate("/roadmap?demo=true")}
          />
        )}

        {/* Your Paths Section */}
        {!loading && paths.length > 0 && (
          <div>
            {/* Collapsible Header */}
            <button
              onClick={togglePathsExpanded}
              className="w-full flex items-center justify-between mb-4 group hover:opacity-80 transition-opacity"
            >
              <h2 className="text-lg font-semibold">Your Learning Paths</h2>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  {paths.length} {paths.length === 1 ? 'path' : 'paths'}
                </span>
                {isPathsExpanded ? (
                  <ChevronUp className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                )}
              </div>
            </button>

            {/* Collapsible Content */}
            <div className={`grid gap-4 md:grid-cols-2 transition-all duration-300 overflow-hidden ${
              isPathsExpanded ? 'opacity-100 max-h-[10000px]' : 'opacity-0 max-h-0'
            }`}>
              {paths.map((path, index) => (
                <div
                  key={path.id}
                  className="relative group bg-card rounded-2xl border-2 border-border transition-all duration-300 hover:border-primary/50 hover:shadow-soft animate-fade-in"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <button
                    onClick={() => openPath(path)}
                    className="w-full p-6 text-left"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                          <BookOpen className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-bold text-lg group-hover:text-primary transition-colors">
                            {path.title}
                          </h3>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(path.updated_at).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    </div>
                    {/* Only show goal if it's different from title */}
                    {path.goal && path.goal.trim() !== path.title.trim() && (
                      <p className="text-muted-foreground mt-3 line-clamp-2">
                        {path.goal}
                      </p>
                    )}
                  </button>

                  {/* Action buttons - stacked vertically on hover */}
                  <div className="absolute top-4 right-4 flex flex-col gap-1">
                    {/* Arrow - always visible */}
                    <div className="p-2">
                      <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                    </div>

                    {/* Delete Button - visible on hover */}
                    <button
                      onClick={(e) => handleDeletePath(e, path.id, path.title)}
                      disabled={deletingPathId === path.id}
                      className="p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-destructive/10 disabled:opacity-50"
                      title="Delete learning path"
                    >
                      {deletingPathId === path.id ? (
                        <Loader2 className="w-4 h-4 text-destructive animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4 text-destructive" />
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {!loading && paths.length === 0 && !showNewPathForm && (
          <div className="text-center py-16">
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
              <BookOpen className="w-10 h-10 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-bold mb-2">No learning paths yet</h3>
            <p className="text-muted-foreground mb-6">
              Create your first path to start your learning journey
            </p>
            <Button variant="hero" onClick={() => setShowNewPathForm(true)}>
              <Plus className="w-5 h-5 mr-2" />
              Create Your First Path
            </Button>
          </div>
        )}
      </main>

      {/* Video Modal */}
      <VideoModal
        videoSrc="/tutorial.mp4"
        title="Tutorial"
        isOpen={showVideoModal}
        onClose={() => {
          setShowVideoModal(false);
          // Mark tutorial as seen so it doesn't auto-show again (user-specific)
          if (user) {
            localStorage.setItem(`tutorialSeen_${user.id}`, "true");
          }
        }}
      />
    </div>
  );
};

export default Dashboard;
