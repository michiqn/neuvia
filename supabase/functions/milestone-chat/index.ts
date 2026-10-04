import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  callOpenAI,
  handleCors,
  errorResponse,
  successResponse,
  requireUser,
} from "../_shared/openai-helper.ts";

const FUNCTION_NAME = "milestone-chat";

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

    const { question, milestoneDescription, highlightedText } = parsedBody;

    if (!question) {
      console.error(`[${FUNCTION_NAME}] ERROR: Question is missing`);
      return errorResponse("Question is required", 400);
    }

    console.log(`[${FUNCTION_NAME}] ===== REQUEST PARAMETERS =====`);
    console.log(`[${FUNCTION_NAME}] Question: "${question}"`);
    console.log(`[${FUNCTION_NAME}] Description length: ${milestoneDescription?.length || 0} characters`);
    console.log(`[${FUNCTION_NAME}] Description preview: "${milestoneDescription?.substring(0, 100)}..."`);
    console.log(`[${FUNCTION_NAME}] Highlighted text: "${highlightedText || 'none'}"`);
    console.log(`[${FUNCTION_NAME}] ==============================`);

    const systemPrompt = `You are a helpful learning assistant. The user is studying a learning milestone with the following description:

---
${milestoneDescription || "No description provided."}
---

${highlightedText ? `The user has highlighted the following text from the description: "${highlightedText}"` : ""}

Your role is to:
- Answer questions about the milestone content
- Explain concepts mentioned in the description
- Provide additional context and examples
- Help the user understand the material better

Keep your answers concise, educational, and directly relevant to the milestone topic.`;

    const result = await callOpenAI({
      functionName: FUNCTION_NAME,
      mathFormatting: true,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: question },
      ],
      model: "gpt-5-nano-2025-08-07",
    });

    if (!result.success) {
      console.error(`[${FUNCTION_NAME}] OpenAI call failed:`, result.error);
      return errorResponse(result.error || "Failed to get AI response", result.statusCode);
    }

    if (!result.content) {
      console.error(`[${FUNCTION_NAME}] No content in OpenAI response`);
      return errorResponse("Invalid AI response - no content returned");
    }

    console.log(`[${FUNCTION_NAME}] ===== AI RESPONSE =====`);
    console.log(`[${FUNCTION_NAME}] Answer length: ${result.content.length} characters`);
    console.log(`[${FUNCTION_NAME}] Answer preview: "${result.content.substring(0, 150)}..."`);
    console.log(`[${FUNCTION_NAME}] =======================`);

    const responseData = { answer: result.content };
    console.log(`[${FUNCTION_NAME}] Response object:`, JSON.stringify(responseData, null, 2));
    console.log(`========== [${FUNCTION_NAME}] REQUEST COMPLETE ==========\n`);

    return successResponse(responseData);
  } catch (error) {
    console.error(`[${FUNCTION_NAME}] EXCEPTION CAUGHT:`, error);
    console.error(`[${FUNCTION_NAME}] Error stack:`, error instanceof Error ? error.stack : "No stack");
    console.log(`========== [${FUNCTION_NAME}] REQUEST FAILED ==========\n`);
    return errorResponse(error instanceof Error ? error.message : "Unknown error");
  }
});
