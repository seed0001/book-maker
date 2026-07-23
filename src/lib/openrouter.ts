const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export function defaultModel() {
  return process.env.OPENROUTER_MODEL ?? "anthropic/claude-sonnet-4.5";
}

async function callOpenRouter(body: Record<string, unknown>): Promise<Response> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("OPENROUTER_API_KEY is not set");

  const res = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": process.env.APP_URL ?? "http://localhost:3000",
      "X-Title": "Book Maker",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`OpenRouter error ${res.status}: ${text}`);
  }
  return res;
}

/** One-shot (non-streaming) completion. Returns the assistant's text. */
export async function complete(
  messages: ChatMessage[],
  opts?: { model?: string; maxTokens?: number }
): Promise<string> {
  const res = await callOpenRouter({
    model: opts?.model ?? defaultModel(),
    messages,
    max_tokens: opts?.maxTokens,
  });
  const json = await res.json();
  return json.choices?.[0]?.message?.content ?? "";
}

/**
 * Streaming completion. Returns a plain-text ReadableStream of the
 * assistant's reply. onFinish fires with the full text once complete.
 */
export async function streamChat(
  messages: ChatMessage[],
  opts?: { model?: string; onFinish?: (text: string) => Promise<void> | void }
): Promise<ReadableStream<Uint8Array>> {
  const res = await callOpenRouter({
    model: opts?.model ?? defaultModel(),
    messages,
    stream: true,
  });

  const reader = res.body!.getReader();
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  let buffer = "";
  let full = "";

  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      const { done, value } = await reader.read();
      if (done) {
        try {
          await opts?.onFinish?.(full);
        } finally {
          controller.close();
        }
        return;
      }
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith("data:")) continue;
        const data = trimmed.slice(5).trim();
        if (data === "[DONE]") continue;
        try {
          const delta = JSON.parse(data).choices?.[0]?.delta?.content;
          if (delta) {
            full += delta;
            controller.enqueue(encoder.encode(delta));
          }
        } catch {
          // ignore malformed keep-alive lines
        }
      }
    },
    cancel() {
      reader.cancel();
    },
  });
}
