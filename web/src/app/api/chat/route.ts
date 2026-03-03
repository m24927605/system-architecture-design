import { streamText } from "ai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenAI } from "@ai-sdk/openai";
import { SYSTEM_PROMPT } from "@/lib/llm/system-prompt";

export async function POST(req: Request) {
  const { messages } = await req.json();

  const provider = process.env.LLM_PROVIDER || "anthropic";

  let model;
  if (provider === "openai") {
    const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY });
    model = openai("gpt-4o");
  } else {
    const anthropic = createAnthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
    model = anthropic("claude-sonnet-4-20250514");
  }

  const result = streamText({
    model,
    system: SYSTEM_PROMPT,
    messages,
  });

  return result.toUIMessageStreamResponse();
}
