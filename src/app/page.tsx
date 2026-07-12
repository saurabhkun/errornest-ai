import React from "react";

export default function Home() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans flex flex-col selection:bg-zinc-800 selection:text-white">
      {/* Top Navbar */}
      <header className="border-b border-zinc-900 bg-zinc-950/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-red-600 flex items-center justify-center font-mono font-bold text-white text-lg tracking-tighter">
              EN
            </div>
            <span className="font-semibold text-lg tracking-tight text-white">ErrorNest</span>
          </div>

          <nav className="hidden md:flex items-center gap-8 text-sm text-zinc-400 font-medium">
            <a href="#features" className="hover:text-zinc-200 transition-colors">
              Features
            </a>
            <a href="#sdk" className="hover:text-zinc-200 transition-colors">
              SDK Setup
            </a>
            <a href="#faq" className="hover:text-zinc-200 transition-colors">
              FAQ
            </a>
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-zinc-200 transition-colors"
            >
              GitHub
            </a>
          </nav>

          <div className="flex items-center gap-4">
            <a
              id="login-btn"
              href="/login"
              className="text-sm font-medium text-zinc-400 hover:text-zinc-200 transition-colors px-3 py-1.5"
            >
              Sign In
            </a>
            <a
              id="signup-btn"
              href="/signup"
              className="text-sm font-medium bg-zinc-100 text-zinc-950 hover:bg-zinc-200 transition-colors px-4 py-2 rounded-md shadow-sm"
            >
              Get Started
            </a>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative overflow-hidden py-24 sm:py-32 border-b border-zinc-900">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-red-950/20 via-transparent to-transparent pointer-events-none" />
          <div className="max-w-5xl mx-auto px-6 text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-red-500/20 bg-red-500/5 text-red-400 text-xs font-medium mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
              Now in pre-development (M0 scaffolding complete)
            </div>
            <h1 className="text-4xl sm:text-6xl font-bold tracking-tight text-white mb-8 max-w-4xl mx-auto leading-tight">
              Calm during failure.
              <br />
              <span className="text-zinc-400">AI-powered error monitoring.</span>
            </h1>
            <p className="text-lg sm:text-xl text-zinc-400 max-w-2xl mx-auto mb-10 leading-relaxed">
              ErrorNest captures, groups, and explains application exceptions in real time with
              context-aware AI. Compress detection and comprehension time in under 10 minutes.
            </p>
            <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
              <a
                id="hero-cta-btn"
                href="/signup"
                className="w-full sm:w-auto text-center px-6 py-3 rounded-md bg-red-600 hover:bg-red-500 text-white font-medium shadow-lg hover:shadow-red-600/10 transition-all"
              >
                Start Monitoring Free
              </a>
              <a
                id="hero-docs-btn"
                href="#sdk"
                className="w-full sm:w-auto text-center px-6 py-3 rounded-md border border-zinc-800 hover:bg-zinc-900 text-zinc-300 font-medium transition-colors"
              >
                Read SDK Docs
              </a>
            </div>
          </div>
        </section>

        {/* Feature Cards Grid */}
        <section id="features" className="py-20 max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-white mb-4">
              Built for modern developer workflows
            </h2>
            <p className="text-zinc-400 max-w-xl mx-auto text-sm sm:text-base">
              A light-weight stack trace collector paired with custom fingerprinting and generative
              AI explainability.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Grouping Card */}
            <div className="bg-zinc-900/40 border border-zinc-900 p-8 rounded-xl hover:border-zinc-800 transition-colors">
              <div className="w-10 h-10 rounded-lg bg-zinc-800 flex items-center justify-center mb-6 text-zinc-100">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-white mb-3">Deterministic Grouping</h3>
              <p className="text-zinc-400 text-sm leading-relaxed">
                Repeated occurrences of the same bug are combined into a single, clean issue. Our
                normalization engine filters out volatile identifiers like line numbers or query
                strings from traces.
              </p>
            </div>

            {/* AI Explanation Card */}
            <div className="bg-zinc-900/40 border border-zinc-900 p-8 rounded-xl hover:border-zinc-800 transition-colors">
              <div className="w-10 h-10 rounded-lg bg-zinc-800 flex items-center justify-center mb-6 text-zinc-100">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-white mb-3">AI Context Explanations</h3>
              <p className="text-zinc-400 text-sm leading-relaxed">
                Receive plain-language summaries detailing why an exception occurred and which
                component is implicated, generated server-side using secure Gemini integrations.
              </p>
            </div>

            {/* Alerting Card */}
            <div className="bg-zinc-900/40 border border-zinc-900 p-8 rounded-xl hover:border-zinc-800 transition-colors">
              <div className="w-10 h-10 rounded-lg bg-zinc-800 flex items-center justify-center mb-6 text-zinc-100">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-white mb-3">Proactive Alerts</h3>
              <p className="text-zinc-400 text-sm leading-relaxed">
                Get notified via email and in-app feeds when new issues are discovered, spikes
                occur, or resolved issues regress. Configure cooldown windows to mute noise.
              </p>
            </div>
          </div>
        </section>

        {/* SDK & Installation Flow */}
        <section id="sdk" className="py-20 border-t border-zinc-900 bg-zinc-950">
          <div className="max-w-4xl mx-auto px-6">
            <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-white mb-4 text-center">
              Install our SDK in minutes
            </h2>
            <p className="text-zinc-400 text-center mb-12 text-sm sm:text-base">
              Add the lightweight Node/JS SDK to your application to start gathering error data.
            </p>

            <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow-2xl">
              <div className="flex items-center justify-between px-4 py-3 bg-zinc-950 border-b border-zinc-800">
                <div className="flex gap-2">
                  <div className="w-3 h-3 rounded-full bg-zinc-800" />
                  <div className="w-3 h-3 rounded-full bg-zinc-800" />
                  <div className="w-3 h-3 rounded-full bg-zinc-800" />
                </div>
                <span className="text-xs text-zinc-500 font-mono">setup.ts</span>
              </div>
              <div className="p-6 overflow-x-auto">
                <pre className="font-mono text-sm text-zinc-300 leading-relaxed">
                  <code>{`import * as ErrorNest from "@errornest/js";

ErrorNest.init({
  dsn: "https://pub_key@ingest.errornest.com/v1/projects/1",
  environment: "production",
  release: "v1.0.0"
});

// Uncaught exceptions and unhandled promise rejections are automatically captured.`}</code>
                </pre>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-900 bg-zinc-950 py-12">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6 text-sm text-zinc-500">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded bg-zinc-800 flex items-center justify-center font-mono font-bold text-white text-xs">
              EN
            </div>
            <span>© 2026 ErrorNest. All rights reserved.</span>
          </div>
          <div className="flex items-center gap-6">
            <a href="#features" className="hover:text-zinc-300 transition-colors">
              Features
            </a>
            <a href="#sdk" className="hover:text-zinc-300 transition-colors">
              Docs
            </a>
            <a href="/api/health" className="hover:text-zinc-300 transition-colors">
              Health API
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
