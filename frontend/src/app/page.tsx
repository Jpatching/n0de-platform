"use client";

import { useState, useRef, useEffect, Suspense } from "react";
import { motion, useInView } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import {
  Zap,
  ArrowRight,
  Rocket,
  Shield,
  Clock,
  Users,
  BarChart3,
  Database,
  TrendingUp,
  CreditCard,
  Lock,
  Menu,
  X,
} from "lucide-react";
import PricingSection from "@/components/PricingSection";
import EnhancedPerformanceComparison from "@/components/EnhancedPerformanceComparison";

import SectionBackground from "@/components/SectionBackground";
import AuthModal from "@/components/AuthModal";
import AuthHandler from "@/components/AuthHandler";
import SupportSystem from "@/components/SupportSystem";
import FloatingSupportButton from "@/components/FloatingSupportButton";
import { ScrollSlideUp } from "@/components/ScrollReveal";
import {
  ScrollFadeIn,
  ScrollStagger,
  ScrollScale,
} from "@/components/ScrollAnimations";
import { safeMotionAnimate, safeBoxShadow, safeFilter } from "@/lib/css-utils";
import ApiPlayground from "@/components/ApiPlayground";

// Animated Counter Component
interface AnimatedCounterProps {
  endValue: number;
  suffix?: string;
  label: string;
  comparison: string;
  delay: number;
}

const AnimatedCounter = ({
  endValue,
  suffix = "",
  label,
  comparison,
  delay,
}: AnimatedCounterProps) => {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });

  useEffect(() => {
    let animationFrame: number;
    let isActive = true;

    if (isInView) {
      const startTime = Date.now() + delay * 1000;
      const duration = 2000; // 2 seconds

      const animate = () => {
        if (!isActive) return; // Prevent execution after cleanup

        const now = Date.now();
        const elapsed = now - startTime;

        if (elapsed < 0) {
          animationFrame = requestAnimationFrame(animate);
          return;
        }

        if (elapsed >= duration) {
          setCount(endValue);
          return;
        }

        const progress = elapsed / duration;
        const easeOutProgress = 1 - Math.pow(1 - progress, 3); // Ease out cubic
        const currentValue = endValue * easeOutProgress;

        setCount(Math.round(currentValue * 100) / 100);
        animationFrame = requestAnimationFrame(animate);
      };

      animationFrame = requestAnimationFrame(animate);
    }

    // Cleanup function to prevent memory leaks
    return () => {
      isActive = false;
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
    };
  }, [isInView, endValue, delay]);

  const formatNumber = (num: number) => {
    if (num >= 1000) {
      return (num / 1000).toFixed(num >= 10000 ? 0 : 1) + "K";
    }
    return num % 1 === 0 ? num.toString() : num.toFixed(2);
  };

  return (
    <motion.div
      ref={ref}
      className="text-center cursor-pointer"
      whileHover={{ scale: 1.05, y: -5 }}
      whileTap={{ scale: 0.95 }}
      transition={{ type: "spring", stiffness: 300 }}
    >
      <div
        className="text-3xl lg:text-4xl font-bold mb-2 hover:text-shadow-glow transition-all duration-300"
        style={{
          background: "linear-gradient(135deg, #01d3f4, #0b86f8, #00255e)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          backgroundClip: "text",
          color: "#01d3f4",
        }}
      >
        {formatNumber(count)}
        {suffix}
      </div>
      <div className="text-text-secondary text-sm">{label}</div>
      <div className="text-text-muted text-xs">{comparison}</div>
    </motion.div>
  );
};

