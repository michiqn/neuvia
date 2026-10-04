import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Eye, EyeOff } from "lucide-react";
import { z } from "zod";

const passwordSchema = z.string().min(6, "Password must be at least 6 characters");

const ResetPassword = () => {
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [errors, setErrors] = useState<{ password?: string; confirmPassword?: string }>({});

    const navigate = useNavigate();
    const { toast } = useToast();
    const { updatePassword, session, loading } = useAuth();

    useEffect(() => {
        // If there's no session after loading, redirect to auth
        // The user needs to be authenticated via the reset password link
        if (!loading && !session) {
            toast({
                title: "Session expired",
                description: "Please request a new password reset link.",
                variant: "destructive",
            });
            navigate("/auth");
        }
    }, [session, loading, navigate, toast]);

    const validateForm = () => {
        const newErrors: { password?: string; confirmPassword?: string } = {};

        const passwordResult = passwordSchema.safeParse(password);
        if (!passwordResult.success) {
            newErrors.password = passwordResult.error.errors[0].message;
        }

        if (password !== confirmPassword) {
            newErrors.confirmPassword = "Passwords do not match";
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateForm()) return;

        setIsLoading(true);

        try {
            const { error } = await updatePassword(password);
            if (error) {
                toast({
                    title: "Error",
                    description: error.message,
                    variant: "destructive",
                });
            } else {
                setIsSuccess(true);
                toast({
                    title: "Password updated!",
                    description: "Your password has been successfully reset.",
                });
            }
        } catch (error) {
            toast({
                title: "Error",
                description: "An unexpected error occurred. Please try again.",
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="animate-pulse text-muted-foreground">Loading...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
            <div className="w-full max-w-md animate-fade-in">
                {/* Logo */}
                <div className="text-center mb-8">
                    <h1 className="text-5xl font-extrabold italic text-primary handwritten">
                        Neuvia
                    </h1>
                    <p className="text-muted-foreground mt-2">
                        Your personalized learning journey
                    </p>
                </div>

                {/* Reset Password Card */}
                <div className="bg-card rounded-2xl shadow-soft border-2 border-border p-8">
                    <h2 className="text-2xl font-bold text-center mb-6">
                        Set new password
                    </h2>

                    {isSuccess ? (
                        <div className="text-center space-y-4">
                            <p className="text-muted-foreground">
                                Your password has been successfully updated. You can now use your new password to sign in.
                            </p>
                            <Button
                                variant="hero"
                                onClick={() => navigate("/dashboard")}
                                className="mt-4"
                            >
                                Go to Dashboard
                            </Button>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label htmlFor="password" className="block text-sm font-medium mb-2">
                                    New Password
                                </label>
                                <div className="relative">
                                    <Input
                                        id="password"
                                        type={showPassword ? "text" : "password"}
                                        placeholder="••••••••"
                                        value={password}
                                        onChange={(e) => {
                                            setPassword(e.target.value);
                                            setErrors((prev) => ({ ...prev, password: undefined }));
                                        }}
                                        className={errors.password ? "border-destructive pr-10" : "pr-10"}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                                        tabIndex={-1}
                                    >
                                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                    </button>
                                </div>
                                {errors.password && (
                                    <p className="text-sm text-destructive mt-1">{errors.password}</p>
                                )}
                            </div>

                            <div>
                                <label htmlFor="confirmPassword" className="block text-sm font-medium mb-2">
                                    Confirm New Password
                                </label>
                                <div className="relative">
                                    <Input
                                        id="confirmPassword"
                                        type={showConfirmPassword ? "text" : "password"}
                                        placeholder="••••••••"
                                        value={confirmPassword}
                                        onChange={(e) => {
                                            setConfirmPassword(e.target.value);
                                            setErrors((prev) => ({ ...prev, confirmPassword: undefined }));
                                        }}
                                        className={errors.confirmPassword ? "border-destructive pr-10" : "pr-10"}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                                        tabIndex={-1}
                                    >
                                        {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                    </button>
                                </div>
                                {errors.confirmPassword && (
                                    <p className="text-sm text-destructive mt-1">{errors.confirmPassword}</p>
                                )}
                            </div>

                            <Button
                                type="submit"
                                variant="hero"
                                size="lg"
                                className="w-full mt-6"
                                disabled={isLoading}
                            >
                                {isLoading ? "Updating..." : "Update password"}
                            </Button>
                        </form>
                    )}

                    <div className="mt-6 text-center">
                        <p className="text-sm text-muted-foreground">
                            <button
                                onClick={() => navigate("/auth")}
                                className="text-primary font-semibold hover:underline"
                            >
                                Back to login
                            </button>
                        </p>
                    </div>
                </div>

                {/* Decorative bubbles */}
                <div className="relative mt-12 flex justify-center gap-4 opacity-50">
                    <div className="w-8 h-8 rounded-full bg-bubble-content animate-float" style={{ animationDelay: "0s" }} />
                    <div className="w-6 h-6 rounded-full bg-bubble-quiz animate-float" style={{ animationDelay: "0.5s" }} />
                    <div className="w-7 h-7 rounded-full bg-bubble-flashcard animate-float" style={{ animationDelay: "1s" }} />
                    <div className="w-5 h-5 rounded-full bg-bubble-iow animate-float" style={{ animationDelay: "1.5s" }} />
                </div>
            </div>
        </div>
    );
};

export default ResetPassword;
