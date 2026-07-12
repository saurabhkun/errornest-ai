/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import * as ErrorNestSDK from "@errornest/sdk";

describe("ErrorNest Client SDK", () => {
  let fetchMock: any;

  beforeEach(() => {
    fetchMock = vi.fn().mockImplementation(() =>
      Promise.resolve({
        ok: true,
        status: 202,
        json: () => Promise.resolve({ data: { eventId: "test-event-id", status: "accepted" } }),
      })
    );
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("should initialize options correctly and support manual exception/message captures", async () => {
    ErrorNestSDK.init({
      apiKey: "en_live_testapikey12345678",
      endpoint: "http://localhost:3000/api/v1/ingest/events",
      environment: "staging",
      release: "v1.2.3",
      tags: { service: "auth" },
    });

    ErrorNestSDK.captureMessage("Test log message", {
      level: "info",
      tags: { source: "test_runner" },
      user: { id: "user_99" },
    });

    await ErrorNestSDK.flush();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, requestInit] = fetchMock.mock.calls[0];

    expect(url).toBe("http://localhost:3000/api/v1/ingest/events");
    expect(requestInit.method).toBe("POST");
    expect(requestInit.headers["Authorization"]).toBe("Bearer en_live_testapikey12345678");

    const payload = JSON.parse(requestInit.body);
    expect(payload.message).toBe("Test log message");
    expect(payload.errorType).toBe("Message");
    expect(payload.level).toBe("info");
    expect(payload.environment).toBe("staging");
    expect(payload.release).toBe("v1.2.3");
    expect(payload.tags.service).toBe("auth");
    expect(payload.tags.source).toBe("test_runner");
    expect(payload.user.id).toBe("user_99");
  });

  it("should capture unhandled exceptions with full details", async () => {
    ErrorNestSDK.init({
      apiKey: "en_live_testapikey12345678",
      endpoint: "http://localhost:3000/api/v1/ingest/events",
    });

    const testError = new TypeError("Cannot read properties of null");
    testError.stack =
      "TypeError: Cannot read properties of null\n    at Object.test (test.ts:10:15)";

    ErrorNestSDK.captureException(testError, {
      level: "fatal",
      tags: { scope: "db" },
    });

    await ErrorNestSDK.flush();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, requestInit] = fetchMock.mock.calls[0];
    const payload = JSON.parse(requestInit.body);

    expect(payload.message).toBe("Cannot read properties of null");
    expect(payload.errorType).toBe("TypeError");
    expect(payload.level).toBe("fatal");
    expect(payload.stackTrace).toContain("test.ts:10:15");
    expect(payload.tags.scope).toBe("db");
  });

  it("should trap fetch errors when captureFetchErrors is enabled", async () => {
    ErrorNestSDK.init({
      apiKey: "en_live_testapikey12345678",
      endpoint: "http://localhost:3000/api/v1/ingest/events",
    });

    ErrorNestSDK.captureFetchErrors();

    // Mock fetch to return a 500 error for a third-party resource
    fetchMock.mockImplementationOnce(() =>
      Promise.resolve({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
      })
    );

    // Call fetch - since it's patched, it should trigger captureMessage for the failure
    await globalThis.fetch("https://some-api.com/users").catch(() => {});

    await ErrorNestSDK.flush();

    // The fetch mock was called twice: once for the actual mocked request, once by the SDK to report the error
    expect(fetchMock).toHaveBeenCalledTimes(2);

    const reportCall = fetchMock.mock.calls[1];
    const payload = JSON.parse(reportCall[1].body);
    expect(payload.message).toContain(
      "Fetch failed: 500 Internal Server Error for https://some-api.com/users"
    );
    expect(payload.level).toBe("error");
    expect(payload.tags.type).toBe("fetch_error");
  });
});
