"use client";

import dynamic from "next/dynamic";
import Navbar from "@/lib/components/Navbar";
import Footer from "@/lib/components/Footer";
import PageTransition from "@/lib/components/PageTransition";
import { PostHogProvider } from "@/lib/components/PostHogProvider";
import { AchievementProvider } from "@/lib/components/AchievementToast";

// Lazy-load non-critical components (no SSR needed)
const WelcomeModal = dynamic(
  () => import("@/lib/components/WelcomeModal").then(m => ({ default: m.WelcomeModal })),
  { ssr: false }
);
const FeedbackWidget = dynamic(
  () => import("@/lib/components/FeedbackWidget"),
  { ssr: false }
);
const PresenceHeartbeat = dynamic(
  () => import("@/lib/components/PresenceHeartbeat"),
  { ssr: false }
);
const VerificationBanner = dynamic(
  () => import("@/lib/components/VerificationBanner"),
  { ssr: false }
);
const UpdateBanner = dynamic(
  () => import("@/lib/components/UpdateBanner"),
  { ssr: false }
);
const InstallPrompt = dynamic(
  () => import("@/lib/components/InstallPrompt"),
  { ssr: false }
);
const NativeInit = dynamic(
  () => import("@/lib/components/NativeInit"),
  { ssr: false }
);
const IOSBanner = dynamic(
  () => import("@/lib/components/IOSBanner"),
  { ssr: false }
);

export default function ClientShell({ children }: { children: React.ReactNode }) {
  return (
    <PostHogProvider>
      <AchievementProvider>
        <PresenceHeartbeat />
        <IOSBanner />
        <Navbar />
        <VerificationBanner />
        <UpdateBanner />
        <PageTransition>{children}</PageTransition>
        {/* Footer hidden on mobile via CSS, visible on desktop */}
        <div className="hidden md:block">
          <Footer />
        </div>
        <WelcomeModal />
        <FeedbackWidget />
        <InstallPrompt />
        <NativeInit />
      </AchievementProvider>
    </PostHogProvider>
  );
}
