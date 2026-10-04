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

const FUNCTION_NAME = "iow-evaluate-answer";

interface EvaluationData {
  isCorrect: boolean;
  feedback: string;
  suggestions?: string;
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

    const { question, userAnswer, contentContext } = parsedBody;

    if (!question) {
      console.error(`[${FUNCTION_NAME}] ERROR: Question is missing`);
      return errorResponse("Question is required", 400);
    }

    if (!userAnswer) {
      console.error(`[${FUNCTION_NAME}] ERROR: User answer is missing`);
      return errorResponse("User answer is required", 400);
    }

    if (!contentContext) {
      console.error(`[${FUNCTION_NAME}] ERROR: Content context is missing`);
      return errorResponse("Content context is required", 400);
    }

    console.log(`[${FUNCTION_NAME}] Question: "${question}"`);
    console.log(`[${FUNCTION_NAME}] User answer length: ${userAnswer?.length || 0}`);
    console.log(`[${FUNCTION_NAME}] Content context length: ${contentContext?.length || 0}`);

    const systemPrompt = `You are an expert educational evaluator for "In Your Own Words" (IOW) exercises. Your role is to assess if a student truly understands a concept based on their written explanation.

Original learning content:
---
${contentContext}
---

Question asked:
"${question}"

Student's answer:
"${userAnswer}"

Evaluate the student's understanding based on:
1. Conceptual accuracy - Do they understand the core concept?
2. Completeness - Did they address the key points?
3. Clarity - Can they explain it coherently in their own words?
4. Application - Do they demonstrate understanding beyond memorization?

IMPORTANT EVALUATION CRITERIA:
- Be encouraging but honest
- If they demonstrate solid understanding (even if not perfect), mark as correct
- If they show partial understanding, provide constructive feedback and mark as incorrect (they can retry)
- If their answer is completely off or shows fundamental misunderstanding, mark as incorrect
- Focus on understanding, not perfect wording

Respond ONLY with valid JSON in this exact format:
{
  "isCorrect": true or false,
  "feedback": "Positive, constructive feedback explaining what they got right or what needs improvement",
  "suggestions": "Optional: specific suggestions for improvement if isCorrect is false, or deeper insights if isCorrect is true"
}`;

    console.log(`[${FUNCTION_NAME}] ===== SYSTEM PROMPT =====`);
    console.log(`[${FUNCTION_NAME}] ${systemPrompt}`);
    console.log(`[${FUNCTION_NAME}] =========================`);

    const userMessage = `Evaluate this student's understanding based on their answer.`;

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
      return errorResponse(result.error || "Failed to evaluate answer", result.statusCode);
    }

    if (!result.content) {
      console.error(`[${FUNCTION_NAME}] No content in OpenAI response`);
      return errorResponse("Invalid AI response - no content returned");
    }

    console.log(`[${FUNCTION_NAME}] AI response: ${result.content}`);

    // Parse JSON from response
    const evaluation = extractJSON<EvaluationData>(result.content);
    console.log(`[${FUNCTION_NAME}] Parsed evaluation:`, evaluation);

    if (!evaluation || typeof evaluation.isCorrect !== 'boolean' || !evaluation.feedback) {
      console.error(`[${FUNCTION_NAME}] Failed to parse evaluation JSON or missing required fields`);
      console.error(`[${FUNCTION_NAME}] isCorrect: ${evaluation?.isCorrect}, feedback: "${evaluation?.feedback}"`);
      return errorResponse("Failed to parse evaluation response");
    }

    console.log(`[${FUNCTION_NAME}] SUCCESS - Returning evaluation`);
    console.log(`[${FUNCTION_NAME}] Is Correct: ${evaluation.isCorrect}`);
    console.log(`[${FUNCTION_NAME}] Feedback: "${evaluation.feedback}"`);
    console.log(`[${FUNCTION_NAME}] Suggestions: "${evaluation.suggestions || 'none'}"`);
    console.log(`========== [${FUNCTION_NAME}] REQUEST COMPLETE ==========\n`);

    return successResponse({
      isCorrect: evaluation.isCorrect,
      feedback: evaluation.feedback,
      suggestions: evaluation.suggestions || ""
    });
  } catch (error) {
    console.error(`[${FUNCTION_NAME}] EXCEPTION CAUGHT:`, error);
    console.error(`[${FUNCTION_NAME}] Error stack:`, error instanceof Error ? error.stack : "No stack");
    return errorResponse(error instanceof Error ? error.message : "Unknown error");
  }
});
