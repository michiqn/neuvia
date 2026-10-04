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

const FUNCTION_NAME = "iow-generate-questions";

interface IOWQuestionData {
  question: string;
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

    const { contentContext, userPrompt } = parsedBody;

    if (!contentContext) {
      console.error(`[${FUNCTION_NAME}] ERROR: Content context is missing`);
      return errorResponse("Content context is required", 400);
    }

    console.log(`[${FUNCTION_NAME}] Content context length: ${contentContext?.length || 0}`);
    console.log(`[${FUNCTION_NAME}] User prompt: "${userPrompt || 'none'}"`);

    // Extract first and last 300 characters from content for context
    let contextSnippet = "";
    if (contentContext && contentContext.length > 0) {
      const first300 = contentContext.slice(0, 300);
      const last300 = contentContext.length > 600
        ? contentContext.slice(-300)
        : "";
      contextSnippet = last300
        ? `${first300}...${last300}`
        : first300;
    }

    console.log(`[${FUNCTION_NAME}] Context snippet length: ${contextSnippet.length}`);

    const systemPrompt = `You are an expert educational question generator for "In Your Own Words" (IOW) exercises. These questions test deep understanding, not just recall.

Learning content:
---
${contentContext}
---

Generate a thoughtful question that:
- Tests conceptual understanding, not memorization
- Requires the student to explain the concept in their own words
- Is open-ended and encourages critical thinking
- Is clear and specific to the content above
- Cannot be answered with just a yes/no or single word

${userPrompt ? `User's specific request: "${userPrompt}"` : "Generate a question that covers a key concept from this content."}

Respond ONLY with valid JSON in this exact format:
{"question": "Your question here"}`;

    console.log(`[${FUNCTION_NAME}] ===== SYSTEM PROMPT =====`);
    console.log(`[${FUNCTION_NAME}] ${systemPrompt}`);
    console.log(`[${FUNCTION_NAME}] =========================`);

    const userMessage = userPrompt
      ? `Create an IOW question about: ${userPrompt}`
      : "Create an IOW question based on the content provided.";

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
      return errorResponse(result.error || "Failed to generate question", result.statusCode);
    }

    if (!result.content) {
      console.error(`[${FUNCTION_NAME}] No content in OpenAI response`);
      return errorResponse("Invalid AI response - no content returned");
    }

    console.log(`[${FUNCTION_NAME}] AI response: ${result.content}`);

    // Parse JSON from response
    const questionData = extractJSON<IOWQuestionData>(result.content);
    console.log(`[${FUNCTION_NAME}] Parsed question:`, questionData);

    if (!questionData || !questionData.question) {
      console.error(`[${FUNCTION_NAME}] Failed to parse question JSON or missing fields`);
      console.error(`[${FUNCTION_NAME}] Question: "${questionData?.question}"`);
      return errorResponse("Failed to parse question response");
    }

    console.log(`[${FUNCTION_NAME}] SUCCESS - Returning question`);
    console.log(`[${FUNCTION_NAME}] Question: "${questionData.question}"`);
    console.log(`========== [${FUNCTION_NAME}] REQUEST COMPLETE ==========\n`);

    return successResponse({ question: questionData.question });
  } catch (error) {
    console.error(`[${FUNCTION_NAME}] EXCEPTION CAUGHT:`, error);
    console.error(`[${FUNCTION_NAME}] Error stack:`, error instanceof Error ? error.stack : "No stack");
    return errorResponse(error instanceof Error ? error.message : "Unknown error");
  }
});
