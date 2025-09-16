"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Mail, Lock, Eye, EyeOff, Github } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import Image from "next/image";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: "signin" | "signup";
  onModeChange: (mode: "signin" | "signup") => void;
}

export default function AuthModal({
  isOpen,
  onClose,
  mode,
  onModeChange,
}: AuthModalProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [passwordStrength, setPasswordStrength] = useState({
    hasLowercase: false,
    hasUppercase: false,
    hasNumber: false,
    hasSpecial: false,
    isLongEnough: false,
  });
  const { login } = useAuth();
  const router = useRouter();

  // Password validation function
  const validatePassword = (pwd: string) => {
    const strength = {
      hasLowercase: /[a-z]/.test(pwd),
      hasUppercase: /[A-Z]/.test(pwd),
      hasNumber: /\d/.test(pwd),
      hasSpecial: /[@$!%*?&]/.test(pwd),
      isLongEnough: pwd.length >= 8,
    };
    setPasswordStrength(strength);
    return Object.values(strength).every(Boolean);
  };

  const handlePasswordChange = (pwd: string) => {
    setPassword(pwd);
    if (mode === "signup") {
      validatePassword(pwd);
    }
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    // Client-side validation
    if (mode === "signup") {
      if (!validatePassword(password)) {
        setError(
          "Password must contain at least 8 characters, including uppercase, lowercase, number, and special character",
        );
        setIsLoading(false);
        return;
      }

      if (password !== confirmPassword) {
        setError("Passwords do not match");
        setIsLoading(false);
        return;
      }
    }

    try {
      const apiUrl =
        (process.env.NEXT_PUBLIC_API_URL || "https://api.n0de.pro");
      const response = await fetch(
        `${apiUrl}/auth/${mode === "signin" ? "login" : "register"}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email,
            password,
            ...(mode === "signup" && {
              firstName: email.split("@")[0],
              username: email
                .split("@")[0]
                .toLowerCase()
                .replace(/[^a-z0-9]/g, ""),
            }),
          }),
        },
      );

      const data = await response.json();

      if (response.ok) {
        // Use AuthContext login with refresh token
        await login(
          data.accessToken,
          data.refreshToken,
          data.sessionId,
          data.user,
        );

        // Close modal and redirect to dashboard
        onClose();
        router.push("/dashboard");
      } else {
        setError(data.message || "Authentication failed");
      }
    } catch (error) {
      console.error("Auth error:", error);
      setError("Network error. Please try again.");
    }

    setIsLoading(false);
  };

  const handleSocialLogin = (provider: "github" | "google") => {
    // Don't set loading state - we're leaving the page
    // Use direct backend URL to avoid any routing issues
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://api.n0de.pro';
    const oauthUrl = `${backendUrl}/api/v1/auth/${provider}`;

    console.log(`Redirecting to OAuth: ${oauthUrl}`);
    console.log(`Backend URL from env: ${process.env.NEXT_PUBLIC_BACKEND_URL}`);

    // Save the redirect intention before OAuth flow
    if (typeof window !== "undefined") {
      sessionStorage.setItem("oauth_redirect", window.location.pathname);
    }

    // Direct navigation to backend OAuth endpoint
    window.location.href = oauthUrl;
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-start justify-center p-4 pt-20 overflow-y-auto min-h-screen">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-md bg-bg-elevated border border-border rounded-xl p-8 shadow-2xl"
          >
            {/* Close Button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 hover:bg-bg-hover rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header */}
            <div className="text-center mb-8">
              <div className="flex items-center justify-center space-x-3 mb-4">
                <Image
                  src="/n0de-alt-background.png"
                  alt="N0DE Logo"
                  width={40}
                  height={40}
                  className="h-10 w-auto"
                />
                <span
                  className="text-3xl font-bold font-display"
                  style={{
                    background:
                      "linear-gradient(135deg, #01d3f4, #0b86f8, #00255e)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    backgroundClip: "text",
                    color: "#01d3f4",
                  }}
                >
                  N0DE
                </span>
              </div>

              <h2 className="text-2xl font-bold mb-2">
                {mode === "signin" ? "Welcome Back" : "Get Started"}
              </h2>
              <p className="text-text-secondary">
                {mode === "signin"
                  ? "Sign in to access your RPC dashboard"
                  : "Create your account and start building"}
              </p>
            </div>

            {/* Social Login - 3D Neumorphism Style */}
            <div className="space-y-3 mb-6">
              {/* GitHub Button */}
              <motion.button
                type="button"
                onClick={() => {
                  handleSocialLogin("github");
                }}
                className="w-full relative group"
                style={{
                  perspective: "1000px",
                  transformStyle: "preserve-3d",
                }}
                whileHover={{
                  scale: 1.02,
                  y: -2,
                  rotateX: 3,
                  rotateY: 1,
                  boxShadow: [
                    "0 10px 20px rgba(255, 255, 255, 0.1)",
                    "inset 0 1px 0 rgba(255, 255, 255, 0.1)",
                    "inset 0 -1px 0 rgba(0, 0, 0, 0.2)",
                  ].join(", "),
                }}
                whileTap={{
                  scale: 0.98,
                  y: 0,
                  boxShadow: [
                    "0 5px 10px rgba(255, 255, 255, 0.05)",
                    "inset 0 2px 4px rgba(0, 0, 0, 0.2)",
                    "inset 0 -1px 0 rgba(255, 255, 255, 0.05)",
                  ].join(", "),
                }}
              >
                {/* Main Button Surface */}
                <div className="relative py-3 bg-gradient-to-b from-bg-elevated via-bg-card to-bg-elevated border border-border text-white font-medium rounded-lg overflow-hidden transition-all duration-300 group-hover:border-border/60 group-hover:from-bg-card group-hover:via-bg-elevated group-hover:to-bg-card">
                  {/* Top Highlight */}
                  <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />

                  {/* Inner Glow */}
                  <div className="absolute inset-0 bg-gradient-to-t from-transparent via-transparent to-white/5 rounded-lg" />

                  {/* Bottom Shadow */}
                  <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-black/20 to-transparent" />

                  {/* Shimmer Effect */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/8 to-transparent opacity-0 group-hover:opacity-100 group-hover:translate-x-full transition-all duration-700 ease-out rounded-lg" />

                  {/* Content */}
                  <div className="relative flex items-center justify-center space-x-2 text-white">
                    <motion.div
                      whileHover={{ scale: 1.1, rotate: 5 }}
                      transition={{ type: "spring", stiffness: 300 }}
                    >
                      <Github className="w-5 h-5" />
                    </motion.div>
                    <motion.span
                      whileHover={{ x: 1 }}
                      transition={{ type: "spring", stiffness: 300 }}
                    >
                      Continue with GitHub
                    </motion.span>
                  </div>
                </div>

                {/* 3D Bottom Edge */}
                <div className="absolute inset-x-0 bottom-0 h-0.5 bg-gradient-to-b from-bg-card to-black/30 rounded-b-lg" />
              </motion.button>

              {/* Google Button */}
              <motion.button
                type="button"
                onClick={() => {
                  handleSocialLogin("google");
                }}
                className="w-full relative group"
                style={{
                  perspective: "1000px",
                  transformStyle: "preserve-3d",
                }}
                whileHover={{
                  scale: 1.02,
                  y: -2,
                  rotateX: 3,
                  rotateY: 1,
                  boxShadow: [
                    "0 10px 20px rgba(255, 255, 255, 0.1)",
                    "inset 0 1px 0 rgba(255, 255, 255, 0.1)",
                    "inset 0 -1px 0 rgba(0, 0, 0, 0.2)",
                  ].join(", "),
                }}
                whileTap={{
                  scale: 0.98,
                  y: 0,
                  boxShadow: [
                    "0 5px 10px rgba(255, 255, 255, 0.05)",
                    "inset 0 2px 4px rgba(0, 0, 0, 0.2)",
                    "inset 0 -1px 0 rgba(255, 255, 255, 0.05)",
                  ].join(", "),
                }}
              >
                {/* Main Button Surface */}
                <div className="relative py-3 bg-gradient-to-b from-bg-elevated via-bg-card to-bg-elevated border border-border text-white font-medium rounded-lg overflow-hidden transition-all duration-300 group-hover:border-border/60 group-hover:from-bg-card group-hover:via-bg-elevated group-hover:to-bg-card">
                  {/* Top Highlight */}
                  <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />

                  {/* Inner Glow */}
                  <div className="absolute inset-0 bg-gradient-to-t from-transparent via-transparent to-white/5 rounded-lg" />

                  {/* Bottom Shadow */}
                  <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-black/20 to-transparent" />

                  {/* Shimmer Effect */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/8 to-transparent opacity-0 group-hover:opacity-100 group-hover:translate-x-full transition-all duration-700 ease-out rounded-lg" />

                  {/* Content */}
                  <div className="relative flex items-center justify-center space-x-2 text-white">
                    <motion.div
                      whileHover={{ scale: 1.1, rotate: 5 }}
                      transition={{ type: "spring", stiffness: 300 }}
                    >
                      <svg className="w-5 h-5" viewBox="0 0 24 24">
                        <path
                          fill="currentColor"
                          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        />
                        <path
                          fill="currentColor"
                          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        />
                        <path
                          fill="currentColor"
                          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                        />
                        <path
                          fill="currentColor"
                          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                        />
                      </svg>
                    </motion.div>
                    <motion.span
                      whileHover={{ x: 1 }}
                      transition={{ type: "spring", stiffness: 300 }}
                    >
                      Continue with Google
                    </motion.span>
                  </div>
                </div>

                {/* 3D Bottom Edge */}
                <div className="absolute inset-x-0 bottom-0 h-0.5 bg-gradient-to-b from-bg-card to-black/30 rounded-b-lg" />
              </motion.button>
            </div>

            {/* Divider */}
            <div className="relative mb-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-bg-elevated text-text-secondary">
                  or
                </span>
              </div>
            </div>

            {/* Error Display */}
            {error && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email */}
              <div>
                <label className="block text-sm font-medium mb-2">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-text-secondary" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setError("");
                    }}
                    className="w-full pl-10 pr-4 py-3 bg-bg-main border border-border rounded-lg focus:border-N0DE-cyan focus:outline-none transition-colors"
                    placeholder="your@email.com"
                    autoComplete="email"
                    required
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-text-secondary" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => handlePasswordChange(e.target.value)}
                    className="w-full pl-10 pr-12 py-3 bg-bg-main border border-border rounded-lg focus:border-N0DE-cyan focus:outline-none transition-colors"
                    placeholder="Enter your password"
                    autoComplete={mode === "signin" ? "current-password" : "new-password"}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 hover:bg-bg-hover rounded transition-colors"
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>

                {/* Password Strength Indicator (Signup only) */}
                {mode === "signup" && password && (
                  <div className="mt-2 space-y-1">
                    <div className="text-xs text-text-secondary">
                      Password requirements:
                    </div>
                    <div className="grid grid-cols-2 gap-1 text-xs">
                      <div
                        className={`flex items-center space-x-1 ${passwordStrength.isLongEnough ? "text-green-400" : "text-text-muted"}`}
                      >
                        <div
                          className={`w-2 h-2 rounded-full ${passwordStrength.isLongEnough ? "bg-green-400" : "bg-gray-600"}`}
                        />
                        <span>8+ chars</span>
                      </div>
                      <div
                        className={`flex items-center space-x-1 ${passwordStrength.hasUppercase ? "text-green-400" : "text-text-muted"}`}
                      >
                        <div
                          className={`w-2 h-2 rounded-full ${passwordStrength.hasUppercase ? "bg-green-400" : "bg-gray-600"}`}
                        />
                        <span>Uppercase</span>
                      </div>
                      <div
                        className={`flex items-center space-x-1 ${passwordStrength.hasLowercase ? "text-green-400" : "text-text-muted"}`}
                      >
                        <div
                          className={`w-2 h-2 rounded-full ${passwordStrength.hasLowercase ? "bg-green-400" : "bg-gray-600"}`}
                        />
                        <span>Lowercase</span>
                      </div>
                      <div
                        className={`flex items-center space-x-1 ${passwordStrength.hasNumber ? "text-green-400" : "text-text-muted"}`}
                      >
                        <div
                          className={`w-2 h-2 rounded-full ${passwordStrength.hasNumber ? "bg-green-400" : "bg-gray-600"}`}
                        />
                        <span>Number</span>
                      </div>
                      <div
                        className={`flex items-center space-x-1 ${passwordStrength.hasSpecial ? "text-green-400" : "text-text-muted"}`}
                      >
                        <div
                          className={`w-2 h-2 rounded-full ${passwordStrength.hasSpecial ? "bg-green-400" : "bg-gray-600"}`}
                        />
                        <span>Special (@$!%*?&)</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Confirm Password (Signup only) */}
              {mode === "signup" && (
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-text-secondary" />
                    <input
                      type={showPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value);
                        setError("");
                      }}
                      className="w-full pl-10 pr-4 py-3 bg-bg-main border border-border rounded-lg focus:border-N0DE-cyan focus:outline-none transition-colors"
                      placeholder="Confirm your password"
                      autoComplete="new-password"
                      required
                    />
                  </div>
                </div>
              )}

              {/* Submit Button - 3D Neumorphism */}
              <motion.button
                whileHover={{
                  scale: 1.05,
                  y: -4,
                  rotateX: 5,
                  rotateY: 2,
                  boxShadow: [
                    "0 20px 35px rgba(1, 211, 244, 0.4)",
                    "inset 0 1px 0 rgba(255, 255, 255, 0.12)",
                    "inset 0 -1px 0 rgba(0, 0, 0, 0.2)",
                  ].join(", "),
                }}
                whileTap={{
                  scale: 0.96,
                  y: -1,
                  boxShadow: [
                    "0 8px 15px rgba(1, 211, 244, 0.3)",
                    "inset 0 2px 4px rgba(0, 0, 0, 0.3)",
                    "inset 0 -1px 0 rgba(255, 255, 255, 0.08)",
                  ].join(", "),
                }}
                disabled={isLoading}
                className="w-full relative group disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  perspective: "1000px",
                  transformStyle: "preserve-3d",
                }}
                animate={{
                  boxShadow: [
                    [
                      "0 12px 25px rgba(1, 211, 244, 0.25)",
                      "inset 0 1px 0 rgba(255, 255, 255, 0.08)",
                      "inset 0 -1px 0 rgba(0, 0, 0, 0.15)",
                    ].join(", "),
                    [
                      "0 15px 30px rgba(1, 211, 244, 0.3)",
                      "inset 0 1px 0 rgba(255, 255, 255, 0.1)",
                      "inset 0 -1px 0 rgba(0, 0, 0, 0.18)",
                    ].join(", "),
                    [
                      "0 12px 25px rgba(1, 211, 244, 0.25)",
                      "inset 0 1px 0 rgba(255, 255, 255, 0.08)",
                      "inset 0 -1px 0 rgba(0, 0, 0, 0.15)",
                    ].join(", "),
                  ],
                }}
                transition={{
                  boxShadow: {
                    duration: 3,
                    repeat: Infinity,
                    ease: "easeInOut",
                  },
                }}
              >
                {/* Main Button Surface */}
                <div className="relative py-3 bg-gradient-to-b from-N0DE-cyan via-N0DE-sky to-N0DE-navy text-white font-semibold text-lg rounded-xl overflow-hidden transition-all duration-300 group-hover:from-N0DE-sky group-hover:via-N0DE-cyan group-hover:to-N0DE-navy disabled:from-gray-400 disabled:via-gray-500 disabled:to-gray-600">
                  {/* Top Highlight */}
                  <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent" />

                  {/* Inner Glow */}
                  <div className="absolute inset-0 bg-gradient-to-t from-transparent via-transparent to-white/6 rounded-xl" />

                  {/* Bottom Shadow */}
                  <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-black/30 to-transparent" />

                  {/* Shimmer Effect */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/12 to-transparent opacity-0 group-hover:opacity-100 group-hover:translate-x-full transition-all duration-700 ease-out rounded-xl" />

                  {/* Content */}
                  <div className="relative flex items-center justify-center text-white font-bold">
                    {isLoading ? (
                      <div className="flex items-center justify-center space-x-2">
                        <motion.div
                          className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
                          animate={{ rotate: 360 }}
                          transition={{
                            duration: 1,
                            repeat: Infinity,
                            ease: "linear",
                          }}
                        />
                        <span>
                          {mode === "signin"
                            ? "Signing in..."
                            : "Creating account..."}
                        </span>
                      </div>
                    ) : (
                      <motion.span
                        whileHover={{ x: 1 }}
                        transition={{ type: "spring", stiffness: 300 }}
                        className="font-black tracking-wide"
                      >
                        {mode === "signin" ? "Sign In" : "Create Account"}
                      </motion.span>
                    )}
                  </div>
                </div>

                {/* 3D Bottom Edge */}
                <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-b from-N0DE-navy to-black/50 rounded-b-xl" />
              </motion.button>
            </form>

            {/* Footer */}
            <div className="mt-6 text-center">
              <p className="text-text-secondary">
                {mode === "signin"
                  ? "Don't have an account? "
                  : "Already have an account? "}
                <button
                  onClick={() =>
                    onModeChange(mode === "signin" ? "signup" : "signin")
                  }
                  className="text-N0DE-cyan hover:text-N0DE-sky font-medium transition-colors"
                >
                  {mode === "signin" ? "Sign up" : "Sign in"}
                </button>
              </p>

              {mode === "signin" && (
                <button className="text-N0DE-cyan hover:text-N0DE-sky font-medium transition-colors mt-2">
                  Forgot your password?
                </button>
              )}
            </div>

            {/* Terms (Signup only) */}
            {mode === "signup" && (
              <div className="mt-6 text-center text-sm text-text-secondary">
                By creating an account, you agree to our{" "}
                <a
                  href="#"
                  className="text-N0DE-cyan hover:text-N0DE-sky transition-colors"
                >
                  Terms of Service
                </a>{" "}
                and{" "}
                <a
                  href="#"
                  className="text-N0DE-cyan hover:text-N0DE-sky transition-colors"
                >
                  Privacy Policy
                </a>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
