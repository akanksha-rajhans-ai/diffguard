import type { JevSystemOneRequest } from "./build-request";
import {
  jevSystemOneResponseSchema,
  type JevSystemOneResponse,
} from "./response-schema";

const JEV_SYSTEM_ONE_URL = "https://api.typesafe.ai/v1/systemone";
const DEFAULT_TIMEOUT_MS = 10_000;

export type JevClientErrorCode =
  | "configuration"
  | "authentication"
  | "rate_limit"
  | "upstream"
  | "timeout"
  | "network"
  | "invalid_response";

export class JevClientError extends Error {
  constructor(
    public readonly code: JevClientErrorCode,
    message: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = "JevClientError";
  }
}

export type FetchLike = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Response>;

interface JevClientOptions {
  apiKey: string;
  timeoutMs?: number;
  fetchImpl?: FetchLike;
}

export async function requestJevAssessment(
  request: JevSystemOneRequest,
  options: JevClientOptions,
): Promise<JevSystemOneResponse> {
  const apiKey = options.apiKey.trim();

  if (!apiKey) {
    throw new JevClientError(
      "configuration",
      "The Jev API key is not configured.",
    );
  }

  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    options.timeoutMs ?? DEFAULT_TIMEOUT_MS,
  );

  const fetchImpl = options.fetchImpl ?? fetch;

  try {
    const response = await fetchImpl(JEV_SYSTEM_ONE_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(request),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw mapHttpError(response.status);
    }

    let payload: unknown;

    try {
      payload = await response.json();
    } catch {
      throw new JevClientError(
        "invalid_response",
        "Jev returned a response that was not valid JSON.",
      );
    }

    const parsed = jevSystemOneResponseSchema.safeParse(payload);

    if (!parsed.success) {
      throw new JevClientError(
        "invalid_response",
        "Jev returned an unexpected response structure.",
      );
    }

    return parsed.data;
  } catch (error) {
    if (error instanceof JevClientError) {
      throw error;
    }

    if (error instanceof Error && error.name === "AbortError") {
      throw new JevClientError(
        "timeout",
        "Jev did not respond before the request timed out.",
      );
    }

    throw new JevClientError(
      "network",
      "DiffGuard could not connect to Jev.",
    );
  } finally {
    clearTimeout(timeout);
  }
}

function mapHttpError(status: number): JevClientError {
  if (status === 401 || status === 403) {
    return new JevClientError(
      "authentication",
      "Jev rejected the configured API key.",
      status,
    );
  }

  if (status === 429) {
    return new JevClientError(
      "rate_limit",
      "Jev rate-limited the request.",
      status,
    );
  }

  return new JevClientError(
    "upstream",
    "Jev returned an unsuccessful response.",
    status,
  );
}