import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  callOpenAI,
  handleCors,
  errorResponse,
  successResponse,
  extractJSON,
  requireUser,
} from "../_shared/openai-helper.ts";

const FUNCTION_NAME = "generate-flashcard";

interface FlashcardData {
  front: string;
  back: string;
}

serve(async (req) => {
  console.log(`\n========== [${FUNCTION_NAME}] NEW REQUEST ==========`);
  console.log(`[${FUNCTION_NAME}] Method: ${req.method}`);
  console.log(`[${FUNCTION_NAME}] URL: ${req.url}`);

  const corsResponse = handleCors(req);
  if (corsResponse) {
    console.log(`[${FUNCTION_NAME}] Returning CORS response`);
    return corsResponse;
  }

  const authResponse = await requireUser(req, FUNCTION_NAME);
  if (authResponse) return authResponse;

  try {
    const rawBody = await req.text();
    console.log(`[${FUNCTION_NAME}] Raw request body:`, rawBody);

    const parsedBody = JSON.parse(rawBody);
    console.log(`[${FUNCTION_NAME}] Parsed body:`, JSON.stringify(parsedBody, null, 2));

    const { userPrompt, contentContext } = parsedBody;

    if (!userPrompt) {
      console.error(`[${FUNCTION_NAME}] ERROR: User prompt is missing`);
      return errorResponse("User prompt is required", 400);
    }

    console.log(`[${FUNCTION_NAME}] User prompt: "${userPrompt}"`);
    console.log(`[${FUNCTION_NAME}] Content context length: ${contentContext?.length || 0}`);

    // Extract first and last 200 characters from content for context
    let contextSnippet = "";
    if (contentContext && contentContext.length > 0) {
      const first200 = contentContext.slice(0, 200);
      const last200 = contentContext.length > 400
        ? contentContext.slice(-200)
        : "";
      contextSnippet = last200
        ? `${first200}...${last200}`
        : first200;
    }

    console.log(`[${FUNCTION_NAME}] Context snippet: "${contextSnippet.substring(0, 100)}..."`);
    console.log(`[${FUNCTION_NAME}] Context snippet length: ${contextSnippet.length}`);

    const systemPrompt = `You are a flashcard generator for educational content. Based on the user's request and the provided context, generate a single flashcard with:
- Front: A clear, concise question or prompt
- Back: The answer or explanation

Context from learning material:
---
${contextSnippet || "No context provided."}
---

User's request: "${userPrompt}"

Generate a flashcard that helps the user learn this concept. The front should be a question that tests understanding, and the back should be a clear, memorable answer.

Respond ONLY with valid JSON in this exact format:
{"front": "Your question here", "back": "Your answer here"}`;

    console.log(`[${FUNCTION_NAME}] ===== SYSTEM PROMPT =====`);
    console.log(`[${FUNCTION_NAME}] ${systemPrompt}`);
    console.log(`[${FUNCTION_NAME}] =========================`);

    const userMessage = `Create a flashcard about: ${userPrompt}`;
    console.log(`[${FUNCTION_NAME}] ===== USER MESSAGE =====`);
    console.log(`[${FUNCTION_NAME}] ${userMessage}`);
    console.log(`[${FUNCTION_NAME}] ========================`);

    console.log(`[${FUNCTION_NAME}] Calling OpenAI...`);
    const result = await callOpenAI({
      functionName: FUNCTION_NAME,
      mathFormatting: true,
      jsonMode: true,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
      model: "gpt-5-nano-2025-08-07",
    });

    console.log(`[${FUNCTION_NAME}] OpenAI result:`, JSON.stringify(result, null, 2));

    if (!result.success) {
      console.error(`[${FUNCTION_NAME}] OpenAI call failed:`, result.error);
      return errorResponse(result.error || "Failed to generate flashcard", result.statusCode);
    }

    if (!result.content) {
      console.error(`[${FUNCTION_NAME}] No content in OpenAI response`);
      return errorResponse("Invalid AI response - no content returned");
    }

    console.log(`[${FUNCTION_NAME}] AI response: ${result.content}`);

    // Parse JSON from response
    const flashcard = extractJSON<FlashcardData>(result.content);
    console.log(`[${FUNCTION_NAME}] Parsed flashcard:`, flashcard);

    if (!flashcard || !flashcard.front || !flashcard.back) {
      console.error(`[${FUNCTION_NAME}] Failed to parse flashcard JSON or missing fields`);
      console.error(`[${FUNCTION_NAME}] Front: "${flashcard?.front}", Back: "${flashcard?.back}"`);
      return errorResponse("Failed to parse flashcard response");
    }

    console.log(`[${FUNCTION_NAME}] SUCCESS - Returning flashcard`);
    console.log(`[${FUNCTION_NAME}] Front: "${flashcard.front}"`);
    console.log(`[${FUNCTION_NAME}] Back: "${flashcard.back}"`);
    console.log(`========== [${FUNCTION_NAME}] REQUEST COMPLETE ==========\n`);

    return successResponse({ front: flashcard.front, back: flashcard.back });
  } catch (error) {
    console.error(`[${FUNCTION_NAME}] EXCEPTION CAUGHT:`, error);
    console.error(`[${FUNCTION_NAME}] Error stack:`, error instanceof Error ? error.stack : "No stack");
    return errorResponse(error instanceof Error ? error.message : "Unknown error");
  }
});
