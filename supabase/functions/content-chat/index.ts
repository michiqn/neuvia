import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  callOpenAI,
  handleCors,
  errorResponse,
  successResponse,
  requireUser,
} from "../_shared/openai-helper.ts";

const FUNCTION_NAME = "content-chat";

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

    const { question, contentTitle, contentText, highlightedText } = parsedBody;

    if (!question) {
      console.error(`[${FUNCTION_NAME}] ERROR: Question is missing from request`);
      return errorResponse("Question is required", 400);
    }

    console.log(`[${FUNCTION_NAME}] ===== REQUEST PARAMETERS =====`);
    console.log(`[${FUNCTION_NAME}] Question: "${question}"`);
    console.log(`[${FUNCTION_NAME}] Title: "${contentTitle || "Untitled"}"`);
    console.log(`[${FUNCTION_NAME}] Content length: ${contentText?.length || 0} chars`);
    console.log(`[${FUNCTION_NAME}] Content preview: "${contentText?.substring(0, 100)}..."`);
    console.log(`[${FUNCTION_NAME}] Highlighted text: "${highlightedText || "none"}"`);

    // Only send first 100 characters of content to save tokens
    const contentPreview = contentText ? contentText.substring(0, 100) : "No content provided.";

    const systemPrompt = `You are a helpful learning assistant. The user is studying the following content:

Title: ${contentTitle || "Untitled"}

Content preview: ${contentPreview}...

${highlightedText ? `The user has highlighted the following text from the content: "${highlightedText}"` : ""}

Your role is to:
- Answer questions about the content topic
- Explain concepts mentioned in the question
- Provide additional context and examples
- Help the user understand the material better

IMPORTANT: Keep your answers SHORT and CONCISE (maximum 2 sentences or 50 words). Be direct and educational.`;

    console.log(`[${FUNCTION_NAME}] Calling OpenAI...`);
    const result = await callOpenAI({
      functionName: FUNCTION_NAME,
      mathFormatting: true,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: question },
      ],
      model: "gpt-5-nano-2025-08-07",
    });

    console.log(`[${FUNCTION_NAME}] OpenAI result:`, JSON.stringify(result, null, 2));

    if (!result.success) {
      console.error(`[${FUNCTION_NAME}] OpenAI call failed:`, result.error);
      return errorResponse(result.error || "Failed to get AI response", result.statusCode);
    }

    if (!result.content) {
      console.error(`[${FUNCTION_NAME}] No content in OpenAI response`);
      return errorResponse("Invalid AI response - no content returned");
    }

    console.log(`[${FUNCTION_NAME}] SUCCESS - Returning answer (length: ${result.content.length})`);
    console.log(`[${FUNCTION_NAME}] Answer preview: "${result.content.substring(0, 150)}..."`);
    const response = successResponse({ answer: result.content });
    console.log(`[${FUNCTION_NAME}] Response object:`, JSON.stringify({ answer: result.content }, null, 2));
    console.log(`========== [${FUNCTION_NAME}] REQUEST COMPLETE ==========\n`);
    return response;
  } catch (error) {
    console.error(`[${FUNCTION_NAME}] EXCEPTION CAUGHT:`, error);
    console.error(`[${FUNCTION_NAME}] Error stack:`, error instanceof Error ? error.stack : "No stack");
    return errorResponse(error instanceof Error ? error.message : "Unknown error");
  }
});
