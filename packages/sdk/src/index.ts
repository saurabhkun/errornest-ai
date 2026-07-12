/* eslint-disable @typescript-eslint/no-explicit-any */
export interface SdkOptions {
  apiKey: string;
  endpoint?: string;
  environment?: string;
  release?: string;
  tags?: Record<string, string>;
  user?: Record<string, any>;
}

export interface CaptureOptions {
  level?: "fatal" | "error" | "warning" | "info";
  tags?: Record<string, string>;
  user?: Record<string, any>;
  context?: any;
}

let sdkOptions: SdkOptions | null = null;
const pendingPromises: Set<Promise<any>> = new Set();
let isListeningToExceptions = false;
let isListeningToConsole = false;
let isListeningToFetch = false;
const SDK_VERSION = "1.0.0";

// Generates a session ID unique to this runtime run
const sessionId = Math.random().toString(36).substring(2, 15);

function detectEnvironment(): string {
  if (typeof process !== "undefined" && process.env && process.env.NODE_ENV) {
    return process.env.NODE_ENV;
  }
  if (typeof window !== "undefined" && window.location) {
    const host = window.location.hostname;
    if (host === "localhost" || host === "127.0.0.1") {
      return "development";
    }
  }
  return "production";
}

export function init(options: SdkOptions) {
  sdkOptions = {
    endpoint: "http://localhost:3000/api/v1/ingest/events",
    environment: detectEnvironment(),
    ...options,
  };

  // Wire up global exception listeners automatically on init
  captureUnhandledRejections();
}

export function captureException(error: unknown, options?: CaptureOptions) {
  if (!sdkOptions) {
    console.warn("ErrorNest SDK: captureException called before init().");
    return;
  }

  const err = error instanceof Error ? error : new Error(typeof error === "string" ? error : String(error));
  const payload = {
    message: err.message || "Unknown error",
    errorType: err.name || "Error",
    level: options?.level || "error",
    stackTrace: err.stack || "",
    environment: sdkOptions.environment,
    release: sdkOptions.release,
    clientSentAt: new Date().toISOString(),
    tags: {
      ...sdkOptions.tags,
      ...options?.tags,
      sdk_version: SDK_VERSION,
      session_id: sessionId,
      platform: typeof window !== "undefined" ? "browser" : "node",
    },
    user: {
      ...sdkOptions.user,
      ...options?.user,
    },
    sourceContext: options?.context,
  };

  sendEvent(payload);
}

export function captureMessage(message: string, options?: CaptureOptions & { errorType?: string }) {
  if (!sdkOptions) {
    console.warn("ErrorNest SDK: captureMessage called before init().");
    return;
  }

  const payload = {
    message,
    errorType: options?.errorType || "Message",
    level: options?.level || "info",
    environment: sdkOptions.environment,
    release: sdkOptions.release,
    clientSentAt: new Date().toISOString(),
    tags: {
      ...sdkOptions.tags,
      ...options?.tags,
      sdk_version: SDK_VERSION,
      session_id: sessionId,
      platform: typeof window !== "undefined" ? "browser" : "node",
    },
    user: {
      ...sdkOptions.user,
      ...options?.user,
    },
    sourceContext: options?.context,
  };

  sendEvent(payload);
}

export function captureUnhandledRejection() {
  captureUnhandledRejections();
}

export function captureUnhandledRejections() {
  if (isListeningToExceptions) return;
  isListeningToExceptions = true;

  if (typeof window !== "undefined") {
    window.addEventListener("error", (event) => {
      captureException(event.error || new Error(event.message));
    });
    window.addEventListener("unhandledrejection", (event) => {
      captureException(event.reason || new Error(String(event.reason)));
    });
  } else if (typeof process !== "undefined" && typeof process.on === "function") {
    process.on("uncaughtException", (error) => {
      captureException(error);
    });
    process.on("unhandledRejection", (reason) => {
      captureException(reason instanceof Error ? reason : new Error(String(reason)));
    });
  }
}

export function captureConsoleError() {
  if (isListeningToConsole) return;
  isListeningToConsole = true;

  const originalConsoleError = console.error;
  console.error = function (...args: any[]) {
    // Invoke original console error
    originalConsoleError.apply(console, args);

    if (!sdkOptions) return;

    // Convert args to message
    const msg = args
      .map((arg) => (arg instanceof Error ? arg.message : typeof arg === "object" ? JSON.stringify(arg) : String(arg)))
      .join(" ");

    // Check if any arg is an Error object to capture its stack trace
    const errorArg = args.find((arg) => arg instanceof Error);

    if (errorArg) {
      captureException(errorArg, { level: "error", tags: { source: "console.error" } });
    } else {
      captureMessage(msg, { level: "error", errorType: "ConsoleError", tags: { source: "console.error" } });
    }
  };
}

export function captureFetchErrors() {
  if (isListeningToFetch) return;
  isListeningToFetch = true;

  const originalFetch = globalThis.fetch;
  if (typeof originalFetch !== "function") return;

  globalThis.fetch = async function (...args) {
    try {
      const response = await originalFetch.apply(this, args);
      if (!response.ok) {
        const url = typeof args[0] === "string" ? args[0] : (args[0] as any)?.url || "";
        // Prevent recursive loop reporting ingestion api failure
        if (sdkOptions?.endpoint && url.includes(sdkOptions.endpoint)) {
          return response;
        }

        captureMessage(`Fetch failed: ${response.status} ${response.statusText} for ${url}`, {
          level: "error",
          tags: {
            status: String(response.status),
            url,
            type: "fetch_error",
          },
        });
      }
      return response;
    } catch (error) {
      const url = typeof args[0] === "string" ? args[0] : (args[0] as any)?.url || "";
      if (sdkOptions?.endpoint && url.includes(sdkOptions.endpoint)) {
        throw error;
      }

      captureException(error instanceof Error ? error : new Error(String(error)), {
        tags: {
          url,
          type: "fetch_network_error",
        },
      });
      throw error;
    }
  };
}

export function flush(): Promise<void> {
  const promises = Array.from(pendingPromises);
  return Promise.all(promises).then(() => {
    pendingPromises.clear();
  });
}

function sendEvent(payload: Record<string, any>) {
  if (!sdkOptions?.apiKey || !sdkOptions.endpoint) return;

  const requestPromise = fetch(sdkOptions.endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${sdkOptions.apiKey}`,
    },
    body: JSON.stringify(payload),
  })
    .then((res) => {
      if (!res.ok) {
        // Silently capture/log ingestion endpoint rejection
        console.warn(`ErrorNest SDK Ingestion failed: ${res.status} ${res.statusText}`);
      }
      return res;
    })
    .catch((err) => {
      console.warn("ErrorNest SDK Fetch exception:", err);
    });

  pendingPromises.add(requestPromise);
  requestPromise.finally(() => {
    pendingPromises.delete(requestPromise);
  });
}
