import { GoogleGenerativeAI } from "@google/generative-ai";

export interface AiProviderResult {
  content: string;
  model: string;
}

export interface AiProviderError {
  code: "PROVIDER_UNAVAILABLE" | "RATE_LIMITED" | "CONTEXT_TOO_LARGE" | "UNKNOWN";
  message: string;
}

export type AiProviderResponse =
  | { ok: true; data: AiProviderResult }
  | { ok: false; error: AiProviderError };

const MODEL_NAME = "gemini-2.0-flash";
const MAX_OUTPUT_TOKENS = 1024;

function buildExplainPrompt(params: {
  errorType: string;
  message: string;
  stackTrace: string;
  truncated: boolean;
}): string {
  const truncationNote = params.truncated
    ? "\n\n⚠️ Note: The stack trace was truncated because it exceeded the context limit.\n"
    : "";

  return `You are a senior software engineer performing a code-review triage.
Given the following error details, provide a concise structured explanation:

**Error Type:** ${params.errorType}
**Error Message:** ${params.message}
**Stack Trace:**
\`\`\`
${params.stackTrace}
\`\`\`
${truncationNote}

Respond in this exact structure (Markdown):
## Likely Root Cause
<1-3 sentences>

## Affected Layer
<Which part of the application is implicated, e.g. "Data-fetching layer", "UI rendering", "Database query">

## Severity & Impact
<Brief assessment>

## Suggested Investigation Steps
<Numbered list of 2-4 concrete debugging steps>

Keep the response factual and grounded in the provided stack trace. If the trace is insufficient to determine the root cause, say so explicitly.`;
}

function buildSuggestFixPrompt(params: {
  errorType: string;
  message: string;
  stackTrace: string;
  truncated: boolean;
}): string {
  const truncationNote = params.truncated
    ? "\n\n⚠️ Note: The stack trace was truncated because it exceeded the context limit.\n"
    : "";

  return `You are a senior software engineer providing a code fix suggestion.
Given the following error, propose a concrete, reviewable fix.

**Error Type:** ${params.errorType}
**Error Message:** ${params.message}
**Stack Trace:**
\`\`\`
${params.stackTrace}
\`\`\`
${truncationNote}

⚠️ IMPORTANT: This suggestion is NOT automatically applied. It requires human review before use.

Respond in this exact structure (Markdown):
## Fix Summary
<1-2 sentences describing the proposed change>

## Proposed Code Change
\`\`\`<language>
// Suggested fix — review before applying
<code diff or annotated snippet>
\`\`\`

## Rationale
<Why this fix addresses the root cause>

## Clarifying Questions (if root cause is ambiguous)
<List any questions, or "None — root cause is clear from the trace">

If the root cause cannot be determined from the available context, say so explicitly and provide only investigation steps instead of a speculative fix.`;
}

export async function callGemini(params: {
  type: "EXPLANATION" | "FIX_SUGGESTION";
  errorType: string;
  message: string;
  stackTrace: string;
  truncated: boolean;
}): Promise<AiProviderResponse> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return {
      ok: false,
      error: {
        code: "PROVIDER_UNAVAILABLE",
        message: "AI provider is not configured. Set GEMINI_API_KEY to enable this feature.",
      },
    };
  }

  const prompt =
    params.type === "EXPLANATION"
      ? buildExplainPrompt(params)
      : buildSuggestFixPrompt(params);

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: MODEL_NAME,
      generationConfig: {
        maxOutputTokens: MAX_OUTPUT_TOKENS,
        temperature: 0.3,
      },
    });

    const result = await model.generateContent(prompt);
    const content = result.response.text().trim();

    if (!content) {
      return {
        ok: false,
        error: { code: "UNKNOWN", message: "AI provider returned an empty response." },
      };
    }

    return { ok: true, data: { content, model: MODEL_NAME } };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown AI provider error";

    // Surface quota/rate-limit errors distinctly
    if (message.toLowerCase().includes("quota") || message.toLowerCase().includes("429")) {
      return {
        ok: false,
        error: { code: "RATE_LIMITED", message: "AI provider rate limit reached. Try again later." },
      };
    }

    return {
      ok: false,
      error: { code: "PROVIDER_UNAVAILABLE", message },
    };
  }
}
