import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  callOpenAI,
  handleCors,
  errorResponse,
  successResponse,
  requireUser,
  parseJSONLenient,
} from "../_shared/openai-helper.ts";

const FUNCTION_NAME = "generate-content";

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

    const { milestoneTitle, milestoneDescription, firstTopic, previousTopic, userTopicInput } = parsedBody;

    // Use userTopicInput if provided, otherwise fall back to firstTopic (backward compatibility)
    const topicToGenerate = userTopicInput || firstTopic;

    if (!milestoneTitle || !topicToGenerate) {
      console.error(`[${FUNCTION_NAME}] ERROR: Missing required fields`);
      return errorResponse("Milestone title and topic are required", 400);
    }

    console.log(`[${FUNCTION_NAME}] ===== REQUEST PARAMETERS =====`);
    console.log(`[${FUNCTION_NAME}] Milestone Title: "${milestoneTitle}"`);
    console.log(`[${FUNCTION_NAME}] Milestone Description: "${milestoneDescription || 'N/A'}"`);
    console.log(`[${FUNCTION_NAME}] Topic to Generate: "${topicToGenerate}"`);
    console.log(`[${FUNCTION_NAME}] User Topic Input: "${userTopicInput || 'N/A'}"`);
    console.log(`[${FUNCTION_NAME}] Previous Topic: "${previousTopic || 'N/A'}"`);
    console.log(`[${FUNCTION_NAME}] ==============================`);

    const systemPrompt = `You are an expert educator creating learning content. Your task is to create engaging, clear, and comprehensive learning material.

    Milestone Context:
    - Title: ${milestoneTitle}
    ${milestoneDescription ? `- Description: ${milestoneDescription}` : ""}

    Guidelines:
    - Create content that is easy to understand but thorough
    - Use clear explanations with examples where helpful
    - Structure the content logically
    - The content should be self-contained and teach the topic effectively
    - Address the user's specific topic/context requirements
    ${previousTopic ? `- Maintain continuity with the previous topic: "${previousTopic}"` : ""}
    - Structure the content with markdown: start every section with a "## " heading (no "# " title, the title is shown separately), use "-" bullet lists, **bold** for key terms, and code blocks only for code
    - Do not add a "Next topic" section to the content; the next topic is returned in its own field
    - Aim for 300-500 words of quality learning content
    - After creating the content, suggest a logical next topic that builds upon this one`;

    const userPrompt = `User wants to learn about: ${topicToGenerate}

    ${previousTopic ? `Note: The previous topic covered was "${previousTopic}". Build upon that knowledge if applicable.` : ""}
    Generate a concise, descriptive title for this content bubble, comprehensive learning content that teaches this topic effectively, and suggest the next logical topic to learn after this one.`;

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
            name: "generate_content",
            description: "Generate learning content for a content bubble",
            parameters: {
              type: "object",
              properties: {
                title: {
                  type: "string",
                  description: "A concise, descriptive title for this learning content",
                },
                content: {
                  type: "string",
                  description: "The comprehensive learning content in markdown format",
                },
                nextTopic: {
                  type: "string",
                  description: "The suggested next topic to learn after this content, building upon the current topic",
                },
              },
              required: ["title", "content", "nextTopic"],
            },
          },
        },
      ],
      toolChoice: { type: "function", function: { name: "generate_content" } },
    });

    if (!result.success) {
      return errorResponse(result.error || "Failed to generate content", result.statusCode);
    }

    if (!result.toolCallArguments) {
      return errorResponse("Invalid AI response - no structured data returned");
    }

    const parsedResult = parseJSONLenient(result.toolCallArguments);
    console.log(`[${FUNCTION_NAME}] ===== GENERATED RESULT =====`);
    console.log(`[${FUNCTION_NAME}] Title: "${parsedResult.title}"`);
    console.log(`[${FUNCTION_NAME}] Content length: ${parsedResult.content?.length || 0} characters`);
    console.log(`[${FUNCTION_NAME}] Content preview: "${parsedResult.content?.substring(0, 150)}..."`);
    console.log(`[${FUNCTION_NAME}] Next Topic: "${parsedResult.nextTopic}"`);
    console.log(`[${FUNCTION_NAME}] ============================`);

    // Title and next topic are shown as plain text, so strip any math delimiters the model added
    const stripMath = (text: string) => (text ?? "").replace(/\$+/g, "").replace(/\\(?=[a-zA-Z])/g, "");

    const responseData = {
      title: stripMath(parsedResult.title),
      content: parsedResult.content,
      nextTopic: stripMath(parsedResult.nextTopic)
    };

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
