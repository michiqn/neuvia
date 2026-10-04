import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  callOpenAI,
  handleCors,
  errorResponse,
  successResponse,
  requireUser,
  parseJSONLenient,
} from "../_shared/openai-helper.ts";

const FUNCTION_NAME = "generate-bubble-summary";

interface InteractionSummary {
  interaction_type: string;
  summary_sentence: string;
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
    const { contentBubbleId, contentTitle } = parsedBody;

    if (!contentBubbleId) {
      console.error(`[${FUNCTION_NAME}] ERROR: contentBubbleId is required`);
      return errorResponse("contentBubbleId is required", 400);
    }

    console.log(`[${FUNCTION_NAME}] ===== REQUEST PARAMETERS =====`);
    console.log(`[${FUNCTION_NAME}] Content Bubble ID: "${contentBubbleId}"`);
    console.log(`[${FUNCTION_NAME}] Content Title: "${contentTitle || 'N/A'}"`);
    console.log(`[${FUNCTION_NAME}] ==============================`);

    // Fetch all interaction summaries for this content bubble
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: summaries, error: fetchError } = await supabase
      .from("interaction_summaries")
      .select("interaction_type, summary_sentence")
      .eq("content_bubble_id", contentBubbleId);

    if (fetchError) {
      console.error(`[${FUNCTION_NAME}] Database fetch error:`, fetchError);
      return errorResponse("Failed to fetch interaction summaries: " + fetchError.message);
    }

    console.log(`[${FUNCTION_NAME}] Found ${summaries?.length || 0} interaction summaries`);

    if (!summaries || summaries.length === 0) {
      // No interactions yet, return empty summary
      return successResponse({
        success: true,
        summary: {
          title: contentTitle || "Summary",
          quizSummary: null,
          flashcardSummary: null,
          iowSummary: null,
          overallSummary: "No learning interactions completed yet."
        }
      });
    }

    // Group summaries by type
    const quizSummaries = summaries
      .filter((s: InteractionSummary) => s.interaction_type === "quiz")
      .map((s: InteractionSummary) => s.summary_sentence);
    const flashcardSummaries = summaries
      .filter((s: InteractionSummary) => s.interaction_type === "flashcard")
      .map((s: InteractionSummary) => s.summary_sentence);
    const iowSummaries = summaries
      .filter((s: InteractionSummary) => s.interaction_type === "iow")
      .map((s: InteractionSummary) => s.summary_sentence);

    console.log(`[${FUNCTION_NAME}] Quiz summaries: ${quizSummaries.length}`);
    console.log(`[${FUNCTION_NAME}] Flashcard summaries: ${flashcardSummaries.length}`);
    console.log(`[${FUNCTION_NAME}] IOW summaries: ${iowSummaries.length}`);

    // Build context for AI
    let summaryContext = "";
    if (quizSummaries.length > 0) {
      summaryContext += `Quiz learning points:\n${quizSummaries.map((s, i) => `- ${s}`).join("\n")}\n\n`;
    }
    if (flashcardSummaries.length > 0) {
      summaryContext += `Flashcard learning points:\n${flashcardSummaries.map((s, i) => `- ${s}`).join("\n")}\n\n`;
    }
    if (iowSummaries.length > 0) {
      summaryContext += `In Your Own Words learning points:\n${iowSummaries.map((s, i) => `- ${s}`).join("\n")}\n\n`;
    }

    const systemPrompt = `You are a learning assistant that creates structured summaries of learning content.
Your task is to synthesize multiple learning interaction summaries into a cohesive, structured summary.
For each category (quizzes, flashcards, in your own words), provide exactly ONE sentence that captures the key learning from all interactions in that category.
Be concise and focus on the most important concepts learned.`;

    const userPrompt = `Create a structured summary of the learning interactions for the content "${contentTitle || 'this topic'}".

${summaryContext}

Generate a structured summary with:
1. One sentence summarizing what was learned through quizzes (if any quiz interactions exist)
2. One sentence summarizing what was learned through flashcards (if any flashcard interactions exist)
3. One sentence summarizing what was learned through "In Your Own Words" exercises (if any IOW interactions exist)
4. One overall sentence summarizing the complete learning for this content`;

    console.log(`[${FUNCTION_NAME}] Calling OpenAI...`);
    const result = await callOpenAI({
      functionName: FUNCTION_NAME,
      mathFormatting: true,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      model: "gpt-5-nano-2025-08-07",
      tools: [
        {
          type: "function",
          function: {
            name: "generate_structured_summary",
            description: "Generate a structured summary of learning interactions",
            parameters: {
              type: "object",
              properties: {
                quizSummary: {
                  type: "string",
                  description: "One sentence summarizing quiz learning (null if no quizzes)",
                },
                flashcardSummary: {
                  type: "string",
                  description: "One sentence summarizing flashcard learning (null if no flashcards)",
                },
                iowSummary: {
                  type: "string",
                  description: "One sentence summarizing IOW learning (null if no IOW exercises)",
                },
                overallSummary: {
                  type: "string",
                  description: "One overall sentence summarizing the complete learning",
                },
              },
              required: ["overallSummary"],
            },
          },
        },
      ],
      toolChoice: { type: "function", function: { name: "generate_structured_summary" } },
    });

    if (!result.success) {
      console.error(`[${FUNCTION_NAME}] OpenAI call failed:`, result.error);
      return errorResponse(result.error || "Failed to generate summary", result.statusCode);
    }

    if (!result.toolCallArguments) {
      console.error(`[${FUNCTION_NAME}] No tool call arguments in response`);
      return errorResponse("Invalid AI response - no structured data returned");
    }

    const parsedResult = parseJSONLenient(result.toolCallArguments);
    console.log(`[${FUNCTION_NAME}] Generated structured summary:`, parsedResult);

    // Store the summary in the summaries table
    const summaryContent = JSON.stringify({
      quizSummary: quizSummaries.length > 0 ? parsedResult.quizSummary : null,
      flashcardSummary: flashcardSummaries.length > 0 ? parsedResult.flashcardSummary : null,
      iowSummary: iowSummaries.length > 0 ? parsedResult.iowSummary : null,
      overallSummary: parsedResult.overallSummary,
    });

    // Check if summary already exists for this content bubble
    const { data: existingSummary } = await supabase
      .from("summaries")
      .select("id")
      .eq("content_bubble_id", contentBubbleId)
      .maybeSingle();

    let dbError = null;
    if (existingSummary) {
      // Update existing summary
      const { error } = await supabase
        .from("summaries")
        .update({
          title: contentTitle || "Summary",
          content: summaryContent,
          updated_at: new Date().toISOString(),
        })
        .eq("content_bubble_id", contentBubbleId);
      dbError = error;
    } else {
      // Insert new summary
      const { error } = await supabase
        .from("summaries")
        .insert({
          content_bubble_id: contentBubbleId,
          title: contentTitle || "Summary",
          content: summaryContent,
        });
      dbError = error;
    }

    if (dbError) {
      console.error(`[${FUNCTION_NAME}] Database error:`, JSON.stringify(dbError));
      // Return the error in response for debugging
      return successResponse({
        success: true,
        summary: {
          title: contentTitle || "Summary",
          quizSummary: quizSummaries.length > 0 ? parsedResult.quizSummary : null,
          flashcardSummary: flashcardSummaries.length > 0 ? parsedResult.flashcardSummary : null,
          iowSummary: iowSummaries.length > 0 ? parsedResult.iowSummary : null,
          overallSummary: parsedResult.overallSummary,
        },
        dbError: dbError,
        dbOperation: existingSummary ? "update" : "insert",
      });
    }
    
    console.log(`[${FUNCTION_NAME}] Summary stored/updated successfully`);
    console.log(`========== [${FUNCTION_NAME}] REQUEST COMPLETE ==========\n`);

    return successResponse({
      success: true,
      summary: {
        title: contentTitle || "Summary",
        quizSummary: quizSummaries.length > 0 ? parsedResult.quizSummary : null,
        flashcardSummary: flashcardSummaries.length > 0 ? parsedResult.flashcardSummary : null,
        iowSummary: iowSummaries.length > 0 ? parsedResult.iowSummary : null,
        overallSummary: parsedResult.overallSummary,
      },
      dbOperation: existingSummary ? "update" : "insert",
      stored: true,
    });
  } catch (error) {
    console.error(`[${FUNCTION_NAME}] EXCEPTION CAUGHT:`, error);
    console.error(`[${FUNCTION_NAME}] Error stack:`, error instanceof Error ? error.stack : "No stack");
    return errorResponse(error instanceof Error ? error.message : "Unknown error");
  }
});
