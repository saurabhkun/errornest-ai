"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";
import {
  ArrowRight,
  BarChart3,
  Bot,
  BrainCircuit,
  ChevronRight,
  Code2,
  Cpu,
  GitBranchPlus,
  MessageSquareText,
  Rocket,
  Sparkles,
  ShieldCheck,
  Zap,
} from "lucide-react";

const trustedBy = ["Vercel", "Stripe", "Notion", "Linear", "Supabase"];

const featureCards = [
  {
    title: "Deterministic grouping",
    description:
      "Volatile stack details are normalized into one clear issue, so your team sees signal instead of noise.",
    icon: GitBranchPlus,
  },
  {
    title: "AI root-cause summaries",
    description:
      "Get plain-language explanations, likely causes, and suggested next steps in seconds.",
    icon: BrainCircuit,
  },
  {
    title: "Instant alerting",
    description:
      "Route critical incidents to Slack, email, and in-app notifications without waking the whole team.",
    icon: Zap,
  },
];

const aiHighlights = [
  {
    title: "Ask anything",
    description: "Investigate release regressions, impacted services, or affected users with natural language.",
    icon: MessageSquareText,
  },
  {
    title: "Safeguarded workflows",
    description: "PII is redacted before it reaches the model, so your debugging stays compliant.",
    icon: ShieldCheck,
  },
  {
    title: "Built for speed",
    description: "The assistant responds with contextual evidence, not generic explanations.",
    icon: Cpu,
  },
];

const analyticsRows = [
  { label: "Escalations", value: "+24%" },
  { label: "Mean time to triage", value: "4m" },
  { label: "Resolution confidence", value: "97%" },
];

