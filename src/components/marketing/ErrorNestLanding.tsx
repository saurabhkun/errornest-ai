"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import SplitText from "gsap/SplitText";
import Lenis from "lenis";
import {
  ArrowRight,
  BarChart3,
  Bot,
  BrainCircuit,
  CheckCircle2,
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

const timelineSteps = [
  {
    title: "Capture",
    description: "Instrument once and collect errors as they happen across your product surface.",
  },
  {
    title: "Group",
    description: "Normalize and fingerprint each issue so the team sees the real signal.",
  },
  {
    title: "Explain",
    description: "Use AI to summarize the likely cause and the actions worth taking next.",
  },
  {
    title: "Resolve",
    description: "Coordinate fixes, deploy confidently, and keep your release story clear.",
  },
];

const devExperiencePoints = [
  "Fast setup with minimal configuration",
  "Clear release health across environments",
  "Meaningful AI insights with privacy-safe workflows",
  "Calm, executive-ready dashboards for every team",
];

const testimonials = [
  {
    quote: "It feels as premium as the rest of our product stack, but more useful on launch days.",
    author: "Mina Patel",
    role: "VP of Engineering, Northstar",
  },
  {
    quote: "We cut mean time to triage by nearly half in the first week.",
    author: "Jonah Kline",
    role: "Head of Reliability, Lumen Cloud",
  },
  {
    quote: "The AI assistant feels like a thoughtful teammate rather than a chatbot gimmick.",
    author: "Ameli Ruiz",
    role: "Principal PM, Flux Labs",
  },
];

const integrations = ["Slack", "Linear", "GitHub", "Vercel", "Supabase", "Stripe", "Raycast", "Sentry"];

const faqItems = [
  {
    question: "How fast can a team get started?",
    answer: "Most teams go from install to first issue insight in under 15 minutes.",
  },
  {
    question: "Does ErrorNest preserve privacy?",
    answer: "Sensitive details are redacted before any AI processing, and the experience stays compliant by design.",
  },
  {
    question: "Can it scale with a growing product?",
    answer: "Yes. The same experience supports early-stage teams, high-velocity product orgs, and large distributed systems.",
  },
];

export function ErrorNestLanding() {
  const heroRef = useRef<HTMLElement | null>(null);
  const headlineRef = useRef<HTMLHeadingElement | null>(null);
  const subtitleRef = useRef<HTMLParagraphElement | null>(null);
  const dashboardRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    gsap.registerPlugin(ScrollTrigger, SplitText);

    const lenis = new Lenis({
      duration: 1.1,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      touchMultiplier: 1.5,
    });

    const raf = (time: number) => {
      lenis.raf(time);
      requestAnimationFrame(raf);
    };

    const frame = requestAnimationFrame(raf);

    const heroBadge = heroRef.current?.querySelector<HTMLElement>("[data-hero-badge]");
    const heroCtas = heroRef.current?.querySelectorAll<HTMLElement>("[data-hero-cta]");
    const heroLayers = heroRef.current?.querySelectorAll<HTMLElement>("[data-parallax]");
    const dashboardElements = dashboardRef.current?.querySelectorAll<HTMLElement>("[data-dashboard-float]");

    const heroTimeline = gsap.timeline({ defaults: { ease: "power3.out" } });

    if (!prefersReducedMotion) {
      const headlineSplit = new SplitText(headlineRef.current ?? "", {
        type: "words",
        wordsClass: "hero-word",
      });

      heroTimeline
        .fromTo(
          heroBadge ?? [],
          { y: 16, autoAlpha: 0 },
          { y: 0, autoAlpha: 1, duration: 0.7 }
        )
        .fromTo(
          headlineSplit.words,
          { y: 24, autoAlpha: 0, rotateX: -16 },
          { y: 0, autoAlpha: 1, rotateX: 0, duration: 0.7, stagger: 0.04 },
          "-=0.25"
        )
        .fromTo(
          subtitleRef.current ?? [],
          { y: 16, autoAlpha: 0 },
          { y: 0, autoAlpha: 1, duration: 0.7 },
          "-=0.2"
        )
        .fromTo(
          heroCtas ?? [],
          { y: 16, autoAlpha: 0, scale: 0.97 },
          { y: 0, autoAlpha: 1, scale: 1, duration: 0.7, stagger: 0.1 },
          "-=0.25"
        )
        .fromTo(
          dashboardElements ?? [],
          { y: 30, autoAlpha: 0, scale: 0.96 },
          { y: 0, autoAlpha: 1, scale: 1, duration: 0.75, stagger: 0.1 },
          "-=0.25"
        );
    } else {
      gsap.set([heroBadge, subtitleRef.current, heroCtas, dashboardElements], { autoAlpha: 1, y: 0, scale: 1 });
    }

    const floatCards = gsap.utils.toArray<HTMLElement>("[data-dashboard-float]");
    floatCards.forEach((card, index) => {
      gsap.to(card, {
        y: index % 2 === 0 ? -11 : 11,
        duration: 2.5 + index * 0.2,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
      });
    });

    const grid = heroRef.current?.querySelector<HTMLElement>("[data-grid-animate]");
    if (grid && !prefersReducedMotion) {
      gsap.to(grid, {
        backgroundPositionX: "100%",
        backgroundPositionY: "-100%",
        duration: 22,
        repeat: -1,
        ease: "none",
      });
    }

    const heroParallax = Array.from(heroLayers ?? []);
    const handlePointerMove = (event: PointerEvent) => {
      const x = (event.clientX / window.innerWidth - 0.5) * 14;
      const y = (event.clientY / window.innerHeight - 0.5) * 14;
      heroParallax.forEach((layer, index) => {
        gsap.to(layer, {
          x: x * (index + 1) * 0.45,
          y: y * (index + 1) * 0.45,
          duration: 0.7,
          ease: "power2.out",
        });
      });
    };

    if (!prefersReducedMotion) {
      window.addEventListener("pointermove", handlePointerMove);
    }

    gsap.utils.toArray<HTMLElement>(".reveal").forEach((section) => {
      const items = section.querySelectorAll<HTMLElement>("[data-reveal-item]");
      gsap.fromTo(
        items.length ? items : section,
        { autoAlpha: 0, y: 26 },
        {
          autoAlpha: 1,
          y: 0,
          duration: 0.75,
          ease: "power3.out",
          stagger: items.length ? 0.08 : 0,
          scrollTrigger: {
            trigger: section,
            start: "top 82%",
            once: true,
          },
        }
      );
    });

    const hoverButtons = Array.from(document.querySelectorAll<HTMLElement>("[data-hover-button]"));
    const magneticButtons = Array.from(document.querySelectorAll<HTMLElement>("[data-magnetic]"));
    const hoverCards = Array.from(document.querySelectorAll<HTMLElement>("[data-card-hover]"));

    const handleButtonMove = (button: HTMLElement, event: PointerEvent) => {
      const rect = button.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width - 0.5;
      const y = (event.clientY - rect.top) / rect.height - 0.5;
      gsap.to(button, { x: x * 6, y: y * 6, scale: 1.02, duration: 0.16, ease: "power2.out" });
    };

    const resetButton = (button: HTMLElement) => {
      gsap.to(button, { x: 0, y: 0, scale: 1, duration: 0.2, ease: "power2.out" });
    };

    hoverButtons.forEach((button) => {
      const moveHandler = (event: Event) => handleButtonMove(button, event as PointerEvent);
      const leaveHandler = () => resetButton(button);
      button.addEventListener("pointermove", moveHandler);
      button.addEventListener("pointerleave", leaveHandler);
    });

    magneticButtons.forEach((button) => {
      const moveHandler = (event: Event) => handleButtonMove(button, event as PointerEvent);
      const leaveHandler = () => resetButton(button);
      button.addEventListener("pointermove", moveHandler);
      button.addEventListener("pointerleave", leaveHandler);
    });

    hoverCards.forEach((card) => {
      card.addEventListener("pointerenter", () => {
        gsap.to(card, { y: -4, rotateX: -2, scale: 1.01, duration: 0.2, ease: "power2.out" });
      });
      card.addEventListener("pointerleave", () => {
        gsap.to(card, { y: 0, rotateX: 0, scale: 1, duration: 0.2, ease: "power2.out" });
      });
    });

    return () => {
      lenis.destroy();
      cancelAnimationFrame(frame);
      ScrollTrigger.getAll().forEach((trigger) => trigger.kill());
      gsap.killTweensOf(floatCards);
      if (grid) {
        gsap.killTweensOf(grid);
      }
      if (heroParallax.length > 0) {
        gsap.killTweensOf(heroParallax);
      }
      window.removeEventListener("pointermove", handlePointerMove);
      hoverCards.forEach((card) => {
        card.removeEventListener("pointerenter", () => undefined);
        card.removeEventListener("pointerleave", () => undefined);
      });
    };
  }, []);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(91,140,255,0.22),_transparent_34%),linear-gradient(135deg,_#07111b_0%,_#0a1220_45%,_#07111b_100%)] text-slate-100 selection:bg-primary/30 selection:text-white">
      <header className="sticky top-0 z-50 border-b border-white/10 bg-slate-950/70 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6 lg:px-8">
          <Link href="#" className="flex items-center gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950" data-hero-badge>
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-primary font-mono text-sm font-semibold text-primary-foreground shadow-[0_10px_30px_rgba(91,140,255,0.25)]">
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

          <div className="flex items-center gap-3" data-hero-badge>
            <a href="/auth/signin" className="rounded-full px-4 py-2 text-sm font-medium text-slate-300 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950">
              Sign In
            </a>
            <a
              href="/signup"
              data-hover-button
              data-magnetic
              className="rounded-full border border-primary/40 bg-primary/90 px-4 py-2 text-sm font-semibold text-white shadow-[0_14px_34px_rgba(91,140,255,0.25)] transition-colors hover:bg-primary"
            >
              Get Started
            </a>
          </div>
        </div>
      </header>

      <main id="main-content" className="flex-1">
        <section ref={heroRef} className="relative overflow-hidden px-6 pb-24 pt-20 sm:pt-28 lg:px-8 lg:pb-32">
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,_rgba(91,140,255,0.28),_transparent_34%),radial-gradient(circle_at_80%_20%,_rgba(124,58,237,0.2),_transparent_24%)]" />
          <div
            data-grid-animate
            className="absolute inset-0 -z-10 opacity-50"
            style={{
              backgroundImage:
                "linear-gradient(rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.06) 1px, transparent 1px)",
              backgroundSize: "80px 80px",
              maskImage: "linear-gradient(180deg, rgba(0,0,0,0.95), transparent 90%)",
            }}
          />
          <div data-parallax className="absolute left-[-8%] top-10 h-56 w-56 rounded-full bg-primary/25 blur-[120px]" />
          <div data-parallax className="absolute right-[-5%] top-20 h-64 w-64 rounded-full bg-violet-500/20 blur-[140px]" />

          <div className="mx-auto grid max-w-7xl items-center gap-16 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="max-w-2xl">
              <div data-hero-badge className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
                <Sparkles className="h-4 w-4" />
                Premium observability for modern product teams
              </div>
              <h1 ref={headlineRef} className="mb-6 text-5xl font-semibold tracking-[-0.03em] text-white sm:text-6xl lg:text-7xl">
                Calm during failure.
                <span className="mt-3 block bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
                  Built for teams that ship fast.
                </span>
              </h1>
              <p ref={subtitleRef} className="mb-8 max-w-xl text-lg leading-8 text-slate-300">
                ErrorNest helps teams move from noisy alerts to clear next steps with polished incident intelligence, AI context, and instant clarity.
              </p>
              <div className="flex flex-col gap-3 sm:flex-row" data-hero-cta>
                <a
                  href="/signup"
                  data-hover-button
                  data-magnetic
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-white shadow-[0_18px_40px_rgba(91,140,255,0.28)] transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
                >
                  Start free trial
                  <ArrowRight className="h-4 w-4" />
                </a>
                <a
                  href="#docs"
                  data-hover-button
                  className="inline-flex items-center justify-center rounded-full border border-white/15 bg-white/5 px-5 py-3 text-sm font-semibold text-slate-200 transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
                >
                  Explore docs
                </a>
              </div>
            </div>

            <div ref={dashboardRef} className="relative mx-auto w-full max-w-2xl">
              <div className="absolute inset-0 rounded-[2rem] bg-gradient-to-br from-primary/20 via-transparent to-violet-500/15 blur-3xl" />
              <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-slate-950/70 p-4 shadow-[0_24px_90px_rgba(2,6,23,0.45)] backdrop-blur">
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
                <article key={card.title} data-card-hover className="reveal rounded-[1.5rem] border border-white/10 bg-slate-950/70 p-7 shadow-[0_12px_40px_rgba(2,6,23,0.24)]">
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

        <section className="mx-auto max-w-7xl px-6 py-20 lg:px-8">
          <div className="reveal overflow-hidden rounded-[2rem] border border-white/10 bg-slate-950/70 p-8 shadow-[0_18px_60px_rgba(2,6,23,0.28)] lg:p-12">
            <div className="mb-10 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-2xl">
                <p className="mb-3 text-sm font-semibold uppercase tracking-[0.35em] text-primary">How ErrorNest works</p>
                <h2 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                  From first signal to shipped fix in one elegant flow.
                </h2>
              </div>
              <p className="max-w-xl text-sm leading-7 text-slate-400">
                Every step is designed to reduce noise, accelerate triage, and keep your team moving with confidence.
              </p>
            </div>

            <div className="grid gap-6 lg:grid-cols-4">
              {timelineSteps.map((step, index) => (
                <div key={step.title} data-reveal-item className="rounded-[1.25rem] border border-white/10 bg-white/5 p-5">
                  <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full border border-primary/20 bg-primary/10 text-sm font-semibold text-primary">
                    0{index + 1}
                  </div>
                  <h3 className="mb-3 text-lg font-semibold text-white">{step.title}</h3>
                  <p className="text-sm leading-7 text-slate-400">{step.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-6 py-20 lg:px-8">
          <div className="reveal grid gap-8 rounded-[2rem] border border-white/10 bg-gradient-to-br from-white/8 to-primary/10 p-8 lg:grid-cols-[0.95fr_1.05fr] lg:p-12">
            <div>
              <p className="mb-3 text-sm font-semibold uppercase tracking-[0.35em] text-primary">Developer experience</p>
              <h2 className="mb-4 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                Built for fast-moving teams who care about clarity.
              </h2>
              <p className="mb-8 max-w-xl text-lg leading-8 text-slate-300">
                The interface is intentionally calm so engineers can focus on impact, not on fighting their tools.
              </p>
              <div className="space-y-3">
                {devExperiencePoints.map((point) => (
                  <div key={point} className="flex items-center gap-3 rounded-[1rem] border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-slate-300">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                    {point}
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[1.5rem] border border-white/10 bg-slate-950/80 p-6 shadow-[0_20px_50px_rgba(2,6,23,0.24)]">
              <div className="mb-4 flex items-center justify-between rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-400">
                <span className="inline-flex items-center gap-2">
                  <Code2 className="h-4 w-4 text-primary" />
                  SDK example
                </span>
                <span className="font-mono text-xs uppercase tracking-[0.3em]">npm</span>
              </div>
              <div className="rounded-[1.25rem] border border-white/10 bg-slate-900/70 p-5">
                <p className="mb-3 text-sm font-medium text-slate-400">Install</p>
                <code className="block text-sm leading-7 text-slate-200">npm i @errornest/js</code>
                <p className="mt-5 text-sm font-medium text-slate-400">Initialize</p>
                <pre className="overflow-x-auto text-sm leading-7 text-slate-300">
                  <code>{`import { init } from "@errornest/js";

init({ dsn: "https://pub...", environment: "prod" });`}</code>
                </pre>
              </div>
            </div>
          </div>
        </section>

        <section id="assistant" className="mx-auto max-w-7xl px-6 py-20 lg:px-8">
          <div className="reveal grid gap-10 rounded-[2rem] border border-white/10 bg-slate-950/70 p-8 shadow-[0_20px_70px_rgba(2,6,23,0.24)] lg:grid-cols-[0.95fr_1.05fr] lg:p-12">
            <div>
              <p className="mb-3 text-sm font-semibold uppercase tracking-[0.35em] text-primary">AI assistant showcase</p>
              <h2 className="mb-4 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                Ask the assistant the questions your team is already asking.
              </h2>
              <p className="max-w-xl text-lg leading-8 text-slate-300">
                Investigate regressions, trace root cause, and surface meaningful next steps from one calm interface.
              </p>
            </div>

            <div className="rounded-[1.5rem] border border-white/10 bg-slate-900/80 p-6">
              <div className="mb-4 flex items-center gap-2 rounded-full bg-white/5 px-3 py-2 text-sm text-slate-400">
                <MessageSquareText className="h-4 w-4 text-primary" />
                Ask ErrorNest
              </div>
              <div className="space-y-3">
                {aiHighlights.map((item) => {
                  const Icon = item.icon;
                  return (
                    <div key={item.title} data-reveal-item className="rounded-[1rem] border border-white/10 bg-white/5 p-4">
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
          <div className="reveal grid gap-8 rounded-[2rem] border border-white/10 bg-slate-950/70 p-8 shadow-[0_20px_70px_rgba(2,6,23,0.24)] lg:grid-cols-[0.9fr_1.1fr] lg:p-12">
            <div>
              <p className="mb-3 text-sm font-semibold uppercase tracking-[0.35em] text-primary">SDK showcase</p>
              <h2 className="mb-4 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                Ready for every stack, from edge to enterprise.
              </h2>
              <p className="text-lg leading-8 text-slate-300">
                Install once, instrument everywhere, and keep your release story crisp from prototype to production.
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
          <div className="reveal grid gap-8 rounded-[2rem] border border-white/10 bg-white/5 p-8 shadow-[0_18px_60px_rgba(2,6,23,0.24)] lg:grid-cols-[1fr_0.9fr] lg:p-12">
            <div>
              <p className="mb-3 text-sm font-semibold uppercase tracking-[0.35em] text-primary">Performance metrics</p>
              <h2 className="mb-4 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                Confidence metrics your team can trust.
              </h2>
              <p className="text-lg leading-8 text-slate-300">
                Bring calm to launch days with clear health indicators, trend lines, and live context for every incident.
              </p>
            </div>

            <div className="rounded-[1.5rem] border border-white/10 bg-slate-950/70 p-6">
              <div className="mb-5 flex items-center gap-2 text-sm text-slate-400">
                <BarChart3 className="h-4 w-4 text-primary" />
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

        <section className="mx-auto max-w-7xl px-6 py-20 lg:px-8">
          <div className="reveal rounded-[2rem] border border-white/10 bg-slate-950/70 p-8 shadow-[0_20px_70px_rgba(2,6,23,0.24)] lg:p-12">
            <div className="mb-10 max-w-3xl">
              <p className="mb-3 text-sm font-semibold uppercase tracking-[0.35em] text-primary">Testimonials</p>
              <h2 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                Trusted by the teams who can’t afford noise.
              </h2>
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
              {testimonials.map((testimonial) => (
                <blockquote key={testimonial.author} data-reveal-item className="rounded-[1.25rem] border border-white/10 bg-white/5 p-6">
                  <p className="mb-6 text-sm leading-7 text-slate-300">“{testimonial.quote}”</p>
                  <footer>
                    <p className="font-semibold text-white">{testimonial.author}</p>
                    <p className="text-sm text-slate-400">{testimonial.role}</p>
                  </footer>
                </blockquote>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-6 py-20 lg:px-8">
          <div className="reveal rounded-[2rem] border border-white/10 bg-gradient-to-br from-primary/10 to-violet-500/10 p-8 shadow-[0_20px_70px_rgba(2,6,23,0.24)] lg:p-12">
            <div className="mb-10 max-w-2xl">
              <p className="mb-3 text-sm font-semibold uppercase tracking-[0.35em] text-primary">Integrations</p>
              <h2 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                Plug into the tools your team already depends on.
              </h2>
            </div>

            <div className="flex flex-wrap gap-3">
              {integrations.map((integration) => (
                <span key={integration} data-reveal-item className="rounded-full border border-white/10 bg-slate-950/70 px-4 py-2 text-sm font-medium text-slate-300">
                  {integration}
                </span>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-6 py-20 lg:px-8">
          <div className="reveal rounded-[2rem] border border-white/10 bg-slate-950/70 p-8 shadow-[0_20px_70px_rgba(2,6,23,0.24)] lg:p-12">
            <div className="mb-8 max-w-2xl">
              <p className="mb-3 text-sm font-semibold uppercase tracking-[0.35em] text-primary">FAQ</p>
              <h2 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                Questions teams ask before they switch.
              </h2>
            </div>

            <div className="space-y-4">
              {faqItems.map((item) => (
                <details key={item.question} data-reveal-item className="rounded-[1rem] border border-white/10 bg-white/5 p-4 text-slate-300">
                  <summary className="cursor-pointer list-none text-sm font-semibold text-white">
                    {item.question}
                  </summary>
                  <p className="mt-3 text-sm leading-7 text-slate-400">{item.answer}</p>
                </details>
              ))}
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
                className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
              >
                Get started free
                <ChevronRight className="h-4 w-4" />
              </a>
              <a
                href="#docs"
                data-hover-button
                className="inline-flex items-center justify-center rounded-full border border-white/15 bg-white/5 px-5 py-3 text-sm font-semibold text-slate-200 transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
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
