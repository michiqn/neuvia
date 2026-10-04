import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  callOpenAI,
  handleCors,
  errorResponse,
  successResponse,
  requireUser,
} from "../_shared/openai-helper.ts";

const FUNCTION_NAME = "summarize-interaction";

interface InteractionData {
  type: string;
  quizQuestions?: Array<{ question: string; answers: string[]; correctAnswer: number }>;
  flashcards?: Array<{ front: string; back: string }>;
  iowEntries?: Array<{ question: string; answer?: string }>;
}

serve(async (req) => {
  console.log(`\n========== [${FUNCTION_NAME}] NEW REQUEST ==========`);
  console.log(`[${FUNCTION_NAME}] Method: ${req.method}`);

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
    const { interactionId, contentBubbleId, interactionType, interactionData } = parsedBody;

    if (!interactionId || !contentBubbleId || !interactionType) {
      console.error(`[${FUNCTION_NAME}] ERROR: Missing required fields`);
      return errorResponse("interactionId, contentBubbleId, and interactionType are required", 400);
    }

    console.log(`[${FUNCTION_NAME}] ===== REQUEST PARAMETERS =====`);
    console.log(`[${FUNCTION_NAME}] Interaction ID: "${interactionId}"`);
    console.log(`[${FUNCTION_NAME}] Content Bubble ID: "${contentBubbleId}"`);
    console.log(`[${FUNCTION_NAME}] Interaction Type: "${interactionType}"`);
    console.log(`[${FUNCTION_NAME}] ==============================`);

    // Build context based on interaction type
    let interactionContext = "";
    const data = interactionData as InteractionData;

    if (interactionType === "quiz" && data?.quizQuestions) {
      const questions = data.quizQuestions.map((q, i) => 
        `Q${i + 1}: ${q.question}`
      ).join("\n");
      interactionContext = `Quiz questions:\n${questions}`;
    } else if (interactionType === "flashcard" && data?.flashcards) {
      const cards = data.flashcards.map((f, i) => 
        `Card ${i + 1}: "${f.front}" → "${f.back}"`
      ).join("\n");
      interactionContext = `Flashcards:\n${cards}`;
    } else if (interactionType === "iow" && data?.iowEntries) {
      const entries = data.iowEntries.map((e, i) => 
        `IOW ${i + 1}: ${e.question}`
      ).join("\n");
      interactionContext = `In Your Own Words questions:\n${entries}`;
    }

    if (!interactionContext) {
      console.error(`[${FUNCTION_NAME}] ERROR: No interaction data provided`);
      return errorResponse("No interaction data provided for summarization", 400);
    }

    const systemPrompt = `You are a learning assistant that creates brief, one-sentence summaries of learning interactions.
Your task is to summarize what the learner practiced or learned from this interaction in exactly ONE concise sentence.
Focus on the key concept or skill being reinforced.`;

    const userPrompt = `Summarize the following ${interactionType} interaction in exactly ONE sentence:

${interactionContext}

Provide a single, concise sentence that captures the main learning point.`;

    console.log(`[${FUNCTION_NAME}] Calling OpenAI...`);
    const result = await callOpenAI({
      functionName: FUNCTION_NAME,
      mathFormatting: true,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      model: "gpt-5-nano-2025-08-07",
      maxTokens: 100,
    });

    if (!result.success || !result.content) {
      console.error(`[${FUNCTION_NAME}] OpenAI call failed:`, result.error);
      return errorResponse(result.error || "Failed to generate summary", result.statusCode);
    }

    const summarySentence = result.content.trim();
    console.log(`[${FUNCTION_NAME}] Generated summary: "${summarySentence}"`);

    // Store in database
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { error: dbError } = await supabase
      .from("interaction_summaries")
      .upsert({
        interaction_id: interactionId,
        content_bubble_id: contentBubbleId,
        interaction_type: interactionType,
        summary_sentence: summarySentence,
      }, {
        onConflict: "interaction_id"
      });

    if (dbError) {
      console.error(`[${FUNCTION_NAME}] Database error:`, dbError);
      return errorResponse("Failed to store summary: " + dbError.message);
    }

    console.log(`[${FUNCTION_NAME}] Summary stored successfully`);
    console.log(`========== [${FUNCTION_NAME}] REQUEST COMPLETE ==========\n`);

    return successResponse({ 
      success: true, 
      summary: summarySentence 
    });
  } catch (error) {
    console.error(`[${FUNCTION_NAME}] EXCEPTION CAUGHT:`, error);
    console.error(`[${FUNCTION_NAME}] Error stack:`, error instanceof Error ? error.stack : "No stack");
    return errorResponse(error instanceof Error ? error.message : "Unknown error");
  }
});