export function ErrorNestLanding() {
  const heroRef = useRef<HTMLElement | null>(null);
  const dashboardRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    gsap.registerPlugin(ScrollTrigger);

    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      touchMultiplier: 1.5,
    });

    const raf = (time: number) => {
      lenis.raf(time);
      requestAnimationFrame(raf);
    };

    const frame = requestAnimationFrame(raf);

    const heroElements = heroRef.current?.querySelectorAll<HTMLElement>("[data-hero-fade]");
    const dashboardElements = dashboardRef.current?.querySelectorAll<HTMLElement>("[data-dashboard-float]");

    const heroTimeline = gsap.timeline({ defaults: { ease: "power3.out" } });
    heroTimeline
      .fromTo(
        heroElements ?? [],
        { autoAlpha: 0, y: 24 },
        { autoAlpha: 1, y: 0, duration: 0.8, stagger: 0.12 }
      )
      .fromTo(
        dashboardElements ?? [],
        { autoAlpha: 0, y: 24, scale: 0.97 },
        { autoAlpha: 1, y: 0, scale: 1, duration: 0.8, stagger: 0.1 },
        "-=0.35"
      );

    const floatCards = gsap.utils.toArray<HTMLElement>("[data-dashboard-float]");
    floatCards.forEach((card, index) => {
      gsap.to(card, {
        y: index % 2 === 0 ? -10 : 10,
        duration: 2.4 + index * 0.25,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
      });
    });

    gsap.utils.toArray<HTMLElement>(".reveal").forEach((section) => {
      gsap.fromTo(
        section,
        { autoAlpha: 0, y: 32 },
        {
          autoAlpha: 1,
          y: 0,
          duration: 0.8,
          ease: "power3.out",
          scrollTrigger: {
            trigger: section,
            start: "top 82%",
            once: true,
          },
        }
      );
    });

    const hoverButtons = Array.from(document.querySelectorAll<HTMLElement>("[data-hover-button]"));
    hoverButtons.forEach((button) => {
      button.addEventListener("mouseenter", () => {
        gsap.to(button, { y: -3, scale: 1.01, duration: 0.2, ease: "power2.out" });
      });
      button.addEventListener("mouseleave", () => {
        gsap.to(button, { y: 0, scale: 1, duration: 0.2, ease: "power2.out" });
      });
    });

    return () => {
      lenis.destroy();
      cancelAnimationFrame(frame);
      ScrollTrigger.getAll().forEach((trigger) => trigger.kill());
      gsap.killTweensOf(floatCards);
      hoverButtons.forEach((button) => {
        button.removeEventListener("mouseenter", () => undefined);
        button.removeEventListener("mouseleave", () => undefined);
      });
    };
  }, []);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(91,140,255,0.18),_transparent_36%),linear-gradient(135deg,_#07111b_0%,_#0a1220_45%,_#07111b_100%)] text-slate-100">
      <header className="sticky top-0 z-50 border-b border-white/10 bg-slate-950/70 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6 lg:px-8">
          <Link href="#" className="flex items-center gap-3" data-hero-fade>
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-primary font-mono text-sm font-semibold text-primary-foreground">
              EN
            </div>
            <span className="text-lg font-semibold tracking-tight text-white">ErrorNest</span>
          </Link>

          <nav className="hidden items-center gap-6 text-sm font-medium text-slate-300 md:flex" aria-label="Marketing navigation">
            <a href="#features" className="transition-colors hover:text-white">
              Features
            </a>
            <a href="#assistant" className="transition-colors hover:text-white">
              AI Assistant
            </a>
            <a href="#pricing" className="transition-colors hover:text-white">
              Pricing
            </a>
            <a href="#docs" className="transition-colors hover:text-white">
              Docs
            </a>
            <a href="https://github.com" target="_blank" rel="noreferrer" className="transition-colors hover:text-white">
              GitHub
            </a>
          </nav>

          <div className="flex items-center gap-3" data-hero-fade>
            <a href="/auth/signin" className="rounded-full px-4 py-2 text-sm font-medium text-slate-300 transition-colors hover:text-white">
              Sign In
            </a>
            <a
              href="/signup"
              data-hover-button
              className="rounded-full border border-primary/40 bg-primary/90 px-4 py-2 text-sm font-semibold text-white shadow-[0_12px_30px_rgba(91,140,255,0.25)] transition-colors hover:bg-primary"
            >
              Get Started
            </a>
          </div>
        </div>
      </header>

      <main id="main-content" className="flex-1">
        <section ref={heroRef} className="relative overflow-hidden px-6 pb-20 pt-20 sm:pt-28 lg:px-8 lg:pb-28">
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,_rgba(91,140,255,0.24),_transparent_36%),radial-gradient(circle_at_80%_20%,_rgba(124,58,237,0.2),_transparent_24%)]" />

          <div className="mx-auto grid max-w-7xl items-center gap-16 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="max-w-2xl">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-sm font-medium text-primary" data-hero-fade>
                <Sparkles className="h-4 w-4" />
                Premium observability for modern product teams
              </div>
              <h1 className="mb-6 text-5xl font-semibold tracking-tight text-white sm:text-6xl lg:text-7xl" data-hero-fade>
                Calm during failure.
                <span className="block bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
                  Built for teams that ship fast.
                </span>
              </h1>
              <p className="mb-8 max-w-xl text-lg leading-8 text-slate-300" data-hero-fade>
                ErrorNest combines real-time monitoring, deterministic grouping, and AI explanations into one refined experience that keeps releases moving.
              </p>
              <div className="flex flex-col gap-3 sm:flex-row" data-hero-fade>
                <a
                  href="/signup"
                  data-hover-button
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-white shadow-[0_18px_40px_rgba(91,140,255,0.28)] transition-colors hover:bg-primary/90"
                >
                  Start free trial
                  <ArrowRight className="h-4 w-4" />
                </a>
                <a
                  href="#docs"
                  data-hover-button
                  className="inline-flex items-center justify-center rounded-full border border-white/15 bg-white/5 px-5 py-3 text-sm font-semibold text-slate-200 transition-colors hover:bg-white/10"
                >
                  Explore docs
                </a>
              </div>
            </div>

            <div ref={dashboardRef} className="relative mx-auto w-full max-w-2xl">
              <div className="absolute inset-0 rounded-[2rem] bg-gradient-to-br from-primary/20 via-transparent to-violet-500/15 blur-3xl" />
              <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-slate-950/70 p-4 shadow-[0_20px_80px_rgba(2,6,23,0.45)] backdrop-blur">
                <div className="rounded-[1.5rem] border border-white/10 bg-slate-900/80 p-4">
                  <div className="mb-4 flex items-center justify-between rounded-full border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-slate-400">
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
                      <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                      <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
                    </div>
                    <span className="font-mono text-xs uppercase tracking-[0.3em] text-slate-500">errornest.ai</span>
                  </div>

                  <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
                    <div className="rounded-[1.25rem] border border-white/10 bg-slate-950/80 p-5">
                      <div className="mb-4 flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-slate-400">Release health</p>
                          <p className="text-3xl font-semibold text-white">98.2%</p>
                        </div>
                        <div className="rounded-full bg-emerald-500/15 p-2 text-emerald-400">
                          <BarChart3 className="h-5 w-5" />
                        </div>
                      </div>
                      <div className="h-28 rounded-[1rem] border border-white/10 bg-gradient-to-br from-primary/20 to-violet-500/10 p-3">
                        <div className="flex h-full items-end gap-2">
                          {[42, 58, 74, 54, 92, 81].map((value) => (
                            <div key={value} className="flex-1 rounded-t-full bg-gradient-to-t from-primary to-sky-300" style={{ height: `${value}%` }} />
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div data-dashboard-float className="rounded-[1.25rem] border border-white/10 bg-slate-900/80 p-4">
                        <div className="mb-3 flex items-center gap-2 text-sm text-slate-400">
                          <Bot className="h-4 w-4 text-primary" />
                          AI assistant
                        </div>
                        <p className="text-sm leading-6 text-slate-300">
                          “The spike aligns with the deploy to edge-router at 14:03.”
                        </p>
                      </div>
                      <div data-dashboard-float className="rounded-[1.25rem] border border-white/10 bg-slate-900/80 p-4">
                        <div className="flex items-center gap-2 text-sm text-slate-400">
                          <ShieldCheck className="h-4 w-4 text-emerald-400" />
                          Auto-grouped issue
                        </div>
                        <p className="mt-2 text-sm font-medium text-white">14 events • 1 issue • 3 impacted services</p>
                      </div>
                      <div data-dashboard-float className="rounded-[1.25rem] border border-primary/20 bg-primary/10 p-4 text-sm text-slate-200">
                        <div className="flex items-center gap-2 font-medium text-white">
                          <Rocket className="h-4 w-4" />
                          Deployed fix suggestion
                        </div>
                        <p className="mt-2 leading-6 text-slate-300">Retry the cache warmup and route traffic gradually to restore stability.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-6 py-10 lg:px-8">
          <div className="reveal rounded-[2rem] border border-white/10 bg-white/5 px-6 py-6 shadow-[0_10px_40px_rgba(2,6,23,0.24)] backdrop-blur">
            <p className="mb-4 text-center text-sm font-medium uppercase tracking-[0.35em] text-slate-400">
              Trusted by teams shipping at modern pace
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4 text-lg font-semibold text-slate-300 sm:gap-8">
              {trustedBy.map((brand) => (
                <span key={brand} className="rounded-full border border-white/10 bg-slate-900/60 px-4 py-2">
                  {brand}
                </span>
              ))}
            </div>
          </div>
        </section>

        <section id="features" className="mx-auto max-w-7xl px-6 py-20 lg:px-8">
          <div className="reveal mb-12 max-w-3xl">
            <p className="mb-3 text-sm font-semibold uppercase tracking-[0.3em] text-primary">Feature highlights</p>
            <h2 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              Everything your team needs to move from signal to action.
            </h2>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            {featureCards.map((card, index) => {
              const Icon = card.icon;
              return (
                <article key={card.title} className="reveal rounded-[1.5rem] border border-white/10 bg-slate-950/70 p-7 shadow-[0_12px_40px_rgba(2,6,23,0.24)]">
                  <div className={`mb-5 inline-flex rounded-2xl border border-white/10 bg-white/5 p-3 ${index === 1 ? "text-primary" : "text-slate-200"}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="mb-3 text-xl font-semibold text-white">{card.title}</h3>
                  <p className="text-sm leading-7 text-slate-400">{card.description}</p>
                </article>
              );
            })}
          </div>
        </section>

        <section id="assistant" className="mx-auto max-w-7xl px-6 py-20 lg:px-8">
          <div className="reveal grid gap-10 rounded-[2rem] border border-white/10 bg-gradient-to-br from-white/8 to-primary/10 p-8 lg:grid-cols-[0.95fr_1.05fr] lg:p-12">
            <div>
              <p className="mb-3 text-sm font-semibold uppercase tracking-[0.3em] text-primary">AI assistant showcase</p>
              <h2 className="mb-4 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                Ask the assistant the questions your team is already asking.
              </h2>
              <p className="max-w-xl text-lg leading-8 text-slate-300">
                Investigate regressions, trace root cause, and surface meaningful next steps from one calm interface.
              </p>
            </div>

            <div className="rounded-[1.5rem] border border-white/10 bg-slate-950/80 p-6 shadow-[0_18px_45px_rgba(2,6,23,0.24)]">
              <div className="mb-4 flex items-center gap-2 rounded-full bg-white/5 px-3 py-2 text-sm text-slate-400">
                <MessageSquareText className="h-4 w-4 text-primary" />
                Ask ErrorNest
              </div>
              <div className="space-y-3">
                {aiHighlights.map((item) => {
                  const Icon = item.icon;
                  return (
                    <div key={item.title} className="rounded-[1rem] border border-white/10 bg-white/5 p-4">
                      <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-white">
                        <Icon className="h-4 w-4 text-primary" />
                        {item.title}
                      </div>
                      <p className="text-sm leading-7 text-slate-400">{item.description}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        <section id="docs" className="mx-auto max-w-7xl px-6 py-20 lg:px-8">
          <div className="reveal grid gap-8 rounded-[2rem] border border-white/10 bg-slate-950/70 p-8 lg:grid-cols-[0.9fr_1.1fr] lg:p-12">
            <div>
              <p className="mb-3 text-sm font-semibold uppercase tracking-[0.3em] text-primary">SDK integration</p>
              <h2 className="mb-4 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                Drop in a tiny SDK and start collecting events immediately.
              </h2>
              <p className="text-lg leading-8 text-slate-300">
                The JavaScript SDK is lightweight, privacy-aware, and built for teams that need production-ready instrumentation with minimal setup.
              </p>
            </div>

            <div className="overflow-hidden rounded-[1.25rem] border border-white/10 bg-slate-900/70">
              <div className="flex items-center justify-between border-b border-white/10 px-4 py-3 text-sm text-slate-400">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
                </div>
                <span className="font-mono text-xs uppercase tracking-[0.3em]">setup.ts</span>
              </div>
              <pre className="overflow-x-auto p-5 text-sm leading-7 text-slate-300">
                <code>{`import { init } from "@errornest/js";

init({
  dsn: "https://pub_key@ingest.errornest.com",
  environment: "production",
  release: "v1.3.0",
});`}</code>
              </pre>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-6 py-20 lg:px-8">
          <div className="reveal grid gap-8 rounded-[2rem] border border-white/10 bg-white/5 p-8 lg:grid-cols-[1fr_0.9fr] lg:p-12">
            <div>
              <p className="mb-3 text-sm font-semibold uppercase tracking-[0.3em] text-primary">Analytics showcase</p>
              <h2 className="mb-4 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                Surface the story behind every incident.
              </h2>
              <p className="text-lg leading-8 text-slate-300">
                Turn noisy event streams into a reliable operating rhythm with live health indicators and clear team metrics.
              </p>
            </div>

            <div className="rounded-[1.5rem] border border-white/10 bg-slate-950/70 p-6">
              <div className="mb-5 flex items-center gap-2 text-sm text-slate-400">
                <Code2 className="h-4 w-4 text-primary" />
                Incident telemetry
              </div>
              <div className="space-y-3">
                {analyticsRows.map((item) => (
                  <div key={item.label} className="flex items-center justify-between rounded-[1rem] border border-white/10 bg-white/5 px-4 py-3">
                    <span className="text-sm text-slate-400">{item.label}</span>
                    <span className="text-base font-semibold text-white">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section id="pricing" className="mx-auto max-w-7xl px-6 py-20 lg:px-8">
          <div className="reveal rounded-[2rem] border border-primary/20 bg-gradient-to-r from-primary/15 to-violet-500/10 px-8 py-14 text-center shadow-[0_20px_80px_rgba(91,140,255,0.12)]">
            <p className="mb-4 text-sm font-semibold uppercase tracking-[0.35em] text-primary">Launch faster</p>
            <h2 className="mb-4 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              Keep your team aligned when every minute matters.
            </h2>
            <p className="mx-auto mb-8 max-w-2xl text-lg leading-8 text-slate-300">
              From startup releases to enterprise incident workflows, ErrorNest gives product and engineering teams a premium command center.
            </p>
            <div className="flex flex-col justify-center gap-3 sm:flex-row">
              <a
                href="/signup"
                data-hover-button
                className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary/90"
              >
                Get started free
                <ChevronRight className="h-4 w-4" />
              </a>
              <a
                href="#docs"
                data-hover-button
                className="inline-flex items-center justify-center rounded-full border border-white/15 bg-white/5 px-5 py-3 text-sm font-semibold text-slate-200 transition-colors hover:bg-white/10"
              >
                View documentation
              </a>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/10 bg-slate-950/70 px-6 py-12 lg:px-8" role="contentinfo">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-2xl bg-primary font-mono text-sm font-semibold text-primary-foreground">
              EN
            </div>
            <div>
              <p className="font-semibold text-white">ErrorNest</p>
              <p className="text-sm text-slate-400">AI-powered incident intelligence for fast-moving teams.</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-sm text-slate-400">
            <a href="#features" className="transition-colors hover:text-white">
              Features
            </a>
            <a href="#assistant" className="transition-colors hover:text-white">
              AI Assistant
            </a>
            <a href="#docs" className="transition-colors hover:text-white">
              Docs
            </a>
            <a href="/api/health" className="transition-colors hover:text-white">
              Health API
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
