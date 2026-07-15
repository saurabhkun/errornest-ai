"use client";

import React, { useState, useCallback } from "react";
import {
  Sparkles,
  Wrench,
  RefreshCw,
  ThumbsUp,
  ThumbsDown,
  Copy,
  Check,
  AlertTriangle,
  Info,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

interface AiResult {
  id: string;
  content: string;
  model: string;
  cached: boolean;
  truncated: boolean;
  type: "EXPLANATION" | "FIX_SUGGESTION";
}

interface AiPanelProps {
  issueId: string;
}

type PanelState = "idle" | "loading" | "success" | "error";

interface FeedbackState {
  [resultId: string]: "HELPFUL" | "NOT_HELPFUL" | "submitting" | "submitted";
}

function MarkdownContent({ content }: { content: string }) {
  // Simple markdown renderer for headings, code blocks, lists
  const lines = content.split("\n");
  const elements: React.ReactNode[] = [];
  let inCodeBlock = false;
  let codeLang = "";
  let codeLines: string[] = [];
  let keyCounter = 0;

  const flushCodeBlock = () => {
    if (codeLines.length > 0) {
      elements.push(
        <pre
          key={`code-${keyCounter++}`}
          className="bg-zinc-950 border border-zinc-800 rounded-lg p-4 overflow-x-auto text-xs text-emerald-300 font-mono mt-2 mb-3"
        >
          <code>{codeLines.join("\n")}</code>
        </pre>
      );
      codeLines = [];
      codeLang = "";
    }
  };

  for (const line of lines) {
    if (line.startsWith("```")) {
      if (inCodeBlock) {
        flushCodeBlock();
        inCodeBlock = false;
      } else {
        inCodeBlock = true;
        codeLang = line.slice(3).trim();
        void codeLang; // codeLang available for future syntax highlighting
      }
      continue;
    }

    if (inCodeBlock) {
      codeLines.push(line);
      continue;
    }

    if (line.startsWith("## ")) {
      elements.push(
        <h3
          key={`h3-${keyCounter++}`}
          className="text-sm font-bold text-white mt-4 mb-1.5 flex items-center gap-1.5"
        >
          <span className="w-1 h-4 bg-emerald-500 rounded-full shrink-0" />
          {line.slice(3)}
        </h3>
      );
    } else if (line.startsWith("### ")) {
      elements.push(
        <h4 key={`h4-${keyCounter++}`} className="text-xs font-bold text-zinc-300 mt-3 mb-1">
          {line.slice(4)}
        </h4>
      );
    } else if (/^\d+\. /.test(line)) {
      elements.push(
        <li key={`li-${keyCounter++}`} className="text-xs text-zinc-400 ml-4 mb-0.5 list-decimal">
          {line.replace(/^\d+\. /, "")}
        </li>
      );
    } else if (line.startsWith("- ")) {
      elements.push(
        <li key={`ul-${keyCounter++}`} className="text-xs text-zinc-400 ml-4 mb-0.5 list-disc">
          {line.slice(2)}
        </li>
      );
    } else if (line.trim() === "") {
      elements.push(<div key={`br-${keyCounter++}`} className="h-1" />);
    } else {
      // Inline bold
      const boldified = line.replace(/\*\*(.+?)\*\*/g, '<strong class="text-zinc-200">$1</strong>');
      elements.push(
        <p
          key={`p-${keyCounter++}`}
          className="text-xs text-zinc-400 leading-relaxed"
          dangerouslySetInnerHTML={{ __html: boldified }}
        />
      );
    }
  }

  if (inCodeBlock) flushCodeBlock();

  return <div className="space-y-0.5">{elements}</div>;
}

export function AiPanel({ issueId }: AiPanelProps) {
  const [explainState, setExplainState] = useState<PanelState>("idle");
  const [explainResult, setExplainResult] = useState<AiResult | null>(null);
  const [explainError, setExplainError] = useState<string | null>(null);

  const [fixState, setFixState] = useState<PanelState>("idle");
  const [fixResult, setFixResult] = useState<AiResult | null>(null);
  const [fixError, setFixError] = useState<string | null>(null);

  const [feedback, setFeedback] = useState<FeedbackState>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [showExplain, setShowExplain] = useState(true);
  const [showFix, setShowFix] = useState(false);

  const callAi = useCallback(
    async (type: "EXPLANATION" | "FIX_SUGGESTION", force = false) => {
      const endpoint =
        type === "EXPLANATION"
          ? `/api/v1/issues/${issueId}/ai/explain`
          : `/api/v1/issues/${issueId}/ai/suggest-fix`;

      const url = force ? `${endpoint}?force=true` : endpoint;

      if (type === "EXPLANATION") {
        setExplainState("loading");
        setExplainError(null);
      } else {
        setFixState("loading");
        setFixError(null);
      }

      try {
        const res = await fetch(url, { method: "POST" });
        const json = await res.json();

        if (!res.ok) {
          const msg = json.error?.message ?? "AI provider unavailable. Please try again later.";
          if (type === "EXPLANATION") {
            setExplainState("error");
            setExplainError(msg);
          } else {
            setFixState("error");
            setFixError(msg);
          }
          return;
        }

        if (type === "EXPLANATION") {
          setExplainResult(json.data);
          setExplainState("success");
        } else {
          setFixResult(json.data);
          setFixState("success");
        }
      } catch {
        const msg = "Network error. Could not reach AI service.";
        if (type === "EXPLANATION") {
          setExplainState("error");
          setExplainError(msg);
        } else {
          setFixState("error");
          setFixError(msg);
        }
      }
    },
    [issueId]
  );

  const submitFeedback = useCallback(async (resultId: string, value: "HELPFUL" | "NOT_HELPFUL") => {
    setFeedback((prev) => ({ ...prev, [resultId]: "submitting" }));
    try {
      const res = await fetch(`/api/v1/ai-results/${resultId}/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ feedback: value }),
      });
      if (res.ok) {
        setFeedback((prev) => ({ ...prev, [resultId]: value }));
      } else {
        setFeedback((prev) => {
          const next = { ...prev };
          delete next[resultId];
          return next;
        });
      }
    } catch {
      setFeedback((prev) => {
        const next = { ...prev };
        delete next[resultId];
        return next;
      });
    }
  }, []);

  const copyToClipboard = useCallback(async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // Clipboard API not available
    }
  }, []);

  const renderResult = (result: AiResult, state: PanelState, onRegenerate: () => void) => {
    const feedbackStatus = feedback[result.id];
    return (
      <div className="space-y-4">
        {/* AI badge + meta */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-purple-950/60 border border-purple-800/50 rounded-lg text-[11px] font-bold text-purple-300">
            <Sparkles className="h-3 w-3" />
            AI-Generated
          </span>
          {result.cached && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-zinc-900 border border-zinc-800 rounded text-[10px] text-zinc-400">
              Cached
            </span>
          )}
          {result.truncated && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-950/40 border border-amber-800/40 rounded text-[10px] text-amber-400">
              <AlertTriangle className="h-2.5 w-2.5" />
              Trace truncated
            </span>
          )}
          <span className="text-[10px] text-zinc-600 ml-auto font-mono">{result.model}</span>
        </div>

        {/* Disclaimer */}
        <div className="p-2.5 bg-purple-950/20 border border-purple-900/30 rounded-lg flex items-start gap-2 text-[11px] text-purple-300">
          <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
          <span>
            This content is AI-generated and may contain errors. Always verify before acting.{" "}
            {result.type === "FIX_SUGGESTION" && (
              <strong>Review before using — not automatically applied.</strong>
            )}
          </span>
        </div>

        {/* Content */}
        <div className="bg-zinc-950/60 border border-zinc-800/60 rounded-xl p-4">
          <MarkdownContent content={result.content} />
        </div>

        {/* Actions: Copy, Feedback, Regenerate */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <button
            type="button"
            onClick={() => copyToClipboard(result.content, result.id)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-lg text-zinc-400 hover:text-zinc-200 transition-all"
          >
            {copiedId === result.id ? (
              <>
                <Check className="h-3 w-3 text-emerald-400" /> Copied
              </>
            ) : (
              <>
                <Copy className="h-3 w-3" /> Copy
              </>
            )}
          </button>

          {feedbackStatus === "submitted" ||
          feedbackStatus === "HELPFUL" ||
          feedbackStatus === "NOT_HELPFUL" ? (
            <span className="text-[11px] text-zinc-500 px-2">Thanks for the feedback</span>
          ) : (
            <>
              <button
                type="button"
                disabled={feedbackStatus === "submitting"}
                onClick={() => submitFeedback(result.id, "HELPFUL")}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs bg-zinc-900 hover:bg-emerald-950/40 border border-zinc-800 hover:border-emerald-800/50 rounded-lg text-zinc-400 hover:text-emerald-400 transition-all"
                title="Helpful"
              >
                <ThumbsUp className="h-3 w-3" />
              </button>
              <button
                type="button"
                disabled={feedbackStatus === "submitting"}
                onClick={() => submitFeedback(result.id, "NOT_HELPFUL")}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs bg-zinc-900 hover:bg-rose-950/40 border border-zinc-800 hover:border-rose-800/50 rounded-lg text-zinc-400 hover:text-rose-400 transition-all"
                title="Not helpful"
              >
                <ThumbsDown className="h-3 w-3" />
              </button>
            </>
          )}

          <button
            type="button"
            onClick={onRegenerate}
            disabled={state === "loading"}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-lg text-zinc-500 hover:text-zinc-200 transition-all ml-auto"
          >
            <RefreshCw className={`h-3 w-3 ${state === "loading" ? "animate-spin" : ""}`} />
            Regenerate
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* ─── Explain Section ─── */}
      <div className="border border-zinc-800/80 rounded-xl bg-zinc-900/30 overflow-hidden">
        <button
          type="button"
          onClick={() => setShowExplain((v) => !v)}
          className="w-full flex items-center justify-between p-4 hover:bg-zinc-900/50 transition-all"
        >
          <div className="flex items-center gap-3">
            <div className="p-1.5 bg-purple-950/50 border border-purple-800/40 rounded-lg">
              <Sparkles className="h-4 w-4 text-purple-400" />
            </div>
            <div className="text-left">
              <div className="text-sm font-semibold text-white">Explain with AI</div>
              <div className="text-[11px] text-zinc-500">Plain-language root cause analysis</div>
            </div>
          </div>
          {showExplain ? (
            <ChevronUp className="h-4 w-4 text-zinc-500" />
          ) : (
            <ChevronDown className="h-4 w-4 text-zinc-500" />
          )}
        </button>

        {showExplain && (
          <div className="px-4 pb-4 border-t border-zinc-800/50">
            {explainState === "idle" && (
              <div className="pt-4 flex flex-col items-start gap-3">
                <p className="text-xs text-zinc-500">
                  AI will analyze the stack trace and error message to explain the likely root
                  cause.
                </p>
                <button
                  type="button"
                  onClick={() => callAi("EXPLANATION")}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-purple-700 hover:bg-purple-600 text-white text-sm font-medium rounded-lg transition-all"
                >
                  <Sparkles className="h-4 w-4" />
                  Explain this error
                </button>
              </div>
            )}

            {explainState === "loading" && (
              <div className="pt-6 pb-4 flex items-center gap-3 text-zinc-400 text-sm">
                <RefreshCw className="h-4 w-4 animate-spin text-purple-400" />
                Analyzing error with AI...
              </div>
            )}

            {explainState === "error" && (
              <div className="pt-4 space-y-3">
                <div className="p-3 bg-rose-950/30 border border-rose-900/50 rounded-lg flex items-start gap-2 text-sm text-rose-400">
                  <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                  {explainError}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setExplainState("idle");
                    setExplainError(null);
                  }}
                  className="text-xs text-zinc-500 hover:text-zinc-300 underline underline-offset-2"
                >
                  Try again
                </button>
              </div>
            )}

            {explainState === "success" && explainResult && (
              <div className="pt-4">
                {renderResult(explainResult, explainState, () => callAi("EXPLANATION", true))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ─── Suggest Fix Section ─── */}
      <div className="border border-zinc-800/80 rounded-xl bg-zinc-900/30 overflow-hidden">
        <button
          type="button"
          onClick={() => setShowFix((v) => !v)}
          className="w-full flex items-center justify-between p-4 hover:bg-zinc-900/50 transition-all"
        >
          <div className="flex items-center gap-3">
            <div className="p-1.5 bg-blue-950/50 border border-blue-800/40 rounded-lg">
              <Wrench className="h-4 w-4 text-blue-400" />
            </div>
            <div className="text-left">
              <div className="text-sm font-semibold text-white">Suggest a Fix</div>
              <div className="text-[11px] text-zinc-500">Reviewable code-level suggestion</div>
            </div>
          </div>
          {showFix ? (
            <ChevronUp className="h-4 w-4 text-zinc-500" />
          ) : (
            <ChevronDown className="h-4 w-4 text-zinc-500" />
          )}
        </button>

        {showFix && (
          <div className="px-4 pb-4 border-t border-zinc-800/50">
            {fixState === "idle" && (
              <div className="pt-4 flex flex-col items-start gap-3">
                <p className="text-xs text-zinc-500">
                  AI will suggest a concrete, reviewable fix based on the available stack trace and
                  context. This suggestion is{" "}
                  <strong className="text-zinc-400">not automatically applied</strong> — review
                  before using.
                </p>
                <button
                  type="button"
                  onClick={() => callAi("FIX_SUGGESTION")}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-700 hover:bg-blue-600 text-white text-sm font-medium rounded-lg transition-all"
                >
                  <Wrench className="h-4 w-4" />
                  Suggest a fix
                </button>
              </div>
            )}

            {fixState === "loading" && (
              <div className="pt-6 pb-4 flex items-center gap-3 text-zinc-400 text-sm">
                <RefreshCw className="h-4 w-4 animate-spin text-blue-400" />
                Generating fix suggestion...
              </div>
            )}

            {fixState === "error" && (
              <div className="pt-4 space-y-3">
                <div className="p-3 bg-rose-950/30 border border-rose-900/50 rounded-lg flex items-start gap-2 text-sm text-rose-400">
                  <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                  {fixError}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setFixState("idle");
                    setFixError(null);
                  }}
                  className="text-xs text-zinc-500 hover:text-zinc-300 underline underline-offset-2"
                >
                  Try again
                </button>
              </div>
            )}

            {fixState === "success" && fixResult && (
              <div className="pt-4">
                {renderResult(fixResult, fixState, () => callAi("FIX_SUGGESTION", true))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
