import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Navbar from "@/components/layout/Navbar";
import RoadmapCanvas from "@/components/roadmap/RoadmapCanvas";
import CurriculumModal from "@/components/roadmap/CurriculumModal";
import RequestMilestoneModal from "@/components/roadmap/RequestMilestoneModal";
import { Button } from "@/components/ui/button";
import { useLearningPath } from "@/hooks/useLearningPath";
import { useAuth } from "@/hooks/useAuth";
import { Loader2, BookOpen } from "lucide-react";
import { Milestone } from "@/types/learning";

// Demo milestones that explain how to use the tool
const demoMilestones: Milestone[] = [
  {
    id: "demo-m1",
    title: "Welcome to Neuvia 👋",
    description: "Our vision is for Neuvia to become your personal learning architect, transforming static course materials into dynamic, interactive roadmaps tailored to your unique goals. We want to achieve this through continuous innovation and your ideas, bridging the gap between raw information and deep understanding. By combining adaptive content with AI-driven active learning, we are building a wonderful, AI-empowered app that truly empowers you to master even the most complex topics.",
    order: 0,
    isExpanded: true,
    contentBubbles: [
      {
        id: "demo-c1",
        type: "content",
        parentId: "demo-m1",
        title: "How It Works (click me)",
        content: `Welcome to Neuvia: Your Personal Learning Architect

Neuvia transforms static course materials into dynamic, interactive roadmaps tailored to your unique goals. By bridging the gap between raw information and deep understanding, we empower you to master complex topics through adaptive content and AI-driven active learning.

🚀 The First Step: Generate & Interact
Every learning journey starts with a Content Bubble. If you have just created a new path, click the (+) button on the roadmap to generate your first lesson. Once content exists, the magic happens: drag and drop any colored tool from the sidebar directly onto a Content Bubble to start your active learning cycle.

📍 Milestones
Each milestone is a conceptual pillar of your journey. Click a card to expand it and reveal the learning lanes within.

💡 Content Bubbles
These green hubs are your lessons. Click them to read the material. Remember: you must have a Content Bubble on the map before you can use the interactive tools!

🎯 Interactive Tools
Drag these from the right menu bar onto a Content Bubble to move from reading to mastering:
- Q (Quiz): Test your recall and identify knowledge gaps.
- F (Flashcard): Solidify key concepts through active repetition.
- iow (In Own Words): Prove your mastery by explaining concepts yourself.
- S (Summary): Consolidate your progress and finalize the lane.

Note: We are in early development. Your feedback and bug reports help us build a better experience for everyone—thank you for being an early architect!

Click any bubble in this demo to try the interaction now!`,
        order: 0,
        interactions: [
          { id: "demo-i1", type: "quiz", parentId: "demo-c1", order: 0, quizzes: [] },
          { id: "demo-i2", type: "flashcard", parentId: "demo-c1", order: 1, flashcards: [] },
          { id: "demo-i3", type: "iow", parentId: "demo-c1", order: 2, iowEntries: [] },
        ],
      },
    ],
  },
];

const Roadmap = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const pathId = searchParams.get("path");
  const isDemo = searchParams.get("demo") === "true";

  const [demoState, setDemoState] = useState<Milestone[]>(demoMilestones);
  const [showCurriculumModal, setShowCurriculumModal] = useState(false);
  const [showRequestMilestoneModal, setShowRequestMilestoneModal] = useState(false);

  const { signOut } = useAuth();

  const {
    path,
    milestones,
    setMilestones,
    loading,
    refetch,
    saveContentBubble,
    deleteContentBubble,
    saveInteraction,
    deleteInteraction,
    saveQuizzes,
    saveFlashcards,
    saveIOWEntries,
    saveSummary,
    generateBubbleSummary,
  } = useLearningPath(pathId);

  useEffect(() => {
    if (!loading && !pathId && !isDemo) {
      navigate("/dashboard");
    }
  }, [loading, pathId, isDemo, navigate]);

  const handleLogout = async () => {
    await signOut();
    // ProtectedRoute will automatically redirect to /auth when user becomes null
  };

  // Demo mode
  if (isDemo) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar isLoggedIn onLogout={handleLogout} />

        {/* Demo Header */}
        <div className="bg-gradient-to-r from-primary/10 to-accent/10 border-b">
          <div className="container max-w-4xl px-4 py-4">
            <div className="flex items-center gap-2">
              <span className="text-xs bg-primary/20 text-primary px-2 py-1 rounded-full font-medium">
                Tutorial
              </span>
              <h1 className="text-xl font-bold">How to Use Neuvia</h1>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Learn the basics of creating and managing your learning paths
            </p>
          </div>
        </div>

        {/* Demo Canvas - no persistence */}
        <RoadmapCanvas
          milestones={demoState}
          onMilestonesChange={setDemoState}
          onDemoModeRedirect={() => navigate("/dashboard?newPath=true")}
        />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar isLoggedIn onLogout={handleLogout} />
        <div className="flex items-center justify-center h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  // If not loading but no path data, show error state
  if (!loading && !path && pathId) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar isLoggedIn onLogout={handleLogout} />
        <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
          <div className="text-center">
            <h2 className="text-xl font-bold mb-2">Learning path not found</h2>
            <p className="text-muted-foreground mb-4">This path may not exist or failed to load</p>
            <Button onClick={() => navigate("/dashboard")}>
              Return to Dashboard
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar isLoggedIn onLogout={handleLogout} />

      {/* Path Header */}
      {path && (
        <div className="bg-card border-b">
          <div className="container max-w-4xl px-4 py-4">
            <h1 className="text-xl font-bold">{path.title}</h1>
            <p className="text-sm text-muted-foreground">{path.goal}</p>
          </div>
        </div>
      )}

      {/* Curriculum Overview Button */}
      {path?.curriculum && (
        <div className="bg-muted/30 border-b">
          <div className="container max-w-4xl px-4 py-3">
            <button
              onClick={() => setShowCurriculumModal(true)}
              className="text-sm text-primary hover:underline flex items-center gap-2 transition-colors"
            >
              <BookOpen className="w-4 h-4" />
              View Full Curriculum Outline
            </button>
          </div>
        </div>
      )}

      {/* Roadmap Canvas */}
      <RoadmapCanvas
        milestones={milestones}
        onMilestonesChange={setMilestones}
        onSaveContentBubble={saveContentBubble}
        onDeleteContentBubble={deleteContentBubble}
        onSaveInteraction={saveInteraction}
        onDeleteInteraction={deleteInteraction}
        onSaveQuizzes={saveQuizzes}
        onSaveFlashcards={saveFlashcards}
        onSaveIOWEntries={saveIOWEntries}
        onSaveSummary={saveSummary}
        onGenerateBubbleSummary={generateBubbleSummary}
        onRequestMilestone={() => setShowRequestMilestoneModal(true)}
      />

      {/* Modals */}
      {path && (
        <>
          <CurriculumModal
            curriculum={path.curriculum || ''}
            isOpen={showCurriculumModal}
            onClose={() => setShowCurriculumModal(false)}
          />

          <RequestMilestoneModal
            learningPathId={pathId || ''}
            isOpen={showRequestMilestoneModal}
            onClose={() => setShowRequestMilestoneModal(false)}
            onMilestoneCreated={() => {
              refetch();
              setShowRequestMilestoneModal(false);
            }}
          />
        </>
      )}
    </div>
  );
};

export default Roadmap;
