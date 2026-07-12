"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  ChevronRight,
  Copy,
  Check,
  Terminal,
  ExternalLink,
  ArrowLeft,
  BookOpen,
} from "lucide-react";

interface SdkSetupClientProps {
  org: {
    slug: string;
  };
  project: {
    id: string;
    name: string;
    slug: string;
    platform: string;
  };
  keyPlaceholder: string;
}

export function SdkSetupClient({ org, project, keyPlaceholder }: SdkSetupClientProps) {
  // Let the user switch guides if they want, but default to the project's platform
  const [selectedPlatform, setSelectedPlatform] = useState(
    ["react", "node", "python", "go"].includes(project.platform) ? project.platform : "react"
  );

  const [copiedText, setCopiedText] = useState<string | null>(null);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(id);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const guides: Record<
    string,
    {
      installCmd: string;
      initCode: string;
      exampleCode: string;
    }
  > = {
    react: {
      installCmd: `npm install @errornest/react`,
      initCode: `import React from 'react';
import ReactDOM from 'react-dom/client';
import { ErrorNestProvider } from '@errornest/react';
import App from './App';

const root = ReactDOM.createRoot(document.getElementById('root')!);

root.render(
  <React.StrictMode>
    <ErrorNestProvider
      config={{
        projectId: "${project.id}",
        apiKey: "${keyPlaceholder}",
        environment: "production",
      }}
    >
      <App />
    </ErrorNestProvider>
  </React.StrictMode>
);`,
      exampleCode: `import React from 'react';
import { useErrorNest } from '@errornest/react';

export function BuggyComponent() {
  const errornest = useErrorNest();

  const triggerError = () => {
    try {
      throw new Error("Simulated React client runtime error!");
    } catch (err) {
      errornest.captureException(err, {
        tags: { feature: "auth-checkout" },
        user: { id: "user_9876", email: "client@example.com" }
      });
    }
  };

  return (
    <button onClick={triggerError}>
      Simulate Client Error
    </button>
  );
}`,
    },
    node: {
      installCmd: `npm install @errornest/node`,
      initCode: `const ErrorNest = require('@errornest/node');

ErrorNest.init({
  projectId: "${project.id}",
  apiKey: "${keyPlaceholder}",
  environment: "production",
});`,
      exampleCode: `const express = require('express');
const app = express();
const ErrorNest = require('@errornest/node');

app.get('/api/users', (req, res) => {
  try {
    // Intentionally call undefined function
    req.auth.getUserInfo();
  } catch (error) {
    ErrorNest.captureException(error, {
      tags: { route: "get_users" }
    });
    res.status(500).json({ error: "Internal error occurred" });
  }
});

// Express error handler fallback middleware
app.use(ErrorNest.expressHandler());

app.listen(3000);`,
    },
    python: {
      installCmd: `pip install errornest-python`,
      initCode: `import errornest

errornest.init(
    project_id="${project.id}",
    api_key="${keyPlaceholder}",
    environment="production"
)`,
      exampleCode: `try:
    # Trigger zero division error
    x = 1 / 0
except Exception as e:
    errornest.capture_exception(e, tags={"job": "daily_report"})`,
    },
    go: {
      installCmd: `go get github.com/errornest/errornest-go`,
      initCode: `package main

import "github.com/errornest/errornest-go"

func main() {
    errornest.Init(errornest.Config{
        ProjectID:   "${project.id}",
        APIKey:      "${keyPlaceholder}",
        Environment: "production",
    })
}`,
      exampleCode: `func ProcessTransaction(txID string) {
    defer errornest.Recover(map[string]string{
        "transactionId": txID,
    })

    // Intentionally panic
    panic("critical system transaction failure!")
}`,
    },
  };

  const activeGuide = guides[selectedPlatform] || guides.react;

  return (
    <div className="space-y-8">
      {/* Breadcrumb Navigation */}
      <div className="flex items-center gap-2 text-xs text-zinc-400">
        <Link href={`/app/${org.slug}/projects`} className="hover:text-zinc-200 transition-colors">
          Projects
        </Link>
        <ChevronRight className="h-3 w-3 text-zinc-600" />
        <Link
          href={`/app/${org.slug}/projects/${project.slug}`}
          className="hover:text-zinc-200 transition-colors"
        >
          {project.name}
        </Link>
        <ChevronRight className="h-3 w-3 text-zinc-600" />
        <span className="text-zinc-200 font-medium">SDK Integration</span>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <Link
              href={`/app/${org.slug}/projects/${project.slug}`}
              className="p-1 rounded hover:bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer shrink-0"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <h1 className="text-3xl font-bold tracking-tight text-white">SDK Setup Guide</h1>
          </div>
          <p className="text-sm text-zinc-400 mt-1 pl-8">
            Install and initialize the client library in your codebase.
          </p>
        </div>
      </div>

      {/* Selector Tabs */}
      <div className="flex border-b border-zinc-800 gap-6">
        {Object.keys(guides).map((plat) => (
          <button
            key={plat}
            onClick={() => setSelectedPlatform(plat)}
            className={`pb-3 text-sm font-semibold capitalize cursor-pointer border-b-2 transition-all ${
              selectedPlatform === plat
                ? "border-emerald-500 text-white"
                : "border-transparent text-zinc-500 hover:text-zinc-300"
            }`}
          >
            {plat === "nextjs" ? "Next.js" : plat === "nodejs" ? "NodeJS" : plat}
          </button>
        ))}
      </div>

      {/* Guide Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          {/* Step 1: Install */}
          <div className="border border-zinc-800 bg-zinc-900/30 rounded-xl p-6 space-y-4">
            <div className="flex items-center gap-3">
              <span className="h-6 w-6 rounded-full bg-zinc-800 border border-zinc-700 text-xs font-bold text-zinc-300 flex items-center justify-center">
                1
              </span>
              <h2 className="text-base font-bold text-white">Install the SDK package</h2>
            </div>

            <div className="relative">
              <pre className="bg-zinc-950 px-4 py-3 rounded-lg text-zinc-300 font-mono text-xs overflow-x-auto border border-zinc-800">
                <code>{activeGuide.installCmd}</code>
              </pre>
              <button
                onClick={() => handleCopy(activeGuide.installCmd, "install")}
                className="absolute right-3 top-2 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-300 p-1.5 rounded cursor-pointer transition-colors"
                title="Copy command"
              >
                {copiedText === "install" ? (
                  <Check className="h-3.5 w-3.5 text-emerald-500" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
              </button>
            </div>
          </div>

          {/* Step 2: Initialize */}
          <div className="border border-zinc-800 bg-zinc-900/30 rounded-xl p-6 space-y-4">
            <div className="flex items-center gap-3">
              <span className="h-6 w-6 rounded-full bg-zinc-800 border border-zinc-700 text-xs font-bold text-zinc-300 flex items-center justify-center">
                2
              </span>
              <h2 className="text-base font-bold text-white">
                Initialize inside your main entrypoint
              </h2>
            </div>
            <p className="text-xs text-zinc-400">
              Provide your project credentials. The SDK captures unhandled runtime crashes
              automatically.
            </p>

            <div className="relative">
              <pre className="bg-zinc-950 px-4 py-3 rounded-lg text-zinc-300 font-mono text-xs overflow-x-auto border border-zinc-800 max-h-96">
                <code>{activeGuide.initCode}</code>
              </pre>
              <button
                onClick={() => handleCopy(activeGuide.initCode, "init")}
                className="absolute right-3 top-2 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-300 p-1.5 rounded cursor-pointer transition-colors"
                title="Copy code"
              >
                {copiedText === "init" ? (
                  <Check className="h-3.5 w-3.5 text-emerald-500" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
              </button>
            </div>
          </div>

          {/* Step 3: Capture manual errors */}
          <div className="border border-zinc-800 bg-zinc-900/30 rounded-xl p-6 space-y-4">
            <div className="flex items-center gap-3">
              <span className="h-6 w-6 rounded-full bg-zinc-800 border border-zinc-700 text-xs font-bold text-zinc-300 flex items-center justify-center">
                3
              </span>
              <h2 className="text-base font-bold text-white">Capture manual exceptions or logs</h2>
            </div>
            <p className="text-xs text-zinc-400">
              You can enrich captured errors with contextual flags, custom tags, or key-value
              structures.
            </p>

            <div className="relative">
              <pre className="bg-zinc-950 px-4 py-3 rounded-lg text-zinc-300 font-mono text-xs overflow-x-auto border border-zinc-800 max-h-96">
                <code>{activeGuide.exampleCode}</code>
              </pre>
              <button
                onClick={() => handleCopy(activeGuide.exampleCode, "example")}
                className="absolute right-3 top-2 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-300 p-1.5 rounded cursor-pointer transition-colors"
                title="Copy code"
              >
                {copiedText === "example" ? (
                  <Check className="h-3.5 w-3.5 text-emerald-500" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Right Rail: Resources */}
        <div className="space-y-6">
          <div className="border border-zinc-800 bg-zinc-900/20 rounded-xl p-6 space-y-4">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-emerald-500" />
              <span>Developer Reference</span>
            </h2>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Find complete integration details, config structures, rate limits, and custom tags in
              the comprehensive platform documentation.
            </p>
            <div className="pt-2">
              <a
                href="https://docs.errornest.com"
                target="_blank"
                rel="noreferrer"
                className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 inline-flex items-center gap-1 hover:underline"
              >
                <span>Browse SDK Reference</span>
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>

          <div className="border border-zinc-800 bg-zinc-900/20 rounded-xl p-6 space-y-4">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Terminal className="h-4 w-4 text-emerald-500" />
              <span>Verify Ingestion</span>
            </h2>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Once initialized, send a mock error. If successful, events will begin populating your
              dashboard streams instantly.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