export default function HomePage() {
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signup");
  const [showSupport, setShowSupport] = useState(false);
  const [showApiDemo, setShowApiDemo] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Import auth context to check if user is logged in
  const { user } = useAuth();
  const router = useRouter();

  return (
    <div
      className="min-h-screen text-text-primary overflow-x-hidden"
      style={{ fontFamily: "var(--font-body)" }}
    >
      {/* Handle auth parameters */}
      <Suspense fallback={null}>
        <AuthHandler
          setAuthMode={setAuthMode}
          setShowAuthModal={setShowAuthModal}
        />
      </Suspense>

      {/* Background rendered in ClientLayout for homepage */}

      {/* Color schemes integrated into main CSS */}

      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-bg-main/80 backdrop-blur-lg border-b border-border">
        <div className="container-width flex items-center justify-between py-4">
          <div className="flex items-center gap-12">
            {/* Logo */}
            <motion.div
              whileHover={{ scale: 1.05 }}
              className="flex items-center space-x-3 flex-shrink-0"
            >
              <motion.div
                className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0"
                whileHover={{ scale: 1.1, rotate: 5 }}
                animate={safeMotionAnimate(
                  {
                    boxShadow: [
                      safeBoxShadow("0 0 0 rgba(1, 211, 244, 0)"),
                      safeBoxShadow("0 0 10px rgba(1, 211, 244, 0.3)"),
                      safeBoxShadow("0 0 0 rgba(1, 211, 244, 0)"),
                    ],
                  },
                  "PlayButton-glow",
                )}
                transition={{
                  boxShadow: {
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut",
                  },
                }}
              >
                <Image
                  src="/n0de-alt-background.png"
                  alt="N0DE Logo"
                  width={40}
                  height={40}
                  className="object-cover"
                  priority
                />
              </motion.div>
              <span
                className="text-2xl font-bold flex items-center"
                style={{ fontFamily: "var(--font-display)" }}
              >
                <span className="text-white">N</span>
                <span className="relative inline-block">
                  <span className="text-white">0</span>
                  <div
                    className="absolute inset-0 flex items-center justify-center"
                    style={{ transform: "rotate(-15deg)" }}
                  >
                    <div
                      className="w-3 h-0.5 bg-gradient-to-r from-N0DE-cyan via-N0DE-sky to-N0DE-navy"
                      style={{ transform: "translateY(1px)" }}
                    />
                  </div>
                </span>
                <span className="text-white">DE</span>
              </span>
            </motion.div>

            {/* Navigation Links */}
            <div className="hidden md:flex items-center space-x-8">
              <Link
                href="/performance"
                className="text-text-secondary hover:text-N0DE-cyan transition-colors"
              >
                Performance
              </Link>
              <Link
                href="/pricing"
                className="text-text-secondary hover:text-N0DE-cyan transition-colors"
              >
                Pricing
              </Link>
              <Link
                href="/docs"
                className="text-text-secondary hover:text-N0DE-cyan transition-colors"
              >
                Docs
              </Link>
              <Link
                href="/developer"
                className="text-text-secondary hover:text-N0DE-cyan transition-colors"
              >
                Developer
              </Link>
            </div>
          </div>

          {/* Right Side Actions */}
          <div className="flex items-center space-x-4">
            {/* Desktop Links */}
            <Link
              href="/dashboard"
              className="hidden sm:block text-text-secondary hover:text-N0DE-cyan font-medium transition-colors px-4 py-2"
            >
              Dashboard
            </Link>

            {/* Launch App / Dashboard Button - 3D Neumorphism Style */}
            <motion.button
              onClick={() => {
                try {
                  console.log("Launch App button clicked", { user: !!user });
                  if (user) {
                    console.log(
                      "Navigating to dashboard for authenticated user",
                    );
                    router.push("/dashboard");
                  } else {
                    console.log("Opening auth modal for unauthenticated user");
                    setAuthMode("signup");
                    setShowAuthModal(true);
                  }
                } catch (error) {
                  console.error("Error in Launch App button click:", error);
                }
              }}
              whileHover={safeMotionAnimate(
                {
                  scale: 1.05,
                  y: -4,
                  rotateX: 5,
                  rotateY: 2,
                  boxShadow: safeBoxShadow([
                    "0 20px 35px rgba(1, 211, 244, 0.4)",
                    "inset 0 1px 0 rgba(255, 255, 255, 0.1)",
                    "inset 0 -1px 0 rgba(0, 0, 0, 0.2)",
                  ]),
                },
                "LaunchButton-hover",
              )}
              whileTap={safeMotionAnimate(
                {
                  scale: 0.95,
                  y: -1,
                  boxShadow: safeBoxShadow([
                    "0 8px 15px rgba(1, 211, 244, 0.3)",
                    "inset 0 2px 4px rgba(0, 0, 0, 0.3)",
                    "inset 0 -1px 0 rgba(255, 255, 255, 0.1)",
                  ]),
                },
                "LaunchButton-tap",
              )}
              className="relative group"
              style={{
                fontFamily: "var(--font-display)",
                perspective: "1000px",
                transformStyle: "preserve-3d",
              }}
              animate={safeMotionAnimate(
                {
                  boxShadow: [
                    safeBoxShadow([
                      "0 12px 25px rgba(1, 211, 244, 0.2)",
                      "inset 0 1px 0 rgba(255, 255, 255, 0.08)",
                      "inset 0 -1px 0 rgba(0, 0, 0, 0.15)",
                    ]),
                    safeBoxShadow([
                      "0 15px 30px rgba(1, 211, 244, 0.25)",
                      "inset 0 1px 0 rgba(255, 255, 255, 0.1)",
                      "inset 0 -1px 0 rgba(0, 0, 0, 0.18)",
                    ]),
                    safeBoxShadow([
                      "0 12px 25px rgba(1, 211, 244, 0.2)",
                      "inset 0 1px 0 rgba(255, 255, 255, 0.08)",
                      "inset 0 -1px 0 rgba(0, 0, 0, 0.15)",
                    ]),
                  ],
                },
                "LaunchButton-animate",
              )}
              transition={{
                boxShadow: { duration: 3, repeat: Infinity, ease: "easeInOut" },
              }}
            >
              {/* Main Button Surface */}
              <div className="relative px-6 py-3 bg-gradient-to-b from-N0DE-cyan via-N0DE-sky to-N0DE-navy rounded-xl overflow-hidden transition-all duration-300 group-hover:from-N0DE-sky group-hover:via-N0DE-cyan group-hover:to-N0DE-sky">
                {/* Top Highlight */}
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

                {/* Inner Glow */}
                <div className="absolute inset-0 bg-gradient-to-t from-transparent via-transparent to-white/5 rounded-xl" />

                {/* Bottom Shadow */}
                <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-black/30 to-transparent" />

                {/* Shimmer Effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-0 group-hover:opacity-100 group-hover:translate-x-full transition-all duration-700 ease-out rounded-xl" />

                {/* Content */}
                <div className="relative flex items-center space-x-2 text-white font-bold">
                  <motion.div
                    whileHover={{
                      rotate: [0, -10, 10, 0],
                      scale: 1.1,
                      filter: "drop-shadow(0 0 8px rgba(255, 255, 255, 0.5))",
                    }}
                    transition={{
                      rotate: { duration: 0.6, ease: "easeInOut" },
                      scale: { type: "spring", stiffness: 500 },
                      filter: { duration: 0.3 },
                    }}
                  >
                    <Rocket className="w-4 h-4" />
                  </motion.div>
                  <motion.span
                    whileHover={{ x: 1 }}
                    transition={{ type: "spring", stiffness: 400 }}
                    className="text-sm font-bold tracking-wide"
                  >
                    {user ? "Dashboard" : "Launch App"}
                  </motion.span>
                </div>
              </div>

              {/* 3D Bottom Edge */}
              <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-b from-N0DE-navy to-black/50 rounded-b-xl transform translateZ-2" />
            </motion.button>

            {/* Mobile Menu Button */}
            <motion.button
              className="md:hidden text-text-primary hover:text-N0DE-cyan transition-colors p-2"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              {mobileMenuOpen ? (
                <X className="w-6 h-6" />
              ) : (
                <Menu className="w-6 h-6" />
              )}
            </motion.button>
          </div>
        </div>

        {/* Mobile Menu Overlay */}
        <motion.div
          className="md:hidden fixed inset-x-0 top-20 bg-bg-elevated/95 backdrop-blur-xl border-b border-border z-40"
          initial={{ opacity: 0, y: -20 }}
          animate={{
            opacity: mobileMenuOpen ? 1 : 0,
            y: mobileMenuOpen ? 0 : -20,
          }}
          transition={{ duration: 0.2 }}
          style={{ pointerEvents: mobileMenuOpen ? "auto" : "none" }}
        >
          <div className="container-width py-6 space-y-4">
            <motion.a
              href="#performance"
              className="block text-lg font-medium text-text-secondary hover:text-N0DE-cyan transition-colors py-3 border-b border-border/50"
              onClick={() => setMobileMenuOpen(false)}
              whileHover={{ x: 5 }}
            >
              Performance
            </motion.a>
            <motion.div whileHover={{ x: 5 }}>
              <Link
                href="/pricing"
                className="block text-lg font-medium text-text-secondary hover:text-N0DE-cyan transition-colors py-3 border-b border-border/50"
                onClick={() => setMobileMenuOpen(false)}
              >
                Pricing
              </Link>
            </motion.div>
            <motion.div whileHover={{ x: 5 }}>
              <Link
                href="/docs"
                className="block text-lg font-medium text-text-secondary hover:text-N0DE-cyan transition-colors py-3 border-b border-border/50"
                onClick={() => setMobileMenuOpen(false)}
              >
                Docs
              </Link>
            </motion.div>
            <motion.div whileHover={{ x: 5 }}>
              <Link
                href="/developer"
                className="block text-lg font-medium text-text-secondary hover:text-N0DE-cyan transition-colors py-3 border-b border-border/50"
                onClick={() => setMobileMenuOpen(false)}
              >
                Developer
              </Link>
            </motion.div>
            <motion.div whileHover={{ x: 5 }}>
              <Link
                href="/dashboard"
                className="block text-lg font-medium text-text-secondary hover:text-N0DE-cyan transition-colors py-3"
                onClick={() => setMobileMenuOpen(false)}
              >
                Dashboard
              </Link>
            </motion.div>
          </div>
        </motion.div>
      </nav>

      {/* Hero Section - Inspired by Helius */}
      <section className="min-h-screen flex items-center section-padding pt-36 relative overflow-hidden hero-section">
        <SectionBackground variant="hero" />

        <div className="container-width relative z-10">
          <div className="text-center max-w-5xl mx-auto">
            {/* Status Badge - Proper React Component */}
            <ScrollSlideUp className="mb-8">
              <motion.div
                className="inline-flex items-center space-x-3 bg-gradient-to-r from-N0DE-cyan/10 via-N0DE-sky/5 to-N0DE-navy/10 border border-N0DE-cyan/30 rounded-xl px-6 py-3 backdrop-blur-sm shadow-lg"
                whileHover={{ scale: 1.05, y: -2 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <div className="flex items-center space-x-2">
                  <motion.div
                    className="w-3 h-3 bg-N0DE-cyan rounded-full shadow-lg"
                    animate={{
                      boxShadow: [
                        "0 0 5px rgba(1,211,244,0.5)",
                        "0 0 15px rgba(1,211,244,0.8)",
                        "0 0 5px rgba(1,211,244,0.5)",
                      ],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                  />
                  <span
                    className="text-N0DE-cyan font-bold text-sm tracking-wide"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    LIVE
                  </span>
                </div>
                <div className="w-px h-4 bg-N0DE-cyan/30" />
                <span
                  className="text-white font-semibold text-sm tracking-wide"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  100% SUCCESS RATE
                </span>
                <div className="w-px h-4 bg-N0DE-sky/30" />
                <span
                  className="text-N0DE-sky font-semibold text-sm tracking-wide"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  MAINNET ONLY
                </span>
              </motion.div>
            </ScrollSlideUp>

            {/* Main Headline - Enhanced Animations */}
            <div className="mb-8">
              <ScrollSlideUp>
                <h1
                  className="text-4xl sm:text-5xl md:text-6xl lg:text-8xl font-bold mb-6 py-6 sm:py-8 lg:py-12"
                  style={{
                    fontFamily: "var(--font-display)",
                    lineHeight: "1.3",
                  }}
                >
                  <ScrollFadeIn direction="left" delay={0.2}>
                    <span className="text-white block mb-4">Built to</span>
                  </ScrollFadeIn>
                  <ScrollFadeIn direction="right" delay={0.5}>
                    <span
                      className="block font-black hero-gradient-text relative"
                      style={{
                        fontSize: "1.1em",
                        fontWeight: "900",
                      }}
                    >
                      <span
                        style={{
                          background:
                            "linear-gradient(135deg, #01d3f4 0%, #0b86f8 50%, #01d3f4 100%)",
                          WebkitBackgroundClip: "text",
                          WebkitTextFillColor: "transparent",
                          backgroundClip: "text",
                          color: "#01d3f4",
                          filter:
                            "drop-shadow(0 0 20px rgba(1,211,244,0.5)) drop-shadow(0 0 40px rgba(1,211,244,0.3))",
                        }}
                      >
                        Dominate
                      </span>
                    </span>
                  </ScrollFadeIn>
                </h1>
              </ScrollSlideUp>
              <ScrollFadeIn delay={0.8} direction="up" distance={20}>
                <div className="w-24 h-1 bg-gradient-to-r from-N0DE-cyan via-N0DE-sky to-N0DE-navy rounded-full mx-auto mb-8" />
              </ScrollFadeIn>
            </div>

            {/* Value Proposition */}
            <ScrollFadeIn delay={0.9} direction="up" className="mb-8">
              <p className="text-lg sm:text-xl md:text-2xl lg:text-3xl text-text-secondary leading-relaxed max-w-4xl mx-auto px-4 sm:px-0">
                <span className="text-[#00ff87] font-semibold drop-shadow-[0_0_10px_rgba(0,255,135,0.5)]">
                  Europe&apos;s Fastest Solana RPC
                </span>{" "}
                with dedicated enterprise infrastructure.
                <span className="text-[#01d3f4] font-semibold drop-shadow-[0_0_10px_rgba(1,211,244,0.5)]">
                  {" "}
                  84% faster than QuickNode
                </span>
                ,
                <span className="text-[#8b5cf6] font-semibold drop-shadow-[0_0_10px_rgba(139,92,246,0.5)]">
                  {" "}
                  9ms response times
                </span>
                , and{" "}
                <span className="text-[#00ff87] font-semibold drop-shadow-[0_0_10px_rgba(0,255,135,0.5)]">
                  perfect reliability
                </span>
                .
              </p>
            </ScrollFadeIn>

            {/* Trader-Focused Value Props */}
            <motion.div
              className="mb-12"
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.8,
                delay: 1.1,
                ease: [0.25, 0.46, 0.45, 0.94],
              }}
              viewport={{ once: true, margin: "-100px" }}
            >
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
                {[
                  {
                    icon: Zap,
                    title: "9ms Ultra Performance",
                    desc: "84% faster than QuickNode • Perfect ±1ms consistency • Enterprise AMD EPYC infrastructure",
                    gradientFrom: "N0DE-cyan/20",
                    gradientTo: "N0DE-sky/20",
                    iconColor: "N0DE-cyan",
                    delay: 0,
                  },
                  {
                    icon: Shield,
                    title: "100% Success Rate",
                    desc: "Zero failures while 50% of providers go down • 0 slots behind network • Perfect sync",
                    gradientFrom: "N0DE-sky/20",
                    gradientTo: "N0DE-navy/20",
                    iconColor: "N0DE-sky",
                    delay: 0.1,
                  },
                  {
                    icon: TrendingUp,
                    title: "Europe&apos;s #1 Node",
                    desc: "EU validator proximity • European trading hours • Regulatory clarity",
                    gradientFrom: "N0DE-navy/20",
                    gradientTo: "N0DE-cyan/20",
                    iconColor: "N0DE-navy",
                    delay: 0.2,
                  },
                ].map((card, index) => (
                  <motion.div
                    key={index}
                    className="text-center group cursor-pointer"
                    initial={{ opacity: 0, y: 30, scale: 0.9 }}
                    whileInView={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{
                      duration: 0.6,
                      delay: card.delay,
                      ease: [0.25, 0.46, 0.45, 0.94],
                    }}
                    viewport={{ once: true }}
                    whileHover={{
                      y: -10,
                      scale: 1.05,
                      transition: {
                        type: "spring",
                        stiffness: 400,
                        damping: 17,
                      },
                    }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <motion.div
                      className={`inline-flex items-center justify-center w-12 h-12 bg-gradient-to-r from-${card.gradientFrom} to-${card.gradientTo} rounded-xl mb-3 transition-all duration-300`}
                      whileHover={safeMotionAnimate(
                        {
                          scale: 1.15,
                          rotate: 5,
                          boxShadow: safeBoxShadow(
                            "0 8px 25px rgba(1, 211, 244, 0.3)",
                          ),
                          background: `linear-gradient(45deg, rgba(1, 211, 244, 0.4), rgba(11, 134, 248, 0.4))`,
                        },
                        "FeatureCard-icon-hover",
                      )}
                      animate={safeMotionAnimate(
                        {
                          boxShadow: [
                            safeBoxShadow("0 0 0 rgba(1, 211, 244, 0)"),
                            safeBoxShadow("0 4px 15px rgba(1, 211, 244, 0.2)"),
                            safeBoxShadow("0 0 0 rgba(1, 211, 244, 0)"),
                          ],
                        },
                        "FeatureCard-icon-animate",
                      )}
                      transition={{
                        boxShadow: {
                          duration: 3,
                          repeat: Infinity,
                          ease: "easeInOut",
                          delay: index * 0.5,
                        },
                      }}
                    >
                      <motion.div
                        whileHover={{ rotate: 15, scale: 1.2 }}
                        transition={{ type: "spring", stiffness: 500 }}
                      >
                        <card.icon
                          className={`w-6 h-6 text-${card.iconColor} group-hover:drop-shadow-glow`}
                        />
                      </motion.div>
                    </motion.div>
                    <motion.h3
                      className="text-lg font-bold text-white mb-2 group-hover:text-shadow-sm"
                      whileHover={{ x: 2 }}
                      transition={{ type: "spring", stiffness: 300 }}
                    >
                      {card.title}
                    </motion.h3>
                    <motion.p
                      className="text-sm text-text-secondary group-hover:text-gray-300"
                      whileHover={{ x: 2 }}
                      transition={{
                        type: "spring",
                        stiffness: 300,
                        delay: 0.05,
                      }}
                    >
                      {card.desc}
                    </motion.p>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            {/* Key Stats with Centered Try Live API Button */}
            <div className="mb-12">
              {/* Top Row Stats */}
              <ScrollStagger
                staggerDelay={0.1}
                className="grid grid-cols-2 gap-8 mb-8 max-w-lg mx-auto"
              >
                {[
                  {
                    value: "9ms",
                    label: "EU Leader",
                    icon: Clock,
                    comparison: "84% faster than QuickNode",
                  },
                  {
                    value: "±1ms",
                    label: "Consistency",
                    icon: Shield,
                    comparison: "vs 20-40ms industry variance",
                  },
                ].map((stat, index) => (
                  <div
                    key={stat.label}
                    className="text-center group cursor-pointer"
                  >
                    <motion.div
                      className="inline-flex items-center justify-center w-12 h-12 bg-N0DE-green/10 rounded-xl mb-3 group-hover:bg-N0DE-green/20 transition-colors duration-300"
                      whileHover={{
                        scale: 1.15,
                        rotate: 10,
                        boxShadow: "0 8px 20px rgba(0, 255, 136, 0.2)",
                      }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <motion.div
                        animate={{
                          rotate: [0, 5, -5, 0],
                          scale: [1, 1.05, 1],
                        }}
                        transition={{
                          duration: 4,
                          repeat: Infinity,
                          ease: "easeInOut",
                          delay: index * 0.5,
                        }}
                      >
                        <stat.icon className="w-6 h-6 text-N0DE-green" />
                      </motion.div>
                    </motion.div>
                    <div
                      className="text-3xl font-bold text-white group-hover:text-N0DE-green transition-colors duration-300"
                      style={{ fontFamily: "var(--font-display)" }}
                    >
                      {stat.value}
                    </div>
                    <div className="text-text-secondary text-sm">
                      {stat.label}
                    </div>
                    <div className="text-N0DE-cyan text-xs mt-1 font-medium">
                      {stat.comparison}
                    </div>
                  </div>
                ))}
              </ScrollStagger>

              {/* Center - Try Live API Button */}
              <ScrollScale delay={0.3} className="flex justify-center mb-8">
                <motion.button
                  whileHover={{
                    scale: 1.06,
                    y: -6,
                    rotateX: 6,
                    rotateY: 2,
                    boxShadow: [
                      "0 25px 45px rgba(1, 211, 244, 0.4)",
                      "inset 0 1px 0 rgba(255, 255, 255, 0.12)",
                      "inset 0 -1px 0 rgba(0, 0, 0, 0.15)",
                    ].join(", "),
                  }}
                  whileTap={{
                    scale: 0.96,
                    y: -2,
                    boxShadow: [
                      "0 10px 20px rgba(1, 211, 244, 0.3)",
                      "inset 0 2px 4px rgba(0, 0, 0, 0.2)",
                      "inset 0 -1px 0 rgba(255, 255, 255, 0.08)",
                    ].join(", "),
                  }}
                  onClick={() => setShowApiDemo(true)}
                  className="relative group"
                  style={{
                    fontFamily: "var(--font-display)",
                    perspective: "1000px",
                    transformStyle: "preserve-3d",
                  }}
                  animate={{
                    boxShadow: [
                      [
                        "0 15px 30px rgba(1, 211, 244, 0.25)",
                        "inset 0 1px 0 rgba(255, 255, 255, 0.08)",
                        "inset 0 -1px 0 rgba(0, 0, 0, 0.12)",
                      ].join(", "),
                      [
                        "0 18px 35px rgba(1, 211, 244, 0.3)",
                        "inset 0 1px 0 rgba(255, 255, 255, 0.1)",
                        "inset 0 -1px 0 rgba(0, 0, 0, 0.15)",
                      ].join(", "),
                      [
                        "0 15px 30px rgba(1, 211, 244, 0.25)",
                        "inset 0 1px 0 rgba(255, 255, 255, 0.08)",
                        "inset 0 -1px 0 rgba(0, 0, 0, 0.12)",
                      ].join(", "),
                    ],
                  }}
                  transition={{
                    boxShadow: {
                      duration: 3.5,
                      repeat: Infinity,
                      ease: "easeInOut",
                    },
                  }}
                >
                  {/* Main Button Surface */}
                  <div className="relative px-10 py-5 bg-gradient-to-b from-bg-elevated via-bg-card to-bg-elevated border border-N0DE-cyan/20 text-white font-semibold text-xl rounded-2xl overflow-hidden transition-all duration-300 group-hover:border-N0DE-cyan/40 group-hover:from-bg-card group-hover:via-bg-elevated group-hover:to-bg-card">
                    {/* Top Highlight */}
                    <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-N0DE-cyan/30 to-transparent" />

                    {/* Inner Glow */}
                    <div className="absolute inset-0 bg-gradient-to-t from-transparent via-transparent to-N0DE-cyan/5 rounded-2xl" />

                    {/* Bottom Shadow */}
                    <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-black/20 to-transparent" />

                    {/* Animated background effect */}
                    <div className="absolute inset-0 bg-gradient-to-r from-N0DE-cyan/5 via-N0DE-sky/8 to-N0DE-navy/5 opacity-0 group-hover:opacity-100 transition-opacity duration-400 rounded-2xl" />

                    {/* Shimmer Effect */}
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-N0DE-cyan/15 to-transparent opacity-0 group-hover:opacity-100 group-hover:translate-x-full transition-all duration-800 ease-out rounded-2xl" />

                    {/* Content */}
                    <div className="relative flex items-center space-x-4">
                      <motion.div
                        className="flex items-center justify-center w-6 h-6 bg-N0DE-cyan/30 rounded-full"
                        whileHover={{ scale: 1.2, rotate: 180 }}
                        transition={{ type: "spring", stiffness: 400 }}
                      >
                        <motion.div
                          className="w-3 h-3 bg-N0DE-cyan rounded-full"
                          animate={{
                            scale: [1, 1.2, 1],
                            opacity: [0.7, 1, 0.7],
                          }}
                          transition={{
                            duration: 2,
                            repeat: Infinity,
                            ease: "easeInOut",
                          }}
                        />
                      </motion.div>
                      <motion.span
                        whileHover={{ x: 2 }}
                        transition={{ type: "spring", stiffness: 300 }}
                      >
                        Try Live API
                      </motion.span>
                      <motion.div
                        className="px-3 py-1 bg-N0DE-cyan/15 rounded-full text-sm text-N0DE-cyan font-medium border border-N0DE-cyan/20"
                        whileHover={{
                          scale: 1.05,
                          backgroundColor: "rgba(1, 211, 244, 0.25)",
                          borderColor: "rgba(1, 211, 244, 0.4)",
                        }}
                        transition={{ type: "spring", stiffness: 400 }}
                      >
                        INTERACTIVE
                      </motion.div>
                    </div>
                  </div>

                  {/* 3D Bottom Edge */}
                  <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-b from-bg-card to-black/40 rounded-b-2xl" />
                </motion.button>
              </ScrollScale>

              {/* Bottom Row Stats */}
              <ScrollStagger
                staggerDelay={0.1}
                className="grid grid-cols-2 gap-8 max-w-lg mx-auto"
              >
                {[
                  {
                    value: "EU",
                    label: "Market Leader",
                    icon: Users,
                    comparison: "Leading European RPC provider",
                  },
                  {
                    value: "3M+",
                    label: "Daily Requests",
                    icon: BarChart3,
                    comparison: "Growing enterprise adoption",
                  },
                ].map((stat, index) => (
                  <div
                    key={stat.label}
                    className="text-center group cursor-pointer"
                  >
                    <motion.div
                      className="inline-flex items-center justify-center w-12 h-12 bg-N0DE-green/10 rounded-xl mb-3 group-hover:bg-N0DE-green/20 transition-colors duration-300"
                      whileHover={{
                        scale: 1.15,
                        rotate: 10,
                        boxShadow: "0 8px 20px rgba(0, 255, 136, 0.2)",
                      }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <motion.div
                        animate={{
                          rotate: [0, 5, -5, 0],
                          scale: [1, 1.05, 1],
                        }}
                        transition={{
                          duration: 4,
                          repeat: Infinity,
                          ease: "easeInOut",
                          delay: index * 0.5,
                        }}
                      >
                        <stat.icon className="w-6 h-6 text-N0DE-green" />
                      </motion.div>
                    </motion.div>
                    <div
                      className="text-3xl font-bold text-white group-hover:text-N0DE-green transition-colors duration-300"
                      style={{ fontFamily: "var(--font-display)" }}
                    >
                      {stat.value}
                    </div>
                    <div className="text-text-secondary text-sm">
                      {stat.label}
                    </div>
                    <div className="text-N0DE-cyan text-xs mt-1 font-medium">
                      {stat.comparison}
                    </div>
                  </div>
                ))}
              </ScrollStagger>
            </div>

            {/* Start for Free Button - Centered Below */}
            <motion.div
              className="flex justify-center"
              initial={{ opacity: 0, y: 30, scale: 0.9 }}
              whileInView={{ opacity: 1, y: 0, scale: 1 }}
              transition={{
                duration: 0.8,
                delay: 0.6,
                ease: [0.25, 0.46, 0.45, 0.94],
              }}
              viewport={{ once: true, margin: "-100px" }}
            >
              <motion.button
                whileHover={{
                  scale: 1.08,
                  y: -8,
                  rotateX: 8,
                  rotateY: 3,
                  boxShadow: [
                    "0 25px 50px rgba(1, 211, 244, 0.5)",
                    "inset 0 2px 0 rgba(255, 255, 255, 0.15)",
                    "inset 0 -2px 0 rgba(0, 0, 0, 0.25)",
                  ].join(", "),
                }}
                whileTap={{
                  scale: 0.95,
                  y: -2,
                  boxShadow: [
                    "0 10px 20px rgba(1, 211, 244, 0.4)",
                    "inset 0 3px 6px rgba(0, 0, 0, 0.4)",
                    "inset 0 -1px 0 rgba(255, 255, 255, 0.1)",
                  ].join(", "),
                }}
                onClick={() => {
                  try {
                    console.log("Get Started Free button clicked");
                    setAuthMode("signup");
                    setShowAuthModal(true);
                  } catch (error) {
                    console.error(
                      "Error in Get Started Free button click:",
                      error,
                    );
                  }
                }}
                className="relative group"
                style={{
                  fontFamily: "var(--font-display)",
                  perspective: "1000px",
                  transformStyle: "preserve-3d",
                }}
                animate={{
                  boxShadow: [
                    [
                      "0 15px 35px rgba(1, 211, 244, 0.3)",
                      "inset 0 1px 0 rgba(255, 255, 255, 0.1)",
                      "inset 0 -1px 0 rgba(0, 0, 0, 0.2)",
                    ].join(", "),
                    [
                      "0 20px 40px rgba(1, 211, 244, 0.35)",
                      "inset 0 1px 0 rgba(255, 255, 255, 0.12)",
                      "inset 0 -1px 0 rgba(0, 0, 0, 0.22)",
                    ].join(", "),
                    [
                      "0 15px 35px rgba(1, 211, 244, 0.3)",
                      "inset 0 1px 0 rgba(255, 255, 255, 0.1)",
                      "inset 0 -1px 0 rgba(0, 0, 0, 0.2)",
                    ].join(", "),
                  ],
                }}
                transition={{
                  boxShadow: {
                    duration: 4,
                    repeat: Infinity,
                    ease: "easeInOut",
                  },
                }}
              >
                {/* Main Button Surface */}
                <div className="relative px-10 py-5 bg-gradient-to-b from-N0DE-cyan via-N0DE-sky to-N0DE-navy text-white font-bold text-lg rounded-2xl overflow-hidden transition-all duration-300 group-hover:from-N0DE-sky group-hover:via-N0DE-cyan group-hover:to-N0DE-navy">
                  {/* Top Highlight */}
                  <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-transparent via-white/30 to-transparent" />

                  {/* Inner Glow */}
                  <div className="absolute inset-0 bg-gradient-to-t from-transparent via-transparent to-white/8 rounded-2xl" />

                  {/* Bottom Shadow */}
                  <div className="absolute inset-x-0 bottom-0 h-0.5 bg-gradient-to-r from-transparent via-black/40 to-transparent" />

                  {/* Shimmer Effect */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent opacity-0 group-hover:opacity-100 group-hover:translate-x-full transition-all duration-800 ease-out rounded-2xl" />

                  {/* Content */}
                  <div className="relative flex items-center space-x-3 text-white font-bold">
                    <motion.div
                      whileHover={{
                        rotate: [0, -15, 15, 0],
                        scale: 1.2,
                        filter:
                          "drop-shadow(0 0 10px rgba(255, 255, 255, 0.3))",
                      }}
                      transition={{
                        rotate: { duration: 0.8, ease: "easeInOut" },
                        scale: { type: "spring", stiffness: 400 },
                        filter: { duration: 0.3 },
                      }}
                    >
                      <Rocket className="w-6 h-6" />
                    </motion.div>
                    <motion.span
                      whileHover={{ x: 3 }}
                      transition={{ type: "spring", stiffness: 300 }}
                      className="font-black tracking-wide"
                    >
                      Get Started Free
                    </motion.span>
                    <motion.div
                      whileHover={{
                        x: 5,
                        rotate: [0, 10, -10, 0],
                        scale: 1.1,
                      }}
                      transition={{
                        x: { type: "spring", stiffness: 300 },
                        rotate: { duration: 0.6, ease: "easeInOut" },
                        scale: { type: "spring", stiffness: 400 },
                      }}
                    >
                      <ArrowRight className="w-6 h-6" />
                    </motion.div>
                  </div>
                </div>

                {/* 3D Bottom Edge */}
                <div className="absolute inset-x-0 bottom-0 h-1.5 bg-gradient-to-b from-N0DE-navy to-black/60 rounded-b-2xl" />
              </motion.button>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Combined Performance & Trust Section */}
      <section id="performance" className="pt-2 pb-16">
        <div className="container-width">
          {/* Trusted By - 2-Layer Animated Conveyor Belt */}
          <ScrollFadeIn direction="up" className="text-center mb-8">
            <p className="text-text-muted text-base mb-2">
              Trusted by Solana&apos;s best teams
            </p>
            <div className="relative overflow-hidden mb-8 space-y-6">
              {/* First Layer - Perfect Airport Conveyor Belt Left to Right */}
              <div className="relative overflow-hidden">
                <div className="flex animate-scroll">
                  {/* Multiple repetitions for seamless infinite loop like airport conveyor belt */}
                  {Array(8)
                    .fill(null)
                    .map((_, setIndex) =>
                      [
                        { name: "Jupiter", logo: "/logos/jupiter.png" },
                        { name: "Phantom", logo: "/logos/phantom.png" },
                        { name: "Magic Eden", logo: "/logos/magic-eden.png" },
                        { name: "Tensor", logo: "/logos/tensor.png" },
                      ].map((company, logoIndex) => (
                        <motion.div
                          key={`layer1-set${setIndex}-${logoIndex}`}
                          className="flex-shrink-0 mx-12 group cursor-pointer"
                          whileHover={{
                            scale: 1.25,
                            y: -12,
                            rotateY: 15,
                            filter:
                              "brightness(1.2) drop-shadow(0 10px 25px rgba(1, 211, 244, 0.5))",
                          }}
                          animate={safeMotionAnimate(
                            {
                              y: [0, -3, 0],
                              rotateX: [0, 2, 0],
                              filter: safeFilter([
                                "brightness(0.75) drop-shadow(0 0 0 transparent)",
                                "brightness(0.9) drop-shadow(0 4px 8px rgba(1, 211, 244, 0.1))",
                                "brightness(0.75) drop-shadow(0 0 0 transparent)",
                              ]),
                            },
                            "LogoCarousel-logo",
                          )}
                          transition={{
                            y: {
                              duration: 3 + logoIndex * 0.3,
                              repeat: Infinity,
                              ease: "easeInOut",
                              delay: setIndex * 0.1,
                            },
                            rotateX: {
                              duration: 4 + logoIndex * 0.2,
                              repeat: Infinity,
                              ease: "easeInOut",
                              delay: setIndex * 0.15,
                            },
                            filter: {
                              duration: 2.5 + logoIndex * 0.4,
                              repeat: Infinity,
                              ease: "easeInOut",
                              delay: setIndex * 0.2,
                            },
                          }}
                          style={{
                            transformStyle: "preserve-3d",
                            perspective: "1000px",
                          }}
                        >
                          <motion.img
                            src={company.logo}
                            alt={`${company.name} logo`}
                            className="h-12 w-auto transition-all duration-500"
                            onError={(e) => {
                              // Fallback to text if image fails to load
                              e.currentTarget.style.display = "none";
                              e.currentTarget.nextElementSibling?.classList.remove(
                                "hidden",
                              );
                            }}
                            whileHover={{
                              rotateZ: [0, -5, 5, 0],
                              scale: [1, 1.1, 1],
                            }}
                            transition={{
                              rotateZ: { duration: 0.6, ease: "easeInOut" },
                              scale: { duration: 0.3, ease: "easeOut" },
                            }}
                          />
                          <motion.span
                            className="hidden text-text-secondary font-medium text-sm group-hover:text-white transition-colors absolute -bottom-6 left-1/2 transform -translate-x-1/2 whitespace-nowrap"
                            initial={{ opacity: 0, y: 10 }}
                            whileHover={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.2 }}
                          >
                            {company.name}
                          </motion.span>
                        </motion.div>
                      )),
                    )}
                </div>
              </div>

              {/* Second Layer - Perfect Airport Conveyor Belt Right to Left */}
              <div className="relative overflow-hidden">
                <div className="flex animate-scroll-reverse">
                  {/* Multiple repetitions for seamless infinite loop like airport conveyor belt */}
                  {Array(8)
                    .fill(null)
                    .map((_, setIndex) =>
                      [
                        { name: "Backpack", logo: "/logos/backpack.png" },
                        { name: "Solflare", logo: "/logos/solflare.png" },
                        { name: "Drift", logo: "/logos/drift.png" },
                        { name: "Raydium", logo: "/logos/raydium.png" },
                      ].map((company, logoIndex) => (
                        <motion.div
                          key={`layer2-set${setIndex}-${logoIndex}`}
                          className="flex-shrink-0 mx-12 group cursor-pointer"
                          whileHover={{
                            scale: 1.25,
                            y: -12,
                            rotateY: -15,
                            filter:
                              "brightness(1.2) drop-shadow(0 10px 25px rgba(11, 134, 248, 0.5))",
                          }}
                          animate={{
                            y: [0, -2.5, 0],
                            rotateX: [0, -2, 0],
                            filter: [
                              "brightness(0.75) drop-shadow(0 0 0 transparent)",
                              "brightness(0.9) drop-shadow(0 4px 8px rgba(11, 134, 248, 0.1))",
                              "brightness(0.75) drop-shadow(0 0 0 transparent)",
                            ],
                          }}
                          transition={{
                            y: {
                              duration: 3.5 + logoIndex * 0.25,
                              repeat: Infinity,
                              ease: "easeInOut",
                              delay: setIndex * 0.12,
                            },
                            rotateX: {
                              duration: 4.2 + logoIndex * 0.18,
                              repeat: Infinity,
                              ease: "easeInOut",
                              delay: setIndex * 0.18,
                            },
                            filter: {
                              duration: 2.8 + logoIndex * 0.35,
                              repeat: Infinity,
                              ease: "easeInOut",
                              delay: setIndex * 0.25,
                            },
                          }}
                          style={{
                            transformStyle: "preserve-3d",
                            perspective: "1000px",
                          }}
                        >
                          <motion.img
                            src={company.logo}
                            alt={`${company.name} logo`}
                            className="h-12 w-auto transition-all duration-500"
                            onError={(e) => {
                              // Fallback to text if image fails to load
                              e.currentTarget.style.display = "none";
                              e.currentTarget.nextElementSibling?.classList.remove(
                                "hidden",
                              );
                            }}
                            whileHover={{
                              rotateZ: [0, 5, -5, 0],
                              scale: [1, 1.1, 1],
                            }}
                            transition={{
                              rotateZ: { duration: 0.6, ease: "easeInOut" },
                              scale: { duration: 0.3, ease: "easeOut" },
                            }}
                          />
                          <motion.span
                            className="hidden text-text-secondary font-medium text-sm group-hover:text-white transition-colors absolute -bottom-6 left-1/2 transform -translate-x-1/2 whitespace-nowrap"
                            initial={{ opacity: 0, y: 10 }}
                            whileHover={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.2 }}
                          >
                            {company.name}
                          </motion.span>
                        </motion.div>
                      )),
                    )}
                </div>
              </div>
            </div>
          </ScrollFadeIn>

          {/* Performance Metrics - Animated Counters */}
          <ScrollSlideUp className="grid grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
            <AnimatedCounter
              endValue={9}
              suffix="ms"
              label="Response Time"
              comparison="vs QuickNode: 57.4ms"
              delay={0}
            />
            <AnimatedCounter
              endValue={50000}
              label="RPS"
              comparison="vs Helius: 25,000"
              delay={0.1}
            />
            <AnimatedCounter
              endValue={100}
              suffix="%"
              label="Success Rate"
              comparison="vs 50% provider failures"
              delay={0.2}
            />
            <AnimatedCounter
              endValue={1}
              suffix="ms"
              label="Consistency"
              comparison="±1ms vs 20-40ms variance"
              delay={0.3}
            />
          </ScrollSlideUp>
        </div>
      </section>

      {/* All-in-One Features Section - Condensed */}
      <section className="section-padding">
        <div className="container-width">
          <ScrollSlideUp>
            <div className="text-center mb-12">
              <h2
                className="text-4xl lg:text-5xl font-bold mb-4 text-white"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Everything{" "}
                <span
                  style={{
                    background:
                      "linear-gradient(135deg, #01d3f4 0%, #0b86f8 50%, #01d3f4 100%)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    backgroundClip: "text",
                    color: "#01d3f4",
                    filter: "drop-shadow(0 0 15px rgba(1,211,244,0.5))",
                  }}
                >
                  You Need
                </span>
              </h2>
              <p className="text-lg text-text-secondary max-w-2xl mx-auto">
                Enterprise-grade Solana RPC infrastructure with all the features
                you need to build and scale.
              </p>
            </div>
          </ScrollSlideUp>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
            {/* Left Column - Technical Features */}
            <motion.div
              className="space-y-6"
              initial={{ opacity: 0, x: -50, rotateY: -15 }}
              whileInView={{ opacity: 1, x: 0, rotateY: 0 }}
              transition={{ duration: 0.8, ease: [0.25, 0.46, 0.45, 0.94] }}
              viewport={{ once: true, margin: "-50px" }}
              style={{ transformStyle: "preserve-3d" }}
            >
              <motion.h3
                className="text-2xl font-bold text-N0DE-green mb-4"
                whileHover={{ scale: 1.02, x: 5 }}
                transition={{ type: "spring", stiffness: 400 }}
              >
                Built for Solana Traders
              </motion.h3>
              <div className="space-y-4">
                {[
                  {
                    icon: Zap,
                    title: "Block 0 Access • Lightning Sniping",
                    desc: "First-mover advantage • Get entries before teams • 9ms response times",
                    color: "N0DE-green",
                  },
                  {
                    icon: Database,
                    title: "Block 0 Priority Lanes",
                    desc: "Guaranteed first-block inclusion • Beat institutional traders • Priority access",
                    color: "N0DE-blue",
                  },
                  {
                    icon: Shield,
                    title: "MEV Protection Suite",
                    desc: "Advanced sandwich attack prevention & private mempool access",
                    color: "N0DE-green",
                  },
                  {
                    icon: TrendingUp,
                    title: "Real-Time Market Data",
                    desc: "gRPC Geyser streams for instant price feeds & account updates",
                    color: "N0DE-blue",
                  },
                ].map((feature, index) => (
                  <motion.div
                    key={index}
                    className={`flex items-start space-x-3 p-4 rounded-xl hover:bg-${feature.color}/10 border border-transparent hover:border-${feature.color}/20 transition-all duration-300 cursor-pointer group`}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                    viewport={{ once: true }}
                    whileHover={{
                      x: 8,
                      scale: 1.02,
                      boxShadow: `0 8px 25px rgba(1, 211, 244, 0.15)`,
                      rotateY: 2,
                    }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <motion.div
                      whileHover={{ rotate: 15, scale: 1.2 }}
                      transition={{ type: "spring", stiffness: 500 }}
                    >
                      <feature.icon
                        className={`w-5 h-5 text-${feature.color} mt-1 group-hover:drop-shadow-glow`}
                      />
                    </motion.div>
                    <div>
                      <motion.div
                        className="font-semibold text-white group-hover:text-shadow-sm"
                        whileHover={{ x: 2 }}
                        transition={{ type: "spring", stiffness: 300 }}
                      >
                        {feature.title}
                      </motion.div>
                      <motion.div
                        className="text-sm text-text-secondary group-hover:text-gray-300"
                        whileHover={{ x: 2 }}
                        transition={{
                          type: "spring",
                          stiffness: 300,
                          delay: 0.05,
                        }}
                      >
                        {feature.desc}
                      </motion.div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            {/* Right Column - Enterprise Features */}
            <motion.div
              className="space-y-6"
              initial={{ opacity: 0, x: 50, rotateY: 15 }}
              whileInView={{ opacity: 1, x: 0, rotateY: 0 }}
              transition={{
                duration: 0.8,
                delay: 0.2,
                ease: [0.25, 0.46, 0.45, 0.94],
              }}
              viewport={{ once: true, margin: "-50px" }}
              style={{ transformStyle: "preserve-3d" }}
            >
              <motion.h3
                className="text-2xl font-bold text-N0DE-blue mb-4"
                whileHover={{ scale: 1.02, x: -5 }}
                transition={{ type: "spring", stiffness: 400 }}
              >
                Privacy & Security First
              </motion.h3>
              <div className="space-y-4">
                {[
                  {
                    icon: Shield,
                    title: "Zero KYC • Complete Privacy",
                    desc: "No ID required • Anonymous access • Encrypted connections",
                    color: "N0DE-blue",
                  },
                  {
                    icon: CreditCard,
                    title: "All Major Cryptocurrencies",
                    desc: "SOL • ETH • BTC • USDC • Instant activation",
                    color: "N0DE-green",
                  },
                  {
                    icon: Lock,
                    title: "Military-Grade Security",
                    desc: "End-to-end encryption • DDoS protection • Secure infrastructure",
                    color: "N0DE-blue",
                  },
                  {
                    icon: Users,
                    title: "Elite Trader Community",
                    desc: "Join exclusive alpha groups • Premium support • Trading insights",
                    color: "N0DE-green",
                  },
                ].map((feature, index) => (
                  <motion.div
                    key={index}
                    className={`flex items-start space-x-3 p-4 rounded-xl hover:bg-${feature.color}/10 border border-transparent hover:border-${feature.color}/20 transition-all duration-300 cursor-pointer group`}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: index * 0.1 + 0.3 }}
                    viewport={{ once: true }}
                    whileHover={{
                      x: -8,
                      scale: 1.02,
                      boxShadow: `0 8px 25px rgba(11, 134, 248, 0.15)`,
                      rotateY: -2,
                    }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <motion.div
                      whileHover={{ rotate: -15, scale: 1.2 }}
                      transition={{ type: "spring", stiffness: 500 }}
                    >
                      <feature.icon
                        className={`w-5 h-5 text-${feature.color} mt-1 group-hover:drop-shadow-glow`}
                      />
                    </motion.div>
                    <div>
                      <motion.div
                        className="font-semibold text-white group-hover:text-shadow-sm"
                        whileHover={{ x: -2 }}
                        transition={{ type: "spring", stiffness: 300 }}
                      >
                        {feature.title}
                      </motion.div>
                      <motion.div
                        className="text-sm text-text-secondary group-hover:text-gray-300"
                        whileHover={{ x: -2 }}
                        transition={{
                          type: "spring",
                          stiffness: 300,
                          delay: 0.05,
                        }}
                      >
                        {feature.desc}
                      </motion.div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Enhanced Performance Comparison */}
      <EnhancedPerformanceComparison />

      {/* Pricing Section */}
      <section id="pricing">
        <PricingSection />
      </section>

      {/* CTA Section */}
      <section className="section-padding relative overflow-hidden">
        <SectionBackground variant="enterprise" />
        <div className="container-width text-center">
          <ScrollSlideUp>
            <h2
              className="text-4xl lg:text-5xl font-bold mb-6"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Ready to{" "}
              <span
                style={{
                  background:
                    "linear-gradient(135deg, #01d3f4 0%, #0b86f8 50%, #01d3f4 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                  color: "#01d3f4",
                  filter: "drop-shadow(0 0 15px rgba(1,211,244,0.5))",
                }}
              >
                Build?
              </span>
            </h2>
            <p className="text-xl text-text-secondary mb-8 max-w-2xl mx-auto">
              Join thousands of developers and enterprises who trust N0DE for
              their Solana RPC needs.
            </p>
            <motion.button
              whileHover={{
                scale: 1.08,
                y: -8,
                rotateX: 8,
                rotateY: 3,
                boxShadow: [
                  "0 25px 50px rgba(1, 211, 244, 0.5)",
                  "inset 0 2px 0 rgba(255, 255, 255, 0.15)",
                  "inset 0 -2px 0 rgba(0, 0, 0, 0.25)",
                ].join(", "),
              }}
              whileTap={{
                scale: 0.95,
                y: -2,
                boxShadow: [
                  "0 10px 20px rgba(1, 211, 244, 0.4)",
                  "inset 0 3px 6px rgba(0, 0, 0, 0.4)",
                  "inset 0 -1px 0 rgba(255, 255, 255, 0.1)",
                ].join(", "),
              }}
              onClick={() => {
                try {
                  console.log("CTA Get Started Free button clicked");
                  setAuthMode("signup");
                  setShowAuthModal(true);
                } catch (error) {
                  console.error(
                    "Error in CTA Get Started Free button click:",
                    error,
                  );
                }
              }}
              className="relative group inline-flex"
              style={{
                fontFamily: "var(--font-display)",
                perspective: "1000px",
                transformStyle: "preserve-3d",
              }}
              animate={{
                boxShadow: [
                  [
                    "0 15px 35px rgba(1, 211, 244, 0.3)",
                    "inset 0 1px 0 rgba(255, 255, 255, 0.1)",
                    "inset 0 -1px 0 rgba(0, 0, 0, 0.2)",
                  ].join(", "),
                  [
                    "0 20px 40px rgba(1, 211, 244, 0.35)",
                    "inset 0 1px 0 rgba(255, 255, 255, 0.12)",
                    "inset 0 -1px 0 rgba(0, 0, 0, 0.22)",
                  ].join(", "),
                  [
                    "0 15px 35px rgba(1, 211, 244, 0.3)",
                    "inset 0 1px 0 rgba(255, 255, 255, 0.1)",
                    "inset 0 -1px 0 rgba(0, 0, 0, 0.2)",
                  ].join(", "),
                ],
              }}
              transition={{
                boxShadow: { duration: 4, repeat: Infinity, ease: "easeInOut" },
              }}
            >
              {/* Main Button Surface */}
              <div className="relative px-8 py-4 bg-gradient-to-b from-N0DE-cyan via-N0DE-sky to-N0DE-navy text-white font-bold text-lg rounded-xl overflow-hidden transition-all duration-300 group-hover:from-N0DE-sky group-hover:via-N0DE-cyan group-hover:to-N0DE-navy">
                {/* Top Highlight */}
                <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-transparent via-white/30 to-transparent" />

                {/* Inner Glow */}
                <div className="absolute inset-0 bg-gradient-to-t from-transparent via-transparent to-white/8 rounded-xl" />

                {/* Bottom Shadow */}
                <div className="absolute inset-x-0 bottom-0 h-0.5 bg-gradient-to-r from-transparent via-black/40 to-transparent" />

                {/* Shimmer Effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent opacity-0 group-hover:opacity-100 group-hover:translate-x-full transition-all duration-800 ease-out rounded-xl" />

                {/* Content */}
                <div className="relative flex items-center space-x-3 text-white font-bold">
                  <motion.div
                    whileHover={{
                      rotate: [0, -15, 15, 0],
                      scale: 1.2,
                      filter: "drop-shadow(0 0 10px rgba(255, 255, 255, 0.3))",
                    }}
                    transition={{
                      rotate: { duration: 0.8, ease: "easeInOut" },
                      scale: { type: "spring", stiffness: 400 },
                      filter: { duration: 0.3 },
                    }}
                  >
                    <Rocket className="w-5 h-5" />
                  </motion.div>
                  <motion.span
                    whileHover={{ x: 3 }}
                    transition={{ type: "spring", stiffness: 300 }}
                    className="font-black tracking-wide"
                  >
                    Get Started Free
                  </motion.span>
                  <motion.div
                    whileHover={{
                      x: 5,
                      rotate: [0, 10, -10, 0],
                      scale: 1.1,
                    }}
                    transition={{
                      x: { type: "spring", stiffness: 300 },
                      rotate: { duration: 0.6, ease: "easeInOut" },
                      scale: { type: "spring", stiffness: 400 },
                    }}
                  >
                    <ArrowRight className="w-5 h-5" />
                  </motion.div>
                </div>
              </div>

              {/* 3D Bottom Edge */}
              <div className="absolute inset-x-0 bottom-0 h-1.5 bg-gradient-to-b from-N0DE-navy to-black/60 rounded-b-xl" />
            </motion.button>
          </ScrollSlideUp>
        </div>
      </section>

      {/* Pricing Section */}
      <section
        id="pricing"
        className="section-padding relative overflow-hidden"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-N0DE-navy/5 to-N0DE-cyan/5" />
        <div className="container-width relative z-10">
          <ScrollSlideUp>
            <div className="text-center mb-16">
              <h2 className="text-4xl lg:text-5xl font-black mb-6">
                <span className="gradient-text">Simple, Transparent</span>
                <br />
                <span className="text-white">Pricing</span>
              </h2>
              <p className="text-xl text-text-secondary max-w-2xl mx-auto">
                Choose the perfect plan for your needs. All plans include our
                enterprise-grade infrastructure.
              </p>
            </div>
          </ScrollSlideUp>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {/* Starter Plan */}
            <ScrollSlideUp delay={0.1}>
              <motion.div
                whileHover={{ y: -8, scale: 1.02 }}
                className="relative bg-bg-elevated border border-border rounded-2xl p-8 group"
              >
                <div className="mb-6">
                  <h3 className="text-2xl font-bold text-white mb-2">
                    Starter
                  </h3>
                  <p className="text-text-secondary mb-4">
                    Perfect for getting started
                  </p>
                  <div className="flex items-baseline">
                    <span className="text-4xl font-black text-N0DE-cyan">
                      $99
                    </span>
                    <span className="text-text-secondary ml-2">/month</span>
                  </div>
                </div>

                <ul className="space-y-4 mb-8">
                  <li className="flex items-center text-text-secondary">
                    <div className="w-2 h-2 bg-N0DE-green rounded-full mr-3" />
                    1M requests/month
                  </li>
                  <li className="flex items-center text-text-secondary">
                    <div className="w-2 h-2 bg-N0DE-green rounded-full mr-3" />
                    5,000 RPS
                  </li>
                  <li className="flex items-center text-text-secondary">
                    <div className="w-2 h-2 bg-N0DE-green rounded-full mr-3" />
                    99.9% Uptime SLA
                  </li>
                  <li className="flex items-center text-text-secondary">
                    <div className="w-2 h-2 bg-N0DE-green rounded-full mr-3" />
                    Standard Support
                  </li>
                </ul>

                <button
                  onClick={() => router.push("/payment?plan=STARTER")}
                  className="w-full py-3 px-6 bg-gradient-to-r from-N0DE-green to-N0DE-cyan text-black font-bold rounded-xl hover:shadow-lg hover:shadow-N0DE-cyan/20 transition-all duration-200"
                >
                  Get Started
                </button>
              </motion.div>
            </ScrollSlideUp>

            {/* Professional Plan - Popular */}
            <ScrollSlideUp delay={0.2}>
              <motion.div
                whileHover={{ y: -8, scale: 1.02 }}
                className="relative bg-gradient-to-b from-N0DE-cyan/10 to-N0DE-navy/10 border-2 border-N0DE-cyan rounded-2xl p-8 group"
              >
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <span className="bg-gradient-to-r from-N0DE-green to-N0DE-cyan text-black px-4 py-1 rounded-full text-sm font-bold">
                    MOST POPULAR
                  </span>
                </div>

                <div className="mb-6">
                  <h3 className="text-2xl font-bold text-white mb-2">
                    Professional
                  </h3>
                  <p className="text-text-secondary mb-4">
                    Best for production apps
                  </p>
                  <div className="flex items-baseline">
                    <span className="text-4xl font-black text-N0DE-cyan">
                      $299
                    </span>
                    <span className="text-text-secondary ml-2">/month</span>
                  </div>
                </div>

                <ul className="space-y-4 mb-8">
                  <li className="flex items-center text-text-secondary">
                    <div className="w-2 h-2 bg-N0DE-green rounded-full mr-3" />
                    5M requests/month
                  </li>
                  <li className="flex items-center text-text-secondary">
                    <div className="w-2 h-2 bg-N0DE-green rounded-full mr-3" />
                    25,000 RPS
                  </li>
                  <li className="flex items-center text-text-secondary">
                    <div className="w-2 h-2 bg-N0DE-green rounded-full mr-3" />
                    99.95% Uptime SLA
                  </li>
                  <li className="flex items-center text-text-secondary">
                    <div className="w-2 h-2 bg-N0DE-green rounded-full mr-3" />
                    Priority Support
                  </li>
                  <li className="flex items-center text-text-secondary">
                    <div className="w-2 h-2 bg-N0DE-green rounded-full mr-3" />
                    WebSocket Streaming
                  </li>
                </ul>

                <button
                  onClick={() => router.push("/payment?plan=PROFESSIONAL")}
                  className="w-full py-3 px-6 bg-gradient-to-r from-N0DE-cyan to-N0DE-navy text-white font-bold rounded-xl hover:shadow-lg hover:shadow-N0DE-cyan/30 transition-all duration-200"
                >
                  Start Professional
                </button>
              </motion.div>
            </ScrollSlideUp>

            {/* Enterprise Plan */}
            <ScrollSlideUp delay={0.3}>
              <motion.div
                whileHover={{ y: -8, scale: 1.02 }}
                className="relative bg-bg-elevated border border-border rounded-2xl p-8 group"
              >
                <div className="mb-6">
                  <h3 className="text-2xl font-bold text-white mb-2">
                    Enterprise
                  </h3>
                  <p className="text-text-secondary mb-4">
                    For large scale applications
                  </p>
                  <div className="flex items-baseline">
                    <span className="text-4xl font-black text-N0DE-cyan">
                      $899
                    </span>
                    <span className="text-text-secondary ml-2">/month</span>
                  </div>
                </div>

                <ul className="space-y-4 mb-8">
                  <li className="flex items-center text-text-secondary">
                    <div className="w-2 h-2 bg-N0DE-green rounded-full mr-3" />
                    50M requests/month
                  </li>
                  <li className="flex items-center text-text-secondary">
                    <div className="w-2 h-2 bg-N0DE-green rounded-full mr-3" />
                    Unlimited RPS
                  </li>
                  <li className="flex items-center text-text-secondary">
                    <div className="w-2 h-2 bg-N0DE-green rounded-full mr-3" />
                    99.99% Uptime SLA
                  </li>
                  <li className="flex items-center text-text-secondary">
                    <div className="w-2 h-2 bg-N0DE-green rounded-full mr-3" />
                    24/7 Dedicated Support
                  </li>
                  <li className="flex items-center text-text-secondary">
                    <div className="w-2 h-2 bg-N0DE-green rounded-full mr-3" />
                    Custom Infrastructure
                  </li>
                  <li className="flex items-center text-text-secondary">
                    <div className="w-2 h-2 bg-N0DE-green rounded-full mr-3" />
                    Team Management
                  </li>
                </ul>

                <button
                  onClick={() => router.push("/payment?plan=ENTERPRISE")}
                  className="w-full py-3 px-6 bg-gradient-to-r from-N0DE-green to-N0DE-cyan text-black font-bold rounded-xl hover:shadow-lg hover:shadow-N0DE-cyan/20 transition-all duration-200"
                >
                  Go Enterprise
                </button>
              </motion.div>
            </ScrollSlideUp>
          </div>

          <ScrollSlideUp delay={0.4}>
            <div className="text-center mt-12">
              <p className="text-text-secondary mb-6">
                Already have an account?
                <button
                  onClick={() => router.push("/subscription")}
                  className="text-N0DE-cyan hover:text-N0DE-green ml-2 font-semibold"
                >
                  Manage your subscription →
                </button>
              </p>
            </div>
          </ScrollSlideUp>
        </div>
      </section>

      {/* Footer */}
      <footer className="section-padding border-t-2 border-n0de-green/20 relative">
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
        <div className="container-width relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 mb-8">
            {/* Logo & Description */}
            <div className="lg:col-span-2">
              <div className="flex items-center space-x-3 mb-4">
                <div className="relative w-8 h-8 rounded-lg overflow-hidden">
                  <Image
                    src="/n0de-alt-background.png"
                    alt="N0DE Logo"
                    fill
                    className="object-cover"
                  />
                </div>
                <span
                  className="text-xl font-bold"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  N0DE
                </span>
              </div>
              <p className="text-text-secondary max-w-md">
                Europe&apos;s fastest, most reliable Solana RPC infrastructure.
                Built for teams who demand excellence.
              </p>
            </div>

            {/* Links */}
            <div>
              <h4
                className="font-semibold mb-4"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Product
              </h4>
              <div className="space-y-2">
                <a
                  href="#"
                  className="block text-text-secondary hover:text-N0DE-cyan transition-colors"
                >
                  RPC Nodes
                </a>
                <a
                  href="#"
                  className="block text-text-secondary hover:text-N0DE-cyan transition-colors"
                >
                  WebSockets
                </a>
                <a
                  href="#"
                  className="block text-text-secondary hover:text-N0DE-cyan transition-colors"
                >
                  Analytics
                </a>
                <a
                  href="#"
                  className="block text-text-secondary hover:text-N0DE-cyan transition-colors"
                >
                  Enterprise
                </a>
              </div>
            </div>

            <div>
              <h4
                className="font-semibold mb-4"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Company
              </h4>
              <div className="space-y-2">
                <a
                  href="#"
                  className="block text-text-secondary hover:text-N0DE-cyan transition-colors"
                >
                  About
                </a>
                <a
                  href="#"
                  className="block text-text-secondary hover:text-N0DE-cyan transition-colors"
                >
                  Blog
                </a>
                <a
                  href="#"
                  className="block text-text-secondary hover:text-N0DE-cyan transition-colors"
                >
                  Careers
                </a>
                <a
                  href="#"
                  className="block text-text-secondary hover:text-N0DE-cyan transition-colors"
                >
                  Contact
                </a>
              </div>
            </div>
          </div>

          <div className="border-t border-border pt-8 flex flex-col lg:flex-row items-center justify-between">
            <p className="text-text-muted text-sm">
              © 2025 N0DE. All rights reserved.
            </p>
            <div className="flex items-center space-x-6 mt-4 lg:mt-0">
              <a
                href="#"
                className="text-text-muted hover:text-N0DE-cyan transition-colors"
              >
                Privacy
              </a>
              <a
                href="#"
                className="text-text-muted hover:text-N0DE-cyan transition-colors"
              >
                Terms
              </a>
              <a
                href="#"
                className="text-text-muted hover:text-N0DE-cyan transition-colors"
              >
                Status
              </a>
            </div>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        mode={authMode}
        onModeChange={setAuthMode}
      />

      <SupportSystem
        isOpen={showSupport}
        onClose={() => setShowSupport(false)}
      />

      <ApiPlayground
        isOpen={showApiDemo}
        onClose={() => setShowApiDemo(false)}
      />

      <FloatingSupportButton onSupportClick={() => setShowSupport(true)} />
    </div>
  );
}
