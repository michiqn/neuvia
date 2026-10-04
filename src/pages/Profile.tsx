import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { User, Mail, BookOpen, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Navbar from "@/components/layout/Navbar";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

const Profile = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [learningPathsCount, setLearningPathsCount] = useState<number>(0);
  const [daysActive, setDaysActive] = useState<number>(0);

  // Fetch learning paths count
  useEffect(() => {
    const fetchLearningPaths = async () => {
      if (!user) return;

      const { count, error } = await supabase
        .from("learning_paths")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id);

      if (!error && count !== null) {
        setLearningPathsCount(count);
      }
    };

    fetchLearningPaths();
  }, [user]);

  // Calculate days active
  useEffect(() => {
    if (!user?.created_at) return;

    const createdDate = new Date(user.created_at);
    const today = new Date();
    const diffTime = Math.abs(today.getTime() - createdDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    setDaysActive(diffDays);
  }, [user]);

  const handleLogout = async () => {
    await signOut();
    // ProtectedRoute will automatically redirect to /auth when user becomes null
  };

  const displayName = user?.user_metadata?.display_name || "Learning Enthusiast";
  const email = user?.email || "learner@example.com";

  return (
    <div className="min-h-screen bg-background">
      <Navbar isLoggedIn onLogout={handleLogout} />

      <main className="container max-w-2xl px-4 py-12">
        {/* Profile Header */}
        <div className="text-center mb-8">
          <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
            <User className="w-12 h-12 text-primary" />
          </div>
          <h1 className="text-2xl font-bold">Your Profile</h1>
          <p className="text-muted-foreground">Manage your account settings</p>
        </div>

        {/* Profile Form */}
        <div className="bg-card rounded-2xl border-2 border-border p-6 shadow-soft">
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium mb-2">
                <User className="w-4 h-4 inline mr-2" />
                Name
              </label>
              <Input value={displayName} readOnly />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                <Mail className="w-4 h-4 inline mr-2" />
                Email
              </label>
              <Input type="email" value={email} readOnly />
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 mt-8">
          <div className="bg-card rounded-2xl border-2 border-border p-6 text-center">
            <BookOpen className="w-8 h-8 mx-auto text-primary mb-2" />
            <p className="text-2xl font-bold">{learningPathsCount}</p>
            <p className="text-sm text-muted-foreground">Learning Paths</p>
          </div>
          <div className="bg-card rounded-2xl border-2 border-border p-6 text-center">
            <Calendar className="w-8 h-8 mx-auto text-secondary mb-2" />
            <p className="text-2xl font-bold">{daysActive}</p>
            <p className="text-sm text-muted-foreground">Days Active</p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Profile;
