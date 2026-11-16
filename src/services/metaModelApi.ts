/** Server-only client for Meta Model API Chat Completions. */
export type MetaChatMessage = { role: "system" | "user" | "assistant"; content: string };
export type MetaJsonSchemaResponseFormat = {
  type: "json_schema";
  json_schema: { name: string; strict?: boolean; schema: Record<string, unknown> };
};
export interface MetaChatCompletionOptions {
  apiKey: string;
  messages: MetaChatMessage[];
  model?: string;
  temperature?: number;
  responseFormat?: MetaJsonSchemaResponseFormat;
  timeoutMs?: number;
}

export async function createMetaChatCompletion(options: MetaChatCompletionOptions): Promise<string> {
  const apiKey = options.apiKey.trim();
  if (!apiKey) throw new Error("Meta Model API key is not configured.");
  const model = options.model?.trim() || "muse-spark-1.3";
  const timeoutMs = options.timeoutMs ?? 90_000;

  let response: Response;
  try {
    response = await fetch("https://api.meta.ai/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        messages: options.messages,
        ...(options.temperature !== undefined ? { temperature: options.temperature } : {}),
        ...(options.responseFormat ? { response_format: options.responseFormat } : {})
      }),
      signal: AbortSignal.timeout(timeoutMs)
    });
  } catch (error: any) {
    const reason = error?.name === "TimeoutError" ? `request timed out after ${timeoutMs}ms` : error?.message || "network error";
    throw new Error(`Meta Model API request failed: ${reason}`);
  }

  const responseText = await response.text();
  let payload: any;
  try { payload = responseText ? JSON.parse(responseText) : {}; } catch { payload = {}; }
  if (!response.ok) {
    const providerMessage = typeof payload?.error?.message === "string" ? payload.error.message : `HTTP ${response.status}`;
    throw new Error(`Meta Model API request failed (${response.status}): ${providerMessage}`);
  }

  const content = payload?.choices?.[0]?.message?.content;
  const text = typeof content === "string"
    ? content
    : Array.isArray(content)
      ? content.map((part: any) => typeof part?.text === "string" ? part.text : "").join("")
      : "";
  if (!text.trim()) throw new Error("Meta Model API returned an empty assistant response.");
  return text;
}