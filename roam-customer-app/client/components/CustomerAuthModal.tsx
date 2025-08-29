import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Eye, EyeOff, CheckCircle, AlertCircle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { logger } from '@/utils/logger';

interface CustomerAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: "signin" | "signup";
}

export const CustomerAuthModal: React.FC<CustomerAuthModalProps> = ({
  isOpen,
  onClose,
  defaultTab = "signin",
}) => {
  const {
    signInCustomer,
    signUpCustomer,
    signInWithGoogle,
    signInWithApple,
    resendVerificationEmail,
    loading,
  } = useAuth();
  const [activeTab, setActiveTab] = useState(defaultTab);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [verificationEmailSent, setVerificationEmailSent] = useState(false);
  const [lastEmailSentTo, setLastEmailSentTo] = useState<string | null>(null);

  // Update activeTab when defaultTab prop changes
  useEffect(() => {
    setActiveTab(defaultTab);
  }, [defaultTab]);

  // Sign in form state
  const [signInData, setSignInData] = useState({
    email: "",
    password: "",
  });

  // Sign up form state
  const [signUpData, setSignUpData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
    phone: "",
  });

  const resetForm = () => {
    setSignInData({ email: "", password: "" });
    setSignUpData({
      firstName: "",
      lastName: "",
      email: "",
      password: "",
      confirmPassword: "",
      phone: "",
    });
    setError(null);
    setSuccess(null);
    setShowPassword(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const validateSignUp = () => {
    if (!signUpData.firstName.trim()) {
      setError("First name is required");
      return false;
    }
    if (!signUpData.lastName.trim()) {
      setError("Last name is required");
      return false;
    }
    if (!signUpData.email.trim()) {
      setError("Email is required");
      return false;
    }
    if (!/\S+@\S+\.\S+/.test(signUpData.email)) {
      setError("Please enter a valid email address");
      return false;
    }
    if (signUpData.password.length < 8) {
      setError("Password must be at least 8 characters long");
      return false;
    }
    if (signUpData.password !== signUpData.confirmPassword) {
      setError("Passwords do not match");
      return false;
    }
    return true;
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!signInData.email || !signInData.password) {
      setError("Please fill in all fields");
      return;
    }

    try {
      await signInCustomer(signInData.email, signInData.password);
      setSuccess("Successfully signed in!");
      setTimeout(() => {
        handleClose();
      }, 1500);
    } catch (err: any) {
      logger.error("Sign in error:", err);
      // Provide more user-friendly error messages
      let errorMessage = "Sign in failed. Please try again.";
      if (err.message?.includes("Invalid login credentials")) {
        errorMessage =
          "Invalid email or password. Please check your credentials.";
      } else if (err.message?.includes("Email not confirmed")) {
        errorMessage =
          "Please check your email and confirm your account before signing in.";
      } else if (err.message?.includes("Customer account not found")) {
        errorMessage = "Account not found. Please sign up first.";
      }
      setError(errorMessage);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!validateSignUp()) {
      return;
    }

    try {
      await signUpCustomer({
        email: signUpData.email,
        password: signUpData.password,
        firstName: signUpData.firstName,
        lastName: signUpData.lastName,
        phone: signUpData.phone,
      });

      // Check if this was successful registration that requires email confirmation
      setSuccess(
        "Account created successfully! Please check your email to confirm your account, then sign in.",
      );
      setVerificationEmailSent(true);
      setLastEmailSentTo(signUpData.email);
      setActiveTab("signin");
      setSignInData({ email: signUpData.email, password: "" });
    } catch (err: any) {
      logger.error("Sign up error:", err);
      // Provide more user-friendly error messages
      let errorMessage = "Sign up failed. Please try again.";
      if (
        err.message?.includes("already registered") ||
        err.message?.includes("already been registered")
      ) {
        errorMessage =
          "An account with this email already exists. Please sign in instead.";
      } else if (err.message?.includes("password")) {
        errorMessage = "Password must be at least 8 characters long.";
      } else if (err.message?.includes("email")) {
        errorMessage = "Please enter a valid email address.";
      } else if (err.message?.includes("Registration failed")) {
        errorMessage =
          "Please check your email to confirm your account, then try signing in.";
      }
      setError(errorMessage);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    try {
      await signInWithGoogle();
      // OAuth will redirect, so we don't need to handle success here
    } catch (err: any) {
      logger.error("Google sign-in error:", err);

      let errorMessage = "Failed to sign in with Google. Please try again.";
      if (
        err.message?.includes("provider is not enabled") ||
        err.error_code === "validation_failed"
      ) {
        errorMessage =
          "Google sign-in is currently unavailable. Please use email/password to sign in.";
      } else if (err.message?.includes("popup_closed")) {
        errorMessage = "Sign-in was cancelled. Please try again.";
      }

      setError(errorMessage);
    }
  };

  const handleAppleSignIn = async () => {
    setError(null);
    try {
      await signInWithApple();
      // OAuth will redirect, so we don't need to handle success here
    } catch (err: any) {
      logger.error("Apple sign-in error:", err);

      let errorMessage = "Failed to sign in with Apple. Please try again.";
      if (
        err.message?.includes("provider is not enabled") ||
        err.error_code === "validation_failed"
      ) {
        errorMessage =
          "Apple sign-in is currently unavailable. Please use email/password to sign in.";
      } else if (err.message?.includes("popup_closed")) {
        errorMessage = "Sign-in was cancelled. Please try again.";
      }

      setError(errorMessage);
    }
  };

  const isAppleDevice = () => {
    const userAgent = navigator.userAgent;
    return /iPad|iPhone|iPod|Macintosh/.test(userAgent);
  };

  const handleResendVerificationEmail = async (email: string) => {
    setError(null);
    try {
      await resendVerificationEmail(email);
      setSuccess(
        `Verification email resent to ${email}. Please check your inbox and spam folder.`,
      );
      setVerificationEmailSent(true);
      setLastEmailSentTo(email);
    } catch (err: any) {
      logger.error("Resend verification email error:", err);
      let errorMessage =
        "Failed to resend verification email. Please try again.";
      if (
        err.message?.includes("rate limit") ||
        err.message?.includes("too many")
      ) {
        errorMessage =
          "Too many requests. Please wait a few minutes before requesting another email.";
      } else if (err.message?.includes("not found")) {
        errorMessage =
          "Email address not found. Please check the email and try again.";
      }
      setError(errorMessage);
    }
  };

  // Enable OAuth providers for authentication
  const showOAuthProviders = true;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center text-2xl font-bold">
            Welcome to{" "}
            <img
              src="https://cdn.builder.io/api/v1/image/assets%2Fa42b6f9ec53e4654a92af75aad56d14f%2Fdcd8f042c3944c5c8b0e2484134236c2?format=webp&width=800"
              alt="ROAM"
              className="inline h-4 ml-2"
            />
          </DialogTitle>
          <DialogDescription className="text-center">
            Access your bookings and discover amazing local services
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="signin">Sign In</TabsTrigger>
            <TabsTrigger value="signup">Sign Up</TabsTrigger>
          </TabsList>

          <TabsContent value="signin" className="space-y-4">
            <Card>
              <CardContent className="pt-6">
                {/* OAuth Sign In Buttons */}
                {showOAuthProviders && (
                  <div className="space-y-3 mb-6">
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full"
                      onClick={handleGoogleSignIn}
                      disabled={loading}
                    >
                      <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
                        <path
                          fill="#4285F4"
                          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        />
                        <path
                          fill="#34A853"
                          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        />
                        <path
                          fill="#FBBC05"
                          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                        />
                        <path
                          fill="#EA4335"
                          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                        />
                      </svg>
                      Continue with Google
                    </Button>

                    {isAppleDevice() && (
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full"
                        onClick={handleAppleSignIn}
                        disabled={loading}
                      >
                        <svg
                          className="w-4 h-4 mr-2"
                          viewBox="0 0 24 24"
                          fill="currentColor"
                        >
                          <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
                        </svg>
                        Continue with Apple
                      </Button>
                    )}

                    <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t" />
                      </div>
                      <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-background px-2 text-muted-foreground">
                          Or continue with email
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                <form onSubmit={handleSignIn} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signin-email">Email</Label>
                    <Input
                      id="signin-email"
                      type="email"
                      placeholder="Enter your email"
                      value={signInData.email}
                      onChange={(e) =>
                        setSignInData({ ...signInData, email: e.target.value })
                      }
                      disabled={loading}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signin-password">Password</Label>
                    <div className="relative">
                      <Input
                        id="signin-password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Enter your password"
                        value={signInData.password}
                        onChange={(e) =>
                          setSignInData({
                            ...signInData,
                            password: e.target.value,
                          })
                        }
                        disabled={loading}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3"
                        onClick={() => setShowPassword(!showPassword)}
                        disabled={loading}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>

                  {error && (
                    <div className="flex items-center gap-2 text-red-600 text-sm">
                      <AlertCircle className="h-4 w-4" />
                      {error}
                    </div>
                  )}

                  {success && (
                    <div className="flex items-center gap-2 text-green-600 text-sm">
                      <CheckCircle className="h-4 w-4" />
                      {success}
                    </div>
                  )}

                  {/* Resend Verification Email */}
                  {(verificationEmailSent ||
                    error?.includes("Email not confirmed") ||
                    error?.includes("confirm your account")) &&
                    (lastEmailSentTo || signInData.email) && (
                      <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <p className="text-sm text-blue-800 mb-2">
                          Didn't receive the verification email?
                        </p>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            handleResendVerificationEmail(
                              lastEmailSentTo || signInData.email,
                            )
                          }
                          disabled={loading}
                          className="w-full border-blue-300 text-blue-700 hover:bg-blue-100"
                        >
                          Resend Verification Email
                        </Button>
                      </div>
                    )}

                  <Button
                    type="submit"
                    className="w-full bg-roam-blue hover:bg-roam-blue/90"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Signing In...
                      </>
                    ) : (
                      "Sign In"
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="signup" className="space-y-4">
            <Card>
              <CardContent className="pt-6">
                {/* OAuth Sign Up Buttons */}
                {showOAuthProviders && (
                  <div className="space-y-3 mb-6">
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full"
                      onClick={handleGoogleSignIn}
                      disabled={loading}
                    >
                      <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
                        <path
                          fill="#4285F4"
                          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        />
                        <path
                          fill="#34A853"
                          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        />
                        <path
                          fill="#FBBC05"
                          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                        />
                        <path
                          fill="#EA4335"
                          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                        />
                      </svg>
                      Continue with Google
                    </Button>

                    {isAppleDevice() && (
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full"
                        onClick={handleAppleSignIn}
                        disabled={loading}
                      >
                        <svg
                          className="w-4 h-4 mr-2"
                          viewBox="0 0 24 24"
                          fill="currentColor"
                        >
                          <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
                        </svg>
                        Continue with Apple
                      </Button>
                    )}

                    <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t" />
                      </div>
                      <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-background px-2 text-muted-foreground">
                          Or continue with email
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                <form onSubmit={handleSignUp} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="signup-firstname">First Name</Label>
                      <Input
                        id="signup-firstname"
                        placeholder="First name"
                        value={signUpData.firstName}
                        onChange={(e) =>
                          setSignUpData({
                            ...signUpData,
                            firstName: e.target.value,
                          })
                        }
                        disabled={loading}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="signup-lastname">Last Name</Label>
                      <Input
                        id="signup-lastname"
                        placeholder="Last name"
                        value={signUpData.lastName}
                        onChange={(e) =>
                          setSignUpData({
                            ...signUpData,
                            lastName: e.target.value,
                          })
                        }
                        disabled={loading}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="Enter your email"
                      value={signUpData.email}
                      onChange={(e) =>
                        setSignUpData({ ...signUpData, email: e.target.value })
                      }
                      disabled={loading}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-phone">Phone (Optional)</Label>
                    <Input
                      id="signup-phone"
                      type="tel"
                      placeholder="(555) 123-4567"
                      value={signUpData.phone}
                      onChange={(e) =>
                        setSignUpData({ ...signUpData, phone: e.target.value })
                      }
                      disabled={loading}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Password</Label>
                    <div className="relative">
                      <Input
                        id="signup-password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Create a password (min 8 characters)"
                        value={signUpData.password}
                        onChange={(e) =>
                          setSignUpData({
                            ...signUpData,
                            password: e.target.value,
                          })
                        }
                        disabled={loading}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3"
                        onClick={() => setShowPassword(!showPassword)}
                        disabled={loading}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signup-confirm-password">
                      Confirm Password
                    </Label>
                    <Input
                      id="signup-confirm-password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Confirm your password"
                      value={signUpData.confirmPassword}
                      onChange={(e) =>
                        setSignUpData({
                          ...signUpData,
                          confirmPassword: e.target.value,
                        })
                      }
                      disabled={loading}
                    />
                  </div>

                  {error && (
                    <div className="flex items-center gap-2 text-red-600 text-sm">
                      <AlertCircle className="h-4 w-4" />
                      {error}
                    </div>
                  )}

                  {success && (
                    <div className="flex items-center gap-2 text-green-600 text-sm">
                      <CheckCircle className="h-4 w-4" />
                      {success}
                    </div>
                  )}

                  {/* Resend Verification Email */}
                  {(verificationEmailSent ||
                    error?.includes("Email not confirmed") ||
                    error?.includes("confirm your account")) &&
                    (lastEmailSentTo || signUpData.email) && (
                      <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <p className="text-sm text-blue-800 mb-2">
                          Didn't receive the verification email?
                        </p>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            handleResendVerificationEmail(
                              lastEmailSentTo || signUpData.email,
                            )
                          }
                          disabled={loading}
                          className="w-full border-blue-300 text-blue-700 hover:bg-blue-100"
                        >
                          Resend Verification Email
                        </Button>
                      </div>
                    )}

                  <Button
                    type="submit"
                    className="w-full bg-roam-blue hover:bg-roam-blue/90"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating Account...
                      </>
                    ) : (
                      "Create Account"
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="text-center text-sm text-foreground/60">
          By signing up, you agree to our Terms of Service and Privacy Policy
        </div>
      </DialogContent>
    </Dialog>
  );
};
