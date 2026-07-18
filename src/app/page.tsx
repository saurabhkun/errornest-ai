import type { Metadata } from "next";
import { ErrorNestLanding } from "@/components/marketing/ErrorNestLanding";

export const metadata: Metadata = {
  title: "ErrorNest — AI-Powered Error Monitoring & Debugging",
  description:
    "Capture, group, and explain application exceptions in real time with context-aware AI. Get started free.",
  alternates: {
    canonical: "/",
  },
};

export default function Home() {
  return <ErrorNestLanding />;
}
